"""B09: entradas del diario (HU-028, 029, 031, 032), amistad (HU-033) y check-ins (HU-035, 036)."""

from datetime import datetime, timedelta

from sqlalchemy import func, select

from app import models as m
from app.core.parametros import TOPE_ENTRADAS_AMISTAD_DIA, UMBRALES_AMISTAD
from app.dependencies import obtener_ahora
from soporte_ruta import FECHA, avanzar, completar, eventos, pedir


def escribir(cliente, cuenta='est-ana', esperado=200, **datos):
    return pedir(cliente, 'POST', '/acciones/escribir-entrada',
                 {'cuenta': cuenta, 'fecha_hora': FECHA, 'texto': 'DATO DE PRUEBA', **datos}, esperado)


def entradas(cliente, cuenta='est-ana'):
    return pedir(cliente, 'GET', f'/cuentas/{cuenta}/diario/entradas')


def amistad(cliente, cuenta='est-ana'):
    return pedir(cliente, 'GET', f'/cuentas/{cuenta}/diario/amistad')


def test_la_fija_llega_con_texto_en_la_respuesta_de_completar_y_se_responde_una_vez(cliente):
    respuesta = completar(cliente, 't-inicio')
    assert respuesta['entradas_desbloqueadas'] == [{
        'codigo': 't-diario-fija', 'nombre': 'Mi primer paso', 'personalizada': False,
        'texto': '¿Qué te gustaría descubrir de ti en este camino?'}]
    escribir(cliente, pregunta='t-diario-fija', texto='Quiero saber qué me gusta.')
    escribir(cliente, pregunta='t-diario-fija', esperado=409)
    # La personalizada aún no está en el diario.
    escribir(cliente, pregunta='t-diario-personal', esperado=409)
    [entrada] = entradas(cliente)
    assert entrada == {'numero': 1, 'origen': 'GUIADA', 'titulo': None,
                       'titulo_mostrado': '¿Qué te gustaría descubrir de ti en este camino?',
                       'pregunta': '¿Qué te gustaría descubrir de ti en este camino?',
                       'texto': 'Quiero saber qué me gusta.', 'fecha_hora': FECHA, 'actualizada_en': None}
    [fija, *_] = pedir(cliente, 'GET', '/cuentas/est-ana/diario/preguntas')
    assert fija['respondida'] is True


def test_las_acciones_sin_preguntas_no_traen_entradas_desbloqueadas(cliente):
    completar(cliente, 't-inicio')
    assert 'entradas_desbloqueadas' not in completar(cliente, 't-partida')


def test_titulos_mostrados_y_numeros_estables_tras_borrar(cliente):
    completar(cliente, 't-inicio')
    escribir(cliente, texto='Primera libre')
    escribir(cliente, texto='Segunda libre')
    escribir(cliente, titulo='Mi día', texto='Con título')
    escribir(cliente, pregunta='t-diario-fija', titulo='Lo que busco')
    por_numero = {e['numero']: e['titulo_mostrado'] for e in entradas(cliente)}
    assert por_numero == {1: 'Entrada libre 1', 2: 'Entrada libre 2', 3: 'Mi día', 4: 'Lo que busco'}
    pedir(cliente, 'POST', '/acciones/borrar-entrada', {'cuenta': 'est-ana', 'numero': 1})
    escribir(cliente, texto='Otra libre')
    por_numero = {e['numero']: e['titulo_mostrado'] for e in entradas(cliente)}
    assert por_numero == {2: 'Entrada libre 2', 3: 'Mi día', 4: 'Lo que busco', 5: 'Entrada libre 4'}


def test_editar_cambia_titulo_y_texto_sin_eventos_ni_bajar_la_amistad(cliente):
    completar(cliente, 't-inicio')
    escribir(cliente, pregunta='t-diario-fija', texto='Antes')
    antes, eventos_antes = amistad(cliente), len(eventos(cliente))
    respuesta = pedir(cliente, 'POST', '/acciones/editar-entrada', {
        'cuenta': 'est-ana', 'numero': 1, 'titulo': 'Nuevo título', 'texto': 'Después',
        'fecha_hora': '2026-11-01T09:00:00'})
    assert respuesta == {'eventos_registrados': [], 'nuevos_desbloqueos': []}
    [entrada] = entradas(cliente)
    assert (entrada['titulo'], entrada['texto'], entrada['actualizada_en']) == (
        'Nuevo título', 'Después', '2026-11-01T09:00:00')
    assert entrada['pregunta'] == '¿Qué te gustaría descubrir de ti en este camino?'
    # Sin `titulo`, el título se conserva.
    pedir(cliente, 'POST', '/acciones/editar-entrada', {'cuenta': 'est-ana', 'numero': 1, 'texto': 'Otra vez'})
    assert entradas(cliente)[0]['titulo'] == 'Nuevo título'
    assert amistad(cliente) == antes and len(eventos(cliente)) == eventos_antes


def test_borrar_archiva_la_carta_y_no_baja_la_amistad(cliente):
    # Ajuste del diario (F05, autorizado por la spec): la carta borrada queda archivada, no por responder.
    completar(cliente, 't-inicio')
    escribir(cliente, pregunta='t-diario-fija')
    antes = amistad(cliente)
    pedir(cliente, 'POST', '/acciones/borrar-entrada', {'cuenta': 'est-ana', 'numero': 1})
    assert entradas(cliente) == []
    fija = pedir(cliente, 'GET', '/cuentas/est-ana/diario/preguntas')[0]
    assert (fija['respondida'], fija['bandeja']) == (False, 'ARCHIVADA')
    assert amistad(cliente) == antes
    escribir(cliente, pregunta='t-diario-fija', esperado=409)
    pedir(cliente, 'POST', '/acciones/diario/desarchivar-pregunta', {'cuenta': 'est-ana', 'codigo': 't-diario-fija'})
    escribir(cliente, pregunta='t-diario-fija')
    assert [e['numero'] for e in entradas(cliente)] == [2]


def test_solo_el_autor_edita_y_borra_sus_entradas(cliente):
    for cuenta in ('est-ana', 'est-luis'):
        completar(cliente, 't-inicio', cuenta)
    escribir(cliente, texto='De Ana')
    for accion, datos in (('editar-entrada', {'texto': 'Intruso'}), ('borrar-entrada', {})):
        pedir(cliente, 'POST', f'/acciones/{accion}', {'cuenta': 'est-luis', 'numero': 1, **datos}, 404)
    assert entradas(cliente, 'est-luis') == []
    assert [e['texto'] for e in entradas(cliente)] == ['De Ana']
    assert entradas(cliente, 'apo-rosa') == [] and entradas(cliente, 'ori-carmen') == []


def test_amistad_sube_con_cada_escritura_hasta_el_tope_diario(cliente):
    completar(cliente, 't-inicio')
    assert amistad(cliente) == {'puntos': 0, 'nivel': 0, 'siguiente_en': UMBRALES_AMISTAD[0]}
    for _ in range(TOPE_ENTRADAS_AMISTAD_DIA + 2):
        escribir(cliente)
    for numero in range(1, TOPE_ENTRADAS_AMISTAD_DIA + 3):
        pedir(cliente, 'POST', '/acciones/borrar-entrada', {'cuenta': 'est-ana', 'numero': numero})
    otro_dia = (datetime.fromisoformat(FECHA) + timedelta(days=1)).isoformat()
    escribir(cliente, fecha_hora=otro_dia)
    puntos = TOPE_ENTRADAS_AMISTAD_DIA + 1
    assert amistad(cliente) == {'puntos': puntos, 'nivel': sum(puntos >= u for u in UMBRALES_AMISTAD),
                                'siguiente_en': next(u for u in UMBRALES_AMISTAD if u > puntos)}


def test_check_in_uno_por_dia_y_su_evolucion(cliente):
    respuesta = cliente.get('/cuentas/est-ana/check-ins')
    assert respuesta.status_code == 409
    avanzar(cliente, 't-cierre-inicio')
    for dia, nivel in ((3, 4), (1, 2), (2, 3)):
        pedir(cliente, 'POST', '/acciones/check-in',
              {'cuenta': 'est-ana', 'nivel_seguridad': nivel, 'fecha_hora': f'2026-10-0{dia}T08:00:00'})
    # Ajuste del panel (F05): el segundo del mismo día sobrescribe el nivel; sigue uno por día.
    pedir(cliente, 'POST', '/acciones/check-in',
          {'cuenta': 'est-ana', 'nivel_seguridad': 5, 'fecha_hora': '2026-10-01T20:00:00'})
    assert pedir(cliente, 'GET', '/cuentas/est-ana/check-ins') == {'dias_registrados': 3, 'registrado_hoy': False, 'check_ins': [
        {'fecha': '2026-10-01', 'nivel_seguridad': 5}, {'fecha': '2026-10-02', 'nivel_seguridad': 3},
        {'fecha': '2026-10-03', 'nivel_seguridad': 4}]}
    assert pedir(cliente, 'GET', '/cuentas/apo-rosa/check-ins') == {'dias_registrados': 0, 'registrado_hoy': False,
                                                                     'check_ins': []}


def test_check_in_registrado_hoy_usa_la_fecha_del_servidor(aplicacion, cliente):
    avanzar(cliente, 't-cierre-inicio')
    aplicacion.dependency_overrides[obtener_ahora] = lambda: datetime(2026, 10, 2, 23, 30)
    try:
        assert pedir(cliente, 'GET', '/cuentas/est-ana/check-ins')['registrado_hoy'] is False
        pedir(cliente, 'POST', '/acciones/check-in',
              {'cuenta': 'est-ana', 'nivel_seguridad': 4, 'fecha_hora': '2026-10-02T08:00:00'})
        assert pedir(cliente, 'GET', '/cuentas/est-ana/check-ins')['registrado_hoy'] is True
        aplicacion.dependency_overrides[obtener_ahora] = lambda: datetime(2026, 10, 3, 0, 5)
        assert pedir(cliente, 'GET', '/cuentas/est-ana/check-ins')['registrado_hoy'] is False
    finally:
        aplicacion.dependency_overrides.pop(obtener_ahora, None)


def test_ningun_tipo_de_referencia_lee_el_diario(sesion):
    assert not any('DIARIO' in tipo or 'ENTRADA' in tipo for tipo in m.TipoReferencia.__members__)
    assert {c.name for c in m.Referencia.__table__.columns}.isdisjoint({'entrada_diario_id', 'entrada_id'})
    assert sesion.scalar(select(func.count()).select_from(m.Referencia).where(
        m.Referencia.pregunta_diario_id.is_not(None))) == 2
