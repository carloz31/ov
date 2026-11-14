"""Auditoría del panel (H1): la pestaña Respuestas lee el contexto de hoy de cada ítem una vez por petición
(`LecturaContexto`) en lugar de `resolver_contexto` por ítem.

- `respuestas` y cada `respuestas/{actividad}` de los ocho estudiantes de ejemplo salen idénticas a las de la
  implementación anterior, guardadas en `respuestas_ejemplo.json` (generadas con `soporte_panel.respuestas_de_ejemplo`
  antes del cambio).
- Con los registros de `contenido` (marcadores, ecos y piezas), el número de consultas no crece con los registros
  respondidos ni con los compañeros del salón.

Los ocho estudiantes se siembran una vez por módulo (unos 40 s, con acciones reales)."""

import json
from pathlib import Path

import pytest
from sqlalchemy import select

from app import models as m
from app.main import crear_aplicacion
from soporte_acceso import ClienteConToken
from soporte_bases import copiar_plantilla
from soporte_consultas import ContadorConsultas
from soporte_llm import ClientePrueba
from soporte_panel import AHORA_EJEMPLO, nuevo_estudiante, respuestas_de_ejemplo, sembrar_ejemplo

ESPERADAS = Path(__file__).with_name('respuestas_ejemplo.json')
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


def test_respuestas_de_los_estudiantes_de_ejemplo_salen_identicas(ejemplos):
    _, cliente = ejemplos
    esperadas = json.loads(ESPERADAS.read_text(encoding='utf-8'))
    assert esperadas['ahora'] == AHORA_EJEMPLO.isoformat()
    leidas = json.loads(json.dumps(respuestas_de_ejemplo(cliente)))
    for estudiante, datos in esperadas['estudiantes'].items():
        assert leidas[estudiante]['respuestas'] == datos['respuestas'], estudiante
        distintos = [a for a, registro in datos['registros'].items() if leidas[estudiante]['registros'].get(a) != registro]
        assert not distintos, f'{estudiante}: {distintos}'
    assert leidas.keys() == esperadas['estudiantes'].keys()


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
