"""conversación con tema: el chip de su tarjeta, en lugar del bloque que se calculaba de su regla (F08)

Revisión: 0037
Revisión anterior: 0036
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0037'
down_revision: Union[str, Sequence[str], None] = '0036'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('conversacion', schema=None) as batch_op:
        batch_op.add_column(sa.Column('tema', sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('conversacion', schema=None) as batch_op:
        batch_op.drop_column('tema')
