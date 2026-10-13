"""referencia a la respuesta de un cuestionario

Revisión: 0012
Revisión anterior: 0011
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa


revision: str = '0012'
down_revision: Union[str, Sequence[str], None] = '0011'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

REFERENCIAS_0011 = "'ELECCION', 'TEXTO', 'RESULTADO', 'COINCIDENCIAS'"
REFERENCIAS = f"{REFERENCIAS_0011}, 'RESPUESTA_CUESTIONARIO'"
FUENTE_APLICACION_0011 = "(tipo IN ('RESULTADO', 'COINCIDENCIAS')) = (aplicacion_id IS NOT NULL)"
FUENTE_APLICACION = "(tipo IN ('RESULTADO', 'COINCIDENCIAS', 'RESPUESTA_CUESTIONARIO')) = (aplicacion_id IS NOT NULL)"
FUENTE_CUESTIONARIO = "(tipo = 'RESPUESTA_CUESTIONARIO') = (item_instrumento_id IS NOT NULL)"


def upgrade() -> None:
    # --autogenerate no detecta el CHECK de los enumerados no nativos ni los CHECK de la tabla.
    with op.batch_alter_table('referencia', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_referencia_tiporeferencia'), type_='check')
        batch_op.drop_constraint(op.f('ck_referencia_fuente_aplicacion'), type_='check')
        batch_op.alter_column('tipo', existing_type=sa.String(length=13), type_=sa.String(length=22),
                              existing_nullable=False)
        batch_op.add_column(sa.Column('item_instrumento_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(batch_op.f('fk_referencia_item_instrumento_id_item_instrumento'),
                                    'item_instrumento', ['item_instrumento_id'], ['id'])
    with op.batch_alter_table('referencia', schema=None) as batch_op:
        batch_op.create_check_constraint(op.f('ck_referencia_tiporeferencia'), f"tipo IN ({REFERENCIAS})")
        batch_op.create_check_constraint(op.f('ck_referencia_fuente_aplicacion'), FUENTE_APLICACION)
        batch_op.create_check_constraint(op.f('ck_referencia_fuente_cuestionario'), FUENTE_CUESTIONARIO)


def downgrade() -> None:
    if not context.is_offline_mode():
        if op.get_bind().execute(sa.text("SELECT 1 FROM referencia WHERE tipo = 'RESPUESTA_CUESTIONARIO'")).first():
            raise RuntimeError('No se puede volver a 0011: hay referencias a respuestas de cuestionario.')
    with op.batch_alter_table('referencia', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_referencia_fuente_cuestionario'), type_='check')
        batch_op.drop_constraint(op.f('ck_referencia_fuente_aplicacion'), type_='check')
        batch_op.drop_constraint(op.f('ck_referencia_tiporeferencia'), type_='check')
        batch_op.drop_constraint(batch_op.f('fk_referencia_item_instrumento_id_item_instrumento'), type_='foreignkey')
        batch_op.drop_column('item_instrumento_id')
        batch_op.alter_column('tipo', existing_type=sa.String(length=22), type_=sa.String(length=13),
                              existing_nullable=False)
    with op.batch_alter_table('referencia', schema=None) as batch_op:
        batch_op.create_check_constraint(op.f('ck_referencia_tiporeferencia'), f"tipo IN ({REFERENCIAS_0011})")
        batch_op.create_check_constraint(op.f('ck_referencia_fuente_aplicacion'), FUENTE_APLICACION_0011)
