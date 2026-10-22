"""la elección que vio cada evaluación: editar puede cambiarla (F02)

Revisión: 0023
Revisión anterior: 0022
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa

from app.database import TipoJSON


revision: str = '0023'
down_revision: Union[str, Sequence[str], None] = '0022'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Las evaluaciones anteriores quedan con `[]`: no se sabe qué elección vieron.
    with op.batch_alter_table('evaluacion_respuesta', schema=None) as batch_op:
        batch_op.add_column(sa.Column('opciones_evaluadas', sa.JSON(none_as_null=True),
                                      server_default=sa.text("'[]'"), nullable=False))
        batch_op.create_check_constraint(op.f('ck_evaluacion_respuesta_opciones_evaluadas_lista'),
                                         TipoJSON(sa.column('opciones_evaluadas')) == 'array')


def downgrade() -> None:
    # El historial de elecciones no cabe en 0022: se detiene antes de perderlo.
    if not context.is_offline_mode() and any(
            opciones for opciones in op.get_bind().execute(sa.select(
                sa.column('opciones_evaluadas', sa.JSON())).select_from(sa.table('evaluacion_respuesta'))).scalars()):
        raise RuntimeError('No se puede volver a 0022: hay evaluaciones con la elección que vieron.')
    with op.batch_alter_table('evaluacion_respuesta', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_evaluacion_respuesta_opciones_evaluadas_lista'), type_='check')
        batch_op.drop_column('opciones_evaluadas')
