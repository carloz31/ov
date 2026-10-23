"""espacio LUMI (recuerdos de Lumi) y conteo de eventos con tope diario (ajuste del diario de F05)

Revisión: 0027
Revisión anterior: 0026
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa


revision: str = '0027'
down_revision: Union[str, Sequence[str], None] = '0026'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ESPACIOS = ('MISIONES_CAMPO', 'CIUDAD', 'PORTAL_FAMILIA')
CONTEOS = ('EVENTOS', 'REFERENCIAS_DISTINTAS', 'DIAS_DISTINTOS')


def _valores(valores):
    return ', '.join(f"'{valor}'" for valor in valores)


def _cambiar_checks(espacios, conteos) -> None:
    # --autogenerate no detecta el cambio del CHECK de un enumerado no nativo (como en 0003).
    with op.batch_alter_table('bloque', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_bloque_espacio'), type_='check')
        batch_op.create_check_constraint(op.f('ck_bloque_espacio'), f"espacio IN ({_valores(espacios)})")
    with op.batch_alter_table('condicion_desbloqueo', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_condicion_desbloqueo_tipoconteo'), type_='check')
        batch_op.create_check_constraint(
            op.f('ck_condicion_desbloqueo_tipoconteo'), f"tipo_conteo IN ({_valores(conteos)})")


def upgrade() -> None:
    _cambiar_checks((*ESPACIOS, 'LUMI'), (*CONTEOS, 'EVENTOS_TOPE_DIARIO'))


def downgrade() -> None:
    # Evita iniciar una reconstrucción que dejaría una tabla temporal en SQLite.
    if not context.is_offline_mode():
        bloque = sa.table('bloque', sa.column('espacio', sa.String()))
        condicion = sa.table('condicion_desbloqueo', sa.column('tipo_conteo', sa.String()))
        enlace = op.get_bind()
        if (enlace.execute(sa.select(bloque.c.espacio).where(bloque.c.espacio == 'LUMI').limit(1)).first()
                or enlace.execute(sa.select(condicion.c.tipo_conteo).where(
                    condicion.c.tipo_conteo == 'EVENTOS_TOPE_DIARIO').limit(1)).first()):
            raise RuntimeError('No se puede volver a 0026: existen bloques LUMI o condiciones con tope diario.')
    _cambiar_checks(ESPACIOS, CONTEOS)
