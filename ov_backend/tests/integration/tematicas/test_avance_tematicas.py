"""B09 · HU-075: avance por temática y afinidad con la Ciudad."""

from sqlalchemy import select

from app import models as m
from app.services.tematicas import porcentaje
from datos.fijos import TEMATICAS
from datos.ruta import TEMATICAS_ACTIVIDADES
from soporte_ruta import avanzar, completar, pedir, responder


def test_avance_por_tematica_cuenta_las_actividades_completadas(cliente):
    inicial = pedir(cliente, 'GET', '/cuentas/est-ana/tematicas')
    totales = {codigo: sum(codigo in tematicas for _, tematicas in TEMATICAS_ACTIVIDADES) for codigo, _, _ in TEMATICAS}
    assert inicial == [{'codigo': codigo, 'nombre': nombre, 'completadas': 0, 'total': totales[codigo],
                        'porcentaje': 0.0} for codigo, nombre, _ in TEMATICAS]
    avanzar(cliente)  # completa t-expectativas: temáticas A y B.
    avance = {t['codigo']: t for t in pedir(cliente, 'GET', '/cuentas/est-ana/tematicas')}
    assert avance['A']['completadas'] == avance['B']['completadas'] == 1
    assert avance['A']['porcentaje'] == porcentaje(1, totales['A'])
    assert all(avance[c]['completadas'] == 0 for c in 'CDE')
    assert pedir(cliente, 'GET', '/cuentas/apo-rosa/tematicas') == []


def test_afinidad_sin_contar_misiones_adicionales_en_el_total(cliente, sesion):
    # DATO DE PRUEBA: la misión adicional se lleva a la Ciudad para que cuente solo al completarse.
    adicional = sesion.scalar(select(m.Actividad).where(m.Actividad.codigo == 't-adicional'))
    adicional.bloque_id = sesion.scalar(select(m.Bloque.id).where(m.Bloque.codigo == 'CIUDAD'))
    sesion.commit()
    ciudad = 4  # t-mision-intereses, t-mision-intereses-2, t-caso, t-contraste
    assert pedir(cliente, 'GET', '/cuentas/est-ana/logros')['afinidad'] == 0.0
    avanzar(cliente)
    responder(cliente, 't-mision-intereses')
    completar(cliente, 't-mision-intereses')
    assert pedir(cliente, 'GET', '/cuentas/est-ana/logros')['afinidad'] == porcentaje(1, ciudad)
    completar(cliente, 't-adicional')
    assert pedir(cliente, 'GET', '/cuentas/est-ana/logros')['afinidad'] == porcentaje(2, ciudad)
    assert 'afinidad' not in pedir(cliente, 'GET', '/cuentas/apo-rosa/logros')


def test_la_afinidad_no_pasa_de_cien():
    assert porcentaje(5, 4) == 100.0 and porcentaje(0, 0) == 0.0
