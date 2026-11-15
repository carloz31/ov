"""Ajuste panel-entrevistas-configuracion §3: la orientadora oculta una entrevista (deja de verse para los estudiantes
y pierde su destacado y su Leyenda) y la vuelve a mostrar. DATO DE PRUEBA."""

import pytest
from sqlalchemy import select

from app import models as m
from app.core.parametros import FAVORITOS_LEYENDA
from soporte_acceso import ROLES
from soporte_investigaciones import abrir_investigaciones, accion, codigo_publicado, detalle, guia_lista, publicar
from soporte_ruta import pedir

AUTORES = ('est-ana', 'est-luis')
FANS = ('est-mia', 'est-teo', 'est-sol')


def orientadora(cliente, nombre, codigo, esperado=200, cuenta='ori-carmen', **datos):
    return accion(cliente, nombre, {'entrevista': codigo, **datos}, esperado, cuenta=cuenta)


def tabla(cliente, **filtros):
    consulta = '&'.join(f'{k}={v}' for k, v in filtros.items())
    return pedir(cliente, 'GET', f'/cuentas/ori-carmen/publicaciones?{consulta}')


def ficha(cliente, codigo, esperado=200):
    return pedir(cliente, 'GET', f'/cuentas/ori-carmen/publicaciones/{codigo}', esperado=esperado)


def eventos(cliente, cuenta, tipo):
    return [e for e in pedir(cliente, 'GET', f'/cuentas/{cuenta}/eventos') if e['tipo'] == tipo]


def notificaciones_sello(cliente, cuenta):
    return [n for n in pedir(cliente, 'GET', f'/cuentas/{cuenta}/notificaciones')['items']
            if n['referencia'] == 't-ins-leyenda']


def sello(cliente, cuenta):
    insignia, = [i for i in pedir(cliente, 'GET', f'/cuentas/{cuenta}/logros')['insignias']
                 if i['codigo'] == 't-ins-leyenda']
    return insignia


@pytest.fixture
def leyenda(cliente):
    """Ana publica con Luis, tres compañeros la marcan favorita y Carmen la destaca: es Leyenda."""
    guia_lista(cliente, 'est-luis')
    guia_lista(cliente)
    codigo = codigo_publicado(publicar(cliente, coautores=['est-luis']))
    for fan in FANS:
        abrir_investigaciones(cliente, fan)
    for fan in FANS[:FAVORITOS_LEYENDA]:
        pedir(cliente, 'POST', '/acciones/marcar-favorito', {'cuenta': fan, 'tipo': 'ENTREVISTA', 'codigo': codigo})
    orientadora(cliente, 'destacar-entrevista', codigo, destacada=True)
    assert detalle(cliente, codigo)['leyenda']
    return codigo


def test_ocultar_quita_destacado_y_leyenda_y_la_saca_para_estudiantes_y_autores(cliente, sesion, leyenda):
    accion(cliente, 'reportar', {'entrevista': leyenda, 'motivo': 'VIDEO'}, cuenta='est-mia')
    antes = {autor: len(notificaciones_sello(cliente, autor)) for autor in AUTORES}
    orientadora(cliente, 'ocultar-entrevista', leyenda)
    entrevista = sesion.scalar(select(m.Entrevista).where(m.Entrevista.codigo == leyenda))
    assert (entrevista.estado, entrevista.destacada_en, entrevista.destacada_por, entrevista.leyenda_en) == (
        'OCULTA', None, None, None)
    assert {r.estado for r in sesion.scalars(select(m.Reporte))} == {'RESUELTO'}
    for cuenta in (*AUTORES, *FANS):
        detalle(cliente, leyenda, cuenta, esperado=404)
        assert pedir(cliente, 'GET', f'/cuentas/{cuenta}/investigaciones')['conteos']['leyendas'] == 0
    # La orientadora la ve en «todos», con el filtro «Ocultas» y en su detalle; los otros filtros no la traen.
    assert [f['estado'] for f in tabla(cliente)['items']] == ['OCULTA']
    assert [f['codigo'] for f in tabla(cliente, estado='OCULTA')['items']] == [leyenda]
    for estado in ('SIN_DESTACAR', 'DESTACADA', 'LEYENDA'):
        assert tabla(cliente, estado=estado)['total'] == 0
    assert ficha(cliente, leyenda)['estado'] == 'OCULTA'
    # El sello de Leyenda de los autores se conserva: es un desbloqueo.
    # Ocultar no avisa a nadie.
    for autor in AUTORES:
        assert sello(cliente, autor)['estado'] == 'OBTENIDA'
        assert len(notificaciones_sello(cliente, autor)) == antes[autor]


def test_mientras_esta_oculta_solo_se_puede_volver_a_mostrar(cliente, leyenda):
    accion(cliente, 'reaccionar-entrevista', {'entrevista': leyenda, 'tipo': 'APRENDI', 'comentario': 'DATO DE PRUEBA'},
           cuenta='est-mia')
    reaccion = ficha(cliente, leyenda)['reacciones'][0]['codigo']
    accion(cliente, 'reportar', {'reaccion': reaccion, 'motivo': 'OFENSIVO'}, cuenta='est-teo')
    orientadora(cliente, 'ocultar-entrevista', leyenda)
    orientadora(cliente, 'destacar-entrevista', leyenda, 409, destacada=True)
    orientadora(cliente, 'comentar-entrevista', leyenda, 409, texto='DATO DE PRUEBA')
    orientadora(cliente, 'ocultar-entrevista', leyenda, 409)
    accion(cliente, 'eliminar-reaccion', {'reaccion': reaccion}, 409, cuenta='ori-carmen')
    # Sus reportes ya quedaron resueltos al ocultarla: no hay nada que descartar.
    assert ficha(cliente, leyenda)['reportes'] == []


def test_volver_a_mostrar_la_deja_publicada_sin_destacar_y_con_sus_favoritos(cliente, leyenda):
    orientadora(cliente, 'mostrar-entrevista', leyenda, 409)
    orientadora(cliente, 'ocultar-entrevista', leyenda)
    orientadora(cliente, 'mostrar-entrevista', leyenda)
    datos = ficha(cliente, leyenda)
    assert (datos['estado'], datos['favoritos']) == ('SIN_DESTACAR', FAVORITOS_LEYENDA)
    assert detalle(cliente, leyenda)['leyenda'] is False
    orientadora(cliente, 'mostrar-entrevista', leyenda, 409)
    # Destacarla otra vez con sus tres favoritos la hace Leyenda sin repetir eventos ni notificaciones.
    orientadora(cliente, 'destacar-entrevista', leyenda, destacada=True)
    assert ficha(cliente, leyenda)['estado'] == 'LEYENDA'
    for autor in AUTORES:
        assert len(eventos(cliente, autor, 'ENTREVISTA_LEYENDA')) == 1
        assert len(eventos(cliente, autor, 'ENTREVISTA_DESTACADA')) == 1
        assert len(notificaciones_sello(cliente, autor)) == 1


def test_otra_orientadora_recibe_404(aplicacion, cliente, leyenda, monkeypatch):
    monkeypatch.setitem(ROLES, 'ori-otra', m.Rol.ORIENTADORA)
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        otra = m.Cuenta(codigo='ori-otra', nombre='DATO DE PRUEBA', rol='ORIENTADORA')
        sesion.add(otra)
        sesion.flush()
        salon_b = sesion.scalar(select(m.Salon.id).where(m.Salon.codigo == '5B'))
        sesion.add(m.OrientadoraSalon(orientadora_id=otra.id, salon_id=salon_b, es_principal=True))
    orientadora(cliente, 'ocultar-entrevista', leyenda, 404, cuenta='ori-otra')
    orientadora(cliente, 'ocultar-entrevista', leyenda)
    orientadora(cliente, 'mostrar-entrevista', leyenda, 404, cuenta='ori-otra')
    pedir(cliente, 'GET', f'/cuentas/ori-otra/publicaciones/{leyenda}', esperado=404)
