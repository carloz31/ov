"""Ajuste panel-estudiantes §7, §8 y §10: pestañas Tests, Planes y «Avance y familia» del perfil."""

from datetime import date, timedelta

from sqlalchemy import update

from app import models as m
from app.models import TipoEventoUso
from soporte_catalogo_ruta import ENFERMERIA, PSICOLOGIA
from soporte_panel import (
    AHORA, cuenta, evento, fijar_ahora, medicion, responder_autopercepcion, senales,
)
from soporte_planes import abrir_planes, abrir_secciones, crear, guardar, por_que_lista, realidad_lista
from soporte_retiro import ciclo


def pestana(cliente, ruta, estudiante='est-ana', esperado=200):
    respuesta = cliente.get(f'/cuentas/ori-carmen/panel/estudiantes/{estudiante}{ruta}')
    assert respuesta.status_code == esperado, respuesta.text
    return respuesta.json()


def _afirmaciones(grupo):
    return [(a['item'], a['partida'], a['llegada']) for a in grupo['afirmaciones']]


def test_tests_solo_partida_con_respuestas_bajas_e_item_inverso(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    medicion(sesion, 'est-ana', 'APL-PARTIDA', {'AUTO-E': 'POR_TRABAJAR'})
    responder_autopercepcion(sesion, 'est-ana', 't-partida', {1: 1, 2: 2, 4: 4})
    sesion.commit()
    datos = pestana(cliente, '/tests')
    partida = datos['partida_llegada']
    # Ajuste panel-entrevistas-configuracion: partida y llegada es obligatorio, así que es REQUISITO.
    assert partida['resumen']['estado'] == 'SOLO_PARTIDA' and partida['etiqueta'] == 'REQUISITO'
    assert [g['codigo'] for g in partida['grupos']] == ['BAJAS']
    # El ítem 4 es inverso: «Muy de acuerdo» cuenta como la respuesta más baja.
    assert _afirmaciones(partida['grupos'][0]) == [
        ('AUTO-01', 'Nada de acuerdo', None), ('AUTO-04', 'Muy de acuerdo', None), ('AUTO-02', 'Poco de acuerdo', None)]
    assert 'puntaje' not in str(partida)
    assert datos['intereses']['estado'] == 'SIN_EMPEZAR' and datos['intereses']['barras'] == []


def test_tests_partida_y_llegada_en_tres_grupos_con_tope(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    medicion(sesion, 'est-luis', 'APL-PARTIDA', {}, hace_dias=30)
    medicion(sesion, 'est-luis', 'APL-LLEGADA', {})
    responder_autopercepcion(sesion, 'est-luis', 't-partida', {1: 3, 2: 2, 3: 1, 4: 4, 5: 3})
    responder_autopercepcion(sesion, 'est-luis', 't-llegada', {1: 1, 2: 2, 3: 4, 4: 1, 5: 2})
    sesion.commit()
    grupos = {g['codigo']: _afirmaciones(g) for g in pestana(cliente, '/tests', 'est-luis')['partida_llegada']['grupos']}
    assert list(grupos) == ['BAJARON', 'SIGUEN_BAJAS', 'MEJORARON']
    assert [i for i, _, _ in grupos['BAJARON']] == ['AUTO-01', 'AUTO-05']
    assert grupos['BAJARON'][0] == ('AUTO-01', 'Bastante de acuerdo', 'Nada de acuerdo')
    assert grupos['SIGUEN_BAJAS'] == [('AUTO-02', 'Poco de acuerdo', 'Poco de acuerdo')]
    assert [i for i, _, _ in grupos['MEJORARON']] == ['AUTO-03', 'AUTO-04']
    sesion.execute(update(m.Parametro).where(m.Parametro.codigo == 'PANEL_AFIRMACIONES_POR_GRUPO').values(valor='1'))
    sesion.commit()
    grupos = {g['codigo']: g for g in pestana(cliente, '/tests', 'est-luis')['partida_llegada']['grupos']}
    assert len(grupos['BAJARON']['afirmaciones']) == 1
    # Ajuste color-partida-llegada: el detalle por dimensión (sus casos, en `test_panel_detalle_partida.py`).
    todas = pestana(cliente, '/tests/partida-llegada', 'est-luis')['dimensiones']
    assert {d['codigo'] for d in todas} == {'AUTO-A', 'AUTO-B', 'AUTO-C', 'AUTO-D', 'AUTO-E'}
    primera = next(a for d in todas for a in d['afirmaciones'] if a['item'] == 'AUTO-01')
    assert (primera['partida'], primera['llegada'], primera['cambio']) == ('Bastante de acuerdo', 'Nada de acuerdo',
                                                                           'BAJO')
    assert sum(len(d['afirmaciones']) for d in todas) == 19


def test_tests_intereses_con_resultado_y_resultado_completo_de_orientadora(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    ciclo(cliente, cuenta='est-ana')
    intereses = pestana(cliente, '/tests')['intereses']
    assert intereses['estado'] == 'LISTO' and intereses['etiqueta'] == 'REQUISITO'
    valores = [b['valor'] for b in intereses['barras']]
    assert len(valores) == 6 and valores == sorted(valores, reverse=True)
    assert sum(b['en_codigo'] for b in intereses['barras']) == 3 and len(intereses['codigo']) == 3
    assert intereses['areas'] and intereses['aplicacion'] == 'APL-RIASEC' and not intereses['rehizo_plano']
    instrumento = sesion.query(m.Instrumento).filter_by(codigo='TEST-RIASEC').one()
    completo = pestana(cliente, '/tests/APL-RIASEC/resultado')
    assert completo['mensaje'] == instrumento.mensaje_orientadora.replace('{nombre}', 'Ana')
    assert completo['lectura'] == instrumento.lectura_orientadora.replace('{nombre}', 'Ana')
    # «Qué mide este cuestionario»: el nombre y la descripción del instrumento, como los recibe el apoderado.
    assert (completo['nombre_instrumento'], completo['descripcion_instrumento']) == (
        instrumento.nombre, instrumento.descripcion)
    pestana(cliente, '/tests/APL-PARTIDA/resultado', esperado=404)  # sus puntajes no se exponen
    pestana(cliente, '/tests/APL-RIASEC/resultado', 'est-luis', esperado=404)


def test_tests_intereses_plano_por_revisar_sin_codigo_ni_areas(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    ciclo(cliente, cuenta='est-mia', opcion=3)
    intereses = pestana(cliente, '/tests', 'est-mia')['intereses']
    assert intereses['estado'] == 'POR_REVISAR' and intereses['motivo_revision'] == 'PLANO'
    assert intereses['codigo'] == [] and intereses['areas'] == [] and intereses['frente_planes'] == []


def test_planes_de_un_vistazo_antes_y_plan_completo(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    abrir_planes(cliente)
    abrir_secciones(cliente, 'CONOCIMIENTO', 'REALIDAD', 'PASOS')
    crear(cliente, ENFERMERIA)
    crear(cliente, PSICOLOGIA)
    guardar(cliente, ENFERMERIA, 'POR_QUE', {**por_que_lista(), 'idea_origen': 'FAMILIA'})
    guardar(cliente, ENFERMERIA, 'CONOCIMIENTO', {'respuestas': {
        'DIA_NORMAL': 'NO', 'DONDE_TRABAJAR': 'SI', 'CURSOS': 'NO', 'INGRESO': 'SI', 'CONOCE_ALGUIEN': 'MAS_O_MENOS'},
        'dudas': [{'origen': 'PROPIA', 'texto': 'DATO DE PRUEBA: ¿Hay turnos de noche?'}]})
    guardar(cliente, ENFERMERIA, 'REALIDAD', realidad_lista(complicaciones=[{'opcion': 'ECONOMICAS'}]))
    guardar(cliente, ENFERMERIA, 'PASOS', {'pasos': [{'tipo': 'conversar', 'texto': 'DATO DE PRUEBA: hablar con una enfermera.'}]})
    datos = pestana(cliente, '/planes')
    a, b = datos['planes']
    assert (a['prioridad'], a['carrera'], b['carrera']) == (1, 'Enfermería', 'Psicología')
    assert a['idea_origen'] == 'FAMILIA' and a['motivo_principal'] == 'Ayudar a otros'
    assert (a['conoce_si'], a['conoce_total']) == (2, 5)
    assert a['dudas_abiertas'] >= 1 and a['costo_primer_anio'] == 1200 and a['financiamiento']
    assert a['complicaciones'] == ['Económicas'] and (a['pasos_hechos'], a['pasos_total']) == (0, 1)
    assert a['secciones_total'] == 4 and b['secciones_listas'] == 0 and b['costo_primer_anio'] is None
    assert datos['maximo_planes'] == 3
    assert datos['antes']['plan_a'] == 'Enfermería' and set(datos['antes']['carreras_favoritas']) >= {'Enfermería'}
    completo = pestana(cliente, '/planes/1')
    assert completo['planes'] == [1, 2] and completo['por_que']['motivos'][0] == 'Ayudar a otros'
    assert completo['por_que']['relato'] and [s['estado'] for s in completo['secciones']].count('LISTA') >= 2
    assert [p['respuesta'] for p in completo['conoce']['preguntas']][:1] == ['NO']
    assert completo['conoce']['preguntas'][0]['texto'] == 'cómo es un día normal'
    assert completo['conoce']['dudas_visibles'] == 4
    assert completo['realidad']['costo_primer_anio'] == 1200 and completo['realidad']['institucion']
    assert completo['pasos'][0]['hecho'] is False
    assert 'sugerencias' not in completo
    pestana(cliente, '/planes/3', esperado=404)


def test_plan_completo_con_secciones_cerradas_no_trae_su_contenido(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    abrir_planes(cliente)
    crear(cliente, ENFERMERIA)
    completo = pestana(cliente, '/planes/1')
    estados = {s['codigo']: s['estado'] for s in completo['secciones']}
    assert estados['CONOCIMIENTO'] == 'BLOQUEADA' and completo['conoce'] is None and completo['pasos'] is None
    assert completo['por_que'] is not None


def test_avance_camino_senales_diario_y_familia_sin_cartas(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    abrir_planes(cliente)  # completa t-inicio
    senales(sesion, 'est-ana', 4, 4, 3, 2, 2, 1, 2)
    cuenta_ana = cuenta(sesion, 'est-ana')
    for dias in (2, 5):
        sesion.add(m.EntradaDiario(cuenta_id=cuenta_ana.id, origen=m.OrigenEntrada.LIBRE, numero=dias, numero_libre=dias,
                                   texto='DATO DE PRUEBA: privado', fecha_hora=AHORA - timedelta(days=dias)))
    evento(sesion, 'apo-rosa', TipoEventoUso.INGRESO, 1)
    vinculo = sesion.query(m.VinculoFamiliar).filter_by(codigo='VIN-ANA').one()
    vinculo.carta_estudiante = 'DATO DE PRUEBA: carta secreta'
    sesion.commit()
    datos = pestana(cliente, '/avance')
    assert datos['tramos'][0]['estado'] == 'VA_AQUI' and datos['tramos'][0]['hechas'] == 1
    assert datos['tramos'][0]['siguiente'] and all(t['estado'] == 'POR_ABRIR' for t in datos['tramos'][1:])
    assert [s['nivel'] for s in datos['senales']] == [4, 3, 2, 2, 1, 2]
    assert datos['senales'][-1] == {'nivel': 2, 'fecha': date(2026, 10, 19).isoformat(), 'banda': 'BAJA'}
    assert datos['viene_bajando'] == {'senales': 3, 'nivel_maximo': 2}
    assert datos['entradas_diario'] == 2 and datos['dias_ultima_entrada'] == 2
    familia = datos['familia']
    assert familia['nombre'] == 'Rosa' and familia['parentesco'] == 'madre' and familia['ingreso'] == 'INGRESO'
    assert familia['ruta_total'] >= 1 and familia['conversaciones_total'] >= 1
    texto = str(datos)
    assert 'secreta' not in texto and 'privado' not in texto and 'carta' not in texto
    assert pestana(cliente, '/avance', 'est-sol')['familia'] is None


def test_ninguna_ruta_del_perfil_sirve_a_un_estudiante_de_otro_salon(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    for ruta in ('', '/tests', '/tests/partida-llegada', '/tests/APL-RIASEC/resultado', '/planes', '/planes/1',
                 '/avance'):
        respuesta = pestana(cliente, ruta, 'est-beto', esperado=404)
        assert respuesta['detail']['mensaje'] == 'Estudiante no encontrado'
