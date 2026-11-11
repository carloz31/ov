"""llm-sugerencias (guion): campo y motivo de la sugerencia, y la pregunta del guion sin origen DUDA

Ajuste llm-sugerencias, F2. `sugerencia_guion` suma `campo` (DIA, NECESITA, DUDA: de qué parte de «lo que pienso» sale)
y `motivo` (lo que dio el LLM); las filas existentes se borran porque no tienen cómo llenarse (no hay datos reales) y
las investigaciones vuelven a pedir sugerencias. `pregunta_guion.origen` pierde DUDA: la duda ya no entra directo al
guion; las filas DUDA pasan a PROPIA (era una pregunta del estudiante).

Revisión: 0053
Revisión anterior: 0052
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0053'
down_revision: Union[str, Sequence[str], None] = '0052'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _origen(valores):
    # --autogenerate no detecta el cambio del CHECK de un enumerado no nativo (como en 0050).
    with op.batch_alter_table('pregunta_guion', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_pregunta_guion_origenpreguntaguion'), type_='check')
        batch_op.create_check_constraint(op.f('ck_pregunta_guion_origenpreguntaguion'),
                                         'origen IN (' + ', '.join(f"'{v}'" for v in valores) + ')')


def upgrade() -> None:
    op.execute("DELETE FROM sugerencia_guion")
    op.execute("UPDATE investigacion SET sugerencias_vigentes = false")
    with op.batch_alter_table('sugerencia_guion', schema=None) as batch_op:
        batch_op.add_column(sa.Column('campo', sa.Enum('DIA', 'NECESITA', 'DUDA', name='campoloquepienso',
                                                       native_enum=False, create_constraint=True), nullable=False))
        batch_op.add_column(sa.Column('motivo', sa.Text(), nullable=False))
    op.execute("UPDATE pregunta_guion SET origen = 'PROPIA' WHERE origen = 'DUDA'")
    _origen(('SUGERIDA', 'PROPIA'))


def downgrade() -> None:
    _origen(('DUDA', 'SUGERIDA', 'PROPIA'))
    with op.batch_alter_table('sugerencia_guion', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_sugerencia_guion_campoloquepienso'), type_='check')
        batch_op.drop_column('motivo')
        batch_op.drop_column('campo')
