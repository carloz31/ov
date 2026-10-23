"""quién cuenta cada testimonio: persona, ocupación, años de experiencia y cita (ajustes Central de casos)

Revisión: 0025
Revisión anterior: 0024
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0025'
down_revision: Union[str, Sequence[str], None] = '0024'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Las columnas admiten nulos: los testimonios existentes quedan sin persona hasta recargar los datos.
    with op.batch_alter_table('testimonio', schema=None) as batch_op:
        batch_op.add_column(sa.Column('persona', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('ocupacion_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('anios_experiencia', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('cita', sa.Text(), nullable=True))
        batch_op.create_foreign_key(op.f('fk_testimonio_ocupacion_id_ocupacion'), 'ocupacion',
                                    ['ocupacion_id'], ['id'])


def downgrade() -> None:
    with op.batch_alter_table('testimonio', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('fk_testimonio_ocupacion_id_ocupacion'), type_='foreignkey')
        batch_op.drop_column('cita')
        batch_op.drop_column('anios_experiencia')
        batch_op.drop_column('ocupacion_id')
        batch_op.drop_column('persona')
