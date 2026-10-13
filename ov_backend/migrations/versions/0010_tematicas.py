"""temáticas, temáticas por actividad y temática de cada dimensión

Revisión: 0010
Revisión anterior: 0009
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0010'
down_revision: Union[str, Sequence[str], None] = '0009'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('tematica',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('codigo', sa.String(), nullable=False),
    sa.Column('nombre', sa.String(), nullable=False),
    sa.Column('descripcion', sa.Text(), nullable=False),
    sa.Column('orden', sa.Integer(), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_tematica')),
    sa.UniqueConstraint('codigo', name=op.f('uq_tematica_codigo'))
    )
    op.create_table('actividad_tematica',
    sa.Column('actividad_id', sa.Integer(), nullable=False),
    sa.Column('tematica_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['actividad_id'], ['actividad.id'], name=op.f('fk_actividad_tematica_actividad_id_actividad')),
    sa.ForeignKeyConstraint(['tematica_id'], ['tematica.id'], name=op.f('fk_actividad_tematica_tematica_id_tematica')),
    sa.PrimaryKeyConstraint('actividad_id', 'tematica_id', name=op.f('pk_actividad_tematica'))
    )
    with op.batch_alter_table('dimension', schema=None) as batch_op:
        batch_op.add_column(sa.Column('tematica_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(batch_op.f('fk_dimension_tematica_id_tematica'), 'tematica', ['tematica_id'], ['id'])


def downgrade() -> None:
    with op.batch_alter_table('dimension', schema=None) as batch_op:
        batch_op.drop_constraint(batch_op.f('fk_dimension_tematica_id_tematica'), type_='foreignkey')
        batch_op.drop_column('tematica_id')

    op.drop_table('actividad_tematica')
    op.drop_table('tematica')
