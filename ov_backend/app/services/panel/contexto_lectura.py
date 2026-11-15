"""El contexto de hoy de los ítems de registro de un estudiante, leído por la orientadora (auditoría del panel, H1).

Da lo mismo que `registro.contexto.resolver_contexto` en lo que usa la pestaña Respuestas: los marcadores, los ecos
que se muestran, los ecos al LLM (los compara `eco_cambiado`) y, en los ítems de piezas, las piezas que se ofrecen.
La diferencia es cómo lee: una sola vez por petición, y no una vez por ítem. Lee las respuestas vigentes de la
cuenta, sus planes, las referencias de todos los ecos (con `resolver`, que ya resuelve en lote) y las piezas del
perfil y del inicio. Cada ítem se arma una vez. No arma las opciones de lista de los ítems que no son de piezas,
porque ni la lectura ni `eco_cambiado` las usan.

`resolver_contexto` y el flujo del estudiante no cambian. Este módulo repite la regla de los marcadores
(`resolver_marcadores`) y la de los ecos (`_ecos`, `_ecos_de_items`) sobre lo ya leído, y reutiliza sus piezas
puras. `tests/integration/panel/test_panel_contexto_lectura.py` compara, por cada ítem de los estudiantes de
ejemplo, lo que arma esta lectura con `resolver_contexto` en vivo: quien cambie esas reglas debe cambiar también este
módulo (ver `docs/sistema/panel.md`).
"""

from sqlalchemy import select

from app.core.contexto import contexto
from app.core.parametros import ITEM_BIEN, ITEM_RETO, ITEM_VALORES
from app.models import Cuenta, ItemRegistro, ProgresoActividad, Referencia, RespuestaRegistro
from app.models.enums import EstadoReferencia, FuenteOpciones, TipoReferencia
from app.services.referencias import _leer_planes, referenciable, resolver
from app.services.registro.contexto import (
    DE_LA_TARJETA, ORIGEN_OTRA, ContextoItem, MarcadorSinValor, OpcionContexto, _citable, _es_otra, _linea_item,
    _linea_plan, _otra_citable, _primera_eleccion, _texto_fijo, _textos_del_item, con_marcadores, marcadores_de,
    piezas_inicio, piezas_perfil,
)

_PERFIL = (FuenteOpciones.PIEZAS_PERFIL, FuenteOpciones.PIEZAS_PERFIL_MENOS)


class LecturaContexto:
    """El contexto de hoy de `items` para `cuenta`, una lectura por dato. `hoy(item)` es `None` si al ítem le falta
    un marcador (como `_hoy` de la pestaña con `MarcadorSinValor`)."""

    def __init__(self, sesion, cuenta: Cuenta, items: list[ItemRegistro]):
        self.sesion = sesion
        self.cuenta = cuenta
        self.items = items
        self._leido = False
        self._hoy: dict[int, ContextoItem | None] = {}

    # --- Lecturas, una vez ---------------------------------------------------------------------

    def _leer(self):
        if self._leido:
            return
        self._leido = True
        definiciones = contexto(self.sesion).definiciones
        codigo_de = {i.id: i.codigo for i in definiciones.listar(ItemRegistro)}
        self.vigentes = {codigo_de[r.item_registro_id]: r for r in self.sesion.scalars(
            select(RespuestaRegistro).join(ProgresoActividad, ProgresoActividad.id == RespuestaRegistro.progreso_id)
            .where(ProgresoActividad.cuenta_id == self.cuenta.id, RespuestaRegistro.vigente))
            if r.item_registro_id in codigo_de}
        nombres = set().union(*(self._nombres(i) for i in self.items)) if self.items else set()
        self.planes = []
        if nombres & {'carrera', 'plan_a', 'plan_b'}:
            leidos = _leer_planes(self.sesion, self.cuenta, {TipoReferencia.PLANES}).get(TipoReferencia.PLANES) or {}
            self.planes = leidos.get('planes', [])
        codigos = {e['codigo'] for i in self.items for ecos in (i.ecos_mostrar, i.ecos_llm) for e in ecos or ()
                   if e['origen'] == 'REFERENCIA'}
        referencias = [definiciones.por_codigo(Referencia, c) for c in sorted(codigos)]
        self.resueltas = resolver(self.sesion, self.cuenta, referencias) if referencias else {}
        # Las piezas se leen aquí si algún ítem las usa, así el número de lecturas no depende de cuántos respondió.
        # «Lo que te cuesta» va primero en la variante «menos» (`piezas_perfil(con_cuesta=True)`): sin ella, la lista
        # es la misma sin las piezas `CUESTA-*`, así que una lectura sirve para las dos.
        fuentes = {i.fuente_opciones for i in self.items}
        self.piezas = {}
        if fuentes & set(_PERFIL):
            con_cuesta = piezas_perfil(self.sesion, self.cuenta, con_cuesta=True)
            self.piezas[FuenteOpciones.PIEZAS_PERFIL_MENOS] = con_cuesta
            self.piezas[FuenteOpciones.PIEZAS_PERFIL] = [p for p in con_cuesta if not p.codigo.startswith('CUESTA-')]
        if FuenteOpciones.PIEZAS_INICIO in fuentes:
            self.piezas[FuenteOpciones.PIEZAS_INICIO] = piezas_inicio(self.sesion, self.cuenta)

    @staticmethod
    def _nombres(item):
        return set().union(*(marcadores_de(t) for t in _textos_del_item(item)))

    # --- Marcadores (como `resolver_marcadores`) -----------------------------------------------

    def _marcadores(self, nombres, codigo_item):
        valores = {}
        nombres = set(nombres) - DE_LA_TARJETA
        if nombres & {'carrera', 'plan_a', 'plan_b'}:
            if self.planes:
                valores['carrera'] = valores['plan_a'] = self.planes[0].carrera
            if len(self.planes) > 1:
                valores['plan_b'] = self.planes[1].carrera
        primera = _primera_eleccion(self.vigentes.get(ITEM_BIEN))
        if primera is not None:
            valores['primera'] = primera['texto'] if _es_otra(primera['codigo']) else primera['texto'].lower()
        valor = _primera_eleccion(self.vigentes.get(ITEM_VALORES))
        if valor is not None:
            valores['valor 1'] = valor['texto']
        habilidad = _primera_eleccion(self.vigentes.get(ITEM_RETO))
        if habilidad is not None:
            valores['habilidad'] = habilidad['texto']
        faltan = sorted(nombres - set(valores))
        if faltan:
            raise MarcadorSinValor(faltan[0], codigo_item)
        return {nombre: valores[nombre] for nombre in sorted(nombres)}

    # --- Ecos (como `_ecos_de_items` y `_ecos`) -------------------------------------------------

    def _ecos_de_items(self, ecos):
        definiciones = contexto(self.sesion).definiciones
        datos = {}
        for eco in ecos:
            if eco['origen'] == 'REFERENCIA':
                continue
            respuesta = self.vigentes.get(eco['codigo'])
            if respuesta is None or not referenciable(respuesta):
                continue
            fuente = definiciones.por_codigo(ItemRegistro, eco['codigo'])
            entrada = datos.setdefault(eco['codigo'], {'codigo': eco['codigo'],
                                                       'nombre': eco.get('nombre') or fuente.nombre})
            if eco['origen'] == 'ELECCION':
                textos = [e['texto'] for e in respuesta.opciones_elegidas or ()
                          if not _es_otra(e['codigo']) or _otra_citable(self.sesion, eco['codigo'], respuesta)]
                if eco.get('forma') == 'primera':
                    textos = textos[:1]
                if textos:
                    entrada['eleccion'] = textos
            else:
                lineas = _citable(respuesta)
                if lineas:
                    entrada['texto'] = lineas
        return {codigo: d for codigo, d in datos.items() if 'eleccion' in d or 'texto' in d}

    def _ecos(self, ecos, para_llm):
        ecos = list(ecos or ())
        if not ecos:
            return ()
        de_items = self._ecos_de_items(ecos)
        salida, vistos = [], set()
        for eco in ecos:
            if eco['origen'] != 'REFERENCIA':
                if eco['codigo'] in de_items and eco['codigo'] not in vistos:
                    vistos.add(eco['codigo'])
                    datos = de_items[eco['codigo']]
                    salida.append(_linea_item(datos) if para_llm else dict(datos, origen='ITEM'))
                continue
            resuelta = self.resueltas[eco['codigo']]
            if resuelta.estado != EstadoReferencia.DISPONIBLE:
                continue
            salida.extend(_eco_de_referencia(eco, resuelta, para_llm))
        return tuple(salida)

    # --- El ítem ---------------------------------------------------------------------------------

    def hoy(self, item: ItemRegistro) -> ContextoItem | None:
        if item.id not in self._hoy:
            self._leer()
            try:
                self._hoy[item.id] = self._armar(item)
            except MarcadorSinValor:
                self._hoy[item.id] = None
        return self._hoy[item.id]

    def _armar(self, item):
        marcadores = self._marcadores(self._nombres(item), item.codigo)
        opciones = ()
        if item.fuente_opciones in (*_PERFIL, FuenteOpciones.PIEZAS_INICIO):
            propias = {o['codigo']: o for o in item.opciones_propias or ()}
            opciones = tuple(self.piezas[item.fuente_opciones]) + tuple(OpcionContexto(
                codigo=codigo, texto=o['texto'], exclusiva=o.get('exclusiva', False), sin_llm=o.get('sin_llm', False),
                pregunta=con_marcadores(o.get('pregunta'), marcadores),
                arranque=con_marcadores(o.get('arranque'), marcadores), tarjeta=o.get('tarjeta'))
                for codigo, o in propias.items())
        return ContextoItem(
            item=item.codigo, dialogo=con_marcadores(item.dialogo, marcadores),
            pregunta_eleccion=con_marcadores(item.pregunta_eleccion, marcadores),
            pregunta_texto=con_marcadores(item.pregunta_texto, marcadores),
            arranque=con_marcadores(item.arranque, marcadores), opciones=opciones, marcadores=marcadores,
            ecos_mostrar=self._ecos(item.ecos_mostrar, para_llm=False),
            ecos_llm=self._ecos(item.ecos_llm, para_llm=True), ordenada=item.eleccion_ordenada,
            permite_otra=item.permite_otra, etiqueta_otra=item.etiqueta_otra, tarjeta=item.tarjeta,
            sin_llm=item.tarjeta is None, fuente=None if item.fuente_opciones is None else item.fuente_opciones.value,
            origen_otra_llm=(_texto_fijo(self.sesion, f'PIEZA_ORIGEN_{ORIGEN_OTRA[item.fuente_opciones]}_LLM')
                             if item.fuente_opciones in ORIGEN_OTRA else None))


def _eco_de_referencia(eco, resuelta, para_llm):
    """Las líneas (al LLM) o el eco estructurado (que se muestra) de una referencia disponible, como `_ecos`."""
    forma, nombre = eco.get('forma'), eco.get('nombre')
    planes = resuelta.planes or []
    if forma == 'plan_a_b':
        if para_llm:
            return [_linea_plan(p, n) for p, n in zip(planes[:2], ('Plan A', 'Plan B'))]
        return [{'codigo': eco['codigo'], 'forma': forma, 'planes': [p.model_dump() for p in planes[:2]]}]
    if forma == 'carrera':
        return [f'{nombre}: {resuelta.texto}' if para_llm else
                {'codigo': eco['codigo'], 'nombre': nombre, 'forma': forma, 'carrera': resuelta.texto}]
    if forma == 'carrera_institucion':
        plan = planes[0]
        valor = ' · '.join(v for v in (plan.carrera, plan.institucion) if v)
        return [f'{nombre}: {valor}' if para_llm else
                {'codigo': eco['codigo'], 'nombre': nombre, 'forma': forma, 'texto': valor}]
    if forma == 'primera':
        primero = (resuelta.opciones or [None])[0]
        if primero is None:
            return []
        return [f'{nombre}: {primero.texto}' if para_llm else
                {'codigo': eco['codigo'], 'nombre': nombre, 'forma': forma, 'texto': primero.texto}]
    if forma == 'cabecera':
        plan = (resuelta.planes or [None])[0]
        return [{'codigo': eco['codigo'], 'nombre': nombre, 'forma': forma, 'carrera': resuelta.texto,
                 'motivos': [m.texto for m in resuelta.opciones or ()], 'idea_origen': plan.idea_origen if plan else None}]
    if forma == 'proyecto':
        plan = planes[0]
        return [{'codigo': eco['codigo'], 'nombre': nombre, 'forma': forma, 'carrera': plan.carrera,
                 'institucion': plan.institucion, 'camino': plan.camino}]
    if forma == 'pasos':
        return [{'codigo': eco['codigo'], 'forma': forma,
                 'pendientes': [o.texto for o in resuelta.opciones or () if o.estado != 'HECHO'],
                 'hechos': [o.texto for o in resuelta.opciones or () if o.estado == 'HECHO']}]
    if forma == 'hoy':
        return [{'codigo': eco['codigo'], 'nombre': nombre, 'forma': forma,
                 'planes': [{'carrera': p.carrera, 'institucion': p.institucion} for p in planes[:2]]}]
    datos = {'codigo': eco['codigo'], 'nombre': nombre, 'tipo': resuelta.tipo.value}
    if resuelta.texto:
        datos['texto'] = resuelta.texto
    if resuelta.lineas:
        datos['lineas'] = list(resuelta.lineas)
    if resuelta.opciones:
        datos['opciones'] = [o.texto for o in resuelta.opciones]
    if para_llm:
        partes = [p for p in (resuelta.texto, ', '.join(o.texto for o in resuelta.opciones or ())) if p]
        return [f"{nombre}: {' · '.join(partes)}"]
    return [datos]
