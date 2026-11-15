"""Ajuste pendientes-orientadora: temas «Para conversar» que salen de una elección de registro (`eleccion_registro`,
`valores_fuera_del_plan`), sobre `contenido` (los ítems son suyos). El estado se siembra directo en la base."""

import pytest
from sqlalchemy import select, update

from app import models as m
from soporte_catalogo_ruta import ENFERMERIA, PERIODISMO, PSICOLOGIA
from soporte_panel import alertas_de, motivos, nuevo_estudiante, registro, tarjeta


@pytest.fixture
def base(sesion_contenido):
    nuevo_estudiante(sesion_contenido, 'est-tema', 'DATO DE PRUEBA: Estudiante de temas')
    sesion_contenido.commit()
    return sesion_contenido


def _temas(sesion, codigo='est-tema'):
    return alertas_de(sesion, codigo, en_inicio=False)


def _nombre(sesion, carrera):
    return sesion.scalar(select(m.Carrera.nombre).where(m.Carrera.codigo == carrera))


def test_voces_chocan_con_la_voz_elegida(base):
    registro(base, 'est-tema', 'b1-3-voz', [('MAMA', 'Mamá')])
    registro(base, 'est-tema', 'b1-3-contraste', [('CHOCAN', 'Chocan')])
    base.commit()
    assert _temas(base)['voces-chocan'][1] == (
        'Marcó que lo que se espera en su entorno y lo que quiere hacer al terminar el colegio chocan. La voz que '
        'eligió: Mamá.')


@pytest.mark.parametrize('voz', [[('NADIE', 'Nadie me lo ha dicho claramente')], 'sensible', None])
def test_voces_chocan_sin_frase_si_la_voz_es_la_exclusiva_sensible_o_no_esta(base, voz):
    if voz == 'sensible':
        registro(base, 'est-tema', 'b1-3-voz', [('PAPA', 'Papá')], sensible=True)
    elif voz is not None:
        registro(base, 'est-tema', 'b1-3-voz', voz)
    registro(base, 'est-tema', 'b1-3-contraste', [('CHOCAN', 'Chocan')])
    base.commit()
    assert _temas(base)['voces-chocan'][1].endswith('al terminar el colegio chocan.')


def test_eleccion_registro_con_otra_opcion_sensible_o_emocional_no_cumple(base):
    otros = [nuevo_estudiante(base, f'est-tema-{n}', f'DATO DE PRUEBA: {n}').codigo for n in range(1, 4)]
    registro(base, otros[0], 'b1-3-contraste', [('COINCIDEN', 'Coinciden')])
    registro(base, otros[1], 'b1-3-contraste', [('CHOCAN', 'Chocan')], sensible=True)
    registro(base, otros[2], 'b1-3-contraste', [('CHOCAN', 'Chocan')], tipo_final='emocional')
    registro(base, 'est-tema', 'b1-3-contraste', [('CHOCAN', 'Chocan')], tipo_final='vacio',
             estado=m.EstadoRespuestaRegistro.ABIERTO)  # el texto sin contenido o abierto no importa
    base.commit()
    for codigo in otros:
        assert 'voces-chocan' not in _temas(base, codigo)
    assert 'voces-chocan' in _temas(base)


def test_eleccion_registro_usa_el_intento_vigente_tras_una_edicion(base):
    registro(base, 'est-tema', 'b4-2-estilo', [('MIEDO', 'Me da miedo equivocarme')])
    base.commit()
    assert _temas(base)['forma-de-decidir'][1] == 'Sobre cómo decide las cosas importantes, marcó: «Me da miedo equivocarme».'
    registro(base, 'est-tema', 'b4-2-estilo', [('CALMA', 'Lo pienso con calma y comparo')])
    base.commit()
    assert 'forma-de-decidir' not in _temas(base)


def _moneda(sesion, plan_a, plan_b, valores=True):
    marcadores = {'plan_a': _nombre(sesion, plan_a), 'plan_b': _nombre(sesion, plan_b)}
    registro(sesion, 'est-tema', 'b4-5-moneda', [('DESANIME', 'Me desanimé')],
             valores={'marcadores': marcadores, 'ecos_llm': []} if valores else None)


def test_plan_b_desanima_con_los_planes_con_que_respondio(base):
    tarjeta(base, 'est-tema', PSICOLOGIA, 1)
    tarjeta(base, 'est-tema', ENFERMERIA, 2)
    _moneda(base, PSICOLOGIA, ENFERMERIA)
    base.commit()
    assert _temas(base)['plan-b-desanima'][1] == (
        f'Al imaginar que le tocaba su Plan B ({_nombre(base, ENFERMERIA)}), marcó «Me desanimé».')


@pytest.mark.parametrize('caso', ['plan_b_cambiado', 'plan_b_eliminado', 'sin_valores'])
def test_plan_b_desanima_se_omite_si_cambio_el_plan_o_no_quedo_guardado(base, caso):
    tarjeta(base, 'est-tema', PSICOLOGIA, 1)
    if caso == 'plan_b_cambiado':
        tarjeta(base, 'est-tema', PERIODISMO, 2)
    elif caso == 'sin_valores':
        tarjeta(base, 'est-tema', ENFERMERIA, 2)
    _moneda(base, PSICOLOGIA, ENFERMERIA, valores=caso != 'sin_valores')
    base.commit()
    assert 'plan-b-desanima' not in _temas(base)


def test_proyecto_poco_seguro_se_omite_si_cambio_su_plan_a_y_sin_valor_guardado_se_muestra(base):
    tarjeta(base, 'est-tema', PSICOLOGIA, 1)
    eco = {'codigo': 'b5-1-ref-planes', 'nombre': 'Tu proyecto hoy', 'forma': 'proyecto', 'carrera': None,
           'institucion': None, 'camino': None}
    registro(base, 'est-tema', 'b5-1-seguridad', [('POCO', 'Poco seguro/a')],
             valores={'marcadores': {}, 'ecos_mostrar': [{**eco, 'carrera': _nombre(base, PSICOLOGIA)}]})
    base.commit()
    assert _temas(base)['proyecto-poco-seguro'][1] == 'Frente a su proyecto, marcó «Poco seguro/a».'
    registro(base, 'est-tema', 'b5-1-seguridad', [('POCO', 'Poco seguro/a')],
             valores={'marcadores': {}, 'ecos_mostrar': [{**eco, 'carrera': _nombre(base, ENFERMERIA)}]})
    base.commit()
    assert 'proyecto-poco-seguro' not in _temas(base)
    registro(base, 'est-tema', 'b5-1-seguridad', [('POCO', 'Poco seguro/a')], valores=None)
    base.commit()
    assert 'proyecto-poco-seguro' in _temas(base)


PODIO = [('ESTABILIDAD', 'Estabilidad'), ('INGRESOS', 'Ingresos'), ('AYUDAR', 'Ayudar a otros')]


def test_valores_fuera_del_plan_ninguno_coincide(base):
    plan = tarjeta(base, 'est-tema', PSICOLOGIA, 1)
    motivos(base, plan, 'CREAR', 'AUTONOMIA', 'APRENDER', 'COMUNIDAD', otros=['DATO DE PRUEBA: me gusta'])
    registro(base, 'est-tema', 'b2-3-valores', PODIO)
    base.commit()
    assert _temas(base)['valores-fuera-del-plan'][1] == (
        'Lo que más valora en un trabajo (Estabilidad, Ingresos y Ayudar a otros) no aparece entre los motivos de su '
        'Plan A (Crear, Autonomía y Aprender).')


@pytest.mark.parametrize('caso', ['uno_coincide', 'solo_a_mano', 'sin_podio', 'podio_sensible'])
def test_valores_fuera_del_plan_no_cumple(base, caso):
    plan = tarjeta(base, 'est-tema', PSICOLOGIA, 1)
    if caso == 'uno_coincide':
        motivos(base, plan, 'CREAR', 'INGRESOS')
    elif caso == 'solo_a_mano':
        motivos(base, plan, otros=['DATO DE PRUEBA: me gusta'])
    else:
        motivos(base, plan, 'CREAR')
    if caso != 'sin_podio':
        registro(base, 'est-tema', 'b2-3-valores', PODIO, sensible=caso == 'podio_sensible')
    base.commit()
    assert 'valores-fuera-del-plan' not in _temas(base)


def test_cambiar_opciones_en_la_base_y_fila_nueva_sobre_otro_item(base):
    registro(base, 'est-tema', 'b4-2-estilo', [('CALMA', 'Lo pienso con calma y comparo')])
    registro(base, 'est-tema', 'b1-7-dia', [('CUESTA', 'Me cuesta imaginarlo')])
    fila = base.scalar(select(m.Alerta).where(m.Alerta.codigo == 'forma-de-decidir'))
    fila.parametros = {**fila.parametros, 'opciones': ['CALMA']}
    grupo = base.scalar(select(m.GrupoAlerta.id).where(m.GrupoAlerta.codigo == 'para-conversar'))
    # DATO DE PRUEBA: un tema nuevo es solo una fila.
    base.add(m.Alerta(codigo='t-dia-cuesta', grupo_id=grupo, nombre='Le cuesta imaginar su día',
                      evaluador='eleccion_registro', parametros={'item': 'b1-7-dia', 'opciones': ['CUESTA']},
                      orden=11, descripcion_perfil='Sobre su día a los 23, marcó «{opcion}».',
                      destino=m.DestinoPerfil.RESPUESTAS))
    base.commit()
    temas = _temas(base)
    assert temas['forma-de-decidir'][1].endswith('«Lo pienso con calma y comparo».')
    assert temas['t-dia-cuesta'][1] == 'Sobre su día a los 23, marcó «Me cuesta imaginarlo».'
    base.execute(update(m.Alerta).where(m.Alerta.codigo == 't-dia-cuesta').values(activa=False))
    base.commit()
    assert 't-dia-cuesta' not in _temas(base)
