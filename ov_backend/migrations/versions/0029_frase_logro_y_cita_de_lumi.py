"""frase y logro de cada insignia y cita de Lumi de cada nivel (ajuste pasaporte-perfil, F5)

Revisión: 0029
Revisión anterior: 0028
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0029'
down_revision: Union[str, Sequence[str], None] = '0028'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('insignia', schema=None) as batch_op:
        batch_op.add_column(sa.Column('frase', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('logro', sa.Text(), nullable=True))

    with op.batch_alter_table('nivel', schema=None) as batch_op:
        batch_op.add_column(sa.Column('cita_lumi', sa.Text(), nullable=True))



def downgrade() -> None:
    with op.batch_alter_table('nivel', schema=None) as batch_op:
        batch_op.drop_column('cita_lumi')

    with op.batch_alter_table('insignia', schema=None) as batch_op:
        batch_op.drop_column('logro')
        batch_op.drop_column('frase')

