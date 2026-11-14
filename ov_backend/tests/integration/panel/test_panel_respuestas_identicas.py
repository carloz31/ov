"""Auditoría del panel (H1): la pestaña Respuestas lee el contexto de hoy de cada ítem una vez por petición
(`LecturaContexto`) en lugar de `resolver_contexto` por ítem. `respuestas` y cada `respuestas/{actividad}` de los ocho
estudiantes de ejemplo deben salir idénticas a las de la implementación anterior, guardadas en
`respuestas_ejemplo.json` (generadas con `soporte_panel.respuestas_de_ejemplo` antes del cambio)."""

import json
from pathlib import Path

from soporte_acceso import ClienteConToken
from soporte_panel import AHORA_EJEMPLO, respuestas_de_ejemplo, sembrar_ejemplo

ESPERADAS = Path(__file__).with_name('respuestas_ejemplo.json')


def test_respuestas_de_los_estudiantes_de_ejemplo_salen_identicas(aplicacion_contenido):
    esperadas = json.loads(ESPERADAS.read_text(encoding='utf-8'))
    assert esperadas['ahora'] == AHORA_EJEMPLO.isoformat()
    sembrar_ejemplo(aplicacion_contenido)
    with ClienteConToken(aplicacion_contenido) as cliente:
        leidas = respuestas_de_ejemplo(cliente)
    leidas = json.loads(json.dumps(leidas))
    for estudiante, datos in esperadas['estudiantes'].items():
        assert leidas[estudiante]['respuestas'] == datos['respuestas'], estudiante
        distintos = [a for a, registro in datos['registros'].items() if leidas[estudiante]['registros'].get(a) != registro]
        assert not distintos, f'{estudiante}: {distintos}'
    assert leidas.keys() == esperadas['estudiantes'].keys()
