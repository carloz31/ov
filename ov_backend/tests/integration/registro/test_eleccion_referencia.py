"""B05: elección por referencia en `t-eco`; solo se aceptan los códigos que la referencia devuelve a la cuenta.

Los textos son DATO DE PRUEBA; las marcas (`[vaga]`) las interpreta el evaluador falso.
"""

import pytest

from soporte_ruta import FECHA, actividades, avanzar, pedir


ADECUADO = 'DATO DE PRUEBA: una respuesta completa con su ejemplo y su razón.'
# DATO DE PRUEBA: frase que solo está en t-exp-espera, para comprobar que su cita no va al evaluador.
FRASE_ESPERA = 'DATO DE PRUEBA frase-solo-de-expectativas [vaga]'
OTRA = {'codigo': 'OTRA', 'texto': 'DATO DE PRUEBA: trabajar en el taller familiar'}


def accion(actividad, cuenta='est-ana'):
    return {'cuenta': cuenta, 'actividad': actividad, 'fecha_hora': FECHA}


def evaluador(aplicacion):
    return aplicacion.state.evaluador_respuestas


def cerrar_expectativas(cliente, cuenta='est-ana'):
    """Entrega t-expectativas eligiendo UNIVERSIDAD y OTRA, con t-exp-espera poco desarrollada y omitida."""
    avanzar(cliente, 't-cierre-inicio', cuenta)
    for item, texto, opciones in (('t-exp-ruta', ADECUADO, [{'codigo': 'UNIVERSIDAD'}, OTRA]),
                                  ('t-exp-apoyo', ADECUADO, [{'codigo': 'FAMILIA'}]),
                                  ('t-exp-espera', FRASE_ESPERA, [])):
        pedir(cliente, 'POST', '/acciones/registro/guardar-borrador',
              {**accion('t-expectativas', cuenta), 'item': item, 'texto': texto, 'opciones': opciones})
    pedir(cliente, 'POST', '/acciones/registro/entregar', accion('t-expectativas', cuenta))
    pedir(cliente, 'POST', '/acciones/registro/continuar-sin-responder',
          {**accion('t-expectativas', cuenta), 'item': 't-exp-espera'})


def borrador_eco(cliente, opciones, esperado=200, texto=ADECUADO):
    return pedir(cliente, 'POST', '/acciones/registro/guardar-borrador', {
        **accion('t-eco'), 'item': 't-eco-ruta', 'texto': texto, 'opciones': opciones}, esperado)


def entregar_eco(cliente, opciones, texto=ADECUADO, esperado=200):
    borrador_eco(cliente, opciones, texto=texto)
    pedir(cliente, 'POST', '/acciones/registro/guardar-borrador',
          {**accion('t-eco'), 'item': 't-eco-espera', 'texto': ADECUADO, 'opciones': []})
    return pedir(cliente, 'POST', '/acciones/registro/entregar', accion('t-eco'), esperado)


def test_items_de_t_eco_publican_la_referencia_sin_opciones(cliente):
    ruta, espera = pedir(cliente, 'GET', '/actividades/t-eco/items-registro')
    assert ruta['eleccion'] == {'lista': None, 'referencia': 't-ref-rutas', 'comun': False, 'minima': 1,
                                'maxima': 1, 'ordenada': False, 'permite_otra': False, 'opciones': []}
    assert espera['eleccion'] is None
    lista = pedir(cliente, 'GET', '/actividades/t-expectativas/items-registro')[0]['eleccion']
    assert lista['lista'] == 'RUTAS_DESPUES_COLEGIO' and lista['referencia'] is None


@pytest.mark.parametrize('opciones', [
    [{'codigo': 'INSTITUTO'}],  # de la lista original, pero no elegido
    [{'codigo': 'NADA'}],
    [{'codigo': 'OTRA', 'texto': 'DATO DE PRUEBA otra nueva'}],  # por referencia no hay «otra» propia
    [{'codigo': 'UNIVERSIDAD'}, {'codigo': 'OTRA'}],  # supera la máxima
])
def test_solo_acepta_los_codigos_que_la_referencia_devuelve(cliente, opciones):
    cerrar_expectativas(cliente)
    borrador_eco(cliente, opciones, esperado=422)


@pytest.mark.parametrize('opciones', [[{'codigo': 'UNIVERSIDAD'}], [{'codigo': 'OTRA'}]])
def test_acepta_lo_elegido_incluida_la_otra_de_la_fuente(cliente, opciones):
    cerrar_expectativas(cliente)
    borrador_eco(cliente, opciones)
    registro = pedir(cliente, 'GET', '/cuentas/est-ana/actividades/t-eco/registro')
    assert registro['respuestas'][0]['opciones_elegidas'] == opciones


def test_entrega_exige_la_minima_por_referencia(cliente):
    cerrar_expectativas(cliente)
    borrador_eco(cliente, [])
    pedir(cliente, 'POST', '/acciones/registro/guardar-borrador',
          {**accion('t-eco'), 'item': 't-eco-espera', 'texto': ADECUADO, 'opciones': []})
    pedir(cliente, 'POST', '/acciones/registro/entregar', accion('t-eco'), 422)


def test_el_evaluador_recibe_los_textos_elegidos_y_ninguna_cita(cliente, aplicacion):
    cerrar_expectativas(cliente)
    falso = evaluador(aplicacion)
    antes = len(falso.contextos)
    entregar_eco(cliente, [{'codigo': 'OTRA'}], texto='DATO DE PRUEBA eco [vaga]')
    pedir(cliente, 'POST', '/acciones/registro/responder-seguimiento',
          {**accion('t-eco'), 'item': 't-eco-ruta', 'texto': ADECUADO})
    entrega, seguimiento = falso.contextos[antes:]
    item, = entrega.items  # t-eco-espera no tiene criterios: no va al LLM
    assert item.opciones_elegidas == (OTRA['texto'],)
    assert seguimiento.opciones_elegidas == (OTRA['texto'],)
    assert 'frase-solo-de-expectativas' not in str(falso.contextos[antes:])


def test_entregar_t_eco_adecuado_no_abre_la_mision_adicional(cliente):
    cerrar_expectativas(cliente)
    assert actividades(cliente)['t-adicional'] == 'BLOQUEADA'
    entrega = entregar_eco(cliente, [{'codigo': 'UNIVERSIDAD'}])
    assert ('REGISTRO_ADECUADO', 't-eco') in [(e['tipo'], e['referencia']) for e in entrega['eventos_registrados']]
    assert actividades(cliente)['t-adicional'] == 'BLOQUEADA'
