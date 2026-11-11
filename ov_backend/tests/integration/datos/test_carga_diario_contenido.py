"""Ajuste cartas-diario: el diario de `contenido` (nueve cartas desbloqueables y doce preguntas del día)."""

import re

import pytest
from sqlalchemy import select

from app import models as m
from datos import cargar, contenido, fijos, ruta


DESBLOQUEABLES = {
    'd-llego': ('Cómo llego', 'b0-2'), 'd-voces': ('Las voces', 'b1-3'), 'd-nino': ('Carta al niño que fui', 'ma1'),
    'd-sale-gusta': ('Lo que me sale y lo que me gusta', 'b2-4'), 'd-no-se': ('Lo que todavía no sé', 'b3-4'),
    'd-moneda': ('La moneda', 'b4-5'), 'd-antes-de-salir': ('Antes de salir', 'b5-3'),
    'd-conv-fortalezas': ('Lo que vieron en mí', 'conv-6'), 'd-conv-acompanar': ('Cómo quiero que me acompañen', 'conv-10'),
}
ADAPTADAS = {'d-voces', 'd-sale-gusta', 'd-moneda', 'd-antes-de-salir'}


def test_las_nueve_desbloqueables_con_su_regla_y_las_doce_diarias(sesion_contenido):
    preguntas = {p.codigo: p for p in sesion_contenido.scalars(select(m.PreguntaDiario))}
    desbloqueables = {c: p for c, p in preguntas.items() if p.uso == m.UsoPreguntaDiario.DESBLOQUEABLE}
    diarias = [p for p in preguntas.values() if p.uso == m.UsoPreguntaDiario.DIARIA]
    assert {c: p.nombre for c, p in desbloqueables.items()} == {c: n for c, (n, _) in DESBLOQUEABLES.items()}
    assert {c for c, p in desbloqueables.items() if p.variantes} == ADAPTADAS
    assert len(diarias) == 12 and all(p.codigo.startswith('d-dia-') for p in diarias)
    assert all(p.nombre and p.pregunta.strip() and p.dimension_id is None and p.variantes is None for p in diarias)
    reglas = {r[2]: r for r in contenido.REGLAS if r[1] == 'PREGUNTA_DIARIO'}
    assert set(reglas) == set(DESBLOQUEABLES)
    for codigo, (_, fuente) in DESBLOQUEABLES.items():
        [(evento, referencia, *_)] = reglas[codigo][4]
        tipo = 'COMPLETA_CONVERSACION' if fuente.startswith('conv-') else 'COMPLETA_ACTIVIDAD'
        assert (evento, referencia) == (tipo, fuente), codigo
        if tipo == 'COMPLETA_ACTIVIDAD':
            assert reglas[codigo][0] == f'R-{codigo}'


def test_no_carga_nada_del_diario_de_ruta_ni_lo_que_salio(sesion_contenido):
    codigos = set(sesion_contenido.scalars(select(m.PreguntaDiario.codigo)))
    assert not {p[0] for p in ruta.PREGUNTAS_DIARIO} & codigos
    assert not {'d-conv-futuro', 'd-conv-condiciones'} & codigos
    reglas = {r[0] for r in contenido.REGLAS}
    assert not {'R-t-diario-fija', 'R-d-conv-futuro', 'R-d-conv-condiciones'} & reglas
    assert not any('Diario' in fila[0] for fila in contenido.PROVISIONALES)
    assert sesion_contenido.scalar(select(m.Referencia).where(m.Referencia.tipo == m.TipoReferencia.FAVORITOS)) is None


def test_los_huecos_de_cada_variante_tienen_de_donde_salir():
    for codigo in ADAPTADAS:
        variantes = contenido.VARIANTES_DIARIO[codigo]
        for variante in variantes['variantes']:
            assert set(re.findall(r'\{([a-z_]+)\}', variante['texto'])) <= set(variantes['huecos']), codigo
    personas = {o for o, _ in next(opciones for c, _, opciones in fijos.LISTAS_COMUNES if c == 'PERSONAS')}
    assert len(personas) == 8
    assert set(contenido.VARIANTES_DIARIO['d-voces']['huecos']['persona']['nombres']) == personas


def _con_variantes(monkeypatch, variantes):
    monkeypatch.setattr(contenido, 'VARIANTES_DIARIO', {**contenido.VARIANTES_DIARIO, **variantes})


@pytest.mark.parametrize('cambio,mensaje', [
    ({'d-voces': {'huecos': {}, 'variantes': (
        {'codigo': 'X', 'condiciones': ({'tipo': 'ELIGIO', 'item': 'b1-3-voz', 'opciones': ('NO_EXISTE',)},),
         'texto': 'x'},)}}, 'opciones inexistentes'),
    ({'d-voces': {'huecos': {}, 'variantes': (
        {'codigo': 'X', 'condiciones': ({'tipo': 'ELIGIO', 'item': 'b9-9', 'opciones': ('A',)},), 'texto': 'x'},)}},
     'no es un ítem con elección'),
    ({'d-voces': {'huecos': {}, 'variantes': (
        {'codigo': 'X', 'condiciones': ({'tipo': 'OPCION_INICIAL', 'valor': 'MISMA'},), 'texto': '{nada}'},)}},
     'huecos sin declarar'),
    ({'d-voces': {'huecos': {'persona': {'tipo': 'OPCION', 'item': 'b1-3-voz', 'nombres': {'MAMA': 'tu mamá'}}},
                  'variantes': ({'codigo': 'X', 'condiciones': ({'tipo': 'OPCION_INICIAL', 'valor': 'MISMA'},),
                                 'texto': '{persona}'},)}}, 'no cubren'),
    ({'d-moneda': {'huecos': {'x': {'tipo': 'MARCADOR', 'item': 'b4-5-moneda', 'marcador': 'primera'}},
                   'variantes': ({'codigo': 'X', 'condiciones': ({'tipo': 'OPCION_INICIAL', 'valor': 'MISMA'},),
                                  'texto': '{x}'},)}}, 'no responde con el marcador'),
    ({'d-dia-pesa': {'huecos': {}, 'variantes': (
        {'codigo': 'X', 'condiciones': ({'tipo': 'OPCION_INICIAL', 'valor': 'MISMA'},), 'texto': 'x'},)}},
     'no es DESBLOQUEABLE'),
])
def test_el_cargador_rechaza_variantes_mal_formadas(tmp_path, monkeypatch, cambio, mensaje):
    _con_variantes(monkeypatch, cambio)
    with pytest.raises(ValueError, match=mensaje):
        cargar.preparar_base(f'sqlite:///{(tmp_path / "variantes.db").as_posix()}', 'contenido', crear_tablas=True)
