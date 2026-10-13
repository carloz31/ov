"""favoritos

Revisión: 0015
Revisión anterior: 0014
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa


revision: str = '0015'
down_revision: Union[str, Sequence[str], None] = '0014'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

EVENTOS_0014 = ("'INGRESO', 'COMPLETA_ACTIVIDAD', 'COMPLETA_BLOQUE', 'RESPUESTA_REFLEXIVA', 'ESCRIBE_ENTRADA_DIARIO', "
                "'ESCRIBE_ENTRADA_LIBRE', 'REGISTRA_CHECK_IN', 'VISTA_CARRERA', 'SUPERA_CASO', 'PUBLICA_ENTREVISTA', "
                "'ESCRIBE_CARTA', 'COMPLETA_CONVERSACION', 'REINICIA_INSTRUMENTO', 'INVITA_A_CREW', 'FORMA_CREW', "
                "'VENCE_DESAFIO_INTACTO', 'REGISTRO_ADECUADO', 'REVELA_RESULTADO', 'SUPERA_BATALLA', 'VISTA_TESTIMONIO', "
                "'VISTA_OCUPACION', 'VISTA_INSTITUCION'")
EVENTOS = f"{EVENTOS_0014}, 'MARCA_FAVORITO'"


def _eventos(eventos):
    # --autogenerate no detecta el CHECK de los enumerados no nativos.
    for tabla, columna in (('evento_uso', 'tipo'), ('condicion_desbloqueo', 'tipo_evento')):
        with op.batch_alter_table(tabla, schema=None) as batch_op:
            batch_op.drop_constraint(op.f(f'ck_{tabla}_tipoeventouso'), type_='check')
            batch_op.create_check_constraint(op.f(f'ck_{tabla}_tipoeventouso'), f"{columna} IN ({eventos})")


def upgrade() -> None:
    op.create_table('favorito',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('cuenta_id', sa.Integer(), nullable=False),
    sa.Column('tipo', sa.Enum('CARRERA', 'OCUPACION', 'INSTITUCION', name='tipofavorito', native_enum=False, create_constraint=True), nullable=False),
    sa.Column('id_referencia', sa.Integer(), nullable=False),
    sa.Column('fecha_hora', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['cuenta_id'], ['cuenta.id'], name=op.f('fk_favorito_cuenta_id_cuenta')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_favorito')),
    sa.UniqueConstraint('cuenta_id', 'tipo', 'id_referencia', name=op.f('uq_favorito_cuenta_id'))
    )
    _eventos(EVENTOS)


def downgrade() -> None:
    if not context.is_offline_mode():
        conexion = op.get_bind()
        if (conexion.execute(sa.text("SELECT 1 FROM evento_uso WHERE tipo = 'MARCA_FAVORITO'")).first()
                or conexion.execute(sa.text(
                    "SELECT 1 FROM condicion_desbloqueo WHERE tipo_evento = 'MARCA_FAVORITO'")).first()):
            raise RuntimeError('No se puede volver a 0014: hay eventos de favoritos.')
    _eventos(EVENTOS_0014)
    op.drop_table('favorito')
