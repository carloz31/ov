"""Auditoría plataforma (D-B2, mitigado con R1): techo de consultas de GET registro, responder y entregar en cada
registro de `contenido`, con los valores medidos el 14 de noviembre. Lo que queda crece con la definición del registro
(sus ítems y las piezas de cada uno), no con la cuenta. Un registro nuevo o un cambio de definición que lo supere hace
fallar la prueba: ahí se decide (subir el techo o corregir). Textos DATO DE PRUEBA."""

from collections import defaultdict
from datetime import datetime

from sqlalchemy import select

from app import models as m
from datos import contenido
from soporte_consultas import ContadorConsultas
from soporte_contenido import REQUERIDAS, avanzar, completar
from soporte_ruta import FECHA, eleccion_minima

REGISTROS = sorted({i[0] for i in contenido.ITEMS_REGISTRO})
# (GET registro, responder, entregar): el máximo medido en el recorrido y en la reedición de cada registro.
# Ajuste logros: dos entregas obtienen una insignia y suman solo sus INSERT (desbloqueo y notificación), no lecturas.
# La prueba no separa los SELECT; hoy la entrega de b1-6 hace 9 (y 5 escrituras) y la de ma8, 16 (y 5 escrituras).
# - b1-6, entregar 13 → 14: «Senderos que no estaban en el mapa» (tercer registro desarrollado), INSERT de la
#   notificación (el desbloqueo va en el mismo INSERT que los de esa entrega).
# - ma8, entregar 19 → 21: «Bitácora completa» (último registro), INSERT del desbloqueo y de la notificación.
TECHO = {
    'b1-1': (5, 18, 16), 'b1-3': (7, 20, 22), 'b1-6': (3, 16, 14), 'b1-7': (5, 18, 19),
    'b2-3': (3, 16, 13), 'b2-4': (6, 19, 20), 'b3-4': (7, 20, 20), 'b3-a': (4, 14, 13),
    'b4-1': (34, 51, 45), 'b4-2': (3, 16, 14), 'b4-5': (12, 25, 28), 'b5-1': (11, 24, 22),
    'b5-3': (11, 24, 25), 'h1': (4, 15, 14), 'h2': (4, 15, 14), 'h3': (9, 20, 20),
    'ma3': (4, 15, 14), 'ma4': (3, 14, 13), 'ma8': (9, 20, 21),
}


def _registrar(cliente, aplicacion, maximos):
    original = cliente.request

    def request(metodo, url, *args, **kwargs):
        ruta = str(url)
        cuerpo = kwargs.get('json') or {}
        clave = None
        if metodo == 'GET' and ruta.endswith('/registro'):
            clave = (ruta.split('/')[-2], 0)
        elif ruta.endswith('/acciones/registro/responder'):
            clave = (cuerpo.get('actividad'), 1)
        elif ruta.endswith('/acciones/registro/entregar'):
            clave = (cuerpo.get('actividad'), 2)
        if clave is None:
            return original(metodo, url, *args, **kwargs)
        with ContadorConsultas(aplicacion.state.motor_bd) as contador:
            respuesta = original(metodo, url, *args, **kwargs)
        if respuesta.status_code == 200:
            maximos[clave[0]][clave[1]] = max(maximos[clave[0]][clave[1]], contador.cantidad)
        return respuesta

    cliente.request = request


def test_techo_de_consultas_de_cada_registro_de_contenido(cliente_contenido, aplicacion_contenido):
    cliente = cliente_contenido
    maximos = defaultdict(lambda: [0, 0, 0])
    _registrar(cliente, aplicacion_contenido, maximos)
    avanzar(cliente, REQUERIDAS[0], REQUERIDAS[-1])
    # Los registros opcionales que el camino no abre (piden casos u otras misiones) se abren con sus reglas.
    with aplicacion_contenido.state.fabrica_sesiones.begin() as sesion:
        ana = sesion.scalar(select(m.Cuenta).where(m.Cuenta.codigo == 'est-ana'))
        ids = {a.codigo: a.id for a in sesion.scalars(select(m.Actividad).where(m.Actividad.codigo.in_(REGISTROS)))}
        ya = set(sesion.scalars(select(m.Desbloqueo.regla_id).where(m.Desbloqueo.cuenta_id == ana.id)))
        for regla in sesion.scalars(select(m.ReglaDesbloqueo).where(
                m.ReglaDesbloqueo.tipo_objetivo == m.TipoObjetivo.ACTIVIDAD,
                m.ReglaDesbloqueo.id_objetivo.in_(ids.values()))):
            if regla.id not in ya:
                sesion.add(m.Desbloqueo(cuenta_id=ana.id, regla_id=regla.id, fecha_hora=datetime.fromisoformat(FECHA),
                                        visto=True))
    for actividad in REGISTROS:
        if actividad not in maximos or maximos[actividad][2] == 0:
            completar(cliente, actividad)
    # La reedición del primer ítem de cada registro, con todo lo de la cuenta ya cargado (el peor caso).
    for actividad in REGISTROS:
        registro = cliente.get(f'/cuentas/est-ana/actividades/{actividad}/registro').json()
        item = registro['items'][0]
        cliente.post('/acciones/registro/responder', json={
            'cuenta': 'est-ana', 'actividad': actividad, 'item': item['codigo'], 'opciones': eleccion_minima(item),
            'texto': 'DATO DE PRUEBA: reedición', 'fecha_hora': FECHA})
        cliente.post('/acciones/registro/entregar', json={'cuenta': 'est-ana', 'actividad': actividad,
                                                          'fecha_hora': FECHA})
    medidos = {actividad: tuple(valores) for actividad, valores in maximos.items()}
    assert set(medidos) == set(REGISTROS), set(REGISTROS) - set(medidos)
    assert set(TECHO) == set(REGISTROS), 'Cada registro de contenido necesita su techo'
    excedidos = {a: (medidos[a], TECHO[a]) for a in REGISTROS
                 if any(m > t for m, t in zip(medidos[a], TECHO[a]))}
    assert not excedidos, f'Registros sobre su techo (medido, techo): {excedidos}'
