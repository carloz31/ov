"""Estado cuentas."""

from soporte_ruta import FECHA, avanzar, completar, eventos, pedir
from sqlalchemy import func, select
from app import models as modelos


def test_check_in_y_diario_aislados_por_cuenta(cliente, sesion):
    # B09: `t-inicio` deja en el diario la pregunta fija `t-diario-fija`; se responde una sola vez.
    for cuenta in ('est-ana', 'est-luis'):
        # B01: diario, check-in y carta exigen su sección abierta; el recorrido de T0 y T1 las abre.
        avanzar(cliente, cuenta=cuenta)
        cuerpo = {'cuenta': cuenta, 'nivel_seguridad': 3, 'fecha_hora': FECHA}
        pedir(cliente, 'POST', '/acciones/check-in', cuerpo)
        # Ajuste del panel (F05): el segundo del día sobrescribe, sin otro evento.
        pedir(cliente, 'POST', '/acciones/check-in', {**cuerpo, 'nivel_seguridad': 4})
        guiada = {'cuenta': cuenta, 'pregunta': 't-diario-fija', 'texto': 'DATO DE PRUEBA', 'fecha_hora': FECHA}
        pedir(cliente, 'POST', '/acciones/escribir-entrada', guiada)
        pedir(cliente, 'POST', '/acciones/escribir-entrada', guiada, esperado=409)
        for _ in range(2):
            pedir(cliente, 'POST', '/acciones/escribir-entrada', {'cuenta': cuenta, 'texto': 'DATO DE PRUEBA', 'fecha_hora': FECHA})
        historial = eventos(cliente, cuenta)
        assert sum(e['tipo'] == 'REGISTRA_CHECK_IN' for e in historial) == 1
        assert sum(e['tipo'] == 'ESCRIBE_ENTRADA_LIBRE' for e in historial) == 2
        # §5: toda entrada emite DIARIO; las libres emiten además LIBRE.
        assert sum(e['tipo'] == 'ESCRIBE_ENTRADA_DIARIO' for e in historial) == 3
        cuenta_id = sesion.scalar(select(modelos.Cuenta.id).where(modelos.Cuenta.codigo == cuenta))
        assert sesion.scalar(select(func.count()).select_from(modelos.EntradaDiario).where(
            modelos.EntradaDiario.cuenta_id == cuenta_id,
            modelos.EntradaDiario.origen == modelos.OrigenEntrada.GUIADA,
        )) == 1


def test_carta_se_registra_solo_la_primera_vez_por_cuenta(cliente):
    # B01: diario, check-in y carta exigen su sección abierta; el recorrido de T0 y T1 las abre.
    avanzar(cliente)
    # B12: el apoderado escribe su carta con la sección CONVERSACIONES, que abre su ruta completa.
    for actividad in ('t-apo-1', 't-apo-carta'):
        completar(cliente, actividad, 'apo-rosa')
    for cuenta in ('est-ana', 'apo-rosa'):
        for texto in ('Primera carta', 'Carta editada'):
            pedir(cliente, 'POST', '/acciones/escribir-carta',
                  {'cuenta': cuenta, 'vinculo': 'VIN-ANA', 'texto': texto, 'fecha_hora': FECHA})
        assert sum(e['tipo'] == 'ESCRIBE_CARTA' and e['referencia'] == 'VIN-ANA' for e in eventos(cliente, cuenta)) == 1
