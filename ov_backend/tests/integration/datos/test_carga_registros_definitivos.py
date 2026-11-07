"""Ajuste registros §4.1 y §4.4: integridad de los registros definitivos del conjunto `contenido` y su coherencia con
los JSON del front."""

from pathlib import Path

import pytest
from sqlalchemy import select

from app import models as m
from datos import contenido
from scripts import verificar_contenido_front


ADMITEN_ABIERTO = {'b1-7-hito', 'b2-4-antes', 'b4-1-respalda', 'b4-1-menos', 'b4-2-estilo', 'b5-1-senal',
                   'b5-3-inicial'}
REGISTROS = {'b1-1', 'b1-3', 'b1-6', 'b1-7', 'b2-3', 'b2-4', 'h1', 'h2', 'h3', 'b3-4', 'b4-1', 'b4-2', 'b4-5', 'b5-1',
             'b5-3', 'ma3', 'ma4', 'b3-a', 'ma8'}
RETIRADOS = {'b2-6', 'ma6', 'b4-a', 'ma9'}


@pytest.fixture
def items(sesion_contenido):
    return {i.codigo: i for i in sesion_contenido.scalars(select(m.ItemRegistro))}


def test_los_registros_son_los_definitivos(sesion_contenido):
    actividades = {a.codigo: a for a in sesion_contenido.scalars(select(m.Actividad))}
    registros = {c for c, a in actividades.items() if a.tipo == m.TipoActividad.REGISTRO}
    assert registros == REGISTROS
    assert not RETIRADOS & set(actividades)
    assert not any(str(r[1][1]) in RETIRADOS or str(r[3]) in RETIRADOS for r in contenido.REFERENCIAS)
    assert not any(r[2] in RETIRADOS or any(c[1] in RETIRADOS for c in r[4]) for r in contenido.REGLAS)
    assert actividades['b5-3'].maximo_seguimientos == 1
    assert {a.maximo_seguimientos for c, a in actividades.items() if c != 'b5-3'} == {2}


def test_listas_sin_pendientes_y_texto_sensible(sesion_contenido):
    listas = {l.codigo: l for l in sesion_contenido.scalars(select(m.ListaOpciones))}
    assert not any('PENDIENTE' in l.codigo or not l.comun for l in listas.values())
    for codigo in ('HABILIDADES', 'PERSONAS', 'MITOS', 'AREAS_VIDA', 'RUTAS', 'DIFICULTADES', 'VALORES',
                   'CURSOS_ACTIVIDADES', 'LUGARES', 'ASPECTOS_CARRERA', 'CRITERIOS', 'POR_EXPLORAR',
                   'DIMENSIONES_PERFIL', 'ESTILOS'):
        assert codigo in listas, codigo
    assert not {'RASGOS', 'CONTEXTOS', 'INFLUENCIAS', 'PARTES_VIAJE'} & set(listas)
    sensible = sesion_contenido.scalar(select(m.TextoFijo).where(m.TextoFijo.codigo == 'LUMI_SENSIBLE'))
    assert sensible.texto.startswith('Gracias por contarme esto.')


def test_cada_item_con_criterio_tiene_su_seguimiento_completo(sesion_contenido, items):
    con_criterio = {c.item_registro_id for c in sesion_contenido.scalars(select(m.CriterioCompletitud))}
    assert len(items) == 44 and len(con_criterio) == 40
    for codigo, item in items.items():
        seguimiento = item.seguimiento
        if item.id not in con_criterio:
            assert seguimiento is None, codigo
            continue
        assert seguimiento['que_busca'] and seguimiento['texto_base'], codigo
        assert len(seguimiento['cumple']) >= 2 and len(seguimiento['no_cumple']) >= 2, codigo
        assert bool(seguimiento.get('admite_abierto')) == (codigo in ADMITEN_ABIERTO), codigo
    assert items['b5-1-decision'].seguimiento['max_repreguntas'] == 2


def test_ecos_llm_son_referencias_de_la_actividad_o_items_anteriores(sesion_contenido, items):
    referencias = {r.codigo: r for r in sesion_contenido.scalars(select(m.Referencia))}
    for codigo, item in items.items():
        for tipo, fuente in (item.seguimiento or {}).get('ecos_llm', ()):
            if tipo == 'REFERENCIA':
                assert referencias[fuente].actividad_id == item.actividad_id, (codigo, fuente)
            else:
                anterior = items[fuente]
                assert anterior.actividad_id == item.actividad_id and anterior.orden < item.orden, (codigo, fuente)


def test_eleccion_minimos_opciones_propias_y_premarcado(items):
    exclusivas_con_criterio_nulo = 0
    for codigo, item in items.items():
        if item.fuente_opciones is None:
            continue
        # Ningún mínimo de selección mayor que 1 salvo los podios (exactamente 3 sobre 9).
        assert item.eleccion_minima <= 1 or (item.eleccion_ordenada and item.eleccion_minima == item.eleccion_maxima == 3), codigo
        for opcion in item.opciones_propias or ():
            # Con criterio: heredado (sin `criterio`, en un ítem con seguimiento) o informado.
            criterio = opcion.get('criterio', 'HEREDA')
            con_criterio = (criterio == 'HEREDA' and item.seguimiento is not None) or criterio not in (None, 'HEREDA')
            if 'criterio' in opcion and opcion['criterio'] is not None:
                assert opcion['que_busca'] and opcion['texto_base'], (codigo, opcion['codigo'])
            if con_criterio and opcion.get('pregunta_propia'):
                assert opcion.get('texto_base'), (codigo, opcion['codigo'])
            exclusivas_con_criterio_nulo += 'criterio' in opcion and opcion['criterio'] is None
    assert exclusivas_con_criterio_nulo == 11
    assert items['b1-3-contraste'].premarcar_si == {'item': 'b1-3-voz', 'opcion': 'NADIE', 'marca': 'SIN_COMPARAR'}
    # h1 y h2: dimensiones del instrumento, sin «otra».
    assert not any(items[c].permite_otra for c in ('h1-habilidad', 'h2-reconozco', 'h2-no-refleja'))


def test_cartas_del_diario_con_su_respaldo(sesion_contenido):
    preguntas = {p.codigo: p for p in sesion_contenido.scalars(select(m.PreguntaDiario))}
    for codigo in ('C1', 'C2', 'C3', 'C4', 'C5', 'C6'):
        assert preguntas[codigo].personalizada and preguntas[codigo].uso == m.UsoPreguntaDiario.DESBLOQUEABLE
    assert preguntas['C2'].respaldo_si == {'item': 'b3-4-cambia', 'opcion': 'NADA'}
    assert all(preguntas[c].respaldo_si is None for c in ('C1', 'C3', 'C4', 'C5', 'C6'))


def test_coherencia_con_los_json_del_front():
    front = Path(__file__).resolve().parents[4] / 'ov_frontend'
    errores, _ = verificar_contenido_front.verificar(front)
    assert errores == []
