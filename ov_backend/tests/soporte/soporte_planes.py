"""Ayudas para las pruebas de planes de carrera (B11); los textos son DATO DE PRUEBA."""

from soporte_ruta import completar, pedir
from soporte_catalogo_ruta import INST_UNI


RELATO = 'Cuando ayudé a mi primo con sus tareas sentí que explicar me hace feliz.'  # DATO DE PRUEBA
# Actividad que abre cada sección de la tarjeta en `ruta`.
ABRE_SECCION = {'CONOCIMIENTO': 't-valores', 'REALIDAD': 't-explorar', 'PASOS': 't-comparar'}


def abrir_planes(cliente, cuenta='est-ana'):
    """Completa `t-inicio`, que abre la sección PLANES y la sección POR_QUE de la tarjeta."""
    completar(cliente, 't-inicio', cuenta=cuenta)


def abrir_secciones(cliente, *secciones, cuenta='est-ana'):
    """Abre secciones de la tarjeta con el evento crudo de su actividad (solo pruebas de mecánica)."""
    for seccion in secciones:
        pedir(cliente, 'POST', '/eventos', {'cuenta': cuenta, 'tipo': 'COMPLETA_ACTIVIDAD',
                                            'referencia': ABRE_SECCION[seccion]})


def crear(cliente, carrera, cuenta='est-ana', esperado=200):
    return pedir(cliente, 'POST', '/acciones/planes/crear', {'cuenta': cuenta, 'carrera': carrera}, esperado)


def guardar(cliente, carrera, seccion, datos, cuenta='est-ana', esperado=200):
    return pedir(cliente, 'POST', '/acciones/planes/guardar-seccion',
                 {'cuenta': cuenta, 'carrera': carrera, 'seccion': seccion, 'datos': datos}, esperado)


def planes(cliente, cuenta='est-ana', esperado=200):
    return pedir(cliente, 'GET', f'/cuentas/{cuenta}/planes', esperado=esperado)


def plan(cliente, carrera, cuenta='est-ana'):
    return next(p for p in planes(cliente, cuenta)['planes'] if p['carrera']['codigo'] == carrera)


def estados(plan_):
    return {s['codigo']: s['estado'] for s in plan_['secciones']}


def por_que_lista():
    return {'idea_origen': 'MIA', 'motivos': [{'opcion': 'AYUDAR'}, {'otro': 'Me gusta explicar'}], 'relato': RELATO}


def realidad_lista(institucion=INST_UNI, **cambios):
    return {'institucion': institucion, 'camino': {'opcion': 'PREPARARME'},
            'gastos': [{'rubro': 'MATRICULA', 'monto': 600, 'frecuencia': 'POR_CICLO'}],
            'financiamiento': [{'opcion': 'FAMILIA'}], **cambios}
