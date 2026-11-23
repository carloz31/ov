"""reglas de planes: cada sección de la tarjeta vuelve a abrirse con su actividad

Ajuste planes-desbloqueo-original. Migración solo de datos, sobre las tablas de definición (`regla_desbloqueo` y
`condicion_desbloqueo`), para la base desplegada de la prueba con usuarios (despliegue/operacion.md, paso 8). Deshace la 0061:
R-PLAN-CONOCIMIENTO, R-PLAN-REALIDAD y R-PLAN-PASOS vuelven a pedir COMPLETA_ACTIVIDAD de b3-2, b3-8 y b4-5, con su
mensaje; R-PLAN-POR_QUE sigue con b0-4. Solo actúa en una base `contenido` (existen b0-4, b3-2, b3-8 y b4-5); en
`ruta` o vacía no hace nada. Es idempotente: cada UPDATE filtra por la referencia de partida. No toca tablas de estado:
quien ya abrió una sección la conserva. No importa `datos/` ni la 0061: códigos y mensajes van aquí.

Revisión: 0062
Revisión anterior: 0061
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = '0062'
down_revision: Union[str, Sequence[str], None] = '0061'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TIPO_EVENTO = 'COMPLETA_ACTIVIDAD'
ACTIVIDAD_PLANES = 'b0-4'
MENSAJE_PLANES = 'Completa la misión «¿Tienes una opción en mente?».'
# Regla: (actividad que la abre, su mensaje), con el título de la actividad en `datos/contenido.py` (ACTIVIDADES).
REGLAS_ORIGINALES = {
    'R-PLAN-CONOCIMIENTO': ('b3-2', 'Completa la misión «Mis intereses en el catálogo».'),
    'R-PLAN-REALIDAD': ('b3-8', 'Completa la misión «Cuánto cuesta estudiar».'),
    'R-PLAN-PASOS': ('b4-5', 'Completa la misión «Pongo a prueba mi orden».'),
}


# Guarda: solo en una base `contenido`, donde existen las cuatro actividades. Va dentro de cada UPDATE (sin leer
# antes) para que la migración también se genere como SQL sin conexión (`alembic upgrade --sql`).
ACTIVIDADES = (ACTIVIDAD_PLANES, *(actividad for actividad, _ in REGLAS_ORIGINALES.values()))
GUARDA = 'AND (SELECT COUNT(*) FROM actividad WHERE codigo IN (:a0, :a1, :a2, :a3)) = 4'


def _mover(a_originales: bool) -> None:
    guarda = {f'a{i}': codigo for i, codigo in enumerate(ACTIVIDADES)}
    for regla, (actividad, mensaje) in REGLAS_ORIGINALES.items():
        desde, hacia = ACTIVIDAD_PLANES, actividad
        nuevo_mensaje, mensaje_previo = mensaje, MENSAJE_PLANES
        if not a_originales:
            desde, hacia = hacia, desde
            nuevo_mensaje, mensaje_previo = mensaje_previo, nuevo_mensaje
        op.execute(sa.text(
            'UPDATE condicion_desbloqueo SET id_referencia = (SELECT id FROM actividad WHERE codigo = :hacia) '
            'WHERE tipo_evento = :tipo '
            'AND id_referencia = (SELECT id FROM actividad WHERE codigo = :desde) '
            f'AND regla_id = (SELECT id FROM regla_desbloqueo WHERE codigo = :regla) {GUARDA}')
            .bindparams(hacia=hacia, desde=desde, tipo=TIPO_EVENTO, regla=regla, **guarda))
        op.execute(sa.text(
            'UPDATE regla_desbloqueo SET mensaje_bloqueo = :nuevo '
            f'WHERE codigo = :regla AND mensaje_bloqueo = :previo {GUARDA}')
            .bindparams(nuevo=nuevo_mensaje, previo=mensaje_previo, regla=regla, **guarda))


def upgrade() -> None:
    _mover(a_originales=True)


def downgrade() -> None:
    _mover(a_originales=False)
