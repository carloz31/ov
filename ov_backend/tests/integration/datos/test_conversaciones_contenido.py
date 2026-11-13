"""Ajuste conversaciones: las diez conversaciones de `contenido`, sus reflexiones y las cifras corregidas."""

import re
from pathlib import Path

from sqlalchemy import select

from app import models as m
from datos import contenido


JSON_PLATAFORMA = Path(__file__).parents[4] / 'ov_frontend/src/data/activities/contenidos/plataforma'
# Salen b1-5-p05, las de b3-5 y las de ma7-b: los ajustes coherencia-bloque1, coherencia-bloque3 y
# coherencia-ma1-ma7 reemplazaron todo el banco de b1-5, de b3-5 y de ma7-b. Del banco nuevo de ma7-b se comprueba
# lo que dice su texto de observaciones: doce preguntas de F13, y la correcta tres veces en cada posición.
BANCO_MA7_B = [f'ma7-b-p{n:02d}' for n in range(1, 13)]


def test_carga_las_diez_conversaciones_completas(sesion_contenido):
    conversaciones = sesion_contenido.scalars(select(m.Conversacion).order_by(m.Conversacion.orden)).all()
    assert [(c.codigo, c.orden) for c in conversaciones] == [(f'conv-{n}', n) for n in range(1, 11)]
    for c in conversaciones:
        assert all((c.titulo, c.tema, c.pregunta_estudiante, c.pregunta_apoderado, c.mensaje_diferencias, c.algo_que_saben)), c.codigo
        assert len(c.preguntas_guia) == 3 and c.preguntas_guia[2].startswith('Actividad:'), c.codigo
    temas = [c.tema for c in conversaciones]
    assert temas[1] == temas[4] == 'Valores'


def test_no_carga_lo_provisional_de_ruta(sesion_contenido):
    codigos = set(sesion_contenido.scalars(select(m.Conversacion.codigo)))
    assert not {'t-conv-1', 't-conv-2'} & codigos
    preguntas = set(sesion_contenido.scalars(select(m.PreguntaDiario.codigo)))
    assert 't-diario-tras-conversar' not in preguntas
    # Ajuste cartas-diario: quedan dos cartas de conversaciones; salen las de conv-4 y conv-9.
    assert {'d-conv-fortalezas', 'd-conv-acompanar'} <= preguntas
    assert not {'d-conv-futuro', 'd-conv-condiciones'} & preguntas
    assert not any('t-conv' in str(fila) or 'tras-conversar' in str(fila) for fila in contenido.PROVISIONALES)


def test_las_reflexiones_son_desbloqueables_sin_dimension(sesion_contenido):
    preguntas = sesion_contenido.scalars(select(m.PreguntaDiario).where(m.PreguntaDiario.codigo.like('d-conv-%'))).all()
    assert len(preguntas) == 2
    for p in preguntas:
        assert p.uso == m.UsoPreguntaDiario.DESBLOQUEABLE and p.variantes is None and p.dimension_id is None, p.codigo


def test_ninguna_cifra_vieja_en_fichas_batallas_ni_json():
    textos = {'fichas': str(contenido.FICHAS), 'batallas': str(contenido.PREGUNTAS_BATALLA)}
    textos |= {f.name: f.read_text(encoding='utf-8') for f in JSON_PLATAFORMA.glob('*.json')}
    assert len(textos) > 50
    # «Siete de cada diez personas que trabajan» es la cifra vigente de informalidad, no la de inadecuación.
    inadecuacion = re.compile(r'siete de cada diez (peruanos con estudios|personas con estudios|profesionales)', re.IGNORECASE)
    for nombre, texto in textos.items():
        assert not inadecuacion.search(texto), nombre
        assert '85 %' not in texto and '75,7' not in texto, nombre


def test_el_banco_de_ma7_b_reparte_la_correcta_y_trae_explicacion():
    preguntas = [p for p in contenido.PREGUNTAS_BATALLA if p[1] == 'ma7-b']
    assert [p[0] for p in preguntas] == BANCO_MA7_B
    for codigo, _, ficha, enunciado, opciones, _, explicacion in preguntas:
        assert ficha == 'F13' and enunciado and len(opciones) == 4 and isinstance(explicacion, str) and explicacion, codigo
    assert sorted(p[5] for p in preguntas) == [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3]
