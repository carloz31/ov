"""batallas casos y testimonios

Revisión: 0013
Revisión anterior: 0012
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa


revision: str = '0013'
down_revision: Union[str, Sequence[str], None] = '0012'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

EVENTOS_0012 = ("'INGRESO', 'COMPLETA_ACTIVIDAD', 'COMPLETA_BLOQUE', 'RESPUESTA_REFLEXIVA', 'ESCRIBE_ENTRADA_DIARIO', "
                "'ESCRIBE_ENTRADA_LIBRE', 'REGISTRA_CHECK_IN', 'VISTA_CARRERA', 'SUPERA_CASO', 'PUBLICA_ENTREVISTA', "
                "'ESCRIBE_CARTA', 'COMPLETA_CONVERSACION', 'REINICIA_INSTRUMENTO', 'INVITA_A_CREW', 'FORMA_CREW', "
                "'VENCE_DESAFIO_INTACTO', 'REGISTRO_ADECUADO', 'REVELA_RESULTADO'")
EVENTOS = f"{EVENTOS_0012}, 'SUPERA_BATALLA', 'VISTA_TESTIMONIO'"
TIPOS_0012 = "'INFORMATIVA', 'REGISTRO', 'CUESTIONARIO', 'CASO'"
TIPOS = f"{TIPOS_0012}, 'BATALLA'"


def _enumerados(eventos, tipos):
    # --autogenerate no detecta el CHECK de los enumerados no nativos.
    for tabla, columna in (('evento_uso', 'tipo'), ('condicion_desbloqueo', 'tipo_evento')):
        with op.batch_alter_table(tabla, schema=None) as batch_op:
            batch_op.drop_constraint(op.f(f'ck_{tabla}_tipoeventouso'), type_='check')
            batch_op.create_check_constraint(op.f(f'ck_{tabla}_tipoeventouso'), f"{columna} IN ({eventos})")
    with op.batch_alter_table('actividad', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_actividad_tipoactividad'), type_='check')
        batch_op.create_check_constraint(op.f('ck_actividad_tipoactividad'), f"tipo IN ({tipos})")


def upgrade() -> None:
    op.create_table('actividad_dimension',
    sa.Column('actividad_id', sa.Integer(), nullable=False),
    sa.Column('dimension_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['actividad_id'], ['actividad.id'], name=op.f('fk_actividad_dimension_actividad_id_actividad')),
    sa.ForeignKeyConstraint(['dimension_id'], ['dimension.id'], name=op.f('fk_actividad_dimension_dimension_id_dimension')),
    sa.PrimaryKeyConstraint('actividad_id', 'dimension_id', name=op.f('pk_actividad_dimension'))
    )
    op.create_table('coleccion_ocupacion',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('cuenta_id', sa.Integer(), nullable=False),
    sa.Column('ocupacion_id', sa.Integer(), nullable=False),
    sa.Column('actividad_id', sa.Integer(), nullable=False),
    sa.Column('obtenida_en', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['actividad_id'], ['actividad.id'], name=op.f('fk_coleccion_ocupacion_actividad_id_actividad')),
    sa.ForeignKeyConstraint(['cuenta_id'], ['cuenta.id'], name=op.f('fk_coleccion_ocupacion_cuenta_id_cuenta')),
    sa.ForeignKeyConstraint(['ocupacion_id'], ['ocupacion.id'], name=op.f('fk_coleccion_ocupacion_ocupacion_id_ocupacion')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_coleccion_ocupacion')),
    sa.UniqueConstraint('cuenta_id', 'ocupacion_id', name=op.f('uq_coleccion_ocupacion_cuenta_id'))
    )
    op.create_table('resultado_batalla',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('progreso_id', sa.Integer(), nullable=False),
    sa.Column('victoria', sa.Boolean(), nullable=False),
    sa.Column('aciertos', sa.Integer(), nullable=False),
    sa.Column('preguntas', sa.Integer(), nullable=False),
    sa.Column('fecha_hora', sa.DateTime(), nullable=False),
    sa.CheckConstraint('aciertos BETWEEN 0 AND preguntas', name=op.f('ck_resultado_batalla_aciertos_validos')),
    sa.CheckConstraint('preguntas >= 1', name=op.f('ck_resultado_batalla_preguntas_valida')),
    sa.ForeignKeyConstraint(['progreso_id'], ['progreso_actividad.id'], name=op.f('fk_resultado_batalla_progreso_id_progreso_actividad')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_resultado_batalla'))
    )
    with op.batch_alter_table('testimonio', schema=None) as batch_op:
        batch_op.add_column(sa.Column('pista', sa.Text(), nullable=True))
    _enumerados(EVENTOS, TIPOS)


def downgrade() -> None:
    if not context.is_offline_mode():
        conexion = op.get_bind()
        if (conexion.execute(sa.text("SELECT 1 FROM actividad WHERE tipo = 'BATALLA'")).first()
                or conexion.execute(sa.text(
                    "SELECT 1 FROM evento_uso WHERE tipo IN ('SUPERA_BATALLA', 'VISTA_TESTIMONIO')")).first()
                or conexion.execute(sa.text(
                    "SELECT 1 FROM condicion_desbloqueo WHERE tipo_evento IN ('SUPERA_BATALLA', 'VISTA_TESTIMONIO')"
                )).first()):
            raise RuntimeError('No se puede volver a 0012: hay batallas o eventos de batallas o testimonios.')
    _enumerados(EVENTOS_0012, TIPOS_0012)
    with op.batch_alter_table('testimonio', schema=None) as batch_op:
        batch_op.drop_column('pista')

    op.drop_table('resultado_batalla')
    op.drop_table('coleccion_ocupacion')
    op.drop_table('actividad_dimension')
