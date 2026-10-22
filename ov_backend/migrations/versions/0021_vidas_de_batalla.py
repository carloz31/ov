"""vidas del enemigo y destellos de cada batalla: el servidor decide la victoria (F04c)

Revisión: 0021
Revisión anterior: 0020
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa


revision: str = '0021'
down_revision: Union[str, Sequence[str], None] = '0020'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('actividad', schema=None) as batch_op:
        batch_op.add_column(sa.Column('vidas_enemigo', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('destellos', sa.Integer(), nullable=True))
    # Las batallas ya cargadas quedan con una vida y un destello hasta recargar los datos.
    op.execute("UPDATE actividad SET vidas_enemigo = 1, destellos = 1 WHERE tipo = 'BATALLA'")
    with op.batch_alter_table('actividad', schema=None) as batch_op:
        batch_op.create_check_constraint(
            op.f('ck_actividad_vidas_solo_batalla'),
            "(tipo = 'BATALLA' AND vidas_enemigo >= 1 AND destellos >= 1) OR "
            "(tipo != 'BATALLA' AND vidas_enemigo IS NULL AND destellos IS NULL)")


def downgrade() -> None:
    # La configuración de las batallas no cabe en 0020: se detiene antes de perderla.
    if not context.is_offline_mode() and op.get_bind().execute(sa.text(
            "SELECT 1 FROM actividad WHERE tipo = 'BATALLA' AND (vidas_enemigo != 1 OR destellos != 1)")).first():
        raise RuntimeError('No se puede volver a 0020: hay batallas con vidas o destellos configurados.')
    with op.batch_alter_table('actividad', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_actividad_vidas_solo_batalla'), type_='check')
        batch_op.drop_column('destellos')
        batch_op.drop_column('vidas_enemigo')
