"""Ayudas para recorrer el conjunto `contenido` con las peticiones del front (entrega provisional de registros,
ajuste registros llm, lote 2).

Las comparten el recorrido de punta a punta (`escenarios/contenido`) y las pruebas de los registros definitivos
(`registros/`, ajuste registros). Los textos son DATO DE PRUEBA.
"""

from soporte_catalogo_ruta import PERIODISMO, PSICOLOGIA
from soporte_planes import crear, guardar, por_que_lista, realidad_lista
from soporte_ruta import FECHA, pedir, responder, responder_registro, revelar

from datos import contenido


CAMINO = ('B0', 'B1', 'B2', 'B3', 'B4', 'B5')
REQUERIDAS = tuple(c for c, b, *_ in contenido.ACTIVIDADES
                   if b in CAMINO and contenido.PROPIEDADES.get(c, {}).get('requerida', True))
TIPOS = {c: t for c, _, _, t, *_ in contenido.ACTIVIDADES}
PODIOS = ('b2-3-valores', 'b2-4-bien')


def ganar_batalla(cliente, codigo):
    vidas, _, _ = contenido.CONFIGURACION_BATALLAS[codigo]
    pool = [p for p in contenido.PREGUNTAS_BATALLA if p[1] == codigo]
    respuestas = [{'pregunta': p[0], 'opcion': p[5]} for p in pool[:vidas]]
    return pedir(cliente, 'POST', '/acciones/resolver-batalla',
                 {'cuenta': 'est-ana', 'actividad': codigo, 'fecha_hora': FECHA, 'respuestas': respuestas})


def completar(cliente, codigo, cuenta='est-ana'):
    tipo = TIPOS[codigo]
    if tipo == 'BATALLA':
        return ganar_batalla(cliente, codigo)
    if tipo == 'REGISTRO':
        if any(i[1] in PODIOS for i in contenido.ITEMS_REGISTRO if i[0] == codigo):
            # Ajuste registros: los registros tienen más ítems con elección; el podio es el de PODIOS.
            podio, = [i for i in pedir(cliente, 'GET', f'/actividades/{codigo}/items-registro') if i['codigo'] in PODIOS]
            # El podio se completa eligiendo exactamente tres opciones (`eleccion_minima` toma las tres primeras).
            assert (podio['eleccion']['minima'], podio['eleccion']['maxima']) == (3, 3)
        return responder_registro(cliente, codigo, cuenta)
    if tipo == 'CUESTIONARIO':
        responder(cliente, codigo, cuenta, opcion=3 if codigo in ('b0-3', 'b5-2') else None)
    return pedir(cliente, 'POST', '/acciones/completar-actividad',
                 {'cuenta': cuenta, 'actividad': codigo, 'fecha_hora': FECHA})


def preparar_planes(cliente):
    """Dos planes desde favoritos, con «Por qué» y «Qué tan real es» listos (REALIDAD se abre con b3-8). PSICOLOGIA es
    el Plan A y PERIODISMO el Plan B: R-b4-1 pide el «Por qué» del A y R-b4-5 el de los dos."""
    for carrera in (PSICOLOGIA, PERIODISMO):
        crear(cliente, carrera)
        guardar(cliente, carrera, 'POR_QUE', por_que_lista())
        guardar(cliente, carrera, 'REALIDAD', realidad_lista())


def revelar_para_b4(cliente):
    """B4 pide el punto de partida y los instrumentos prioritarios del salón (5A: intereses) revelados."""
    revelar(cliente, instrumento='TEST-PARTIDA-LLEGADA', aplicacion='APL-PARTIDA')
    for parte in range(1, 7):
        completar(cliente, f'h-intereses-{parte}')
    revelar(cliente)


def avanzar(cliente, desde, hasta, completar_con=completar):
    """Completa las requeridas del camino de `desde` a `hasta`, con lo que cada tramo pide además."""
    for codigo in REQUERIDAS[REQUERIDAS.index(desde):REQUERIDAS.index(hasta) + 1]:
        if codigo == 'b3-10':
            revelar_para_b4(cliente)
        completar_con(cliente, codigo)
        if codigo == 'b3-8':
            preparar_planes(cliente)
        if codigo == 'b4-5':
            guardar(cliente, PSICOLOGIA, 'PASOS', {'pasos': [{'tipo': 'conversar', 'texto': 'Hablar con una psicóloga.'}]})
