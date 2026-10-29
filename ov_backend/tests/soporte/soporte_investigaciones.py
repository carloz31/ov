"""Ayudas para recorrer investigaciones y entrevistas (B13); los textos son DATO DE PRUEBA."""

from soporte_ruta import FECHA, avanzar, completar, pedir


OCUPACION = 'electrician'
OTRA_OCUPACION = 'translator'
PIENSO = {'dia': 'Creo que revisa instalaciones de casas y edificios.',
          'necesita': 'Creo que necesita estudiar en un instituto y practicar mucho.',
          'duda': '¿Es peligroso trabajar con electricidad todos los días?'}
ENLACE = 'https://youtu.be/dQw4w9WgXcQ'


def abrir_investigaciones(cliente, cuenta='est-ana'):
    """Abre la Ciudad y completa la misión del investigador, que abre la sección."""
    avanzar(cliente, cuenta=cuenta)
    return completar(cliente, 't-investigador', cuenta)


def accion(cliente, nombre, datos, esperado=200, cuenta='est-ana'):
    return pedir(cliente, 'POST', f'/acciones/{nombre}', {'cuenta': cuenta, 'fecha_hora': FECHA, **datos}, esperado)


def pensar(cliente, cuenta='est-ana', ocupacion=OCUPACION, esperado=200, **cambios):
    return accion(cliente, 'guardar-lo-que-pienso', {'ocupacion': ocupacion, **PIENSO, **cambios}, esperado, cuenta)


def guion(cliente, preguntas=None, cuenta='est-ana', terminar=True, esperado=200, descartadas=()):
    preguntas = [{'origen': 'DUDA', 'texto': PIENSO['duda']}] if preguntas is None else preguntas
    return accion(cliente, 'guardar-guion', {'preguntas': preguntas, 'descartadas': list(descartadas),
                                             'terminar': terminar}, esperado, cuenta)


def guia_lista(cliente, cuenta='est-ana', ocupacion=OCUPACION, abrir=True):
    if abrir:
        abrir_investigaciones(cliente, cuenta)
    pensar(cliente, cuenta, ocupacion)
    return guion(cliente, cuenta=cuenta)


def investigaciones(cliente, cuenta='est-ana', esperado=200):
    return pedir(cliente, 'GET', f'/cuentas/{cuenta}/investigaciones', esperado=esperado)
