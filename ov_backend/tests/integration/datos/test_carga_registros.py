"""Validación de los ítems de registro y las listas al cargar; la carga fallida no deja filas."""

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models as m
from app.database import crear_motor_bd
from datos import cargar, fijos, ruta


# DATO DE PRUEBA: variantes que el cargador debe rechazar.
SIN_BREVE = tuple(i for i in ruta.ITEMS_REGISTRO if i[1] != 't-val-breve')
ITEM_EXTRA = ('t-expectativas', 't-exp-extra', 'Extra', 'Consigna extra.', None, ())
REPETIDO = ('t-valores', 't-exp-ruta', 'Repetido', 'Consigna repetida.', None, ())
EN_INFORMATIVA = ('t-inicio', 't-ini-item', 'Ítem', 'Consigna.', None, ())
LISTA_INEXISTENTE = ('t-valores', 't-val-extra', 'Extra', 'Consigna.', ('t-lista-nula', 1, 1, False, False), ())
INCOHERENTE = ('t-valores', 't-val-extra', 'Extra', 'Consigna.', ('t-lista-apoyos', 2, 1, False, False), ())
VARIANTES = (
    ('ITEMS_REGISTRO', (*ruta.ITEMS_REGISTRO, ITEM_EXTRA), 'más de 3 ítems'),
    ('ITEMS_REGISTRO', (*ruta.ITEMS_REGISTRO, REPETIDO), 'aparece en dos actividades'),
    ('ITEMS_REGISTRO', (*SIN_BREVE, EN_INFORMATIVA), 'que no es de registro'),
    ('ITEMS_REGISTRO', (*SIN_BREVE, LISTA_INEXISTENTE), 'lista inexistente'),
    ('ITEMS_REGISTRO', (*SIN_BREVE, INCOHERENTE), 'incoherente'),
    ('LISTAS', (*ruta.LISTAS, ('t-lista-otra', 'Otra', (('OTRA', 'Otra'),))), 'código reservado OTRA'),
)


def _eco(eleccion):
    """`ruta.ITEMS_REGISTRO` con otra elección en `t-eco-ruta`."""
    return tuple((a, c, n, t, eleccion, k) if c == 't-eco-ruta' else (a, c, n, t, e, k)
                 for a, c, n, t, e, k in ruta.ITEMS_REGISTRO)


# DATO DE PRUEBA: referencias y elecciones por referencia que el cargador debe rechazar.
REF_ESPERA = ('t-ref-espera', ('ACTIVIDAD', 't-eco'), 'TEXTO', 't-exp-espera')
VARIANTES_REFERENCIAS = (
    ('REFERENCIAS', (('t-ref-plan', ('ACTIVIDAD', 't-eco'), 'PLANES', 't-exp-ruta'),), 'fuera del catálogo'),
    ('REFERENCIAS', (REF_ESPERA, ('t-ref-rutas', ('ACTIVIDAD', 't-eco'), 'ELECCION', 't-exp-espera')),
     'no tiene lista'),
    ('REFERENCIAS', (REF_ESPERA, ('t-ref-rutas', ('ACTIVIDAD', 't-eco'), 'ELECCION', 't-eco-ruta')),
     'su propia actividad'),
    ('REFERENCIAS', (REF_ESPERA, ('t-ref-rutas', ('ACTIVIDAD', 't-nula'), 'ELECCION', 't-exp-ruta')),
     'dueño inexistente'),
    ('REFERENCIAS', (REF_ESPERA, ('t-ref-rutas', ('ACTIVIDAD', 't-eco'), 'ELECCION', 't-exp-nulo')),
     'ítem inexistente'),
    ('ITEMS_REGISTRO', _eco(('ref', 't-ref-espera', 1, 1, False)), 'no es una ELECCION de su actividad'),
    ('ITEMS_REGISTRO', _eco(('ref', 't-ref-nula', 1, 1, False)), 'no es una ELECCION de su actividad'),
    ('ITEMS_REGISTRO', _eco(('ref', 't-ref-rutas', 2, 2, False)), 'mayor que la de su fuente'),
    ('ITEMS_REGISTRO', _eco(('ref', 't-ref-rutas', 1, 3, False)), 'mayor que la de su fuente'),
    ('REFERENCIAS', (*ruta.REFERENCIAS, ('t-ref-res', ('ACTIVIDAD', 't-eco'), 'RESULTADO', 'APL-NULA')),
     'aplicación inexistente'),
    ('REFERENCIAS', (*ruta.REFERENCIAS, ('t-ref-res', ('ACTIVIDAD', 't-eco'), 'COINCIDENCIAS', 't-exp-ruta')),
     'aplicación inexistente'),
    ('REFERENCIAS', (*ruta.REFERENCIAS, ('t-ref-res', ('ACTIVIDAD', 't-eco'), 'TEXTO', 'APL-RIASEC')),
     'ítem inexistente'),
)
VARIANTES = VARIANTES + VARIANTES_REFERENCIAS


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


def test_carga_rechaza_referencias_a_una_comparacion(tmp_path, monkeypatch):
    """DATO DE PRUEBA: el RIASEC se carga como COMPARACION para que `t-contraste` lea una aplicación sin resultado."""
    original = fijos.cargar
    def como_comparacion(sesion):
        base = original(sesion)
        sesion.scalar(select(m.Instrumento)).tipo_resultado = m.TipoResultado.COMPARACION
        return base
    monkeypatch.setattr(fijos, 'cargar', como_comparacion)
    url = f'sqlite:///{(tmp_path / "comparacion.db").as_posix()}'
    with pytest.raises(ValueError, match='que no genera resultado'):
        cargar.preparar_base(url, 'ruta', crear_tablas=True)


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
                ('t-contraste', 't-con-contraste', 1, None, None),
                ('t-eco', 't-eco-ruta', 1, None, None),
                ('t-eco', 't-eco-espera', 2, None, None),
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
            espera, breve = (sesion.scalar(select(m.ItemRegistro).where(m.ItemRegistro.codigo == c))
                             for c in ('t-exp-espera', 't-val-breve'))
            assert espera.min_caracteres is None and breve.min_caracteres == 40
            referencias = sesion.execute(select(m.Referencia.codigo, m.Referencia.tipo, m.Actividad.codigo,
                                                m.ItemRegistro.codigo)
                                         .join(m.Actividad, m.Actividad.id == m.Referencia.actividad_id)
                                         .join(m.ItemRegistro, m.ItemRegistro.id == m.Referencia.item_registro_id)
                                         .order_by(m.Referencia.codigo)).all()
            assert referencias == [('t-ref-espera', m.TipoReferencia.TEXTO, 't-eco', 't-exp-espera'),
                                   ('t-ref-rutas', m.TipoReferencia.ELECCION, 't-eco', 't-exp-ruta')]
            eco = sesion.scalar(select(m.ItemRegistro).where(m.ItemRegistro.codigo == 't-eco-ruta'))
            assert eco.lista_id is None and eco.permite_otra is False
            assert sesion.get(m.Referencia, eco.referencia_id).codigo == 't-ref-rutas'
    finally:
        motor.dispose()
