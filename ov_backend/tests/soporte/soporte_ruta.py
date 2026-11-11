"""Recorridos y consultas de la ruta mínima, sin fixtures de base."""

from soporte_dominios import consultar_dominios

from sqlalchemy import select

from app.models.base import Base
from datos.ruta import CONFIGURACION_BATALLAS, DESCRIPCIONES, PREGUNTAS_BATALLA


FECHA = '2026-10-07T10:00:00'
# DATO DE PRUEBA: el recorrido de `datos/ruta.py` que abre la Ciudad.
RECORRIDO = ('t-inicio', 't-partida', 't-cierre-inicio', 't-expectativas')
# DATO DE PRUEBA: los cuestionarios de partida y llegada (B07); `completar` responde sus 19 ítems.
PARTIDA_LLEGADA = ('t-partida', 't-llegada')
# El RIASEC va en dos misiones de 30 ítems; el resultado se calcula al completar la última.
MISIONES_INTERESES = ('t-mision-intereses', 't-mision-intereses-2')
INTERESES, INTERESES_FINAL = MISIONES_INTERESES
# DATO DE PRUEBA: las actividades de registro de la ruta; se completan al entregarlas.
REGISTROS = ('t-expectativas', 't-valores')

BLOQUE_FAMILIA = {
    'codigo': 'FAMILIA', 'nombre': 'Actividades para familias', 'numero': 1,
    'espacio': 'PORTAL_FAMILIA', 'estado': 'DISPONIBLE', 'bloqueo': None,
    'actividades': [
        {'codigo': 't-apo-1', 'titulo': 'Primera actividad del apoderado',
         'tipo': 'INFORMATIVA', 'orden': 1, 'contenido': 't_apo_1',
         'visibilidad': 'SIEMPRE', 'visible': True, 'estado': 'DISPONIBLE',
         'requerida': True, 'duracion_estimada_min': 10, 'descripcion': DESCRIPCIONES['t-apo-1'], 'bloqueo': None},
        {'codigo': 't-apo-2', 'titulo': 'Segunda actividad del apoderado',
         'tipo': 'INFORMATIVA', 'orden': 2, 'contenido': 't_apo_2',
         'visibilidad': 'SIEMPRE', 'visible': True, 'estado': 'BLOQUEADA',
         'requerida': True, 'duracion_estimada_min': 10, 'descripcion': DESCRIPCIONES['t-apo-2'],
         'bloqueo': [{'regla': 'R-t-apo-2', 'mensaje': 'Completa la primera actividad.',
                      'condiciones_faltantes': [{'tipo_evento': 'COMPLETA_ACTIVIDAD', 'referencia': 't-apo-1',
                                                 'tipo_conteo': 'EVENTOS', 'actual': 0, 'requerido': 1,
                                                 'cumplida': False, 'texto': None}],
                      'evaluador_especial': None}]},
    ],
}


def pedir(cliente, metodo, ruta, datos=None, esperado=200):
    respuesta = cliente.request(metodo, ruta, json=datos)
    assert respuesta.status_code == esperado, respuesta.text
    return respuesta.json()


TEXTO_REGISTRO = 'DATO DE PRUEBA: una respuesta completa.'


def eleccion_minima(item):
    """Las primeras opciones que se le ofrecen a la cuenta, tantas como pide el mínimo: las exclusivas al final. Una
    pieza va con su texto; si no alcanzan, completa con «Otra». `item` es el del registro de la cuenta (lote 3)."""
    eleccion = item['eleccion']
    if eleccion is None:
        return []
    opciones = sorted(item['opciones'], key=lambda o: o['exclusiva'])
    elegidas = [{'codigo': o['codigo'], **({'texto': o['texto']} if o['origen'] else {})}
                for o in opciones[:eleccion['minima']]]
    otras = [{'codigo': 'OTRA' if eleccion['maxima'] == 1 else f'OTRA-{n}', 'texto': 'DATO DE PRUEBA: otra'}
             for n in range(1, eleccion['minima'] - len(elegidas) + 1)] if eleccion['permite_otra'] else []
    return elegidas + otras


def leer_registro(cliente, actividad, cuenta='est-ana'):
    return pedir(cliente, 'GET', f'/cuentas/{cuenta}/actividades/{actividad}/registro')


def item_de(registro, codigo):
    return next(i for i in registro['items'] if i['codigo'] == codigo)


def responder_item(cliente, actividad, item, opciones=None, texto=TEXTO_REGISTRO, cuenta='est-ana', esperado=200):
    """Responde (o edita) un ítem. Sin `opciones`, su elección mínima según el registro de la cuenta."""
    if opciones is None:
        opciones = eleccion_minima(item_de(leer_registro(cliente, actividad, cuenta), item))
    return pedir(cliente, 'POST', '/acciones/registro/responder', {
        'cuenta': cuenta, 'actividad': actividad, 'item': item, 'opciones': opciones, 'texto': texto,
        'fecha_hora': FECHA}, esperado)


def seguir(cliente, actividad, item, texto='DATO DE PRUEBA: lo cuento con un ejemplo.', cuenta='est-ana', esperado=200):
    return pedir(cliente, 'POST', '/acciones/registro/responder-seguimiento', {
        'cuenta': cuenta, 'actividad': actividad, 'item': item, 'texto': texto, 'fecha_hora': FECHA}, esperado)


def reenviar(cliente, actividad, item, cuenta='est-ana', esperado=200):
    return pedir(cliente, 'POST', '/acciones/registro/reenviar', {
        'cuenta': cuenta, 'actividad': actividad, 'item': item, 'fecha_hora': FECHA}, esperado)


def terminar(cliente, actividad, cuenta='est-ana', esperado=200):
    return pedir(cliente, 'POST', '/acciones/registro/entregar',
                 {'cuenta': cuenta, 'actividad': actividad, 'fecha_hora': FECHA}, esperado)


def responder_registro(cliente, actividad, cuenta='est-ana', texto=TEXTO_REGISTRO):
    """Responde cada ítem en su orden, con su elección mínima y un texto (sin responder repreguntas), y termina el
    registro (ajuste registros llm, lote 3: flujo ítem por ítem)."""
    registro = leer_registro(cliente, actividad, cuenta)
    while registro['item_actual'] is not None:
        item = item_de(registro, registro['item_actual'])
        registro = responder_item(cliente, actividad, item['codigo'], eleccion_minima(item), texto, cuenta)['registro']
    return terminar(cliente, actividad, cuenta)


def es_registro(cliente, codigo, cuenta):
    respuesta = cliente.request('GET', f'/cuentas/{cuenta}/actividades/{codigo}/registro')
    return respuesta.status_code == 200 and bool(respuesta.json()['items'])


def completar(cliente, codigo, cuenta='est-ana', esperado=200):
    """Completa una actividad; un registro se responde ítem por ítem y se termina (lote 3)."""
    if esperado == 200 and codigo in PARTIDA_LLEGADA and not pedir(
            cliente, 'GET', f'/cuentas/{cuenta}/actividades/{codigo}/respuestas')['respuestas']:
        responder(cliente, codigo, cuenta, opcion=3)
    if esperado == 200 and (codigo in REGISTROS or es_registro(cliente, codigo, cuenta)):
        registro = leer_registro(cliente, codigo, cuenta)
        if registro['estado'] != 'COMPLETADA':
            return responder_registro(cliente, codigo, cuenta)
        return terminar(cliente, codigo, cuenta)
    return pedir(cliente, 'POST', '/acciones/completar-actividad',
                 {'cuenta': cuenta, 'actividad': codigo, 'fecha_hora': FECHA}, esperado)


def revelar(cliente, instrumento='TEST-RIASEC', cuenta='est-ana', aplicacion=None, esperado=200):
    datos = {'cuenta': cuenta, 'instrumento': instrumento, 'fecha_hora': FECHA}
    if aplicacion is not None:
        datos['aplicacion'] = aplicacion
    return pedir(cliente, 'POST', '/acciones/revelar-resultado', datos, esperado)


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


def respuestas_batalla(victoria, otros=0, batalla='t-batalla'):
    """Un intento completo de t-batalla (5 vidas, 3 destellos; F04c), en orden. Victoria: `otros` errores y
    después los 5 aciertos. Derrota: `otros` aciertos (menos de 5) y después los 3 errores."""
    vidas, destellos, _ = CONFIGURACION_BATALLAS[batalla]
    secuencia = ([False] * otros + [True] * vidas) if victoria else ([True] * otros + [False] * destellos)
    pool = [p for p in PREGUNTAS_BATALLA if p[1] == batalla]
    return [{'pregunta': codigo, 'opcion': correcta if acierta else (correcta + 1) % len(opciones)}
            for acierta, (codigo, _, _, _, opciones, correcta, _) in zip(secuencia, pool)]
