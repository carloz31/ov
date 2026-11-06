"""entrevistas e investigaciones por familia de carreras, con a qué se dedica la persona entrevistada

Vacía lo anterior, por decisión del usuario: apuntaba a ocupaciones. Los desbloqueos ya obtenidos se conservan.

Revisión: 0046
Revisión anterior: 0045
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0046'
down_revision: Union[str, Sequence[str], None] = '0045'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

EVENTOS = ('INICIA_INVESTIGACION', 'TERMINA_GUION', 'PUBLICA_ENTREVISTA', 'EDITA_ENTREVISTA', 'VISTA_ENTREVISTA',
           'MARCA_FAVORITO_ENTREVISTA', 'REACCIONA_ENTREVISTA', 'ENTREVISTA_DESTACADA', 'ENTREVISTA_LEYENDA')
NOTIFICACIONES = ('ENTREVISTA_DESTACADA', 'ENTREVISTA_LEYENDA', 'REACCION_ENTREVISTA')


def _vaciar() -> None:
    """Hijas antes que madres. Sin esto, los eventos que apuntan a una ocupación se leerían como familias."""
    for tabla in ('reporte', 'reaccion', 'sugerencia_guion', 'pregunta_guion', 'investigacion', 'entrevista_autor',
                  'entrevista'):
        op.execute(f'DELETE FROM {tabla}')
    op.execute("DELETE FROM favorito WHERE tipo = 'ENTREVISTA'")
    lista_eventos = ', '.join(f"'{e}'" for e in EVENTOS)
    op.execute(f'DELETE FROM evento_uso WHERE tipo IN ({lista_eventos})')
    lista_notificaciones = ', '.join(f"'{n}'" for n in NOTIFICACIONES)
    op.execute(f'DELETE FROM notificacion WHERE tipo IN ({lista_notificaciones})')


def _cambiar(tabla: str, quitar: str, tabla_quitar: str, poner: str, tabla_poner: str) -> None:
    with op.batch_alter_table(tabla, schema=None) as batch_op:
        batch_op.drop_constraint(f'fk_{tabla}_{quitar}_id_{tabla_quitar}', type_='foreignkey')
        batch_op.drop_column(f'{quitar}_id')
        batch_op.add_column(sa.Column(f'{poner}_id', sa.Integer(), nullable=False))
        batch_op.create_foreign_key(f'fk_{tabla}_{poner}_id_{tabla_poner}', tabla_poner, [f'{poner}_id'], ['id'])


def upgrade() -> None:
    _vaciar()
    _cambiar('investigacion', 'ocupacion', 'ocupacion', 'familia', 'familia_carrera')
    _cambiar('entrevista', 'ocupacion', 'ocupacion', 'familia', 'familia_carrera')
    with op.batch_alter_table('entrevista', schema=None) as batch_op:
        batch_op.add_column(sa.Column('dedicacion', sa.String(), nullable=False))


def downgrade() -> None:
    _vaciar()
    with op.batch_alter_table('entrevista', schema=None) as batch_op:
        batch_op.drop_column('dedicacion')
    _cambiar('entrevista', 'familia', 'familia_carrera', 'ocupacion', 'ocupacion')
    _cambiar('investigacion', 'familia', 'familia_carrera', 'ocupacion', 'ocupacion')
