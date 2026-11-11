"""registros llm (lote 3): sin mínimo de caracteres, sin eco cambiado guardado ni posición del registro

Ajuste registros llm (lote 3). Sale `item_registro.min_caracteres` con su CHECK (no hay mínimo: solo que la respuesta
no esté vacía); sale `respuesta_registro.eco_cambiado` (se calcula al leer) y `progreso_actividad.posicion` (solo la
escribía el borrador, que ya no existe).

Revisión: 0051
Revisión anterior: 0050
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0051'
down_revision: Union[str, Sequence[str], None] = '0050'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('item_registro', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_item_registro_min_caracteres_valido'), type_='check')
        batch_op.drop_column('min_caracteres')

    with op.batch_alter_table('progreso_actividad', schema=None) as batch_op:
        batch_op.drop_column('posicion')

    with op.batch_alter_table('respuesta_registro', schema=None) as batch_op:
        batch_op.drop_column('eco_cambiado')


def downgrade() -> None:
    with op.batch_alter_table('respuesta_registro', schema=None) as batch_op:
        batch_op.add_column(sa.Column('eco_cambiado', sa.Boolean(), server_default=sa.false(), nullable=False))

    with op.batch_alter_table('progreso_actividad', schema=None) as batch_op:
        batch_op.add_column(sa.Column('posicion', sa.Text(), nullable=True))

    with op.batch_alter_table('item_registro', schema=None) as batch_op:
        batch_op.add_column(sa.Column('min_caracteres', sa.Integer(), nullable=True))
        batch_op.create_check_constraint(op.f('ck_item_registro_min_caracteres_valido'), 'min_caracteres IS NULL OR min_caracteres >= 1')
