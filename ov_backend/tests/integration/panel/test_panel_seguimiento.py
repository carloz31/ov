"""Ajuste panel-salon §4: la pestaña Seguimiento en una sola respuesta, el botón «Ver» y el acceso por salón."""

from sqlalchemy import select, update

from app import models as m
from app.models import TipoEventoUso
from soporte_catalogo_ruta import ENFERMERIA, ING_CIVIL, PSICOLOGIA
from soporte_consultas import ContadorConsultas
from soporte_panel import (
    AHORA as AHORA_BD, alerta, cuenta, evento, fijar_ahora, nuevo_estudiante, panel, resultado, senales, tarjeta, ver,
)
from soporte_retiro import ciclo, reiniciar
from soporte_ruta import INTERESES, avanzar, responder

TODOS = {'est-ana', 'est-luis', 'est-mia', 'est-teo', 'est-sol'}


def test_cuatro_estados_del_test_cada_estudiante_en_uno_solo(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    ciclo(cliente, cuenta='est-ana')                       # listo
    ciclo(cliente, cuenta='est-luis', opcion=3)            # perfil plano
    avanzar(cliente, cuenta='est-mia')
    responder(cliente, INTERESES, cuenta='est-mia', fin=2)  # en curso: respondió algo
    resultado(sesion, 'est-teo', plano=True, avisos=2)      # plano y con prisa: cuenta como plano
    resultado(sesion, 'est-sol', avisos=2)                  # prisa
    sesion.commit()
    test = panel(cliente)['test']
    assert test == {'instrumento': 'TEST-RIASEC', 'nombre': 'Test de intereses', 'etiqueta': 'REQUISITO',
                    'listo': 1, 'por_revisar': 3, 'perfil_plano': 2, 'prisa': 1, 'en_curso': 1, 'sin_empezar': 0}
    assert ver(cliente, 'test', 'LISTO') == ['est-ana']
    assert set(ver(cliente, 'test', 'POR_REVISAR')) == {'est-luis', 'est-teo', 'est-sol'}
    assert set(ver(cliente, 'alerta', 'test-por-revisar')) == {'est-luis', 'est-teo', 'est-sol'}
    indicadores = panel(cliente)['indicadores']
    assert (indicadores['test_listo'], indicadores['test_por_revisar'], indicadores['test_sin_terminar']) == (1, 3, 1)
    # Rehacer el test anula el resultado y borra sus respuestas: vuelve a empezar y deja de estar por revisar.
    reiniciar(cliente, cuenta='est-luis')
    assert 'est-luis' in ver(cliente, 'test', 'SIN_EMPEZAR')
    assert 'est-luis' not in ver(cliente, 'alerta', 'test-por-revisar')


def test_el_umbral_de_prisa_del_bloque_y_el_de_la_alerta_son_independientes(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    resultado(sesion, 'est-sol', avisos=1)
    sesion.execute(update(m.Parametro).where(m.Parametro.codigo == 'PANEL_AVISOS_VELOCIDAD_PRISA').values(valor='1'))
    sesion.commit()
    datos = panel(cliente)
    assert datos['test']['prisa'] == 1
    assert alerta(datos, 'test-por-revisar') is None


def test_tramos_detenidos_y_avance_bajo_contra_la_mediana_del_salon(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    for codigo in ('est-ana', 'est-luis', 'est-mia'):
        avanzar(cliente, cuenta=codigo)  # quedan en T2, con la última completada hace 13 días
    datos = panel(cliente)
    assert [(t['codigo'], t['nombre'], t['cantidad']) for t in datos['tramos']] == [
        ('SIN_EMPEZAR', 'Sin empezar', 2), ('T0', 'Inicio', 0), ('T1', 'Camino', 0), ('T2', 'Decisión', 3),
        ('TERMINO', 'Terminó', 0)]
    assert datos['detenidos'] == {'actividad': 't-llegada', 'titulo': 'Punto de llegada', 'cantidad': 3, 'dias': 7}
    assert set(ver(cliente, 'detenidos')) == {'est-ana', 'est-luis', 'est-mia'}
    assert set(ver(cliente, 'tramo', 'T2')) == {'est-ana', 'est-luis', 'est-mia'}
    assert set(ver(cliente, 'tramo', 'SIN_EMPEZAR')) == {'est-teo', 'est-sol'}
    # Mediana 3 (T2): sin empezar es 0 ≤ 3 − 2.
    assert set(ver(cliente, 'alerta', 'avance-bajo')) == {'est-teo', 'est-sol'}
    assert alerta(datos, 'avance-bajo')['descripcion'] == '2 tramos o más por debajo de la mayoría.'
    sesion.execute(update(m.Parametro).where(m.Parametro.codigo == 'PANEL_MINIMO_DETENIDOS').values(valor='4'))
    sesion.commit()
    assert panel(cliente)['detenidos'] is None


def test_detenidos_solo_si_la_ultima_completada_fue_hace_los_dias_del_parametro(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    for codigo in ('est-ana', 'est-luis'):
        avanzar(cliente, cuenta=codigo)
    evento(sesion, 'est-luis', TipoEventoUso.COMPLETA_ACTIVIDAD, 2)
    sesion.commit()
    assert panel(cliente)['detenidos'] is None


def test_bandas_de_seguridad_por_la_ultima_senal_con_los_parametros(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    senales(sesion, 'est-ana', 5, 1)
    senales(sesion, 'est-luis', 1, 3)
    senales(sesion, 'est-mia', 4)
    sesion.commit()
    seguridad = panel(cliente)['seguridad']
    assert seguridad == {'bandas': [
        {'codigo': 'BAJA', 'desde': 1, 'hasta': 2, 'cantidad': 1},
        {'codigo': 'MEDIA', 'desde': 3, 'hasta': 3, 'cantidad': 1},
        {'codigo': 'ALTA', 'desde': 4, 'hasta': 5, 'cantidad': 1}], 'sin_senales': 2}
    assert ver(cliente, 'seguridad_baja') == ['est-ana']
    sesion.execute(update(m.Parametro).where(m.Parametro.codigo == 'PANEL_SEGURIDAD_ALTA_MINIMO').values(valor='3'))
    sesion.commit()
    assert panel(cliente)['seguridad']['bandas'][2] == {'codigo': 'ALTA', 'desde': 3, 'hasta': 5, 'cantidad': 2}


def test_indicadores_de_planes_y_familia(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    tarjeta(sesion, 'est-ana', PSICOLOGIA, 1)
    tarjeta(sesion, 'est-ana', ING_CIVIL, 2)
    tarjeta(sesion, 'est-ana', ENFERMERIA, 3)
    tarjeta(sesion, 'est-luis', PSICOLOGIA, 2)
    tarjeta(sesion, 'est-mia', PSICOLOGIA, None, activa=False)
    evento(sesion, 'apo-rosa', TipoEventoUso.INGRESO, 1)
    vinculo = sesion.scalar(select(m.VinculoFamiliar).where(m.VinculoFamiliar.codigo == 'VIN-LUIS'))
    conversacion = sesion.scalar(select(m.Conversacion.id))
    sesion.add(m.ConversacionVinculo(vinculo_id=vinculo.id, conversacion_id=conversacion, conversada_en=AHORA_BD))
    sesion.commit()
    indicadores = panel(cliente)['indicadores']
    assert (indicadores['con_plan_a'], indicadores['con_tres_planes']) == (1, 1)
    assert (indicadores['familias_participando'], indicadores['familias_ruta_completa'],
            indicadores['familias_conversaron']) == (2, 0, 1)


def test_otros_cuestionarios_en_orden_con_etiqueta(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    avanzar(cliente)  # responde la partida completa
    resultado(sesion, 'est-luis', aplicacion='APL-HABILIDADES')
    sesion.commit()
    assert [(c['aplicacion'], c['etiqueta'], c['n']) for c in panel(cliente)['cuestionarios']] == [
        ('APL-PARTIDA', 'CAMINO', 1), ('APL-LLEGADA', 'CAMINO', 0), ('APL-INTELIGENCIAS', 'OPCIONAL', 0),
        ('APL-HABILIDADES', 'OPCIONAL', 1)]


def test_acceso_por_salon_y_todos_mis_salones(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    panel(cliente, salon='5B', esperado=404)
    panel(cliente, salon='NO-EXISTE', esperado=404)
    assert cliente.get('/cuentas/est-ana/panel/seguimiento').status_code == 404
    assert cliente.get('/cuentas/apo-rosa/panel/estudiantes?conjunto=avisos').status_code == 404
    ver(cliente, 'no-existe', esperado=422)
    ver(cliente, 'alerta', 'no-existe', esperado=422)
    ver(cliente, 'test', 'OTRO', esperado=422)
    ori = cuenta(sesion, 'ori-carmen')
    salon_b = sesion.scalar(select(m.Salon).where(m.Salon.codigo == '5B'))
    sesion.add(m.OrientadoraSalon(orientadora_id=ori.id, salon_id=salon_b.id, es_principal=False))
    sesion.commit()
    todos = panel(cliente, salon=None)
    assert todos['salon'] is None and todos['total_estudiantes'] == 6
    # El test de intereses es requisito en 5A y no en 5B.
    assert todos['test']['etiqueta'] == 'REQUISITO_ALGUNOS'
    assert panel(cliente, salon='5B')['total_estudiantes'] == 1
    filas = cliente.get('/cuentas/ori-carmen/panel/estudiantes', params={'conjunto': 'avisos'}).json()
    assert {'codigo': 'est-beto', 'nombre': 'Beto', 'salon': 'Quinto B'} in filas


def test_avance_bajo_compara_contra_su_propio_salon_en_todos_mis_salones(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    ori = cuenta(sesion, 'ori-carmen')
    salon_b = sesion.scalar(select(m.Salon).where(m.Salon.codigo == '5B'))
    sesion.add(m.OrientadoraSalon(orientadora_id=ori.id, salon_id=salon_b.id, es_principal=False))
    sesion.commit()
    for codigo in ('est-ana', 'est-luis', 'est-mia'):
        avanzar(cliente, cuenta=codigo)
    # Beto está solo en 5B y sin empezar: es la mediana de su salón, no va atrasado.
    assert set(ver(cliente, 'alerta', 'avance-bajo', salon=None)) == {'est-teo', 'est-sol'}


def test_el_numero_de_consultas_no_crece_con_el_salon(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)

    def contar():
        with ContadorConsultas(aplicacion.state.motor_bd) as contador:
            panel(cliente)
            ver(cliente, 'avisos')
        return contador.cantidad

    pocas = contar()
    for indice in range(20):
        nuevo = nuevo_estudiante(sesion, f't-panel-{indice}', f'Estudiante {indice}')
        sesion.add(m.CheckIn(cuenta_id=nuevo.id, fecha=AHORA_BD.date(), nivel_seguridad=1))
    sesion.commit()
    assert contar() == pocas


def test_no_lleva_texto_del_diario_ni_de_registros(aplicacion, cliente):
    fijar_ahora(aplicacion)
    texto = str(panel(cliente))
    assert 'diario' not in texto.lower()
