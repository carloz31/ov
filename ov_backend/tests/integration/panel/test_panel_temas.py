"""Ajuste panel-estudiantes §3: textos de perfil de los avisos y temas «Para conversar», con sus bordes; los temas
son filas de un grupo fuera del Inicio y no cuentan en él."""

from datetime import timedelta

from sqlalchemy import select, update

from app import models as m
from app.models import TipoEventoUso
from soporte_catalogo_ruta import ENFERMERIA, PSICOLOGIA
from soporte_panel import (
    AHORA, alerta, alertas_de, complicacion, conocimiento, cuenta, evento, fijar_ahora, medicion, panel, resultado,
    senales, tarjeta,
)
from soporte_retiro import ciclo


def test_textos_de_perfil_de_los_avisos_con_los_datos_del_estudiante(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    senales(sesion, 'est-luis', 1, 2, 2)
    evento(sesion, 'est-ana', TipoEventoUso.INGRESO, 9)
    resultado(sesion, 'est-mia', plano=True)
    resultado(sesion, 'est-teo', avisos=3)
    sesion.commit()
    luis = alertas_de(sesion, 'est-luis')
    assert luis['seguridad-baja'] == ('Poca seguridad en sus últimas señales',
                                      'Marcó 1, 2 y 2 de 5 (el 17, 18 y 19 de octubre).')
    assert luis['familia-pendiente'] == ('Su familia aún no se registra',
                                         'Su apoderado tiene cuenta, pero no ha ingresado.')
    ana = alertas_de(sesion, 'est-ana')
    assert ana['sin-ingreso'] == ('No ingresa hace 7 días o más', 'Último ingreso: 11 de octubre.')
    assert alertas_de(sesion, 'est-sol')['sin-ingreso'][1] == 'Último ingreso: nunca.'
    assert alertas_de(sesion, 'est-sol')['familia-pendiente'][1] == 'No tiene un apoderado vinculado.'
    assert alertas_de(sesion, 'est-mia')['test-por-revisar'] == (
        'Test de intereses por revisar', 'Su resultado salió plano: todas las respuestas parecidas.')
    assert alertas_de(sesion, 'est-teo')['test-por-revisar'][1] == 'Lo respondió muy rápido (estimado por tiempo).'
    # El Inicio sigue con sus textos de salón.
    assert alerta(panel(cliente), 'seguridad-baja')['nombre'] == 'Se sienten poco seguros en sus últimas señales'


def test_seguridad_baja_con_fechas_de_dos_meses(aplicacion, sesion):
    cuenta_id = cuenta(sesion, 'est-ana').id
    for fecha, nivel in ((AHORA.date() - timedelta(days=21), 2), (AHORA.date() + timedelta(days=12), 1),
                         (AHORA.date() + timedelta(days=13), 2)):
        sesion.add(m.CheckIn(cuenta_id=cuenta_id, fecha=fecha, nivel_seguridad=nivel))
    sesion.commit()
    assert alertas_de(sesion, 'est-ana')['seguridad-baja'][1] == 'Marcó 2, 1 y 2 de 5 (el 29 de septiembre, 1 y 2 de noviembre).'


def test_temas_de_planes_con_sus_bordes(aplicacion, sesion):
    plan_ana = tarjeta(sesion, 'est-ana', ENFERMERIA, 1)
    plan_ana.idea_origen = m.OrigenIdea.FAMILIA
    conocimiento(sesion, plan_ana, DIA_NORMAL='NO', CURSOS='NO', INGRESO='NO', DONDE_TRABAJAR='SI')
    complicacion(sesion, plan_ana, opcion='ECONOMICAS', numero=1)
    complicacion(sesion, plan_ana, otro='DATO DE PRUEBA: el examen de admisión', numero=2)
    plan_luis = tarjeta(sesion, 'est-luis', PSICOLOGIA, 1)
    plan_luis.idea_origen = m.OrigenIdea.MIA
    conocimiento(sesion, plan_luis, DIA_NORMAL='NO', CURSOS='NO', INGRESO='MAS_O_MENOS')  # dos «No»: no alcanza
    secundario = tarjeta(sesion, 'est-luis', ENFERMERIA, 2)
    secundario.idea_origen = m.OrigenIdea.FAMILIA  # solo cuenta el Plan A
    sesion.commit()
    ana = alertas_de(sesion, 'est-ana', en_inicio=False)
    assert ana['plan-idea-ajena'][1] == 'La idea de estudiar Enfermería (su Plan A) vino de su familia.'
    assert ana['plan-conoce-poco'][1] == ('Dice conocer poco su Plan A: respondió «No» a 3 de 5 preguntas (cómo es un '
                                          'día normal, qué cursos lleva y cómo se ingresa).')
    assert ana['plan-complicaciones'][1] == ('Ve como posibles complicaciones de su Plan A: económicas y DATO DE '
                                             'PRUEBA: el examen de admisión.')
    assert list(ana) == ['plan-idea-ajena', 'plan-conoce-poco', 'plan-complicaciones']
    assert alertas_de(sesion, 'est-luis', en_inicio=False) == {}


def test_parametro_cambiado_en_la_base_y_tema_nuevo_con_evaluador_existente(aplicacion, sesion):
    plan = tarjeta(sesion, 'est-ana', ENFERMERIA, 1)
    plan.idea_origen = m.OrigenIdea.MIA
    conocimiento(sesion, plan, DIA_NORMAL='NO', CURSOS='NO')
    sesion.execute(update(m.Alerta).where(m.Alerta.codigo == 'plan-conoce-poco').values(parametros={'minimo_no': 2}))
    grupo = sesion.scalar(select(m.GrupoAlerta).where(m.GrupoAlerta.codigo == 'para-conversar'))
    # DATO DE PRUEBA: una variante de un evaluador existente con otro origen y otro texto.
    sesion.add(m.Alerta(codigo='t-idea-propia', grupo_id=grupo.id, nombre='Idea propia', evaluador='plan_idea_ajena',
                        parametros={'origenes': ['MIA'], 'textos_origen': {'MIA': 'de sí'}}, orden=9,
                        descripcion_perfil='{carrera}: la idea vino {origen}.', destino=m.DestinoPerfil.PLANES))
    sesion.commit()
    ana = alertas_de(sesion, 'est-ana', en_inicio=False)
    assert ana['plan-conoce-poco'][1].startswith('Dice conocer poco su Plan A: respondió «No» a 2 de 5')
    assert ana['t-idea-propia'][1] == 'Enfermería: la idea vino de sí.'
    assert 'plan-idea-ajena' not in ana


def test_dimension_por_trabajar_usa_la_llegada_si_existe(aplicacion, sesion):
    medicion(sesion, 'est-ana', 'APL-PARTIDA', {'AUTO-E': 'POR_TRABAJAR', 'AUTO-A': 'POR_TRABAJAR'}, hace_dias=30)
    medicion(sesion, 'est-luis', 'APL-PARTIDA', {'AUTO-E': 'POR_TRABAJAR'}, hace_dias=30)
    medicion(sesion, 'est-luis', 'APL-LLEGADA', {'AUTO-D': 'POR_TRABAJAR'})
    medicion(sesion, 'est-mia', 'APL-PARTIDA', {'AUTO-E': 'POR_TRABAJAR'}, hace_dias=30)
    medicion(sesion, 'est-mia', 'APL-LLEGADA', {})
    sesion.commit()
    assert alertas_de(sesion, 'est-ana', en_inicio=False)['dimension-por-trabajar'][1] == (
        'En su punto de partida, «Claridad» y «Confianza» quedó por trabajar.')
    assert alertas_de(sesion, 'est-luis', en_inicio=False)['dimension-por-trabajar'][1] == (
        'En su punto de llegada, «Decisión propia» quedó por trabajar.')
    assert alertas_de(sesion, 'est-mia', en_inicio=False) == {}


def test_plan_fuera_de_areas_con_el_criterio_del_inicio(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    from app.services.instrumentos.consultas import resultado_intereses
    ciclo(cliente, cuenta='est-ana')
    ciclo(cliente, cuenta='est-mia', opcion=3)  # perfil plano: sin tema
    recomendadas = [f.codigo for f in resultado_intereses(sesion, cuenta(sesion, 'est-ana')).familias]
    fuera = sesion.scalar(select(m.Carrera).join(m.FamiliaCarrera).where(
        m.FamiliaCarrera.codigo.not_in(recomendadas)).order_by(m.Carrera.codigo).limit(1))
    tarjeta(sesion, 'est-ana', fuera.codigo, 1)
    tarjeta(sesion, 'est-mia', fuera.codigo, 1)
    sesion.commit()
    assert alertas_de(sesion, 'est-ana', en_inicio=False)['plan-fuera-areas'][1] == (
        f'Su Plan A ({fuera.nombre}) no está entre sus áreas sugeridas.')
    assert 'plan-fuera-areas' not in alertas_de(sesion, 'est-mia', en_inicio=False)


def test_los_temas_no_cuentan_en_el_inicio(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    plan = tarjeta(sesion, 'est-ana', ENFERMERIA, 1)
    plan.idea_origen = m.OrigenIdea.FAMILIA
    sesion.commit()
    datos = panel(cliente)
    assert [g['codigo'] for g in datos['avisos']['grupos']] == ['atras']
    assert alerta(datos, 'plan-idea-ajena') is None
    assert 'plan-idea-ajena' in alertas_de(sesion, 'est-ana', en_inicio=False)
    assert 'plan-idea-ajena' not in alertas_de(sesion, 'est-ana', en_inicio=True)


def test_avance_bajo_nombra_el_tramo_de_la_mediana_del_salon(aplicacion, cliente, sesion):
    from soporte_ruta import avanzar
    fijar_ahora(aplicacion)
    for codigo in ('est-ana', 'est-luis'):
        avanzar(cliente, cuenta=codigo)  # T2 «Decisión» (3)
    avanzar(cliente, hasta='t-inicio', cuenta='est-mia')  # T0 «Inicio» (1)
    # est-teo y est-sol sin empezar (0): números 0, 0, 1, 3, 3 → mediana 1 (T0), aunque lo más frecuente sea T2.
    sesion.execute(update(m.Alerta).where(m.Alerta.codigo == 'avance-bajo').values(parametros={'tramos': 1}))
    sesion.commit()
    assert alertas_de(sesion, 'est-teo')['avance-bajo'] == (
        'Va muy por detrás de su salón', 'Va en «Sin empezar»; la mayoría del salón va en «Inicio».')
    assert 'avance-bajo' not in alertas_de(sesion, 'est-mia')
