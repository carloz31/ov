"""Validación de los ítems de registro y las listas al cargar; la carga fallida no deja filas."""

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models as m
from app.core.parametros import MAXIMO_ITEMS_REGISTRO
from app.database import crear_motor_bd
from datos import cargar, fijos, ruta


# DATO DE PRUEBA: variantes que el cargador debe rechazar.
SIN_BREVE = tuple(i for i in ruta.ITEMS_REGISTRO if i[1] != 't-val-breve')
# Ajuste carga-actividades: tantos ítems extra como hagan falta para pasar el máximo vigente (t-expectativas tiene 3).
ITEMS_EXTRA = tuple(('t-expectativas', f't-exp-extra-{n}', 'Extra', 'Consigna extra.', None)
                    for n in range(MAXIMO_ITEMS_REGISTRO - 2))
REPETIDO = ('t-valores', 't-exp-ruta', 'Repetido', 'Consigna repetida.', None)
EN_INFORMATIVA = ('t-inicio', 't-ini-item', 'Ítem', 'Consigna.', None)
LISTA_INEXISTENTE = ('t-valores', 't-val-extra', 'Extra', 'Consigna.', ('t-lista-nula', 1, 1, False, False))
INCOHERENTE = ('t-valores', 't-val-extra', 'Extra', 'Consigna.', ('t-lista-apoyos', 2, 1, False, False))
# Ajuste registros llm (lote 2): marcadores, consigna, ecos, opciones propias y tarjetas.
MARCADOR_DESCONOCIDO = ('t-valores', 't-val-extra', 'Extra', {'pregunta_texto': '¿Qué piensas de {carrera_b}?'}, None)
SIN_PREGUNTA = ('t-valores', 't-val-extra', 'Extra', {'dialogo': 'Hola.'}, None)
ECO_POSTERIOR = ('t-expectativas', 't-exp-extra', 'Extra',
                 {'pregunta_texto': 'Consigna.', 'ecos_llm': ({'origen': 'TEXTO', 'codigo': 't-val-orden'},)}, None)
ECO_REFERENCIA_AJENA = ('t-expectativas', 't-exp-extra', 'Extra',
                        {'pregunta_texto': 'Consigna.', 'ecos_mostrar': ({'origen': 'REFERENCIA', 'codigo': 't-ref-rutas'},)},
                        None)
PROPIA_CON_CRITERIO = ('t-valores', 't-val-extra', 'Extra', 'Consigna.',
                       {'fuente': 'PROPIAS', 'minima': 1, 'maxima': 1,
                        'propias': ({'codigo': 'A', 'texto': 'A', 'criterio': None},)})
PROPIA_OTRA = ('t-valores', 't-val-extra', 'Extra', 'Consigna.',
               {'fuente': 'PROPIAS', 'minima': 1, 'maxima': 1, 'propias': ({'codigo': 'OTRA-1', 'texto': 'A'},)})
VARIANTES = (
    ('ITEMS_REGISTRO', (*ruta.ITEMS_REGISTRO, *ITEMS_EXTRA), f'más de {MAXIMO_ITEMS_REGISTRO} ítems'),
    ('ITEMS_REGISTRO', (*ruta.ITEMS_REGISTRO, REPETIDO), 'aparece en dos actividades'),
    ('ITEMS_REGISTRO', (*SIN_BREVE, EN_INFORMATIVA), 'que no es de registro'),
    ('ITEMS_REGISTRO', (*SIN_BREVE, LISTA_INEXISTENTE), 'lista inexistente'),
    ('ITEMS_REGISTRO', (*SIN_BREVE, INCOHERENTE), 'incoherente'),
    ('LISTAS', (*ruta.LISTAS, ('t-lista-otra', 'Otra', (('OTRA', 'Otra'),))), 'código reservado OTRA'),
    ('ITEMS_REGISTRO', (*SIN_BREVE, MARCADOR_DESCONOCIDO), 'marcadores desconocidos: .*carrera_b'),
    ('ITEMS_REGISTRO', (*SIN_BREVE, SIN_PREGUNTA), 'sin pregunta del texto'),
    ('ITEMS_REGISTRO', (*SIN_BREVE, ECO_POSTERIOR), 'no es un ítem anterior de su actividad'),
    ('ITEMS_REGISTRO', (*SIN_BREVE, ECO_REFERENCIA_AJENA), 'no es una referencia de su actividad'),
    ('ITEMS_REGISTRO', (*SIN_BREVE, PROPIA_CON_CRITERIO), 'campos inválidos'),
    ('ITEMS_REGISTRO', (*SIN_BREVE, PROPIA_OTRA), 'usa el reservado'),
    ('TARJETAS', {'t-nada': {'tarjeta': 'T', 'bases': {}, 'filtrar_etiqueta': False}}, 'ítems inexistentes'),
    ('TARJETAS', {'t-exp-espera': {'tarjeta': 'T', 'bases': {'general': 'B'}, 'filtrar_etiqueta': False}},
     'una base que no está en su texto'),
    ('TARJETAS', {'t-exp-espera': {'tarjeta': 'T', 'bases': {}, 'filtrar_etiqueta': False,
                                   'por_opcion': {'X': {'tarjeta': 'T', 'bases': {}, 'filtrar_etiqueta': False}}}},
     'no es una opción propia con LLM'),
)


def _eco(eleccion):
    """`ruta.ITEMS_REGISTRO` con otra elección en `t-eco-ruta`."""
    return tuple((a, c, n, t, eleccion) if c == 't-eco-ruta' else (a, c, n, t, e)
                 for a, c, n, t, e in ruta.ITEMS_REGISTRO)


# DATO DE PRUEBA: referencias y elecciones por referencia que el cargador debe rechazar.
REF_ESPERA = ('t-ref-espera', ('ACTIVIDAD', 't-eco'), 'TEXTO', 't-exp-espera')
VARIANTES_REFERENCIAS = (
    ('REFERENCIAS', (('t-ref-plan', ('ACTIVIDAD', 't-eco'), 'INEXISTENTE', 't-exp-ruta'),), 'fuera del catálogo'),
    ('REFERENCIAS', (REF_ESPERA, ('t-ref-rutas', ('ACTIVIDAD', 't-eco'), 'ELECCION', 't-exp-espera')),
     'no tiene lista'),
    ('REFERENCIAS', (REF_ESPERA, ('t-ref-rutas', ('ACTIVIDAD', 't-eco'), 'ELECCION', 't-eco-ruta')),
     'su propia actividad'),
    ('REFERENCIAS', (REF_ESPERA, ('t-ref-rutas', ('ACTIVIDAD', 't-nula'), 'ELECCION', 't-exp-ruta')),
     'dueño inexistente'),
    ('REFERENCIAS', (REF_ESPERA, ('t-ref-rutas', ('ACTIVIDAD', 't-eco'), 'ELECCION', 't-exp-nulo')),
     'ítem inexistente'),
    ('ITEMS_REGISTRO', _eco(('RUTAS_DESPUES_COLEGIO', 1, 2, False, True, 't-ref-espera')), 'no es una ELECCION de su actividad'),
    ('ITEMS_REGISTRO', _eco(('RUTAS_DESPUES_COLEGIO', 1, 2, False, True, 't-ref-nula')), 'no es una ELECCION de su actividad'),
    # F02: lo elegido antes llega marcado; debe caber en la misma lista, el máximo y la «otra».
    ('ITEMS_REGISTRO', _eco(('t-lista-apoyos', 1, 1, False, False, 't-ref-rutas')), 'otra lista'),
    ('ITEMS_REGISTRO', _eco(('RUTAS_DESPUES_COLEGIO', 1, 1, False, True, 't-ref-rutas')), 'no admite todo'),
    ('ITEMS_REGISTRO', _eco(('RUTAS_DESPUES_COLEGIO', 1, 2, False, False, 't-ref-rutas')), 'no admite todo'),
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
    monkeypatch.setattr(ruta, atributo, valor, raising=False)
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


def test_items_listas_y_consignas_cargados(tmp_path):
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
                ('t-comparar', 't-comparar-eleccion', 1, None, None),
                ('t-contraste', 't-con-contraste', 1, None, None),
                ('t-eco', 't-eco-ruta', 1, 'RUTAS_DESPUES_COLEGIO', True),
                ('t-eco', 't-eco-espera', 2, None, None),
                ('t-expectativas', 't-exp-ruta', 1, 'RUTAS_DESPUES_COLEGIO', True),
                ('t-expectativas', 't-exp-apoyo', 2, 't-lista-apoyos', False),
                ('t-expectativas', 't-exp-espera', 3, None, None),
                ('t-explorar', 't-explorar-sorpresa', 1, None, None),
                ('t-investigador-cierre', 't-cierre-cambio', 1, None, None),
                ('t-investigador-cierre', 't-cierre-lista', 2, 't-lista-cambio', False),
                ('t-proyecto', 't-proyecto-paso', 1, None, None),
                # Ajuste registros: elige desde una referencia o de sus opciones propias, sin lista.
                ('t-referencia', 't-refe-plan', 1, None, None),
                ('t-referencia', 't-refe-retoma', 2, None, None),
                ('t-referencia', 't-refe-duda', 3, None, None),
                ('t-valores', 't-val-orden', 1, 't-lista-valores', False),
                ('t-valores', 't-val-libre', 2, None, None),
                ('t-valores', 't-val-breve', 3, None, None),
            ]
            # Ajuste registros llm (lote 2): sin criterios; ningún ítem de `ruta` tiene tarjeta (todos sin LLM).
            espera = sesion.scalar(select(m.ItemRegistro).where(m.ItemRegistro.codigo == 't-exp-espera'))
            assert espera.pregunta_texto == '¿Qué esperan de ti las personas cercanas?'
            assert espera.dialogo is None and espera.tarjeta is None
            assert not any(i.tarjeta for i in sesion.scalars(select(m.ItemRegistro)))
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
            assert eco.lista_id is not None and eco.permite_otra is True
            assert sesion.get(m.Referencia, eco.referencia_id).codigo == 't-ref-rutas'
    finally:
        motor.dispose()


def test_marcadores_reconocidos_y_el_arranque_con_puntos_suspensivos():
    """Ajuste registros llm (lote 2): `{valor 1}` (con espacio) y `{opción}` (con tilde) son marcadores; el «…» de
    un arranque no lo es, y lo que va entre llaves sin ser conocido es un error de carga."""
    from datos.cargador import MARCADORES, marcadores_de
    assert marcadores_de('Pusiste {valor 1} primero.') == {'valor 1'}
    assert marcadores_de('Volvamos a lo que marcaste, {opción}: cuéntame') == {'opción'}
    assert marcadores_de('Puse … primero porque…') == set()
    assert marcadores_de('Me haría falta… / No me haría falta nada porque…') == set()
    assert {'valor 1', 'opción', 'carrera', 'plan_a', 'plan_b', 'primera', 'habilidad'} == MARCADORES


@pytest.mark.parametrize('falta', ['PIEZA_FRASE_HS-LID', 'PIEZA_ORIGEN_GUSTO_LLM', 'PIEZA_GRUPO_CUESTA'])
def test_la_carga_falla_si_falta_un_texto_de_las_piezas(tmp_path, monkeypatch, falta):
    """Ajuste registros llm (lote 2): cada dimensión de los tres tests tiene su frase, y cada pieza sus orígenes."""
    monkeypatch.setattr(fijos, 'TEXTOS_FIJOS', tuple(t for t in fijos.TEXTOS_FIJOS if t[0] != falta))
    with pytest.raises(ValueError, match=f'Faltan textos de piezas: .*{falta}'):
        cargar.preparar_base(f'sqlite:///{(tmp_path / "ruta.db").as_posix()}', 'ruta', crear_tablas=True)


@pytest.mark.parametrize(('cambio', 'mensaje'), [
    ({'b9-9-nada': ('LISTA', 1, 1, False, None)}, 'Falta el ítem b9-9-nada'),
    ({'b2-4-bien': ('LISTA', 1, 4, False, None)}, 'no tiene la forma que esperan las piezas'),
    ({'b1-1-logro': ('LISTA', 1, 2, False, 'NO_RECUERDO')}, 'no tiene la exclusiva NO_RECUERDO'),
])
def test_la_carga_de_contenido_falla_si_un_item_de_las_piezas_no_calza(tmp_path, monkeypatch, cambio, mensaje):
    from datos import contenido
    monkeypatch.setattr(contenido, 'ITEMS_PIEZAS', {**contenido.ITEMS_PIEZAS, **cambio})
    with pytest.raises(ValueError, match=mensaje):
        cargar.preparar_base(f'sqlite:///{(tmp_path / "contenido.db").as_posix()}', 'contenido', crear_tablas=True)
