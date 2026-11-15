"""Auditoría plataforma (R1): al responder, el contexto del ítem guardado se resuelve una sola vez; la respuesta reusa
el del guardado y resuelve los demás ítems. DATO DE PRUEBA."""

from collections import Counter

from app.services.registro import consultas, flujo
from soporte_ruta import avanzar, eleccion_minima, item_de, leer_registro, responder_item


def test_responder_resuelve_una_vez_el_contexto_de_cada_item(cliente, monkeypatch):
    avanzar(cliente, 't-cierre-inicio')
    registro = leer_registro(cliente, 't-expectativas')
    assert len(registro['items']) > 1
    llamadas = Counter()
    for modulo in (flujo, consultas):
        original = modulo.resolver_contexto

        def contar(sesion, cuenta, codigo, _original=original):
            llamadas[codigo] += 1
            return _original(sesion, cuenta, codigo)
        monkeypatch.setattr(modulo, 'resolver_contexto', contar)
    item = item_de(registro, registro['item_actual'])
    paso = responder_item(cliente, 't-expectativas', item['codigo'], eleccion_minima(item))
    assert set(llamadas) == {i['codigo'] for i in registro['items']}
    assert set(llamadas.values()) == {1}
    assert item_de(paso['registro'], item['codigo'])['respuesta'] is not None
