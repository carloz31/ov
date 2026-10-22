"""F04b: el pool de preguntas de cada batalla, con su ficha; F04c: vidas y destellos. La carga fallida no
deja filas."""

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import models as m
from app.database import crear_motor_bd
from datos import cargar, ruta

PRIMERA = ruta.PREGUNTAS_BATALLA[0]


def variante(**cambios):
    # DATO DE PRUEBA: la primera pregunta con un campo cambiado, y el resto del pool igual.
    campos = dict(zip(('codigo', 'batalla', 'ficha', 'enunciado', 'opciones', 'correcta', 'explicacion'), PRIMERA))
    return (tuple({**campos, **cambios}.values()), *ruta.PREGUNTAS_BATALLA[1:])


VARIANTES = (
    ('PREGUNTAS_BATALLA', variante(batalla='t-inicio'), 'no es una batalla'),
    ('PREGUNTAS_BATALLA', variante(ficha='t-ficha-apo'), 'no es una ficha del estudiante'),
    ('PREGUNTAS_BATALLA', variante(ficha='t-nula'), 'no es una ficha del estudiante'),
    ('PREGUNTAS_BATALLA', variante(opciones=('a', 'b')), 'al menos tres opciones'),
    ('PREGUNTAS_BATALLA', variante(correcta=4), 'al menos tres opciones y una correcta'),
    ('PREGUNTAS_BATALLA', variante(enunciado=' '), 'texto vacío'),
    # El pool debe ser al menos el doble de las preguntas por intento.
    ('CONFIGURACION_BATALLAS', {'t-batalla': (5, 3, 8)}, 'al menos el doble'),
    # F04c: las preguntas por intento deben alcanzar para terminar (vidas + destellos - 1).
    ('CONFIGURACION_BATALLAS', {'t-batalla': (5, 3, 6)}, 'no alcanzan para terminar'),
    ('CONFIGURACION_BATALLAS', {}, 'no tiene vidas, destellos ni preguntas por intento'),
    ('PREGUNTAS_BATALLA', ruta.PREGUNTAS_BATALLA[:13], 'al menos el doble'),
)


@pytest.mark.parametrize(('atributo', 'valor', 'mensaje'), VARIANTES)
def test_carga_rechaza_preguntas_invalidas_sin_dejar_filas(tmp_path, monkeypatch, atributo, valor, mensaje):
    url = f'sqlite:///{(tmp_path / "batallas.db").as_posix()}'
    monkeypatch.setattr(ruta, atributo, valor)
    with pytest.raises(ValueError, match=mensaje):
        cargar.preparar_base(url, 'ruta', crear_tablas=True)
    motor = crear_motor_bd(url)
    try:
        with Session(motor) as sesion:
            assert sesion.scalars(select(m.PreguntaBatalla)).all() == []
    finally:
        motor.dispose()


def test_pool_de_la_batalla_cargado(sesion):
    batalla = sesion.scalar(select(m.Actividad).where(m.Actividad.codigo == 't-batalla'))
    assert (batalla.vidas_enemigo, batalla.destellos, batalla.preguntas_por_intento) == (5, 3, 7)
    pool = sesion.scalar(select(func.count()).select_from(m.PreguntaBatalla)
                         .where(m.PreguntaBatalla.actividad_id == batalla.id))
    assert pool == 14 >= 2 * batalla.preguntas_por_intento
    # Solo las batallas tienen preguntas por intento.
    assert set(sesion.scalars(select(m.Actividad.tipo).where(m.Actividad.preguntas_por_intento.is_not(None)))) == {
        m.TipoActividad.BATALLA}
