"""Coherencia entre los conjuntos `contenido` y `ruta` y los JSON del front (ajustes carga-actividades y carga-casos).

Carga cada conjunto en una base temporal y comprueba, sin servicios externos:
- en `contenido`: que cada actividad tiene su JSON (`plataforma/`, o `ruta/` para lo provisional); que cada `desafio`
  de un JSON es una batalla cargada y existe en `challenges.ts`; que cada `item` de un JSON es un ítem cargado de esa
  actividad, del tipo de su nodo (elección si es podio); que cada referencia de un eco está cargada para esa
  actividad; que ningún JSON de `plataforma/` trae `recompensa.recursoIds`, y que cada caso lo juega exactamente una
  actividad;
- en los dos conjuntos, los casos: cada actividad CASO nombra un `caso` con su JSON en `src/data/cases/plataforma/`;
  el JSON cumple el formato (ver `docs/sistema/integracion.md`); cada `onet` es una ocupación cargada; el total de
  necesidades es el `puntaje_maximo` de cada actividad que lo juega y los conteos por problema son los de
  `CONFIGURACION_CASOS`, con `puntaje_minimo` ≤ máximo;
- en los dos conjuntos, los testimonios: una sola regla TESTIMONIO, SUPERA_CASO (su ocupación es una necesidad de ese
  caso) o COMPLETA_ACTIVIDAD (su ocupación está en el catálogo); `video_id` de 11 caracteres sin parámetros y `fin`
  mayor que `inicio`, si lo hay; título y pista sin el título de la ocupación;
- en `contenido`, que ningún texto de actividad ni pregunta de batalla nombre `T0*` ni un código `tc`/`tb`.
Las imágenes de un caso que no están en `ov_frontend/public/` son avisos, no discrepancias.

Uso: `uv run python scripts/verificar_contenido_front.py [--front ../ov_frontend]`. Sale con 1 si hay discrepancias.
"""

import argparse
import json
from pathlib import Path
import re
import sys
from tempfile import TemporaryDirectory

if __package__ in (None, ''):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app import models as m  # noqa: E402
from app.database import crear_motor_bd  # noqa: E402
from app.models.base import sin_tildes  # noqa: E402
from datos import contenido as datos_contenido, ruta as datos_ruta  # noqa: E402
from datos.cargar import preparar_base  # noqa: E402

MODULOS = {'contenido': datos_contenido, 'ruta': datos_ruta}
_CODIGO_DE_VOZ = re.compile(r'\b(?:T0\d|t[cb]\d+-\d+)\b')


def _ecos(nodo):
    eco = nodo.get('eco')
    return [] if eco is None else [eco] if isinstance(eco, str) else list(eco)


def _json_actividad(contenidos: Path, actividad) -> Path:
    carpeta = 'ruta' if actividad.codigo.startswith('t-') else 'plataforma'
    return contenidos / carpeta / f'{actividad.contenido}.json'


def _verificar_actividades(front: Path, sesion, actividades) -> list[str]:
    contenidos = front / 'src/data/activities/contenidos'
    desafios = set(re.findall(r"id: '(desafio-[a-z0-9-]+)'",
                              (front / 'src/data/content/challenges.ts').read_text(encoding='utf-8')))
    items = {i.codigo: i for i in sesion.scalars(select(m.ItemRegistro))}
    referencias = {(r.codigo, r.actividad_id) for r in sesion.scalars(select(m.Referencia))}
    opciones_por_lista = {}
    for opcion in sesion.scalars(select(m.OpcionLista)):
        opciones_por_lista.setdefault(opcion.lista_id, set()).add(opcion.codigo)
    errores = []
    for codigo, actividad in sorted(actividades.items()):
        archivo = _json_actividad(contenidos, actividad)
        if not archivo.exists():
            errores.append(f'{codigo}: no tiene {archivo.relative_to(front)}')
            continue
        datos = json.loads(archivo.read_text(encoding='utf-8'))
        if archivo.parent.name == 'plataforma' and 'recursoIds' in (datos.get('recompensa') or {}):
            errores.append(f'{codigo}: trae recompensa.recursoIds')
        if 'desafio' in datos and (actividad.tipo != m.TipoActividad.BATALLA or datos['desafio'] not in desafios):
            errores.append(f'{codigo}: el desafío {datos["desafio"]} no es una batalla cargada')
        if actividad.tipo == m.TipoActividad.BATALLA and 'desafio' not in datos:
            errores.append(f'{codigo}: es una batalla y su JSON no nombra un desafío')
        for nodo in datos.get('nodos', []):
            if nodo.get('item'):
                item = items.get(nodo['item'])
                if item is None or item.actividad_id != actividad.id:
                    errores.append(f'{codigo}: el ítem {nodo["item"]} no está cargado en esta actividad')
                elif ('podio' in nodo or 'eleccion' in nodo) != (item.fuente_opciones is not None):
                    errores.append(f'{codigo}: el ítem {nodo["item"]} no es del tipo de su nodo')
            for eco in _ecos(nodo):
                if (eco, actividad.id) not in referencias:
                    errores.append(f'{codigo}: la referencia {eco} ({nodo["id"]}) no está cargada')
            # Ajuste registros: las exclusivas y preguntas que nombra el JSON son opciones del ítem (lista o propias).
            item = items.get(nodo.get('item'))
            if item is not None and 'eleccion' in nodo:
                nombradas = set(nodo['eleccion'].get('exclusivas', ())) | set(nodo['eleccion'].get('preguntas', {}))
                ajenas = nombradas - _opciones_item(opciones_por_lista, item) - {'OTRA'}
                if item.fuente_opciones != m.FuenteOpciones.REFERENCIA and ajenas:
                    errores.append(f'{codigo}: {nodo["item"]} nombra opciones que no tiene: {sorted(ajenas)}')
        # Ajuste registros: cada destino apunta a un ítem de la actividad y a una de sus opciones (o «*»).
        for destino in datos.get('destinos', ()):
            item = items.get(destino.get('item'))
            if item is None or item.actividad_id != actividad.id:
                errores.append(f'{codigo}: el destino nombra el ítem {destino.get("item")}, que no es de esta actividad')
            elif destino.get('opcion') != '*' and item.fuente_opciones != m.FuenteOpciones.REFERENCIA and (
                    destino.get('opcion') not in _opciones_item(opciones_por_lista, item)):
                errores.append(f'{codigo}: el destino nombra la opción {destino.get("opcion")}, que {item.codigo} no tiene')
            if destino.get('ruta') not in RUTAS_DESTINO:
                errores.append(f'{codigo}: el destino {destino.get("ruta")} no es una ruta del front')
        if datos.get('destino_por_defecto') not in (None, *RUTAS_DESTINO):
            errores.append(f'{codigo}: el destino por defecto {datos["destino_por_defecto"]} no es una ruta del front')
    sobrantes = {p.stem for p in (contenidos / 'plataforma').glob('*.json')} - {
        a.contenido for a in actividades.values()}
    errores += [f'plataforma/{s}.json no corresponde a ninguna actividad' for s in sorted(sobrantes)]
    return errores


# Las rutas que el front sabe resolver (`features/activities/lib/destinoRegistro.ts`).
RUTAS_DESTINO = (None, 'familia', 'catalogo', 'catalogo-familia', 'catalogo-instituciones', 'plan-a', 'plan-a-dudas',
                 'plan-b', 'mis-planes', 'investigaciones', 'ciudad')


def _opciones_item(opciones_por_lista, item):
    return set(opciones_por_lista.get(item.lista_id, ())) | {o['codigo'] for o in item.opciones_propias or ()}


def _textos(valor, ruta=''):
    """Los textos vacíos de un JSON, con su ruta."""
    if isinstance(valor, str):
        return [ruta] if not valor.strip() else []
    if isinstance(valor, dict):
        return [r for k, v in valor.items() for r in _textos(v, f'{ruta}.{k}' if ruta else k)]
    if isinstance(valor, list):
        return [r for n, v in enumerate(valor) for r in _textos(v, f'{ruta}[{n}]')]
    return []


def _imagenes(caso: dict) -> list[str]:
    return [caso['intro']['imagen'], *(f['fondo']['imagen'] for f in caso['fases'])]


def necesidades_por_problema(caso: dict) -> list[list[str]]:
    """Los `onet` que necesita cada problema, en orden de fase y problema."""
    return [[n['onet'] for n in p['necesidades']] for f in caso['fases'] for p in f['problemas']]


def verificar_formato_caso(caso: dict) -> list[str]:
    """Las reglas del formato de un JSON de caso que no dependen del servidor."""
    errores = []
    try:
        profesionales = [p['onet'] for p in caso['profesionales']]
        ids = [f['id'] for f in caso['fases']]
        ids += [x['id'] for f in caso['fases'] for x in (*f['mensajes'], *f['problemas'])]
        problemas = [p for f in caso['fases'] for p in f['problemas']]
        posiciones = [x['posicion'][eje] for f in caso['fases'] for x in f['mensajes'] for eje in ('x', 'y')]
        imagenes = _imagenes(caso)
        presupuesto = caso['presupuesto']
    except (KeyError, TypeError) as error:
        return [f'falta el campo {error}']
    if len(set(profesionales)) != len(profesionales):
        errores.append('hay `onet` repetidos en profesionales')
    for problema in problemas:
        onets = [n['onet'] for n in problema['necesidades']]
        if fuera := sorted(set(onets) - set(profesionales)):
            errores.append(f'el problema {problema["id"]} necesita ocupaciones fuera del directorio: {fuera}')
        if len(set(onets)) != len(onets):
            errores.append(f'el problema {problema["id"]} repite una ocupación')
    if repetidos := sorted({i for i in ids if ids.count(i) > 1}):
        errores.append(f'ids repetidos de fases, mensajes o problemas: {repetidos}')
    errores += [f'texto vacío en {r}' for r in _textos(caso)]
    if any(not isinstance(p, (int, float)) or not 0 <= p <= 100 for p in posiciones):
        errores.append('hay posiciones fuera de 0–100')
    total = sum(len(n) for n in necesidades_por_problema(caso))
    if not isinstance(presupuesto, int) or presupuesto < total:
        errores.append(f'el presupuesto {presupuesto} no alcanza el total de necesidades ({total})')
    errores += [f'la imagen {i} lleva parámetros' for i in imagenes if '?' in i]
    return errores


def _verificar_casos(front: Path, conjunto: str, sesion, actividades) -> tuple[list[str], list[str]]:
    modulo = MODULOS[conjunto]
    contenidos = front / 'src/data/activities/contenidos'
    publico = front / 'public'
    ocupaciones = set(sesion.scalars(select(m.Ocupacion.codigo)))
    errores, avisos, jugados, casos = [], [], {}, {}
    for codigo, actividad in sorted(actividades.items()):
        if actividad.tipo != m.TipoActividad.CASO:
            continue
        archivo = _json_actividad(contenidos, actividad)
        nombre = json.loads(archivo.read_text(encoding='utf-8')).get('caso') if archivo.exists() else None
        if not nombre:
            errores.append(f'{conjunto} · {codigo}: su JSON no nombra un caso')
            continue
        ruta_caso = front / 'src/data/cases/plataforma' / f'{nombre}.json'
        if not ruta_caso.exists():
            errores.append(f'{conjunto} · {codigo}: no existe {ruta_caso.relative_to(front)}')
            continue
        jugados.setdefault(nombre, []).append(codigo)
        if nombre not in casos:
            caso = json.loads(ruta_caso.read_text(encoding='utf-8'))
            casos[nombre] = caso
            if caso.get('id') != nombre:
                errores.append(f'{nombre}.json: su id es {caso.get("id")!r}')
            formato = verificar_formato_caso(caso)
            errores += [f'{nombre}.json: {e}' for e in formato]
            if formato:
                continue
            fuera = sorted({p['onet'] for p in caso['profesionales']} - ocupaciones)
            errores += [f'{nombre}.json: {o} no es una ocupación cargada' for o in fuera]
            avisos += [f'{nombre}.json: falta la imagen {i}' for i in _imagenes(caso)
                       if not (publico / i).exists() and not (publico / 'images' / i).exists()]
        caso = casos[nombre]
        if verificar_formato_caso(caso):
            continue
        conteos = tuple(len(n) for n in necesidades_por_problema(caso))
        if actividad.puntaje_maximo != sum(conteos):
            errores.append(f'{conjunto} · {codigo}: el máximo {actividad.puntaje_maximo} no es el total de '
                           f'necesidades de {nombre} ({sum(conteos)})')
        if tuple(modulo.CONFIGURACION_CASOS.get(codigo, (None, ()))[1]) != conteos:
            errores.append(f'{conjunto} · {codigo}: CONFIGURACION_CASOS no coincide con {nombre} {conteos}')
        if actividad.puntaje_minimo is None or actividad.puntaje_minimo > sum(conteos):
            errores.append(f'{conjunto} · {codigo}: el mínimo {actividad.puntaje_minimo} supera el máximo')
    if conjunto == 'contenido':
        errores += [f'contenido · el caso {n} lo juegan varias actividades: {c}' for n, c in sorted(jugados.items())
                    if len(c) > 1]
    caso_de = {codigo: n for n, codigos in jugados.items() for codigo in codigos}
    errores += _verificar_testimonios(conjunto, sesion, caso_de, casos)
    return errores, avisos


def _verificar_testimonios(conjunto: str, sesion, caso_de: dict, casos: dict) -> list[str]:
    modulo = MODULOS[conjunto]
    titulos = dict(sesion.execute(select(m.Ocupacion.codigo, m.Ocupacion.titulo)).all())
    errores = []
    for codigo, titulo, _desc, video, inicio, fin, pista, _persona, ocupacion, _contexto, _cita in modulo.TESTIMONIOS:
        prefijo = f'{conjunto} · {codigo}'
        reglas = [c for _, tipo, objetivo, _, c in modulo.REGLAS if tipo == 'TESTIMONIO' and objetivo == codigo]
        if len(reglas) != 1:
            errores.append(f'{prefijo}: tiene {len(reglas)} reglas TESTIMONIO y debe tener una')
        condiciones = [c for regla in reglas for c in regla]
        de_caso = [c[1] for c in condiciones if c[0] == 'SUPERA_CASO']
        if not de_caso and not any(c[0] == 'COMPLETA_ACTIVIDAD' for c in condiciones):
            errores.append(f'{prefijo}: su regla no es SUPERA_CASO ni COMPLETA_ACTIVIDAD')
        if ocupacion not in titulos:
            errores.append(f'{prefijo}: su ocupación {ocupacion} no está en el catálogo')
        for actividad in de_caso:
            nombre = caso_de.get(actividad)
            if nombre and not verificar_formato_caso(casos[nombre]) and ocupacion not in {
                    o for n in necesidades_por_problema(casos[nombre]) for o in n}:
                errores.append(f'{prefijo}: su ocupación {ocupacion} no es una necesidad de {nombre}, '
                               'el caso que lo regala')
        if not re.fullmatch(r'[A-Za-z0-9_-]{11}', video):
            errores.append(f'{prefijo}: el video_id {video} no tiene 11 caracteres sin parámetros')
        if fin is not None and fin <= inicio:
            errores.append(f'{prefijo}: el fin {fin} no supera el inicio {inicio}')
        nombre_ocupacion = sin_tildes(titulos.get(ocupacion, '')).lower()
        for campo, texto in (('título', titulo), ('pista', pista)):
            if nombre_ocupacion and nombre_ocupacion in sin_tildes(texto or '').lower():
                errores.append(f'{prefijo}: su {campo} nombra la ocupación que hay que llamar')
    return errores


def _verificar_codigos_de_voces(front: Path) -> list[str]:
    """Los textos de `contenido` no nombran códigos internos de testimonios (`T05`, `tc1-1`, `tb3-1`)."""
    errores = []
    carpeta = front / 'src/data/activities/contenidos/plataforma'
    for archivo in sorted(carpeta.glob('*.json')):
        if encontrado := _CODIGO_DE_VOZ.search(archivo.read_text(encoding='utf-8')):
            errores.append(f'plataforma/{archivo.name}: nombra el código interno {encontrado.group()}')
    for codigo, _batalla, _ficha, enunciado, opciones, _correcta, explicacion in datos_contenido.PREGUNTAS_BATALLA:
        if encontrado := _CODIGO_DE_VOZ.search(' '.join((enunciado, *opciones, explicacion))):
            errores.append(f'contenido · {codigo}: nombra el código interno {encontrado.group()}')
    return errores


def verificar(front: Path) -> tuple[list[str], list[str]]:
    errores, avisos = [], []
    with TemporaryDirectory() as carpeta:
        for conjunto in ('contenido', 'ruta'):
            url = f'sqlite:///{(Path(carpeta) / f"{conjunto}.db").as_posix()}'
            preparar_base(url, conjunto, crear_tablas=True)
            motor = crear_motor_bd(url)
            try:
                with Session(motor) as sesion:
                    actividades = {a.codigo: a for a in sesion.scalars(select(m.Actividad))}
                    if conjunto == 'contenido':
                        errores += _verificar_actividades(front, sesion, actividades)
                        errores += _verificar_codigos_de_voces(front)
                    de_casos, avisos_casos = _verificar_casos(front, conjunto, sesion, actividades)
                    errores += de_casos
                    avisos += [a for a in avisos_casos if a not in avisos]
            finally:
                motor.dispose()
    return errores, avisos


def main(argumentos=None) -> int:
    analizador = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    analizador.add_argument('--front', type=Path, default=Path(__file__).resolve().parents[2] / 'ov_frontend')
    opciones = analizador.parse_args(argumentos)
    errores, avisos = verificar(opciones.front)
    for aviso in avisos:
        print(f'Aviso: {aviso}')
    for error in errores:
        print(error)
    print('Sin discrepancias.' if not errores else f'{len(errores)} discrepancias.')
    return 1 if errores else 0


if __name__ == '__main__':
    raise SystemExit(main())
