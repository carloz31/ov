"""presentaciones de primera visita y las que cada cuenta ya cerró (ajuste presentaciones-vistas, F1)

Revisión: 0030
Revisión anterior: 0029
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa


revision: str = '0030'
down_revision: Union[str, Sequence[str], None] = '0029'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # El catálogo (los 18 códigos de `datos/fijos.py`) lo llena el conjunto de datos al recargarse, como el resto de `fijos`.
    op.create_table('presentacion',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('codigo', sa.String(), nullable=False),
    sa.Column('audiencia', sa.Enum('ESTUDIANTE', 'APODERADO', name='audiencia', native_enum=False, create_constraint=True), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_presentacion')),
    sa.UniqueConstraint('codigo', name=op.f('uq_presentacion_codigo'))
    )
    op.create_table('presentacion_vista',
    sa.Column('cuenta_id', sa.Integer(), nullable=False),
    sa.Column('presentacion_id', sa.Integer(), nullable=False),
    sa.Column('vista_en', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['cuenta_id'], ['cuenta.id'], name=op.f('fk_presentacion_vista_cuenta_id_cuenta')),
    sa.ForeignKeyConstraint(['presentacion_id'], ['presentacion.id'], name=op.f('fk_presentacion_vista_presentacion_id_presentacion')),
    sa.PrimaryKeyConstraint('cuenta_id', 'presentacion_id', name=op.f('pk_presentacion_vista'))
    )


def downgrade() -> None:
    # Bajar perdería lo que cada cuenta ya vio: se detiene si hay presentaciones vistas (como 0028).
    if not context.is_offline_mode() and op.get_bind().execute(sa.text('SELECT 1 FROM presentacion_vista')).first():
        raise RuntimeError('No se puede bajar 0030: existen presentaciones vistas')
    op.drop_table('presentacion_vista')
    op.drop_table('presentacion')
