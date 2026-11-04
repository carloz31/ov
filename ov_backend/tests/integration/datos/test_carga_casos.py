"""B08: batallas, casos y testimonios al cargar; la carga fallida no deja filas."""

import pytest
from sqlalchemy import select

from app import models as m
from datos import cargar, ruta


def test_batalla_y_testimonios_cargados(sesion):
    batalla = sesion.scalar(select(m.Actividad).where(m.Actividad.codigo == 't-batalla'))
    assert batalla.tipo == m.TipoActividad.BATALLA and batalla.puntaje_minimo is None and not batalla.requerida
    assert batalla.puntaje_maximo is None
    pistas = dict(sesion.execute(select(m.Testimonio.codigo, m.Testimonio.pista)).all())
    # Ajuste mochila: todos llevan pista (el segundo, la de la voz por descubrir).
    assert all(pistas[c] for c in ('t-testimonio-1', 't-testimonio-2', 't-testimonio-3', 't-testimonio-4'))


# Ajustes Central (6): el máximo de un caso es el total de sus necesidades (sincronizado con el front).
def test_caso_con_maximo_igual_al_total_de_necesidades(sesion):
    caso = sesion.scalar(select(m.Actividad).where(m.Actividad.codigo == 't-caso'))
    maximo, necesidades = ruta.CONFIGURACION_CASOS['t-caso']
    assert (caso.puntaje_minimo, caso.puntaje_maximo) == (6, maximo) and sum(necesidades) == maximo == 8


# DATO DE PRUEBA: configuraciones de caso que el cargador debe rechazar.
VARIANTES_CASO = (
    ({'t-caso': (9, (2, 1, 2, 2, 1))}, 'no es el total de sus necesidades'),
    ({}, 'no tiene puntaje máximo'),
    ({'t-caso': (8, (2, 1, 2, 2, 1)), 't-batalla': (1, (1,))}, 'no es un caso'),
)


@pytest.mark.parametrize(('valor', 'mensaje'), VARIANTES_CASO)
def test_carga_rechaza_maximos_de_caso_invalidos(tmp_path, monkeypatch, valor, mensaje):
    monkeypatch.setattr(ruta, 'CONFIGURACION_CASOS', valor)
    with pytest.raises(ValueError, match=mensaje):
        cargar.preparar_base(f'sqlite:///{(tmp_path / "maximos.db").as_posix()}', 'ruta', crear_tablas=True)

