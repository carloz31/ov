"""B12: ruta del apoderado, diploma, avance del hijo y sus resultados (HU-078–080). DATO DE PRUEBA."""

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


def resultados(cliente, esperado=200):
    return pedir(cliente, 'GET', '/cuentas/apo-rosa/familia/resultados', esperado=esperado)


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
    hijo = familia(cliente)['estudiante']
    assert hijo == {'codigo': 'est-ana', 'nombre': 'Ana', 'nivel_actual': {'numero': 1, 'titulo': 'Observador del horizonte',
                                                                      'descripcion': ANY, 'cita_lumi': ANY},
                    'avance': {'completadas': 0, 'total': total, 'porcentaje': 0.0}}
    avanzar(cliente)
    hijo = familia(cliente)['estudiante']
    # El recorrido completa T0 (sube al nivel 2) y t-expectativas, todas requeridas.
    assert hijo['avance']['completadas'] == 4 and hijo['nivel_actual']['numero'] == 2


def test_sin_vinculo_activo_no_hay_estudiante(cliente, aplicacion):
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        for vinculo in sesion.scalars(select(modelos.VinculoFamiliar)):
            vinculo.es_activo = False
    assert familia(cliente)['estudiante'] is None
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
