"""B11 · Planes de carrera: tarjetas, secciones, totales, dudas, sugerencias de respaldo, pasos, orden y avisos."""

import pytest
from sqlalchemy import select

from app import models as m
from soporte_planes import (
    RELATO, abrir_planes, abrir_secciones, crear, estados, guardar, plan, planes, por_que_lista, realidad_lista,
)
from soporte_retiro import buscar, medir
from soporte_ruta import pedir
from soporte_catalogo_ruta import (
    ENFERMERIA, ING_AMBIENTAL, ING_CIVIL, INST_FFAA, INST_PRIVADA, INST_UNI, PERIODISMO, PSICOLOGIA,
)


@pytest.fixture
def respaldo(aplicacion):
    """Sin LLM: cada duda o complicación nueva recibe su paso de respaldo."""
    aplicacion.state.evaluador_respuestas.falla_sugerencias = True


def test_hu043_hasta_tres_planes_sin_repetir_carrera(cliente):
    abrir_planes(cliente)
    respuesta = crear(cliente, PSICOLOGIA)
    assert respuesta['eventos_registrados'][0]['tipo'] == 'CREA_PLAN'
    assert respuesta['eventos_registrados'][0]['referencia'] == PSICOLOGIA
    assert crear(cliente, PSICOLOGIA, esperado=409)['detail']['mensaje'] == 'Ya tienes un plan para esa carrera'
    crear(cliente, PERIODISMO)
    crear(cliente, ENFERMERIA)
    assert 'elimina uno' in crear(cliente, ING_CIVIL, esperado=409)['detail']['mensaje']
    crear(cliente, 'no-existe', esperado=404)
    assert [p['prioridad'] for p in planes(cliente)['planes']] == ['A', 'B', 'C']
    assert planes(cliente)['maximo_planes'] == 3


def test_seccion_planes_cerrada_y_cuentas_ajenas(cliente):
    assert planes(cliente, esperado=409)['detail']['mensaje'] == 'Completa el inicio para abrir tus planes.'
    crear(cliente, PSICOLOGIA, esperado=409)
    planes(cliente, cuenta='apo-rosa', esperado=404)
    planes(cliente, cuenta='ori-carmen', esperado=404)
    planes(cliente, cuenta='no-existe', esperado=404)


def test_hu099_seccion_bloqueada_dice_que_actividad_la_abre_y_no_guarda(cliente):
    abrir_planes(cliente)
    crear(cliente, PSICOLOGIA)
    detalle = guardar(cliente, PSICOLOGIA, 'REALIDAD', realidad_lista(), esperado=409)['detail']
    assert detalle['mensaje'] == 'Completa el registro de exploración para ver qué tan real es esta opción.'
    assert detalle['progreso']['objetivo'] == {'tipo': 'SECCION_PLAN', 'codigo': 'REALIDAD'}
    psicologia = plan(cliente, PSICOLOGIA)
    assert psicologia['institucion'] is None and psicologia['gastos'] == []
    secciones = {s['codigo']: s for s in psicologia['secciones']}
    assert secciones['POR_QUE']['estado'] == 'POR_EMPEZAR' and secciones['POR_QUE']['bloqueo'] is None
    faltantes = {codigo: s['bloqueo'][0]['condiciones_faltantes'][0]['referencia']
                 for codigo, s in secciones.items() if s['estado'] == 'BLOQUEADA'}
    assert faltantes == {'CONOCIMIENTO': 't-valores', 'REALIDAD': 't-explorar', 'PASOS': 't-comparar'}
    guardar(cliente, PERIODISMO, 'POR_QUE', por_que_lista(), esperado=409)


def test_hu044_hu048_estado_por_seccion_y_listo_para_comparar(cliente):
    abrir_planes(cliente)
    abrir_secciones(cliente, 'CONOCIMIENTO', 'REALIDAD', 'PASOS')
    crear(cliente, PSICOLOGIA)
    guardar(cliente, PSICOLOGIA, 'POR_QUE', {'idea_origen': 'MIA', 'motivos': [{'opcion': 'AYUDAR'}],
                                               'relato': 'Corto.'})
    assert estados(plan(cliente, PSICOLOGIA)) == {
        'POR_QUE': 'EN_PROCESO', 'CONOCIMIENTO': 'POR_EMPEZAR', 'REALIDAD': 'POR_EMPEZAR', 'PASOS': 'POR_EMPEZAR'}
    guardar(cliente, PSICOLOGIA, 'POR_QUE', por_que_lista())
    psicologia = plan(cliente, PSICOLOGIA)
    assert psicologia['motivos'] == [{'opcion': 'AYUDAR', 'otro': None, 'posicion': 1},
                                     {'opcion': None, 'otro': 'Me gusta explicar', 'posicion': 2}]
    assert (psicologia['idea_origen'], psicologia['relato']) == ('MIA', RELATO)
    guardar(cliente, PSICOLOGIA, 'REALIDAD', realidad_lista(financiamiento=[]))
    assert estados(plan(cliente, PSICOLOGIA))['REALIDAD'] == 'EN_PROCESO'
    assert plan(cliente, PSICOLOGIA)['lista_para_comparar'] is False
    guardar(cliente, PSICOLOGIA, 'REALIDAD', realidad_lista())
    guardar(cliente, PSICOLOGIA, 'CONOCIMIENTO', {'respuestas': {'DIA_NORMAL': 'SI'}})
    psicologia = plan(cliente, PSICOLOGIA)
    assert estados(psicologia) == {
        'POR_QUE': 'LISTA', 'CONOCIMIENTO': 'EN_PROCESO', 'REALIDAD': 'LISTA', 'PASOS': 'POR_EMPEZAR'}
    assert psicologia['lista_para_comparar'] is True
    guardar(cliente, PSICOLOGIA, 'CONOCIMIENTO', {'respuestas': dict.fromkeys(
        ('DIA_NORMAL', 'DONDE_TRABAJAR', 'CURSOS', 'INGRESO', 'CONOCE_ALGUIEN'), 'SI')})
    guardar(cliente, PSICOLOGIA, 'PASOS', {'pasos': [{'tipo': 'conversar', 'texto': 'Hablar con una psicóloga.'}]})
    assert set(estados(plan(cliente, PSICOLOGIA)).values()) == {'LISTA'}
    # Guardar una sección solo reemplaza esa sección.
    guardar(cliente, PSICOLOGIA, 'POR_QUE', {})
    psicologia = plan(cliente, PSICOLOGIA)
    assert estados(psicologia)['POR_QUE'] == 'EN_PROCESO' and psicologia['institucion']['codigo'] == INST_UNI


def test_validaciones_de_las_secciones(cliente):
    abrir_planes(cliente)
    abrir_secciones(cliente, 'CONOCIMIENTO', 'REALIDAD', 'PASOS')
    crear(cliente, PSICOLOGIA)
    guardar(cliente, PSICOLOGIA, 'POR_QUE', {'motivos': [{'opcion': 'NO-EXISTE'}]}, esperado=422)
    guardar(cliente, PSICOLOGIA, 'POR_QUE', {'motivos': [{'opcion': 'AYUDAR'}, {'opcion': 'AYUDAR'}]}, esperado=422)
    guardar(cliente, PSICOLOGIA, 'POR_QUE', {'motivos': [{'opcion': 'AYUDAR', 'otro': 'Y algo más'}]}, esperado=422)
    guardar(cliente, PSICOLOGIA, 'POR_QUE', {'idea_origen': 'NADIE'}, esperado=422)
    guardar(cliente, PSICOLOGIA, 'REALIDAD', realidad_lista(institucion=INST_FFAA), esperado=422)
    guardar(cliente, PSICOLOGIA, 'REALIDAD', realidad_lista(gastos=[
        {'rubro': 'MATRICULA', 'monto': -1, 'frecuencia': 'UNICA'}]), esperado=422)
    guardar(cliente, PSICOLOGIA, 'CONOCIMIENTO', {'dudas': [{'origen': 'PROPIA'}]}, esperado=422)
    guardar(cliente, PSICOLOGIA, 'CONOCIMIENTO', {'dudas': [{'numero': 1}]}, esperado=422)
    guardar(cliente, PSICOLOGIA, 'PASOS', {'pasos': [{'tipo': 'nadar', 'texto': 'DATO DE PRUEBA'}]}, esperado=422)
    guardar(cliente, PSICOLOGIA, 'PASOS', {'sugerencias_descartadas': [1]}, esperado=422)
    pedir(cliente, 'POST', '/acciones/planes/guardar-seccion',
          {'cuenta': 'est-ana', 'carrera': PSICOLOGIA, 'seccion': 'OTRA', 'datos': {}}, 422)
    assert set(estados(plan(cliente, PSICOLOGIA)).values()) == {'POR_EMPEZAR'}


def test_hu045_totales_por_frecuencia_y_de_la_carrera(cliente, sesion):
    abrir_planes(cliente)
    abrir_secciones(cliente, 'REALIDAD')
    crear(cliente, ING_AMBIENTAL)
    gastos = [{'rubro': 'ADMISION', 'monto': 350, 'frecuencia': 'UNICA'},
              {'rubro': 'TRANSPORTE', 'monto': 150, 'frecuencia': 'MENSUAL'},
              {'rubro': 'MATRICULA', 'monto': 600, 'frecuencia': 'POR_CICLO'},
              {'otro': 'Seguro', 'monto': 101, 'frecuencia': 'ANUAL'}]
    guardar(cliente, ING_AMBIENTAL, 'REALIDAD', realidad_lista(gastos=gastos))
    ambiental = plan(cliente, ING_AMBIENTAL)
    assert ambiental['totales_por_frecuencia'] == {'UNICA': 350, 'MENSUAL': 150, 'POR_CICLO': 600, 'ANUAL': 101}
    assert ambiental['total_primer_anio'] == 350 + 12 * 150 + 2 * 600 + 101
    # t-uni: 10 ciclos son 5 años.
    assert ambiental['total_carrera'] == 350 + 10 * (6 * 150 + 600) + 5 * 101
    assert ambiental['gastos'][3] == {'rubro': None, 'otro': 'Seguro', 'monto': 101, 'frecuencia': 'ANUAL'}
    # t-privada: 11 ciclos son 5,5 años; sin división entera y redondeado solo al final (17 405,5).
    guardar(cliente, ING_AMBIENTAL, 'REALIDAD', realidad_lista(institucion=INST_PRIVADA, gastos=gastos))
    ambiental = plan(cliente, ING_AMBIENTAL)
    assert ambiental['total_carrera'] == 17406
    assert ambiental['institucion']['gestion'] == 'PRIVADA'
    # Cambiar de institución no toca los montos, que son del estudiante.
    assert [g['monto'] for g in ambiental['gastos']] == [350, 150, 600, 101]
    # DATO DE PRUEBA: sin la duración de la carrera en la institución, no hay total de la carrera.
    sesion.get(m.InstitucionCarrera, (buscar(sesion, m.Institucion, INST_UNI).id,
                                      buscar(sesion, m.Carrera, PSICOLOGIA).id)).duracion_ciclos = None
    sesion.commit()
    crear(cliente, PSICOLOGIA)
    guardar(cliente, PSICOLOGIA, 'REALIDAD', realidad_lista(gastos=gastos))
    assert plan(cliente, PSICOLOGIA)['total_carrera'] is None


def test_opciones_de_la_tarjeta_para_la_precarga(cliente):
    abrir_planes(cliente)
    opciones = planes(cliente)['opciones']
    rubros = {r['codigo']: r for r in opciones['rubros']}
    assert list(rubros) == ['PREPARACION', 'ADMISION', 'MATRICULA', 'PENSION', 'MATERIALES', 'TRANSPORTE',
                            'ALIMENTACION', 'VIVIENDA']
    assert rubros['PENSION'] == {'codigo': 'PENSION', 'texto': 'Pensión', 'frecuencia_recomendada': 'MENSUAL',
                                 'monto_referencia': 1800, 'cero_si_publica': True, 'solo_si_camino_prepara': False}
    assert rubros['PREPARACION']['solo_si_camino_prepara'] is True
    assert rubros['VIVIENDA']['frecuencia_recomendada'] is None and rubros['VIVIENDA']['monto_referencia'] is None
    assert [c['codigo'] for c in opciones['caminos'] if c['incluye_preparacion']] == ['PREPARARME']
    assert [p['codigo'] for p in opciones['pasos']] == ['investigar', 'conversar', 'visitar', 'curso', 'practicar',
                                                        'otra']
    assert len(opciones['valores']) == 9 and len(opciones['dudas_sugeridas']) == 3
    assert opciones['preguntas'][0] == {'codigo': 'DIA_NORMAL',
                                        'texto': '¿Sabes cómo es un día normal de alguien de {carrera}?',
                                        'texto_duda': '¿Cómo es un día normal de alguien de {carrera}?'}


def test_hu109_hu110_dudas_de_conocimiento_y_sugerencias_de_respaldo(cliente, respaldo):
    abrir_planes(cliente)
    abrir_secciones(cliente, 'CONOCIMIENTO')
    crear(cliente, PSICOLOGIA)
    guardar(cliente, PSICOLOGIA, 'CONOCIMIENTO', {
        'respuestas': {'DIA_NORMAL': 'MAS_O_MENOS', 'CURSOS': 'NO', 'INGRESO': 'SI'},
        'dudas': [{'origen': 'SUGERIDA', 'opcion': 'POSTULANTES'}, {'origen': 'PROPIA', 'texto': '¿Hay trabajo?'}]})
    psicologia = plan(cliente, PSICOLOGIA)
    assert psicologia['conocimiento'] == {'DIA_NORMAL': 'MAS_O_MENOS', 'DONDE_TRABAJAR': None, 'CURSOS': 'NO',
                                          'INGRESO': 'SI', 'CONOCE_ALGUIEN': None}
    assert [(d['numero'], d['origen'], d['texto'], d['estado']) for d in psicologia['dudas']] == [
        (1, 'PREGUNTA', '¿Cómo es un día normal de alguien de Psicología?', 'ABIERTA'),
        (2, 'PREGUNTA', '¿Qué cursos se llevan en Psicología?', 'ABIERTA'),
        (3, 'SUGERIDA', '¿Cuántos postulan y cuántos ingresan?', 'ABIERTA'),
        (4, 'PROPIA', '¿Hay trabajo?', 'ABIERTA')]
    assert [(s['numero'], s['origen']['duda'], s['tipo'], s['texto'], s['generada_por']) for s in
            psicologia['sugerencias']][2:] == [
        (3, 3, 'investigar', 'Averiguar: ¿Cuántos postulan y cuántos ingresan?', 'RESPALDO'),
        (4, 4, 'investigar', 'Averiguar: ¿Hay trabajo?', 'RESPALDO')]
    # Volver a guardar no regenera; SI cierra la duda de su pregunta; la duda propia omitida se borra con su sugerencia.
    guardar(cliente, PSICOLOGIA, 'CONOCIMIENTO', {
        'respuestas': {'DIA_NORMAL': 'SI', 'CURSOS': 'NO', 'INGRESO': 'SI'}, 'dudas': [{'numero': 3}]})
    psicologia = plan(cliente, PSICOLOGIA)
    assert [(d['numero'], d['estado']) for d in psicologia['dudas']] == [(1, 'CERRADA'), (2, 'ABIERTA'), (3, 'ABIERTA')]
    assert [s['numero'] for s in psicologia['sugerencias']] == [1, 2, 3]
    # Una duda cerrada con «sí» se reabre con «no», sin sugerencias nuevas; los números no se reutilizan.
    guardar(cliente, PSICOLOGIA, 'CONOCIMIENTO', {
        'respuestas': {'DIA_NORMAL': 'NO'}, 'dudas': [{'numero': 3}, {'origen': 'PROPIA', 'texto': '¿Es difícil?'}]})
    psicologia = plan(cliente, PSICOLOGIA)
    assert [(d['numero'], d['estado']) for d in psicologia['dudas']] == [
        (1, 'ABIERTA'), (2, 'ABIERTA'), (3, 'ABIERTA'), (5, 'ABIERTA')]
    assert [s['numero'] for s in psicologia['sugerencias']] == [1, 2, 3, 5]
    guardar(cliente, PSICOLOGIA, 'CONOCIMIENTO', {'dudas': [{'origen': 'SUGERIDA', 'opcion': 'POSTULANTES'},
                                                              {'numero': 3}]}, esperado=422)


def test_hu045_hu110_complicaciones_con_su_sugerencia_de_respaldo(cliente, respaldo):
    abrir_planes(cliente)
    abrir_secciones(cliente, 'REALIDAD')
    crear(cliente, PSICOLOGIA)
    guardar(cliente, PSICOLOGIA, 'REALIDAD', realidad_lista(complicaciones=[
        {'opcion': 'ECONOMICAS'}, {'otro': 'Mi papá quiere que trabaje con él'}]))
    psicologia = plan(cliente, PSICOLOGIA)
    assert psicologia['complicaciones'] == [{'numero': 1, 'opcion': 'ECONOMICAS', 'otro': None},
                                            {'numero': 2, 'opcion': None, 'otro': 'Mi papá quiere que trabaje con él'}]
    assert [(s['origen'], s['tipo'], s['texto']) for s in psicologia['sugerencias']] == [
        ({'duda': None, 'complicacion': 1, 'texto': 'Económicas'}, 'otra', 'Ver qué puedo hacer con: Económicas'),
        ({'duda': None, 'complicacion': 2, 'texto': 'Mi papá quiere que trabaje con él'}, 'otra',
         'Ver qué puedo hacer con: Mi papá quiere que trabaje con él')]
    guardar(cliente, PSICOLOGIA, 'REALIDAD', realidad_lista(complicaciones=[{'numero': 2}]))
    psicologia = plan(cliente, PSICOLOGIA)
    assert [c['numero'] for c in psicologia['complicaciones']] == [2]
    assert [s['origen']['complicacion'] for s in psicologia['sugerencias']] == [2]


def test_hu046_pasos_sugerencias_y_paso_hecho(cliente):
    abrir_planes(cliente)
    abrir_secciones(cliente, 'CONOCIMIENTO', 'PASOS')
    crear(cliente, PSICOLOGIA)
    guardar(cliente, PSICOLOGIA, 'CONOCIMIENTO', {'respuestas': {'CURSOS': 'NO'},
                                                    'dudas': [{'origen': 'PROPIA', 'texto': '¿Hay trabajo?'}]})
    guardar(cliente, PSICOLOGIA, 'PASOS', {
        'pasos': [{'sugerencia': 1, 'texto': 'Buscar el plan de estudios en la web de t-uni.'},
                  {'tipo': 'visitar', 'texto': 'Ir a la feria vocacional.'}],
        'sugerencias_descartadas': [2]})
    psicologia = plan(cliente, PSICOLOGIA)
    assert [(p['numero'], p['tipo'], p['texto'], p['origen'], p['estado']) for p in psicologia['pasos']] == [
        (1, 'investigar', 'Buscar el plan de estudios en la web de t-uni.',
         {'duda': 1, 'complicacion': None, 'sugerencia': 1}, 'PENDIENTE'),
        (2, 'visitar', 'Ir a la feria vocacional.', {'duda': None, 'complicacion': None, 'sugerencia': None},
         'PENDIENTE')]
    assert [s['estado'] for s in psicologia['sugerencias']] == ['ACEPTADA', 'DESCARTADA']
    hecho = pedir(cliente, 'POST', '/acciones/planes/paso-hecho', {
        'cuenta': 'est-ana', 'carrera': PSICOLOGIA, 'paso': 1, 'hallazgo': 'Hay estadística en el segundo año.'})
    assert hecho['eventos_registrados'][0]['tipo'] == 'ACTUALIZA_PLAN'
    pedir(cliente, 'POST', '/acciones/planes/paso-hecho', {'cuenta': 'est-ana', 'carrera': PSICOLOGIA, 'paso': 1}, 409)
    pedir(cliente, 'POST', '/acciones/planes/paso-hecho', {'cuenta': 'est-ana', 'carrera': PSICOLOGIA, 'paso': 9}, 409)
    duda = plan(cliente, PSICOLOGIA)['dudas'][0]
    assert (duda['estado'], duda['hallazgo']) == ('CERRADA', 'Hay estadística en el segundo año.')
    # Guardar PASOS sin los hechos los conserva al final; los pendientes omitidos se borran.
    guardar(cliente, PSICOLOGIA, 'PASOS', {'pasos': [{'tipo': 'curso', 'texto': 'Llevar el taller de verano.'}]})
    assert [(p['numero'], p['estado']) for p in plan(cliente, PSICOLOGIA)['pasos']] == [(3, 'PENDIENTE'), (1, 'HECHO')]
    guardar(cliente, PSICOLOGIA, 'PASOS', {'pasos': [{'sugerencia': 2}]}, esperado=422)


def test_borrar_una_duda_borra_sus_sugerencias_y_conserva_sus_pasos(cliente, sesion, respaldo):
    abrir_planes(cliente)
    abrir_secciones(cliente, 'CONOCIMIENTO', 'PASOS')
    crear(cliente, PSICOLOGIA)
    guardar(cliente, PSICOLOGIA, 'CONOCIMIENTO', {'dudas': [{'origen': 'PROPIA', 'texto': 'Primera'},
                                                              {'origen': 'PROPIA', 'texto': 'Segunda'}]})
    guardar(cliente, PSICOLOGIA, 'PASOS', {'pasos': [{'sugerencia': 1}], 'sugerencias_descartadas': [2]})
    guardar(cliente, PSICOLOGIA, 'CONOCIMIENTO', {'dudas': []})
    psicologia = plan(cliente, PSICOLOGIA)
    assert psicologia['dudas'] == psicologia['sugerencias'] == []
    assert [(p['texto'], p['tipo'], p['estado'], p['origen']) for p in psicologia['pasos']] == [
        ('Averiguar: Primera', 'investigar', 'PENDIENTE', {'duda': None, 'complicacion': None, 'sugerencia': None})]
    assert sesion.scalars(select(m.SugerenciaTarjeta)).all() == []


def test_hu097_medidores_de_1_a_3(cliente):
    abrir_planes(cliente)
    crear(cliente, PSICOLOGIA)
    accion = '/acciones/planes/medidores'
    pedir(cliente, 'POST', accion, {'cuenta': 'est-ana', 'carrera': PSICOLOGIA, 'entusiasmo': 3, 'recursos': 1})
    pedir(cliente, 'POST', accion, {'cuenta': 'est-ana', 'carrera': PSICOLOGIA, 'capacidad': 2})
    assert plan(cliente, PSICOLOGIA)['medidores'] == {'entusiasmo': 3, 'capacidad': 2, 'recursos': 1}
    for valor in (0, 4, '2'):
        pedir(cliente, 'POST', accion, {'cuenta': 'est-ana', 'carrera': PSICOLOGIA, 'capacidad': valor}, 422)
    pedir(cliente, 'POST', accion, {'cuenta': 'est-ana', 'carrera': PERIODISMO, 'capacidad': 2}, 409)


def test_hu047_hu050_ordenar_y_eliminar_sin_huecos(cliente):
    abrir_planes(cliente)
    for carrera in (PSICOLOGIA, PERIODISMO, ENFERMERIA):
        crear(cliente, carrera)
    ordenar = '/acciones/planes/ordenar'
    pedir(cliente, 'POST', ordenar, {'cuenta': 'est-ana', 'carreras': [ENFERMERIA, PSICOLOGIA, PERIODISMO]})
    assert [(p['prioridad'], p['carrera']['codigo']) for p in planes(cliente)['planes']] == [
        ('A', ENFERMERIA), ('B', PSICOLOGIA), ('C', PERIODISMO)]
    for carreras in ([ENFERMERIA, PSICOLOGIA], [ENFERMERIA, PSICOLOGIA, PSICOLOGIA],
                     [ENFERMERIA, PSICOLOGIA, ING_CIVIL]):
        pedir(cliente, 'POST', ordenar, {'cuenta': 'est-ana', 'carreras': carreras}, 422)
    eliminado = pedir(cliente, 'POST', '/acciones/planes/eliminar', {'cuenta': 'est-ana', 'carrera': ENFERMERIA})
    assert eliminado['eventos_registrados'][0] | {'fecha_hora': None} == {
        'tipo': 'ELIMINA_PLAN', 'referencia': ENFERMERIA, 'fecha_hora': None}
    assert [(p['prioridad'], p['carrera']['codigo']) for p in planes(cliente)['planes']] == [
        ('A', PSICOLOGIA), ('B', PERIODISMO)]
    pedir(cliente, 'POST', '/acciones/planes/eliminar', {'cuenta': 'est-ana', 'carrera': ENFERMERIA}, 409)
    crear(cliente, ENFERMERIA)
    assert planes(cliente)['planes'][2]['prioridad'] == 'C'


def test_eliminar_un_plan_borra_todo_lo_suyo(cliente, sesion):
    abrir_planes(cliente)
    abrir_secciones(cliente, 'CONOCIMIENTO', 'REALIDAD', 'PASOS')
    crear(cliente, PSICOLOGIA)
    guardar(cliente, PSICOLOGIA, 'POR_QUE', por_que_lista())
    guardar(cliente, PSICOLOGIA, 'CONOCIMIENTO', {'respuestas': {'CURSOS': 'NO'}})
    guardar(cliente, PSICOLOGIA, 'REALIDAD', realidad_lista(complicaciones=[{'opcion': 'DISTANCIA'}]))
    guardar(cliente, PSICOLOGIA, 'PASOS', {'pasos': [{'sugerencia': 1}]})
    pedir(cliente, 'POST', '/acciones/planes/paso-hecho', {'cuenta': 'est-ana', 'carrera': PSICOLOGIA, 'paso': 1})
    pedir(cliente, 'POST', '/acciones/planes/eliminar', {'cuenta': 'est-ana', 'carrera': PSICOLOGIA})
    for modelo in (m.TarjetaCarrera, m.MotivoTarjeta, m.ConocimientoTarjeta, m.DudaTarjeta, m.GastoTarjeta,
                   m.FinanciamientoTarjeta, m.ComplicacionTarjeta, m.SugerenciaTarjeta, m.PasoTarjeta):
        assert sesion.scalars(select(modelo)).all() == [], modelo


def test_hu098_aviso_cuando_dos_planes_son_de_la_misma_familia(cliente, sesion, aplicacion):
    # DATO DE PRUEBA: una carrera universitaria de la familia de Psicología.
    psicologia = buscar(sesion, m.Carrera, PSICOLOGIA)
    sesion.add(m.Carrera(codigo='t-carrera-hermana', nombre='Carrera hermana', familia_id=psicologia.familia_id,
                         tipo='UNIVERSIDAD', codigo_cine='313016'))
    sesion.commit()
    aplicacion.state.motor_bd.cache_definiciones.recargar()
    abrir_planes(cliente)
    crear(cliente, PSICOLOGIA)
    crear(cliente, PERIODISMO)
    assert planes(cliente)['avisos'] == []
    crear(cliente, 't-carrera-hermana')
    assert planes(cliente)['avisos'] == [{'tipo': 'MISMA_FAMILIA', 'planes': ['A', 'C'], 'familia': {
        'codigo': '313', 'nombre': 'Psicología', 'area_codigo': '3',
        'area_nombre': 'Ciencias Sociales, Comerciales y Derecho'}}]


def test_opcion_inicial_solo_antes_de_completar_t1(cliente):
    abrir_planes(cliente)
    crear(cliente, PSICOLOGIA)
    crear(cliente, PERIODISMO)
    pedir(cliente, 'POST', '/acciones/planes/eliminar', {'cuenta': 'est-ana', 'carrera': PSICOLOGIA})
    assert planes(cliente)['opcion_inicial']['codigo'] == PSICOLOGIA
    abrir_planes(cliente, cuenta='est-luis')
    pedir(cliente, 'POST', '/eventos', {'cuenta': 'est-luis', 'tipo': 'COMPLETA_BLOQUE', 'referencia': 'T1'})
    crear(cliente, ENFERMERIA, cuenta='est-luis')
    assert planes(cliente, cuenta='est-luis')['opcion_inicial'] is None


def test_consulta_de_planes_con_consultas_fijas(base_aislada, tmp_path):
    conteos = []
    for cantidad in (1, 3):
        with base_aislada(tmp_path, f'planes-{cantidad}') as (aplicacion, cliente):
            abrir_planes(cliente)
            abrir_secciones(cliente, 'CONOCIMIENTO', 'REALIDAD', 'PASOS')
            for carrera in (ING_AMBIENTAL, PSICOLOGIA, PERIODISMO)[:cantidad]:
                crear(cliente, carrera)
                guardar(cliente, carrera, 'POR_QUE', por_que_lista())
                guardar(cliente, carrera, 'CONOCIMIENTO', {'respuestas': {'CURSOS': 'NO', 'INGRESO': 'NO'}})
                guardar(cliente, carrera, 'REALIDAD', realidad_lista(complicaciones=[{'opcion': 'DISTANCIA'}]))
                guardar(cliente, carrera, 'PASOS', {'pasos': [{'sugerencia': 1}, {'sugerencia': 2}]})
            conteos.append(medir(cliente, aplicacion, 'GET', '/cuentas/est-ana/planes', limite=20)[1].cantidad)
    assert conteos[0] == conteos[1]
