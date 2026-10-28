"""monto de referencia opcional en referencia_rubro (ajuste F07b: Matrícula y Pensión se consultan en la institución)

Revisión: 0034
Revisión anterior: 0033
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa


revision: str = '0034'
down_revision: Union[str, Sequence[str], None] = '0033'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('referencia_rubro', schema=None) as batch_op:
        batch_op.alter_column('monto_referencia', existing_type=sa.INTEGER(), nullable=True)


def downgrade() -> None:
    # Bajar obligaría a inventar montos de referencia: se detiene si algún rubro no lo tiene.
    if not context.is_offline_mode() and op.get_bind().execute(
            sa.text('SELECT 1 FROM referencia_rubro WHERE monto_referencia IS NULL')).first():
        raise RuntimeError('No se puede bajar 0034: hay rubros sin monto de referencia')
    with op.batch_alter_table('referencia_rubro', schema=None) as batch_op:
        batch_op.alter_column('monto_referencia', existing_type=sa.INTEGER(), nullable=False)
