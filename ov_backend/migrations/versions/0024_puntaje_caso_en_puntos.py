"""puntaje del caso en puntos de satisfacción, con su máximo (ajustes Central de casos)

Revisión: 0024
Revisión anterior: 0023
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa


revision: str = '0024'
down_revision: Union[str, Sequence[str], None] = '0023'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CASO_ANTES = ("(tipo = 'CASO' AND puntaje_minimo BETWEEN 0 AND 100 AND puntaje_minimo IS NOT NULL) OR "
              "(tipo != 'CASO' AND puntaje_minimo IS NULL)")
CASO_AHORA = ("(tipo = 'CASO' AND puntaje_minimo IS NOT NULL AND puntaje_maximo IS NOT NULL "
              "AND puntaje_minimo BETWEEN 0 AND puntaje_maximo) OR "
              "(tipo != 'CASO' AND puntaje_minimo IS NULL AND puntaje_maximo IS NULL)")


def upgrade() -> None:
    # Las filas existentes quedan en la escala anterior (máximo 100, redondeado): siguen siendo
    # coherentes, y los datos de prueba se regeneran con la carga.
    op.execute("UPDATE actividad SET puntaje_minimo = ROUND(puntaje_minimo) WHERE puntaje_minimo IS NOT NULL")
    op.execute("UPDATE resultado_caso SET puntaje = ROUND(puntaje)")
    with op.batch_alter_table('actividad', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_actividad_puntaje_minimo_solo_caso'), type_='check')
        batch_op.add_column(sa.Column('puntaje_maximo', sa.Integer(), nullable=True))
        batch_op.alter_column('puntaje_minimo', existing_type=sa.Float(), type_=sa.Integer(),
                              existing_nullable=True)
    op.execute("UPDATE actividad SET puntaje_maximo = 100 WHERE tipo = 'CASO'")
    with op.batch_alter_table('actividad', schema=None) as batch_op:
        batch_op.create_check_constraint(op.f('ck_actividad_puntajes_solo_caso'), sa.text(CASO_AHORA))
    with op.batch_alter_table('resultado_caso', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_resultado_caso_puntaje_valido'), type_='check')
        batch_op.alter_column('puntaje', existing_type=sa.Float(), type_=sa.Integer(), existing_nullable=False)
        batch_op.create_check_constraint(op.f('ck_resultado_caso_puntaje_valido'), sa.text('puntaje >= 0'))


def downgrade() -> None:
    # Un caso con otro máximo no cabe en la escala 0–100 de 0023: se detiene antes de perderlo.
    if not context.is_offline_mode() and op.get_bind().execute(sa.text(
            "SELECT COUNT(*) FROM actividad WHERE tipo = 'CASO' AND puntaje_maximo != 100")).scalar():
        raise RuntimeError('No se puede volver a 0023: hay casos con puntaje máximo distinto de 100.')
    with op.batch_alter_table('resultado_caso', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_resultado_caso_puntaje_valido'), type_='check')
        batch_op.alter_column('puntaje', existing_type=sa.Integer(), type_=sa.Float(), existing_nullable=False)
        batch_op.create_check_constraint(op.f('ck_resultado_caso_puntaje_valido'), sa.text('puntaje BETWEEN 0 AND 100'))
    with op.batch_alter_table('actividad', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_actividad_puntajes_solo_caso'), type_='check')
        batch_op.alter_column('puntaje_minimo', existing_type=sa.Integer(), type_=sa.Float(),
                              existing_nullable=True)
        batch_op.drop_column('puntaje_maximo')
        batch_op.create_check_constraint(op.f('ck_actividad_puntaje_minimo_solo_caso'), sa.text(CASO_ANTES))
