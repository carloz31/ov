"""B10 · HU-040 y HU-026: marcar, desmarcar y consultar favoritos, y su marca en el catálogo y el resultado.
DATO DE PRUEBA."""

import pytest

from soporte_retiro import ciclo, medir, resultado
from soporte_ruta import FECHA, completar, filas_base, pedir


def favorito(tipo, codigo, cuenta='est-ana', **extra):
    return {'cuenta': cuenta, 'tipo': tipo, 'codigo': codigo, **extra}


@pytest.fixture
def abierto(cliente):
    completar(cliente, 't-inicio')
    return cliente


def codigos(filas):
    return [fila['codigo'] for fila in filas]


def test_favoritos_exigen_el_catalogo_abierto(cliente, aplicacion):
    antes = filas_base(aplicacion)
    for accion in ('marcar-favorito', 'desmarcar-favorito'):
        cerrado = pedir(cliente, 'POST', f'/acciones/{accion}', favorito('CARRERA', 'psychology'), 409)
        assert cerrado['detail']['mensaje'] == 'Completa el inicio para abrir el catálogo.'
    pedir(cliente, 'GET', '/cuentas/est-ana/favoritos', esperado=409)
    pedir(cliente, 'GET', '/cuentas/apo-rosa/favoritos', esperado=404)
    pedir(cliente, 'POST', '/acciones/marcar-favorito', favorito('CARRERA', 'psychology', 'apo-rosa'), 404)
    assert filas_base(aplicacion) == antes


def test_hu040_marcar_consultar_y_desmarcar(abierto):
    assert pedir(abierto, 'GET', '/cuentas/est-ana/favoritos') == {'carreras': [], 'ocupaciones': [],
                                                                    'instituciones': []}
    marcado = pedir(abierto, 'POST', '/acciones/marcar-favorito', favorito('CARRERA', 'nursing', fecha_hora=FECHA))
    assert [(e['tipo'], e['referencia']) for e in marcado['eventos_registrados']] == [('MARCA_FAVORITO', None)]
    for tipo, codigo in (('CARRERA', 'psychology'), ('OCUPACION', 'psychologist'), ('INSTITUCION', 't-uni')):
        pedir(abierto, 'POST', '/acciones/marcar-favorito', favorito(tipo, codigo))
    repetido = pedir(abierto, 'POST', '/acciones/marcar-favorito', favorito('CARRERA', 'psychology'), 409)
    assert repetido['detail']['mensaje'] == 'Ya está entre tus favoritos'
    pedir(abierto, 'POST', '/acciones/marcar-favorito', favorito('CARRERA', 'no-existe'), 404)
    pedir(abierto, 'POST', '/acciones/marcar-favorito', favorito('OTRO', 'psychology'), 422)

    lista = pedir(abierto, 'GET', '/cuentas/est-ana/favoritos')
    assert codigos(lista['carreras']) == ['psychology', 'nursing']
    assert lista['ocupaciones'][0] == {'codigo': 'psychologist', 'codigo_onet': '19-3033.00', 'titulo': 'Psicólogo/a',
                                       'riasec': ['S', 'I', 'C'], 'es_favorita': True}
    assert codigos(lista['instituciones']) == ['t-uni']

    carreras = {c['codigo']: c['es_favorita'] for c in pedir(abierto, 'GET', '/cuentas/est-ana/catalogo/carreras')}
    assert [c for c, marcada in carreras.items() if marcada] == ['nursing', 'psychology']
    detalle = pedir(abierto, 'GET', '/cuentas/est-ana/catalogo/carreras/psychology')
    assert detalle['es_favorita'] is True
    assert {o['codigo']: o['es_favorita'] for o in detalle['ocupaciones']}['psychologist'] is True
    assert detalle['instituciones'][0]['es_favorita'] is True

    desmarcado = pedir(abierto, 'POST', '/acciones/desmarcar-favorito', favorito('CARRERA', 'nursing'))
    assert desmarcado['eventos_registrados'] == []
    pedir(abierto, 'POST', '/acciones/desmarcar-favorito', favorito('CARRERA', 'nursing'), 409)
    assert codigos(pedir(abierto, 'GET', '/cuentas/est-ana/favoritos')['carreras']) == ['psychology']


def test_hu026_el_resultado_marca_ocupaciones_y_carreras_favoritas(cliente):
    ciclo(cliente)
    antes = resultado(cliente)
    assert not any(c['es_favorita'] for c in antes['coincidencias'])
    assert not any(c['es_favorita'] for c in antes['carreras_recomendadas'])
    ocupacion = antes['coincidencias'][0]['codigo']
    carrera = antes['carreras_recomendadas'][0]['codigo']
    pedir(cliente, 'POST', '/acciones/marcar-favorito', favorito('OCUPACION', ocupacion))
    pedir(cliente, 'POST', '/acciones/marcar-favorito', favorito('CARRERA', carrera))
    despues = resultado(cliente)
    assert [c['codigo'] for c in despues['coincidencias'] if c['es_favorita']] == [ocupacion]
    assert [c['codigo'] for c in despues['carreras_recomendadas'] if c['es_favorita']] == [carrera]
    via = [v for c in despues['carreras_recomendadas'] for v in c['via'] if v['codigo'] == ocupacion]
    assert via and all(v['es_favorita'] for v in via)


def test_presupuesto_de_consultas_de_favoritos(tmp_path, base_aislada):
    conteos = []
    for cantidad in (1, 6):
        with base_aislada(tmp_path, f'favoritos-{cantidad}') as (aplicacion, cliente):
            completar(cliente, 't-inicio')
            carreras = [c['codigo'] for c in pedir(cliente, 'GET', '/cuentas/est-ana/catalogo/carreras')][:cantidad]
            ocupaciones = [o['codigo'] for o in pedir(cliente, 'GET', '/cuentas/est-ana/catalogo/ocupaciones')][:cantidad]
            for codigo in carreras:
                pedir(cliente, 'POST', '/acciones/marcar-favorito', favorito('CARRERA', codigo))
            for codigo in ocupaciones:
                pedir(cliente, 'POST', '/acciones/marcar-favorito', favorito('OCUPACION', codigo))
            pedir(cliente, 'POST', '/acciones/marcar-favorito', favorito('INSTITUCION', 't-uni'))
            conteos.append([
                medir(cliente, aplicacion, 'GET', '/cuentas/est-ana/favoritos')[1].cantidad,
                # B17: +1 por la cuenta del actor que carga el guardia.
                medir(cliente, aplicacion, 'GET', '/cuentas/est-ana/catalogo/carreras/psychology', limite=11)[1].cantidad,
                medir(cliente, aplicacion, 'POST', '/acciones/marcar-favorito',
                      favorito('INSTITUCION', 't-ffaa'), limite=14)[1].cantidad,
            ])
    assert conteos[0] == conteos[1]
