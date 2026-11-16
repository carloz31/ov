"""Ajuste panel-estudiantes §3: textos de perfil de los avisos y temas «Para conversar», con sus bordes; los temas
son filas de un grupo fuera del Inicio y no cuentan en él. Ajuste pendientes-orientadora: las reglas de planes y de
partida y llegada (las de registro, sobre `contenido`, están en `test_panel_temas_registro.py`)."""

from datetime import timedelta

from sqlalchemy import select, update

from app import models as m
from app.models import TipoEventoUso
from soporte_catalogo_ruta import ENFERMERIA, PSICOLOGIA
from soporte_panel import (
    AHORA, alerta, alertas_de, complicacion, conocimiento, cuenta, duda, evento, fijar_ahora, medicion, panel,
    resultado, senales, tarjeta,
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
    assert luis['familia-pendiente'] == ('Su apoderado aún no inicia sesión',
                                         'Su apoderado aún no ha iniciado sesión en la plataforma.')
    ana = alertas_de(sesion, 'est-ana')
    assert ana['sin-ingreso'] == ('No ingresa hace 7 días o más', 'Último ingreso: 11 de octubre.')
    assert alertas_de(sesion, 'est-sol')['sin-ingreso'][1] == 'Último ingreso: nunca.'
    assert alertas_de(sesion, 'est-sol')['familia-pendiente'][1] == 'Su apoderado aún no ha iniciado sesión en la plataforma.'
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


def test_plan_medidor_poco_entusiasmo_con_y_sin_idea_de_la_familia(aplicacion, sesion):
    ana = tarjeta(sesion, 'est-ana', ENFERMERIA, 1)
    ana.entusiasmo, ana.idea_origen = 1, m.OrigenIdea.FAMILIA
    luis = tarjeta(sesion, 'est-luis', PSICOLOGIA, 1)
    luis.entusiasmo, luis.idea_origen = 1, m.OrigenIdea.MIA
    mia = tarjeta(sesion, 'est-mia', PSICOLOGIA, 1)
    mia.entusiasmo = 2  # «Algo»: no cumple
    tarjeta(sesion, 'est-teo', PSICOLOGIA, 1)  # sin marcar: no cuenta
    secundario = tarjeta(sesion, 'est-sol', PSICOLOGIA, 2)
    secundario.entusiasmo = 1  # solo cuenta el Plan A; sin Plan A no hay tema
    sesion.commit()
    assert alertas_de(sesion, 'est-ana', en_inicio=False)['plan-poco-entusiasmo'][1] == (
        'Marcó “Poco” en “Me entusiasma” frente a su Plan A (Enfermería). La idea de estudiarla vino de su familia.')
    assert alertas_de(sesion, 'est-luis', en_inicio=False)['plan-poco-entusiasmo'][1] == (
        'Marcó “Poco” en “Me entusiasma” frente a su Plan A (Psicología).')
    for codigo in ('est-mia', 'est-teo', 'est-sol'):
        assert 'plan-poco-entusiasmo' not in alertas_de(sesion, codigo, en_inicio=False)


def test_plan_se_ve_lejos_con_dos_medidores_y_complicaciones(aplicacion, sesion):
    ana = tarjeta(sesion, 'est-ana', ENFERMERIA, 1)
    ana.capacidad, ana.recursos = 1, 1
    complicacion(sesion, ana, opcion='ECONOMICAS', numero=1)
    complicacion(sesion, ana, otro='DATO DE PRUEBA: el examen de admisión', numero=2)
    luis = tarjeta(sesion, 'est-luis', PSICOLOGIA, 1)
    luis.capacidad, luis.recursos = 3, 1
    sesion.commit()
    assert alertas_de(sesion, 'est-ana', en_inicio=False)['plan-se-ve-lejos'][1] == (
        'Marcó “Poco” en “Me siento capaz” y “Tengo cómo lograrlo” frente a su Plan A (Enfermería). Ve como '
        'posibles complicaciones: económicas y DATO DE PRUEBA: el examen de admisión.')
    assert alertas_de(sesion, 'est-luis', en_inicio=False)['plan-se-ve-lejos'][1] == (
        'Marcó “Poco” en “Tengo cómo lograrlo” frente a su Plan A (Psicología).')


def test_plan_conoce_poco_con_cero_una_y_varias_dudas(aplicacion, sesion):
    planes = {}
    for codigo, abiertas in (('est-ana', 0), ('est-luis', 1), ('est-mia', 3)):
        plan = planes[codigo] = tarjeta(sesion, codigo, ENFERMERIA, 1)
        conocimiento(sesion, plan, DIA_NORMAL='NO', CURSOS='NO', INGRESO='NO', DONDE_TRABAJAR='SI')
        for numero in range(1, abiertas + 1):
            duda(sesion, plan, numero)
    duda(sesion, planes['est-ana'], 9, abierta=False)  # una cerrada no cuenta
    plan_teo = tarjeta(sesion, 'est-teo', PSICOLOGIA, 1)
    conocimiento(sesion, plan_teo, DIA_NORMAL='NO', CURSOS='NO', INGRESO='MAS_O_MENOS')  # dos «No»: no alcanza
    sesion.commit()
    inicio = 'Dice conocer poco su Plan A: respondió “No” a 3 de 5 preguntas.'
    assert alertas_de(sesion, 'est-ana', en_inicio=False)['plan-conoce-poco'][1] == inicio
    assert alertas_de(sesion, 'est-luis', en_inicio=False)['plan-conoce-poco'][1] == f'{inicio} Tiene 1 duda abierta.'
    assert alertas_de(sesion, 'est-mia', en_inicio=False)['plan-conoce-poco'][1] == f'{inicio} Tiene 3 dudas abiertas.'
    assert 'plan-conoce-poco' not in alertas_de(sesion, 'est-teo', en_inicio=False)


def test_parametros_cambiados_en_la_base_y_tema_nuevo_con_evaluador_existente(aplicacion, sesion):
    plan = tarjeta(sesion, 'est-ana', ENFERMERIA, 1)
    plan.entusiasmo, plan.recursos = 2, 3
    conocimiento(sesion, plan, DIA_NORMAL='NO', CURSOS='NO')
    sesion.execute(update(m.Alerta).where(m.Alerta.codigo == 'plan-conoce-poco').values(parametros={'minimo_no': 2}))
    poco = sesion.scalar(select(m.Alerta).where(m.Alerta.codigo == 'plan-poco-entusiasmo'))
    poco.parametros = {**poco.parametros, 'nivel_maximo': 2}
    grupo = sesion.scalar(select(m.GrupoAlerta).where(m.GrupoAlerta.codigo == 'para-conversar'))
    # DATO DE PRUEBA: una variante de un evaluador existente sobre otro medidor y con otro texto.
    sesion.add(m.Alerta(codigo='t-recursos-altos', grupo_id=grupo.id, nombre='Recursos', evaluador='plan_medidor',
                        parametros={'medidores': ['recursos'], 'nivel_maximo': 3,
                                    'nombres_medidores': {'recursos': 'Tengo cómo lograrlo'},
                                    'niveles': ['Poco', 'Algo', 'Mucho']}, orden=0,
                        descripcion_perfil='{medidor}: {nivel}.', destino=m.DestinoPerfil.PLANES))
    sesion.commit()
    ana = alertas_de(sesion, 'est-ana', en_inicio=False)
    assert ana['plan-conoce-poco'][1] == 'Dice conocer poco su Plan A: respondió “No” a 2 de 5 preguntas.'
    assert ana['plan-poco-entusiasmo'][1] == 'Marcó “Algo” en “Me entusiasma” frente a su Plan A (Enfermería).'
    assert ana['t-recursos-altos'][1] == 'Tengo cómo lograrlo: Mucho.'
    assert list(ana)[0] == 't-recursos-altos'  # el `orden` de la base es el de la lista
    sesion.execute(update(m.Alerta).where(m.Alerta.codigo == 't-recursos-altos').values(activa=False))
    sesion.commit()
    assert 't-recursos-altos' not in alertas_de(sesion, 'est-ana', en_inicio=False)


def test_llegada_sin_avance_con_sus_bordes(aplicacion, sesion):
    # Solo partida: no hay tema (eso ya se ve en «Cómo empezó»).
    medicion(sesion, 'est-ana', 'APL-PARTIDA', {'AUTO-E': 'POR_TRABAJAR'}, hace_dias=30)
    # Una dimensión que baja.
    medicion(sesion, 'est-luis', 'APL-PARTIDA', {'AUTO-D': 'FUERTE'}, hace_dias=30)
    medicion(sesion, 'est-luis', 'APL-LLEGADA', {'AUTO-D': 'EN_CAMINO'})
    # Una que sigue por trabajar.
    medicion(sesion, 'est-mia', 'APL-PARTIDA', {'AUTO-E': 'POR_TRABAJAR'}, hace_dias=30)
    medicion(sesion, 'est-mia', 'APL-LLEGADA', {'AUTO-E': 'POR_TRABAJAR'})
    # Las dos a la vez.
    medicion(sesion, 'est-teo', 'APL-PARTIDA', {'AUTO-E': 'POR_TRABAJAR', 'AUTO-D': 'FUERTE', 'AUTO-A': 'FUERTE'},
             hace_dias=30)
    medicion(sesion, 'est-teo', 'APL-LLEGADA', {'AUTO-E': 'POR_TRABAJAR'})
    # Todas suben o se mantienen fuera de «por trabajar».
    medicion(sesion, 'est-sol', 'APL-PARTIDA', {'AUTO-E': 'POR_TRABAJAR'}, hace_dias=30)
    medicion(sesion, 'est-sol', 'APL-LLEGADA', {'AUTO-E': 'FUERTE'})
    sesion.commit()
    assert 'llegada-sin-avance' not in alertas_de(sesion, 'est-ana', en_inicio=False)
    assert alertas_de(sesion, 'est-luis', en_inicio=False)['llegada-sin-avance'][1] == (
        'Entre la partida y la llegada: Decisión propia bajó.')
    assert alertas_de(sesion, 'est-mia', en_inicio=False)['llegada-sin-avance'][1] == (
        'Entre la partida y la llegada: Confianza sigue por trabajar.')
    assert alertas_de(sesion, 'est-teo', en_inicio=False)['llegada-sin-avance'][1] == (
        'Entre la partida y la llegada: Claridad y Decisión propia bajó; Confianza sigue por trabajar.')
    assert 'llegada-sin-avance' not in alertas_de(sesion, 'est-sol', en_inicio=False)


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
    plan.entusiasmo = 1
    sesion.commit()
    datos = panel(cliente)
    assert [g['codigo'] for g in datos['avisos']['grupos']] == ['atras']
    assert alerta(datos, 'plan-poco-entusiasmo') is None
    assert 'plan-poco-entusiasmo' in alertas_de(sesion, 'est-ana', en_inicio=False)
    assert 'plan-poco-entusiasmo' not in alertas_de(sesion, 'est-ana', en_inicio=True)


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
        'Va muy por detrás de su salón', 'Va en Sin empezar; la mayoría del salón va en Inicio.')
    assert 'avance-bajo' not in alertas_de(sesion, 'est-mia')
