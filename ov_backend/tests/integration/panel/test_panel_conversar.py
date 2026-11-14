"""Ajuste panel-salon §3.1: el grupo «Conversar pronto» con sus dos alertas. «Escribió algo que conviene leer» sale
del flujo real de un registro (`contenido`, b1-1) cuando Lumi deriva la respuesta a la orientadora."""

from soporte_contenido import REQUERIDAS, avanzar
from soporte_llm import salida
from soporte_panel import alerta, fijar_ahora, panel, senales, ver
from soporte_ruta import responder_item

TEXTO = 'DATO DE PRUEBA: últimamente me siento muy mal y no sé con quién hablar.'


def test_una_respuesta_sensible_del_registro_aparece_en_conversar_pronto(aplicacion_contenido, cliente_contenido):
    fijar_ahora(aplicacion_contenido)
    assert alerta(panel(cliente_contenido), 'respuesta-sensible') is None
    avanzar(cliente_contenido, REQUERIDAS[0], REQUERIDAS[REQUERIDAS.index('b1-1') - 1])
    aplicacion_contenido.state.cliente_llm.encolar(salida('emocional', sensible=True))
    responder_item(cliente_contenido, 'b1-1', 'b1-1-gustos', [], TEXTO)
    datos = panel(cliente_contenido)
    conversar = datos['avisos']['grupos'][0]
    assert (conversar['codigo'], conversar['nombre']) == ('conversar', 'Conversar pronto')
    assert conversar['alertas'] == [{
        'codigo': 'respuesta-sensible', 'nombre': 'Escribió algo que conviene leer',
        'descripcion': 'En un registro, Lumi lo derivó a la orientadora en lugar de seguir preguntando.',
        'cantidad': 1, 'nombres': ['Ana']}]
    assert ver(cliente_contenido, 'alerta', 'respuesta-sensible') == ['est-ana']
    # Nunca lleva el texto del registro.
    assert 'me siento muy mal' not in str(datos)


def test_conversar_pronto_con_sus_dos_alertas_antes_que_quedando_atras(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    senales(sesion, 'est-luis', 2, 1, 2)
    sesion.commit()
    grupos = panel(cliente)['avisos']['grupos']
    assert [g['codigo'] for g in grupos] == ['conversar', 'atras']
    assert [(a['codigo'], a['nombres']) for a in grupos[0]['alertas']] == [('seguridad-baja', ['Luis'])]
