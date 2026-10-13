"""Recorridos y consultas de la ruta mínima, sin fixtures de base."""

from soporte_dominios import consultar_dominios

from sqlalchemy import select

from app.models.base import Base


FECHA = '2026-10-07T10:00:00'
# DATO DE PRUEBA: el recorrido de `datos/ruta.py` que abre la Ciudad.
RECORRIDO = ('t-inicio', 't-cierre-inicio', 't-expectativas')
# El RIASEC va en dos misiones de 30 ítems; el resultado se calcula al completar la última.
MISIONES_INTERESES = ('t-mision-intereses', 't-mision-intereses-2')
INTERESES, INTERESES_FINAL = MISIONES_INTERESES
# DATO DE PRUEBA: las actividades de registro de la ruta; completarlas exige enviar sus ítems.
REGISTROS = ('t-expectativas', 't-valores')

BLOQUE_FAMILIA = {
    'codigo': 'FAMILIA', 'nombre': 'Actividades para familias', 'numero': 1,
    'espacio': 'PORTAL_FAMILIA', 'estado': 'DISPONIBLE', 'bloqueo': None,
    'actividades': [
        {'codigo': 't-apo-1', 'titulo': 'Primera actividad del apoderado',
         'tipo': 'INFORMATIVA', 'orden': 1, 'contenido': 't_apo_1',
         'visibilidad': 'SIEMPRE', 'visible': True, 'estado': 'DISPONIBLE',
         'requerida': True, 'duracion_estimada_min': 10, 'descripcion': None, 'bloqueo': None},
        {'codigo': 't-apo-carta', 'titulo': 'Carta del apoderado',
         'tipo': 'INFORMATIVA', 'orden': 2, 'contenido': 't_apo_carta',
         'visibilidad': 'SIEMPRE', 'visible': True, 'estado': 'BLOQUEADA',
         'requerida': True, 'duracion_estimada_min': 10, 'descripcion': None,
         'bloqueo': [{'regla': 'R-t-apo-carta', 'mensaje': 'Completa la primera actividad.',
                      'condiciones_faltantes': [{'tipo_evento': 'COMPLETA_ACTIVIDAD', 'referencia': 't-apo-1',
                                                 'tipo_conteo': 'EVENTOS', 'actual': 0, 'requerido': 1,
                                                 'cumplida': False}],
                      'evaluador_especial': None}]},
    ],
}


def pedir(cliente, metodo, ruta, datos=None, esperado=200):
    respuesta = cliente.request(metodo, ruta, json=datos)
    assert respuesta.status_code == esperado, respuesta.text
    return respuesta.json()


def eleccion_minima(item):
    """Las primeras opciones de la lista, tantas como pide el mínimo del ítem."""
    eleccion = item['eleccion']
    return [] if eleccion is None else [{'codigo': o['codigo']} for o in eleccion['opciones'][:eleccion['minima']]]


def responder_registro(cliente, actividad, cuenta='est-ana'):
    """Envía cada ítem de un registro con un texto adecuado para el evaluador falso."""
    for item in pedir(cliente, 'GET', f'/actividades/{actividad}/items-registro'):
        pedir(cliente, 'POST', '/acciones/registro/enviar', {
            'cuenta': cuenta, 'actividad': actividad, 'item': item['codigo'], 'fecha_hora': FECHA,
            'texto': 'DATO DE PRUEBA: una respuesta completa con su ejemplo y su razón.',
            'opciones': eleccion_minima(item)})


def completar(cliente, codigo, cuenta='est-ana', esperado=200):
    if esperado == 200 and codigo in REGISTROS:
        responder_registro(cliente, codigo, cuenta)
    return pedir(cliente, 'POST', '/acciones/completar-actividad',
                 {'cuenta': cuenta, 'actividad': codigo, 'fecha_hora': FECHA}, esperado)


def avanzar(cliente, hasta=None, cuenta='est-ana'):
    """Completa el recorrido hasta `hasta` (incluida); sin `hasta`, deja abierta la Ciudad."""
    ultimo = len(RECORRIDO) if hasta is None else RECORRIDO.index(hasta) + 1
    for codigo in RECORRIDO[:ultimo]:
        respuesta = completar(cliente, codigo, cuenta)
    return respuesta


def responder(cliente, actividad, cuenta='est-ana', opcion=None, inicio=0, fin=None):
    items = pedir(cliente, 'GET', f'/actividades/{actividad}/items')[inicio:fin]
    opciones = {'I': 5, 'R': 4, 'A': 3, 'S': 1, 'E': 1, 'C': 1}
    return pedir(cliente, 'POST', '/acciones/responder-items', {
        'cuenta': cuenta, 'actividad': actividad, 'fecha_hora': FECHA,
        'respuestas': [{'item': item['codigo'], 'opcion': opcion if opcion is not None else opciones[item['dimension']]}
                       for item in items],
    })


def estado(cliente, cuenta='est-ana'):
    return consultar_dominios(cliente, cuenta)


def actividades(cliente, cuenta='est-ana'):
    return {actividad['codigo']: actividad['estado'] for bloque in estado(cliente, cuenta)['bloques']
            for actividad in bloque['actividades']}


def progreso(cliente, tipo, codigo):
    return pedir(cliente, 'GET', f'/cuentas/est-ana/progreso/{tipo}/{codigo}')


def eventos(cliente, cuenta='est-ana'):
    return pedir(cliente, 'GET', f'/cuentas/{cuenta}/eventos')


def reglas(respuesta):
    return {nuevo['regla'] for nuevo in respuesta['nuevos_desbloqueos']}


def filas_base(aplicacion):
    with aplicacion.state.fabrica_sesiones() as sesion:
        return {tabla.name: sesion.execute(select(tabla).order_by(*tabla.primary_key.columns)).all()
                for tabla in Base.metadata.sorted_tables}
