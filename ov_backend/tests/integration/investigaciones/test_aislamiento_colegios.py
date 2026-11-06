"""Ajuste colegio: un estudiante o una orientadora ve lo de su salón y, en Leyendas, lo de su colegio; nunca de otro."""

from datetime import datetime

import pytest
from sqlalchemy import select

from app import models as m
from soporte_acceso import ROLES
from soporte_investigaciones import (
    abrir_investigaciones, accion, codigo_publicado, detalle, entrevistas, guia_lista, investigaciones, publicar,
)
from soporte_ruta import FECHA, pedir


@pytest.fixture
def colegios(aplicacion, cliente, monkeypatch):
    """DATO DE PRUEBA: 5B pasa a otro colegio con su orientadora; 5C es otro salón del colegio de 5A, con la suya."""
    # El cliente firma tokens solo para las cuentas que conoce; estas existen únicamente en esta prueba.
    monkeypatch.setitem(ROLES, 'est-cami', m.Rol.ESTUDIANTE)
    monkeypatch.setitem(ROLES, 'ori-otra', m.Rol.ORIENTADORA)
    monkeypatch.setitem(ROLES, 'ori-cinco', m.Rol.ORIENTADORA)
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        otro = m.Colegio(codigo='col-otro', nombre='Otro colegio')
        sesion.add(otro)
        sesion.flush()
        salon_b = sesion.scalar(select(m.Salon).where(m.Salon.codigo == '5B'))
        salon_b.colegio_id = otro.id
        salon_c = m.Salon(codigo='5C', nombre='Quinto C', colegio_id=sesion.scalar(
            select(m.Salon.colegio_id).where(m.Salon.codigo == '5A')))
        sesion.add(salon_c)
        sesion.flush()
        cami = m.Cuenta(codigo='est-cami', nombre='Cami', rol='ESTUDIANTE', salon_id=salon_c.id)
        ori_otra = m.Cuenta(codigo='ori-otra', nombre='Otra', rol='ORIENTADORA')
        ori_cinco = m.Cuenta(codigo='ori-cinco', nombre='Cinco', rol='ORIENTADORA')
        sesion.add_all([cami, ori_otra, ori_cinco])
        sesion.flush()
        sesion.add_all([m.OrientadoraSalon(orientadora_id=ori_otra.id, salon_id=salon_b.id, es_principal=True),
                        m.OrientadoraSalon(orientadora_id=ori_cinco.id, salon_id=salon_c.id, es_principal=True)])
    for cuenta in ('est-beto', 'est-cami', 'est-luis'):
        abrir_investigaciones(cliente, cuenta)


def leyenda_de_ana(cliente, aplicacion):
    """Publica Ana (5A) y la vuelve Leyenda en la base (DATO DE PRUEBA: el camino a Leyenda se prueba en test_leyenda)."""
    guia_lista(cliente)
    codigo = codigo_publicado(publicar(cliente))
    fecha = datetime.fromisoformat(FECHA)
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        entrevista = sesion.scalar(select(m.Entrevista).where(m.Entrevista.codigo == codigo))
        entrevista.destacada_en = entrevista.leyenda_en = fecha
    return codigo


def favorito(cliente, cuenta, codigo, esperado=200):
    return pedir(cliente, 'POST', '/acciones/marcar-favorito',
                 {'cuenta': cuenta, 'tipo': 'ENTREVISTA', 'codigo': codigo}, esperado)


def reaccionar(cliente, cuenta, codigo, esperado=200):
    return accion(cliente, 'reaccionar-entrevista', {'entrevista': codigo, 'tipo': 'APRENDI', 'comentario': 'Aprendí algo.'},
                  esperado, cuenta)


def tabla(cliente, cuenta):
    return pedir(cliente, 'GET', f'/cuentas/{cuenta}/publicaciones')


def test_el_estudiante_de_otro_colegio_no_ve_la_leyenda_y_el_del_mismo_si(cliente, aplicacion, colegios):
    codigo = leyenda_de_ana(cliente, aplicacion)
    for vista in ('LEYENDAS', 'SALON_Y_LEYENDAS'):
        assert entrevistas(cliente, 'est-beto', vista=vista)['total'] == 0
        assert [t['codigo'] for t in entrevistas(cliente, 'est-cami', vista=vista)['items']] == [codigo]
    assert investigaciones(cliente, 'est-beto')['conteos']['leyendas'] == 0
    assert investigaciones(cliente, 'est-cami')['conteos']['leyendas'] == 1
    detalle(cliente, codigo, 'est-beto', esperado=404)
    assert detalle(cliente, codigo, 'est-cami')['leyenda']


def test_el_estudiante_de_otro_colegio_no_actua_sobre_la_leyenda(cliente, aplicacion, sesion, colegios):
    codigo = leyenda_de_ana(cliente, aplicacion)
    accion(cliente, 'ver-entrevista', {'entrevista': codigo}, 404, 'est-beto')
    reaccionar(cliente, 'est-beto', codigo, esperado=404)
    accion(cliente, 'reportar', {'entrevista': codigo, 'motivo': 'OFENSIVO'}, 404, 'est-beto')
    favorito(cliente, 'est-beto', codigo, esperado=404)
    assert sesion.scalars(select(m.Reaccion)).all() == [] and sesion.scalars(select(m.Reporte)).all() == []
    assert sesion.scalars(select(m.Favorito).where(m.Favorito.tipo == 'ENTREVISTA')).all() == []


def test_la_orientadora_de_otro_colegio_no_ve_la_leyenda_y_la_del_mismo_si(cliente, aplicacion, colegios):
    codigo = leyenda_de_ana(cliente, aplicacion)
    assert tabla(cliente, 'ori-otra')['total'] == 0
    pedir(cliente, 'GET', f'/cuentas/ori-otra/publicaciones/{codigo}', esperado=404)
    fila, = tabla(cliente, 'ori-cinco')['items']
    assert fila['codigo'] == codigo and not fila['de_sus_salones']
    assert not pedir(cliente, 'GET', f'/cuentas/ori-cinco/publicaciones/{codigo}')['de_sus_salones']
    # La de otro salón de su colegio es solo de lectura.
    accion(cliente, 'destacar-entrevista', {'entrevista': codigo, 'destacada': False}, 404, 'ori-cinco')
    assert tabla(cliente, 'ori-carmen')['items'][0]['de_sus_salones']


def test_leyenda_muestra_y_cuenta_lo_de_todo_su_colegio_y_nada_de_otro(cliente, aplicacion, colegios):
    codigo = leyenda_de_ana(cliente, aplicacion)
    reaccionar(cliente, 'est-luis', codigo)  # 5A
    reaccionar(cliente, 'est-cami', codigo)  # 5C, mismo colegio
    accion(cliente, 'comentar-entrevista', {'entrevista': codigo, 'texto': 'Buen trabajo.'}, cuenta='ori-carmen')
    favorito(cliente, 'est-luis', codigo)
    favorito(cliente, 'est-cami', codigo)
    # El intento de otro colegio se rechaza y no cambia nada.
    reaccionar(cliente, 'est-beto', codigo, esperado=404)
    favorito(cliente, 'est-beto', codigo, esperado=404)
    for cuenta in ('est-ana', 'est-luis', 'est-cami'):
        ficha = detalle(cliente, codigo, cuenta)
        assert {r['autor']['codigo'] for r in ficha['lista_reacciones']} == {'est-luis', 'est-cami', 'ori-carmen'}
        assert ficha['reacciones'] == 2 and ficha['reacciones_por_tipo'] == {'APRENDI': 2} and ficha['favoritos'] == 2
    moderada = pedir(cliente, 'GET', f'/cuentas/ori-carmen/publicaciones/{codigo}')
    assert {(r['autor']['codigo'], r['autor']['salon']) for r in moderada['reacciones']} == {
        ('est-luis', '5A'), ('est-cami', '5C'), ('ori-carmen', None)}


def test_coautor_de_otro_colegio_no_existe_y_el_del_mismo_colegio_no_cumple(cliente, colegios):
    guia_lista(cliente)
    respuesta = publicar(cliente, coautores=['est-beto'], esperado=404)
    assert 'Beto' not in str(respuesta)
    assert 'Cami' in str(publicar(cliente, coautores=['est-cami'], esperado=409))


def test_aliados_y_lo_del_salon_no_cruzan_colegios(cliente, colegios):
    guia_lista(cliente, 'est-beto', abrir=False)
    guia_lista(cliente)
    aliados = investigaciones(cliente)['aliados']
    assert 'est-beto' not in {a['codigo'] for grupo in aliados.values() for a in grupo}
    codigo_publicado(publicar(cliente))
    assert entrevistas(cliente, 'est-beto', vista='SALON')['total'] == 0
    assert investigaciones(cliente, 'est-beto')['conteos']['salon'] == 0
