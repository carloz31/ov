"""Ajuste carga-actividades: el conjunto `contenido` carga el contenido real y lo provisional de `ruta`."""

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models as m
from app.database import crear_motor_bd
from datos import cargar as carga
from datos import contenido


@pytest.fixture(scope='module')
def base(tmp_path_factory):
    url = f'sqlite:///{(tmp_path_factory.mktemp("contenido") / "contenido.db").as_posix()}'
    conteos = carga.preparar_base(url, 'contenido', crear_tablas=True)
    motor = crear_motor_bd(url)
    with Session(motor) as sesion:
        yield conteos, sesion
    motor.dispose()


def test_carga_conteos(base):
    conteos, _ = base
    assert conteos['cuenta'] == 8
    assert conteos['actividad'] == 87 + 5  # 81 reales y los seis casos (ajuste carga-casos) + recuerdos de Lumi provisionales
    assert conteos['item_registro'] == 54


def test_actividades_bloques_y_propiedades(base):
    _, sesion = base
    actividades = {a.codigo: a for a in sesion.scalars(select(m.Actividad))}
    bloques = {b.id: b for b in sesion.scalars(select(m.Bloque))}
    assert {b.codigo for b in bloques.values()} == {'B0', 'B1', 'B2', 'B3', 'B4', 'B5', 'CIUDAD', 'LUMI', 'FAMILIA'}
    assert actividades['investigador-cierre'].tipo == m.TipoActividad.INFORMATIVA
    assert 'favoritos' not in actividades['b3-2'].descripcion
    assert all(a.contenido == a.codigo.replace('-', '_') for a in actividades.values())
    camino = {'B0', 'B1', 'B2', 'B3', 'B4', 'B5', 'FAMILIA'}
    opcionales = {'b2-6', 'b3-a', 'b3-b', 'b4-a', 'ma7-b', *(f'ma{n}' for n in range(1, 10))}
    for codigo, actividad in actividades.items():
        bloque = bloques[actividad.bloque_id].codigo
        esperada = bloque in camino and codigo not in opcionales
        assert actividad.requerida is esperada, codigo
    for codigo in (*opcionales, 'h1', 'h2', 'h3', 'investigador-cierre'):
        assert actividades[codigo].visibilidad == m.Visibilidad.AL_DESBLOQUEAR, codigo


def test_misiones_de_helena_partidas(base):
    _, sesion = base
    filas = sesion.execute(select(m.Actividad.codigo, m.ItemInstrumento.numero).join(
        m.ActividadItem, m.ActividadItem.actividad_id == m.Actividad.id).join(
        m.ItemInstrumento, m.ItemInstrumento.id == m.ActividadItem.item_id)).all()
    por_actividad = {}
    for codigo, numero in filas:
        por_actividad.setdefault(codigo, []).append(numero)
    rangos = {c: (min(n), max(n), len(n)) for c, n in por_actividad.items()}
    assert [rangos[f'h-inteligencias-{i}'] for i in range(1, 6)] == [
        (1, 7, 7), (8, 14, 7), (15, 21, 7), (22, 28, 7), (29, 35, 7)]
    assert [rangos[f'h-habilidades-{i}'][2] for i in range(1, 5)] == [6] * 4
    assert [rangos[f'h-intereses-{i}'][2] for i in range(1, 7)] == [10] * 6
    assert rangos['b0-3'] == rangos['b5-2'] == (1, 19, 19)


def test_fichas_con_temas_y_sin_la_carta_anunciada(base):
    _, sesion = base
    fichas = {f.codigo: f for f in sesion.scalars(select(m.Ficha))}
    assert len(fichas) == 31
    assert fichas['F20'].tema == 'Mis opciones' and fichas['FP03'].tema == 'Acompañar a mi hijo'
    assert fichas['FP01'].audiencia == m.Audiencia.APODERADO and fichas['F23'].audiencia == m.Audiencia.ESTUDIANTE
    assert 'carta para usted' not in fichas['FP08'].contenido
    assert all('####' not in f.contenido and not f.contenido.startswith('#') for f in fichas.values())


def test_podios_eligen_tres_de_su_lista(base):
    _, sesion = base
    items = {i.codigo: i for i in sesion.scalars(select(m.ItemRegistro))}
    for codigo in ('b2-3-valores', 'b4-2-criterios'):
        item = items[codigo]
        assert (item.eleccion_minima, item.eleccion_maxima, item.eleccion_ordenada, item.permite_otra) == (
            3, 3, True, False)
    sin_eleccion = [c for c, i in items.items() if c not in ('b2-3-valores', 'b4-2-criterios')]
    assert all(items[c].lista_id is None for c in sin_eleccion)
    assert not sesion.scalars(select(m.CriterioCompletitud)).all()


def test_referencias_de_los_json(base):
    _, sesion = base
    referencias = {r.codigo: r for r in sesion.scalars(select(m.Referencia))}
    assert len(referencias) == len(contenido.REFERENCIAS) == 31  # 30 de los JSON + la del diario
    items = {i.id: i.codigo for i in sesion.scalars(select(m.ItemRegistro))}
    assert items[referencias['b4-5-ref-criterios'].item_registro_id] == 'b4-2-criterios'
    lectura = {i.id: i.codigo for i in sesion.scalars(select(m.ItemInstrumento))}
    assert lectura[referencias['b3-8-ref-costos'].item_instrumento_id] == 'AUTO-12'
    assert lectura[referencias['b4-2-ref-decision'].item_instrumento_id] == 'AUTO-13'
