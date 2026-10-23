"""Ajuste del diario (F05): los recuerdos de Lumi son actividades del bloque LUMI que abre la amistad."""

from datetime import datetime, timedelta

from app.core.parametros import TOPE_ENTRADAS_AMISTAD_DIA, UMBRALES_AMISTAD
from datos.ruta import RECUERDOS_LUMI, REGLAS
from soporte_ruta import FECHA, avanzar, completar, pedir


def escribir(cliente, fecha=FECHA):
    return pedir(cliente, 'POST', '/acciones/escribir-entrada',
                 {'cuenta': 'est-ana', 'fecha_hora': fecha, 'texto': 'DATO DE PRUEBA'})


def recuerdos(cliente):
    [lumi] = [b for b in pedir(cliente, 'GET', '/cuentas/est-ana/actividades') if b['codigo'] == 'LUMI']
    return lumi, {a['codigo']: a for a in lumi['actividades']}


def test_los_umbrales_de_los_recuerdos_son_los_de_la_amistad():
    reglas = {objetivo: condiciones for _, tipo, objetivo, _, condiciones in REGLAS if objetivo in RECUERDOS_LUMI}
    assert [reglas[codigo] for codigo in RECUERDOS_LUMI] == [
        (('ESCRIBE_ENTRADA_DIARIO', None, 'EVENTOS_TOPE_DIARIO', umbral),) for umbral in UMBRALES_AMISTAD]


def test_el_bloque_lumi_se_ve_con_sus_recuerdos_bloqueados_y_su_requisito(cliente):
    completar(cliente, 't-inicio')
    lumi, actividades = recuerdos(cliente)
    assert (lumi['espacio'], list(actividades)) == ('LUMI', list(RECUERDOS_LUMI))
    assert all(a['estado'] == 'BLOQUEADA' and a['requerida'] is False for a in actividades.values())
    requeridos = [a['bloqueo'][0]['condiciones_faltantes'][0]['requerido'] for a in actividades.values()]
    assert requeridos == list(UMBRALES_AMISTAD)


def test_la_primera_carta_abre_el_primer_recuerdo_en_la_misma_accion(cliente):
    completar(cliente, 't-inicio')
    respuesta = escribir(cliente)
    assert [(d['tipo_objetivo'], d['objetivo']['codigo']) for d in respuesta['nuevos_desbloqueos']] == [
        ('ACTIVIDAD', 't-lumi-1')]
    _, actividades = recuerdos(cliente)
    assert actividades['t-lumi-1']['estado'] == 'DISPONIBLE'
    assert actividades['t-lumi-2']['bloqueo'][0]['condiciones_faltantes'][0]['actual'] == 1


def test_el_conteo_tiene_el_tope_diario_de_la_amistad(cliente):
    completar(cliente, 't-inicio')
    for _ in range(TOPE_ENTRADAS_AMISTAD_DIA + 2):
        escribir(cliente)
    _, actividades = recuerdos(cliente)
    assert actividades['t-lumi-2']['bloqueo'][0]['condiciones_faltantes'][0]['actual'] == TOPE_ENTRADAS_AMISTAD_DIA
    assert pedir(cliente, 'GET', '/cuentas/est-ana/diario/amistad')['puntos'] == TOPE_ENTRADAS_AMISTAD_DIA
    otro_dia = (datetime.fromisoformat(FECHA) + timedelta(days=1)).isoformat()
    faltan = UMBRALES_AMISTAD[1] - TOPE_ENTRADAS_AMISTAD_DIA
    for indice in range(faltan):
        respuesta = escribir(cliente, otro_dia)
    assert [d['objetivo']['codigo'] for d in respuesta['nuevos_desbloqueos']] == ['t-lumi-2']


def test_ver_un_recuerdo_no_cuenta_en_avances_ni_desbloquea_nada(cliente):
    avanzar(cliente)
    escribir(cliente)
    afinidad = pedir(cliente, 'GET', '/cuentas/est-ana/logros')['afinidad']
    familia = pedir(cliente, 'GET', '/cuentas/apo-rosa/familia')['estudiante']['avance']
    respuesta = completar(cliente, 't-lumi-1')
    assert respuesta['nuevos_desbloqueos'] == []
    assert pedir(cliente, 'GET', '/cuentas/est-ana/logros')['afinidad'] == afinidad
    assert pedir(cliente, 'GET', '/cuentas/apo-rosa/familia')['estudiante']['avance'] == familia
    # Se puede volver a ver: repetirlo la mantiene completada.
    completar(cliente, 't-lumi-1')
    _, actividades = recuerdos(cliente)
    assert actividades['t-lumi-1']['estado'] == 'COMPLETADA'
