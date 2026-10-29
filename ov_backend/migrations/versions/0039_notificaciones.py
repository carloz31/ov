"""notificaciones: lo que la campana lista, con su visto (ajuste notificaciones)

Revisión: 0039
Revisión anterior: 0038
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa


revision: str = '0039'
down_revision: Union[str, Sequence[str], None] = '0038'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('notificacion',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('codigo', sa.String(), nullable=False),
    sa.Column('cuenta_id', sa.Integer(), nullable=False),
    sa.Column('tipo', sa.Enum('DESBLOQUEO', 'RESPUESTA_CONVERSACION', 'ENTREVISTA_DESTACADA', 'ENTREVISTA_LEYENDA', 'REACCION_ENTREVISTA', name='tiponotificacion', native_enum=False, create_constraint=True), nullable=False),
    sa.Column('referencia', sa.String(), nullable=False),
    sa.Column('nombre', sa.String(), nullable=False),
    sa.Column('detalle', sa.String(), nullable=True),
    sa.Column('creada_en', sa.DateTime(), nullable=False),
    sa.Column('vista_en', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['cuenta_id'], ['cuenta.id'], name=op.f('fk_notificacion_cuenta_id_cuenta')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_notificacion')),
    sa.UniqueConstraint('codigo', name=op.f('uq_notificacion_codigo'))
    )
    with op.batch_alter_table('notificacion', schema=None) as batch_op:
        batch_op.create_index('notificacion_cuenta_vista', ['cuenta_id', 'vista_en'], unique=False)



def downgrade() -> None:
    # Las notificaciones son estado de las cuentas: no se pierden al bajar.
    if not context.is_offline_mode():
        notificacion = sa.table('notificacion', sa.column('id', sa.Integer()))
        if op.get_bind().execute(sa.select(notificacion.c.id).limit(1)).first():
            raise RuntimeError('No se puede volver a 0038: existen notificaciones.')
    with op.batch_alter_table('notificacion', schema=None) as batch_op:
        batch_op.drop_index('notificacion_cuenta_vista')

    op.drop_table('notificacion')
