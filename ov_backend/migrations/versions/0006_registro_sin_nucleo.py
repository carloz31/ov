"""registro sin núcleo y origen EXTENSION_MINIMA

Revisión: 0006
Revisión anterior: 0005
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0006'
down_revision: Union[str, Sequence[str], None] = '0005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _origen(anterior, nueva):
    # --autogenerate no detecta el CHECK de los enumerados no nativos.
    largo = max(len('LLM'), len(anterior), len(nueva))
    with op.batch_alter_table('evaluacion_respuesta', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_evaluacion_respuesta_origenevaluacion'), type_='check')
        batch_op.alter_column('origen', existing_type=sa.String(length=len(anterior)),
                              type_=sa.String(length=largo), existing_nullable=False)
    filas = sa.table('evaluacion_respuesta', sa.column('origen', sa.String()))
    op.execute(filas.update().where(filas.c.origen == anterior).values(origen=nueva))
    with op.batch_alter_table('evaluacion_respuesta', schema=None) as batch_op:
        batch_op.alter_column('origen', existing_type=sa.String(length=largo),
                              type_=sa.String(length=len(nueva)), existing_nullable=False)
        batch_op.create_check_constraint(op.f('ck_evaluacion_respuesta_origenevaluacion'),
                                         f"origen IN ('LLM', '{nueva}')")


def upgrade() -> None:
    with op.batch_alter_table('item_registro', schema=None) as batch_op:
        batch_op.drop_column('nucleo')
    _origen('RESPALDO_LONGITUD', 'EXTENSION_MINIMA')


def downgrade() -> None:
    _origen('EXTENSION_MINIMA', 'RESPALDO_LONGITUD')
    with op.batch_alter_table('item_registro', schema=None) as batch_op:
        batch_op.add_column(sa.Column('nucleo', sa.Boolean(), server_default=sa.false(), nullable=False))
