"""Ajuste registros llm (lote 2): los registros definitivos de `contenido` recorridos ítem por ítem (lote 3), con el
cliente de prueba del LLM (sin red).

Opciones propias (`sin_llm` sin texto; las demás, con texto), el podio con «Otra», un opcional completado que emite
REGISTRO_ADECUADO y el orden de reglas de b4-1 y b4-5. El seguimiento, la clasificación, los abiertos y las cartas
del diario vuelven con el flujo secuencial (lote 3). Los textos son DATO DE PRUEBA.
"""

import json

from sqlalchemy import select

from app import models as m
from soporte_catalogo_ruta import PERIODISMO, PSICOLOGIA
from soporte_contenido import REQUERIDAS, avanzar, completar, revelar_para_b4
from soporte_planes import crear, guardar, por_que_lista
from soporte_ruta import FECHA, pedir, responder, responder_item, revelar, terminar


TEXTO = 'DATO DE PRUEBA: una respuesta completa con su ejemplo y su razón.'


def entregar(cliente, actividad, items, esperado=200):
    """`items`: {ítem: (texto, opciones)}. Responde cada ítem y termina; el primer rechazo debe ser `esperado`."""
    for item, (texto, opciones) in items.items():
        respuesta = cliente.post('/acciones/registro/responder', json={
            'cuenta': 'est-ana', 'actividad': actividad, 'item': item, 'texto': texto, 'opciones': opciones,
            'fecha_hora': FECHA})
        if respuesta.status_code != 200:
            assert respuesta.status_code == esperado, respuesta.text
            return respuesta.json()
    return terminar(cliente, actividad, esperado=esperado)


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
    assert {i['codigo']: i['respuesta']['primera_respuesta'] for i in cierre['items']} == {
        'b1-3-voz': '', 'b1-3-mia': 'DATO DE PRUEBA: dudo entre diseño y enfermería', 'b1-3-contraste': ''}


def test_b2_4_podio_ordenado_con_otra(cliente_contenido):
    cliente = cliente_contenido
    avanzar(cliente, 'b0-1', 'b2-3')
    bien = next(i for i in pedir(cliente, 'GET', '/actividades/b2-4/items-registro') if i['codigo'] == 'b2-4-bien')
    eleccion = bien['eleccion']
    assert (eleccion['minima'], eleccion['maxima'], eleccion['ordenada'], eleccion['permite_otra']) == (3, 3, True, True)
    primera = eleccion['opciones'][0]
    podio = [{'codigo': 'OTRA-1', 'texto': 'DATO DE PRUEBA: dibujar'}, {'codigo': primera['codigo']},
             {'codigo': 'OTRA-2', 'texto': 'DATO DE PRUEBA: cocinar'}]
    # Un podio pide exactamente tres.
    responder_item(cliente, 'b2-4', 'b2-4-bien', podio[:2], TEXTO, esperado=422)
    responder_item(cliente, 'b2-4', 'b2-4-bien', podio, TEXTO)
    for item in ('b2-4-cuesta', 'b2-4-cruce'):
        responder_item(cliente, 'b2-4', item, texto=TEXTO)
    cierre = terminar(cliente, 'b2-4')
    assert cierre['estado'] == 'COMPLETADA' and adecuado(cierre, 'b2-4')
    # El podio ordenado guarda la «Otra» en el puesto en que se eligió, con lo escrito.
    guardado, = [i['respuesta']['opciones_elegidas'] for i in cierre['items'] if i['codigo'] == 'b2-4-bien']
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


# Ajuste front de registros (lote 2): los ecos que solo se muestran traen su nombre (el origen del bloque), no van al
# LLM y no disparan el eco cambiado.
NOMBRES_SOLO_MOSTRAR = {
    'ma3-ref-dia': 'tu día a los 23',
    'ma3-ref-hito': 'lo que estarás haciendo dentro de un año',
    'h1-ref-resultado': 'Tu test de habilidades',
    'h2-ref-resultado': 'Tu test de inteligencias',
    'h3-ref-resultado': 'Tu test de intereses',
    'b5-3-ref-seguridad': 'qué tan seguro/a te sientes de tu proyecto',
}


def test_ecos_con_nombre_solo_se_muestran(sesion_contenido):
    items = {i.codigo: i for i in sesion_contenido.scalars(select(m.ItemRegistro))}
    mostrados = {e['codigo']: e.get('nombre') for i in items.values() for e in i.ecos_mostrar or ()}
    assert {c: mostrados[c] for c in NOMBRES_SOLO_MOSTRAR} == NOMBRES_SOLO_MOSTRAR
    al_llm = {e['codigo'] for i in items.values() for e in i.ecos_llm or ()}
    assert not set(NOMBRES_SOLO_MOSTRAR) & al_llm
    h2 = items['h2-reconozco']
    assert h2.dialogo == 'El libro muestra formas de aprender y resolver. Algunas te sonarán.'
    assert h2.pregunta_eleccion == 'Según lo que has visto en tu página, ¿te reconoces?'


def test_nombre_de_un_eco_mostrado_no_cambia_el_eco(cliente_contenido, aplicacion_contenido):
    """b5-3: la seguridad llega con su nombre; un intento guardado con el nombre de antes («Hoy») no queda con el eco
    cambiado, y el nombre no entra en lo que va al LLM."""
    cliente = cliente_contenido
    avanzar(cliente, REQUERIDAS[0], REQUERIDAS[REQUERIDAS.index('b5-3') - 1])
    ruta = '/cuentas/est-ana/actividades/b5-3/registro'
    item = next(i for i in pedir(cliente, 'GET', ruta)['items'] if i['codigo'] == 'b5-3-cambio')
    seguridad = next(e for e in item['ecos'] if e['codigo'] == 'b5-3-ref-seguridad')
    assert seguridad['nombre'] == NOMBRES_SOLO_MOSTRAR['b5-3-ref-seguridad']
    pedir(cliente, 'POST', '/acciones/registro/responder',
          {'cuenta': 'est-ana', 'actividad': 'b5-3', 'fecha_hora': FECHA, 'item': 'b5-3-cambio',
           'opciones': [{'codigo': 'IGUAL'}], 'texto': TEXTO})
    with aplicacion_contenido.state.fabrica_sesiones() as sesion:
        item_id = sesion.scalar(select(m.ItemRegistro.id).where(m.ItemRegistro.codigo == 'b5-3-cambio'))
        intento = sesion.scalar(select(m.RespuestaRegistro).where(
            m.RespuestaRegistro.item_registro_id == item_id, m.RespuestaRegistro.vigente))
        valores = dict(intento.valores_contexto)
        assert not any(n in json.dumps(valores.get('ecos_llm') or [], ensure_ascii=False)
                       for n in NOMBRES_SOLO_MOSTRAR.values())
        valores['ecos_mostrar'] = [dict(e, nombre='Hoy') if e.get('nombre') else e for e in valores['ecos_mostrar']]
        intento.valores_contexto = valores
        sesion.commit()
    item = next(i for i in pedir(cliente, 'GET', ruta)['items'] if i['codigo'] == 'b5-3-cambio')
    assert item['respuesta']['eco_cambiado'] is False
