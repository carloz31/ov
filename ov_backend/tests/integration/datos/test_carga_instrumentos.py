"""Ajuste carga-instrumentos: los instrumentos reales y sus textos."""

from collections import Counter

from sqlalchemy import select

from app import models as modelos


def instrumento(sesion, codigo):
    return sesion.scalar(select(modelos.Instrumento).where(modelos.Instrumento.codigo == codigo))


def items(sesion, codigo):
    return sesion.execute(select(modelos.ItemInstrumento, modelos.Dimension.codigo).join(
        modelos.Dimension, modelos.Dimension.id == modelos.ItemInstrumento.dimension_id,
    ).where(modelos.ItemInstrumento.instrumento_id == instrumento(sesion, codigo).id).order_by(
        modelos.ItemInstrumento.numero)).all()


def opciones(sesion, escala):
    return [(o.orden, o.etiqueta, o.puntaje) for o in sesion.scalars(select(modelos.OpcionEscala).join(
        modelos.EscalaRespuesta).where(modelos.EscalaRespuesta.codigo == escala).order_by(modelos.OpcionEscala.orden))]


def dimensiones(sesion, codigo):
    return list(sesion.scalars(select(modelos.Dimension).where(
        modelos.Dimension.instrumento_id == instrumento(sesion, codigo).id).order_by(modelos.Dimension.orden)))


def test_ningun_instrumento_queda_sin_lectura(sesion):
    # El `server_default ''` de la columna es solo para la migración: `fijos` llena todas.
    assert all(i.lectura.strip() for i in sesion.scalars(select(modelos.Instrumento)))


def test_inteligencias_35_items_siete_dimensiones_de_cinco(sesion):
    filas = items(sesion, 'TEST-INTELIGENCIAS')
    assert [i.codigo for i, _ in filas] == [f'INTEL-{n:02}' for n in range(1, 36)]
    assert [i.numero for i, _ in filas] == list(range(1, 36))
    assert not any(i.inverso for i, _ in filas)
    assert [d.codigo for d in dimensiones(sesion, 'TEST-INTELIGENCIAS')] == [
        'INT-LIN', 'INT-LOG', 'INT-ESP', 'INT-CIN', 'INT-MUS', 'INT-INTRA', 'INT-INTER']
    assert Counter(d for _, d in filas) == {d: 5 for d in (
        'INT-LIN', 'INT-LOG', 'INT-ESP', 'INT-CIN', 'INT-MUS', 'INT-INTRA', 'INT-INTER')}
    # La hoja de corrección: algunas filas por inteligencia.
    por_numero = {i.numero: d for i, d in filas}
    assert [por_numero[n] for n in (1, 2, 3, 5, 8, 9, 12)] == [
        'INT-ESP', 'INT-INTRA', 'INT-MUS', 'INT-LOG', 'INT-CIN', 'INT-LIN', 'INT-INTER']
    assert opciones(sesion, 'ESC-VERDAD3') == [(1, 'Falso', 0), (2, 'No estoy seguro', 0.5), (3, 'Verdadero', 1)]
    assert instrumento(sesion, 'TEST-INTELIGENCIAS').tipo_resultado == modelos.TipoResultado.DESTACADAS


def test_habilidades_24_items_con_cuatro_inversos(sesion):
    filas = items(sesion, 'TEST-HABILIDADES')
    assert [i.codigo for i, _ in filas] == [f'HSOC-{n:02}' for n in range(1, 25)]
    assert {i.numero for i, _ in filas if i.inverso} == {3, 5, 8, 20}
    assert Counter(d for _, d in filas) == {'HS-ASE': 5, 'HS-EMP': 5, 'HS-EXP': 5, 'HS-RES': 4, 'HS-LID': 5}
    assert opciones(sesion, 'ESC-CASI2') == [(1, 'Casi nunca', 0), (2, 'Casi siempre', 1)]
    assert instrumento(sesion, 'TEST-HABILIDADES').tipo_resultado == modelos.TipoResultado.DESTACADAS


def test_cuatro_piezas_por_dimension(sesion):
    for codigo in ('TEST-INTELIGENCIAS', 'TEST-HABILIDADES'):
        assert all(d.descripcion and d.ejemplos and 3 <= len(d.fortalezas) <= 4 and 2 <= len(d.desarrollo) <= 3
                   for d in dimensiones(sesion, codigo)), codigo
    # Un interés no se «desarrolla».
    riasec = dimensiones(sesion, 'TEST-RIASEC')
    assert all(d.ejemplos and len(d.fortalezas) == 4 and d.desarrollo == [] for d in riasec)
    assert all(d.ejemplos is None and d.fortalezas == [] and d.desarrollo == []
               for d in dimensiones(sesion, 'TEST-PARTIDA-LLEGADA'))


def test_riasec_real_con_el_patron_de_onet(sesion):
    filas = items(sesion, 'TEST-RIASEC')
    por_numero = {i.numero: (d, i.enunciado) for i, d in filas}
    # k-ésimo de cada tipo en 12·⌊(k−1)/2⌋ + 2·pos + (k−1) mod 2 + 1.
    assert por_numero[1] == ('R', 'Construir gabinetes de cocina')
    assert por_numero[2] == ('R', 'Conducir un camión para entregar paquetes a oficinas y casas')
    assert por_numero[13] == ('R', 'Colocar ladrillos o baldosas')
    assert por_numero[3] == ('I', 'Desarrollar un nuevo medicamento')
    assert por_numero[60] == ('C', 'Clasificar, ordenar y distribuir correspondencia en una organización')
    riasec = instrumento(sesion, 'TEST-RIASEC')
    assert (riasec.nombre, riasec.descripcion) == (
        'Test de intereses', 'Descubre qué tipo de actividades te atraen y qué ocupaciones se parecen a ti.')
