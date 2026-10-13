"""prioritarios del salón: registros prioritarios y configuración de cuestionarios

Revisión: 0011
Revisión anterior: 0010
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0011'
down_revision: Union[str, Sequence[str], None] = '0010'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('salon_instrumento',
    sa.Column('salon_id', sa.Integer(), nullable=False),
    sa.Column('instrumento_id', sa.Integer(), nullable=False),
    sa.Column('es_prioritario', sa.Boolean(), server_default=sa.false(), nullable=False),
    sa.Column('visible_apoderado', sa.Boolean(), server_default=sa.false(), nullable=False),
    sa.ForeignKeyConstraint(['instrumento_id'], ['instrumento.id'], name=op.f('fk_salon_instrumento_instrumento_id_instrumento')),
    sa.ForeignKeyConstraint(['salon_id'], ['salon.id'], name=op.f('fk_salon_instrumento_salon_id_salon')),
    sa.PrimaryKeyConstraint('salon_id', 'instrumento_id', name=op.f('pk_salon_instrumento'))
    )
    op.create_table('salon_actividad_prioritaria',
    sa.Column('salon_id', sa.Integer(), nullable=False),
    sa.Column('actividad_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['actividad_id'], ['actividad.id'], name=op.f('fk_salon_actividad_prioritaria_actividad_id_actividad')),
    sa.ForeignKeyConstraint(['salon_id'], ['salon.id'], name=op.f('fk_salon_actividad_prioritaria_salon_id_salon')),
    sa.PrimaryKeyConstraint('salon_id', 'actividad_id', name=op.f('pk_salon_actividad_prioritaria'))
    )


def downgrade() -> None:
    op.drop_table('salon_actividad_prioritaria')
    op.drop_table('salon_instrumento')
