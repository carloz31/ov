"""entrevista: ELIMINADA pasa a OCULTA

Ajuste panel-entrevistas-configuracion. La orientadora ya no elimina una entrevista: la oculta y puede volver a
mostrarla. Las filas ELIMINADA pasan a OCULTA (sin destacado ni Leyenda, como queda una entrevista al ocultarla). Al
bajar, OCULTA vuelve a ELIMINADA.

Revisión: 0060
Revisión anterior: 0059
"""

from typing import Sequence, Union

from alembic import op


revision: str = '0060'
down_revision: Union[str, Sequence[str], None] = '0059'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _cambiar(desde: str, hacia: str, permitidos: str) -> None:
    with op.batch_alter_table('entrevista', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_entrevista_estadoentrevista'), type_='check')
    op.execute(f"UPDATE entrevista SET estado = '{hacia}' WHERE estado = '{desde}'")
    if hacia == 'OCULTA':
        op.execute("UPDATE entrevista SET destacada_en = NULL, destacada_por = NULL, leyenda_en = NULL "
                   "WHERE estado = 'OCULTA'")
    with op.batch_alter_table('entrevista', schema=None) as batch_op:
        batch_op.create_check_constraint(op.f('ck_entrevista_estadoentrevista'), f'estado IN ({permitidos})')


def upgrade() -> None:
    _cambiar('ELIMINADA', 'OCULTA', "'PUBLICADA', 'RETIRADA', 'OCULTA'")


def downgrade() -> None:
    _cambiar('OCULTA', 'ELIMINADA', "'PUBLICADA', 'RETIRADA', 'ELIMINADA'")
