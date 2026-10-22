"""la elección que retoma una anterior usa su lista; la referencia solo marca lo elegido antes (F02)

Revisión: 0022
Revisión anterior: 0021
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa


revision: str = '0022'
down_revision: Union[str, Sequence[str], None] = '0021'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SIN_ELECCION = ("(lista_id IS NULL AND referencia_id IS NULL AND eleccion_minima IS NULL"
                " AND eleccion_maxima IS NULL AND eleccion_ordenada = false AND permite_otra = false)")
NUEVA = (SIN_ELECCION + " OR (lista_id IS NOT NULL AND eleccion_minima >= 0"
         " AND eleccion_maxima >= 1 AND eleccion_maxima >= eleccion_minima)")
ANTERIOR = (SIN_ELECCION + " OR ((lista_id IS NULL) <> (referencia_id IS NULL) AND eleccion_minima >= 0"
            " AND eleccion_maxima >= 1 AND eleccion_maxima >= eleccion_minima"
            " AND (referencia_id IS NULL OR permite_otra = false))")


def upgrade() -> None:
    with op.batch_alter_table('item_registro', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_item_registro_eleccion_valida'), type_='check')
    # Los ítems que elegían solo por referencia toman la lista del ítem fuente hasta recargar los datos.
    op.execute(
        "UPDATE item_registro SET lista_id = (SELECT fuente.lista_id FROM referencia"
        " JOIN item_registro AS fuente ON fuente.id = referencia.item_registro_id"
        " WHERE referencia.id = item_registro.referencia_id)"
        " WHERE referencia_id IS NOT NULL AND lista_id IS NULL")
    with op.batch_alter_table('item_registro', schema=None) as batch_op:
        batch_op.create_check_constraint(op.f('ck_item_registro_eleccion_valida'), NUEVA)


def downgrade() -> None:
    # Un ítem que retoma una elección con su lista no cabe en 0021 (toda referencia lleva lista): se detiene
    # antes de perderla. Sin esos ítems, solo cambia la restricción.
    if not context.is_offline_mode() and op.get_bind().execute(sa.text(
            "SELECT 1 FROM item_registro WHERE referencia_id IS NOT NULL AND lista_id IS NOT NULL")).first():
        raise RuntimeError('No se puede volver a 0021: hay ítems que retoman una elección con su lista.')
    with op.batch_alter_table('item_registro', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_item_registro_eleccion_valida'), type_='check')
    with op.batch_alter_table('item_registro', schema=None) as batch_op:
        batch_op.create_check_constraint(op.f('ck_item_registro_eleccion_valida'), ANTERIOR)
