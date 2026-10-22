"""HU-008: consulta de la respuesta consolidada, lo que se puede ampliar y edición (B04).

Los textos son DATO DE PRUEBA; las marcas (`[vaga]`, `[falla]`…) las interpreta el evaluador falso.
"""

from sqlalchemy import func, select

from app import models as m
from soporte_ruta import FECHA, actividades, avanzar, pedir


ADECUADO = 'DATO DE PRUEBA: una respuesta completa con su ejemplo y su razón.'
CORTO = 'DATO DE PRUEBA corto'
OPCIONES = {'t-exp-ruta': [{'codigo': 'INSTITUTO'}], 't-exp-apoyo': [{'codigo': 'FAMILIA'}], 't-exp-espera': []}
CLAVES_PRIVADAS = ('clasificacion', 'criterios', 'requiere_atencion', 'evaluacion')


def accion(cuenta='est-ana', actividad='t-expectativas'):
    return {'cuenta': cuenta, 'actividad': actividad, 'fecha_hora': FECHA}


def entregar(cliente, cuenta='est-ana', **textos):
    """Abre T1, guarda un borrador por ítem y entrega; `textos` reemplaza el texto adecuado por defecto."""
    avanzar(cliente, 't-cierre-inicio', cuenta)
    for item, opciones in OPCIONES.items():
        pedir(cliente, 'POST', '/acciones/registro/guardar-borrador', {
            **accion(cuenta), 'item': item, 'texto': textos.get(item.replace('-', '_'), ADECUADO),
            'opciones': opciones})
    return pedir(cliente, 'POST', '/acciones/registro/entregar', accion(cuenta))


def responder(cliente, item, texto, cuenta='est-ana', esperado=200):
    return pedir(cliente, 'POST', '/acciones/registro/responder-seguimiento',
                 {**accion(cuenta), 'item': item, 'texto': texto}, esperado)


def omitir(cliente, item, cuenta='est-ana'):
    return pedir(cliente, 'POST', '/acciones/registro/continuar-sin-responder', {**accion(cuenta), 'item': item})


def consultar(cliente, cuenta='est-ana', actividad='t-expectativas', esperado=200):
    return pedir(cliente, 'GET', f'/cuentas/{cuenta}/actividades/{actividad}/registro', esperado=esperado)


def consolidadas(registro):
    return {r['item']: r.get('texto_consolidado') for r in registro['respuestas']}


def pistas(registro):
    return {i['item']: i['pista'] for i in registro['items_por_ampliar']}


def sin_claves_privadas(respuesta):
    texto = str(respuesta)
    return not any(clave in texto for clave in CLAVES_PRIVADAS)


# --- Consulta -------------------------------------------------------------------------------

def test_sin_cerrar_no_hay_consolidada_ni_items_por_ampliar(cliente):
    avanzar(cliente, 't-cierre-inicio')
    pedir(cliente, 'POST', '/acciones/registro/guardar-borrador',
          {**accion(), 'item': 't-exp-ruta', 'texto': ADECUADO, 'opciones': OPCIONES['t-exp-ruta']})
    borrador = consultar(cliente)
    assert 'items_por_ampliar' not in borrador and consolidadas(borrador) == {'t-exp-ruta': None}
    for item in ('t-exp-apoyo', 't-exp-espera'):
        pedir(cliente, 'POST', '/acciones/registro/guardar-borrador',
              {**accion(), 'item': item, 'texto': f'{CORTO} [vaga]', 'opciones': OPCIONES[item]})
    pedir(cliente, 'POST', '/acciones/registro/entregar', accion())
    pendiente = consultar(cliente)
    assert 'items_por_ampliar' not in pendiente and set(consolidadas(pendiente).values()) == {None}


def test_registro_cerrado_devuelve_la_consolidada_y_nada_por_ampliar(cliente):
    entregar(cliente, t_exp_apoyo=f'{CORTO} [vaga]')
    responder(cliente, 't-exp-apoyo', 'Mi mamá me ayudó')
    registro = consultar(cliente)
    assert registro['estado'] == 'COMPLETADA' and registro['items_por_ampliar'] == []
    assert consolidadas(registro) == {'t-exp-ruta': ADECUADO, 't-exp-apoyo': f'{CORTO} [vaga]\n\nMi mamá me ayudó',
                                      't-exp-espera': ADECUADO}
    assert sin_claves_privadas(registro)


def test_la_pista_tras_omitir_es_la_pregunta_omitida(cliente):
    entrega = entregar(cliente, t_exp_ruta=f'{CORTO} [vaga]')
    pregunta = next(r for r in entrega['respuestas'] if r['item'] == 't-exp-ruta')['conversacion'][-1]['texto']
    omitir(cliente, 't-exp-ruta')
    registro = consultar(cliente)
    assert pistas(registro) == {'t-exp-ruta': pregunta}
    assert consolidadas(registro)['t-exp-ruta'] == f'{CORTO} [vaga]'


def test_la_pista_tras_agotar_el_seguimiento_es_la_siguiente_pregunta(cliente):
    entregar(cliente, t_exp_ruta=f'{CORTO} [vaga]', t_exp_espera=f'{CORTO} [falta:EJEMPLO]')
    responder(cliente, 't-exp-ruta', 'Porque sí [vaga]')
    responder(cliente, 't-exp-ruta', 'Sigo sin saber [falta:RAZON] [pregunta-invalida]')
    registro = consultar(cliente)
    # La siguiente pregunta de `t-exp-ruta` no pasó la validación: queda la repregunta base de RAZON.
    # `t-exp-espera` nunca recibió su pregunta: la pista es la de la entrega.
    assert pistas(registro) == {'t-exp-ruta': '¿Por qué lo piensas así?',
                                't-exp-espera': 'Sobre lo que contaste: ¿Podrías darme un ejemplo concreto?'}
    assert sin_claves_privadas(registro)


# --- Edición --------------------------------------------------------------------------------

def editar(cliente, cuenta='est-ana', esperado=200, actividad='t-expectativas', **textos):
    items = [{'item': item.replace('_', '-'), 'texto': texto} for item, texto in textos.items()]
    return pedir(cliente, 'POST', '/acciones/registro/editar', {**accion(cuenta, actividad), 'items': items},
                 esperado)


def eventos(respuesta):
    return [(e['tipo'], e['referencia']) for e in respuesta['eventos_registrados']]


def eventos_bd(sesion, tipo):
    return sesion.scalar(select(func.count()).select_from(m.EventoUso).where(m.EventoUso.tipo == tipo))


def pendiente(respuesta):
    return next(((r['item'], r['conversacion'][-1]['orden']) for r in respuesta['respuestas']
                 if r['estado'] == 'PENDIENTE_SEGUIMIENTO'), None)


def conversacion(registro, item):
    return [(mensaje['tipo'], mensaje['texto']) for r in registro['respuestas'] if r['item'] == item
            for mensaje in r['conversacion']]


def evaluador(aplicacion):
    return aplicacion.state.evaluador_respuestas


def respuesta_bd(sesion, item):
    respuesta = sesion.scalar(select(m.RespuestaRegistro).join(m.ItemRegistro).where(m.ItemRegistro.codigo == item))
    sesion.refresh(respuesta)
    return respuesta


def omitido(cliente):
    """Entrega con `t-exp-ruta` poco desarrollada y omite su pregunta: el registro queda cerrado por ampliar."""
    entregar(cliente, t_exp_ruta=f'{CORTO} [vaga]')
    return omitir(cliente, 't-exp-ruta')


def test_editar_un_item_poco_desarrollado_abre_seguimiento_y_al_quedar_adecuado_abre_la_mision(cliente, sesion):
    omitido(cliente)
    assert actividades(cliente)['t-adicional'] == 'BLOQUEADA'
    edicion = editar(cliente, t_exp_ruta='Quiero estudiar en un instituto [vaga]')
    assert pendiente(edicion) == ('t-exp-ruta', 1) and edicion['estado'] == 'COMPLETADA'
    assert 'items_por_ampliar' not in edicion and eventos(edicion) == []
    cierre = responder(cliente, 't-exp-ruta', 'Porque me gusta la práctica')
    assert eventos(cierre) == [('RESPUESTA_REFLEXIVA', None), ('REGISTRO_ADECUADO', 't-expectativas')]
    assert cierre['items_por_ampliar'] == []
    assert actividades(cliente)['t-adicional'] == 'DISPONIBLE'
    respuesta = respuesta_bd(sesion, 't-exp-ruta')
    assert respuesta.intento == 2 and respuesta.clasificacion_inicial == 'POCO_DESARROLLADA'
    assert respuesta.texto_inicial == 'Quiero estudiar en un instituto [vaga]'
    assert respuesta.texto_consolidado == 'Quiero estudiar en un instituto [vaga]\n\nPorque me gusta la práctica'
    assert sin_claves_privadas(cierre) and 'consolidad' not in str(cierre)
    # Una segunda edición que vuelve a pasar por un turno no repite ninguno de los dos eventos.
    editar(cliente, t_exp_ruta='Otra idea [vaga]')
    assert eventos(responder(cliente, 't-exp-ruta', 'Porque sí me convence')) == []
    assert eventos_bd(sesion, 'RESPUESTA_REFLEXIVA') == 1 and eventos_bd(sesion, 'REGISTRO_ADECUADO') == 1


def test_editar_no_vuelve_a_completar_y_adecuada_sin_seguimiento_no_es_reflexiva(cliente, aplicacion):
    omitido(cliente)
    edicion = editar(cliente, t_exp_ruta='Ahora sí lo pienso bien')
    assert eventos(edicion) == [('REGISTRO_ADECUADO', 't-expectativas')]
    assert evaluador(aplicacion).llamadas_seguimiento == 0
    assert consultar(cliente)['items_por_ampliar'] == []


def test_los_items_no_modificados_o_identicos_no_van_al_evaluador(cliente, aplicacion):
    omitido(cliente)
    falso = evaluador(aplicacion)
    antes = falso.llamadas_entrega
    editar(cliente, t_exp_ruta='Ahora sí lo pienso bien', t_exp_apoyo=ADECUADO)
    assert falso.llamadas_entrega == antes + 1
    assert [i.item for i in falso.contextos[-1].items] == ['t-exp-ruta']
    editar(cliente, t_exp_apoyo=ADECUADO, esperado=422)  # Sin cambios.
    assert falso.llamadas_entrega == antes + 1


def test_el_tope_de_preguntas_cuenta_por_intento(cliente, aplicacion):
    entregar(cliente, t_exp_ruta=f'{CORTO} [vaga]')
    responder(cliente, 't-exp-ruta', 'Porque sí [vaga]')
    assert pendiente(responder(cliente, 't-exp-ruta', 'Sigo sin saber [vaga]')) is None
    assert pendiente(editar(cliente, t_exp_ruta='Nueva idea [vaga]')) == ('t-exp-ruta', 1)
    assert pendiente(responder(cliente, 't-exp-ruta', 'Tampoco [vaga]')) == ('t-exp-ruta', 2)
    final = responder(cliente, 't-exp-ruta', 'Nada [vaga]')
    assert pendiente(final) is None and list(pistas(final)) == ['t-exp-ruta']
    assert evaluador(aplicacion).llamadas_seguimiento == 4


def test_el_get_muestra_solo_los_turnos_del_intento_vigente(cliente, sesion):
    omitido(cliente)
    editar(cliente, t_exp_ruta='Nueva idea [vaga]')
    responder(cliente, 't-exp-ruta', 'Porque me gusta [vaga]')
    registro = consultar(cliente)
    ruta = conversacion(registro, 't-exp-ruta')
    assert [tipo for tipo, _ in ruta] == ['respuesta', 'pregunta', 'respuesta', 'pregunta']
    assert ruta[0] == ('respuesta', 'Nueva idea [vaga]')
    assert conversacion(registro, 't-exp-apoyo') == [('respuesta', ADECUADO)]
    assert sesion.scalars(select(m.TurnoSeguimiento.intento).order_by(m.TurnoSeguimiento.id)).all() == [1, 2, 2]


def test_la_pista_tras_editar_es_la_pregunta_de_la_edicion(cliente):
    omitido(cliente)
    editar(cliente, t_exp_ruta='Nueva idea [falta:RAZON] [pregunta-invalida]')
    cierre = omitir(cliente, 't-exp-ruta')
    assert pistas(cierre) == pistas(consultar(cliente)) == {'t-exp-ruta': '¿Por qué lo piensas así?'}


def test_un_item_adecuado_editado_a_poco_desarrollado_vuelve_a_ampliar_sin_quitar_la_mision(cliente):
    entregar(cliente)
    assert actividades(cliente)['t-adicional'] == 'DISPONIBLE'
    editar(cliente, t_exp_apoyo=f'{CORTO} [vaga]')
    cierre = omitir(cliente, 't-exp-apoyo')
    assert list(pistas(cierre)) == ['t-exp-apoyo'] and eventos(cierre) == []
    assert consolidadas(consultar(cliente))['t-exp-apoyo'] == f'{CORTO} [vaga]'
    assert actividades(cliente)['t-adicional'] == 'DISPONIBLE'


def test_editar_con_el_evaluador_caido_usa_el_respaldo(cliente, sesion):
    omitido(cliente)
    largo = editar(cliente, t_exp_ruta='DATO DE PRUEBA: una respuesta larga que el respaldo deja sin evaluar [falla]')
    assert pendiente(largo) is None and largo['items_por_ampliar'] == []
    assert respuesta_bd(sesion, 't-exp-ruta').texto_consolidado.endswith('[falla]')
    assert pendiente(editar(cliente, t_exp_ruta='Corto [falla]')) == ('t-exp-ruta', 1)


def test_item_sin_criterios_se_edita_sin_llamar_al_evaluador(cliente, aplicacion):
    avanzar(cliente, 't-cierre-inicio')
    valores = [{'codigo': c} for c in ('SERVIR', 'CREAR', 'LIBERTAD')]
    for item, opciones in (('t-val-orden', valores), ('t-val-libre', []), ('t-val-breve', [])):
        pedir(cliente, 'POST', '/acciones/registro/guardar-borrador',
              {**accion(actividad='t-valores'), 'item': item, 'texto': ADECUADO, 'opciones': opciones})
    pedir(cliente, 'POST', '/acciones/registro/entregar', accion(actividad='t-valores'))
    falso = evaluador(aplicacion)
    antes = falso.llamadas_entrega
    edicion = editar(cliente, actividad='t-valores', t_val_breve='Muy corto')
    assert falso.llamadas_entrega == antes
    assert pendiente(edicion) == ('t-val-breve', 1)


def test_editar_exige_registro_cerrado_y_entrada_valida(cliente):
    entregar(cliente, t_exp_ruta=f'{CORTO} [vaga]')
    editar(cliente, t_exp_apoyo='Otro texto', esperado=409)  # Seguimiento pendiente.
    omitir(cliente, 't-exp-ruta')
    pedir(cliente, 'POST', '/acciones/registro/editar', {**accion(), 'items': []}, 422)
    editar(cliente, t_exp_ruta='   ', esperado=422)
    editar(cliente, t_val_libre='Ajeno', esperado=422)
    pedir(cliente, 'POST', '/acciones/registro/editar', {**accion(), 'items': [
        {'item': 't-exp-ruta', 'texto': 'Uno'}, {'item': 't-exp-ruta', 'texto': 'Dos'}]}, 422)
    editar(cliente, cuenta='apo-rosa', t_exp_ruta='Texto', esperado=404)


def test_editar_antes_de_cerrar_responde_409(cliente):
    avanzar(cliente, 't-cierre-inicio')
    editar(cliente, t_exp_ruta='Texto', esperado=409)


def test_otra_cuenta_no_ve_ni_edita_lo_ajeno(cliente):
    omitido(cliente)
    luis = consultar(cliente, cuenta='est-luis')
    assert luis['respuestas'] == [] and 'items_por_ampliar' not in luis
    editar(cliente, cuenta='est-luis', t_exp_ruta='Texto', esperado=409)


# --- Editar la elección (F02) ---------------------------------------------------------------

def editar_con(cliente, item, texto, opciones, esperado=200):
    return pedir(cliente, 'POST', '/acciones/registro/editar',
                 {**accion(), 'items': [{'item': item, 'texto': texto, 'opciones': opciones}]}, esperado)


def evaluaciones_bd(sesion, item):
    return sesion.execute(select(m.EvaluacionRespuesta.texto_evaluado, m.EvaluacionRespuesta.opciones_evaluadas)
                          .join(m.RespuestaRegistro).join(m.ItemRegistro).where(m.ItemRegistro.codigo == item)
                          .order_by(m.EvaluacionRespuesta.numero)).all()


def test_editar_la_eleccion_la_cambia_y_el_historial_guarda_la_que_vio_cada_evaluacion(cliente, sesion, aplicacion):
    entregar(cliente)
    falso = evaluador(aplicacion)
    antes = len(falso.contextos)
    nueva = [{'codigo': 'UNIVERSIDAD'}, {'codigo': 'OTRA', 'texto': 'DATO DE PRUEBA: viajar un año'}]
    edicion = editar_con(cliente, 't-exp-ruta', 'DATO DE PRUEBA: ahora quiero la universidad [vaga]', nueva)
    assert next(r for r in edicion['respuestas'] if r['item'] == 't-exp-ruta')['opciones_elegidas'] == nueva
    # Pasa por el seguimiento y el evaluador ve la elección nueva.
    assert pendiente(edicion) == ('t-exp-ruta', 1)
    assert falso.contextos[antes].items[0].opciones_elegidas == ('Estudiar en una universidad', 'DATO DE PRUEBA: viajar un año')
    responder(cliente, 't-exp-ruta', 'Porque quiero investigar')
    assert respuesta_bd(sesion, 't-exp-ruta').opciones_elegidas == nueva
    assert [opciones for _, opciones in evaluaciones_bd(sesion, 't-exp-ruta')] == [
        [{'codigo': 'INSTITUTO'}], nueva, nueva]
    # La referencia ELECCION de t-eco cita la elección vigente.
    eco = pedir(cliente, 'GET', '/cuentas/est-ana/actividades/t-eco/referencias')['referencias']
    assert next(r for r in eco if r['codigo'] == 't-ref-rutas')['opciones'][0]['codigo'] == 'UNIVERSIDAD'


def test_cambiar_la_eleccion_exige_reescribir_y_se_valida_contra_la_lista(cliente):
    entregar(cliente)
    original = consolidadas(consultar(cliente))['t-exp-ruta']
    editar_con(cliente, 't-exp-ruta', original, [{'codigo': 'TRABAJAR'}], 422)
    for opciones in ([], [{'codigo': 'NADA'}], [{'codigo': 'OTRA'}],
                     [{'codigo': 'UNIVERSIDAD'}, {'codigo': 'INSTITUTO'}, {'codigo': 'TRABAJAR'}]):
        editar_con(cliente, 't-exp-ruta', 'DATO DE PRUEBA: otro texto', opciones, 422)
    editar_con(cliente, 't-exp-espera', 'DATO DE PRUEBA: otro texto', [{'codigo': 'UNIVERSIDAD'}], 422)
    # La misma elección con el mismo texto no es un cambio; sin `opciones`, la elección se conserva.
    editar_con(cliente, 't-exp-ruta', original, [{'codigo': 'INSTITUTO'}], 422)
    edicion = editar(cliente, t_exp_ruta='DATO DE PRUEBA: solo cambio el texto')
    assert next(r for r in edicion['respuestas'] if r['item'] == 't-exp-ruta')['opciones_elegidas'] == [
        {'codigo': 'INSTITUTO'}]
