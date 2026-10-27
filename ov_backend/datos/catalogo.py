"""Catálogo real de la plataforma, sea cual sea la ruta: carreras, instituciones e ingresos de egresados
(Ponte en Carrera, MTPE) y ocupaciones (Mi Próximo Paso). Lee los CSV de `archivos/catalogo/`.

La transacción pertenece al llamador; este módulo no confirma ni migra.
"""

import csv
import json
import logging
import random
import re
from dataclasses import dataclass, field, replace
from pathlib import Path

from sqlalchemy import insert, select
from sqlalchemy.orm import Session

from app import models as modelos
from app.core.parametros import (
    DIMENSIONES_RIASEC, PUNTAJE_OCUPACION_MAXIMO, PUNTAJE_OCUPACION_MINIMO,
)
from app.models.base import sin_tildes


registro = logging.getLogger(__name__)

CARPETA_CATALOGO = Path(__file__).resolve().parent / 'archivos' / 'catalogo'

TIPOS = {'1': modelos.TipoInstitucion.UNIVERSIDAD, '2': modelos.TipoInstitucion.INSTITUTO,
         '3': modelos.TipoInstitucion.FFAA_POLICIA}
GESTIONES = {'público': modelos.GestionInstitucion.PUBLICA, 'pública': modelos.GestionInstitucion.PUBLICA,
             'privado': modelos.GestionInstitucion.PRIVADA, 'privada': modelos.GestionInstitucion.PRIVADA}
# Departamentos: el 15 (Lima Metropolitana) se llama «Lima» porque `instituciones.csv` no distingue Lima
# Metropolitana de Lima Provincias; el 26 (Lima Provincias) solo tiene ingresos.
LIMA, LIMA_PROVINCIAS, NACIONAL = '15', '26', '0'
# Campos CINE de las Fuerzas Armadas: sin ocupaciones provisionales.
CAMPOS_SIN_OCUPACIONES = ('011', '012')
CONECTORES = {'a', 'al', 'de', 'del', 'e', 'el', 'en', 'la', 'las', 'los', 'o', 'u', 'y', 'con', 'para', 'por'}
SIGLAS = {'PNP', 'FAP'}
TOPE_RESUMEN = 140
# Relación carrera–ocupación provisional: de 3 a 5 ocupaciones por carrera, sorteadas con esta semilla.
SEMILLA_CARRERA_OCUPACION = 2026
OCUPACIONES_POR_CARRERA = (3, 5)


@dataclass(frozen=True)
class CarreraArchivo:
    id: str
    nombre: str
    tipo: modelos.TipoInstitucion
    codigo_cine: str
    descripcion: str | None
    duracion: str | None
    ambito_laboral: str | None
    nombre_cine: str | None
    riasec: str = ''

    @property
    def familia(self) -> str:
        return self.codigo_cine[:3]


@dataclass(frozen=True)
class InstitucionArchivo:
    id: str
    nombre: str
    tipo: modelos.TipoInstitucion
    gestion: modelos.GestionInstitucion
    departamento: str
    distrito: str | None
    direccion: str | None
    pagina_web: str | None


@dataclass(frozen=True)
class IngresoFamiliaArchivo:
    tipo: modelos.TipoInstitucion
    familia: str
    departamento: str | None
    jovenes: tuple[int, int, int]
    adultos: tuple[int, int, int]


@dataclass(frozen=True)
class OcupacionArchivo:
    codigo_onet: str
    titulo: str
    grupo: str
    resumen: str
    descripcion: str | None
    job_zone: int | None
    personalidad: str | None
    tambien_llamado: tuple[str, ...]
    tareas: tuple[str, ...]
    conocimientos: tuple[str, ...]
    aptitudes: tuple[str, ...]
    estilos_trabajo: tuple[str, ...]
    puntajes: tuple[float, ...]
    perfil: str


@dataclass
class CatalogoArchivo:
    areas: dict[str, str] = field(default_factory=dict)
    familias: dict[str, tuple[str, str]] = field(default_factory=dict)
    """Código CINE de 3 cifras → (nombre, área)."""
    departamentos: dict[str, str] = field(default_factory=dict)
    carreras: list[CarreraArchivo] = field(default_factory=list)
    instituciones: list[InstitucionArchivo] = field(default_factory=list)
    ofertas: set[tuple[str, str]] = field(default_factory=set)
    """(institución, carrera), con los id del archivo."""
    ingresos_familia: list[IngresoFamiliaArchivo] = field(default_factory=list)
    ingresos_institucion: dict[tuple[str, str], tuple[int, int, int]] = field(default_factory=dict)
    grupos: dict[str, str] = field(default_factory=dict)
    estilos: dict[str, str] = field(default_factory=dict)
    ocupaciones: list[OcupacionArchivo] = field(default_factory=list)


def _leer(carpeta: Path, nombre: str, columnas: tuple[str, ...], opcional=False):
    """Filas del CSV como (número de fila, diccionario); exige que estén todas las `columnas`."""
    ruta = carpeta / nombre
    if not ruta.is_file():
        if opcional:
            return []
        raise ValueError(f'Falta el archivo del catálogo: {ruta}')
    with ruta.open(encoding='utf-8-sig', newline='') as archivo:
        lector = csv.DictReader(archivo)
        faltantes = [c for c in columnas if c not in (lector.fieldnames or ())]
        if faltantes:
            raise ValueError(f'{nombre}: faltan las columnas {", ".join(faltantes)}')
        return [(numero, {c: (fila[c] or '').strip() for c in columnas}) for numero, fila in enumerate(lector, start=2)]


def _error(nombre: str, numero: int, mensaje: str) -> ValueError:
    return ValueError(f'{nombre}, fila {numero}: {mensaje}')


def titulo(texto: str) -> str:
    """De MAYÚSCULAS a formato de título: conectores en minúscula y siglas conocidas o entre paréntesis intactas."""
    palabras = []
    for posicion, palabra in enumerate(texto.split()):
        nucleo = palabra.strip('()')
        if nucleo in SIGLAS or (palabra.startswith('(') and palabra.endswith(')') and nucleo.isalpha()
                                and nucleo.isupper()):
            palabras.append(palabra)
        elif posicion > 0 and nucleo.lower() in CONECTORES and not palabra.startswith('('):
            palabras.append(palabra.lower())
        else:
            palabras.append('-'.join(parte[:1].upper() + parte[1:].lower() if not parte.startswith('(')
                                     else '(' + parte[1:2].upper() + parte[2:].lower()
                                     for parte in palabra.split('-')))
    return ' '.join(palabras)


def lineas_ambito(texto: str) -> str | None:
    """El «¿» con que empieza cada línea es una viñeta mal codificada."""
    lineas = [linea.strip().lstrip('¿').strip() for linea in texto.splitlines()]
    return '\n'.join(linea for linea in lineas if linea) or None


def primera_linea(texto: str) -> str | None:
    lineas = [linea.strip() for linea in texto.splitlines() if linea.strip()]
    return lineas[0] if lineas else None


def ciclos_de(duracion: str | None) -> int | None:
    """Años × 2, con el primer número del texto («5 años» → 10)."""
    numero = re.search(r'\d+', duracion or '')
    return int(numero.group()) * 2 if numero and int(numero.group()) > 0 else None


def rango(texto: str) -> tuple[int, int]:
    """«De S/ 2 987 a S/ 40 050» → (2987, 40050)."""
    partes = re.fullmatch(r'De S/\s*([\d\s]+?)\s*a S/\s*([\d\s]+)', texto)
    if partes is None:
        raise ValueError(f'Rango de ingresos inválido: {texto!r}')
    minimo, maximo = (int(re.sub(r'\s', '', p)) for p in partes.groups())
    if minimo > maximo:
        raise ValueError(f'Rango de ingresos invertido: {texto!r}')
    return minimo, maximo


def _entero(nombre, numero, valor) -> int:
    if not re.fullmatch(r'\d+', valor):
        raise _error(nombre, numero, f'se esperaba un entero y vino {valor!r}')
    return int(valor)


def _limpias(valores) -> tuple[str, ...]:
    """Mayúscula inicial, sin vacíos ni repetidos, en el orden de la fuente."""
    vistas = []
    for valor in valores:
        valor = str(valor).strip()
        valor = valor[:1].upper() + valor[1:]
        if valor and valor not in vistas:
            vistas.append(valor)
    return tuple(vistas)


def _json(nombre, numero, valor, tipo):
    try:
        dato = json.loads(valor) if valor else tipo()
    except json.JSONDecodeError as error:
        raise _error(nombre, numero, f'JSON inválido ({error.msg})') from None
    if not isinstance(dato, tipo):
        raise _error(nombre, numero, f'se esperaba {"una lista" if tipo is list else "un objeto"} JSON')
    return dato


def _resumen(resumen: str, descripcion: str) -> str:
    texto = resumen or re.split(r'(?<=\.)\s', descripcion, maxsplit=1)[0]
    if len(texto) <= TOPE_RESUMEN:
        return texto
    corte = texto[:TOPE_RESUMEN - 1].rsplit(' ', 1)[0].rstrip(',;:.')
    return corte + '…'


def _leer_familias(carpeta, catalogo):
    catalogo.areas = {f['codigo']: f['nombre'] for _, f in _leer(carpeta, 'campo_educacion.csv', ('codigo', 'nombre'))}
    especificos = {}
    for numero, fila in _leer(carpeta, 'campo_especifico.csv', ('codigo', 'nombre', 'cod_campo_educacion')):
        if fila['cod_campo_educacion'] not in catalogo.areas:
            raise _error('campo_especifico.csv', numero, f'campo de educación desconocido {fila["cod_campo_educacion"]}')
        especificos[fila['codigo']] = fila['cod_campo_educacion']
    for numero, fila in _leer(carpeta, 'campo_detallado.csv', ('codigo', 'nombre', 'cod_campo_especifico')):
        if not re.fullmatch(r'\d{3}', fila['codigo']) or fila['cod_campo_especifico'] not in especificos:
            raise _error('campo_detallado.csv', numero, f'campo detallado inválido {fila["codigo"]}')
        catalogo.familias[fila['codigo']] = (fila['nombre'], especificos[fila['cod_campo_especifico']])


def _leer_carreras(carpeta, catalogo):
    nombre = 'carreras_mtpe.csv'
    cine = {f['codigo']: f['nombre'] for _, f in _leer(carpeta, 'cine_carreras.csv', ('codigo', 'nombre'))}
    riasec = {}
    for numero, fila in _leer(carpeta, 'carreras_riasec.csv', ('id', 'codigo_1', 'codigo_2', 'codigo_3'), opcional=True):
        letras = ''.join(fila[c] for c in ('codigo_1', 'codigo_2', 'codigo_3'))
        if not letras or any(letra not in 'RIASEC' for letra in letras) or len(set(letras)) != len(letras):
            raise _error('carreras_riasec.csv', numero, f'letras RIASEC inválidas {letras!r}')
        riasec[fila['id']] = letras
    leidas = []
    for numero, fila in _leer(carpeta, nombre, ('id', 'carrera_nombre', 'tipo_institucion_id', 'codigo_cine',
                                                'carrera_descripcion', 'duracion', 'ambito_laboral')):
        if fila['tipo_institucion_id'] not in TIPOS:
            raise _error(nombre, numero, f'tipo de institución desconocido {fila["tipo_institucion_id"]}')
        if not re.fullmatch(r'\d{6}', fila['codigo_cine']) or fila['codigo_cine'][:3] not in catalogo.familias:
            raise _error(nombre, numero, f'código CINE inválido {fila["codigo_cine"]}')
        if not fila['id'] or not fila['carrera_nombre']:
            raise _error(nombre, numero, 'falta el id o el nombre')
        nombre_carrera = titulo(fila['carrera_nombre'])
        nombre_cine = cine.get(fila['codigo_cine'])
        leidas.append(CarreraArchivo(
            id=fila['id'], nombre=nombre_carrera, tipo=TIPOS[fila['tipo_institucion_id']],
            codigo_cine=fila['codigo_cine'], descripcion=fila['carrera_descripcion'].strip('"').strip() or None,
            duracion=primera_linea(fila['duracion']), ambito_laboral=lineas_ambito(fila['ambito_laboral']),
            nombre_cine=nombre_cine if nombre_cine and sin_tildes(nombre_cine) != sin_tildes(nombre_carrera) else None,
            riasec=riasec.get(fila['id'], '')))
    if len({c.id for c in leidas}) != len(leidas):
        raise ValueError(f'{nombre}: hay id de carrera repetidos')
    return leidas


def _fusionar_duplicadas(carreras, ofertas):
    """Carreras del mismo tipo y código CINE cuyo nombre solo difiere en las tildes: se conserva la que tiene
    instituciones (o la de menor id), con el nombre que más tildes lleva, y recibe las relaciones de las demás."""
    con_instituciones = {c for _, c in ofertas}
    grupos = {}
    for carrera in carreras:
        grupos.setdefault((carrera.tipo, sin_tildes(carrera.nombre), carrera.codigo_cine), []).append(carrera)
    reemplazo, nombres = {}, {}
    for grupo in grupos.values():
        conservada = min(grupo, key=lambda c: (c.id not in con_instituciones, int(c.id)))
        reemplazo.update({c.id: conservada.id for c in grupo if c is not conservada})
        nombres[conservada.id] = max((c.nombre for c in grupo), key=lambda n: sum(not ch.isascii() for ch in n))
    if reemplazo:
        registro.info('Carreras duplicadas por tilde fusionadas (descartada → conservada): %s',
                      ', '.join(f'{d} → {c}' for d, c in sorted(reemplazo.items())))
    return ([replace(c, nombre=nombres[c.id]) for c in carreras if c.id not in reemplazo],
            {(i, reemplazo.get(c, c)) for i, c in ofertas})


def _leer_instituciones(carpeta, catalogo, carreras_cargadas):
    nombre = 'instituciones.csv'
    departamentos = {sin_tildes(n): c for c, n in catalogo.departamentos.items()}
    ofertas_leidas = set()
    for numero, fila in _leer(carpeta, 'instituciones_carreras.csv', ('institucion_id', 'carrera_id')):
        if fila['carrera_id'] not in carreras_cargadas:
            raise _error('instituciones_carreras.csv', numero, f'carrera desconocida {fila["carrera_id"]}')
        ofertas_leidas.add((fila['institucion_id'], fila['carrera_id']))
    instituciones, sin_carreras = [], 0
    con_carreras = {i for i, _ in ofertas_leidas}
    for numero, fila in _leer(carpeta, nombre, ('id', 'tipo_institucion_id', 'institucion_nombre', 'departamento',
                                                'distrito', 'tipo_gestion_nombre', 'direccion', 'pagina_web')):
        if fila['tipo_institucion_id'] not in TIPOS:
            raise _error(nombre, numero, f'tipo de institución desconocido {fila["tipo_institucion_id"]}')
        if fila['tipo_gestion_nombre'].lower() not in GESTIONES:
            raise _error(nombre, numero, f'gestión desconocida {fila["tipo_gestion_nombre"]!r}')
        departamento = LIMA if sin_tildes(fila['departamento']) == 'lima' else departamentos.get(
            sin_tildes(fila['departamento']))
        if departamento is None:
            raise _error(nombre, numero, f'departamento desconocido {fila["departamento"]!r}')
        if fila['id'] not in con_carreras:
            sin_carreras += 1
            continue
        instituciones.append(InstitucionArchivo(
            id=fila['id'], nombre=titulo(fila['institucion_nombre']), tipo=TIPOS[fila['tipo_institucion_id']],
            gestion=GESTIONES[fila['tipo_gestion_nombre'].lower()], departamento=departamento,
            distrito=fila['distrito'] or None, direccion=fila['direccion'] or None,
            pagina_web=fila['pagina_web'] or None))
    cargadas = {i.id for i in instituciones}
    desconocidas = sorted(con_carreras - cargadas)
    if desconocidas:
        raise ValueError(f'instituciones_carreras.csv: instituciones desconocidas {", ".join(desconocidas)}')
    registro.info('Instituciones sin carreras no cargadas: %d', sin_carreras)
    return instituciones, ofertas_leidas


def _leer_ingresos(carpeta, catalogo):
    nombre = 'carreras_salarios_por_departamento.csv'
    vistos, descartadas = set(), 0
    for numero, fila in _leer(carpeta, nombre, ('tipo_institucion_id', 'departamento_id', 'ing_prom_adultos',
                                                'ing_prom_jovenes', 'min_max_adultos', 'min_max_jovenes',
                                                'codigo_cine_familia')):
        familia = fila['codigo_cine_familia'].zfill(3)
        departamento = None if fila['departamento_id'] == NACIONAL else fila['departamento_id']
        if fila['tipo_institucion_id'] not in TIPOS or familia not in catalogo.familias or (
                departamento is not None and departamento not in catalogo.departamentos):
            raise _error(nombre, numero, 'tipo, familia o departamento desconocido')
        clave = (fila['tipo_institucion_id'], familia, departamento)
        if clave in vistos:
            descartadas += 1
            continue
        vistos.add(clave)
        try:
            jovenes, adultos = rango(fila['min_max_jovenes']), rango(fila['min_max_adultos'])
        except ValueError as error:
            raise _error(nombre, numero, str(error)) from None
        catalogo.ingresos_familia.append(IngresoFamiliaArchivo(
            tipo=TIPOS[fila['tipo_institucion_id']], familia=familia, departamento=departamento,
            jovenes=(_entero(nombre, numero, fila['ing_prom_jovenes']), *jovenes),
            adultos=(_entero(nombre, numero, fila['ing_prom_adultos']), *adultos)))
    registro.info('Ingresos por departamento descartados por repetir tipo, campo y departamento: %d', descartadas)
    nombre = 'instituciones_salarios_por_familia.csv'
    instituciones = {i.id for i in catalogo.instituciones}
    descartadas = 0
    for numero, fila in _leer(carpeta, nombre, ('codigo_cine_familia', 'institucion_id', 'ing_promedio', 'min_max')):
        familia = fila['codigo_cine_familia'].zfill(3)
        if familia not in catalogo.familias:
            raise _error(nombre, numero, f'familia desconocida {familia}')
        clave = (fila['institucion_id'], familia)
        if fila['institucion_id'] not in instituciones or clave in catalogo.ingresos_institucion:
            descartadas += 1
            continue
        try:
            minimo, maximo = rango(fila['min_max'])
        except ValueError as error:
            raise _error(nombre, numero, str(error)) from None
        catalogo.ingresos_institucion[clave] = (_entero(nombre, numero, fila['ing_promedio']), minimo, maximo)
    registro.info('Ingresos por institución descartados (institución no cargada o repetidos): %d', descartadas)


def _leer_ocupaciones(carpeta, catalogo):
    catalogo.grupos = {f['codigo']: f['nombre'] for _, f in _leer(carpeta, 'grupos_ocupacionales.csv',
                                                                    ('codigo', 'nombre'))}
    traduccion = {}
    for _, fila in _leer(carpeta, 'estilos_trabajo.csv', ('valor_mpp', 'codigo', 'nombre')):
        traduccion[fila['valor_mpp']] = fila['codigo']
        catalogo.estilos[fila['codigo']] = fila['nombre']
    nombre = 'ocupaciones_mpp_completo.csv'
    letras = tuple(f'riasec_{d}' for d, _ in DIMENSIONES_RIASEC)
    for numero, fila in _leer(carpeta, nombre, ('codigo', 'titulo_es', 'resumen_es', 'tambien_llamado',
                                                'descripcion_es', 'job_zone', 'riasec_perfil', 'grupo_mayor',
                                                'flag_en_mpp', 'tareas', 'conocimientos_detalle',
                                                'aptitudes_detalle', 'personalidad_frase', 'estilos_trabajo',
                                                *letras)):
        if fila['flag_en_mpp'] != '1':
            continue
        if not re.fullmatch(r'\d{2}-\d{4}\.\d{2}', fila['codigo']) or not fila['titulo_es']:
            raise _error(nombre, numero, f'código O*NET o título inválido {fila["codigo"]!r}')
        grupo = fila['grupo_mayor'].zfill(2)
        if grupo not in catalogo.grupos:
            raise _error(nombre, numero, f'grupo desconocido {grupo}')
        estilos = []
        for valor in _json(nombre, numero, fila['estilos_trabajo'], list):
            if valor not in traduccion:
                raise _error(nombre, numero, f'estilo de trabajo desconocido {valor!r}')
            if traduccion[valor] not in estilos:
                estilos.append(traduccion[valor])
        try:
            puntajes = tuple(float(fila[c]) for c in letras)
        except ValueError:
            raise _error(nombre, numero, 'puntaje RIASEC no numérico') from None
        if not all(PUNTAJE_OCUPACION_MINIMO <= p <= PUNTAJE_OCUPACION_MAXIMO for p in puntajes):
            raise _error(nombre, numero, 'puntaje RIASEC fuera de la escala')
        perfil = fila['riasec_perfil']
        if not 1 <= len(perfil) <= 3 or any(c not in 'RIASEC' for c in perfil) or len(set(perfil)) != len(perfil):
            raise _error(nombre, numero, f'perfil RIASEC inválido {perfil!r}')
        job_zone = int(fila['job_zone']) if fila['job_zone'] else None
        if job_zone is not None and not 1 <= job_zone <= 5:
            raise _error(nombre, numero, f'job_zone inválido {job_zone}')
        conocimientos = _json(nombre, numero, fila['conocimientos_detalle'], dict)
        aptitudes = _json(nombre, numero, fila['aptitudes_detalle'], dict)
        catalogo.ocupaciones.append(OcupacionArchivo(
            codigo_onet=fila['codigo'], titulo=fila['titulo_es'], grupo=grupo,
            resumen=_resumen(fila['resumen_es'], fila['descripcion_es']), descripcion=fila['descripcion_es'] or None,
            job_zone=job_zone, personalidad=fila['personalidad_frase'] or None,
            tambien_llamado=tuple(dict.fromkeys(
                v.strip() for v in _json(nombre, numero, fila['tambien_llamado'], list) if str(v).strip())),
            tareas=_limpias(_json(nombre, numero, fila['tareas'], list)),
            conocimientos=_limpias(v for vinetas in conocimientos.values() for v in vinetas),
            aptitudes=_limpias(v for vinetas in aptitudes.values() for v in vinetas),
            estilos_trabajo=tuple(estilos), puntajes=puntajes, perfil=perfil))
    if len({o.codigo_onet for o in catalogo.ocupaciones}) != len(catalogo.ocupaciones):
        raise ValueError(f'{nombre}: hay códigos O*NET repetidos')


def leer_catalogo(carpeta: Path | None = None) -> CatalogoArchivo:
    carpeta = carpeta or CARPETA_CATALOGO
    catalogo = CatalogoArchivo()
    _leer_familias(carpeta, catalogo)
    for numero, fila in _leer(carpeta, 'departamentos.csv', ('codigo_departamento', 'departamento_nombre')):
        if fila['codigo_departamento'] != NACIONAL:
            catalogo.departamentos[fila['codigo_departamento']] = (
                'Lima' if fila['codigo_departamento'] == LIMA else titulo(fila['departamento_nombre']))
    carreras = _leer_carreras(carpeta, catalogo)
    instituciones, ofertas = _leer_instituciones(carpeta, catalogo, {c.id for c in carreras})
    catalogo.carreras, catalogo.ofertas = _fusionar_duplicadas(carreras, ofertas)
    catalogo.instituciones = instituciones
    _leer_ingresos(carpeta, catalogo)
    _leer_ocupaciones(carpeta, catalogo)
    return catalogo


def codigo_ocupacion(codigo_onet: str, slugs: dict[str, str]) -> str:
    """El slug que usan casos y testimonios, si lo tiene; si no, `onet-15-1252-00`."""
    return slugs.get(codigo_onet) or 'onet-' + codigo_onet.replace('.', '-')


def _ids(sesion, modelo):
    return dict(sesion.execute(select(modelo.codigo, modelo.id)).all())


def _cargar_carreras(sesion, catalogo, dimensiones):
    sesion.execute(insert(modelos.FamiliaCarrera), [
        {'codigo': c, 'nombre': n, 'area_codigo': a, 'area_nombre': catalogo.areas[a]}
        for c, (n, a) in sorted(catalogo.familias.items())])
    familias = _ids(sesion, modelos.FamiliaCarrera)
    sesion.execute(insert(modelos.Carrera), [
        {'codigo': f'mtpe-{c.id}', 'nombre': c.nombre, 'busqueda': sin_tildes(c.nombre), 'tipo': c.tipo,
         'familia_id': familias[c.familia], 'codigo_cine': c.codigo_cine, 'nombre_cine': c.nombre_cine,
         'descripcion': c.descripcion, 'duracion': c.duracion, 'ambito_laboral': c.ambito_laboral,
         'codigo_riasec': c.riasec or None}
        for c in catalogo.carreras])
    carreras = _ids(sesion, modelos.Carrera)
    tipos = [{'carrera_id': carreras[f'mtpe-{c.id}'], 'posicion': posicion, 'dimension_id': dimensiones[letra].id}
             for c in catalogo.carreras for posicion, letra in enumerate(c.riasec, start=1)]
    if tipos:
        sesion.execute(insert(modelos.TipoCarrera), tipos)
    return familias, carreras


def _cargar_instituciones(sesion, catalogo, familias, carreras):
    sesion.execute(insert(modelos.Ubicacion), [{'codigo': f'dep-{c}', 'nombre': n}
                                                for c, n in sorted(catalogo.departamentos.items())])
    ubicaciones = _ids(sesion, modelos.Ubicacion)
    sesion.execute(insert(modelos.Institucion), [
        {'codigo': f'inst-{i.id}', 'nombre': i.nombre, 'busqueda': sin_tildes(i.nombre), 'tipo': i.tipo,
         'gestion': i.gestion, 'ubicacion_id': ubicaciones[f'dep-{i.departamento}'], 'distrito': i.distrito,
         'direccion': i.direccion, 'pagina_web': i.pagina_web}
        for i in catalogo.instituciones])
    instituciones = _ids(sesion, modelos.Institucion)
    duraciones = {c.id: ciclos_de(c.duracion) for c in catalogo.carreras}
    sesion.execute(insert(modelos.InstitucionCarrera), [
        {'institucion_id': instituciones[f'inst-{i}'], 'carrera_id': carreras[f'mtpe-{c}'],
         'duracion_ciclos': duraciones[c]}
        for i, c in sorted(catalogo.ofertas)])
    sesion.execute(insert(modelos.IngresoFamilia), [
        {'tipo': f.tipo, 'familia_id': familias[f.familia],
         'ubicacion_id': None if f.departamento is None else ubicaciones[f'dep-{f.departamento}'],
         'promedio_jovenes': f.jovenes[0], 'minimo_jovenes': f.jovenes[1], 'maximo_jovenes': f.jovenes[2],
         'promedio_adultos': f.adultos[0], 'minimo_adultos': f.adultos[1], 'maximo_adultos': f.adultos[2]}
        for f in catalogo.ingresos_familia])
    sesion.execute(insert(modelos.IngresoInstitucion), [
        {'institucion_id': instituciones[f'inst-{i}'], 'familia_id': familias[f], 'promedio': p, 'minimo': mi,
         'maximo': ma}
        for (i, f), (p, mi, ma) in sorted(catalogo.ingresos_institucion.items())])


def _cargar_ocupaciones(sesion, catalogo, dimensiones, slugs):
    faltantes = sorted(set(slugs) - {o.codigo_onet for o in catalogo.ocupaciones})
    if faltantes:
        raise ValueError(f'Faltan en Mi Próximo Paso las ocupaciones {", ".join(faltantes)}')
    sesion.execute(insert(modelos.GrupoOcupacional), [{'codigo': c, 'nombre': n}
                                                       for c, n in sorted(catalogo.grupos.items())])
    sesion.execute(insert(modelos.EstiloTrabajo), [{'codigo': c, 'nombre': n}
                                                    for c, n in sorted(catalogo.estilos.items())])
    sesion.execute(insert(modelos.Ocupacion), [
        {'codigo': codigo_ocupacion(o.codigo_onet, slugs), 'codigo_onet': o.codigo_onet, 'titulo': o.titulo,
         'grupo': o.grupo, 'resumen': o.resumen, 'descripcion': o.descripcion, 'job_zone': o.job_zone,
         'personalidad': o.personalidad, 'tambien_llamado': list(o.tambien_llamado), 'tareas': list(o.tareas),
         'conocimientos': list(o.conocimientos), 'aptitudes': list(o.aptitudes),
         'estilos_trabajo': list(o.estilos_trabajo), 'codigo_riasec': o.perfil,
         'busqueda': sin_tildes(' '.join((o.titulo, *o.tambien_llamado)))}
        for o in catalogo.ocupaciones])
    ocupaciones = dict(sesion.execute(select(modelos.Ocupacion.codigo_onet, modelos.Ocupacion.id)).all())
    sesion.execute(insert(modelos.PuntajeOcupacion), [
        {'ocupacion_id': ocupaciones[o.codigo_onet], 'dimension_id': dimensiones[d].id, 'valor': o.puntajes[n]}
        for o in catalogo.ocupaciones for n, (d, _) in enumerate(DIMENSIONES_RIASEC)])
    sesion.execute(insert(modelos.HighPoint), [
        {'ocupacion_id': ocupaciones[o.codigo_onet], 'posicion': posicion, 'dimension_id': dimensiones[letra].id}
        for o in catalogo.ocupaciones for posicion, letra in enumerate(o.perfil, start=1)])
    return _ids(sesion, modelos.Ocupacion)


def _relacionar_provisional(sesion, catalogo, carreras, ocupaciones):
    """Provisional hasta el emparejamiento real: de 3 a 5 ocupaciones al azar por carrera, reproducible
    (semilla fija, sorteo sobre los códigos ordenados), sin las carreras de las Fuerzas Armadas."""
    azar = random.Random(SEMILLA_CARRERA_OCUPACION)
    codigos = sorted(ocupaciones)
    filas = []
    for carrera in sorted(catalogo.carreras, key=lambda c: f'mtpe-{c.id}'):
        if carrera.familia in CAMPOS_SIN_OCUPACIONES:
            continue
        for codigo in azar.sample(codigos, azar.randint(*OCUPACIONES_POR_CARRERA)):
            filas.append({'carrera_id': carreras[f'mtpe-{carrera.id}'], 'ocupacion_id': ocupaciones[codigo]})
    sesion.execute(insert(modelos.CarreraOcupacion), filas)


def cargar(sesion: Session, dimensiones: dict, slugs: dict[str, str], carpeta: Path | None = None) -> None:
    """Carga todo el catálogo. `dimensiones` son las del test RIASEC por letra; `slugs`, código O*NET → slug."""
    catalogo = leer_catalogo(carpeta)
    familias, carreras = _cargar_carreras(sesion, catalogo, dimensiones)
    _cargar_instituciones(sesion, catalogo, familias, carreras)
    ocupaciones = _cargar_ocupaciones(sesion, catalogo, dimensiones, slugs)
    _relacionar_provisional(sesion, catalogo, carreras, ocupaciones)
