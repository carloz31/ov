"""referencias y elección por referencia

Revisión: 0008
Revisión anterior: 0007
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa


revision: str = '0008'
down_revision: Union[str, Sequence[str], None] = '0007'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ELECCION_VALIDA_0005 = (
    "(lista_id IS NULL AND eleccion_minima IS NULL AND eleccion_maxima IS NULL"
    " AND eleccion_ordenada = false AND permite_otra = false)"
    " OR (lista_id IS NOT NULL AND eleccion_minima >= 0 AND eleccion_maxima >= 1"
    " AND eleccion_maxima >= eleccion_minima)"
)
# La elección sale de una lista o de una referencia ELECCION, nunca de las dos; por referencia no hay «otra».
ELECCION_VALIDA = (
    "(lista_id IS NULL AND referencia_id IS NULL AND eleccion_minima IS NULL"
    " AND eleccion_maxima IS NULL AND eleccion_ordenada = false AND permite_otra = false)"
    " OR ((lista_id IS NULL) <> (referencia_id IS NULL) AND eleccion_minima >= 0"
    " AND eleccion_maxima >= 1 AND eleccion_maxima >= eleccion_minima"
    " AND (referencia_id IS NULL OR permite_otra = false))"
)


def upgrade() -> None:
    op.create_table('referencia',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('codigo', sa.String(), nullable=False),
    sa.Column('tipo', sa.Enum('ELECCION', 'TEXTO', name='tiporeferencia', native_enum=False, create_constraint=True), nullable=False),
    sa.Column('actividad_id', sa.Integer(), nullable=True),
    sa.Column('pregunta_diario_id', sa.Integer(), nullable=True),
    sa.Column('item_registro_id', sa.Integer(), nullable=True),
    sa.CheckConstraint("tipo NOT IN ('ELECCION', 'TEXTO') OR item_registro_id IS NOT NULL", name=op.f('ck_referencia_fuente_registro')),
    sa.CheckConstraint('(actividad_id IS NULL) <> (pregunta_diario_id IS NULL)', name=op.f('ck_referencia_un_dueno')),
    sa.ForeignKeyConstraint(['actividad_id'], ['actividad.id'], name=op.f('fk_referencia_actividad_id_actividad')),
    sa.ForeignKeyConstraint(['item_registro_id'], ['item_registro.id'], name=op.f('fk_referencia_item_registro_id_item_registro')),
    sa.ForeignKeyConstraint(['pregunta_diario_id'], ['pregunta_diario.id'], name=op.f('fk_referencia_pregunta_diario_id_pregunta_diario')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_referencia')),
    sa.UniqueConstraint('codigo', name=op.f('uq_referencia_codigo'))
    )
    with op.batch_alter_table('item_registro', schema=None) as batch_op:
        batch_op.add_column(sa.Column('referencia_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_item_registro_referencia_id_referencia', 'referencia', ['referencia_id'], ['id'])
        batch_op.drop_constraint(op.f('ck_item_registro_eleccion_valida'), type_='check')
        batch_op.create_check_constraint(op.f('ck_item_registro_eleccion_valida'), ELECCION_VALIDA)


def downgrade() -> None:
    if not context.is_offline_mode():
        if op.get_bind().execute(sa.text('SELECT 1 FROM item_registro WHERE referencia_id IS NOT NULL')).first():
            raise RuntimeError('No se puede volver a 0007: hay ítems con elección por referencia.')
    with op.batch_alter_table('item_registro', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_item_registro_eleccion_valida'), type_='check')
        batch_op.create_check_constraint(op.f('ck_item_registro_eleccion_valida'), ELECCION_VALIDA_0005)
        batch_op.drop_constraint('fk_item_registro_referencia_id_referencia', type_='foreignkey')
        batch_op.drop_column('referencia_id')

    op.drop_table('referencia')
