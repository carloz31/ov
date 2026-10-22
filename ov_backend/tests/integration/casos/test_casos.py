"""B08 · HU-051 a 056: el caso se completa solo al superarlo y entonces libera testimonios y colección. DATO DE PRUEBA."""

from sqlalchemy import select

from app import models as m
from soporte_retiro import buscar, ciclo, medir
from soporte_ruta import filas_base, pedir, reglas


def caso(puntaje, ocupaciones=(), cuenta='est-ana'):
    return {'cuenta': cuenta, 'actividad': 't-caso', 'puntaje': puntaje, 'ocupaciones': list(ocupaciones)}


def tipos(respuesta):
    return [evento['tipo'] for evento in respuesta['eventos_registrados']]


def fila_caso(cliente):
    fila, = pedir(cliente, 'GET', '/cuentas/est-ana/casos')
    return fila


def test_casos_traen_sus_tipos_riasec(cliente):
    assert fila_caso(cliente) == {
        'actividad': 't-caso', 'titulo': 'Caso de prueba', 'dimensiones': ['R', 'S'], 'estado': 'BLOQUEADA',
        'intentos': 0, 'superado': False, 'ultimo_puntaje': None, 'mejor_puntaje': None,
        'puntaje_minimo': 60}
    assert pedir(cliente, 'GET', '/cuentas/apo-rosa/casos') == []
    assert pedir(cliente, 'GET', '/cuentas/apo-rosa/coleccion') == []


def test_fallar_no_completa_y_superar_libera_testimonios_y_coleccion(cliente, aplicacion):
    ciclo(cliente)
    fallido = pedir(cliente, 'POST', '/acciones/resolver-caso', caso(59, ['firefighter']))
    assert fallido == {'eventos_registrados': [], 'nuevos_desbloqueos': [], 'ocupaciones_nuevas': []}
    fila = fila_caso(cliente)
    assert (fila['estado'], fila['intentos'], fila['superado'], fila['ultimo_puntaje']) == ('EN_CURSO', 1, False, 59)
    assert pedir(cliente, 'GET', '/cuentas/est-ana/coleccion') == []
    assert {t['estado'] for t in pedir(cliente, 'GET', '/cuentas/est-ana/testimonios')} == {'BLOQUEADA'}

    superado = pedir(cliente, 'POST', '/acciones/resolver-caso',
                     {**caso(80, ['firefighter', 'paramedic', 'firefighter']), 'fecha_hora': '2026-10-09T10:00:00'})
    assert tipos(superado) == ['COMPLETA_ACTIVIDAD', 'SUPERA_CASO']
    assert reglas(superado) == {'R-t-testimonio-1', 'R-t-testimonio-2'}
    assert superado['ocupaciones_nuevas'] == ['firefighter', 'paramedic']
    assert {t['estado'] for t in pedir(cliente, 'GET', '/cuentas/est-ana/testimonios')} == {'DISPONIBLE'}

    otra_vez = pedir(cliente, 'POST', '/acciones/resolver-caso', caso(100, ['paramedic', 'nurse']))
    assert 'SUPERA_CASO' not in tipos(otra_vez) and otra_vez['ocupaciones_nuevas'] == ['nurse']
    pedir(cliente, 'POST', '/acciones/resolver-caso', caso(10, ['biologist']))

    fila = fila_caso(cliente)
    assert (fila['estado'], fila['intentos'], fila['superado']) == ('COMPLETADA', 4, True)
    assert (fila['ultimo_puntaje'], fila['mejor_puntaje']) == (10, 100)
    coleccion = pedir(cliente, 'GET', '/cuentas/est-ana/coleccion')
    assert [(o['ocupacion'], o['caso']) for o in coleccion] == [
        ('firefighter', 't-caso'), ('paramedic', 't-caso'), ('nurse', 't-caso')]
    assert coleccion[0]['obtenida_en'] == '2026-10-09T10:00:00' and coleccion[0]['titulo'] == 'Bombero/a'
    with aplicacion.state.fabrica_sesiones() as sesion:
        assert len(sesion.scalars(select(m.ColeccionOcupacion)).all()) == 3
        assert len(sesion.scalars(select(m.ResultadoCaso)).all()) == 4


def test_ocupacion_inexistente_no_deja_filas(cliente, aplicacion):
    ciclo(cliente)
    antes = filas_base(aplicacion)
    respuesta = pedir(cliente, 'POST', '/acciones/resolver-caso', caso(90, ['firefighter', 'no-existe']), 422)
    assert 'no-existe' in respuesta['detail']['mensaje']
    assert filas_base(aplicacion) == antes


def casos_extra(sesion, cantidad):
    # DATO DE PRUEBA: casos propios, con dos dimensiones cada uno, para medir pocos contra muchos.
    destino = buscar(sesion, m.Bloque, 'CIUDAD')
    dimensiones = sesion.scalars(select(m.Dimension).where(m.Dimension.codigo.in_(('I', 'A')))).all()
    for n in range(cantidad):
        actividad = m.Actividad(codigo=f'caso-extra-{n}', titulo='DATO DE PRUEBA', tipo='CASO', contenido='prueba',
                                orden=100 + n, bloque_id=destino.id, requerida=False, puntaje_minimo=50)
        sesion.add(actividad)
        sesion.flush()
        sesion.add_all(m.ActividadDimension(actividad_id=actividad.id, dimension_id=d.id) for d in dimensiones)


def test_presupuesto_de_consultas_de_casos(tmp_path, base_aislada):
    conteos = []
    for extra in (0, 100):
        with base_aislada(tmp_path, f'casos-{extra}') as (aplicacion, cliente):
            with aplicacion.state.fabrica_sesiones.begin() as sesion:
                casos_extra(sesion, extra)
            ciclo(cliente)
            cantidades = [medir(cliente, aplicacion, 'GET', '/cuentas/est-ana/casos')[1].cantidad]
            for puntaje in (10, 90):
                cantidades.append(medir(cliente, aplicacion, 'POST', '/acciones/resolver-caso',
                                        caso(puntaje, ['firefighter', 'paramedic']), limite=14)[1].cantidad)
            cantidades += [medir(cliente, aplicacion, 'GET', f'/cuentas/est-ana/{ruta}')[1].cantidad
                           for ruta in ('casos', 'coleccion')]
            conteos.append(cantidades)
    assert conteos[0] == conteos[1]
