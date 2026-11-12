"""Ajuste cartas-diario: la carta adaptada (dato de prueba `t-diario-personal`, sobre `t-exp-ruta`) y la pregunta del
día, sin LLM."""

from datetime import date, datetime, timedelta

from sqlalchemy import select

from app import models as m
from app.core.contexto import usar_contexto
from app.models.enums import EstadoRespuestaRegistro
from app.services.diario.cartas import armar_carta
from app.services.registro.acciones import guardar_intento
from soporte_ruta import avanzar, completar, pedir


PERSONAL = 't-diario-personal'
RESPALDO = '¿Cómo te sientes con lo que esperas de este camino?'


def elegir(aplicacion, opciones, cuenta='est-ana', item='t-exp-ruta', **columnas):
    """DATO DE PRUEBA: intento vigente de `item` con esas opciones marcadas (códigos, o (código, texto) para una
    «Otra»), escrito directamente."""
    elegidas = [{'codigo': o[0], 'texto': o[1]} if isinstance(o, tuple) else {'codigo': o} for o in opciones]
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        cuenta_id = sesion.scalar(select(m.Cuenta.id).where(m.Cuenta.codigo == cuenta))
        item_id, actividad_id = sesion.execute(select(m.ItemRegistro.id, m.ItemRegistro.actividad_id).where(
            m.ItemRegistro.codigo == item)).one()
        progreso_id = sesion.scalar(select(m.ProgresoActividad.id).where(
            m.ProgresoActividad.cuenta_id == cuenta_id, m.ProgresoActividad.actividad_id == actividad_id))
        if progreso_id is None:
            progreso = m.ProgresoActividad(cuenta_id=cuenta_id, actividad_id=actividad_id,
                                           estado=m.EstadoProgreso.EN_CURSO)
            sesion.add(progreso)
            sesion.flush()
            progreso_id = progreso.id
        guardar_intento(sesion, progreso_id, item_id, dict(
            opciones_elegidas=elegidas, primera_respuesta='DATO DE PRUEBA',
            **({'estado': EstadoRespuestaRegistro.CERRADO, 'tipo_final': 'propio'} | columnas)), datetime(2026, 10, 7, 10))


def desbloquear(cliente):
    avanzar(cliente, 't-cierre-inicio')
    return pedir(cliente, 'POST', '/eventos',
                 {'cuenta': 'est-ana', 'tipo': 'COMPLETA_ACTIVIDAD', 'referencia': 't-expectativas'})


def carta(sesion):
    sesion.expire_all()
    return sesion.scalar(select(m.Recomendacion).join(
        m.PreguntaDiario, m.PreguntaDiario.id == m.Recomendacion.pregunta_diario_id).where(
        m.PreguntaDiario.codigo == PERSONAL))


def test_la_variante_que_cumple_llega_armada_y_guarda_su_codigo(cliente, sesion, aplicacion):
    elegir(aplicacion, ['EMPRENDER'])
    respuesta = desbloquear(cliente)
    texto = 'DATO DE PRUEBA: quieres emprender. ¿Cómo te sientes con eso?'
    assert respuesta['entradas_desbloqueadas'] == [{'codigo': PERSONAL, 'nombre': 'Lo que espero', 'texto': texto}]
    assert (carta(sesion).texto, carta(sesion).variante) == (texto, 'EMPRENDER')


def test_la_otra_variante_llena_el_hueco_con_la_tabla_de_nombres(cliente, sesion, aplicacion):
    elegir(aplicacion, ['UNIVERSIDAD', 'TRABAJAR'])
    desbloquear(cliente)
    assert (carta(sesion).texto, carta(sesion).variante) == (
        'DATO DE PRUEBA: pensaste en la universidad. ¿Cómo te sientes con eso?', 'OTRA_RUTA')


def test_sin_eleccion_ninguna_variante_cumple_y_va_el_respaldo(cliente, sesion):
    desbloquear(cliente)
    assert (carta(sesion).texto, carta(sesion).variante) == (RESPALDO, None)


def test_un_hueco_sin_valor_lleva_al_respaldo(cliente, sesion, aplicacion):
    # Una «Otra» cumple OTRA_RUTA, pero no está en la tabla de nombres.
    elegir(aplicacion, [('OTRA', 'DATO DE PRUEBA: viajar')])
    desbloquear(cliente)
    assert (carta(sesion).texto, carta(sesion).variante) == (RESPALDO, None)


def test_un_item_sensible_o_emocional_lleva_al_respaldo(cliente, sesion, aplicacion):
    elegir(aplicacion, ['EMPRENDER'], sensible=True)
    desbloquear(cliente)
    assert (carta(sesion).texto, carta(sesion).variante) == (RESPALDO, None)


def test_un_item_emocional_lleva_al_respaldo(cliente, sesion, aplicacion):
    elegir(aplicacion, ['EMPRENDER'], tipo_final='emocional')
    desbloquear(cliente)
    assert (carta(sesion).texto, carta(sesion).variante) == (RESPALDO, None)


def test_un_item_sin_evaluar_no_lleva_al_respaldo(cliente, sesion, aplicacion):
    elegir(aplicacion, ['EMPRENDER'], tipo_final=None, estado=EstadoRespuestaRegistro.SIN_EVALUAR)
    desbloquear(cliente)
    assert carta(sesion).variante == 'EMPRENDER'


def test_editar_despues_el_registro_no_cambia_la_carta(cliente, sesion, aplicacion):
    elegir(aplicacion, ['EMPRENDER'])
    desbloquear(cliente)
    antes = carta(sesion).texto
    elegir(aplicacion, ['UNIVERSIDAD'])
    pedir(cliente, 'POST', '/eventos', {'cuenta': 'est-ana', 'tipo': 'COMPLETA_ACTIVIDAD', 'referencia': 't-expectativas'})
    assert carta(sesion).texto == antes
    assert pedir(cliente, 'GET', '/cuentas/est-ana/diario/preguntas')[1]['texto'] == antes


@usar_contexto
def _armar(sesion, variantes):
    cuenta = sesion.scalar(select(m.Cuenta).where(m.Cuenta.codigo == 'est-ana'))
    return armar_carta(sesion, cuenta, m.PreguntaDiario(codigo='x', nombre='x', pregunta='Respaldo', variantes=variantes))


def armar(aplicacion, variantes):
    with aplicacion.state.fabrica_sesiones() as sesion:
        return _armar(sesion, variantes)


def test_gana_la_primera_variante_que_cumple(aplicacion):
    elegir(aplicacion, ['UNIVERSIDAD'])
    condicion = {'tipo': 'ELIGIO', 'item': 't-exp-ruta', 'opciones': ['UNIVERSIDAD']}
    variantes = {'huecos': {}, 'variantes': [{'codigo': 'PRIMERA', 'condiciones': [condicion], 'texto': 'Uno'},
                                             {'codigo': 'SEGUNDA', 'condiciones': [condicion], 'texto': 'Dos'}]}
    assert armar(aplicacion, variantes) == ('Uno', 'PRIMERA')


def test_un_marcador_sale_de_lo_guardado_al_responder(aplicacion):
    elegir(aplicacion, ['UNIVERSIDAD'], valores_contexto={'marcadores': {'primera': 'organizar'}})
    variantes = {'huecos': {'primera': {'tipo': 'MARCADOR', 'item': 't-exp-ruta', 'marcador': 'primera'},
                            'otro': {'tipo': 'MARCADOR', 'item': 't-exp-ruta', 'marcador': 'otro'}},
                 'variantes': [{'codigo': 'CON', 'texto': 'Te sale {primera}.', 'condiciones': [
                     {'tipo': 'ELIGIO', 'item': 't-exp-ruta', 'opciones': ['UNIVERSIDAD']}]}]}
    assert armar(aplicacion, variantes) == ('Te sale organizar.', 'CON')
    variantes['variantes'][0]['texto'] = 'Te sale {otro}.'
    assert armar(aplicacion, variantes) == ('Respaldo', None)


def test_sin_plan_a_no_se_cumple_ninguna_opcion_inicial(aplicacion):
    variantes = {'huecos': {}, 'variantes': [
        {'codigo': valor, 'texto': valor, 'condiciones': [{'tipo': 'OPCION_INICIAL', 'valor': valor}]}
        for valor in ('MISMA', 'OTRA', 'SIN_OPCION')]}
    assert armar(aplicacion, variantes) == ('Respaldo', None)


# --- Pregunta del día ------------------------------------------------------------------------

def del_dia(cliente, dia=7, cuenta='est-ana', esperado=200):
    return pedir(cliente, 'POST', '/acciones/diario/pregunta-del-dia',
                 {'cuenta': cuenta, 'fecha_hora': f'2026-10-{dia:02d}T09:00:00'}, esperado)


def recomendaciones(sesion, tipo):
    sesion.expire_all()
    return sesion.scalars(select(m.Recomendacion).where(m.Recomendacion.tipo == tipo).order_by(m.Recomendacion.id)).all()


def test_pregunta_del_dia_una_por_vigencia_y_la_vencida_no_se_responde(cliente, sesion):
    completar(cliente, 't-inicio')
    primera = del_dia(cliente, 7)
    assert primera['fecha'] == '2026-10-07' and primera['respondida'] is False
    assert del_dia(cliente, 7) == primera
    assert len(recomendaciones(sesion, 'DIARIA')) == 1
    pedir(cliente, 'POST', '/acciones/escribir-entrada',
          {'cuenta': 'est-ana', 'del_dia': True, 'texto': 'Ayer', 'fecha_hora': '2026-10-08T09:00:00'}, 409)
    pedir(cliente, 'POST', '/acciones/escribir-entrada',
          {'cuenta': 'est-ana', 'del_dia': True, 'texto': 'Hoy', 'fecha_hora': '2026-10-07T20:00:00'})
    assert del_dia(cliente, 7)['respondida'] is True
    pedir(cliente, 'POST', '/acciones/escribir-entrada',
          {'cuenta': 'est-ana', 'del_dia': True, 'texto': 'Otra vez', 'fecha_hora': '2026-10-07T21:00:00'}, 409)
    segunda = del_dia(cliente, 8)
    assert segunda['fecha'] == '2026-10-08' and segunda['respondida'] is False
    entrada = pedir(cliente, 'GET', '/cuentas/est-ana/diario/entradas')[0]
    assert (entrada['origen'], entrada['pregunta']) == ('RECOMENDACION_DIA', primera['texto'])


def test_pregunta_del_dia_exige_el_diario_y_es_solo_de_estudiantes(cliente):
    del_dia(cliente, esperado=409)
    del_dia(cliente, cuenta='apo-rosa', esperado=409)


def test_la_pregunta_del_dia_guarda_su_texto(cliente, sesion):
    completar(cliente, 't-inicio')
    hoy = del_dia(cliente, 7)
    [recomendacion] = recomendaciones(sesion, 'DIARIA')
    pregunta = sesion.get(m.PreguntaDiario, recomendacion.pregunta_diario_id)
    assert hoy['texto'] == recomendacion.texto == pregunta.pregunta and recomendacion.variante is None


def test_no_existe_abrir_pregunta(cliente):
    completar(cliente, 't-inicio')
    pedir(cliente, 'POST', '/acciones/diario/abrir-pregunta', {'cuenta': 'est-ana', 'codigo': 't-diario-fija'}, 404)


def sembrar_partida(sesion, puntajes):
    """DATO DE PRUEBA: resultado de partida con el promedio indicado por dimensión."""
    cuenta = sesion.scalar(select(m.Cuenta).where(m.Cuenta.codigo == 'est-ana'))
    aplicacion = sesion.scalar(select(m.Aplicacion).where(m.Aplicacion.codigo == 'APL-PARTIDA'))
    resultado = m.ResultadoInstrumento(cuenta_id=cuenta.id, aplicacion_id=aplicacion.id, calculado_en=datetime(2026, 10, 1))
    sesion.add(resultado)
    sesion.flush()
    for codigo, promedio in puntajes.items():
        dimension = sesion.scalar(select(m.Dimension).where(m.Dimension.codigo == codigo))
        items = len(sesion.scalars(select(m.ItemInstrumento.id).where(m.ItemInstrumento.dimension_id == dimension.id)).all())
        sesion.add(m.ResultadoDimension(resultado_id=resultado.id, dimension_id=dimension.id, puntaje=promedio * items,
                                        puntaje_maximo=4 * items))
    sesion.commit()


def sorteadas(sesion, cliente, dias):
    for dia in range(1, dias + 1):
        fecha = (date(2026, 10, 1) + timedelta(days=dia)).isoformat()
        pedir(cliente, 'POST', '/acciones/diario/pregunta-del-dia', {'cuenta': 'est-ana', 'fecha_hora': f'{fecha}T09:00:00'})
    preguntas = {p.id: p for p in sesion.scalars(select(m.PreguntaDiario))}
    dimensiones = {d.id: d.codigo for d in sesion.scalars(select(m.Dimension))}
    return [(preguntas[r.pregunta_diario_id].codigo, dimensiones.get(preguntas[r.pregunta_diario_id].dimension_id))
            for r in recomendaciones(sesion, 'DIARIA')]


def test_la_dimension_mas_baja_sale_mas_seguido(cliente, sesion, monkeypatch):
    monkeypatch.setattr('app.services.diario.acciones.N_SIN_REPETIR_DIARIA', 0)
    completar(cliente, 't-inicio')
    sembrar_partida(sesion, {f'AUTO-{c}': 4 for c in 'ABCDE'} | {'AUTO-A': 1})
    dimensiones = [dimension for _, dimension in sorteadas(sesion, cliente, 40)]
    assert dimensiones.count('AUTO-A') > dimensiones.count('AUTO-B') + dimensiones.count(None)


def test_no_repite_hasta_agotar_el_pool(cliente, sesion):
    completar(cliente, 't-inicio')
    pool = len(sesion.scalars(select(m.PreguntaDiario.id).where(m.PreguntaDiario.uso == m.UsoPreguntaDiario.DIARIA)).all())
    codigos = [codigo for codigo, _ in sorteadas(sesion, cliente, pool + 3)]
    assert len(set(codigos[:pool])) == pool
    # Agotado el pool, se vuelve a sortear entre todas.
    assert set(codigos[pool:]) <= set(codigos[:pool])
