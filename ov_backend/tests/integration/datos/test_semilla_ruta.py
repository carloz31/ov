"""Semilla de la ruta mínima con lo fijo."""

import pytest
from soporte_datos_aprobados import ENUNCIADOS_RIASEC, OCUPACIONES_APROBADAS
from soporte_ruta import MISIONES_INTERESES, avanzar, filas_base, pedir
from sqlalchemy import func, select, text
from app import models as modelos
from app.main import crear_aplicacion
from app.models.base import Base
from datos import ocupaciones as datos_ocupaciones
from datos import fijos
from datos import ruta as semilla_ruta
from datos.cargar import preparar_base
from datos.ocupaciones import leer_ocupaciones, validar_distribucion_items



def test_catalogo_estructura_y_estado_vacio(sesion, aplicacion):
    esperados = {'salon': 2, 'cuenta': 5, 'orientadora_salon': 1, 'vinculo_familiar': 1, 'bloque': 6,
        'actividad': 25, 'seccion': 6, 'presentacion': 18, 'ficha': 3, 'testimonio': 2, 'conversacion': 2, 'grupo_insignia': 2, 'insignia': 5, 'nivel': 3,
        'regla_desbloqueo': 49, 'condicion_desbloqueo': 55, 'pregunta_diario': 8,
        'instrumento': 2, 'escala_respuesta': 2, 'opcion_escala': 9, 'dimension': 11,
        'item_instrumento': 79, 'actividad_item': 98, 'aplicacion': 3, 'aplicacion_actividad': 4,
        'ocupacion': 36, 'puntaje_ocupacion': 216, 'familia_carrera': 6, 'carrera': 6,
        'carrera_ocupacion': 23, 'lista_opciones': 12, 'opcion_lista': 66, 'item_registro': 12,
        'criterio_completitud': 10, 'referencia': 11, 'tematica': 5,
        'actividad_tematica': 6, 'actividad_dimension': 2, 'pregunta_batalla': 14, 'salon_instrumento': 1, 'salon_actividad_prioritaria': 1,
        'high_point': 72, 'tipo_carrera': 11, 'ubicacion': 2, 'institucion': 3, 'institucion_carrera': 6,
        'ingreso_carrera': 2, 'rango_ingreso': 5,
        'seccion_tarjeta': 4, 'referencia_rubro': 6, 'referencia_camino': 6}
    assert len(Base.metadata.tables) == 84
    for tabla in Base.metadata.sorted_tables:
        assert sesion.scalar(select(func.count()).select_from(tabla)) == esperados.get(tabla.name, 0), tabla.name
    assert set(sesion.scalars(select(modelos.Bloque.codigo))) == {'T0', 'T1', 'T2', 'CIUDAD', 'FAMILIA', 'LUMI'}
    assert sesion.scalars(select(modelos.Instrumento.codigo).order_by(modelos.Instrumento.codigo)).all() == ['TEST-PARTIDA-LLEGADA', 'TEST-RIASEC']
    assert sesion.execute(text('PRAGMA foreign_key_check')).all() == []
    ocupaciones = OCUPACIONES_APROBADAS
    assert set(sesion.execute(select(modelos.Ocupacion.codigo, modelos.Ocupacion.titulo, modelos.Ocupacion.codigo_onet))) == ocupaciones
    excel = {fila.codigo_onet: fila.valores for fila in leer_ocupaciones(datos_ocupaciones.RUTA_OCUPACIONES)}
    puntajes = list(sesion.execute(select(modelos.Ocupacion.codigo_onet, modelos.Dimension.codigo, modelos.PuntajeOcupacion.valor)
        .join(modelos.PuntajeOcupacion, modelos.PuntajeOcupacion.ocupacion_id == modelos.Ocupacion.id)
        .join(modelos.Dimension, modelos.Dimension.id == modelos.PuntajeOcupacion.dimension_id)))
    assert all(valor == excel[onet]['RIASEC'.index(d)] for onet, d, valor in puntajes)
    assert not any(c == 'drone-operator' for c, _, _ in ocupaciones)


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
def test_excel_erroneo_revierte_carga_explicita(cliente, aplicacion, tmp_path, monkeypatch, fallo):
    avanzar(cliente, 't-inicio')
    antes = filas_base(aplicacion)
    cache = aplicacion.state.motor_bd.cache_definiciones.actual
    if fallo == 'referencia_ausente':
        filas = leer_ocupaciones(datos_ocupaciones.RUTA_OCUPACIONES)
        monkeypatch.setattr(fijos, 'leer_ocupaciones', lambda ruta: [f for f in filas if f.codigo_onet != '19-2042.00'])
        mensaje = 'Falta la ocupación O*NET 19-2042.00, requerida por geologist'
    else:
        ruta_excel = tmp_path / 'fallo.xlsx'
        if fallo == 'invalido':
            ruta_excel.write_text('archivo inválido', encoding='utf-8')
        monkeypatch.setattr(fijos, 'RUTA_OCUPACIONES', ruta_excel)
        mensaje = f'{"Falta" if fallo == "ausente" else "No se puede leer"} el archivo de ocupaciones: {ruta_excel}'
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
