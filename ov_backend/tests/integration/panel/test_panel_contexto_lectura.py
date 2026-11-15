"""Auditoría del panel (H1): la pestaña Respuestas arma el contexto de hoy de cada ítem con `LecturaContexto`, que lee
una vez por petición y repite sobre lo ya leído las reglas de marcadores y ecos de `registro/contexto.py`.

- Por cada ítem de registro de los ocho estudiantes de ejemplo, lo que arma `LecturaContexto` es igual a lo que da
  `resolver_contexto` llamado en vivo (las opciones, solo en los ítems de piezas: las demás no las arma). Si cambian
  las reglas del registro y el panel no, esta prueba falla.
- Con los registros de `contenido` (marcadores, ecos y piezas), el número de consultas no crece con los registros
  respondidos ni con los compañeros del salón.

Los ocho estudiantes se siembran una vez por módulo (unos 40 s, con acciones reales)."""

from dataclasses import replace

import pytest
from sqlalchemy import select

from app import models as m
from app.core.contexto import usar_contexto
from app.main import crear_aplicacion
from app.services.panel.contexto_lectura import LecturaContexto
from app.services.panel.perfil_respuestas import _items, _registros_en_orden
from app.services.registro.contexto import MarcadorSinValor, resolver_contexto
from app.services.registro.eleccion import FUENTES_PIEZAS
from soporte_acceso import ClienteConToken
from soporte_bases import copiar_plantilla
from soporte_consultas import ContadorConsultas
from soporte_llm import ClientePrueba
from soporte_panel import ESTUDIANTES_EJEMPLO, nuevo_estudiante, sembrar_ejemplo

PERFIL = '/cuentas/ori-carmen/panel/estudiantes'


@pytest.fixture(scope='module')
def ejemplos(plantilla_contenido, tmp_path_factory):
    aplicacion = crear_aplicacion(copiar_plantilla(
        plantilla_contenido, tmp_path_factory.mktemp('panel-ejemplos') / 'contenido.db'))
    aplicacion.state.cliente_llm = ClientePrueba()
    sembrar_ejemplo(aplicacion)
    try:
        with ClienteConToken(aplicacion) as cliente:
            yield aplicacion, cliente
    finally:
        aplicacion.state.motor_bd.dispose()


def _consultas(aplicacion, cliente, ruta):
    with ContadorConsultas(aplicacion.state.motor_bd) as contador:
        respuesta = cliente.get(ruta)
    assert respuesta.status_code == 200, respuesta.text
    return contador


@usar_contexto
def _items_de_registros(sesion):
    return [i for _, actividad, _ in _registros_en_orden(sesion) for i in _items(sesion, actividad.id)]


@usar_contexto
def _con_lectura(sesion, estudiante, items):
    lectura = LecturaContexto(sesion, estudiante, items)
    return {i.codigo: lectura.hoy(i) for i in items}


@usar_contexto
def _en_vivo(sesion, estudiante, item):
    try:
        return resolver_contexto(sesion, estudiante, item.codigo)
    except MarcadorSinValor:
        return None


def test_el_contexto_de_cada_item_es_el_de_resolver_contexto(ejemplos):
    aplicacion, _ = ejemplos
    distintos, comparados = [], 0
    with aplicacion.state.fabrica_sesiones() as sesion:
        items = _items_de_registros(sesion)
        assert any(i.fuente_opciones in FUENTES_PIEZAS for i in items)
        for codigo in ESTUDIANTES_EJEMPLO:
            estudiante = sesion.scalar(select(m.Cuenta).where(m.Cuenta.codigo == codigo))
            armados = _con_lectura(sesion, estudiante, items)
            for item in items:
                vivo = _en_vivo(sesion, estudiante, item)
                if vivo is not None and item.fuente_opciones not in FUENTES_PIEZAS:
                    vivo = replace(vivo, opciones=())  # la lectura del panel no arma las opciones de lista
                comparados += 1
                if armados[item.codigo] != vivo:
                    distintos.append(f'{codigo} · {item.codigo}')
    assert comparados == len(items) * len(ESTUDIANTES_EJEMPLO)
    assert not distintos, distintos


def _con_companeros(aplicacion):
    """DATO DE PRUEBA: diez compañeros más en 5A (solo una vez por módulo)."""
    with aplicacion.state.fabrica_sesiones() as sesion:
        existentes = set(sesion.scalars(select(m.Cuenta.codigo).where(m.Cuenta.codigo.like('est-companero-%'))))
        for i in range(10):
            if f'est-companero-{i}' not in existentes:
                nuevo_estudiante(sesion, f'est-companero-{i}', f'Compañero {i}')
        sesion.commit()


def test_respuestas_no_crece_con_los_registros_respondidos_ni_con_el_salon(ejemplos):
    """Caso 5 (a mitad: 20 ítems respondidos) frente al caso 7 (terminó: 22, con los de B5); y el caso 5 otra vez
    con diez compañeros más."""
    aplicacion, cliente = ejemplos
    a_mitad = _consultas(aplicacion, cliente, f'{PERFIL}/est-panel-5/respuestas')
    termino = _consultas(aplicacion, cliente, f'{PERFIL}/est-panel-7/respuestas')
    assert termino.cantidad == a_mitad.cantidad, termino.diagnostico
    _con_companeros(aplicacion)
    assert _consultas(aplicacion, cliente, f'{PERFIL}/est-panel-5/respuestas').cantidad == a_mitad.cantidad


@pytest.mark.parametrize('actividad', ['b1-3', 'b4-1', 'b4-5'])
def test_un_registro_desplegado_no_crece_con_lo_respondido_ni_con_el_salon(ejemplos, actividad):
    """El mismo registro de los casos 5 y 7 (con sus ecos y piezas) y, después, con diez compañeros más."""
    aplicacion, cliente = ejemplos
    caso_5 = _consultas(aplicacion, cliente, f'{PERFIL}/est-panel-5/respuestas/{actividad}')
    caso_7 = _consultas(aplicacion, cliente, f'{PERFIL}/est-panel-7/respuestas/{actividad}')
    assert caso_7.cantidad == caso_5.cantidad, caso_7.diagnostico
    _con_companeros(aplicacion)
    assert _consultas(aplicacion, cliente, f'{PERFIL}/est-panel-5/respuestas/{actividad}').cantidad == caso_5.cantidad
