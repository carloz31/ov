"""Validación de los ítems de registro y las listas al cargar; la carga fallida no deja filas."""

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models as m
from app.database import crear_motor_bd
from datos import cargar, ruta


# DATO DE PRUEBA: variantes que el cargador debe rechazar.
ITEM_EXTRA = ('t-expectativas', 't-exp-extra', 'Extra', 'Consigna extra.', None, ())
REPETIDO = ('t-valores', 't-exp-ruta', 'Repetido', 'Consigna repetida.', None, ())
EN_INFORMATIVA = ('t-inicio', 't-ini-item', 'Ítem', 'Consigna.', None, ())
LISTA_INEXISTENTE = ('t-valores', 't-val-extra', 'Extra', 'Consigna.', ('t-lista-nula', 1, 1, False, False), ())
INCOHERENTE = ('t-valores', 't-val-extra', 'Extra', 'Consigna.', ('t-lista-apoyos', 2, 1, False, False), ())
VARIANTES = (
    ('ITEMS_REGISTRO', (*ruta.ITEMS_REGISTRO, ITEM_EXTRA), 'más de 3 ítems'),
    ('ITEMS_REGISTRO', (*ruta.ITEMS_REGISTRO, REPETIDO), 'aparece en dos actividades'),
    ('ITEMS_REGISTRO', (*ruta.ITEMS_REGISTRO[:-1], EN_INFORMATIVA), 'que no es de registro'),
    ('ITEMS_REGISTRO', (*ruta.ITEMS_REGISTRO[:-1], LISTA_INEXISTENTE), 'lista inexistente'),
    ('ITEMS_REGISTRO', (*ruta.ITEMS_REGISTRO[:-1], INCOHERENTE), 'incoherente'),
    ('LISTAS', (*ruta.LISTAS, ('t-lista-otra', 'Otra', (('OTRA', 'Otra'),))), 'código reservado OTRA'),
)


@pytest.mark.parametrize(('atributo', 'valor', 'mensaje'), VARIANTES)
def test_carga_rechaza_registros_invalidos_sin_dejar_filas(tmp_path, monkeypatch, atributo, valor, mensaje):
    url = f'sqlite:///{(tmp_path / "registros.db").as_posix()}'
    monkeypatch.setattr(ruta, atributo, valor)
    with pytest.raises(ValueError, match=mensaje):
        cargar.preparar_base(url, 'ruta', crear_tablas=True)
    motor = crear_motor_bd(url)
    try:
        with motor.connect() as conexion:
            assert all(conexion.execute(select(tabla)).first() is None for tabla in m.Base.metadata.sorted_tables)
    finally:
        motor.dispose()


def test_items_listas_y_criterios_cargados(tmp_path):
    url = f'sqlite:///{(tmp_path / "ruta.db").as_posix()}'
    cargar.preparar_base(url, 'ruta', crear_tablas=True)
    motor = crear_motor_bd(url)
    try:
        with Session(motor) as sesion:
            items = sesion.execute(select(m.Actividad.codigo, m.ItemRegistro.codigo, m.ItemRegistro.orden,
                                          m.ListaOpciones.codigo, m.ListaOpciones.comun)
                                   .join(m.Actividad, m.Actividad.id == m.ItemRegistro.actividad_id)
                                   .outerjoin(m.ListaOpciones, m.ListaOpciones.id == m.ItemRegistro.lista_id)
                                   .order_by(m.Actividad.codigo, m.ItemRegistro.orden)).all()
            assert items == [
                ('t-expectativas', 't-exp-ruta', 1, 'RUTAS_DESPUES_COLEGIO', True),
                ('t-expectativas', 't-exp-apoyo', 2, 't-lista-apoyos', False),
                ('t-expectativas', 't-exp-espera', 3, None, None),
                ('t-valores', 't-val-orden', 1, 't-lista-valores', False),
                ('t-valores', 't-val-libre', 2, None, None),
                ('t-valores', 't-val-breve', 3, None, None),
            ]
            criterios = sesion.execute(select(m.CriterioCompletitud.tipo, m.CriterioCompletitud.repregunta)
                                       .join(m.ItemRegistro).where(m.ItemRegistro.codigo == 't-exp-espera')
                                       .order_by(m.CriterioCompletitud.orden)).all()
            assert [tipo for tipo, _ in criterios] == [m.TipoCriterio.EJEMPLO, m.TipoCriterio.RAZON]
            assert all(repregunta.strip() for _, repregunta in criterios)
            nucleo, breve = (sesion.scalar(select(m.ItemRegistro).where(m.ItemRegistro.codigo == c))
                             for c in ('t-exp-espera', 't-val-breve'))
            assert nucleo.nucleo and nucleo.min_caracteres is None and breve.min_caracteres == 40
    finally:
        motor.dispose()
