"""R36: eventos crudos evalúan sin crear registros de dominio."""

from soporte_ruta import filas_base, pedir


def test_r36_eventos_crudos_no_escriben_progreso_ni_entrevista(cliente, aplicacion):
    antes = filas_base(aplicacion)
    completar = pedir(cliente, 'POST', '/eventos', {'cuenta': 'est-ana', 'tipo': 'COMPLETA_ACTIVIDAD', 'referencia': 't-inicio'})
    assert 'R-t-partida' in {d['regla'] for d in completar['nuevos_desbloqueos']}
    pedir(cliente, 'POST', '/eventos', {'cuenta': 'est-ana', 'tipo': 'PUBLICA_ENTREVISTA'})
    desafio = pedir(cliente, 'POST', '/eventos', {'cuenta': 'est-ana', 'tipo': 'VENCE_DESAFIO_INTACTO'})
    assert 'R-t-ins-oculta' in {d['regla'] for d in desafio['nuevos_desbloqueos']}
    despues = filas_base(aplicacion)
    assert all(despues[nombre] == filas for nombre, filas in antes.items() if nombre not in {'evento_uso', 'desbloqueo', 'recomendacion'})
