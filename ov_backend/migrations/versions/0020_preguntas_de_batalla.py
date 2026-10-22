"""preguntas de batalla: pool con su ficha, preguntas por intento y respuestas de cada intento (F04b)

Revisión: 0020
Revisión anterior: 0019
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa

from app.database import TipoJSON


revision: str = '0020'
down_revision: Union[str, Sequence[str], None] = '0019'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('pregunta_batalla',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('codigo', sa.String(), nullable=False),
    sa.Column('actividad_id', sa.Integer(), nullable=False),
    sa.Column('ficha_id', sa.Integer(), nullable=False),
    sa.Column('enunciado', sa.Text(), nullable=False),
    sa.Column('opciones', sa.JSON(), nullable=False),
    sa.Column('correcta', sa.Integer(), nullable=False),
    sa.Column('explicacion', sa.Text(), nullable=False),
    sa.CheckConstraint(TipoJSON(sa.column('opciones')) == 'array', name=op.f('ck_pregunta_batalla_opciones_lista')),
    sa.CheckConstraint('correcta >= 0', name=op.f('ck_pregunta_batalla_correcta_valida')),
    sa.ForeignKeyConstraint(['actividad_id'], ['actividad.id'], name=op.f('fk_pregunta_batalla_actividad_id_actividad')),
    sa.ForeignKeyConstraint(['ficha_id'], ['ficha.id'], name=op.f('fk_pregunta_batalla_ficha_id_ficha')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_pregunta_batalla')),
    sa.UniqueConstraint('codigo', name=op.f('uq_pregunta_batalla_codigo'))
    )
    op.create_table('respuesta_batalla',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('resultado_batalla_id', sa.Integer(), nullable=False),
    sa.Column('pregunta_batalla_id', sa.Integer(), nullable=False),
    sa.Column('opcion', sa.Integer(), nullable=False),
    sa.Column('correcta', sa.Boolean(), nullable=False),
    sa.ForeignKeyConstraint(['pregunta_batalla_id'], ['pregunta_batalla.id'], name=op.f('fk_respuesta_batalla_pregunta_batalla_id_pregunta_batalla')),
    sa.ForeignKeyConstraint(['resultado_batalla_id'], ['resultado_batalla.id'], name=op.f('fk_respuesta_batalla_resultado_batalla_id_resultado_batalla')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_respuesta_batalla')),
    sa.UniqueConstraint('resultado_batalla_id', 'pregunta_batalla_id', name=op.f('uq_respuesta_batalla_resultado_batalla_id'))
    )
    with op.batch_alter_table('actividad', schema=None) as batch_op:
        batch_op.add_column(sa.Column('preguntas_por_intento', sa.Integer(), nullable=True))
    # Las batallas ya cargadas no tienen pool: quedan con una pregunta por intento hasta recargar los datos.
    op.execute("UPDATE actividad SET preguntas_por_intento = 1 WHERE tipo = 'BATALLA'")
    with op.batch_alter_table('actividad', schema=None) as batch_op:
        batch_op.create_check_constraint(
            op.f('ck_actividad_preguntas_por_intento_solo_batalla'),
            "(tipo = 'BATALLA' AND preguntas_por_intento >= 1) OR "
            "(tipo != 'BATALLA' AND preguntas_por_intento IS NULL)")


def downgrade() -> None:
    # Las preguntas de batalla no caben en 0019: se detiene antes de perderlas.
    if not context.is_offline_mode() and op.get_bind().execute(sa.text('SELECT 1 FROM pregunta_batalla')).first():
        raise RuntimeError('No se puede volver a 0019: hay preguntas de batalla.')
    with op.batch_alter_table('actividad', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_actividad_preguntas_por_intento_solo_batalla'), type_='check')
        batch_op.drop_column('preguntas_por_intento')
    op.drop_table('respuesta_batalla')
    op.drop_table('pregunta_batalla')
