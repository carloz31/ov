"""Invariantes de `ruta`: datos marcados, códigos `t-` y desbloqueos que no retroceden."""

import ast
from pathlib import Path

from soporte_ruta import RECORRIDO, actividades, completar, estado, eventos, filas_base
from sqlalchemy import select
from app import models as modelos
from datos import ruta


RAIZ = Path(__file__).resolve().parents[4]


def test_ruta_marcada_y_fijos_sin_marca():
    assert 'DATO DE PRUEBA' in ast.get_docstring(ast.parse((RAIZ / 'datos' / 'ruta.py').read_text(encoding='utf-8')))
    assert 'DATO DE PRUEBA' not in (RAIZ / 'datos' / 'fijos.py').read_text(encoding='utf-8')


def test_codigos_nombran_la_mecanica():
    codigos = [c for c, *_ in ruta.ACTIVIDADES + ruta.FICHAS + ruta.CONVERSACIONES + ruta.INSIGNIAS]
    assert all(c.startswith('t-') for c in codigos)
    assert {c for c, *_ in ruta.CUENTAS} == {'est-ana', 'est-luis', 'est-beto', 'apo-rosa'}


def test_desbloqueos_y_nivel_no_retroceden(cliente, aplicacion):
    anteriores, nivel = {}, 1
    for codigo in RECORRIDO + ('t-inicio', 't-expectativas'):
        completar(cliente, codigo)
        with aplicacion.state.fabrica_sesiones() as sesion:
            actuales = {(d.cuenta_id, d.regla_id): (d.id, d.fecha_hora, d.visto)
                        for d in sesion.scalars(select(modelos.Desbloqueo))}
        assert anteriores.items() <= actuales.items()
        assert len(actuales) == len(filas_base(aplicacion)['desbloqueo'])
        actual = estado(cliente)['nivel_actual']['numero']
        assert actual >= nivel
        anteriores, nivel = actuales, actual
    historial = eventos(cliente)
    assert sum(e['tipo'] == 'COMPLETA_BLOQUE' and e['referencia'] == 'T0' for e in historial) == 1
    assert sum(e['tipo'] == 'COMPLETA_BLOQUE' and e['referencia'] == 'T1' for e in historial) == 1
    assert actividades(cliente)['t-expectativas'] == 'COMPLETADA'
    assert eventos(cliente, 'est-luis') == [] and estado(cliente, 'est-luis')['nivel_actual']['numero'] == 1
    familia, = estado(cliente, 'apo-rosa')['bloques']
    assert [a['codigo'] for a in familia['actividades']] == ['t-apo-1', 't-apo-carta']
