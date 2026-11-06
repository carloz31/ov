"""HU-096: el aviso de velocidad a través de `responder-items`; el estado es por cuenta y aplicación."""

from sqlalchemy import select

from app import models as m
from soporte_retiro import ciclo, reiniciar
from soporte_ruta import FECHA, MISIONES_INTERESES, avanzar, completar, pedir, responder, revelar


INTERESES, INTERESES_2 = MISIONES_INTERESES
RAPIDO, LENTO = 0, 60_000


def items(cliente, actividad):
    return [item['codigo'] for item in pedir(cliente, 'GET', f'/actividades/{actividad}/items')]


def enviar(cliente, actividad, respuestas):
    """`respuestas`: (ítem, tiempo_ms), en orden, en un mismo envío."""
    return pedir(cliente, 'POST', '/acciones/responder-items', {
        'cuenta': 'est-ana', 'actividad': actividad, 'fecha_hora': FECHA,
        'respuestas': [{'item': item, 'opcion': 3, 'tiempo_ms': tiempo} for item, tiempo in respuestas],
    })


def avisos_uno_a_uno(cliente, actividad, codigos, tiempo=RAPIDO):
    return [enviar(cliente, actividad, [(codigo, tiempo)])['aviso_velocidad'] for codigo in codigos]


def tiempo_guardado(sesion, codigo):
    sesion.expire_all()
    return sesion.scalar(select(m.RespuestaItem.tiempo_ms).join(m.ItemInstrumento).where(
        m.ItemInstrumento.codigo == codigo))


def ritmo(sesion, aplicacion):
    sesion.expire_all()
    return sesion.scalar(select(m.RitmoAplicacion).join(m.Aplicacion).join(
        m.Cuenta, m.Cuenta.id == m.RitmoAplicacion.cuenta_id,
    ).where(m.Cuenta.codigo == 'est-ana', m.Aplicacion.codigo == aplicacion))


def test_los_instrumentos_cargan_su_umbral_segun_la_escala(sesion):
    umbrales = {i.codigo: (i.ms_por_palabra, i.ms_respuesta, i.racha_aviso) for i in sesion.scalars(select(m.Instrumento))}
    assert umbrales == {
        'TEST-RIASEC': (150, 1200, 4), 'TEST-PARTIDA-LLEGADA': (150, 1200, 4),
        'TEST-INTELIGENCIAS': (150, 1200, 4), 'TEST-HABILIDADES': (150, 800, 4),
    }


def test_sin_tiempo_la_respuesta_no_trae_aviso_ni_crea_ritmo(cliente, sesion):
    avanzar(cliente)
    assert responder(cliente, INTERESES)['aviso_velocidad'] is None
    assert ritmo(sesion, 'APL-RIASEC') is None
    assert tiempo_guardado(sesion, items(cliente, INTERESES)[0]) is None


def test_la_racha_cruza_dos_actividades_de_la_misma_aplicacion(cliente, sesion):
    avanzar(cliente)
    primera = items(cliente, INTERESES)
    responder(cliente, INTERESES, fin=len(primera) - 3)
    assert avisos_uno_a_uno(cliente, INTERESES, primera[-3:]) == [None, None, None]
    completar(cliente, INTERESES)
    assert avisos_uno_a_uno(cliente, INTERESES_2, items(cliente, INTERESES_2)[:1]) == [1]
    guardado = ritmo(sesion, 'APL-RIASEC')
    assert (guardado.racha_rapida, guardado.items_desde_aviso, guardado.avisos_velocidad) == (0, 0, 1)


def test_un_item_lento_rompe_la_racha(cliente):
    avanzar(cliente)
    codigos = items(cliente, INTERESES)
    assert avisos_uno_a_uno(cliente, INTERESES, codigos[:3]) == [None] * 3
    assert avisos_uno_a_uno(cliente, INTERESES, codigos[3:4], LENTO) == [None]
    assert avisos_uno_a_uno(cliente, INTERESES, codigos[4:8]) == [None, None, None, 1]


def test_reenviar_no_cuenta_y_conserva_el_tiempo(cliente, sesion):
    avanzar(cliente)
    codigos = items(cliente, INTERESES)
    avisos_uno_a_uno(cliente, INTERESES, codigos[:3])
    assert avisos_uno_a_uno(cliente, INTERESES, codigos[:1], LENTO) == [None]
    assert tiempo_guardado(sesion, codigos[0]) == RAPIDO
    guardado = ritmo(sesion, 'APL-RIASEC')
    assert (guardado.racha_rapida, guardado.items_desde_aviso) == (3, 3)
    assert avisos_uno_a_uno(cliente, INTERESES, codigos[3:4]) == [1]


def test_un_lote_da_a_lo_mas_un_aviso(cliente, sesion):
    avanzar(cliente)
    codigos = items(cliente, INTERESES)
    assert enviar(cliente, INTERESES, [(codigo, RAPIDO) for codigo in codigos[:20]])['aviso_velocidad'] == 1
    assert ritmo(sesion, 'APL-RIASEC').avisos_velocidad == 1


def test_partida_y_llegada_son_intentos_independientes(cliente):
    completar(cliente, 't-inicio')
    partida = items(cliente, 't-partida')
    assert avisos_uno_a_uno(cliente, 't-partida', partida[:3]) == [None] * 3
    responder(cliente, 't-partida', opcion=3)
    completar(cliente, 't-partida')
    completar(cliente, 't-cierre-inicio')
    completar(cliente, 't-expectativas')
    revelar(cliente, instrumento='TEST-PARTIDA-LLEGADA', aplicacion='APL-PARTIDA')
    for mision in MISIONES_INTERESES:
        responder(cliente, mision)
        completar(cliente, mision)
    revelar(cliente)
    # Si la racha de la partida contara, el primero ya daría aviso.
    assert avisos_uno_a_uno(cliente, 't-llegada', items(cliente, 't-llegada')[:4]) == [None, None, None, 1]


def test_el_reinicio_por_perfil_plano_empieza_un_intento_nuevo(cliente, sesion):
    avanzar(cliente)
    codigos = items(cliente, INTERESES)
    assert avisos_uno_a_uno(cliente, INTERESES, codigos[:4]) == [None, None, None, 1]
    assert ciclo(cliente, opcion=3, abrir=False)['perfil_plano'] is True
    reiniciar(cliente)
    assert ritmo(sesion, 'APL-RIASEC') is None
    assert avisos_uno_a_uno(cliente, INTERESES, codigos[:4]) == [None, None, None, 1]
    assert tiempo_guardado(sesion, codigos[0]) == RAPIDO


def test_un_tiempo_negativo_es_invalido(cliente):
    avanzar(cliente)
    pedir(cliente, 'POST', '/acciones/responder-items', {
        'cuenta': 'est-ana', 'actividad': INTERESES, 'fecha_hora': FECHA,
        'respuestas': [{'item': items(cliente, INTERESES)[0], 'opcion': 3, 'tiempo_ms': -1}],
    }, esperado=422)
