"""Ajuste conversaciones: las diez conversaciones de `contenido`, sus reflexiones y las cifras corregidas."""

import re
from pathlib import Path

from sqlalchemy import select

from app import models as m
from datos import contenido


JSON_PLATAFORMA = Path(__file__).parents[4] / 'ov_frontend/src/data/activities/contenidos/plataforma'
# La posición de la correcta antes del ajuste: cambiar el texto no la mueve.
CORRECTAS = {'b1-5-p05': 1, 'b3-5-p06': 0, 'b3-5-p08': 2, 'ma7-b-p03': 0, 'ma7-b-p07': 3}


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
    assert {'d-conv-futuro', 'd-conv-fortalezas', 'd-conv-condiciones', 'd-conv-acompanar'} <= preguntas
    assert not any('t-conv' in str(fila) or 'tras-conversar' in str(fila) for fila in contenido.PROVISIONALES)


def test_las_reflexiones_son_desbloqueables_sin_dimension(sesion_contenido):
    preguntas = sesion_contenido.scalars(select(m.PreguntaDiario).where(m.PreguntaDiario.codigo.like('d-conv-%'))).all()
    assert len(preguntas) == 4
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


def test_las_batallas_tocadas_conservan_la_correcta_y_una_explicacion():
    preguntas = {p[0]: p for p in contenido.PREGUNTAS_BATALLA}
    for codigo, correcta in CORRECTAS.items():
        _, _, _, enunciado, opciones, posicion, explicacion = preguntas[codigo]
        assert posicion == correcta, codigo
        assert enunciado and len(opciones) == 4 and isinstance(explicacion, str) and explicacion, codigo
