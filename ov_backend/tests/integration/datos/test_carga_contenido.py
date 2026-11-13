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
    # Ajuste registros (adaptación autorizada para `contenido`): salen b2-6, ma6, b4-a y ma9. Ajuste registros llm
    # (lote 2): los 19 registros tienen 29 ítems (22 de los requeridos y 7 de los opcionales).
    assert conteos['actividad'] == 83 + 5  # 77 reales y los seis casos (ajuste carga-casos) + recuerdos de Lumi provisionales
    assert conteos['item_registro'] == 29


def test_actividades_bloques_y_propiedades(base):
    _, sesion = base
    actividades = {a.codigo: a for a in sesion.scalars(select(m.Actividad))}
    bloques = {b.id: b for b in sesion.scalars(select(m.Bloque))}
    assert {b.codigo for b in bloques.values()} == {'B0', 'B1', 'B2', 'B3', 'B4', 'B5', 'CIUDAD', 'LUMI', 'FAMILIA'}
    assert actividades['investigador-cierre'].tipo == m.TipoActividad.INFORMATIVA
    assert 'favoritos' not in actividades['b3-2'].descripcion
    assert all(a.contenido == a.codigo.replace('-', '_') for a in actividades.values())
    camino = {'B0', 'B1', 'B2', 'B3', 'B4', 'B5', 'FAMILIA'}
    opcionales = {'b3-a', 'b3-b', 'ma7-b', *(f'ma{n}' for n in range(1, 10) if n not in (6, 9))}
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
    assert len(fichas) == 32
    assert fichas['F20'].tema == 'Mis opciones' and fichas['FP03'].tema == 'Acompañar a mi hijo'
    assert fichas['FP01'].audiencia == m.Audiencia.APODERADO and fichas['F23'].audiencia == m.Audiencia.ESTUDIANTE
    assert fichas['F24'].audiencia == m.Audiencia.ESTUDIANTE
    assert 'carta para usted' not in fichas['FP08'].contenido
    assert all('####' not in f.contenido and not f.contenido.startswith('#') for f in fichas.values())


def test_podios_eligen_tres_de_su_lista(base):
    _, sesion = base
    items = {i.codigo: i for i in sesion.scalars(select(m.ItemRegistro))}
    # Ajuste registros llm (lote 2): b4-2-criterios sale y b2-4-bien es un podio con «Otra».
    for codigo, otra in (('b2-3-valores', False), ('b2-4-bien', True)):
        item = items[codigo]
        assert (item.eleccion_minima, item.eleccion_maxima, item.eleccion_ordenada, item.permite_otra) == (
            3, 3, True, otra)
    # Ajuste registros (adaptación autorizada para `contenido`): todas las listas son comunes.
    listas = {l.id: l for l in sesion.scalars(select(m.ListaOpciones))}
    assert all(listas[i.lista_id].comun for i in items.values() if i.lista_id is not None)


def test_referencias_de_los_json(base):
    _, sesion = base
    referencias = {r.codigo: r for r in sesion.scalars(select(m.Referencia))}
    assert len(referencias) == len(contenido.REFERENCIAS)
    items = {i.id: i.codigo for i in sesion.scalars(select(m.ItemRegistro))}
    assert items[referencias['b3-4-ref-valores'].item_registro_id] == 'b2-3-valores'
    assert items[referencias['b5-3-ref-seguridad'].item_registro_id] == 'b5-1-seguridad'
    lectura = {i.id: i.codigo for i in sesion.scalars(select(m.ItemInstrumento))}
    assert lectura[referencias['b3-8-ref-costos'].item_instrumento_id] == 'AUTO-12'
    assert 'b4-2-ref-decision' not in referencias


# Ajuste carga-casos: los seis casos de la Central, con su escala y temática C, al final de la ciudad.
CASOS = {'c1': (6, 8, 15), 'c2': (8, 10, 18), 'c3': (6, 8, 15), 'c4': (6, 8, 15), 'c5': (6, 8, 15), 'c6': (8, 10, 18)}


def test_casos_de_la_central(base):
    _, sesion = base
    casos = {a.codigo: a for a in sesion.scalars(select(m.Actividad).where(m.Actividad.tipo == m.TipoActividad.CASO))}
    assert {c: (a.puntaje_minimo, a.puntaje_maximo, a.duracion_estimada_min) for c, a in casos.items()} == CASOS
    bloque = sesion.scalar(select(m.Bloque).where(m.Bloque.codigo == 'CIUDAD'))
    ciudad = sorted(sesion.scalars(select(m.Actividad).where(m.Actividad.bloque_id == bloque.id)),
                    key=lambda a: a.orden)
    assert [a.codigo for a in ciudad[-6:]] == list(CASOS)
    assert all(not a.requerida and a.visibilidad == 'SIEMPRE' and a.contenido == a.codigo for a in casos.values())
    tematicas = sesion.execute(select(m.Actividad.codigo, m.Tematica.codigo).join(
        m.ActividadTematica, m.ActividadTematica.actividad_id == m.Actividad.id).join(
        m.Tematica, m.Tematica.id == m.ActividadTematica.tematica_id)).all()
    assert sorted(tematicas) == [(c, 'C') for c in CASOS]


def test_testimonios_y_reglas_sin_t(base):
    _, sesion = base
    testimonios = dict(sesion.execute(select(m.Testimonio.codigo, m.Ocupacion.codigo).join(
        m.Ocupacion, m.Ocupacion.id == m.Testimonio.ocupacion_id)).all())
    # Ajuste testimonios: 11 de la Central (El festival da una sola) y 3 de actividades del puerto.
    assert set(testimonios) == ({f'tc{n}-{k}' for n in range(1, 7) for k in (1, 2)} - {'tc4-2'}) | {
        'tb3-1', 'tb3-8', 'tb3-10'}
    assert (testimonios['tc1-1'], testimonios['tc1-2']) == ('19-3091.00', '17-2051.00')
    nombrados = {str(c) for _, _, objetivo, _, condiciones in contenido.REGLAS
                 for c in (objetivo, *(condicion[1] for condicion in condiciones))}
    assert not {c for c in nombrados if c.startswith(('t-caso', 't-testimonio'))}


def test_testimonios_con_video_y_sin_codigos_antiguos(base):
    _, sesion = base
    testimonios = list(sesion.scalars(select(m.Testimonio)))
    assert len(testimonios) == 14 and all(t.video_id and t.persona and t.contexto for t in testimonios)
    assert not hasattr(m.Testimonio, 'anios_experiencia') and not hasattr(m.Testimonio, 'enlace')
    reglas = {r[0]: r for r in contenido.REGLAS}
    assert not {c for c in reglas if 'T05' in c or 'tc4-2' in c}
    assert not [r for r in contenido.REGLAS for c in r[4] if c[1] == 'T05' or r[2] == 'T05']
    assert {c: reglas[c][4] for c in ('R-tb3-1', 'R-tb3-8', 'R-tb3-10')} == {
        'R-tb3-1': (('COMPLETA_ACTIVIDAD', 'b3-1', 'EVENTOS', 1),),
        'R-tb3-8': (('COMPLETA_ACTIVIDAD', 'b3-8', 'EVENTOS', 1),),
        'R-tb3-10': (('COMPLETA_ACTIVIDAD', 'b3-10', 'EVENTOS', 1),)}


def test_ocupaciones_con_su_codigo_onet(base):
    _, sesion = base
    codigos = sesion.execute(select(m.Ocupacion.codigo, m.Ocupacion.codigo_onet)).all()
    assert codigos and all(codigo == onet for codigo, onet in codigos)
    assert not any(codigo.startswith('onet-') for codigo, _ in codigos)
    # Bombero (33-2011.00) tiene `en_catalogo = 0` en la curaduría: ya no se carga.
    assert '33-2011.00' not in {codigo for codigo, _ in codigos}
