"""planes inactivos: eliminar un plan lo desactiva y conserva lo suyo para recuperarlo (ajuste F07b)

Revisión: 0035
Revisión anterior: 0034
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa


revision: str = '0035'
down_revision: Union[str, Sequence[str], None] = '0034'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('tarjeta_carrera', schema=None) as batch_op:
        batch_op.add_column(sa.Column('activa', sa.Boolean(), server_default=sa.true(), nullable=False))
        batch_op.alter_column('prioridad', existing_type=sa.INTEGER(), nullable=True)
        batch_op.create_check_constraint(
            op.f('ck_tarjeta_carrera_prioridad_si_activa'),
            '(activa AND prioridad IS NOT NULL) OR (NOT activa AND prioridad IS NULL)')


def downgrade() -> None:
    # Bajar borraría los planes eliminados que se pueden recuperar: se detiene si hay alguno.
    if not context.is_offline_mode() and op.get_bind().execute(
            sa.text('SELECT 1 FROM tarjeta_carrera WHERE NOT activa')).first():
        raise RuntimeError('No se puede bajar 0035: hay planes inactivos')
    with op.batch_alter_table('tarjeta_carrera', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_tarjeta_carrera_prioridad_si_activa'), type_='check')
        batch_op.alter_column('prioridad', existing_type=sa.INTEGER(), nullable=False)
        batch_op.drop_column('activa')
