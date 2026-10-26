"""B01: cada ficha tiene su audiencia; el motor la toma de la fila."""

from soporte_ruta import completar, pedir


def fichas(cliente, cuenta):
    return [(f['codigo'], f['estado']) for f in pedir(cliente, 'GET', f'/cuentas/{cuenta}/fichas')]


ESTUDIANTE = [('t-ficha', 'BLOQUEADA'), ('t-ficha-2', 'BLOQUEADA'), ('t-ficha-3', 'BLOQUEADA')]


def test_cada_cuenta_ve_solo_las_fichas_de_su_audiencia(cliente):
    assert fichas(cliente, 'est-ana') == ESTUDIANTE
    assert fichas(cliente, 'apo-rosa') == [('t-ficha-apo', 'BLOQUEADA')]
    respuesta = completar(cliente, 't-apo-1', 'apo-rosa')
    assert ('FICHA', 't-ficha-apo') in {(d['tipo_objetivo'], d['objetivo']['codigo']) for d in respuesta['nuevos_desbloqueos']}
    assert fichas(cliente, 'apo-rosa') == [('t-ficha-apo', 'DISPONIBLE')]
    assert fichas(cliente, 'est-ana') == ESTUDIANTE
    assert cliente.get('/cuentas/est-ana/progreso/FICHA/t-ficha-apo').status_code == 404
    assert cliente.get('/cuentas/apo-rosa/progreso/FICHA/t-ficha').status_code == 404
