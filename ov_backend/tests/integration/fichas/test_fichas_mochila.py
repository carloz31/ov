"""Ajuste mochila: detalle de la ficha obtenida (tema, origen y tramo) y vista por ficha con ver-ficha. DATO DE PRUEBA."""

from soporte_ruta import avanzar, completar, filas_base, pedir


def ver(ficha, cuenta='est-ana'):
    return {'cuenta': cuenta, 'ficha': ficha}


def fichas(cliente, cuenta='est-ana'):
    return {ficha['codigo']: ficha for ficha in pedir(cliente, 'GET', f'/cuentas/{cuenta}/fichas')}


def test_ficha_obtenida_trae_tema_origen_y_tramo(cliente):
    avanzar(cliente)
    completar(cliente, 't-opcional')
    estado = fichas(cliente)
    assert list(estado) == ['t-ficha', 't-ficha-2', 't-ficha-3']
    primera = estado['t-ficha']
    assert (primera['estado'], primera['tema'], primera['visto']) == ('DISPONIBLE', 'Mitos y creencias', False)
    assert primera['descripcion'] and primera['contenido'].startswith('Muchas decisiones')
    assert primera['obtenida_en'] is not None
    assert primera['actividad'] == {'codigo': 't-inicio', 'titulo': 'Inicio de prueba'}
    assert primera['tramo']['codigo'] == 'T0' and primera['tramo']['numero'] == 1
    # La de la misión opcional: su actividad y el tramo T1.
    tercera = estado['t-ficha-3']
    assert (tercera['actividad']['codigo'], tercera['tramo']['codigo'], tercera['tramo']['numero']) == (
        't-opcional', 'T1', 2)


def test_ficha_bloqueada_no_trae_detalle(cliente):
    bloqueada = fichas(cliente)['t-ficha']
    assert bloqueada == {'codigo': 't-ficha', 'titulo': 'Ficha de prueba', 'estado': 'BLOQUEADA', 'tema': None,
                         'descripcion': None, 'contenido': None, 'obtenida_en': None, 'visto': False,
                         'actividad': None, 'tramo': None}


def test_ver_ficha_una_sola_vez_y_solo_esa_ficha(cliente, aplicacion):
    antes = filas_base(aplicacion)
    bloqueada = pedir(cliente, 'POST', '/acciones/ver-ficha', ver('t-ficha'), 409)
    assert bloqueada['detail']['mensaje'] == 'Completa el inicio para obtener esta ficha.'
    pedir(cliente, 'POST', '/acciones/ver-ficha', ver('t-nula'), 404)
    # Una ficha de otra audiencia no existe para la cuenta.
    pedir(cliente, 'POST', '/acciones/ver-ficha', ver('t-ficha-apo'), 404)
    assert filas_base(aplicacion) == antes

    completar(cliente, 't-inicio')
    vista = pedir(cliente, 'POST', '/acciones/ver-ficha', ver('t-ficha'))
    assert [(e['tipo'], e['referencia']) for e in vista['eventos_registrados']] == [('VISTA_FICHA', 't-ficha')]
    assert pedir(cliente, 'POST', '/acciones/ver-ficha', ver('t-ficha'))['eventos_registrados'] == []
    # Abrir una ficha no apaga «Nueva» en las demás.
    estado = fichas(cliente)
    assert (estado['t-ficha']['visto'], estado['t-ficha-2']['visto']) == (True, False)
