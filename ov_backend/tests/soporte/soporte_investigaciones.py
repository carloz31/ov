"""Ayudas para recorrer investigaciones y entrevistas (B13); los textos son DATO DE PRUEBA."""

from datetime import datetime

from sqlalchemy import select

from app import models as m
from soporte_ruta import FECHA, avanzar, completar, pedir


OCUPACION = 'electrician'
OTRA_OCUPACION = 'translator'
PIENSO = {'dia': 'Creo que revisa instalaciones de casas y edificios.',
          'necesita': 'Creo que necesita estudiar en un instituto y practicar mucho.',
          'duda': '¿Es peligroso trabajar con electricidad todos los días?'}
ENLACE = 'https://youtu.be/dQw4w9WgXcQ'
FICHA = {'titulo': 'Un día con una electricista', 'profesional': 'Rosa Quispe', 'duracion': '20 minutos',
         'enlace': ENLACE, 'resumen': 'Nos contó cómo empezó y qué cuidados toma cada día.', 'permiso': True}


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


def publicar(cliente, cuenta='est-ana', coautores=(), esperado=200, **cambios):
    return accion(cliente, 'publicar-entrevista', {**FICHA, 'coautores': list(coautores), **cambios}, esperado, cuenta)


def codigo_publicado(respuesta, cuenta='est-ana'):
    evento, = respuesta['por_cuenta'][cuenta]['eventos_registrados']
    return evento['referencia']


def entrevistas(cliente, cuenta='est-ana', esperado=200, **filtros):
    consulta = '&'.join(f'{clave}={str(valor).lower() if isinstance(valor, bool) else valor}'
                        for clave, valor in filtros.items())
    return pedir(cliente, 'GET', f'/cuentas/{cuenta}/entrevistas?{consulta}', esperado=esperado)


def detalle(cliente, codigo, cuenta='est-ana', esperado=200):
    return pedir(cliente, 'GET', f'/cuentas/{cuenta}/entrevistas/{codigo}', esperado=esperado)


def guias_listas_directas(sesion, codigos, ocupacion=OCUPACION):
    """DATO DE PRUEBA: guías listas escritas en la base, para medir sin recorrer la ruta de cada cuenta. Las cuentas
    sin salón pasan al de Ana."""
    salon = sesion.scalar(select(m.Cuenta.salon_id).where(m.Cuenta.codigo == 'est-ana'))
    ocupacion_id = sesion.scalar(select(m.Ocupacion.id).where(m.Ocupacion.codigo == ocupacion))
    fecha = datetime.fromisoformat(FECHA)
    for cuenta in sesion.scalars(select(m.Cuenta).where(m.Cuenta.codigo.in_(codigos))):
        cuenta.salon_id = cuenta.salon_id or salon
        sesion.add(m.Investigacion(codigo=f'INV-{cuenta.codigo}', cuenta_id=cuenta.id, ocupacion_id=ocupacion_id,
                                   estado='GUIA_LISTA', piensa_dia='DATO DE PRUEBA', piensa_necesita='DATO DE PRUEBA',
                                   piensa_duda='DATO DE PRUEBA', creada_en=fecha, guia_lista_en=fecha))
