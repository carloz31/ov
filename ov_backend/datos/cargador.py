"""Cargador común de los conjuntos de datos: interpreta las tuplas de un módulo de datos (`ruta.py`, `contenido.py`).

Los módulos de datos solo declaran tuplas; este módulo las valida y las inserta sin lógica a medida. Una tupla que
un conjunto no declara se trata como vacía. La transacción pertenece al llamador; este módulo no confirma ni migra.
"""

from functools import cache
import re

from argon2 import PasswordHasher
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models as modelos
from app.core.parametros import MAXIMO_ITEMS_REGISTRO
from datos import fijos


# Mismos parámetros por defecto que `app/services/acceso.py`; datos/ no importa services/.
_HASHER = PasswordHasher()

# Tipos de referencia que leen el resultado de una aplicación y los que no llevan fuente.
FUENTE_APLICACION = ('RESULTADO', 'COINCIDENCIAS')
SIN_FUENTE = ('FAVORITOS', 'PLAN', 'PLANES', 'PASOS_PLAN_A', 'OPCION_INICIAL', 'LO_QUE_PIENSO',
              'FAMILIAS_RECOMENDADAS', 'TESTIMONIOS', 'DATOS_CARRERA_PLAN_A', 'CHECK_IN_PRIMERO')
# Ajuste registros: referencias que pueden dar las opciones de un ítem (resueltas en vivo).
FUENTES_DE_OPCIONES = ('PLANES', 'FAMILIAS_RECOMENDADAS', 'ELECCION', 'TESTIMONIOS')
# Ajuste registros llm (lote 2): la consigna en cuatro partes, los ecos y la opción propia.
CAMPOS_PRESENTACION = frozenset({'dialogo', 'pregunta_eleccion', 'pregunta_texto', 'arranque', 'ecos_mostrar',
                                 'ecos_llm'})
CAMPOS_PROPIA = frozenset({'codigo', 'texto', 'exclusiva', 'pregunta', 'arranque', 'sin_llm'})
CAMPOS_ECO = frozenset({'origen', 'codigo', 'nombre', 'forma'})
# De la tarjeta, lo que usa el LLM; la presentación del runner vive en el ítem.
CAMPOS_TARJETA_LLM = ('tarjeta', 'bases', 'general_por_opcion', 'filtrar_etiqueta')
# Marcadores que la función de contexto sabe resolver (§2). `{opción}` va solo en las bases de las tarjetas.
MARCADORES = frozenset({'carrera', 'plan_a', 'plan_b', 'primera', 'valor 1', 'habilidad', 'opción'})
_MARCADOR = re.compile(r'\{([^{}\n]+)\}')
# El video de un testimonio: el ID de YouTube, sin parámetros.
_VIDEO_YOUTUBE = re.compile(r'[A-Za-z0-9_-]{11}')
MAXIMO_CONTEXTO_TESTIMONIO = 80

# Tuplas que se leen como diccionario; las demás, como secuencia.
_DICCIONARIOS = frozenset({
    'PROPIEDADES', 'DESCRIPCIONES', 'CONFIGURACION_BATALLAS', 'CONFIGURACION_CASOS', 'PROPIEDADES_ITEMS',
    'TEXTOS_INSIGNIAS', 'PAGINAS_INSIGNIAS', 'PISTAS_INSIGNIAS', 'CITAS_LUMI', 'TEXTOS_CONDICIONES',
    'EVALUADORES_REGLAS', 'CARRERAS_RUTA', 'INSTITUCIONES_RUTA', 'UBICACIONES_RUTA', 'RESPALDOS_DIARIO', 'TARJETAS',
})


@cache
def _hash(contrasena: str) -> str:
    # Uno por contraseña y proceso: recargar deja las mismas filas y no repite el costo de Argon2id.
    return _HASHER.hash(contrasena)


class _Tuplas:
    """Lee las tuplas del módulo al usarlas (las pruebas pueden reemplazarlas); las no declaradas, vacías."""

    def __init__(self, modulo):
        self._modulo = modulo

    def __getattr__(self, nombre):
        if nombre == 'RECUERDOS_LUMI':
            # Los recuerdos de Lumi son las actividades del bloque LUMI.
            return tuple(codigo for codigo, bloque, *_ in self.ACTIVIDADES if bloque == 'LUMI')
        return getattr(self._modulo, nombre, {} if nombre in _DICCIONARIOS else ())


def contenido(codigo: str) -> str:
    return codigo.replace('-', '_')


def _validar_testimonio(codigo, video, inicio, fin, contexto):
    if not _VIDEO_YOUTUBE.fullmatch(video):
        raise ValueError(f'El testimonio {codigo} tiene un video_id inválido: {video}')
    if inicio < 0:
        raise ValueError(f'El testimonio {codigo} tiene un inicio negativo: {inicio}')
    if fin is not None and fin <= inicio:
        raise ValueError(f'El testimonio {codigo} tiene un fin ({fin}) que no supera su inicio ({inicio})')
    if contexto is not None and len(contexto) > MAXIMO_CONTEXTO_TESTIMONIO:
        raise ValueError(f'El contexto del testimonio {codigo} pasa de {MAXIMO_CONTEXTO_TESTIMONIO} caracteres')


def _validar_origen_testimonios(m):
    """Toda voz se abre superando un caso o completando una actividad: de ahí sale su origen."""
    origenes = {objetivo for _, tipo, objetivo, _, condiciones in m.REGLAS if tipo == 'TESTIMONIO'
                for evento, *_ in condiciones if evento in ('SUPERA_CASO', 'COMPLETA_ACTIVIDAD')}
    if sin_origen := {c for c, *_ in m.TESTIMONIOS} - origenes:
        raise ValueError(f'Testimonios sin regla SUPERA_CASO ni COMPLETA_ACTIVIDAD: {sorted(sin_origen)}')


def _cargar_estructura(m, sesion):
    colegios = {c: modelos.Colegio(codigo=c, nombre=n) for c, n in m.COLEGIOS}
    sesion.add_all(colegios.values())
    sesion.flush()
    salones = {c: modelos.Salon(codigo=c, nombre=n, colegio_id=colegios[colegio].id) for c, n, colegio in m.SALONES}
    sesion.add_all(salones.values())
    sesion.flush()
    cuentas = {c: modelos.Cuenta(codigo=c, nombre=n, rol=modelos.Rol(r),
                                 salon_id=None if salon is None else salones[salon].id,
                                 correo=correo.strip().lower(), contrasena_hash=_hash(contrasena))
               for c, n, r, salon, correo, contrasena in m.CUENTAS}
    bloques = {c: modelos.Bloque(codigo=c, numero=num, nombre=n, espacio=modelos.Espacio(e),
                                audiencia=modelos.Audiencia(a)) for c, num, n, e, a in m.BLOQUES}
    fichas = {c: modelos.Ficha(codigo=c, titulo=t, descripcion=d, tema=tema, contenido=texto,
                               audiencia=modelos.Audiencia(a))
              for c, t, d, tema, texto, a in m.FICHAS}
    ocupaciones = {o.codigo: o for o in sesion.scalars(select(modelos.Ocupacion))}
    for c, _titulo, _descripcion, video, inicio, fin, _pista, _persona, ocupacion, contexto, _cita in m.TESTIMONIOS:
        _validar_testimonio(c, video, inicio, fin, contexto)
        if ocupacion not in ocupaciones:
            raise ValueError(f'El testimonio {c} apunta a una ocupación inexistente: {ocupacion}')
    testimonios = {c: modelos.Testimonio(codigo=c, titulo=t, descripcion=d, video_id=video, inicio=inicio, fin=fin,
                                         pista=p, persona=persona, ocupacion_id=ocupaciones[ocupacion].id,
                                         contexto=contexto, cita=cita)
                   for c, t, d, video, inicio, fin, p, persona, ocupacion, contexto, cita in m.TESTIMONIOS}
    conversaciones = {c: modelos.Conversacion(codigo=c, orden=o, titulo=t, tema=tema, pregunta_estudiante=pe,
                                             pregunta_apoderado=pa, preguntas_guia=list(guia), mensaje_diferencias=m,
                                             algo_que_saben=saben)
                      for c, o, t, tema, pe, pa, guia, m, saben in m.CONVERSACIONES}
    grupos = {c: modelos.GrupoInsignia(codigo=c, nombre=n, orden=o) for c, n, o in m.GRUPOS_INSIGNIA}
    sesion.add_all(grupos.values())
    sesion.flush()
    if faltantes := {c for c, *_ in m.INSIGNIAS} ^ m.PAGINAS_INSIGNIAS.keys():
        raise ValueError(f'Insignias sin página o páginas de insignias inexistentes: {sorted(faltantes)}')
    if sobrantes := m.TEXTOS_INSIGNIAS.keys() - {c for c, *_ in m.INSIGNIAS}:
        raise ValueError(f'Textos de insignias inexistentes: {sorted(sobrantes)}')
    if pistas_visibles := {c for c, *_, o in m.INSIGNIAS if not o} & m.PISTAS_INSIGNIAS.keys():
        raise ValueError(f'Solo las insignias ocultas llevan pista: {sorted(pistas_visibles)}')
    insignias = {c: modelos.Insignia(codigo=c, nombre=n, descripcion=d, requisito=r, es_oculta=o,
                                   audiencia=modelos.Audiencia.ESTUDIANTE, grupo_id=grupos[m.PAGINAS_INSIGNIAS[c][0]].id,
                                   orden=m.PAGINAS_INSIGNIAS[c][1], pista=m.PISTAS_INSIGNIAS.get(c),
                                   frase=m.TEXTOS_INSIGNIAS.get(c, (None, None))[0],
                                   logro=m.TEXTOS_INSIGNIAS.get(c, (None, None))[1])
                 for c, n, d, r, o in m.INSIGNIAS}
    niveles = {num: modelos.Nivel(numero=num, titulo=t, descripcion=d, cita_lumi=m.CITAS_LUMI.get(num))
               for num, t, d in m.NIVELES}
    preguntas = _preguntas_diario(m, sesion)
    sesion.add_all([*cuentas.values(), *bloques.values(), *fichas.values(), *testimonios.values(), *conversaciones.values(),
                    *insignias.values(), *niveles.values(), *preguntas.values()])
    sesion.flush()
    sesion.add_all(modelos.VinculoFamiliar(codigo=c, estudiante_id=cuentas[e].id, apoderado_id=cuentas[a].id,
                                           parentesco=p) for c, e, a, p in m.VINCULOS)
    sesion.add_all(modelos.OrientadoraSalon(orientadora_id=cuentas[o].id, salon_id=salones[salon].id,
                                            es_principal=p) for o, salon, p in m.ORIENTADORAS_SALONES)
    ordenes = {}
    actividades = {}
    for codigo, bloque, titulo, tipo, puntaje, duracion in m.ACTIVIDADES:
        ordenes[bloque] = ordenes.get(bloque, 0) + 1
        propiedades = m.PROPIEDADES.get(codigo, {})
        if tipo == 'BATALLA' and codigo not in m.CONFIGURACION_BATALLAS:
            raise ValueError(f'La batalla {codigo} no tiene vidas, destellos ni preguntas por intento')
        maximo = _puntaje_maximo_caso(m, codigo, tipo, puntaje)
        actividades[codigo] = modelos.Actividad(
            codigo=codigo, titulo=titulo, tipo=modelos.TipoActividad(tipo), contenido=contenido(codigo),
            orden=ordenes[bloque], bloque_id=bloques[bloque].id, puntaje_minimo=puntaje, puntaje_maximo=maximo,
            **dict(zip(('vidas_enemigo', 'destellos', 'preguntas_por_intento'),
                       m.CONFIGURACION_BATALLAS.get(codigo, (None, None, None)))),
            duracion_estimada_min=duracion, requerida=propiedades.get('requerida', True),
            visibilidad=modelos.Visibilidad(propiedades.get('visibilidad', 'SIEMPRE')),
            descripcion=m.DESCRIPCIONES.get(codigo))
    sesion.add_all(actividades.values())
    sesion.flush()
    return {'BLOQUE': bloques, 'ACTIVIDAD': actividades, 'FICHA': fichas, 'TESTIMONIO': testimonios,
            'CONVERSACION': conversaciones,
            'INSIGNIA': insignias, 'NIVEL': niveles, 'PREGUNTA_DIARIO': preguntas, 'SALON': salones}


def _puntaje_maximo_caso(m, codigo, tipo, minimo):
    """El máximo de un CASO debe ser el total de sus necesidades y alcanzar el mínimo; si no, la carga falla."""
    if tipo != 'CASO':
        if codigo in m.CONFIGURACION_CASOS:
            raise ValueError(f'{codigo} no es un caso y no admite puntaje máximo')
        return None
    if codigo not in m.CONFIGURACION_CASOS:
        raise ValueError(f'El caso {codigo} no tiene puntaje máximo ni necesidades')
    maximo, necesidades = m.CONFIGURACION_CASOS[codigo]
    if sum(necesidades) != maximo:
        raise ValueError(f'El puntaje máximo de {codigo} ({maximo}) no es el total de sus necesidades '
                         f'({sum(necesidades)})')
    if minimo is None or not 0 <= minimo <= maximo:
        raise ValueError(f'El puntaje mínimo de {codigo} debe estar entre 0 y {maximo}')
    return maximo


def _preguntas_diario(m, sesion):
    dimensiones = {d.codigo: d for d in sesion.scalars(select(modelos.Dimension))}
    preguntas = {}
    for codigo, nombre, pregunta, uso, personalizada, dimension in m.PREGUNTAS_DIARIO:
        if not nombre.strip():
            raise ValueError(f'La pregunta de diario {codigo} no tiene nombre')
        if dimension is not None and (uso != 'DIARIA' or dimension not in dimensiones):
            raise ValueError(f'La pregunta de diario {codigo} tiene una dimensión que no corresponde: {dimension}')
        respaldo = m.RESPALDOS_DIARIO.get(codigo)
        if respaldo is not None and not personalizada:
            raise ValueError(f'La pregunta de diario {codigo} tiene respaldo_si y no es personalizada')
        preguntas[codigo] = modelos.PreguntaDiario(
            codigo=codigo, nombre=nombre, pregunta=pregunta, uso=modelos.UsoPreguntaDiario(uso),
            personalizada=personalizada, dimension_id=None if dimension is None else dimensiones[dimension].id,
            respaldo_si=None if respaldo is None else {'item': respaldo[0], 'opcion': respaldo[1]})
    if set(m.RESPALDOS_DIARIO) - set(preguntas):
        raise ValueError(f'Respaldos de preguntas de diario inexistentes: {sorted(set(m.RESPALDOS_DIARIO) - set(preguntas))}')
    return preguntas


def _unir_instrumentos(m, sesion, actividades, base: fijos.Fijos):
    sesion.add_all(modelos.AplicacionActividad(aplicacion_id=base.aplicaciones[a].id,
                                               actividad_id=actividades[c].id)
                   for a, c in m.APLICACIONES_ACTIVIDADES)
    sesion.add_all(modelos.ActividadItem(actividad_id=actividades[c].id, item_id=base.items[i][numero].id,
                                         orden=orden)
                   for c, i, inicio, fin in m.ITEMS_ACTIVIDADES
                   for orden, numero in enumerate(range(inicio, fin + 1), start=1))


def _unir_tematicas(m, sesion, actividades, base: fijos.Fijos):
    for actividad, tematicas in m.TEMATICAS_ACTIVIDADES:
        if actividad not in actividades or any(t not in base.tematicas for t in tematicas):
            raise ValueError(f'Las temáticas de {actividad} apuntan a una actividad o temática inexistente')
    sesion.add_all(modelos.ActividadTematica(actividad_id=actividades[a].id, tematica_id=base.tematicas[t].id)
                   for a, tematicas in m.TEMATICAS_ACTIVIDADES for t in tematicas)


def _cargar_preguntas_batalla(m, sesion, actividades, fichas):
    for codigo, batalla, ficha, enunciado, opciones, correcta, explicacion in m.PREGUNTAS_BATALLA:
        if batalla not in actividades or actividades[batalla].tipo != modelos.TipoActividad.BATALLA:
            raise ValueError(f'La pregunta {codigo} apunta a {batalla}, que no es una batalla')
        if ficha not in fichas or fichas[ficha].audiencia != modelos.Audiencia.ESTUDIANTE:
            raise ValueError(f'La pregunta {codigo} sale de {ficha}, que no es una ficha del estudiante')
        if len(opciones) < 3 or not 0 <= correcta < len(opciones):
            raise ValueError(f'La pregunta {codigo} necesita al menos tres opciones y una correcta entre ellas')
        if not enunciado.strip() or not explicacion.strip() or any(not o.strip() for o in opciones):
            raise ValueError(f'La pregunta {codigo} tiene un texto vacío')
    for actividad in actividades.values():
        if actividad.tipo != modelos.TipoActividad.BATALLA:
            continue
        if actividad.preguntas_por_intento < actividad.vidas_enemigo + actividad.destellos - 1:
            raise ValueError(f'Las {actividad.preguntas_por_intento} preguntas por intento de {actividad.codigo} '
                             f'no alcanzan para terminar con {actividad.vidas_enemigo} vidas y '
                             f'{actividad.destellos} destellos')
        pool = sum(1 for pregunta in m.PREGUNTAS_BATALLA if pregunta[1] == actividad.codigo)
        if pool < 2 * actividad.preguntas_por_intento:
            raise ValueError(f'El pool de {actividad.codigo} ({pool}) debe ser al menos el doble de sus '
                             f'preguntas por intento ({actividad.preguntas_por_intento})')
    sesion.add_all(modelos.PreguntaBatalla(
        codigo=codigo, actividad_id=actividades[batalla].id, ficha_id=fichas[ficha].id, enunciado=enunciado,
        opciones=list(opciones), correcta=correcta, explicacion=explicacion)
        for codigo, batalla, ficha, enunciado, opciones, correcta, explicacion in m.PREGUNTAS_BATALLA)


def _normalizar_eleccion(eleccion):
    """La elección de `ITEMS_REGISTRO`: None, la tupla de B02/F02 `(lista, mínima, máxima, ordenada, otra[,
    referencia])` o un diccionario (ajuste registros) con `fuente` (LISTA, REFERENCIA o PROPIAS), `lista` o
    `referencia`, `minima`, `maxima`, `ordenada`, `otra`, `propias`, `premarcar_si` y `retoma`."""
    if eleccion is None or isinstance(eleccion, dict):
        return eleccion
    lista, minima, maxima, ordenada, otra, retoma = (*eleccion, None)[:6]
    return dict(fuente='LISTA', lista=lista, minima=minima, maxima=maxima, ordenada=ordenada, otra=otra,
                retoma=retoma)


def _validar_propias(codigo, propias, codigos_base):
    vistos = set(codigos_base)
    for opcion in propias:
        if set(opcion) - CAMPOS_PROPIA or not {'codigo', 'texto'} <= set(opcion):
            raise ValueError(f'El ítem {codigo} tiene una opción propia con campos inválidos')
        if opcion['codigo'].startswith(fijos.CODIGO_OTRA) or opcion['codigo'] in vistos:
            raise ValueError(f'El ítem {codigo} repite el código de opción {opcion["codigo"]} o usa el reservado')
        vistos.add(opcion['codigo'])
    return vistos


def _validar_eleccion(codigo, eleccion, listas):
    if eleccion is None:
        return
    if eleccion['fuente'] not in modelos.FuenteOpciones.__members__:
        raise ValueError(f'El ítem {codigo} tiene la fuente de opciones {eleccion["fuente"]}, fuera del catálogo')
    minima, maxima = eleccion['minima'], eleccion['maxima']
    if eleccion['fuente'] == 'LISTA':
        if eleccion.get('lista') not in listas:
            raise ValueError(f'El ítem {codigo} usa la lista inexistente {eleccion.get("lista")}')
        # Ajuste registros llm (lote 2): en un ítem de varias opciones la «Otra» se puede agregar más de una vez.
        disponibles = len(listas[eleccion['lista']][2]) + len(eleccion.get('propias', ())) + (
            maxima if eleccion.get('otra') else 0)
        if not 1 <= maxima <= disponibles:
            raise ValueError(f'El ítem {codigo} tiene una elección mínima o máxima incoherente')
    if eleccion['fuente'] == 'PROPIAS' and not eleccion.get('propias'):
        raise ValueError(f'El ítem {codigo} elige de sus opciones propias y no tiene ninguna')
    if eleccion['fuente'].startswith('PIEZAS_') and (eleccion.get('lista') or eleccion.get('referencia')):
        raise ValueError(f'El ítem {codigo} arma piezas y nombra una lista o una referencia')
    if not 0 <= minima <= maxima or maxima < 1:
        raise ValueError(f'El ítem {codigo} tiene una elección mínima o máxima incoherente')
    # Ningún mínimo de selección mayor que 1 salvo los podios (elección ordenada).
    if minima > 1 and not eleccion.get('ordenada'):
        raise ValueError(f'El ítem {codigo} exige elegir más de una opción y no es un podio')


def _presentacion(codigo, presentacion):
    """La consigna del ítem: un texto (la pregunta del texto) o un diccionario con sus partes y sus ecos."""
    if isinstance(presentacion, str):
        presentacion = {'pregunta_texto': presentacion}
    if set(presentacion) - CAMPOS_PRESENTACION or not presentacion.get('pregunta_texto'):
        raise ValueError(f'El ítem {codigo} tiene una consigna con campos inválidos o sin pregunta del texto')
    for clave in ('ecos_mostrar', 'ecos_llm'):
        for eco in presentacion.get(clave) or ():
            if set(eco) - CAMPOS_ECO or not {'origen', 'codigo'} <= set(eco) or eco['origen'] not in (
                    'TEXTO', 'ELECCION', 'REFERENCIA'):
                raise ValueError(f'El ítem {codigo} tiene un eco inválido: {eco}')
    return presentacion


def marcadores_de(texto):
    """Los marcadores de un texto: lo que va entre llaves. El «…» de los arranques no lleva llaves."""
    return set(_MARCADOR.findall(texto or ''))


def _validar_marcadores(codigo, textos):
    desconocidos = set().union(*(marcadores_de(t) for t in textos)) - MARCADORES
    if desconocidos:
        raise ValueError(f'El ítem {codigo} usa marcadores desconocidos: {sorted(desconocidos)}')


def _ficha_llm(codigo, ficha):
    """De una tarjeta de `datos/tarjetas_registros`, lo que usa el LLM; cada base debe estar tal cual en el texto."""
    texto = ficha['tarjeta']
    bases = [*ficha['bases'].values(), *ficha.get('general_por_opcion', {}).values()]
    if any(base not in texto for base in bases):
        raise ValueError(f'La tarjeta de {codigo} tiene una base que no está en su texto')
    return {clave: ficha[clave] for clave in CAMPOS_TARJETA_LLM if clave in ficha}


def _tarjetas(codigo, ficha, propias):
    """La tarjeta del ítem y la de cada opción con tarjeta propia (en su opción). Una opción sin LLM no la lleva."""
    if ficha is None:
        return None
    por_codigo = {o['codigo']: o for o in propias}
    for opcion, ficha_opcion in ficha.get('por_opcion', {}).items():
        if opcion not in por_codigo or por_codigo[opcion].get('sin_llm'):
            raise ValueError(f'La tarjeta de {codigo} es de la opción {opcion}, que no es una opción propia con LLM')
        por_codigo[opcion]['tarjeta'] = _ficha_llm(f'{codigo}#{opcion}', ficha_opcion)
    return _ficha_llm(codigo, ficha)


def _textos_con_marcadores(presentacion, propias, tarjeta):
    fichas = [tarjeta or {}, *(o.get('tarjeta') or {} for o in propias)]
    return [*(presentacion.get(c) for c in ('dialogo', 'pregunta_eleccion', 'pregunta_texto', 'arranque')),
            *(o.get(c) for o in propias for c in ('pregunta', 'arranque')),
            *(f.get('tarjeta') for f in fichas),
            *(b for f in fichas for b in (*f.get('bases', {}).values(), *f.get('general_por_opcion', {}).values()))]


def _cargar_registros(m, sesion, actividades, base: fijos.Fijos):
    listas = {codigo: (codigo, nombre, opciones) for codigo, nombre, opciones in (*fijos.LISTAS_COMUNES, *m.LISTAS)}
    cargadas = {**base.listas, **fijos.cargar_listas(sesion, m.LISTAS, comun=False)}
    ordenes, vistos = {}, set()
    items, definiciones_items = {}, {}
    sin_item = set(m.TARJETAS) - {codigo for _, codigo, *_ in m.ITEMS_REGISTRO}
    if sin_item:
        raise ValueError(f'Tarjetas de ítems inexistentes: {sorted(sin_item)}')
    for actividad, codigo, nombre, presentacion, eleccion in m.ITEMS_REGISTRO:
        eleccion = _normalizar_eleccion(eleccion)
        if codigo in vistos:
            raise ValueError(f'El ítem {codigo} aparece en dos actividades')
        vistos.add(codigo)
        if actividades[actividad].tipo != modelos.TipoActividad.REGISTRO:
            raise ValueError(f'El ítem {codigo} está en {actividad}, que no es de registro')
        ordenes[actividad] = ordenes.get(actividad, 0) + 1
        if ordenes[actividad] > MAXIMO_ITEMS_REGISTRO:
            raise ValueError(f'El registro {actividad} tiene más de {MAXIMO_ITEMS_REGISTRO} ítems')
        _validar_eleccion(codigo, eleccion, listas)
        presentacion = _presentacion(codigo, presentacion)
        eleccion = eleccion or {}
        lista = eleccion.get('lista')
        propias = [dict(o) for o in eleccion.get('propias', ())]
        codigos_base = [c for c, _ in listas[lista][2]] if lista else []
        _validar_propias(codigo, propias, codigos_base)
        tarjeta = _tarjetas(codigo, m.TARJETAS.get(codigo), propias)
        _validar_marcadores(codigo, _textos_con_marcadores(presentacion, propias, tarjeta))
        propiedades = m.PROPIEDADES_ITEMS.get(codigo, {})
        item = modelos.ItemRegistro(
            codigo=codigo, actividad_id=actividades[actividad].id, orden=ordenes[actividad], nombre=nombre,
            dialogo=presentacion.get('dialogo'), pregunta_eleccion=presentacion.get('pregunta_eleccion'),
            pregunta_texto=presentacion['pregunta_texto'], arranque=presentacion.get('arranque'),
            ecos_mostrar=[dict(e) for e in presentacion.get('ecos_mostrar') or ()] or None,
            ecos_llm=[dict(e) for e in presentacion.get('ecos_llm') or ()] or None,
            tarjeta=tarjeta,
            obligatorio=propiedades.get('obligatorio', True),
            lista_id=None if lista is None else cargadas[lista].id,
            fuente_opciones=None if not eleccion else modelos.FuenteOpciones(eleccion['fuente']),
            opciones_propias=propias or None, premarcar_si=eleccion.get('premarcar_si'),
            eleccion_minima=eleccion.get('minima'), eleccion_maxima=eleccion.get('maxima'),
            eleccion_ordenada=eleccion.get('ordenada', False), permite_otra=eleccion.get('otra', False),
            etiqueta_otra=eleccion.get('etiqueta_otra'))
        items[codigo] = (item, presentacion, eleccion.get('retoma'), eleccion.get('referencia'))
        definiciones_items[codigo] = (actividad, ordenes[actividad], eleccion, set(codigos_base) | {
            o['codigo'] for o in propias})
    _validar_premarcar_y_ecos(items, definiciones_items)
    referencias = _validar_referencias(m, sesion, actividades, items, base)
    _validar_ecos_referencia(items, referencias)
    _insertar_en_orden(sesion, items, referencias)


def _ecos(presentacion):
    return (*(presentacion.get('ecos_mostrar') or ()), *(presentacion.get('ecos_llm') or ()))


def _validar_premarcar_y_ecos(items, definiciones_items):
    """`premarcar_si` y los ecos de ítem (TEXTO o ELECCION) apuntan a un ítem anterior de la misma actividad."""
    def anterior(codigo, otro):
        actividad, orden, *_ = definiciones_items[codigo]
        return otro in definiciones_items and definiciones_items[otro][0] == actividad and (
            definiciones_items[otro][1] < orden)

    for codigo, (actividad, _, eleccion, opciones) in definiciones_items.items():
        premarcar = (eleccion or {}).get('premarcar_si')
        if premarcar is not None:
            if set(premarcar) != {'item', 'opcion', 'marca'} or not anterior(codigo, premarcar['item']):
                raise ValueError(f'El premarcado de {codigo} no apunta a un ítem anterior de su actividad')
            if (premarcar['opcion'] not in definiciones_items[premarcar['item']][3]
                    or premarcar['marca'] not in {o['codigo'] for o in eleccion.get('propias', ())}):
                raise ValueError(f'El premarcado de {codigo} nombra una opción inexistente')
        for eco in _ecos(items[codigo][1]):
            if eco['origen'] == 'REFERENCIA':
                continue
            if not anterior(codigo, eco['codigo']):
                raise ValueError(f'El eco {eco["origen"]} {eco["codigo"]} de {codigo} no es un ítem anterior de su '
                                 f'actividad')
            if eco['origen'] == 'ELECCION' and not definiciones_items[eco['codigo']][2]:
                raise ValueError(f'El eco ELECCION {eco["codigo"]} de {codigo} es de un ítem sin elección')


def _validar_ecos_referencia(items, referencias):
    """Un eco REFERENCIA nombra una referencia de la actividad del ítem."""
    for codigo, (item, presentacion, *_) in items.items():
        for eco in _ecos(presentacion):
            if eco['origen'] == 'REFERENCIA' and (eco['codigo'] not in referencias
                                                  or referencias[eco['codigo']][0].actividad_id != item.actividad_id):
                raise ValueError(f'El eco {eco["codigo"]} de {codigo} no es una referencia de su actividad')


def _validar_referencias(m, sesion, actividades, items, base: fijos.Fijos):
    """Valida `m.REFERENCIAS` y las elecciones por referencia; devuelve {código: (referencia, ítem fuente)}.

    Las referencias que leen una aplicación llevan ya su `aplicacion_id` y no tienen ítem fuente (None)."""
    instrumentos = {i.id: i for i in sesion.scalars(select(modelos.Instrumento))}
    items_instrumento = {i.codigo: i for i in sesion.scalars(select(modelos.ItemInstrumento))}
    presentados = set(sesion.execute(select(modelos.AplicacionActividad.aplicacion_id, modelos.ActividadItem.item_id).join(
        modelos.ActividadItem, modelos.ActividadItem.actividad_id == modelos.AplicacionActividad.actividad_id)))
    preguntas = {p.codigo: p for p in sesion.scalars(select(modelos.PreguntaDiario))}
    referencias = {}
    for codigo, (tipo_dueno, dueno), tipo, fuente in m.REFERENCIAS:
        if tipo not in modelos.TipoReferencia.__members__:
            raise ValueError(f'La referencia {codigo} tiene el tipo {tipo}, fuera del catálogo')
        if tipo_dueno == 'ACTIVIDAD' and dueno in actividades:
            dueno_id = dict(actividad_id=actividades[dueno].id)
        elif tipo_dueno == 'PREGUNTA_DIARIO' and dueno in preguntas:
            dueno_id = dict(pregunta_diario_id=preguntas[dueno].id)
        else:
            raise ValueError(f'La referencia {codigo} tiene un dueño inexistente: {tipo_dueno} {dueno}')
        if tipo_dueno == 'PREGUNTA_DIARIO' and not preguntas[dueno].personalizada:
            raise ValueError(f'La referencia {codigo} pertenece a {dueno}, que no es personalizada')
        if tipo in SIN_FUENTE:
            if fuente is not None:
                raise ValueError(f'La referencia {codigo} es {tipo} y no lleva fuente')
            referencias[codigo] = (modelos.Referencia(codigo=codigo, tipo=modelos.TipoReferencia(tipo), **dueno_id),
                                   None)
            continue
        if tipo == 'RESPUESTA_CUESTIONARIO':
            codigo_aplicacion, codigo_item = fuente
            aplicacion, item = base.aplicaciones.get(codigo_aplicacion), items_instrumento.get(codigo_item)
            if aplicacion is None or item is None or (aplicacion.id, item.id) not in presentados:
                raise ValueError(f'La referencia {codigo} lee un ítem que la aplicación {codigo_aplicacion} no presenta')
            referencias[codigo] = (modelos.Referencia(codigo=codigo, tipo=modelos.TipoReferencia(tipo),
                                                      aplicacion_id=aplicacion.id, item_instrumento_id=item.id,
                                                      **dueno_id), None)
            continue
        if tipo in FUENTE_APLICACION:
            aplicacion = base.aplicaciones.get(fuente)
            if aplicacion is None:
                raise ValueError(f'La referencia {codigo} lee la aplicación inexistente {fuente}')
            if instrumentos[aplicacion.instrumento_id].tipo_resultado == modelos.TipoResultado.COMPARACION:
                raise ValueError(f'La referencia {codigo} lee {fuente}, que no genera resultado')
            referencias[codigo] = (modelos.Referencia(codigo=codigo, tipo=modelos.TipoReferencia(tipo),
                                                      aplicacion_id=aplicacion.id, **dueno_id), None)
            continue
        if fuente not in items:
            raise ValueError(f'La referencia {codigo} lee el ítem inexistente {fuente}')
        item_fuente = items[fuente][0]
        if item_fuente.actividad_id == dueno_id.get('actividad_id'):
            raise ValueError(f'La referencia {codigo} lee un ítem de su propia actividad')
        if tipo == 'ELECCION' and item_fuente.fuente_opciones is None:
            raise ValueError(f'La referencia {codigo} lee la elección de {fuente}, que no tiene lista ni opciones')
        referencias[codigo] = (modelos.Referencia(codigo=codigo, tipo=modelos.TipoReferencia(tipo), **dueno_id),
                               fuente)
    for codigo, (item, _, _, de_opciones) in items.items():
        if de_opciones is None:
            if item.fuente_opciones == modelos.FuenteOpciones.REFERENCIA:
                raise ValueError(f'El ítem {codigo} elige de una referencia y no la declara')
            continue
        if item.fuente_opciones != modelos.FuenteOpciones.REFERENCIA:
            raise ValueError(f'El ítem {codigo} declara una referencia de opciones y no elige de ella')
        if (de_opciones not in referencias or referencias[de_opciones][0].actividad_id != item.actividad_id
                or referencias[de_opciones][0].tipo.value not in FUENTES_DE_OPCIONES):
            raise ValueError(f'El ítem {codigo} toma sus opciones de {de_opciones}, que no es una referencia de su '
                             f'actividad que dé opciones')
    for codigo, (item, _, referencia, de_opciones) in items.items():
        if referencia is None:
            continue
        # Retomar sobre la misma referencia que da las opciones (b5-1-decision sobre PLANES): marca el plan A.
        if referencia == de_opciones:
            continue
        if (referencia not in referencias or referencias[referencia][0].tipo != modelos.TipoReferencia.ELECCION
                or referencias[referencia][0].actividad_id != item.actividad_id):
            raise ValueError(f'El ítem {codigo} retoma {referencia}, que no es una ELECCION de su actividad')
        fuente = items[referencias[referencia][1]][0]
        # Lo elegido antes llega marcado: debe caber en la lista, el máximo y la «otra» del ítem.
        if item.lista_id != fuente.lista_id:
            raise ValueError(f'El ítem {codigo} retoma una elección de otra lista')
        if item.eleccion_maxima < fuente.eleccion_maxima or (fuente.permite_otra and not item.permite_otra):
            raise ValueError(f'El ítem {codigo} no admite todo lo que pudo elegirse en su fuente')
    return referencias


def _insertar_en_orden(sesion, items, referencias):
    """Ítems y referencias se leen entre sí: cada ronda inserta lo que ya tiene a quién apuntar."""
    items_pendientes = dict(items)
    referencias_pendientes = dict(referencias)
    while items_pendientes or referencias_pendientes:
        listos = [codigo for codigo, (_, _, referencia, de_opciones) in items_pendientes.items()
                  if all(r is None or r not in referencias_pendientes for r in (referencia, de_opciones))]
        for codigo in listos:
            item, _, referencia, de_opciones = items_pendientes.pop(codigo)
            if referencia is not None:
                item.referencia_id = referencias[referencia][0].id
            if de_opciones is not None:
                item.referencia_opciones_id = referencias[de_opciones][0].id
            sesion.add(item)
        sesion.flush()
        listas = [codigo for codigo, (_, fuente) in referencias_pendientes.items() if fuente not in items_pendientes]
        for codigo in listas:
            referencia, fuente = referencias_pendientes.pop(codigo)
            if fuente is not None:
                referencia.item_registro_id = items[fuente][0].id
            sesion.add(referencia)
        sesion.flush()
        if not listos and not listas:
            raise ValueError('Las referencias y las elecciones por referencia forman un ciclo')


def _cargar_salones(m, sesion, salones, actividades):
    instrumentos = {i.codigo: i for i in sesion.scalars(select(modelos.Instrumento))}
    for salon, instrumento, prioritario, _ in m.SALON_INSTRUMENTOS:
        if salon not in salones or instrumento not in instrumentos:
            raise ValueError(f'La configuración de {salon} apunta a un salón o instrumento inexistente: {instrumento}')
        if prioritario and instrumentos[instrumento].tipo_resultado == modelos.TipoResultado.COMPARACION:
            raise ValueError(f'{instrumento} es obligatorio por diseño y no admite la marca de prioritario')
    for salon, actividad in m.SALON_ACTIVIDADES_PRIORITARIAS:
        if salon not in salones or actividad not in actividades:
            raise ValueError(f'El prioritario de {salon} apunta a un salón o actividad inexistente: {actividad}')
        if actividades[actividad].tipo != modelos.TipoActividad.REGISTRO:
            raise ValueError(f'El prioritario {actividad} de {salon} no es una actividad de registro')
    sesion.add_all(modelos.SalonInstrumento(salon_id=salones[s].id, instrumento_id=instrumentos[i].id,
                                            es_prioritario=p, visible_apoderado=v) for s, i, p, v in m.SALON_INSTRUMENTOS)
    sesion.add_all(modelos.SalonActividadPrioritaria(salon_id=salones[s].id, actividad_id=actividades[a].id)
                   for s, a in m.SALON_ACTIVIDADES_PRIORITARIAS)


def _cargar_reglas(m, sesion, objetivos):
    _validar_origen_testimonios(m)
    referencias = {'COMPLETA_ACTIVIDAD': objetivos['ACTIVIDAD'], 'COMPLETA_BLOQUE': objetivos['BLOQUE'],
                   'REGISTRO_ADECUADO': objetivos['ACTIVIDAD'], 'REVELA_RESULTADO': objetivos['APLICACION'],
                   'SUPERA_CASO': objetivos['ACTIVIDAD'], 'SUPERA_BATALLA': objetivos['ACTIVIDAD'],
                   'COMPLETA_CONVERSACION': objetivos['CONVERSACION']}
    reglas = []
    for codigo, tipo, objetivo, mensaje, condiciones in m.REGLAS:
        if not mensaje.strip():
            raise ValueError(f'La regla {codigo} no tiene mensaje de bloqueo')
        # Los recuerdos de Lumi no desbloquean nada: ninguna regla depende de ellos ni de su bloque (F05).
        if any(referencia in (*m.RECUERDOS_LUMI, 'LUMI') for _, referencia, _, _ in condiciones):
            raise ValueError(f'La regla {codigo} depende de un recuerdo de Lumi o de su bloque')
        regla = modelos.ReglaDesbloqueo(codigo=codigo, nombre=f'Desbloquear {objetivo}', mensaje_bloqueo=mensaje,
            tipo_objetivo=modelos.TipoObjetivo(tipo), id_objetivo=objetivos[tipo][objetivo].id,
            evaluador_especial=m.EVALUADORES_REGLAS.get(codigo, (None, None))[0],
            parametro_evaluador=m.EVALUADORES_REGLAS.get(codigo, (None, None))[1])
        textos = m.TEXTOS_CONDICIONES.get(codigo, (None,) * len(condiciones))
        if len(textos) != len(condiciones):
            raise ValueError(f'La regla {codigo} tiene {len(condiciones)} condiciones y {len(textos)} textos')
        regla.condiciones = [modelos.CondicionDesbloqueo(tipo_evento=modelos.TipoEventoUso(evento),
            id_referencia=None if referencia is None else referencias[evento][referencia].id,
            tipo_conteo=modelos.TipoConteo(conteo), cantidad_minima=cantidad, texto=texto)
            for (evento, referencia, conteo, cantidad), texto in zip(condiciones, textos, strict=True)]
        reglas.append(regla)
    sesion.add_all(reglas)


def _codigos(sesion, modelo, mapa):
    """Los códigos reales de un mapa de la ruta; falla si alguno no está cargado."""
    reales = dict(sesion.execute(select(modelo.codigo, modelo.id).where(modelo.codigo.in_(mapa.values()))).all())
    faltantes = sorted(c for c, real in mapa.items() if real not in reales)
    if faltantes:
        raise ValueError(f'Códigos de la ruta sin {modelo.__tablename__} real: {", ".join(faltantes)}')
    return {c: reales[real] for c, real in mapa.items()}


def _cargar_catalogo(m, sesion):
    _codigos(sesion, modelos.Ubicacion, m.UBICACIONES_RUTA)
    carreras = _codigos(sesion, modelos.Carrera, m.CARRERAS_RUTA)
    instituciones = _codigos(sesion, modelos.Institucion, m.INSTITUCIONES_RUTA)
    for i, c, ciclos in m.DURACIONES_CICLOS:
        oferta = sesion.get(modelos.InstitucionCarrera, (instituciones[i], carreras[c]))
        if oferta is None:
            raise ValueError(f'Duración de {c} en {i}, que no la ofrece')
        if ciclos < 1:
            raise ValueError(f'Duración inválida de {c} en {i}: {ciclos}')
        oferta.duracion_ciclos = ciclos
    dimensiones = {d.codigo: d.id for d in sesion.scalars(select(modelos.Dimension).join(modelos.Instrumento).where(
        modelos.Instrumento.codigo == 'TEST-RIASEC'))}
    con_letras = set(sesion.scalars(select(modelos.TipoCarrera.carrera_id)))
    for c, letras in m.TIPOS_CARRERA:
        if carreras[c] in con_letras:
            continue
        sesion.get(modelos.Carrera, carreras[c]).codigo_riasec = letras
        sesion.add_all(modelos.TipoCarrera(carrera_id=carreras[c], posicion=p, dimension_id=dimensiones[letra])
                       for p, letra in enumerate(letras, start=1))


def cargar(sesion: Session, modulo) -> None:
    """Carga `fijos` y las tuplas de `modulo`. La validación de la distribución de ítems la llama el módulo de datos
    después (`validar_distribucion_items`), para que una falla tardía revierta toda la carga."""
    m = _Tuplas(modulo)
    base = fijos.cargar(sesion)
    objetivos = {**_cargar_estructura(m, sesion), 'SECCION': base.secciones, 'APLICACION': base.aplicaciones,
                 'SECCION_PLAN': base.secciones_tarjeta}
    _unir_instrumentos(m, sesion, objetivos['ACTIVIDAD'], base)
    _unir_tematicas(m, sesion, objetivos['ACTIVIDAD'], base)
    _cargar_preguntas_batalla(m, sesion, objetivos['ACTIVIDAD'], objetivos['FICHA'])
    _cargar_catalogo(m, sesion)
    _cargar_registros(m, sesion, objetivos['ACTIVIDAD'], base)
    _cargar_salones(m, sesion, objetivos.pop('SALON'), objetivos['ACTIVIDAD'])
    _cargar_reglas(m, sesion, objetivos)
    sesion.flush()
