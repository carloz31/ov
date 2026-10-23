"""cartas del diario archivadas y su remitente (ajuste del diario de F05)

Revisión: 0026
Revisión anterior: 0025
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0026'
down_revision: Union[str, Sequence[str], None] = '0025'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Nulables: las cartas existentes quedan pendientes y sin remitente (no se puede deducir de lo guardado).
    with op.batch_alter_table('recomendacion', schema=None) as batch_op:
        batch_op.add_column(sa.Column('archivada_en', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('actividad_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(batch_op.f('fk_recomendacion_actividad_id_actividad'), 'actividad', ['actividad_id'], ['id'])


def downgrade() -> None:
    with op.batch_alter_table('recomendacion', schema=None) as batch_op:
        batch_op.drop_constraint(batch_op.f('fk_recomendacion_actividad_id_actividad'), type_='foreignkey')
        batch_op.drop_column('actividad_id')
        batch_op.drop_column('archivada_en')

