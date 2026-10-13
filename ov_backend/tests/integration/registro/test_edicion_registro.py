"""HU-008: consulta de la respuesta consolidada, lo que se puede ampliar y edición (B04).

Los textos son DATO DE PRUEBA; las marcas (`[vaga]`, `[falla]`…) las interpreta el evaluador falso.
"""

from soporte_ruta import FECHA, avanzar, pedir


ADECUADO = 'DATO DE PRUEBA: una respuesta completa con su ejemplo y su razón.'
CORTO = 'DATO DE PRUEBA corto'
OPCIONES = {'t-exp-ruta': [{'codigo': 'INSTITUTO'}], 't-exp-apoyo': [{'codigo': 'FAMILIA'}], 't-exp-espera': []}
CLAVES_PRIVADAS = ('clasificacion', 'criterios', 'requiere_atencion', 'evaluacion')


def accion(cuenta='est-ana', actividad='t-expectativas'):
    return {'cuenta': cuenta, 'actividad': actividad, 'fecha_hora': FECHA}


def entregar(cliente, cuenta='est-ana', **textos):
    """Abre T1, guarda un borrador por ítem y entrega; `textos` reemplaza el texto adecuado por defecto."""
    avanzar(cliente, 't-cierre-inicio', cuenta)
    for item, opciones in OPCIONES.items():
        pedir(cliente, 'POST', '/acciones/registro/guardar-borrador', {
            **accion(cuenta), 'item': item, 'texto': textos.get(item.replace('-', '_'), ADECUADO),
            'opciones': opciones})
    return pedir(cliente, 'POST', '/acciones/registro/entregar', accion(cuenta))


def responder(cliente, item, texto, cuenta='est-ana', esperado=200):
    return pedir(cliente, 'POST', '/acciones/registro/responder-seguimiento',
                 {**accion(cuenta), 'item': item, 'texto': texto}, esperado)


def omitir(cliente, item, cuenta='est-ana'):
    return pedir(cliente, 'POST', '/acciones/registro/continuar-sin-responder', {**accion(cuenta), 'item': item})


def consultar(cliente, cuenta='est-ana', actividad='t-expectativas', esperado=200):
    return pedir(cliente, 'GET', f'/cuentas/{cuenta}/actividades/{actividad}/registro', esperado=esperado)


def consolidadas(registro):
    return {r['item']: r.get('texto_consolidado') for r in registro['respuestas']}


def pistas(registro):
    return {i['item']: i['pista'] for i in registro['items_por_ampliar']}


def sin_claves_privadas(respuesta):
    texto = str(respuesta)
    return not any(clave in texto for clave in CLAVES_PRIVADAS)


# --- Consulta -------------------------------------------------------------------------------

def test_sin_cerrar_no_hay_consolidada_ni_items_por_ampliar(cliente):
    avanzar(cliente, 't-cierre-inicio')
    pedir(cliente, 'POST', '/acciones/registro/guardar-borrador',
          {**accion(), 'item': 't-exp-ruta', 'texto': ADECUADO, 'opciones': OPCIONES['t-exp-ruta']})
    borrador = consultar(cliente)
    assert 'items_por_ampliar' not in borrador and consolidadas(borrador) == {'t-exp-ruta': None}
    for item in ('t-exp-apoyo', 't-exp-espera'):
        pedir(cliente, 'POST', '/acciones/registro/guardar-borrador',
              {**accion(), 'item': item, 'texto': f'{CORTO} [vaga]', 'opciones': OPCIONES[item]})
    pedir(cliente, 'POST', '/acciones/registro/entregar', accion())
    pendiente = consultar(cliente)
    assert 'items_por_ampliar' not in pendiente and set(consolidadas(pendiente).values()) == {None}


def test_registro_cerrado_devuelve_la_consolidada_y_nada_por_ampliar(cliente):
    entregar(cliente, t_exp_apoyo=f'{CORTO} [vaga]')
    responder(cliente, 't-exp-apoyo', 'Mi mamá me ayudó')
    registro = consultar(cliente)
    assert registro['estado'] == 'COMPLETADA' and registro['items_por_ampliar'] == []
    assert consolidadas(registro) == {'t-exp-ruta': ADECUADO, 't-exp-apoyo': f'{CORTO} [vaga]\n\nMi mamá me ayudó',
                                      't-exp-espera': ADECUADO}
    assert sin_claves_privadas(registro)


def test_la_pista_tras_omitir_es_la_pregunta_omitida(cliente):
    entrega = entregar(cliente, t_exp_ruta=f'{CORTO} [vaga]')
    pregunta = next(r for r in entrega['respuestas'] if r['item'] == 't-exp-ruta')['conversacion'][-1]['texto']
    omitir(cliente, 't-exp-ruta')
    registro = consultar(cliente)
    assert pistas(registro) == {'t-exp-ruta': pregunta}
    assert consolidadas(registro)['t-exp-ruta'] == f'{CORTO} [vaga]'


def test_la_pista_tras_agotar_el_seguimiento_es_la_siguiente_pregunta(cliente):
    entregar(cliente, t_exp_ruta=f'{CORTO} [vaga]', t_exp_espera=f'{CORTO} [falta:EJEMPLO]')
    responder(cliente, 't-exp-ruta', 'Porque sí [vaga]')
    responder(cliente, 't-exp-ruta', 'Sigo sin saber [falta:RAZON] [pregunta-invalida]')
    registro = consultar(cliente)
    # La siguiente pregunta de `t-exp-ruta` no pasó la validación: queda la repregunta base de RAZON.
    # `t-exp-espera` nunca recibió su pregunta: la pista es la de la entrega.
    assert pistas(registro) == {'t-exp-ruta': '¿Por qué lo piensas así?',
                                't-exp-espera': 'Sobre lo que contaste: ¿Podrías darme un ejemplo concreto?'}
    assert sin_claves_privadas(registro)
