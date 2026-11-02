"""coincidencias completas: todas las de r ≥ 0, sin tope ni nivel de ajuste; las afines y las familias se derivan
al leer (ajuste resultados-intereses)

Revisión: 0042
Revisión anterior: 0041
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa


revision: str = '0042'
down_revision: Union[str, Sequence[str], None] = '0041'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('coincidencia', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_coincidencia_ajuste_segun_correlacion'), type_='check')
        batch_op.drop_constraint(op.f('ck_coincidencia_nivelajuste'), type_='check')
        batch_op.drop_constraint(op.f('ck_coincidencia_posicion_valida'), type_='check')
        batch_op.drop_column('ajuste')
        batch_op.create_check_constraint(op.f('ck_coincidencia_posicion_valida'), 'posicion >= 1')
        batch_op.create_check_constraint(op.f('ck_coincidencia_correlacion_valida'),
                                         'correlacion >= 0 AND correlacion <= 1')


def downgrade() -> None:
    # 0041 guardaba a lo sumo 10 por resultado: con más, bajar perdería coincidencias.
    if not context.is_offline_mode():
        coincidencia = sa.table('coincidencia', sa.column('posicion', sa.Integer()))
        if op.get_bind().execute(sa.select(coincidencia.c.posicion).where(coincidencia.c.posicion > 10).limit(1)).first():
            raise RuntimeError('No se puede volver a 0041: hay resultados con más de 10 coincidencias.')
    with op.batch_alter_table('coincidencia', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_coincidencia_correlacion_valida'), type_='check')
        batch_op.drop_constraint(op.f('ck_coincidencia_posicion_valida'), type_='check')
        batch_op.add_column(sa.Column('ajuste', sa.String(length=9), server_default='GOOD_FIT', nullable=False))
    op.execute("UPDATE coincidencia SET ajuste = CASE WHEN correlacion >= 0.729 THEN 'BEST_FIT' "
               "WHEN correlacion >= 0.608 THEN 'GREAT_FIT' ELSE 'GOOD_FIT' END")
    with op.batch_alter_table('coincidencia', schema=None) as batch_op:
        batch_op.alter_column('ajuste', server_default=None)
        batch_op.create_check_constraint(op.f('ck_coincidencia_nivelajuste'),
                                         "ajuste IN ('BEST_FIT', 'GREAT_FIT', 'GOOD_FIT')")
        batch_op.create_check_constraint(op.f('ck_coincidencia_posicion_valida'), 'posicion BETWEEN 1 AND 10')
        batch_op.create_check_constraint(
            op.f('ck_coincidencia_ajuste_segun_correlacion'),
            "(correlacion >= 0.729 AND ajuste = 'BEST_FIT') OR (correlacion >= 0.608 AND correlacion < 0.729 AND "
            "ajuste = 'GREAT_FIT') OR (correlacion >= 0 AND correlacion < 0.608 AND ajuste = 'GOOD_FIT')")
