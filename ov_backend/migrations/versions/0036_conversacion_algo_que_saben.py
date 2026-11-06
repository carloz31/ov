"""conversación con «Algo que ya saben»: texto opcional que acompaña la guía (F08)

Revisión: 0036
Revisión anterior: 0035
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0036'
down_revision: Union[str, Sequence[str], None] = '0035'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('conversacion', schema=None) as batch_op:
        batch_op.add_column(sa.Column('algo_que_saben', sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('conversacion', schema=None) as batch_op:
        batch_op.drop_column('algo_que_saben')
