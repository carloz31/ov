"""textos de instrumentos: lectura del instrumento, ejemplos, fortalezas y desarrollo de cada dimensión, y el
0–100 se deriva al consultar (ajuste carga-instrumentos)

Revisión: 0040
Revisión anterior: 0039
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.database import TipoJSON


revision: str = '0040'
down_revision: Union[str, Sequence[str], None] = '0039'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('instrumento', schema=None) as batch_op:
        batch_op.add_column(sa.Column('lectura', sa.Text(), server_default=sa.text("''"), nullable=False))

    with op.batch_alter_table('dimension', schema=None) as batch_op:
        batch_op.add_column(sa.Column('ejemplos', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('fortalezas', sa.JSON(none_as_null=True), server_default=sa.text("'[]'"), nullable=False))
        batch_op.add_column(sa.Column('desarrollo', sa.JSON(none_as_null=True), server_default=sa.text("'[]'"), nullable=False))
        batch_op.create_check_constraint(op.f('ck_dimension_fortalezas_lista'),
                                         TipoJSON(sa.column('fortalezas')) == 'array')
        batch_op.create_check_constraint(op.f('ck_dimension_desarrollo_lista'),
                                         TipoJSON(sa.column('desarrollo')) == 'array')

    with op.batch_alter_table('resultado_dimension', schema=None) as batch_op:
        batch_op.drop_column('porcentaje')


def downgrade() -> None:
    # El porcentaje se recalcula como lo guardaba la versión anterior (2 decimales).
    with op.batch_alter_table('resultado_dimension', schema=None) as batch_op:
        batch_op.add_column(sa.Column('porcentaje', sa.Float(), server_default=sa.text('0'), nullable=False))
    op.execute('UPDATE resultado_dimension SET porcentaje = ROUND(CAST(100 * puntaje / puntaje_maximo AS NUMERIC), 2) '
               'WHERE puntaje_maximo > 0')
    with op.batch_alter_table('resultado_dimension', schema=None) as batch_op:
        batch_op.alter_column('porcentaje', server_default=None)

    with op.batch_alter_table('dimension', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_dimension_desarrollo_lista'), type_='check')
        batch_op.drop_constraint(op.f('ck_dimension_fortalezas_lista'), type_='check')
        batch_op.drop_column('desarrollo')
        batch_op.drop_column('fortalezas')
        batch_op.drop_column('ejemplos')

    with op.batch_alter_table('instrumento', schema=None) as batch_op:
        batch_op.drop_column('lectura')
