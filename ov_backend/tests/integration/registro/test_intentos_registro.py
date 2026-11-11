"""Ajuste registros llm (lote 2), §1 y §10: el modelo de respuesta con su histórico de intentos (lote 3: por el flujo).

Un podio con varias «Otra», guardar un intento nuevo (el anterior queda completo en el histórico y solo el vigente
se lee) y un ítem sin LLM, que se guarda solo con su elección y su texto.
"""

from datetime import datetime

from sqlalchemy import select

from app import models as m
from app.core.contexto import usar_contexto
from app.schemas.registro import OpcionElegida
from app.services.referencias import resolver
from app.services.registro.acciones import guardar_intento, leer_registro, opciones_por_item
from app.services.registro.eleccion import validar_eleccion
from soporte_ruta import FECHA, avanzar, pedir, responder_item, terminar


AHORA = datetime(2026, 11, 10, 10, 0)


def _progreso(sesion, cuenta, actividad):
    progreso = m.ProgresoActividad(cuenta_id=cuenta.id, actividad_id=actividad.id, estado=m.EstadoProgreso.EN_CURSO)
    sesion.add(progreso)
    sesion.flush()
    return progreso


def _de(sesion, modelo, codigo):
    return sesion.scalar(select(modelo).where(modelo.codigo == codigo))


def test_podio_con_dos_otra_ordenadas_se_guarda_con_codigos_textos_y_puestos(sesion_contenido):
    item = _de(sesion_contenido, m.ItemRegistro, 'b2-4-bien')
    cuenta = _de(sesion_contenido, m.Cuenta, 'est-ana')
    opciones = usar_contexto(opciones_por_item)(sesion_contenido, cuenta, (item,))[item.id]
    elegidas = validar_eleccion(item, opciones, [
        OpcionElegida(codigo='OTRA-1', texto='Tocar cajón'), OpcionElegida(codigo='MATEMATICA'),
        OpcionElegida(codigo='OTRA-2', texto='Cocinar')], True)
    assert elegidas == [{'codigo': 'OTRA-1', 'texto': 'Tocar cajón'}, {'codigo': 'MATEMATICA', 'texto': 'Matemática'},
                        {'codigo': 'OTRA-2', 'texto': 'Cocinar'}]
    actividad = _de(sesion_contenido, m.Actividad, 'b2-4')
    progreso = _progreso(sesion_contenido, cuenta, actividad)
    guardar_intento(sesion_contenido, progreso.id, item.id, dict(
        opciones_elegidas=elegidas, primera_respuesta='DATO DE PRUEBA', estado=m.EstadoRespuestaRegistro.CERRADO), AHORA)
    guardada = leer_registro(sesion_contenido, cuenta, actividad).vigentes[item.id]
    assert guardada.opciones_elegidas == elegidas


def test_intento_nuevo_deja_el_anterior_completo_en_el_historico(sesion_contenido):
    cuenta = _de(sesion_contenido, m.Cuenta, 'est-ana')
    item = _de(sesion_contenido, m.ItemRegistro, 'b1-7-dia')
    actividad = _de(sesion_contenido, m.Actividad, 'b1-7')
    progreso = _progreso(sesion_contenido, cuenta, actividad)
    primero = dict(opciones_elegidas=[{'codigo': 'CLARO', 'texto': 'Lo veo bastante claro'}],
                   primera_respuesta='Me despierto en Arequipa', primera_tipo='propio', primera_motivo='un lugar',
                   repregunta='¿Y qué haces ahí?', segunda_respuesta='Trabajo en un taller', conjunto_tipo='propio',
                   conjunto_motivo='una escena', arranque='Ahí hago', tipo_final='propio', sensible=True,
                   estado=m.EstadoRespuestaRegistro.CERRADO, texto_citable=[],
                   valores_contexto={'marcadores': {}, 'ecos': []})
    guardar_intento(sesion_contenido, progreso.id, item.id, primero, AHORA)
    guardar_intento(sesion_contenido, progreso.id, item.id, dict(
        opciones_elegidas=[{'codigo': 'MAS_O_MENOS', 'texto': 'Más o menos'}], primera_respuesta='Estudio de noche',
        primera_tipo='propio', tipo_final='propio', estado=m.EstadoRespuestaRegistro.CERRADO,
        texto_citable=['Estudio de noche']), AHORA)
    filas = sesion_contenido.scalars(select(m.RespuestaRegistro).where(
        m.RespuestaRegistro.progreso_id == progreso.id).order_by(m.RespuestaRegistro.intento)).all()
    assert [(f.intento, f.vigente) for f in filas] == [(1, False), (2, True)]
    anterior = filas[0]
    assert {clave: getattr(anterior, clave) for clave in primero} == primero
    # Solo el vigente se lee: en el registro y en las referencias (el sensible del anterior ya no manda).
    assert leer_registro(sesion_contenido, cuenta, actividad).vigentes[item.id].id == filas[1].id
    referencia = m.Referencia(codigo='DATO-DE-PRUEBA-dia', tipo=m.TipoReferencia.TEXTO, item_registro_id=item.id,
                              actividad_id=_de(sesion_contenido, m.Actividad, 'ma3').id)
    sesion_contenido.add(referencia)
    sesion_contenido.flush()
    resuelta = usar_contexto(resolver)(sesion_contenido, cuenta, [referencia])[referencia.codigo]
    assert (resuelta.estado, resuelta.texto) == (m.EstadoReferencia.DISPONIBLE, 'Estudio de noche')
    sesion_contenido.rollback()


def responder_expectativas(cliente):
    for item, texto, opciones in (('t-exp-ruta', 'DATO DE PRUEBA: universidad', [{'codigo': 'UNIVERSIDAD'}]),
                                  ('t-exp-apoyo', 'DATO DE PRUEBA: mi familia', [{'codigo': 'FAMILIA'}]),
                                  ('t-exp-espera', 'DATO DE PRUEBA: que estudie', [])):
        paso = responder_item(cliente, 't-expectativas', item, opciones, texto)
        # Sin LLM: no hay llamada y el paso es siempre SIGUIENTE.
        assert paso['paso'] == 'SIGUIENTE'
    return terminar(cliente, 't-expectativas')


def test_item_sin_llm_se_guarda_solo_con_eleccion_y_texto(cliente, aplicacion):
    avanzar(cliente, 't-cierre-inicio')
    respuesta = responder_expectativas(cliente)
    assert respuesta['estado'] == 'COMPLETADA' and aplicacion.state.cliente_llm.llamadas == []
    ruta = next(i for i in respuesta['items'] if i['codigo'] == 't-exp-ruta')['respuesta']
    assert ruta['opciones_elegidas'] == [{'codigo': 'UNIVERSIDAD', 'texto': 'Estudiar en una universidad'}]


def test_item_sin_llm_no_lleva_tipo_ni_repregunta(sesion, cliente):
    avanzar(cliente, 't-cierre-inicio')
    responder_expectativas(cliente)
    filas = sesion.scalars(select(m.RespuestaRegistro)).all()
    assert len(filas) == 3 and all(f.vigente and f.intento == 1 for f in filas)
    assert all(f.estado == m.EstadoRespuestaRegistro.COMPLETADO for f in filas)
    assert all((f.primera_tipo, f.primera_motivo, f.repregunta, f.tipo_final, f.pista, f.texto_citable)
               == (None, None, None, None, None, []) for f in filas)


def test_las_rutas_del_flujo_provisional_ya_no_existen(cliente):
    """Lote 3: salen el borrador, la edición por lotes y continuar sin responder."""
    avanzar(cliente, 't-cierre-inicio')
    base = {'cuenta': 'est-ana', 'actividad': 't-expectativas', 'fecha_hora': FECHA}
    for ruta in ('guardar-borrador', 'continuar-sin-responder', 'editar'):
        pedir(cliente, 'POST', f'/acciones/registro/{ruta}', {**base, 'item': 't-exp-ruta'}, 404)
