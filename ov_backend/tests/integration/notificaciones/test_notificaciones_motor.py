"""Ajuste notificaciones (B1): el motor crea DESBLOQUEO solo para los logros que se anuncian, en la transacción de
la acción, y la respuesta las trae en `nuevas_notificaciones`."""

from sqlalchemy import select

from soporte_ruta import FECHA, completar, pedir

from app.models import Cuenta, Notificacion

ANUNCIADOS = {'INSIGNIA', 'FICHA', 'NIVEL'}


def _anunciados(respuesta):
    return {(nuevo['objetivo']['codigo'], nuevo['tipo_objetivo']) for nuevo in respuesta['nuevos_desbloqueos']
            if nuevo['tipo_objetivo'] in ANUNCIADOS
            or (nuevo['tipo_objetivo'] == 'BLOQUE' and nuevo['objetivo']['codigo'] == 'CIUDAD')}


def _guardadas(aplicacion, cuenta):
    with aplicacion.state.fabrica_sesiones() as sesion:
        return sesion.scalars(select(Notificacion).join(Cuenta, Cuenta.id == Notificacion.cuenta_id).where(
            Cuenta.codigo == cuenta).order_by(Notificacion.id)).all()


def test_desbloqueo_solo_de_logros_anunciados(cliente, aplicacion):
    vistos = set()
    for codigo in ('t-inicio', 't-partida', 't-cierre-inicio', 't-expectativas'):
        respuesta = completar(cliente, codigo)
        nuevas = respuesta['nuevas_notificaciones']
        assert {(n['referencia'], n['detalle']) for n in nuevas} == _anunciados(respuesta)
        assert all(n['tipo'] == 'DESBLOQUEO' and not n['vista'] and n['codigo'].startswith('NOT-') for n in nuevas)
        assert all(n['estudiante'] is None for n in nuevas)
        vistos |= {n['detalle'] for n in nuevas}
    # El recorrido abre fichas, sube de nivel y llega a la Ciudad; las actividades no se anuncian.
    assert {'FICHA', 'NIVEL', 'BLOQUE'} <= vistos
    guardadas = _guardadas(aplicacion, 'est-ana')
    assert {(n.referencia, n.detalle) for n in guardadas} >= {('CIUDAD', 'BLOQUE')}
    assert all(n.vista_en is None and n.tipo == 'DESBLOQUEO' for n in guardadas)
    ciudad = next(n for n in guardadas if n.referencia == 'CIUDAD')
    assert ciudad.nombre and ciudad.creada_en.isoformat() == FECHA


def test_accion_sin_logros_no_notifica(cliente, aplicacion):
    respuesta = completar(cliente, 't-inicio')
    assert any(n['tipo_objetivo'] == 'ACTIVIDAD' for n in respuesta['nuevos_desbloqueos'])
    assert respuesta['nuevas_notificaciones'] == [] or all(
        n['detalle'] != 'ACTIVIDAD' for n in respuesta['nuevas_notificaciones'])
    repetida = completar(cliente, 't-inicio')
    assert repetida['nuevos_desbloqueos'] == [] and repetida['nuevas_notificaciones'] == []


def test_insignia_por_evento(cliente, aplicacion):
    respuesta = pedir(cliente, 'POST', '/eventos', {'cuenta': 'est-ana', 'tipo': 'VENCE_DESAFIO_INTACTO'})
    assert ('t-ins-oculta', 'INSIGNIA') in {(n['referencia'], n['detalle']) for n in respuesta['nuevas_notificaciones']}


def test_apoderado_recibe_su_ficha(cliente, aplicacion):
    respuesta = completar(cliente, 't-apo-1', cuenta='apo-rosa')
    assert [(n['referencia'], n['detalle']) for n in respuesta['nuevas_notificaciones']] == [('t-ficha-apo', 'FICHA')]
    assert [n.referencia for n in _guardadas(aplicacion, 'apo-rosa')] == ['t-ficha-apo']
    assert _guardadas(aplicacion, 'est-ana') == []

