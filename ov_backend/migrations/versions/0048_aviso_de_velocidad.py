"""aviso de velocidad: umbral por instrumento, tiempo por respuesta y ritmo por intento

Las bases ya cargadas toman los valores de `datos/fijos.py`: 1200 por defecto y 800 en las escalas de 2 opciones.

Revisión: 0048
Revisión anterior: 0047
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0048'
down_revision: Union[str, Sequence[str], None] = '0047'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('ritmo_aplicacion',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('cuenta_id', sa.Integer(), nullable=False),
    sa.Column('aplicacion_id', sa.Integer(), nullable=False),
    sa.Column('racha_rapida', sa.Integer(), nullable=False),
    sa.Column('items_desde_aviso', sa.Integer(), nullable=False),
    sa.Column('avisos_velocidad', sa.Integer(), nullable=False),
    sa.Column('actualizado_en', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['aplicacion_id'], ['aplicacion.id'], name=op.f('fk_ritmo_aplicacion_aplicacion_id_aplicacion')),
    sa.ForeignKeyConstraint(['cuenta_id'], ['cuenta.id'], name=op.f('fk_ritmo_aplicacion_cuenta_id_cuenta')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_ritmo_aplicacion')),
    sa.UniqueConstraint('cuenta_id', 'aplicacion_id', name=op.f('uq_ritmo_aplicacion_cuenta_id'))
    )
    with op.batch_alter_table('instrumento', schema=None) as batch_op:
        batch_op.add_column(sa.Column('ms_por_palabra', sa.Integer(), server_default=sa.text('150'), nullable=False))
        batch_op.add_column(sa.Column('ms_respuesta', sa.Integer(), server_default=sa.text('1200'), nullable=False))
        batch_op.add_column(sa.Column('racha_aviso', sa.Integer(), server_default=sa.text('4'), nullable=False))

    with op.batch_alter_table('respuesta_item', schema=None) as batch_op:
        batch_op.add_column(sa.Column('tiempo_ms', sa.Integer(), nullable=True))

    op.execute("""
        UPDATE instrumento SET ms_respuesta = 800 WHERE id IN (
            SELECT item.instrumento_id FROM item_instrumento AS item
            JOIN opcion_escala AS opcion ON opcion.escala_id = item.escala_id
            GROUP BY item.instrumento_id HAVING COUNT(DISTINCT opcion.id) = 2
        )
    """)


def downgrade() -> None:
    with op.batch_alter_table('respuesta_item', schema=None) as batch_op:
        batch_op.drop_column('tiempo_ms')

    with op.batch_alter_table('instrumento', schema=None) as batch_op:
        batch_op.drop_column('racha_aviso')
        batch_op.drop_column('ms_respuesta')
        batch_op.drop_column('ms_por_palabra')

    op.drop_table('ritmo_aplicacion')
