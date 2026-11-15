"""Ajuste panel-entrevistas-configuracion §4: con `contenido` y los estudiantes de ejemplo, la tabla de Publicaciones de
ori-carmen trae las seis entrevistas de muestra, cada una en su estado. DATO DE PRUEBA."""

import pytest
from sqlalchemy import select

from app import models as m
from datos import contenido
from soporte_acceso import ROLES

BASE = '/cuentas/ori-carmen/publicaciones'
TITULOS = [e['titulo'] for e in contenido.ENTREVISTAS_EJEMPLO]


@pytest.fixture(scope='module')
def ejemplos(plantilla_contenido, tmp_path_factory):
    from app.main import crear_aplicacion
    from soporte_acceso import ClienteConToken
    from soporte_bases import copiar_plantilla
    from soporte_llm import ClientePrueba
    from soporte_panel import sembrar_ejemplo
    aplicacion = crear_aplicacion(copiar_plantilla(
        plantilla_contenido, tmp_path_factory.mktemp('entrevistas-ejemplo') / 'contenido.db'))
    aplicacion.state.cliente_llm = ClientePrueba()
    sembrar_ejemplo(aplicacion)
    try:
        with ClienteConToken(aplicacion) as cliente:
            yield aplicacion, cliente
    finally:
        aplicacion.state.motor_bd.dispose()


def _tabla(cliente, **filtros):
    respuesta = cliente.get(BASE, params=filtros)
    assert respuesta.status_code == 200, respuesta.text
    return {f['titulo']: f for f in respuesta.json()['items']}


def test_la_tabla_de_ori_carmen_trae_las_seis_en_su_estado(ejemplos):
    _, cliente = ejemplos
    filas = _tabla(cliente)
    assert set(filas) == set(TITULOS)
    uno, dos, tres, cuatro, cinco, seis = (filas[t] for t in TITULOS)
    assert (uno['estado'], uno['reacciones']) == ('SIN_DESTACAR', 2)
    assert {a['codigo'] for a in dos['autores']} == {'est-panel-5', 'est-panel-8'}
    assert (dos['estado'], dos['favoritos']) == ('DESTACADA', 1)
    assert (tres['estado'], tres['favoritos']) == ('LEYENDA', 3)
    assert (cuatro['estado'], cuatro['reportes_pendientes'], cuatro['comentarios_reportados']) == ('SIN_DESTACAR', 1, 1)
    assert cinco['estado'] == 'OCULTA'
    # La del salón egresado va al final, de solo lectura, con su promoción para nombrarla.
    assert seis['estado'] == 'LEYENDA' and seis['de_sus_salones'] is False
    assert seis['autores'][0]['salon'] == {'codigo': '2024-A', 'promocion': 2024, 'seccion': 'A'}
    assert list(_tabla(cliente))[-1] == TITULOS[5]


def test_los_filtros_traen_cada_una_donde_corresponde(ejemplos):
    _, cliente = ejemplos
    assert list(_tabla(cliente, estado='OCULTA')) == [TITULOS[4]]
    assert set(_tabla(cliente, estado='LEYENDA')) == {TITULOS[2], TITULOS[5]}
    assert set(_tabla(cliente, con_reportes='true')) == {TITULOS[3]}
    detalle = cliente.get(f"{BASE}/{_tabla(cliente)[TITULOS[0]]['codigo']}").json()
    assert [r['autor']['codigo'] for r in detalle['reacciones'] if r['tipo'] is None] == ['ori-carmen']


def test_la_leyenda_dejo_sello_y_notificacion_a_sus_autores_y_la_oculta_no_la_ve_su_autora(ejemplos, monkeypatch):
    aplicacion, cliente = ejemplos
    with aplicacion.state.fabrica_sesiones() as sesion:
        for autor, entrevista in (('est-panel-8', TITULOS[2]), ('est-2024a-1', TITULOS[5])):
            cuenta = sesion.scalar(select(m.Cuenta).where(m.Cuenta.codigo == autor))
            tipos = set(sesion.scalars(select(m.EventoUso.tipo).where(m.EventoUso.cuenta_id == cuenta.id)))
            assert {'PUBLICA_ENTREVISTA', 'ENTREVISTA_DESTACADA', 'ENTREVISTA_LEYENDA'} <= tipos, entrevista
            assert sesion.scalar(select(m.Notificacion).where(
                m.Notificacion.cuenta_id == cuenta.id, m.Notificacion.tipo == 'ENTREVISTA_LEYENDA')) is not None
            investigacion = sesion.scalar(select(m.Investigacion).join(m.Entrevista, m.Entrevista.id == m.Investigacion.entrevista_id).where(
                m.Investigacion.cuenta_id == cuenta.id, m.Entrevista.titulo == entrevista))
            assert investigacion.estado == 'PUBLICADA'
    monkeypatch.setitem(ROLES, 'est-panel-5', m.Rol.ESTUDIANTE)
    oculta = _tabla(cliente)[TITULOS[4]]['codigo']
    assert cliente.get(f'/cuentas/est-panel-5/entrevistas/{oculta}').status_code == 404
