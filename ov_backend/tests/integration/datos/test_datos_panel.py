"""Ajuste panel-salon: las alertas de `datos/fijos.py` (y, desde el ajuste pendientes-orientadora, las de
`datos/contenido.py`) nombran evaluadores registrados y traen todas sus claves; los parámetros que lee el panel están
cargados. Una fila de tema mal armada falla al cargar."""

import pytest
from sqlalchemy import select

from app import models as m
from app.services.panel.alertas import EVALUADORES_ALERTA
from datos import contenido
from datos.cargador import validar_alertas
from datos.fijos import ALERTAS, GRUPOS_ALERTA, ORDEN_PARA_CONVERSAR, PARAMETROS_PANEL


def test_cada_alerta_fija_tiene_evaluador_y_todas_sus_claves():
    grupos = {codigo for codigo, _ in GRUPOS_ALERTA}
    for codigo, grupo, _, _, evaluador, parametros in (*ALERTAS, *contenido.ALERTAS):
        assert grupo in grupos, codigo
        assert evaluador in EVALUADORES_ALERTA, codigo
        assert set(EVALUADORES_ALERTA[evaluador].defectos) <= set(parametros), codigo


def test_carga_alertas_y_parametros_en_orden(sesion):
    filas = sesion.execute(select(m.GrupoAlerta.codigo, m.Alerta.codigo, m.Alerta.orden).join(
        m.GrupoAlerta, m.GrupoAlerta.id == m.Alerta.grupo_id).order_by(m.GrupoAlerta.orden, m.Alerta.orden)).all()
    assert filas == [('conversar', 'respuesta-sensible', 1), ('conversar', 'seguridad-baja', 2),
                     ('atras', 'sin-ingreso', 1), ('atras', 'avance-bajo', 2), ('atras', 'test-por-revisar', 3),
                     ('atras', 'familia-pendiente', 4),
                     # Los temas «Para conversar», en un grupo fuera del Inicio; en `ruta`, solo los que no
                     # nombran ítems de `contenido` (con su lugar en `ORDEN_PARA_CONVERSAR`).
                     ('para-conversar', 'plan-poco-entusiasmo', 2), ('para-conversar', 'plan-fuera-areas', 3),
                     ('para-conversar', 'plan-se-ve-lejos', 5), ('para-conversar', 'plan-conoce-poco', 6),
                     ('para-conversar', 'llegada-sin-avance', 10)]
    fuera = sesion.scalars(select(m.GrupoAlerta.codigo).where(m.GrupoAlerta.en_inicio.is_(False))).all()
    assert fuera == ['para-conversar']
    sin_texto = sesion.scalars(select(m.Alerta.codigo).where(m.Alerta.descripcion_perfil.is_(None))).all()
    assert sin_texto == []
    parametros = dict(sesion.execute(select(m.Parametro.codigo, m.Parametro.valor)).all())
    assert parametros == {codigo: valor for codigo, valor, _ in PARAMETROS_PANEL}
    assert parametros['PANEL_INSTRUMENTO_PRINCIPAL'] == 'TEST-RIASEC'


def test_contenido_carga_los_diez_temas_en_su_orden(sesion_contenido):
    temas = sesion_contenido.scalars(select(m.Alerta.codigo).join(m.GrupoAlerta).where(
        m.GrupoAlerta.codigo == 'para-conversar').order_by(m.Alerta.orden)).all()
    assert tuple(temas) == ORDEN_PARA_CONVERSAR


@pytest.mark.parametrize(('codigo', 'cambio', 'mensaje'), [
    ('voces-chocan', {'item': 'b9-9-no-existe'}, 'ítem que no existe'),
    ('voces-chocan', {'opciones': ['MIEDO']}, 'opciones que no son de b1-3-contraste'),
    ('voces-chocan', {'datos': {'persona': 'b9-9-no-existe'}}, 'ítem que no existe'),
    ('valores-fuera-del-plan', {'item': 'b1-3-voz'}, 'lista VALORES'),
    ('plan-se-ve-lejos', {'medidores': ['capacidad', 'ganas']}, 'medidores que no existen'),
])
def test_una_fila_de_tema_mal_armada_falla_al_cargar(sesion_contenido, codigo, cambio, mensaje):
    fila = sesion_contenido.scalar(select(m.Alerta).where(m.Alerta.codigo == codigo))
    fila.parametros = {**fila.parametros, **cambio}
    sesion_contenido.flush()
    with pytest.raises(ValueError, match=mensaje):
        validar_alertas(sesion_contenido)
