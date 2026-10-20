"""acceso: intentos fallidos y bloqueo temporal de la cuenta (B17)

Revisión: 0019
Revisión anterior: 0018
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0019'
down_revision: Union[str, Sequence[str], None] = '0018'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Filas existentes: sin intentos fallidos ni bloqueo.
    with op.batch_alter_table('cuenta', schema=None) as batch_op:
        batch_op.add_column(sa.Column('intentos_fallidos', sa.Integer(), server_default=sa.text('0'), nullable=False))
        batch_op.add_column(sa.Column('bloqueada_hasta', sa.DateTime(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('cuenta', schema=None) as batch_op:
        batch_op.drop_column('bloqueada_hasta')
        batch_op.drop_column('intentos_fallidos')

