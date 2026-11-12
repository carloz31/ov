"""Ajuste llm-sugerencias · F1: `salida_json` y `esquema_estricto`, compartidos por el guion y los pasos del plan."""

import pytest
from pydantic import BaseModel

from app.services.registro.llm import (ClienteFalso, LlamadaFallida, RespuestaCruda, SalidaInvalida, esquema_estricto,
                                       salida_json)


class Interna(BaseModel):
    texto: str | None


class Externa(BaseModel):
    nombre: str
    internas: list[Interna]


def test_esquema_estricto_cierra_todo_objeto():
    esquema = esquema_estricto(Externa)
    assert esquema['additionalProperties'] is False
    assert esquema['$defs']['Interna']['additionalProperties'] is False


def test_devuelve_la_salida_validada_y_la_respuesta_cruda():
    cliente = ClienteFalso(['{"nombre": "a", "internas": [{"texto": null}]}'])
    salida, cruda = salida_json(cliente, 'sistema', 'mensaje', Externa)
    assert salida == Externa(nombre='a', internas=[Interna(texto=None)]) and cruda.parada == 'end_turn'
    [(sistema, mensaje, esquema)] = cliente.llamadas
    assert (sistema, mensaje, esquema) == ('sistema', 'mensaje', esquema_estricto(Externa))


@pytest.mark.parametrize(('respuesta', 'causa'), (
    (RespuestaCruda(texto='', parada='refusal'), 'rechazo'),
    (RespuestaCruda(texto='{"nombre"', parada='max_tokens'), 'tope_tokens'),
    (RespuestaCruda(texto='', parada='pause_turn'), 'parada:pause_turn'),
    ('{"nombre": ', 'json_invalido'),
    ('{"nombre": "a", "internas": [], "otra": 1}', None),
    ('{"nombre": 3, "internas": []}', 'fuera_de_esquema'),
))
def test_parada_o_salida_invalida(respuesta, causa):
    cliente = ClienteFalso([respuesta])
    if causa is None:  # Pydantic ignora las propiedades de más; el esquema estricto las evita en el modelo real.
        salida_json(cliente, 's', 'm', Externa)
        return
    with pytest.raises(SalidaInvalida) as error:
        salida_json(cliente, 's', 'm', Externa)
    assert error.value.causa == causa


@pytest.mark.parametrize('excepcion', (LlamadaFallida('error', 'APIError'), TimeoutError('x')))
def test_un_fallo_de_la_llamada_es_llamada_fallida(excepcion):
    with pytest.raises(LlamadaFallida):
        salida_json(ClienteFalso([excepcion]), 's', 'm', Externa)
