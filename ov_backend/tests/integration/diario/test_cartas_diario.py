"""Ajuste del diario (F05): campos de las cartas, archivo, remitente y cierre de la pregunta del día."""

from sqlalchemy import select

from app import models as m
from soporte_ruta import FECHA, avanzar, completar, pedir


def escribir(cliente, esperado=200, **datos):
    return pedir(cliente, 'POST', '/acciones/escribir-entrada',
                 {'cuenta': 'est-ana', 'fecha_hora': FECHA, 'texto': 'DATO DE PRUEBA', **datos}, esperado)


def cartas(cliente):
    return {p['codigo']: p for p in pedir(cliente, 'GET', '/cuentas/est-ana/diario/preguntas')}


def accion(cliente, nombre, codigo, esperado=200):
    return pedir(cliente, 'POST', f'/acciones/diario/{nombre}-pregunta',
                 {'cuenta': 'est-ana', 'codigo': codigo, 'fecha_hora': FECHA}, esperado)


def del_dia(cliente):
    return pedir(cliente, 'POST', '/acciones/diario/pregunta-del-dia', {'cuenta': 'est-ana', 'fecha_hora': FECHA})


def test_la_carta_recibida_trae_fecha_texto_bandeja_y_remitente(cliente):
    completar(cliente, 't-inicio')
    fija = cartas(cliente)['t-diario-fija']
    assert {k: fija[k] for k in ('recibida_en', 'texto', 'entrada', 'respondida_en', 'bandeja', 'archivada_en')} == {
        'recibida_en': FECHA, 'texto': '¿Qué te gustaría descubrir de ti en este camino?', 'entrada': None,
        'respondida_en': None, 'bandeja': 'PENDIENTE', 'archivada_en': None}
    assert fija['actividad'] == {'codigo': 't-inicio', 'titulo': 'Inicio de prueba'}
    escribir(cliente, pregunta='t-diario-fija')
    fija = cartas(cliente)['t-diario-fija']
    assert (fija['entrada'], fija['respondida_en'], fija['bandeja']) == (1, FECHA, 'RESPONDIDA')
    # Antes de recibirla, todo va en nulo.
    personal = cartas(cliente)['t-diario-personal']
    assert personal['estado'] == 'BLOQUEADA'
    assert all(personal[k] is None for k in ('recibida_en', 'texto', 'entrada', 'bandeja', 'actividad'))


def test_la_personalizada_no_trae_texto_hasta_redactarse(cliente):
    avanzar(cliente)
    personal = cartas(cliente)['t-diario-personal']
    assert (personal['redactada'], personal['texto'], personal['bandeja']) == (False, None, 'PENDIENTE')
    assert personal['actividad'] == {'codigo': 't-expectativas', 'titulo': 'Registro de expectativas'}
    # Sin redactar no se archiva; una vez abierta, sí.
    accion(cliente, 'archivar', 't-diario-personal', 409)
    pedir(cliente, 'POST', '/acciones/diario/abrir-pregunta', {'cuenta': 'est-ana', 'codigo': 't-diario-personal'})
    assert cartas(cliente)['t-diario-personal']['texto']
    assert accion(cliente, 'archivar', 't-diario-personal')['bandeja'] == 'ARCHIVADA'


def test_archivar_y_desarchivar(cliente):
    completar(cliente, 't-inicio')
    archivada = accion(cliente, 'archivar', 't-diario-fija')
    assert (archivada['bandeja'], archivada['archivada_en']) == ('ARCHIVADA', FECHA)
    accion(cliente, 'archivar', 't-diario-fija', 409)
    escribir(cliente, pregunta='t-diario-fija', esperado=409)
    devuelta = accion(cliente, 'desarchivar', 't-diario-fija')
    assert (devuelta['bandeja'], devuelta['archivada_en']) == ('PENDIENTE', None)
    accion(cliente, 'desarchivar', 't-diario-fija', 409)
    escribir(cliente, pregunta='t-diario-fija')
    # Respondida, ya no se archiva; una que aún no llegó, tampoco.
    accion(cliente, 'archivar', 't-diario-fija', 409)
    accion(cliente, 'archivar', 't-diario-personal', 409)


def test_borrar_la_del_dia_la_cierra(cliente):
    completar(cliente, 't-inicio')
    abierta = del_dia(cliente)
    assert abierta['cerrada'] is False
    escribir(cliente, del_dia=True)
    [entrada] = pedir(cliente, 'GET', '/cuentas/est-ana/diario/entradas')
    pedir(cliente, 'POST', '/acciones/borrar-entrada', {'cuenta': 'est-ana', 'numero': entrada['numero']})
    cerrada = del_dia(cliente)
    assert (cerrada['texto'], cerrada['respondida'], cerrada['cerrada']) == (abierta['texto'], False, True)
    escribir(cliente, del_dia=True, esperado=409)
    # Las diarias cerradas no aparecen en ningún buzón: el listado solo trae cartas DESBLOQUEABLE.
    assert set(cartas(cliente)) == {'t-diario-fija', 't-diario-personal', 't-diario-tras-conversar'}


def test_una_diaria_no_se_archiva_ni_desarchiva(cliente, sesion):
    completar(cliente, 't-inicio')
    del_dia(cliente)
    codigo = sesion.scalar(select(m.PreguntaDiario.codigo).join(
        m.Recomendacion, m.Recomendacion.pregunta_diario_id == m.PreguntaDiario.id).where(
        m.Recomendacion.tipo == m.TipoRecomendacion.DIARIA))
    accion(cliente, 'desarchivar', codigo, 409)
    accion(cliente, 'archivar', codigo, 409)
