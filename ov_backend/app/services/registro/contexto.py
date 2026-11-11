"""El contexto de un ítem de registro para una cuenta y la `Entrada` de la capa del LLM (ajuste registros llm, lote 2).

`resolver_contexto` devuelve lo que se le ofrece al estudiante en un ítem: las opciones (también las piezas armadas
con lo suyo, §4), los valores de los marcadores, la consigna ya armada y los ecos (los que se muestran y los que van
al LLM, redactados en líneas). `entrada_llm` arma, con ese contexto y lo marcado, la `Entrada` de `llm/`.

Reglas de referencia (§3), siempre sobre el intento vigente del ítem de origen:
- una elección se muestra siempre; un texto, solo si es citable (`texto_citable`, que calcula la capa del LLM: vacío
  si el ítem quedó `sin_evaluar`, si va sin LLM o si no quedó `propio` ni `general`; con el seguimiento sin evaluar,
  solo la primera respuesta);
- lo escrito en «¿Cuál?» va como pieza si el ítem quedó `propio` o `general`, y siempre si el ítem no lleva LLM;
- de un ítem `sensible` o con tipo final `emocional` no se referencia nada, ni la elección;
- los marcadores se resuelven siempre (§3.7);
- en una pieza, lo escrito por el estudiante va entre comillas.

Lo usarán el endpoint que sirve el ítem, la capa del LLM y la detección de eco cambiado (lote 3). No escribe nada.
"""

import re
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field

from sqlalchemy import select

from app.core.contexto import contexto, usar_contexto
from app.models import (
    Aplicacion, Cuenta, Dimension, Instrumento, ItemRegistro, ProgresoActividad, Referencia, RespuestaRegistro,
    ResultadoDimension, ResultadoInstrumento,
)
from app.models.enums import EstadoReferencia, FuenteOpciones, TipoReferencia
from app.services.comun import buscar_por_codigo
from app.services.instrumentos.calculo import DimensionCalculada, calcular_dimensiones_destacadas
from app.services.instrumentos.consultas import resultado_intereses
from app.services.referencias import _leer_planes, referenciable, resolver
from app.services.registro.eleccion import CODIGO_OTRA
from app.services.registro.llm import Entrada, tarjeta_para


class MarcadorSinValor(ValueError):
    """Falta el valor de un marcador del ítem (p. ej., no hay Plan B): el ítem no se puede armar."""

    def __init__(self, marcador: str, item: str):
        super().__init__(f'No se puede armar {item}: falta el valor de {{{marcador}}}')
        self.marcador = marcador
        self.item = item


class OpcionSinLLM(ValueError):
    """Lo marcado no pasa por el LLM (ítem sin tarjeta u opción `sin_llm`)."""


# §2: los ítems de los que salen los marcadores y las piezas (el contenido los define; aquí se nombran).
ITEM_BIEN, ITEM_VALORES, ITEM_LOGRO, ITEM_GUSTOS = 'b2-4-bien', 'b2-3-valores', 'b1-1-logro', 'b1-1-gustos'
ITEM_CUESTA, ITEM_MIA, ITEM_DIA, ITEM_FRENO, ITEM_MITO = 'b2-4-cuesta', 'b1-3-mia', 'b1-7-dia', 'b1-7-freno', 'b1-6-mito'
ITEM_RETO = 'h1-reto'
EXCLUSIVAS_SIN_PIEZA = {ITEM_LOGRO: 'NINGUNO', ITEM_CUESTA: 'NADA', ITEM_MITO: 'NINGUNO'}
INSTRUMENTO_INTELIGENCIAS, INSTRUMENTO_HABILIDADES = 'TEST-INTELIGENCIAS', 'TEST-HABILIDADES'
CON_CITA = ('propio', 'general')
_MARCADOR = re.compile(r'\{([^{}\n]+)\}')
# `{opción}` lo resuelve la tarjeta con lo marcado en el mismo ítem (lote 1).
DE_LA_TARJETA = {'opción'}

GRUPO_INTERESES, GRUPO_TESTS = 'Tu test de intereses', 'Tus otros tests'
GRUPO_ANTES, GRUPO_CUESTA = 'Lo que escribiste y elegiste antes', 'Lo que te cuesta'
# Orígenes de las piezas de registros (§4): la pregunta del ítem, en segunda persona.
ORIGEN_BIEN, ORIGEN_VALORES = '¿En qué te va mejor? 1.º', '¿Qué valoras en un trabajo? 1.º'
ORIGEN_LOGRO, ORIGEN_GUSTO = '¿Qué habilidades tuyas se notaron ahí?', '¿Qué te encantaba hacer de niño o niña?'
ORIGEN_CUESTA = '¿Qué te cuesta?'
ORIGENES_INICIO = {
    'INI-OPCION': 'tu primera opción', 'INI-RUTA': 'la ruta que querías al terminar el colegio',
    'INI-DIA': 'tu día a los 23', 'INI-FRENO': 'lo que dijiste que podía frenarte',
    'INI-MITO': 'una idea que habías escuchado o creído',
}
ORIGEN_OTRA_INICIO = 'otra cosa que cambió'


@dataclass(frozen=True, slots=True)
class OpcionContexto:
    """Una opción que se ofrece: de una lista, una referencia, una pieza (con origen y grupo) o propia."""
    codigo: str
    texto: str
    origen: str | None = None
    grupo: str | None = None
    exclusiva: bool = False
    sin_llm: bool = False
    pregunta: str | None = None
    arranque: str | None = None
    tarjeta: Mapping | None = None

    @property
    def para_llm(self):
        """La opción como va en `<opcion_marcada>`: con una pieza, su origen entre paréntesis (§4)."""
        return f'{self.texto} ({self.origen})' if self.origen else self.texto


@dataclass(frozen=True, slots=True)
class ContextoItem:
    item: str
    dialogo: str | None
    pregunta_eleccion: str | None
    pregunta_texto: str
    arranque: str | None
    opciones: tuple[OpcionContexto, ...]
    marcadores: Mapping[str, str]
    ecos_mostrar: tuple[Mapping, ...]
    ecos_llm: tuple[str, ...]
    ordenada: bool = False
    permite_otra: bool = False
    etiqueta_otra: str | None = None
    tarjeta: Mapping | None = None
    sin_llm: bool = field(default=False)

    def opcion(self, codigo):
        return next((o for o in self.opciones if o.codigo == codigo), None)

    def pregunta_para(self, codigo_opcion=None):
        opcion = self.opcion(codigo_opcion) if codigo_opcion else None
        return (opcion.pregunta if opcion and opcion.pregunta else None) or self.pregunta_texto

    def arranque_para(self, codigo_opcion=None):
        opcion = self.opcion(codigo_opcion) if codigo_opcion else None
        return (opcion.arranque if opcion and opcion.arranque else None) or self.arranque


# --- Lecturas --------------------------------------------------------------------------------

def _vigentes(sesion, cuenta, codigos):
    """{código del ítem: intento vigente} de esta cuenta, en una lectura."""
    definiciones = contexto(sesion).definiciones
    ids = {definiciones.por_codigo(ItemRegistro, c).id: c for c in codigos if definiciones.por_codigo(ItemRegistro, c)}
    if not ids:
        return {}
    return {ids[r.item_registro_id]: r for r in sesion.scalars(select(RespuestaRegistro).join(
        ProgresoActividad, ProgresoActividad.id == RespuestaRegistro.progreso_id).where(
        ProgresoActividad.cuenta_id == cuenta.id, RespuestaRegistro.vigente,
        RespuestaRegistro.item_registro_id.in_(ids)))}


def _es_otra(codigo):
    return codigo == CODIGO_OTRA or codigo.startswith(f'{CODIGO_OTRA}-')


def _sin_llm(sesion, codigo_item):
    return contexto(sesion).definiciones.por_codigo(ItemRegistro, codigo_item).tarjeta is None


def _comillas(texto):
    return f'«{texto}»'


def _elegidas(respuesta):
    return list(respuesta.opciones_elegidas or ()) if referenciable(respuesta) else []


def _otra_citable(sesion, codigo_item, respuesta):
    """Regla 3: lo escrito en «¿Cuál?» va como pieza si el ítem quedó `propio` o `general`, o si va sin LLM."""
    return _sin_llm(sesion, codigo_item) or respuesta.tipo_final in CON_CITA


def _citable(respuesta):
    return list(respuesta.texto_citable or ()) if referenciable(respuesta) else []


def _destacadas(sesion, cuenta, codigo_instrumento):
    """Las dimensiones más altas (todas si hay empate) del resultado vigente (revelado) de un instrumento."""
    definiciones = contexto(sesion).definiciones
    instrumento = definiciones.por_codigo(Instrumento, codigo_instrumento)
    if instrumento is None:
        return []
    aplicaciones = [a.id for a in definiciones.listar(Aplicacion) if a.instrumento_id == instrumento.id]
    resultado = sesion.scalar(select(ResultadoInstrumento).where(
        ResultadoInstrumento.cuenta_id == cuenta.id, ResultadoInstrumento.aplicacion_id.in_(aplicaciones),
        ResultadoInstrumento.anulado_en.is_(None)).order_by(ResultadoInstrumento.calculado_en.desc()).limit(1))
    if resultado is None or resultado.perfil_plano:
        return []
    filas = sesion.execute(select(Dimension, ResultadoDimension).join(ResultadoDimension).where(
        ResultadoDimension.resultado_id == resultado.id).order_by(Dimension.orden, Dimension.codigo)).all()
    destacadas = calcular_dimensiones_destacadas([DimensionCalculada(d.codigo, r.puntaje, r.puntaje_maximo)
                                                  for d, r in filas])
    return [d for d, _ in filas if d.codigo in destacadas]


# --- Piezas (§4) -----------------------------------------------------------------------------

def _pieza(codigo, texto, origen, grupo):
    return OpcionContexto(codigo=codigo, texto=texto, origen=origen, grupo=grupo)


def _texto_de_eleccion(sesion, codigo_item, respuesta, elegida):
    """El texto de una elección como pieza: la etiqueta, o lo escrito en «¿Cuál?» entre comillas (regla 3)."""
    if not _es_otra(elegida['codigo']):
        return elegida['texto']
    return _comillas(elegida['texto']) if _otra_citable(sesion, codigo_item, respuesta) else None


def piezas_perfil(sesion, cuenta, con_cuesta=False):
    """Las piezas del perfil (b4-1): el test de intereses, los otros tests y lo que escribió y eligió antes; con
    `con_cuesta`, «Lo que te cuesta» va primero (b4-1-menos)."""
    vigentes = _vigentes(sesion, cuenta, (ITEM_BIEN, ITEM_VALORES, ITEM_LOGRO, ITEM_GUSTOS, ITEM_CUESTA))
    piezas = []
    if con_cuesta and ITEM_CUESTA in vigentes:
        respuesta = vigentes[ITEM_CUESTA]
        for elegida in _elegidas(respuesta):
            texto = _texto_de_eleccion(sesion, ITEM_CUESTA, respuesta, elegida)
            if elegida['codigo'] != EXCLUSIVAS_SIN_PIEZA[ITEM_CUESTA] and texto:
                piezas.append(_pieza(f"CUESTA-{elegida['codigo']}", texto, ORIGEN_CUESTA, GRUPO_CUESTA))
    intereses = resultado_intereses(sesion, cuenta)
    if intereses is not None and intereses.codigo_interes is not None:
        por_codigo = {d.codigo: d for d in intereses.dimensiones}
        for letra in intereses.codigo_interes.codigo:
            dimension = por_codigo.get(letra)
            if dimension is not None:
                piezas.append(_pieza(f'INT-{letra}', dimension.descripcion.rstrip('.'), dimension.nombre,
                                     GRUPO_INTERESES))
    for d in _destacadas(sesion, cuenta, INSTRUMENTO_INTELIGENCIAS):
        piezas.append(_pieza(f"INTEL-{d.codigo.split('-', 1)[-1]}", d.descripcion.rstrip('.'),
                             'tu test de inteligencias', GRUPO_TESTS))
    for d in _destacadas(sesion, cuenta, INSTRUMENTO_HABILIDADES):
        piezas.append(_pieza(f"HAB-{d.codigo.split('-', 1)[-1]}", d.nombre, 'tu test de habilidades', GRUPO_TESTS))
    for codigo_item, codigo, origen in ((ITEM_BIEN, 'BIEN-1', ORIGEN_BIEN), (ITEM_VALORES, 'VAL-1', ORIGEN_VALORES)):
        respuesta = vigentes.get(codigo_item)
        elegidas = _elegidas(respuesta) if respuesta else []
        texto = _texto_de_eleccion(sesion, codigo_item, respuesta, elegidas[0]) if elegidas else None
        if texto:
            piezas.append(_pieza(codigo, texto, origen, GRUPO_ANTES))
    logro = vigentes.get(ITEM_LOGRO)
    if logro is not None:
        textos = [_texto_de_eleccion(sesion, ITEM_LOGRO, logro, e) for e in _elegidas(logro)
                  if e['codigo'] != EXCLUSIVAS_SIN_PIEZA[ITEM_LOGRO]]
        textos = [t for t in textos if t]
        if textos:
            piezas.append(_pieza('LOGRO-HAB', ' y '.join(textos), ORIGEN_LOGRO, GRUPO_ANTES))
    gusto = _citable(vigentes[ITEM_GUSTOS]) if ITEM_GUSTOS in vigentes else []
    if gusto:
        piezas.append(_pieza('GUSTO', _comillas(' '.join(gusto)), ORIGEN_GUSTO, GRUPO_ANTES))
    return piezas


def piezas_inicio(sesion, cuenta):
    """Las piezas del inicio (b5-3), en su orden: primera opción, ruta, día a los 23, freno e idea escuchada."""
    vigentes = _vigentes(sesion, cuenta, (ITEM_MIA, ITEM_DIA, ITEM_FRENO, ITEM_MITO))
    piezas = []
    inicial = _leer_planes(sesion, cuenta, {TipoReferencia.OPCION_INICIAL}).get(TipoReferencia.OPCION_INICIAL)
    if inicial:
        piezas.append(_pieza('INI-OPCION', inicial['texto'], ORIGENES_INICIO['INI-OPCION'], None))
    mia = vigentes.get(ITEM_MIA)
    elegidas = _elegidas(mia) if mia else []
    if elegidas:
        texto = _texto_de_eleccion(sesion, ITEM_MIA, mia, elegidas[0])
        if texto:
            piezas.append(_pieza('INI-RUTA', texto, ORIGENES_INICIO['INI-RUTA'], None))
    for codigo_item, codigo in ((ITEM_DIA, 'INI-DIA'), (ITEM_FRENO, 'INI-FRENO')):
        lineas = _citable(vigentes[codigo_item]) if codigo_item in vigentes else []
        if lineas:
            piezas.append(_pieza(codigo, _comillas(' '.join(lineas)), ORIGENES_INICIO[codigo], None))
    mito = vigentes.get(ITEM_MITO)
    elegidas = _elegidas(mito) if mito else []
    if elegidas and elegidas[0]['codigo'] != EXCLUSIVAS_SIN_PIEZA[ITEM_MITO]:
        texto = _texto_de_eleccion(sesion, ITEM_MITO, mito, elegidas[0])
        if texto:
            piezas.append(_pieza('INI-MITO', texto, ORIGENES_INICIO['INI-MITO'], None))
    return piezas


# --- Marcadores (§2) -------------------------------------------------------------------------

def marcadores_de(texto):
    return set(_MARCADOR.findall(texto or ''))


def _textos_del_item(item):
    fichas = [item.tarjeta or {}, *((o.get('tarjeta') or {}) for o in item.opciones_propias or ())]
    return [item.dialogo, item.pregunta_eleccion, item.pregunta_texto, item.arranque,
            *(o.get(c) for o in item.opciones_propias or () for c in ('pregunta', 'arranque')),
            *(f.get('tarjeta') for f in fichas),
            *(b for f in fichas for b in (*f.get('bases', {}).values(), *f.get('general_por_opcion', {}).values()))]


def _primera_eleccion(respuesta):
    """La primera elección guardada (el 1.º de un podio), aunque el ítem sea sensible (§3.7)."""
    elegidas = list(respuesta.opciones_elegidas or ()) if respuesta is not None else []
    return elegidas[0] if elegidas else None


def resolver_marcadores(sesion, cuenta, nombres, codigo_item):
    """{marcador: valor} con el formato del runner. Falta uno → `MarcadorSinValor`."""
    valores = {}
    nombres = set(nombres) - DE_LA_TARJETA
    if nombres & {'carrera', 'plan_a', 'plan_b'}:
        planes = (_leer_planes(sesion, cuenta, {TipoReferencia.PLANES}).get(TipoReferencia.PLANES) or {}).get('planes', [])
        if planes:
            valores['carrera'] = valores['plan_a'] = planes[0].carrera
        if len(planes) > 1:
            valores['plan_b'] = planes[1].carrera
    vigentes = _vigentes(sesion, cuenta, (ITEM_BIEN, ITEM_VALORES, ITEM_RETO))
    primera = _primera_eleccion(vigentes.get(ITEM_BIEN))
    if primera is not None:
        # En minúscula y sin artículo (formato del runner); una «Otra», tal cual.
        valores['primera'] = primera['texto'] if _es_otra(primera['codigo']) else primera['texto'].lower()
    valor = _primera_eleccion(vigentes.get(ITEM_VALORES))
    if valor is not None:
        valores['valor 1'] = valor['texto']
    habilidad = _primera_eleccion(vigentes.get(ITEM_RETO))
    if habilidad is not None:
        valores['habilidad'] = habilidad['texto']
    faltan = sorted(nombres - set(valores))
    if faltan:
        raise MarcadorSinValor(faltan[0], codigo_item)
    return {nombre: valores[nombre] for nombre in sorted(nombres)}


def con_marcadores(texto, marcadores):
    if texto is None:
        return None
    for nombre, valor in marcadores.items():
        texto = texto.replace(f'{{{nombre}}}', valor)
    return texto


# --- Ecos (§5.5) -----------------------------------------------------------------------------

def _linea_plan(plan, nombre):
    """«Plan A: carrera · lo que te mueve: motivos · «relato»» (la redacción validada en v7.10)."""
    partes = [plan.carrera]
    if plan.motivos:
        partes.append('lo que te mueve: ' + ', '.join(m.texto for m in plan.motivos))
    if plan.relato:
        partes.append(_comillas(plan.relato))
    return f"{nombre}: {' · '.join(partes)}"


def _ecos_de_items(sesion, cuenta, item, ecos):
    """TEXTO y ELECCION de ítems anteriores de la misma actividad, con las reglas de §3."""
    vigentes = _vigentes(sesion, cuenta, {e['codigo'] for e in ecos if e['origen'] != 'REFERENCIA'})
    definiciones = contexto(sesion).definiciones
    datos = {}
    for eco in ecos:
        if eco['origen'] == 'REFERENCIA':
            continue
        respuesta = vigentes.get(eco['codigo'])
        if respuesta is None or not referenciable(respuesta):
            continue
        fuente = definiciones.por_codigo(ItemRegistro, eco['codigo'])
        entrada = datos.setdefault(eco['codigo'], {'codigo': eco['codigo'], 'nombre': eco.get('nombre') or fuente.nombre})
        if eco['origen'] == 'ELECCION':
            textos = [e['texto'] for e in respuesta.opciones_elegidas or ()
                      if not _es_otra(e['codigo']) or _otra_citable(sesion, eco['codigo'], respuesta)]
            if eco.get('forma') == 'primera':
                textos = textos[:1]
            if textos:
                entrada['eleccion'] = textos
        else:
            lineas = _citable(respuesta)
            if lineas:
                entrada['texto'] = lineas
    return {codigo: d for codigo, d in datos.items() if 'eleccion' in d or 'texto' in d}


def _linea_item(eco_datos):
    """Una línea por ítem: «Nombre: elección. «texto»» (b1-3), «Nombre: elección» o «Nombre: texto»."""
    eleccion = ', '.join(eco_datos.get('eleccion', ()))
    texto = ' '.join(eco_datos.get('texto', ()))
    if eleccion and texto:
        return f"{eco_datos['nombre']}: {eleccion}. {_comillas(texto)}"
    return f"{eco_datos['nombre']}: {eleccion or texto}"


def _ecos(sesion, cuenta, item, ecos, para_llm):
    """Las dos listas de ecos: los que se muestran (estructurados) o los que van al LLM (líneas)."""
    ecos = list(ecos or ())
    if not ecos:
        return ()
    definiciones = contexto(sesion).definiciones
    de_items = _ecos_de_items(sesion, cuenta, item, ecos)
    referencias = {e['codigo']: definiciones.por_codigo(Referencia, e['codigo']) for e in ecos
                   if e['origen'] == 'REFERENCIA'}
    resueltas = resolver(sesion, cuenta, list(referencias.values())) if referencias else {}
    salida, vistos = [], set()
    for eco in ecos:
        if eco['origen'] != 'REFERENCIA':
            if eco['codigo'] in de_items and eco['codigo'] not in vistos:
                vistos.add(eco['codigo'])
                datos = de_items[eco['codigo']]
                salida.append(_linea_item(datos) if para_llm else dict(datos, origen='ITEM'))
            continue
        resuelta = resueltas[eco['codigo']]
        if resuelta.estado != EstadoReferencia.DISPONIBLE:
            continue
        forma, nombre = eco.get('forma'), eco.get('nombre')
        planes = resuelta.planes or []
        if forma == 'plan_a_b':
            if para_llm:
                salida.extend(_linea_plan(p, n) for p, n in zip(planes[:2], ('Plan A', 'Plan B')))
            else:
                salida.append({'codigo': eco['codigo'], 'forma': forma,
                               'planes': [p.model_dump() for p in planes[:2]]})
        elif forma == 'carrera':
            salida.append(f'{nombre}: {resuelta.texto}' if para_llm else
                          {'codigo': eco['codigo'], 'nombre': nombre, 'forma': forma, 'carrera': resuelta.texto})
        elif forma == 'carrera_institucion':
            plan = planes[0]
            valor = ' · '.join(v for v in (plan.carrera, plan.institucion) if v)
            salida.append(f'{nombre}: {valor}' if para_llm else
                          {'codigo': eco['codigo'], 'nombre': nombre, 'forma': forma, 'texto': valor})
        elif forma == 'primera':
            primero = (resuelta.opciones or [None])[0]
            if primero is not None:
                salida.append(f'{nombre}: {primero.texto}' if para_llm else
                              {'codigo': eco['codigo'], 'nombre': nombre, 'forma': forma, 'texto': primero.texto})
        elif forma == 'cabecera':
            plan = (resuelta.planes or [None])[0]
            salida.append({'codigo': eco['codigo'], 'nombre': nombre, 'forma': forma, 'carrera': resuelta.texto,
                           'motivos': [m.texto for m in resuelta.opciones or ()],
                           'idea_origen': plan.idea_origen if plan else None})
        elif forma == 'proyecto':
            plan = planes[0]
            salida.append({'codigo': eco['codigo'], 'nombre': nombre, 'forma': forma, 'carrera': plan.carrera,
                           'institucion': plan.institucion, 'camino': plan.camino})
        elif forma == 'pasos':
            salida.append({'codigo': eco['codigo'], 'forma': forma,
                           'pendientes': [o.texto for o in resuelta.opciones or () if o.estado != 'HECHO'],
                           'hechos': [o.texto for o in resuelta.opciones or () if o.estado == 'HECHO']})
        elif forma == 'hoy':
            salida.append({'codigo': eco['codigo'], 'nombre': nombre, 'forma': forma,
                           'planes': [{'carrera': p.carrera, 'institucion': p.institucion} for p in planes[:2]]})
        else:
            datos = {'codigo': eco['codigo'], 'nombre': nombre, 'tipo': resuelta.tipo.value}
            if resuelta.texto:
                datos['texto'] = resuelta.texto
            if resuelta.opciones:
                datos['opciones'] = [o.texto for o in resuelta.opciones]
            if para_llm:
                partes = [p for p in (resuelta.texto, ', '.join(o.texto for o in resuelta.opciones or ())) if p]
                salida.append(f"{nombre}: {' · '.join(partes)}")
            else:
                salida.append(datos)
    return tuple(salida)


# --- Contexto del ítem -----------------------------------------------------------------------

def _opciones(sesion, cuenta, item, marcadores):
    from app.services.registro.acciones import opciones_por_item
    propias = {o['codigo']: o for o in item.opciones_propias or ()}
    if item.fuente_opciones in (FuenteOpciones.PIEZAS_PERFIL, FuenteOpciones.PIEZAS_PERFIL_MENOS):
        base = piezas_perfil(sesion, cuenta, con_cuesta=item.fuente_opciones == FuenteOpciones.PIEZAS_PERFIL_MENOS)
    elif item.fuente_opciones == FuenteOpciones.PIEZAS_INICIO:
        base = piezas_inicio(sesion, cuenta)
    else:
        base = [OpcionContexto(codigo=o.codigo, texto=o.texto)
                for o in opciones_por_item(sesion, cuenta, (item,))[item.id] if o.codigo not in propias]
    return tuple(base) + tuple(OpcionContexto(
        codigo=codigo, texto=o['texto'], exclusiva=o.get('exclusiva', False), sin_llm=o.get('sin_llm', False),
        pregunta=con_marcadores(o.get('pregunta'), marcadores), arranque=con_marcadores(o.get('arranque'), marcadores),
        tarjeta=o.get('tarjeta')) for codigo, o in propias.items())


@usar_contexto
def resolver_contexto(sesion, cuenta: Cuenta, codigo_item: str) -> ContextoItem:
    """El contexto del ítem para la cuenta (§2). Falta un marcador → `MarcadorSinValor`."""
    item = buscar_por_codigo(sesion, ItemRegistro, codigo_item)
    nombres = set().union(*(marcadores_de(t) for t in _textos_del_item(item)))
    marcadores = resolver_marcadores(sesion, cuenta, nombres, item.codigo)
    return ContextoItem(
        item=item.codigo, dialogo=con_marcadores(item.dialogo, marcadores),
        pregunta_eleccion=con_marcadores(item.pregunta_eleccion, marcadores),
        pregunta_texto=con_marcadores(item.pregunta_texto, marcadores),
        arranque=con_marcadores(item.arranque, marcadores),
        opciones=_opciones(sesion, cuenta, item, marcadores) if item.fuente_opciones is not None else (),
        marcadores=marcadores, ecos_mostrar=_ecos(sesion, cuenta, item, item.ecos_mostrar, para_llm=False),
        ecos_llm=_ecos(sesion, cuenta, item, item.ecos_llm, para_llm=True), ordenada=item.eleccion_ordenada,
        permite_otra=item.permite_otra, etiqueta_otra=item.etiqueta_otra, tarjeta=item.tarjeta,
        sin_llm=item.tarjeta is None)


def etiquetas_marcadas(contexto_item: ContextoItem, elegidas: Sequence) -> tuple[str, ...]:
    """Lo marcado en el formato de `<opcion_marcada>` (§5.4): la etiqueta; con «Otra», lo escrito en «¿Cuál?» (sin
    comillas); con una pieza, su texto con el origen entre paréntesis. El orden es el de lo marcado (el del podio)."""
    salida = []
    for elegida in elegidas:
        codigo, texto = (elegida['codigo'], elegida.get('texto')) if isinstance(elegida, Mapping) else (
            elegida.codigo, elegida.texto)
        if _es_otra(codigo):
            salida.append(texto)
            continue
        opcion = contexto_item.opcion(codigo)
        if opcion is None:
            raise ValueError(f'La opción {codigo} no se ofrece en {contexto_item.item}')
        salida.append(opcion.para_llm)
    return tuple(salida)


def entrada_llm(contexto_item: ContextoItem, elegidas: Sequence, respuesta: str, *, anterior: str | None = None,
                repregunta: str | None = None) -> Entrada:
    """La `Entrada` de la capa del LLM: la tarjeta de la opción marcada (o la del ítem), la pregunta mostrada, lo
    marcado, las líneas de ecos y, en el seguimiento, la respuesta anterior y la repregunta mostrada."""
    codigo = None
    if elegidas:
        primera = elegidas[0]
        codigo = primera['codigo'] if isinstance(primera, Mapping) else primera.codigo
    opcion = contexto_item.opcion(codigo) if codigo else None
    if opcion is not None and opcion.sin_llm:
        raise OpcionSinLLM(f'La opción {codigo} de {contexto_item.item} no pasa por el LLM')
    ficha = (opcion.tarjeta if opcion is not None and opcion.tarjeta else None) or contexto_item.tarjeta
    if ficha is None:
        raise OpcionSinLLM(f'{contexto_item.item} no pasa por el LLM')
    etiquetas = etiquetas_marcadas(contexto_item, elegidas)
    tarjeta = tarjeta_para(ficha, codigo, etiquetas, contexto_item.marcadores)
    return Entrada(tarjeta=tarjeta, pregunta=contexto_item.pregunta_para(codigo), respuesta=respuesta,
                   etiquetas=etiquetas, ordenada=contexto_item.ordenada, ecos=contexto_item.ecos_llm,
                   respuesta_anterior=anterior, invitacion=repregunta)
