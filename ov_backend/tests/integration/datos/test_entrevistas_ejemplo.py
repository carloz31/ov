"""Ajuste entrevistas por familia: el script de ejemplos deja entrevistas válidas y se puede repetir."""

import importlib.util
from pathlib import Path

from sqlalchemy import func, select

from app import models as m


def _script():
    ruta = Path(__file__).parents[3] / 'scripts/sembrar_entrevistas_ejemplo.py'
    especificacion = importlib.util.spec_from_file_location('sembrar_entrevistas_ejemplo', ruta)
    modulo = importlib.util.module_from_spec(especificacion)
    especificacion.loader.exec_module(modulo)
    return modulo


def test_siembra_una_vez_y_prueba_el_limite_del_detalle_de_carrera(sesion_contenido):
    script = _script()
    assert script.sembrar(sesion_contenido) == len(script.ENTREVISTAS)
    assert script.sembrar(sesion_contenido) == 0
    assert sesion_contenido.scalar(select(func.count()).select_from(m.Entrevista)) == len(script.ENTREVISTAS)
    psicologia = sesion_contenido.scalar(select(m.FamiliaCarrera.id).where(m.FamiliaCarrera.codigo == '313'))
    assert sesion_contenido.scalar(select(func.count()).select_from(m.Entrevista).where(
        m.Entrevista.familia_id == psicologia)) > 3
    # Una Leyenda es destacada y con los favoritos que pide.
    for entrevista in sesion_contenido.scalars(select(m.Entrevista).where(m.Entrevista.leyenda_en.is_not(None))):
        assert entrevista.destacada_en is not None
        assert sesion_contenido.scalar(select(func.count()).select_from(m.Favorito).where(
            m.Favorito.tipo == m.TipoFavorito.ENTREVISTA, m.Favorito.id_referencia == entrevista.id)) == 3
    assert sesion_contenido.scalar(select(func.count()).select_from(m.EventoUso)) == 0
