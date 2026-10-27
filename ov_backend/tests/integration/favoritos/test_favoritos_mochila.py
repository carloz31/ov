"""Ajuste mochila: favoritos de fichas y testimonios, sin exigir el catálogo y con su propio evento. DATO DE PRUEBA."""

from app import models as m
from soporte_retiro import ciclo
from soporte_ruta import FECHA, eventos, filas_base, pedir
from soporte_catalogo_ruta import PSICOLOGIA


def favorito(tipo, codigo, cuenta='est-ana'):
    return {'cuenta': cuenta, 'tipo': tipo, 'codigo': codigo, 'fecha_hora': FECHA}


def es_favorita(cliente, ruta, codigo):
    return next(f['es_favorita'] for f in pedir(cliente, 'GET', f'/cuentas/est-ana/{ruta}') if f['codigo'] == codigo)


def test_una_ficha_desbloqueada_se_marca_con_el_catalogo_cerrado(cliente, aplicacion):
    # DATO DE PRUEBA: una ficha sin regla está disponible desde el inicio, con el catálogo todavía cerrado.
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        sesion.add(m.Ficha(codigo='fic-libre', titulo='DATO DE PRUEBA', contenido='DATO DE PRUEBA'))
    cerrado = pedir(cliente, 'POST', '/acciones/marcar-favorito', favorito('CARRERA', PSICOLOGIA), 409)
    assert cerrado['detail']['mensaje'] == 'Completa el inicio para abrir el catálogo.'
    marcada = pedir(cliente, 'POST', '/acciones/marcar-favorito', favorito('FICHA', 'fic-libre'))
    # Su propio evento, con la ficha como referencia; no MARCA_FAVORITO.
    assert [(e['tipo'], e['referencia']) for e in marcada['eventos_registrados']] == [
        ('MARCA_FAVORITO_FICHA', 'fic-libre')]
    assert 'MARCA_FAVORITO' not in {e['tipo'] for e in eventos(cliente)}
    assert es_favorita(cliente, 'fichas', 'fic-libre') is True
    assert pedir(cliente, 'POST', '/acciones/marcar-favorito', favorito('FICHA', 'fic-libre'), 409)['detail'][
        'mensaje'] == 'Ya está entre tus favoritos'
    desmarcada = pedir(cliente, 'POST', '/acciones/desmarcar-favorito', favorito('FICHA', 'fic-libre'))
    assert desmarcada['eventos_registrados'] == []
    assert es_favorita(cliente, 'fichas', 'fic-libre') is False


def test_un_recurso_bloqueado_o_ajeno_no_se_marca(cliente, aplicacion):
    antes = filas_base(aplicacion)
    for accion in ('marcar-favorito', 'desmarcar-favorito'):
        bloqueada = pedir(cliente, 'POST', f'/acciones/{accion}', favorito('FICHA', 't-ficha'), 409)
        assert bloqueada['detail']['mensaje'] == 'Completa el inicio para obtener esta ficha.'
        pedir(cliente, 'POST', f'/acciones/{accion}', favorito('TESTIMONIO', 't-testimonio-1'), 409)
        pedir(cliente, 'POST', f'/acciones/{accion}', favorito('FICHA', 't-ficha-apo'), 404)
        pedir(cliente, 'POST', f'/acciones/{accion}', favorito('FICHA', 't-nula'), 404)
    assert filas_base(aplicacion) == antes


def test_testimonio_favorito_y_fuera_de_los_favoritos_del_catalogo(cliente):
    ciclo(cliente)
    pedir(cliente, 'POST', '/acciones/resolver-caso', {'cuenta': 'est-ana', 'actividad': 't-caso', 'puntaje': 13})
    marcado = pedir(cliente, 'POST', '/acciones/marcar-favorito', favorito('TESTIMONIO', 't-testimonio-1'))
    assert [(e['tipo'], e['referencia']) for e in marcado['eventos_registrados']] == [
        ('MARCA_FAVORITO_TESTIMONIO', 't-testimonio-1')]
    assert es_favorita(cliente, 'testimonios', 't-testimonio-1') is True
    pedir(cliente, 'POST', '/acciones/marcar-favorito', favorito('FICHA', 't-ficha'))
    # GET /favoritos sigue listando solo el catálogo.
    assert pedir(cliente, 'GET', '/cuentas/est-ana/favoritos') == {'carreras': [], 'ocupaciones': [], 'instituciones': []}
