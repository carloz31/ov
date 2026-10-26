from sqlalchemy import select

from app import models as modelos
from soporte_ruta import avanzar, completar, pedir


# Ajuste del panel (F05): con `ruta`, el camino tiene 14 actividades (3 + 8 + 3) y la Ciudad 4.
def avance(cliente, cuenta='est-ana'):
    return pedir(cliente, 'GET', f'/cuentas/{cuenta}/avance')


def marcar_completadas(sesion, *codigos, cuenta='est-ana'):
    """Progreso escrito directo, para estados que el recorrido corto no alcanza sin muchos pasos."""
    cuenta_id = sesion.scalar(select(modelos.Cuenta.id).where(modelos.Cuenta.codigo == cuenta))
    for codigo in codigos:
        actividad_id = sesion.scalar(select(modelos.Actividad.id).where(modelos.Actividad.codigo == codigo))
        sesion.add(modelos.ProgresoActividad(cuenta_id=cuenta_id, actividad_id=actividad_id,
                                             estado=modelos.EstadoProgreso.COMPLETADA))
    sesion.commit()


def test_total_fijo_desde_el_inicio_aunque_la_opcional_siga_oculta(cliente):
    visibles = {a['codigo'] for b in pedir(cliente, 'GET', '/cuentas/est-ana/actividades') for a in b['actividades']
                if a['visible']}
    assert 't-opcional' not in visibles
    assert avance(cliente) == {
        'camino': {'completadas': 0, 'total': 14, 'porcentaje': 0.0},
        'tramo_actual': {'codigo': 'T0', 'nombre': 'Inicio', 'numero': 1, 'completadas': 0, 'total': 3},
        'camino_completo': False,
        'ciudad': {'completadas': 0, 'total': 4, 'porcentaje': 0.0},
    }


def test_el_tramo_cuenta_solo_requeridas_y_avanza_con_opcionales_pendientes(cliente):
    avanzar(cliente, 't-cierre-inicio')
    datos = avance(cliente)
    assert datos['camino']['completadas'] == 3
    assert datos['tramo_actual'] == {'codigo': 'T1', 'nombre': 'Camino', 'numero': 2, 'completadas': 0, 'total': 1}
    # Cerrar la única requerida de T1 pasa a T2 aunque queden sus siete opcionales.
    avanzar(cliente)
    datos = avance(cliente)
    assert datos['tramo_actual']['codigo'] == 'T2'
    assert (datos['tramo_actual']['completadas'], datos['tramo_actual']['total']) == (0, 3)
    # Una opcional sube el camino pero no el tramo.
    completar(cliente, 't-opcional')
    despues = avance(cliente)
    assert despues['camino']['completadas'] == datos['camino']['completadas'] + 1
    assert despues['tramo_actual'] == datos['tramo_actual']


def test_camino_completo_sin_llegar_al_cien(cliente, sesion):
    avanzar(cliente)
    marcar_completadas(sesion, 't-llegada', 't-comparar', 't-proyecto')
    datos = avance(cliente)
    assert datos['camino_completo'] is True
    assert datos['tramo_actual'] is None
    assert datos['camino'] == {'completadas': 7, 'total': 14, 'porcentaje': 50.0}


def test_la_ciudad_es_la_afinidad_de_logros(cliente, sesion):
    avanzar(cliente)
    marcar_completadas(sesion, 't-caso')
    ciudad = avance(cliente)['ciudad']
    assert ciudad == {'completadas': 1, 'total': 4, 'porcentaje': 25.0}
    assert pedir(cliente, 'GET', '/cuentas/est-ana/logros')['afinidad'] == ciudad['porcentaje']


def test_lumi_y_familia_no_cuentan(cliente, sesion):
    antes = avance(cliente)
    marcar_completadas(sesion, 't-lumi-1', 't-apo-1')
    assert avance(cliente) == antes


def test_solo_el_estudiante_tiene_avance(cliente):
    for cuenta in ('apo-rosa', 'ori-carmen'):
        assert cliente.get(f'/cuentas/{cuenta}/avance').status_code == 404
