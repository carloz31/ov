"""front de registros (lote 1): la repregunta se cierra

Ajuste front de registros (lote 1). Suma `respuesta_registro.repregunta_cerrada`: la repregunta solo se responde en el
momento; se cierra cuando llega `responder` sobre otro ítem de la actividad o `entregar`. Las filas existentes quedan
en falso.

Revisión: 0052
Revisión anterior: 0051
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0052'
down_revision: Union[str, Sequence[str], None] = '0051'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('respuesta_registro', schema=None) as batch_op:
        batch_op.add_column(sa.Column('repregunta_cerrada', sa.Boolean(), server_default=sa.false(), nullable=False))


def downgrade() -> None:
    with op.batch_alter_table('respuesta_registro', schema=None) as batch_op:
        batch_op.drop_column('repregunta_cerrada')
