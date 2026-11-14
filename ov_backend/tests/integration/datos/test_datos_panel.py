"""Ajuste panel-salon: las alertas de `datos/fijos.py` nombran evaluadores registrados y traen todas sus claves;
los parámetros que lee el panel están cargados."""

from sqlalchemy import select

from app import models as m
from app.services.panel.alertas import EVALUADORES_ALERTA
from datos.fijos import ALERTAS, GRUPOS_ALERTA, PARAMETROS_PANEL


def test_cada_alerta_fija_tiene_evaluador_y_todas_sus_claves():
    grupos = {codigo for codigo, _ in GRUPOS_ALERTA}
    for codigo, grupo, _, _, evaluador, parametros in ALERTAS:
        assert grupo in grupos, codigo
        assert evaluador in EVALUADORES_ALERTA, codigo
        assert set(EVALUADORES_ALERTA[evaluador].defectos) <= set(parametros), codigo


def test_carga_alertas_y_parametros_en_orden(sesion):
    filas = sesion.execute(select(m.GrupoAlerta.codigo, m.Alerta.codigo, m.Alerta.orden).join(
        m.GrupoAlerta, m.GrupoAlerta.id == m.Alerta.grupo_id).order_by(m.GrupoAlerta.orden, m.Alerta.orden)).all()
    assert filas == [('conversar', 'respuesta-sensible', 1), ('conversar', 'seguridad-baja', 2),
                     ('atras', 'sin-ingreso', 1), ('atras', 'avance-bajo', 2), ('atras', 'test-por-revisar', 3),
                     ('atras', 'familia-pendiente', 4),
                     # Ajuste panel-estudiantes: los temas «Para conversar», en un grupo fuera del Inicio.
                     ('para-conversar', 'plan-idea-ajena', 1), ('para-conversar', 'plan-conoce-poco', 2),
                     ('para-conversar', 'plan-complicaciones', 3), ('para-conversar', 'plan-fuera-areas', 4),
                     ('para-conversar', 'dimension-por-trabajar', 5)]
    fuera = sesion.scalars(select(m.GrupoAlerta.codigo).where(m.GrupoAlerta.en_inicio.is_(False))).all()
    assert fuera == ['para-conversar']
    sin_texto = sesion.scalars(select(m.Alerta.codigo).where(m.Alerta.descripcion_perfil.is_(None))).all()
    assert sin_texto == []
    parametros = dict(sesion.execute(select(m.Parametro.codigo, m.Parametro.valor)).all())
    assert parametros == {codigo: valor for codigo, valor, _ in PARAMETROS_PANEL}
    assert parametros['PANEL_INSTRUMENTO_PRINCIPAL'] == 'TEST-RIASEC'
