"""llm-sugerencias (pasos): clase y motivo de la sugerencia, y respaldos fijos de los pasos

Ajuste llm-sugerencias, F3. `sugerencia_tarjeta` suma `clase` (la que dio el LLM a la duda o complicación) y `motivo`,
nulos en las de respaldo y en las filas existentes. Nueva tabla de catálogo `respaldo_paso`: el paso fijo de cada
duda o complicación de lista (opción de PREGUNTAS_CONOCIMIENTO, DUDAS_SUGERIDAS o DIFICULTADES), que llena la carga
de `datos/fijos.py` como el resto del catálogo.

Revisión: 0055
Revisión anterior: 0054
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0055'
down_revision: Union[str, Sequence[str], None] = '0054'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'respaldo_paso',
        sa.Column('opcion_id', sa.Integer(), nullable=False),
        sa.Column('tipo_opcion_id', sa.Integer(), nullable=False),
        sa.Column('texto', sa.Text(), nullable=False),
        sa.Column('texto_sin_institucion', sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(['opcion_id'], ['opcion_lista.id'], name=op.f('fk_respaldo_paso_opcion_id_opcion_lista')),
        sa.ForeignKeyConstraint(['tipo_opcion_id'], ['opcion_lista.id'],
                                name=op.f('fk_respaldo_paso_tipo_opcion_id_opcion_lista')),
        sa.PrimaryKeyConstraint('opcion_id', name=op.f('pk_respaldo_paso')),
    )
    with op.batch_alter_table('sugerencia_tarjeta', schema=None) as batch_op:
        batch_op.add_column(sa.Column('clase', sa.Enum('DATO', 'EXPERIENCIA', 'SOBRE_MI', 'LO_QUE_DICEN', 'LISTA',
                                                       'NO_APLICA', name='clasenovedadplan', native_enum=False,
                                                       create_constraint=True), nullable=True))
        batch_op.add_column(sa.Column('motivo', sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('sugerencia_tarjeta', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_sugerencia_tarjeta_clasenovedadplan'), type_='check')
        batch_op.drop_column('motivo')
        batch_op.drop_column('clase')
    op.drop_table('respaldo_paso')
