"""intentos de registro y marca de respuesta reflexiva

Revisión: 0007
Revisión anterior: 0006
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa


revision: str = '0007'
down_revision: Union[str, Sequence[str], None] = '0006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('respuesta_registro', schema=None) as batch_op:
        batch_op.add_column(sa.Column('intento', sa.Integer(), server_default=sa.text('1'), nullable=False))
        batch_op.add_column(sa.Column('reflexiva_registrada', sa.Boolean(), server_default=sa.false(),
                                      nullable=False))

    with op.batch_alter_table('turno_seguimiento', schema=None) as batch_op:
        batch_op.add_column(sa.Column('intento', sa.Integer(), server_default=sa.text('1'), nullable=False))
        batch_op.drop_constraint(batch_op.f('uq_turno_seguimiento_respuesta_id'), type_='unique')
        batch_op.create_unique_constraint(batch_op.f('uq_turno_seguimiento_respuesta_id'),
                                          ['respuesta_id', 'intento', 'orden'])

    # Regla de B04: reflexiva es la respuesta que pasó de POCO_DESARROLLADA a ADECUADA al responder un turno.
    # Antes de 0007, toda evaluación con número mayor que 1 viene de responder un turno.
    op.execute(sa.text(
        "UPDATE respuesta_registro SET reflexiva_registrada = :verdadero WHERE EXISTS ("
        "SELECT 1 FROM evaluacion_respuesta actual JOIN evaluacion_respuesta anterior "
        "ON anterior.respuesta_id = actual.respuesta_id AND anterior.numero = actual.numero - 1 "
        "WHERE actual.respuesta_id = respuesta_registro.id AND actual.numero > 1 "
        "AND actual.clasificacion = 'ADECUADA' AND anterior.clasificacion = 'POCO_DESARROLLADA')",
    ).bindparams(verdadero=True))


def downgrade() -> None:
    if not context.is_offline_mode():
        if op.get_bind().execute(sa.text('SELECT 1 FROM respuesta_registro WHERE intento > 1')).first():
            raise RuntimeError('No se puede volver a 0006: hay registros editados.')
    with op.batch_alter_table('turno_seguimiento', schema=None) as batch_op:
        batch_op.drop_constraint(batch_op.f('uq_turno_seguimiento_respuesta_id'), type_='unique')
        batch_op.create_unique_constraint(batch_op.f('uq_turno_seguimiento_respuesta_id'), ['respuesta_id', 'orden'])
        batch_op.drop_column('intento')

    with op.batch_alter_table('respuesta_registro', schema=None) as batch_op:
        batch_op.drop_column('reflexiva_registrada')
        batch_op.drop_column('intento')
