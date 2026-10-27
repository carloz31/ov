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
    # Ajuste mochila: t-caso-2 sigue bloqueado en estas pruebas; se mira solo t-caso.
    return next(fila for fila in pedir(cliente, 'GET', '/cuentas/est-ana/casos') if fila['actividad'] == 't-caso')


def test_casos_traen_sus_tipos_riasec(cliente):
    assert fila_caso(cliente) == {
        'actividad': 't-caso', 'titulo': 'Caso de prueba', 'dimensiones': ['R', 'S'], 'estado': 'BLOQUEADA',
        'intentos': 0, 'superado': False, 'ultimo_puntaje': None, 'mejor_puntaje': None,
        'puntaje_minimo': 10, 'puntaje_maximo': 14}
    assert pedir(cliente, 'GET', '/cuentas/apo-rosa/casos') == []
    assert pedir(cliente, 'GET', '/cuentas/apo-rosa/coleccion') == []


def test_fallar_no_completa_y_superar_libera_testimonios_y_coleccion(cliente, aplicacion):
    ciclo(cliente)
    fallido = pedir(cliente, 'POST', '/acciones/resolver-caso', caso(9, ['firefighter']))
    assert fallido == {'eventos_registrados': [], 'nuevos_desbloqueos': [], 'ocupaciones_nuevas': [],
                       'puntaje_minimo': 10, 'puntaje_maximo': 14}
    fila = fila_caso(cliente)
    assert (fila['estado'], fila['intentos'], fila['superado'], fila['ultimo_puntaje']) == ('EN_CURSO', 1, False, 9)
    assert pedir(cliente, 'GET', '/cuentas/est-ana/coleccion') == []
    assert {t['estado'] for t in pedir(cliente, 'GET', '/cuentas/est-ana/testimonios')} == {'BLOQUEADA'}

    superado = pedir(cliente, 'POST', '/acciones/resolver-caso',
                     {**caso(12, ['firefighter', 'paramedic', 'firefighter']), 'fecha_hora': '2026-10-09T10:00:00'})
    assert tipos(superado) == ['COMPLETA_ACTIVIDAD', 'SUPERA_CASO']
    # Ajuste mochila: el segundo testimonio pide además cerrar el proyecto.
    assert reglas(superado) == {'R-t-testimonio-1'}
    assert superado['ocupaciones_nuevas'] == [{'codigo': 'firefighter', 'titulo': 'Bomberos'},
                                              {'codigo': 'paramedic', 'titulo': 'Paramédicos'}]
    assert [t['estado'] for t in pedir(cliente, 'GET', '/cuentas/est-ana/testimonios')] == [
        'DISPONIBLE', 'BLOQUEADA', 'BLOQUEADA', 'BLOQUEADA']

    otra_vez = pedir(cliente, 'POST', '/acciones/resolver-caso', caso(14, ['paramedic', 'nurse']))
    assert (superado['puntaje_minimo'], superado['puntaje_maximo']) == (10, 14)
    assert 'SUPERA_CASO' not in tipos(otra_vez) and otra_vez['ocupaciones_nuevas'] == [{'codigo': 'nurse', 'titulo': 'Enfermeros Graduados'}]
    pedir(cliente, 'POST', '/acciones/resolver-caso', caso(1, ['biologist']))

    fila = fila_caso(cliente)
    assert (fila['estado'], fila['intentos'], fila['superado']) == ('COMPLETADA', 4, True)
    assert (fila['ultimo_puntaje'], fila['mejor_puntaje']) == (1, 14)
    coleccion = pedir(cliente, 'GET', '/cuentas/est-ana/coleccion')
    assert [(o['ocupacion'], o['caso']) for o in coleccion] == [
        ('firefighter', 't-caso'), ('paramedic', 't-caso'), ('nurse', 't-caso')]
    assert coleccion[0]['obtenida_en'] == '2026-10-09T10:00:00' and coleccion[0]['titulo'] == 'Bomberos'
    with aplicacion.state.fabrica_sesiones() as sesion:
        assert len(sesion.scalars(select(m.ColeccionOcupacion)).all()) == 3
        assert len(sesion.scalars(select(m.ResultadoCaso)).all()) == 4


def test_ocupacion_inexistente_no_deja_filas(cliente, aplicacion):
    ciclo(cliente)
    antes = filas_base(aplicacion)
    respuesta = pedir(cliente, 'POST', '/acciones/resolver-caso', caso(13, ['firefighter', 'no-existe']), 422)
    assert 'no-existe' in respuesta['detail']['mensaje']
    assert filas_base(aplicacion) == antes


def casos_extra(sesion, cantidad):
    # DATO DE PRUEBA: casos propios, con dos dimensiones cada uno, para medir pocos contra muchos.
    destino = buscar(sesion, m.Bloque, 'CIUDAD')
    dimensiones = sesion.scalars(select(m.Dimension).where(m.Dimension.codigo.in_(('I', 'A')))).all()
    for n in range(cantidad):
        actividad = m.Actividad(codigo=f'caso-extra-{n}', titulo='DATO DE PRUEBA', tipo='CASO', contenido='prueba',
                                orden=100 + n, bloque_id=destino.id, requerida=False, puntaje_minimo=7,
                                puntaje_maximo=14)
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
            for puntaje in (1, 13):
                cantidades.append(medir(cliente, aplicacion, 'POST', '/acciones/resolver-caso',
                                        caso(puntaje, ['firefighter', 'paramedic']), limite=14)[1].cantidad)
            cantidades += [medir(cliente, aplicacion, 'GET', f'/cuentas/est-ana/{ruta}')[1].cantidad
                           for ruta in ('casos', 'coleccion')]
            conteos.append(cantidades)
    assert conteos[0] == conteos[1]
