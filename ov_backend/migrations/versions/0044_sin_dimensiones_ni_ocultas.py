"""sin actividad_dimension ni ocupacion.en_catalogo: los casos ya no tienen tipos RIASEC y solo se cargan las
ocupaciones del catálogo, con el O*NET como código (ajuste carga-casos). Cambian los códigos de ocupación: una base
cargada antes se vuelve a cargar con `datos.cargar <conjunto> --vaciar`. Al bajar, la tabla vuelve vacía.

Revisión: 0044
Revisión anterior: 0043
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0044'
down_revision: Union[str, Sequence[str], None] = '0043'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table('actividad_dimension')
    with op.batch_alter_table('ocupacion', schema=None) as batch_op:
        batch_op.drop_column('en_catalogo')



def downgrade() -> None:
    with op.batch_alter_table('ocupacion', schema=None) as batch_op:
        batch_op.add_column(sa.Column('en_catalogo', sa.BOOLEAN(), server_default=sa.true(), nullable=False))

    op.create_table('actividad_dimension',
    sa.Column('actividad_id', sa.INTEGER(), nullable=False),
    sa.Column('dimension_id', sa.INTEGER(), nullable=False),
    sa.ForeignKeyConstraint(['actividad_id'], ['actividad.id'], name=op.f('fk_actividad_dimension_actividad_id_actividad')),
    sa.ForeignKeyConstraint(['dimension_id'], ['dimension.id'], name=op.f('fk_actividad_dimension_dimension_id_dimension')),
    sa.PrimaryKeyConstraint('actividad_id', 'dimension_id', name=op.f('pk_actividad_dimension'))
    )
