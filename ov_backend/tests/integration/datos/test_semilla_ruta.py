"""Semilla de la ruta mínima con lo fijo."""

import pytest
from soporte_datos_aprobados import ENUNCIADOS_RIASEC
from soporte_ruta import MISIONES_INTERESES, avanzar, filas_base, pedir
from sqlalchemy import func, select, text
from app import models as modelos
from app.main import crear_aplicacion
from app.models.base import Base
from datos import catalogo as datos_catalogo
from datos import ruta as semilla_ruta
from datos.cargar import preparar_base
from datos.fijos import validar_distribucion_items



def test_catalogo_estructura_y_estado_vacio(sesion, aplicacion):
    esperados = {'colegio': 1, 'salon': 2, 'cuenta': 8, 'orientadora_salon': 1, 'vinculo_familiar': 2, 'bloque': 6,
        # Ajuste mochila: t-caso-2, t-ficha-3, t-testimonio-3 y 4, sus reglas y la condición extra de t-testimonio-2.
        # Ajuste carga-instrumentos: t-mision-inteligencias y t-mision-habilidades, con sus instrumentos reales.
        'actividad': 31, 'seccion': 8, 'presentacion': 18, 'ficha': 4, 'testimonio': 4, 'conversacion': 2, 'grupo_insignia': 2, 'insignia': 7, 'nivel': 3,
        'regla_desbloqueo': 58, 'condicion_desbloqueo': 65, 'pregunta_diario': 8,
        'instrumento': 4, 'escala_respuesta': 4, 'opcion_escala': 14, 'dimension': 23,
        'item_instrumento': 138, 'actividad_item': 157, 'aplicacion': 5, 'aplicacion_actividad': 6,
        # Ajuste catalogo-datos-reales: el catálogo real (603 carreras tras fusionar 5 duplicadas por tilde,
        # 706 instituciones con carreras) y la relación provisional al azar. Ajuste carga-casos: 245
        # ocupaciones, solo las curadas (sin ocultas; 10 militares sin puntajes), y sus familias.
        'ocupacion': 245, 'puntaje_ocupacion': 1410, 'familia_carrera': 89, 'carrera': 603,
        # Ajuste registros: 14 listas comunes de los registros y 4 opciones nuevas en DIFICULTADES (de `fijos`).
        # Ajuste registros llm (lote 2): salen 8 listas (6 de los registros y las 2 de dimensiones), ESTILOS pasa a
        # 9 opciones y no hay criterios.
        'ocupacion_familia': 341, 'lista_opciones': 19, 'opcion_lista': 123, 'item_registro': 17,
        # ajuste llm-sugerencias: DIFICULTADES sin SALUD; ajuste cartas-diario: salen las dos referencias de
        # preguntas del diario
        'referencia': 12, 'tematica': 5,
        'actividad_tematica': 6, 'pregunta_batalla': 14, 'salon_instrumento': 1, 'salon_actividad_prioritaria': 1,
        'high_point': 614, 'tipo_carrera': 14, 'ubicacion': 26, 'institucion': 706, 'institucion_carrera': 3597,
        'grupo_ocupacional': 23, 'estilo_trabajo': 21, 'ingreso_familia': 716, 'ingreso_institucion': 1096,
        'seccion_tarjeta': 4, 'referencia_rubro': 6, 'referencia_camino': 6,
        # Ajuste llm-sugerencias: un paso de respaldo por opción de las tres listas (sale SALUD de DIFICULTADES).
        'respaldo_paso': 16,
        # B13: catálogos de investigaciones.
        'pregunta_base_guion': 4, 'tipo_reaccion': 4,
        # Ajuste registros: `t-referencia` (3 ítems y 2 referencias) y `LUMI_SENSIBLE`.
        # LUMI_SENSIBLE; ajuste registros llm (lote 2): los 49 textos de las piezas (4 grupos, 27 orígenes y las 18
        # frases de los tres tests); lote 3: sale PISTA_SIN_REPREGUNTA y entran LUMI_EMOCIONAL y LUMI_SIN_EVALUAR.
        'texto_fijo': 52}
    # Ajuste registros llm (lote 2): salen `criterio_completitud`, `turno_seguimiento` y `evaluacion_respuesta`.
    # Ajuste llm-sugerencias: entra `respaldo_paso`.
    assert len(Base.metadata.tables) == 94
    for tabla in Base.metadata.sorted_tables:
        assert sesion.scalar(select(func.count()).select_from(tabla)) == esperados.get(tabla.name, 0), tabla.name
    assert set(sesion.scalars(select(modelos.Bloque.codigo))) == {'T0', 'T1', 'T2', 'CIUDAD', 'FAMILIA', 'LUMI'}
    assert sesion.scalars(select(modelos.Instrumento.codigo).order_by(modelos.Instrumento.codigo)).all() == [
        'TEST-HABILIDADES', 'TEST-INTELIGENCIAS', 'TEST-PARTIDA-LLEGADA', 'TEST-RIASEC']
    assert sesion.execute(text('PRAGMA foreign_key_check')).all() == []
    # Ajuste carga-casos: el código de la ocupación es su O*NET y solo se cargan las del catálogo.
    codigos = dict(sesion.execute(select(modelos.Ocupacion.codigo_onet, modelos.Ocupacion.codigo)).all())
    assert all(codigo == onet for onet, codigo in codigos.items())
    assert '33-2011.00' not in codigos
    archivo = {o.codigo_onet: o.puntajes for o in datos_catalogo.leer_catalogo().ocupaciones if o.puntajes}
    puntajes = list(sesion.execute(select(modelos.Ocupacion.codigo_onet, modelos.Dimension.codigo, modelos.PuntajeOcupacion.valor)
        .join(modelos.PuntajeOcupacion, modelos.PuntajeOcupacion.ocupacion_id == modelos.Ocupacion.id)
        .join(modelos.Dimension, modelos.Dimension.id == modelos.PuntajeOcupacion.dimension_id)))
    assert all(valor == archivo[onet]['RIASEC'.index(d)] for onet, d, valor in puntajes)
    assert 'drone-operator' not in codigos.values()


def test_riasec_enunciados_y_distribucion_exactos(sesion, cliente):
    validar_distribucion_items(sesion)
    enunciados = ENUNCIADOS_RIASEC
    todos = []
    for actividad in MISIONES_INTERESES:
        items = pedir(cliente, 'GET', f'/actividades/{actividad}/items')
        assert [i['orden'] for i in items] == list(range(1, 31))
        todos.extend(items)
    assert [i['numero'] for i in todos] == list(range(1, 61))
    assert [i['codigo'] for i in todos] == [f'RIASEC-{n:02}' for n in range(1, 61)]
    assert [i['dimension'] for i in todos] == list('RRIIAASSEECC' * 5)
    assert all(i['enunciado'] == enunciados[i['dimension']][2 * ((i['numero'] - 1) // 12) + (i['numero'] - 1) % 2]
               for i in todos)
    assert all(i['inverso'] is False for i in todos)
    assert [(o['orden'], o['puntaje']) for o in todos[0]['escala']['opciones']] == [(1, 0), (2, 1), (3, 2), (4, 3), (5, 4)]
    assert pedir(cliente, 'GET', '/actividades/t-inicio/items') == []


@pytest.mark.parametrize('fallo', ['ausente', 'invalido', 'referencia_ausente'])
def test_catalogo_erroneo_revierte_carga_explicita(cliente, aplicacion, tmp_path, monkeypatch, fallo):
    avanzar(cliente, 't-inicio')
    antes = filas_base(aplicacion)
    cache = aplicacion.state.motor_bd.cache_definiciones.actual
    if fallo == 'referencia_ausente':
        original = datos_catalogo.leer_catalogo
        # Ajuste carga-casos: sin ocupaciones ocultas, la referencia que falta es la de un testimonio.
        def sin_arqueologo(carpeta=None):
            catalogo = original(carpeta)
            catalogo.ocupaciones = [o for o in catalogo.ocupaciones if o.codigo_onet != '19-3091.00']
            return catalogo
        monkeypatch.setattr(datos_catalogo, 'leer_catalogo', sin_arqueologo)
        mensaje = 'El testimonio t-testimonio-1 apunta a una ocupación inexistente: 19-3091.00'
    else:
        carpeta = tmp_path / 'catalogo'
        carpeta.mkdir()
        for archivo in datos_catalogo.CARPETA_CATALOGO.glob('*.csv'):
            (carpeta / archivo.name).write_bytes(archivo.read_bytes())
        if fallo == 'invalido':
            (carpeta / 'instituciones.csv').write_text('id,nombre\n1,Sin columnas\n', encoding='utf-8')
            mensaje = ('instituciones.csv: faltan las columnas tipo_institucion_id, institucion_nombre, departamento, '
                       'distrito, tipo_gestion_nombre, direccion, pagina_web')
        else:
            (carpeta / 'carreras_mtpe.csv').unlink()
            mensaje = f'Falta el archivo del catálogo: {carpeta / "carreras_mtpe.csv"}'
        monkeypatch.setattr(datos_catalogo, 'CARPETA_CATALOGO', carpeta)
    with pytest.raises(ValueError) as error:
        preparar_base(str(aplicacion.state.motor_bd.url), 'ruta', vaciar=True)
    assert str(error.value) == mensaje
    assert filas_base(aplicacion) == antes
    assert aplicacion.state.motor_bd.cache_definiciones.actual is cache
    url = f'sqlite:///{(tmp_path / "carga_fallida.db").as_posix()}'
    with pytest.raises(ValueError) as error:
        preparar_base(url, 'ruta', crear_tablas=True)
    assert str(error.value) == mensaje
    nueva = crear_aplicacion(url)
    assert all(filas == [] for filas in filas_base(nueva).values())
    nueva.state.motor_bd.dispose()


def test_fallo_tardio_revierte_carga_y_conserva_cache(cliente, aplicacion, monkeypatch, tmp_path):
    avanzar(cliente, 't-cierre-inicio')
    antes = filas_base(aplicacion)
    cache = aplicacion.state.motor_bd.cache_definiciones.actual
    def fallar(sesion):
        raise ValueError('Fallo después de cargar los datos')
    monkeypatch.setattr(semilla_ruta, 'validar_distribucion_items', fallar)
    with pytest.raises(ValueError, match='Fallo después'):
        preparar_base(str(aplicacion.state.motor_bd.url), 'ruta', vaciar=True)
    assert filas_base(aplicacion) == antes
    assert aplicacion.state.motor_bd.cache_definiciones.actual is cache
    url = f'sqlite:///{(tmp_path / "fallo_tardio.db").as_posix()}'
    with pytest.raises(ValueError, match='Fallo después'):
        preparar_base(url, 'ruta', crear_tablas=True)
    nueva = crear_aplicacion(url)
    assert all(f == [] for f in filas_base(nueva).values())
    nueva.state.motor_bd.dispose()
