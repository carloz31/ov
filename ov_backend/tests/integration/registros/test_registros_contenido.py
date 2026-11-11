"""Ajuste registros llm (lote 2): los registros definitivos de `contenido` recorridos con la entrega provisional.

Opciones propias (`sin_llm` sin texto; las demás, con texto), el podio con «Otra», un opcional completado que emite
REGISTRO_ADECUADO y el orden de reglas de b4-1 y b4-5. El seguimiento, la clasificación, los abiertos y las cartas
del diario vuelven con el flujo secuencial (lote 3). Los textos son DATO DE PRUEBA.
"""

from soporte_catalogo_ruta import PERIODISMO, PSICOLOGIA
from soporte_contenido import REQUERIDAS, avanzar, completar, revelar_para_b4
from soporte_planes import crear, guardar, por_que_lista
from soporte_ruta import FECHA, items_entrega, pedir, responder, revelar


TEXTO = 'DATO DE PRUEBA: una respuesta completa con su ejemplo y su razón.'


def entregar(cliente, actividad, items, esperado=200):
    """`items`: {ítem: (texto, opciones)}."""
    return pedir(cliente, 'POST', '/acciones/registro/entregar', {
        'cuenta': 'est-ana', 'actividad': actividad, 'fecha_hora': FECHA,
        'items': [{'item': item, 'texto': texto, 'opciones': opciones} for item, (texto, opciones) in items.items()]},
        esperado)


def codigos(*elegidas):
    return [{'codigo': c} for c in elegidas]


def estados(cliente):
    return {a['codigo']: a['estado'] for b in pedir(cliente, 'GET', '/cuentas/est-ana/actividades')
            for a in b['actividades']}


def adecuado(respuesta, actividad):
    return ('REGISTRO_ADECUADO', actividad) in {(e['tipo'], e['referencia']) for e in respuesta['eventos_registrados']}


def test_b1_3_opciones_propias_sin_llm_van_sin_texto(cliente_contenido):
    cliente = cliente_contenido
    avanzar(cliente, 'b0-1', 'b1-2')
    voz, mia, contraste = pedir(cliente, 'GET', '/actividades/b1-3/items-registro')
    assert contraste['eleccion']['premarcar_si'] == {'item': 'b1-3-voz', 'opcion': 'NADIE', 'marca': 'SIN_COMPARAR'}
    nadie, = [o for o in voz['eleccion']['opciones_propias'] if o['codigo'] == 'NADIE']
    assert nadie['exclusiva'] and nadie['sin_llm'] and nadie['pregunta'].startswith('¿Hay algo que igual sientes')
    aun_no, = mia['eleccion']['opciones_propias']
    assert (aun_no['codigo'], aun_no['sin_llm'], aun_no['pregunta']) == ('AUN_NO', False, '¿Qué te hace dudar?')
    # AUN_NO no es `sin_llm`: su texto no puede ir vacío.
    sin_texto = {'b1-3-voz': ('', codigos('NADIE')), 'b1-3-mia': ('', codigos('AUN_NO')),
                 'b1-3-contraste': ('', codigos('SIN_COMPARAR'))}
    entregar(cliente, 'b1-3', sin_texto, esperado=422)
    # Una opción exclusiva va sola.
    entregar(cliente, 'b1-3', {**sin_texto, 'b1-3-voz': (TEXTO, codigos('NADIE', voz['eleccion']['opciones'][0]['codigo'])),
                               'b1-3-mia': (TEXTO, codigos('AUN_NO'))}, esperado=422)
    cierre = entregar(cliente, 'b1-3', {**sin_texto, 'b1-3-mia': ('DATO DE PRUEBA: dudo entre diseño y enfermería',
                                                                  codigos('AUN_NO'))})
    assert cierre['estado'] == 'COMPLETADA' and adecuado(cierre, 'b1-3')
    assert {r['item']: r['texto'] for r in cierre['respuestas']} == {
        'b1-3-voz': '', 'b1-3-mia': 'DATO DE PRUEBA: dudo entre diseño y enfermería', 'b1-3-contraste': ''}


def test_b2_4_podio_ordenado_con_otra(cliente_contenido):
    cliente = cliente_contenido
    avanzar(cliente, 'b0-1', 'b2-3')
    items = items_entrega(cliente, 'b2-4')
    bien = next(i for i in pedir(cliente, 'GET', '/actividades/b2-4/items-registro') if i['codigo'] == 'b2-4-bien')
    eleccion = bien['eleccion']
    assert (eleccion['minima'], eleccion['maxima'], eleccion['ordenada'], eleccion['permite_otra']) == (3, 3, True, True)
    primera = eleccion['opciones'][0]
    podio = [{'codigo': 'OTRA-1', 'texto': 'DATO DE PRUEBA: dibujar'}, {'codigo': primera['codigo']},
             {'codigo': 'OTRA-2', 'texto': 'DATO DE PRUEBA: cocinar'}]
    cuerpo = {'cuenta': 'est-ana', 'actividad': 'b2-4', 'fecha_hora': FECHA}
    con = lambda opciones: [{**i, 'opciones': opciones} if i['item'] == 'b2-4-bien' else i for i in items]
    # Un podio pide exactamente tres.
    pedir(cliente, 'POST', '/acciones/registro/entregar', {**cuerpo, 'items': con(podio[:2])}, 422)
    cierre = pedir(cliente, 'POST', '/acciones/registro/entregar', {**cuerpo, 'items': con(podio)})
    assert cierre['estado'] == 'COMPLETADA' and adecuado(cierre, 'b2-4')
    # El podio ordenado guarda la «Otra» en el puesto en que se eligió, con lo escrito.
    guardado, = [r['opciones_elegidas'] for r in cierre['respuestas'] if r['item'] == 'b2-4-bien']
    assert guardado == [podio[0], {'codigo': primera['codigo'], 'texto': primera['texto']}, podio[2]]


def test_un_opcional_completado_es_registro_adecuado(cliente_contenido):
    """h1 (opcional, sin LLM) completado emite REGISTRO_ADECUADO, que abre ma4 (R-ma4)."""
    cliente = cliente_contenido
    avanzar(cliente, 'b0-1', 'b2-1')
    for parte in range(1, 5):
        responder(cliente, f'h-habilidades-{parte}', opcion=1)
        pedir(cliente, 'POST', '/acciones/completar-actividad',
              {'cuenta': 'est-ana', 'actividad': f'h-habilidades-{parte}', 'fecha_hora': FECHA})
    revelar(cliente, instrumento='TEST-HABILIDADES', aplicacion='APL-HABILIDADES')
    assert estados(cliente)['h1'] == 'DISPONIBLE' and estados(cliente)['ma4'] == 'BLOQUEADA'
    reto, = pedir(cliente, 'GET', '/actividades/h1/items-registro')
    assert not reto['con_llm']
    cierre = entregar(cliente, 'h1', {'h1-reto': (TEXTO, codigos(reto['eleccion']['opciones_propias'][0]['codigo']))})
    assert cierre['estado'] == 'COMPLETADA' and adecuado(cierre, 'h1')
    assert 'R-ma4' in {d['regla'] for d in cierre['nuevos_desbloqueos']}
    assert estados(cliente)['ma4'] == 'DISPONIBLE'


def test_camino_con_reglas_de_planes(cliente_contenido):
    """b4-1 pide el «Por qué» del Plan A; b4-5, el del Plan A y el del Plan B (y vencer b4-4)."""
    cliente = cliente_contenido
    for codigo in REQUERIDAS:
        if codigo == 'b3-10':
            revelar_para_b4(cliente)
        if codigo == 'b4-1':
            assert estados(cliente)['b4-1'] == 'BLOQUEADA'
            crear(cliente, PSICOLOGIA)
            assert estados(cliente)['b4-1'] == 'BLOQUEADA'
            guardar(cliente, PSICOLOGIA, 'POR_QUE', por_que_lista())
            assert estados(cliente)['b4-1'] == 'DISPONIBLE'
        if codigo == 'b4-5':
            assert estados(cliente)['b4-5'] == 'BLOQUEADA'
            crear(cliente, PERIODISMO)
            assert estados(cliente)['b4-5'] == 'BLOQUEADA'
            guardar(cliente, PERIODISMO, 'POR_QUE', por_que_lista())
            assert estados(cliente)['b4-5'] == 'DISPONIBLE'
        completar(cliente, codigo)
        if codigo == 'b4-5':
            guardar(cliente, PSICOLOGIA, 'PASOS', {'pasos': [{'tipo': 'conversar', 'texto': 'Hablar con una psicóloga.'}]})
    assert estados(cliente)['b5-5'] == 'COMPLETADA'
    # Las actividades retiradas no existen.
    assert not {'b2-6', 'ma6', 'b4-a', 'ma9'} & set(estados(cliente))
