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


# Ajuste testimonios: posiciones de la fila de un testimonio y lo que la carga rechaza.
VIDEO, INICIO, FIN, CONTEXTO = 3, 4, 5, 9


@pytest.mark.parametrize(('posicion', 'valor', 'mensaje'), [
    (VIDEO, 'ysz5S6PUM-U?si=abc', 'video_id inválido'),
    (VIDEO, 'corto', 'video_id inválido'),
    (INICIO, -1, 'inicio negativo'),
    (FIN, 0, 'no supera su inicio'),
    (CONTEXTO, 'x' * 81, 'pasa de 80'),
])
def test_carga_rechaza_testimonio_invalido(tmp_path, monkeypatch, posicion, valor, mensaje):
    primero, *resto = ruta.TESTIMONIOS
    invalido = (*primero[:posicion], valor, *primero[posicion + 1:])
    monkeypatch.setattr(ruta, 'TESTIMONIOS', (invalido, *resto))
    with pytest.raises(ValueError, match=mensaje):
        cargar.preparar_base(f'sqlite:///{(tmp_path / "testimonio.db").as_posix()}', 'ruta', crear_tablas=True)


def test_carga_acepta_testimonio_sin_fin_y_con_fin_mayor(tmp_path, monkeypatch):
    primero, *resto = ruta.TESTIMONIOS
    monkeypatch.setattr(ruta, 'TESTIMONIOS', ((*primero[:INICIO], 10, 20, *primero[FIN + 1:]), *resto))
    cargar.preparar_base(f'sqlite:///{(tmp_path / "con-fin.db").as_posix()}', 'ruta', crear_tablas=True)
    assert primero[FIN] is None


def test_carga_rechaza_voz_sin_origen(tmp_path, monkeypatch):
    sin_regla = tuple(r for r in ruta.REGLAS if r[2] != 't-testimonio-1')
    monkeypatch.setattr(ruta, 'REGLAS', sin_regla)
    with pytest.raises(ValueError, match='sin regla SUPERA_CASO ni COMPLETA_ACTIVIDAD'):
        cargar.preparar_base(f'sqlite:///{(tmp_path / "sin-origen.db").as_posix()}', 'ruta', crear_tablas=True)

