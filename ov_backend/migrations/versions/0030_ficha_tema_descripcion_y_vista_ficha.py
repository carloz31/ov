"""tema y descripción de la ficha y evento VISTA_FICHA (ajuste mochila)

Revisión: 0030
Revisión anterior: 0029
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa


revision: str = '0030'
down_revision: Union[str, Sequence[str], None] = '0029'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

EVENTOS_0029 = ("'INGRESO', 'COMPLETA_ACTIVIDAD', 'COMPLETA_BLOQUE', 'RESPUESTA_REFLEXIVA', 'ESCRIBE_ENTRADA_DIARIO', "
                "'ESCRIBE_ENTRADA_LIBRE', 'REGISTRA_CHECK_IN', 'VISTA_CARRERA', 'SUPERA_CASO', 'PUBLICA_ENTREVISTA', "
                "'ESCRIBE_CARTA', 'COMPLETA_CONVERSACION', 'REINICIA_INSTRUMENTO', 'INVITA_A_CREW', 'FORMA_CREW', "
                "'VENCE_DESAFIO_INTACTO', 'REGISTRO_ADECUADO', 'REVELA_RESULTADO', 'SUPERA_BATALLA', 'VISTA_TESTIMONIO', "
                "'VISTA_OCUPACION', 'VISTA_INSTITUCION', 'MARCA_FAVORITO', 'CREA_PLAN', 'ACTUALIZA_PLAN', 'ELIMINA_PLAN'")
EVENTOS = f"{EVENTOS_0029}, 'VISTA_FICHA'"


def _cambiar_eventos(eventos) -> None:
    # --autogenerate no detecta el cambio del CHECK de un enumerado no nativo (como en 0017).
    for tabla, columna in (('evento_uso', 'tipo'), ('condicion_desbloqueo', 'tipo_evento')):
        with op.batch_alter_table(tabla, schema=None) as batch_op:
            batch_op.drop_constraint(op.f(f'ck_{tabla}_tipoeventouso'), type_='check')
            batch_op.create_check_constraint(op.f(f'ck_{tabla}_tipoeventouso'), f"{columna} IN ({eventos})")


def upgrade() -> None:
    with op.batch_alter_table('ficha', schema=None) as batch_op:
        batch_op.add_column(sa.Column('descripcion', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('tema', sa.String(), nullable=True))
    _cambiar_eventos(EVENTOS)


def downgrade() -> None:
    # Evita iniciar una reconstrucción que dejaría una tabla temporal en SQLite.
    if not context.is_offline_mode():
        evento = sa.table('evento_uso', sa.column('tipo', sa.String()))
        condicion = sa.table('condicion_desbloqueo', sa.column('tipo_evento', sa.String()))
        enlace = op.get_bind()
        if (enlace.execute(sa.select(evento.c.tipo).where(evento.c.tipo == 'VISTA_FICHA').limit(1)).first()
                or enlace.execute(sa.select(condicion.c.tipo_evento).where(
                    condicion.c.tipo_evento == 'VISTA_FICHA').limit(1)).first()):
            raise RuntimeError('No se puede volver a 0029: existen eventos o condiciones VISTA_FICHA.')
    _cambiar_eventos(EVENTOS_0029)
    with op.batch_alter_table('ficha', schema=None) as batch_op:
        batch_op.drop_column('tema')
        batch_op.drop_column('descripcion')
