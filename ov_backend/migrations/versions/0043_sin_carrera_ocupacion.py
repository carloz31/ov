"""sin carrera_ocupacion: la relación provisional al azar se reemplaza por ocupacion_familia; carreras y
ocupaciones se relacionan por familia (ajuste resultados-intereses). Al bajar, la tabla vuelve vacía.

Revisión: 0043
Revisión anterior: 0042
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0043'
down_revision: Union[str, Sequence[str], None] = '0042'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table('carrera_ocupacion')


def downgrade() -> None:
    op.create_table('carrera_ocupacion',
    sa.Column('carrera_id', sa.INTEGER(), nullable=False),
    sa.Column('ocupacion_id', sa.INTEGER(), nullable=False),
    sa.ForeignKeyConstraint(['carrera_id'], ['carrera.id'], name=op.f('fk_carrera_ocupacion_carrera_id_carrera')),
    sa.ForeignKeyConstraint(['ocupacion_id'], ['ocupacion.id'], name=op.f('fk_carrera_ocupacion_ocupacion_id_ocupacion')),
    sa.PrimaryKeyConstraint('carrera_id', 'ocupacion_id', name=op.f('pk_carrera_ocupacion'))
    )
