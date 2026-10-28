"""B12: ruta del apoderado, diploma, avance del hijo y sus resultados (HU-078–080). DATO DE PRUEBA."""

from datetime import datetime
from unittest.mock import ANY

from sqlalchemy import func, select

from app import models as modelos
from app.models import Cuenta
from app.services.familia import codigo_diploma
from soporte_ruta import FECHA, INTERESES, INTERESES_FINAL, avanzar, completar, pedir, responder, revelar


def requeridas(sesion, audiencia):
    return sesion.scalar(select(func.count()).select_from(modelos.Actividad).join(modelos.Bloque).where(
        modelos.Bloque.audiencia == audiencia, modelos.Actividad.requerida.is_(True)))


def familia(cliente, cuenta='apo-rosa', esperado=200):
    return pedir(cliente, 'GET', f'/cuentas/{cuenta}/familia', esperado=esperado)


def resultados(cliente, esperado=200, estudiante=None):
    consulta = '' if estudiante is None else f'?estudiante={estudiante}'
    return pedir(cliente, 'GET', f'/cuentas/apo-rosa/familia/resultados{consulta}', esperado=esperado)


def hijo(cliente, codigo='est-ana'):
    return next(e for e in familia(cliente)['estudiantes'] if e['codigo'] == codigo)


def hacer_visible(aplicacion, instrumento='TEST-PARTIDA-LLEGADA', salon='5A'):
    """Configura un cuestionario más como visible al apoderado en el salón (no está en `ruta`)."""
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        salon_id = sesion.scalar(select(modelos.Salon.id).where(modelos.Salon.codigo == salon))
        instrumento_id = sesion.scalar(select(modelos.Instrumento.id).where(modelos.Instrumento.codigo == instrumento))
        sesion.add(modelos.SalonInstrumento(salon_id=salon_id, instrumento_id=instrumento_id, es_prioritario=False,
                                            visible_apoderado=True))


def completar_ruta_apoderado(cliente):
    for actividad in ('t-apo-1', 't-apo-2'):
        completar(cliente, actividad, 'apo-rosa')


def revelar_intereses(cliente):
    avanzar(cliente)
    for actividad in (INTERESES, INTERESES_FINAL):
        responder(cliente, actividad)
        completar(cliente, actividad)
    revelar(cliente)


def test_solo_el_apoderado_tiene_ruta_familiar(cliente):
    for cuenta in ('est-ana', 'ori-carmen'):
        familia(cliente, cuenta, 404)
        pedir(cliente, 'GET', f'/cuentas/{cuenta}/familia/resultados', esperado=404)
    familia(cliente, 'nadie', 404)


def test_avance_y_diploma_del_apoderado(cliente, sesion):
    total = requeridas(sesion, 'APODERADO')
    inicio = familia(cliente)
    assert inicio['avance'] == {'completadas': 0, 'total': total, 'porcentaje': 0.0}
    assert inicio['diploma'] == {'obtenido': False, 'obtenido_en': None, 'codigo': None}
    completar(cliente, 't-apo-1', 'apo-rosa')
    mitad = familia(cliente)
    assert mitad['avance']['completadas'] == 1 and mitad['diploma']['obtenido'] is False
    completar(cliente, 't-apo-2', 'apo-rosa')
    final = familia(cliente)
    assert final['avance'] == {'completadas': total, 'total': total, 'porcentaje': 100.0}
    rosa = sesion.scalar(select(Cuenta).where(Cuenta.codigo == 'apo-rosa'))
    assert final['diploma'] == {'obtenido': True, 'obtenido_en': FECHA,
                                'codigo': codigo_diploma(rosa.id, int(FECHA[:4]))}


def test_codigo_del_diploma():
    # F08 §8.3: año 2026 y cuenta 148 → dígitos 2,0,2,6,0,0,1,4,8 por su posición, módulo 10.
    verificador = (2 * 1 + 0 * 2 + 2 * 3 + 6 * 4 + 0 * 5 + 0 * 6 + 1 * 7 + 4 * 8 + 8 * 9) % 10
    assert codigo_diploma(148, 2026) == f'EXP-AP-2026-00148-{verificador}'


def test_avance_y_nivel_del_hijo(cliente, sesion):
    total = requeridas(sesion, 'ESTUDIANTE')
    ana = hijo(cliente)
    assert ana == {'codigo': 'est-ana', 'nombre': 'Ana', 'nivel_actual': {'numero': 1, 'titulo': 'Observador del horizonte',
                                                                     'descripcion': ANY, 'cita_lumi': ANY},
                   'avance': {'completadas': 0, 'total': total, 'porcentaje': 0.0}, 'cuestionarios': ANY}
    avanzar(cliente)
    ana = hijo(cliente)
    # El recorrido completa T0 (sube al nivel 2) y t-expectativas, todas requeridas.
    assert ana['avance']['completadas'] == 4 and ana['nivel_actual']['numero'] == 2


def test_todos_los_hijos_en_el_orden_de_sus_vinculos(cliente):
    avanzar(cliente)
    estudiantes = familia(cliente)['estudiantes']
    assert [e['codigo'] for e in estudiantes] == ['est-ana', 'est-luis']
    # Cada hijo con su propio avance: Ana avanzó, Luis no.
    assert estudiantes[0]['avance']['completadas'] == 4 and estudiantes[1]['avance']['completadas'] == 0


def test_sin_vinculo_activo_no_hay_estudiantes(cliente, aplicacion):
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        for vinculo in sesion.scalars(select(modelos.VinculoFamiliar)):
            vinculo.es_activo = False
    assert familia(cliente)['estudiantes'] == []
    completar_ruta_apoderado(cliente)
    assert resultados(cliente, 409)['detail']['mensaje'] == 'La cuenta no pertenece a un vínculo familiar'


def test_resultados_del_hijo_con_ruta_completa_e_instrumento_visible(cliente, aplicacion):
    revelar_intereses(cliente)
    assert resultados(cliente, 409)['detail']['mensaje'] == 'Completa tus actividades para ver los resultados de tu hijo'
    completar_ruta_apoderado(cliente)
    [riasec] = resultados(cliente)
    propio = pedir(cliente, 'GET', '/cuentas/est-ana/instrumentos/TEST-RIASEC/resultado')
    assert riasec == propio and riasec['codigo_interes']['codigo'] == 'IRA'
    # El de partida y llegada no está configurado como visible al apoderado.
    assert {r['instrumento'] for r in resultados(cliente)} == {'TEST-RIASEC'}
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        sesion.scalar(select(modelos.SalonInstrumento)).visible_apoderado = False
    assert resultados(cliente) == []


def test_instrumento_visible_sin_resultado_revelado_no_aparece(cliente):
    completar_ruta_apoderado(cliente)
    assert resultados(cliente) == []


def test_cuestionarios_visibles_sin_resultado_y_sin_diploma(cliente):
    # Sin diploma: los cuestionarios y su estado llegan; los resultados siguen bloqueados.
    for codigo in ('est-ana', 'est-luis'):
        assert hijo(cliente, codigo)['cuestionarios'] == [{
            'instrumento': 'TEST-RIASEC', 'nombre': 'Test de intereses (RIASEC)',
            'aplicaciones': [{'aplicacion': 'APL-RIASEC', 'nombre': 'Intereses', 'momento': 'UNICA',
                              'completado_en': None}]}]
    revelar_intereses(cliente)
    [riasec] = hijo(cliente)['cuestionarios']
    assert riasec['aplicaciones'][0]['completado_en'] == FECHA
    assert hijo(cliente, 'est-luis')['cuestionarios'][0]['aplicaciones'][0]['completado_en'] is None
    assert resultados(cliente, 409)['detail']['mensaje'] == 'Completa tus actividades para ver los resultados de tu hijo'


def test_un_resultado_anulado_no_cuenta(cliente, aplicacion):
    revelar_intereses(cliente)
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        sesion.scalar(select(modelos.ResultadoInstrumento)).anulado_en = datetime.fromisoformat(FECHA)
    assert hijo(cliente)['cuestionarios'][0]['aplicaciones'][0]['completado_en'] is None


def test_instrumento_no_visible_no_aparece(cliente, aplicacion):
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        sesion.scalar(select(modelos.SalonInstrumento)).visible_apoderado = False
    assert hijo(cliente)['cuestionarios'] == []


def test_partida_y_llegada_con_solo_la_partida(cliente, aplicacion):
    hacer_visible(aplicacion)
    avanzar(cliente, 't-partida')
    # El resultado de la partida existe al revelarla (`completado_en` es su `calculado_en`).
    assert hijo(cliente)['cuestionarios'][0]['aplicaciones'][0]['completado_en'] is None
    revelar(cliente, 'TEST-PARTIDA-LLEGADA', aplicacion='APL-PARTIDA')
    cuestionarios = {c['instrumento']: c for c in hijo(cliente)['cuestionarios']}
    assert list(cuestionarios) == ['TEST-PARTIDA-LLEGADA', 'TEST-RIASEC']
    assert [(a['aplicacion'], a['momento'], a['completado_en'])
            for a in cuestionarios['TEST-PARTIDA-LLEGADA']['aplicaciones']] == [
        ('APL-PARTIDA', 'ENTRADA', FECHA), ('APL-LLEGADA', 'SALIDA', None)]


def test_resultados_por_hijo_elegido(cliente):
    revelar_intereses(cliente)
    completar_ruta_apoderado(cliente)
    assert [r['instrumento'] for r in resultados(cliente, estudiante='est-ana')] == ['TEST-RIASEC']
    assert resultados(cliente, estudiante='est-luis') == []
    assert resultados(cliente, 404, estudiante='est-beto')['detail']['mensaje'] == 'El estudiante no es su hijo'
    assert resultados(cliente, 404, estudiante='nadie')['detail']['mensaje'] == 'El estudiante no es su hijo'
