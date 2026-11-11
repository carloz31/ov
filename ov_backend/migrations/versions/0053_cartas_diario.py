"""cartas del diario sin LLM: variantes en la pregunta, variante en la recomendación y referencias solo de actividad

Ajuste cartas-diario. `pregunta_diario`: entra `variantes` (nula = carta fija) y salen `personalizada` y
`respaldo_si`. `recomendacion`: entra `variante` (código de la variante que tocó), salen `contexto`, `origen` (con su
CHECK de enumerado y `texto_con_origen`) y `texto` pasa a obligatorio (las que esperaban redacción quedan con el texto
base de su pregunta). `referencia`: sale el dueño `pregunta_diario_id` (con `un_dueno`; sus filas se borran) y
`actividad_id` pasa a obligatoria.

Revisión: 0053
Revisión anterior: 0052
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0053'
down_revision: Union[str, Sequence[str], None] = '0052'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE recomendacion SET texto = (SELECT pregunta_diario.pregunta FROM pregunta_diario "
               "WHERE pregunta_diario.id = recomendacion.pregunta_diario_id) WHERE texto IS NULL")
    op.execute("DELETE FROM referencia WHERE pregunta_diario_id IS NOT NULL")

    with op.batch_alter_table('pregunta_diario', schema=None) as batch_op:
        batch_op.add_column(sa.Column('variantes', sa.JSON(none_as_null=True), nullable=True))
        batch_op.drop_column('personalizada')
        batch_op.drop_column('respaldo_si')

    with op.batch_alter_table('recomendacion', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_recomendacion_texto_con_origen'), type_='check')
        batch_op.drop_constraint(op.f('ck_recomendacion_origenredaccion'), type_='check')
        batch_op.add_column(sa.Column('variante', sa.String(), nullable=True))
        batch_op.alter_column('texto', existing_type=sa.Text(), nullable=False)
        batch_op.drop_column('contexto')
        batch_op.drop_column('origen')

    with op.batch_alter_table('referencia', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_referencia_un_dueno'), type_='check')
        batch_op.drop_constraint(op.f('fk_referencia_pregunta_diario_id_pregunta_diario'), type_='foreignkey')
        batch_op.alter_column('actividad_id', existing_type=sa.Integer(), nullable=False)
        batch_op.drop_column('pregunta_diario_id')


def downgrade() -> None:
    with op.batch_alter_table('referencia', schema=None) as batch_op:
        batch_op.add_column(sa.Column('pregunta_diario_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(op.f('fk_referencia_pregunta_diario_id_pregunta_diario'), 'pregunta_diario',
                                    ['pregunta_diario_id'], ['id'])
        batch_op.alter_column('actividad_id', existing_type=sa.Integer(), nullable=True)
        batch_op.create_check_constraint(op.f('ck_referencia_un_dueno'),
                                         '(actividad_id IS NULL) <> (pregunta_diario_id IS NULL)')

    with op.batch_alter_table('recomendacion', schema=None) as batch_op:
        batch_op.add_column(sa.Column('origen', sa.Enum('FIJA', 'LLM', name='origenredaccion', native_enum=False,
                                                        create_constraint=True), nullable=True))
        batch_op.add_column(sa.Column('contexto', sa.JSON(none_as_null=True), nullable=True))
        batch_op.alter_column('texto', existing_type=sa.Text(), nullable=True)
        batch_op.drop_column('variante')
    op.execute("UPDATE recomendacion SET origen = 'FIJA'")
    with op.batch_alter_table('recomendacion', schema=None) as batch_op:
        batch_op.create_check_constraint(op.f('ck_recomendacion_texto_con_origen'), '(texto IS NULL) = (origen IS NULL)')

    with op.batch_alter_table('pregunta_diario', schema=None) as batch_op:
        batch_op.add_column(sa.Column('respaldo_si', sa.JSON(none_as_null=True), nullable=True))
        batch_op.add_column(sa.Column('personalizada', sa.Boolean(), server_default=sa.false(), nullable=False))
        batch_op.drop_column('variantes')
