"""HU-007 y HU-016 (B03): entregar el registro, preguntas de seguimiento por registro y misión adicional.

`t-expectativas` tiene tres ítems con criterios, en orden: `t-exp-ruta` (C1 RAZON), `t-exp-apoyo`
(C1 EJEMPLO) y `t-exp-espera` (C1 EJEMPLO, C2 RAZON). Las marcas del evaluador falso deciden la
clasificación del texto más reciente de cada ítem.
"""

import json

import pytest
from sqlalchemy import select

from app import models as m
from soporte_ruta import FECHA, actividades, avanzar, completar, pedir


ADECUADO = 'DATO DE PRUEBA: una respuesta completa con su ejemplo y su razón.'
CORTO = 'DATO DE PRUEBA corto'
OPCIONES = {'t-exp-ruta': [{'codigo': 'INSTITUTO'}], 't-exp-apoyo': [{'codigo': 'FAMILIA'}], 't-exp-espera': []}
CLAVES_PRIVADAS = ('clasificacion', 'criterios', 'consolidad', 'requiere_atencion', 'evaluacion')


def accion(cuenta='est-ana', actividad='t-expectativas'):
    return {'cuenta': cuenta, 'actividad': actividad, 'fecha_hora': FECHA}


def preparar(cliente, cuenta='est-ana', **textos):
    """Abre T1 y guarda un borrador por ítem; `textos` reemplaza el texto adecuado por defecto."""
    avanzar(cliente, 't-cierre-inicio', cuenta)
    for item, opciones in OPCIONES.items():
        pedir(cliente, 'POST', '/acciones/registro/guardar-borrador', {
            **accion(cuenta), 'item': item, 'texto': textos.get(item.replace('-', '_'), ADECUADO),
            'opciones': opciones})


def entregar(cliente, cuenta='est-ana', esperado=200):
    return pedir(cliente, 'POST', '/acciones/registro/entregar', accion(cuenta), esperado)


def responder(cliente, item, texto, cuenta='est-ana', esperado=200, actividad='t-expectativas'):
    return pedir(cliente, 'POST', '/acciones/registro/responder-seguimiento',
                 {**accion(cuenta, actividad), 'item': item, 'texto': texto}, esperado)


def omitir(cliente, item, cuenta='est-ana', esperado=200):
    return pedir(cliente, 'POST', '/acciones/registro/continuar-sin-responder',
                 {**accion(cuenta), 'item': item}, esperado)


def por_ampliar(respuesta):
    return [i['item'] for i in respuesta['items_por_ampliar']]


def reflexivas(respuesta):
    return eventos(respuesta).count(('RESPUESTA_REFLEXIVA', None))


def pendiente(respuesta):
    """(ítem, orden, pregunta) de la pregunta abierta, o None si no hay."""
    for r in respuesta['respuestas']:
        if r['estado'] == 'PENDIENTE_SEGUIMIENTO':
            pregunta = r['conversacion'][-1]
            return r['item'], pregunta['orden'], pregunta['texto']
    return None


def eventos(respuesta):
    return [(e['tipo'], e['referencia']) for e in respuesta['eventos_registrados']]


def evaluador(aplicacion):
    return aplicacion.state.evaluador_respuestas


def respuestas_bd(sesion, item):
    respuesta = sesion.scalar(select(m.RespuestaRegistro).join(m.ItemRegistro).where(m.ItemRegistro.codigo == item))
    sesion.refresh(respuesta)
    evaluaciones = sesion.scalars(select(m.EvaluacionRespuesta).where(
        m.EvaluacionRespuesta.respuesta_id == respuesta.id).order_by(m.EvaluacionRespuesta.numero)).all()
    return respuesta, evaluaciones


def sin_claves_privadas(respuesta):
    texto = json.dumps(respuesta)
    return not any(clave in texto for clave in CLAVES_PRIVADAS)


def test_todo_adecuado_completa_el_registro_y_abre_la_mision_adicional(cliente, aplicacion):
    preparar(cliente)
    assert 't-adicional' not in actividades(cliente) or actividades(cliente)['t-adicional'] == 'BLOQUEADA'
    respuesta = entregar(cliente)
    assert respuesta['estado'] == 'COMPLETADA' and respuesta['items_por_ampliar'] == []
    assert {r['estado'] for r in respuesta['respuestas']} == {'FINAL'}
    assert eventos(respuesta)[:2] == [('COMPLETA_ACTIVIDAD', 't-expectativas'), ('COMPLETA_BLOQUE', 'T1')]
    # B04: ser adecuada al inicio no es una respuesta reflexiva.
    assert reflexivas(respuesta) == 0
    assert eventos(respuesta)[-1] == ('REGISTRO_ADECUADO', 't-expectativas')
    assert 'R-t-adicional' in {d['regla'] for d in respuesta['nuevos_desbloqueos']}
    assert evaluador(aplicacion).llamadas_entrega == 1 and evaluador(aplicacion).llamadas_seguimiento == 0
    assert actividades(cliente)['t-adicional'] == 'DISPONIBLE'
    assert ('COMPLETA_ACTIVIDAD', 't-adicional') in eventos(completar(cliente, 't-adicional'))
    assert sin_claves_privadas(respuesta)


def test_entregar_hace_una_sola_llamada_con_las_opciones_elegidas(cliente, aplicacion):
    preparar(cliente, t_exp_ruta=f'{ADECUADO} [vaga]')
    entregar(cliente)
    falso = evaluador(aplicacion)
    assert falso.llamadas_entrega == 1
    contexto = falso.contextos[0]
    assert [item.item for item in contexto.items] == ['t-exp-ruta', 't-exp-apoyo', 't-exp-espera']
    assert len(contexto.items[0].opciones_elegidas) == 1 and contexto.items[2].opciones_elegidas == ()
    assert contexto.items[1].opciones_elegidas == ('Mi familia',)
    assert [c.repregunta for c in contexto.items[2].criterios] == [
        '¿Podrías darme un ejemplo concreto?', '¿Por qué lo piensas así?']


def test_los_items_sin_criterios_no_llegan_al_llm(cliente, aplicacion):
    avanzar(cliente, 't-cierre-inicio')
    for item, texto, opciones in (('t-val-orden', ADECUADO, [{'codigo': 'SERVIR'}, {'codigo': 'CREAR'},
                                                            {'codigo': 'LIBERTAD'}]),
                                  ('t-val-libre', 'DATO DE PRUEBA', []), ('t-val-breve', CORTO, [])):
        pedir(cliente, 'POST', '/acciones/registro/guardar-borrador', {
            **accion(actividad='t-valores'), 'item': item, 'texto': texto, 'opciones': opciones})
    respuesta = pedir(cliente, 'POST', '/acciones/registro/entregar', accion(actividad='t-valores'))
    contexto, = evaluador(aplicacion).contextos
    assert [item.item for item in contexto.items] == ['t-val-orden']
    # `t-val-breve` solo tiene extensión mínima (40): corto, recibe la repregunta genérica.
    assert pendiente(respuesta) == ('t-val-breve', 1, '¿Podrías contarme un poco más?')
    respuesta = responder(cliente, 't-val-breve', 'DATO DE PRUEBA: ahora sí con más detalle sobre ese momento',
                          actividad='t-valores')
    assert respuesta['estado'] == 'COMPLETADA' and respuesta['items_por_ampliar'] == []
    assert evaluador(aplicacion).llamadas_seguimiento == 0


def test_la_pregunta_se_repite_en_el_mismo_item_y_nunca_hay_una_tercera(cliente, aplicacion, sesion):
    preparar(cliente, t_exp_ruta=f'{CORTO} [vaga]', t_exp_espera=f'{CORTO} [vaga]')
    primera = entregar(cliente)
    item, orden, pregunta = pendiente(primera)
    assert (item, orden) == ('t-exp-ruta', 1)
    assert pregunta == 'Sobre lo que contaste: ¿Por qué lo piensas así?'
    assert primera['estado'] == 'EN_CURSO' and 'items_por_ampliar' not in primera
    segunda = responder(cliente, 't-exp-ruta', 'Porque sí [vaga]')
    assert pendiente(segunda)[:2] == ('t-exp-ruta', 2)
    cierre = responder(cliente, 't-exp-ruta', 'Sigo sin saber [vaga]')
    # Ampliar sin quedar adecuada no es una respuesta reflexiva.
    assert reflexivas(segunda) == reflexivas(cierre) == 0
    assert pendiente(cierre) is None and cierre['estado'] == 'COMPLETADA'
    assert por_ampliar(cierre) == ['t-exp-ruta', 't-exp-espera']
    assert ('REGISTRO_ADECUADO', 't-expectativas') not in eventos(cierre)
    assert sesion.scalar(select(m.TurnoSeguimiento.id).join(m.RespuestaRegistro).join(m.ItemRegistro).where(
        m.ItemRegistro.codigo == 't-exp-espera')) is None
    assert evaluador(aplicacion).llamadas_seguimiento == 2
    assert actividades(cliente)['t-adicional'] == 'BLOQUEADA'
    respuesta, evaluaciones = respuestas_bd(sesion, 't-exp-ruta')
    assert [e.numero for e in evaluaciones] == [1, 2, 3]
    assert respuesta.texto_consolidado == f'{CORTO} [vaga]\n\nPorque sí [vaga]\n\nSigo sin saber [vaga]'
    assert sin_claves_privadas(cierre)


def test_si_el_item_queda_adecuado_la_pregunta_pasa_al_siguiente_por_orden(cliente, sesion):
    preparar(cliente, t_exp_ruta=f'{CORTO} [vaga]', t_exp_espera=f'{CORTO} [falta:RAZON]')
    entregar(cliente)
    segunda = responder(cliente, 't-exp-ruta', 'Porque me gusta la práctica')
    item, orden, pregunta = pendiente(segunda)
    # `[falta:RAZON]` deja faltando solo C2, así que la base es la repregunta de RAZON.
    assert (item, orden, pregunta) == ('t-exp-espera', 1, 'Sobre lo que contaste: ¿Por qué lo piensas así?')
    # Responder un turno que deja adecuada la respuesta la vuelve reflexiva, aunque el registro siga abierto.
    assert eventos(segunda) == [('RESPUESTA_REFLEXIVA', None)]
    cierre = responder(cliente, 't-exp-espera', 'Porque me quieren')
    assert reflexivas(cierre) == 1
    assert cierre['estado'] == 'COMPLETADA' and cierre['items_por_ampliar'] == []
    assert ('REGISTRO_ADECUADO', 't-expectativas') in eventos(cierre)
    respuesta, evaluaciones = respuestas_bd(sesion, 't-exp-ruta')
    assert respuesta.clasificacion_inicial == 'POCO_DESARROLLADA' and respuesta.ampliada
    assert respuesta.reflexiva_registrada
    assert evaluaciones[-1].clasificacion == 'ADECUADA'
    assert respuesta.texto_consolidado == f'{CORTO} [vaga]\n\nPorque me gusta la práctica'


def test_pregunta_invalida_se_reemplaza_por_la_repregunta_base(cliente):
    preparar(cliente, t_exp_espera=f'{CORTO} [vaga] [pregunta-invalida]')
    assert pendiente(entregar(cliente)) == ('t-exp-espera', 1, '¿Podrías darme un ejemplo concreto?')


def test_consolidada_invalida_usa_la_concatenacion(cliente, sesion):
    preparar(cliente, t_exp_apoyo=f'{CORTO} [vaga]')
    entregar(cliente)
    responder(cliente, 't-exp-apoyo', 'Mi mamá me ayudó [consolidada-invalida]')
    respuesta, _ = respuestas_bd(sesion, 't-exp-apoyo')
    assert respuesta.texto_consolidado == f'{CORTO} [vaga]\n\nMi mamá me ayudó [consolidada-invalida]'


def test_sin_seguimiento_la_consolidada_es_la_respuesta_inicial(cliente, sesion):
    preparar(cliente)
    entregar(cliente)
    respuesta, evaluaciones = respuestas_bd(sesion, 't-exp-ruta')
    assert respuesta.texto_consolidado == ADECUADO
    assert [(e.origen, e.clasificacion) for e in evaluaciones] == [('LLM', 'ADECUADA')]


def test_omitir_cierra_sin_registro_adecuado_y_deja_el_turno_sin_respuesta(cliente):
    preparar(cliente, t_exp_ruta=f'{CORTO} [vaga]')
    entregar(cliente)
    pedir(cliente, 'POST', '/acciones/registro/guardar-borrador',
          {**accion(), 'item': 't-exp-ruta', 'texto': 'A medias', 'opciones': []})
    cierre = omitir(cliente, 't-exp-ruta')
    assert cierre['estado'] == 'COMPLETADA' and por_ampliar(cierre) == ['t-exp-ruta']
    assert ('REGISTRO_ADECUADO', 't-expectativas') not in eventos(cierre)
    assert ('COMPLETA_ACTIVIDAD', 't-expectativas') in eventos(cierre)
    ruta = next(r for r in cierre['respuestas'] if r['item'] == 't-exp-ruta')
    assert ruta['estado'] == 'FINAL' and ruta['conversacion'][-1]['tipo'] == 'pregunta'
    assert actividades(cliente)['t-adicional'] == 'BLOQUEADA'
    responder(cliente, 't-exp-ruta', 'Tarde', esperado=409)


def test_llm_caido_con_items_cortos_solo_dos_reciben_la_generica(cliente, aplicacion, sesion):
    preparar(cliente, t_exp_ruta=f'{CORTO} [falla]', t_exp_apoyo=CORTO, t_exp_espera=CORTO)
    primera = entregar(cliente)
    assert pendiente(primera) == ('t-exp-ruta', 1, '¿Podrías contarme un poco más?')
    _, evaluaciones = respuestas_bd(sesion, 't-exp-apoyo')
    assert [(e.origen, e.clasificacion, e.error is not None) for e in evaluaciones] == [
        ('EXTENSION_MINIMA', 'POCO_DESARROLLADA', True)]
    # La genérica respondida no se evalúa: NO_EVALUADA y la pregunta pasa al siguiente.
    segunda = responder(cliente, 't-exp-ruta', 'Algo más sobre mi plan')
    assert pendiente(segunda) == ('t-exp-apoyo', 1, '¿Podrías contarme un poco más?')
    assert evaluador(aplicacion).llamadas_seguimiento == 0
    cierre = omitir(cliente, 't-exp-apoyo')
    assert por_ampliar(cierre) == ['t-exp-apoyo', 't-exp-espera']
    assert ('REGISTRO_ADECUADO', 't-expectativas') not in eventos(cierre)
    respuesta, evaluaciones = respuestas_bd(sesion, 't-exp-ruta')
    assert evaluaciones[-1].clasificacion == 'NO_EVALUADA'
    assert respuesta.texto_consolidado == f'{CORTO} [falla]\n\nAlgo más sobre mi plan'


def test_llm_caido_con_respuestas_largas_quedan_sin_evaluar_y_cuentan_como_adecuadas(cliente):
    preparar(cliente, t_exp_ruta=f'{ADECUADO} [falla]')
    respuesta = entregar(cliente)
    assert respuesta['estado'] == 'COMPLETADA' and respuesta['items_por_ampliar'] == []
    assert ('REGISTRO_ADECUADO', 't-expectativas') in eventos(respuesta)


def test_fallo_en_el_seguimiento_deja_no_evaluada_y_pasa_al_siguiente(cliente, sesion):
    preparar(cliente, t_exp_ruta=f'{CORTO} [vaga]', t_exp_apoyo=f'{CORTO} [vaga]')
    entregar(cliente)
    segunda = responder(cliente, 't-exp-ruta', 'Respuesta [falla]')
    assert pendiente(segunda)[:2] == ('t-exp-apoyo', 1)
    respuesta, evaluaciones = respuestas_bd(sesion, 't-exp-ruta')
    assert (evaluaciones[-1].origen, evaluaciones[-1].clasificacion) == ('EXTENSION_MINIMA', 'NO_EVALUADA')
    assert evaluaciones[-1].error and respuesta.texto_consolidado == f'{CORTO} [vaga]\n\nRespuesta [falla]'


def test_entregar_exige_obligatorios_y_solo_una_vez(cliente):
    avanzar(cliente, 't-cierre-inicio')
    pedir(cliente, 'POST', '/acciones/registro/guardar-borrador',
          {**accion(), 'item': 't-exp-ruta', 'texto': ADECUADO, 'opciones': [{'codigo': 'INSTITUTO'}]})
    pedir(cliente, 'POST', '/acciones/registro/guardar-borrador',
          {**accion(), 'item': 't-exp-apoyo', 'texto': '   ', 'opciones': [{'codigo': 'FAMILIA'}]})
    rechazo = entregar(cliente, esperado=409)['detail']
    assert rechazo['items_faltantes'] == ['t-exp-apoyo', 't-exp-espera']
    preparar(cliente)
    entregar(cliente)
    entregar(cliente, esperado=409)


def test_la_respuesta_al_estudiante_nunca_lleva_la_clasificacion(cliente):
    preparar(cliente, t_exp_ruta=f'{CORTO} [vaga]')
    primera = entregar(cliente)
    registro = pedir(cliente, 'GET', '/cuentas/est-ana/actividades/t-expectativas/registro')
    cierre = responder(cliente, 't-exp-ruta', 'Porque sí')
    assert all(sin_claves_privadas(r) for r in (primera, registro, cierre))


@pytest.mark.parametrize('cuenta', ['apo-rosa', 'ori-carmen'])
def test_otras_cuentas_no_actuan_sobre_registros(cliente, cuenta):
    respuesta = pedir(cliente, 'POST', '/acciones/registro/entregar', accion(cuenta), esperado=404)
    assert respuesta['detail']['mensaje']


def test_la_entrega_de_una_cuenta_no_toca_a_otra(cliente):
    preparar(cliente)
    preparar(cliente, 'est-luis', t_exp_ruta=f'{CORTO} [vaga]')
    entregar(cliente)
    luis = pedir(cliente, 'GET', '/cuentas/est-luis/actividades/t-expectativas/registro')
    assert {r['estado'] for r in luis['respuestas']} == {'BORRADOR'}
    assert pendiente(entregar(cliente, 'est-luis'))[0] == 't-exp-ruta'
    assert actividades(cliente)['t-adicional'] == 'DISPONIBLE'
    assert actividades(cliente, 'est-luis')['t-adicional'] == 'BLOQUEADA'
