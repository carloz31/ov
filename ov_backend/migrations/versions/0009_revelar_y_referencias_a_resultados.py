"""revelar resultados y referencias a resultados

Revisión: 0009
Revisión anterior: 0008
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa


revision: str = '0009'
down_revision: Union[str, Sequence[str], None] = '0008'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

EVENTOS = ("'INGRESO', 'COMPLETA_ACTIVIDAD', 'COMPLETA_BLOQUE', 'RESPUESTA_REFLEXIVA', 'ESCRIBE_ENTRADA_DIARIO', "
           "'ESCRIBE_ENTRADA_LIBRE', 'REGISTRA_CHECK_IN', 'VISTA_CARRERA', 'SUPERA_CASO', 'PUBLICA_ENTREVISTA', "
           "'ESCRIBE_CARTA', 'COMPLETA_CONVERSACION', 'REINICIA_INSTRUMENTO', 'INVITA_A_CREW', 'FORMA_CREW', "
           "'VENCE_DESAFIO_INTACTO', 'REGISTRO_ADECUADO'")
REFERENCIAS_0008 = "'ELECCION', 'TEXTO'"
REFERENCIAS = "'ELECCION', 'TEXTO', 'RESULTADO', 'COINCIDENCIAS'"
FUENTE_APLICACION = "(tipo IN ('RESULTADO', 'COINCIDENCIAS')) = (aplicacion_id IS NOT NULL)"


def _eventos(tabla, columna, con_revelar):
    # --autogenerate no detecta el CHECK de los enumerados no nativos.
    valores = f"{EVENTOS}, 'REVELA_RESULTADO'" if con_revelar else EVENTOS
    with op.batch_alter_table(tabla, schema=None) as batch_op:
        batch_op.drop_constraint(op.f(f'ck_{tabla}_tipoeventouso'), type_='check')
        batch_op.create_check_constraint(op.f(f'ck_{tabla}_tipoeventouso'), f"{columna} IN ({valores})")


def upgrade() -> None:
    with op.batch_alter_table('referencia', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_referencia_tiporeferencia'), type_='check')
        batch_op.alter_column('tipo', existing_type=sa.String(length=8), type_=sa.String(length=13),
                              existing_nullable=False)
        batch_op.add_column(sa.Column('aplicacion_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(batch_op.f('fk_referencia_aplicacion_id_aplicacion'), 'aplicacion',
                                    ['aplicacion_id'], ['id'])
    with op.batch_alter_table('referencia', schema=None) as batch_op:
        batch_op.create_check_constraint(op.f('ck_referencia_tiporeferencia'), f"tipo IN ({REFERENCIAS})")
        batch_op.create_check_constraint(op.f('ck_referencia_fuente_aplicacion'), FUENTE_APLICACION)
    _eventos('evento_uso', 'tipo', True)
    _eventos('condicion_desbloqueo', 'tipo_evento', True)


def downgrade() -> None:
    if not context.is_offline_mode():
        conexion = op.get_bind()
        if (conexion.execute(sa.text("SELECT 1 FROM referencia WHERE aplicacion_id IS NOT NULL")).first()
                or conexion.execute(sa.text("SELECT 1 FROM evento_uso WHERE tipo = 'REVELA_RESULTADO'")).first()
                or conexion.execute(sa.text(
                    "SELECT 1 FROM condicion_desbloqueo WHERE tipo_evento = 'REVELA_RESULTADO'")).first()):
            raise RuntimeError('No se puede volver a 0008: hay referencias a resultados o eventos de revelar.')
    _eventos('condicion_desbloqueo', 'tipo_evento', False)
    _eventos('evento_uso', 'tipo', False)
    with op.batch_alter_table('referencia', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_referencia_fuente_aplicacion'), type_='check')
        batch_op.drop_constraint(op.f('ck_referencia_tiporeferencia'), type_='check')
        batch_op.drop_constraint(batch_op.f('fk_referencia_aplicacion_id_aplicacion'), type_='foreignkey')
        batch_op.drop_column('aplicacion_id')
        batch_op.alter_column('tipo', existing_type=sa.String(length=13), type_=sa.String(length=8),
                              existing_nullable=False)
    with op.batch_alter_table('referencia', schema=None) as batch_op:
        batch_op.create_check_constraint(op.f('ck_referencia_tiporeferencia'), f"tipo IN ({REFERENCIAS_0008})")
