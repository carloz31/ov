"""catalogo instituciones e ingresos

Revisión: 0014
Revisión anterior: 0013
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa

from app.database import TipoJSON
from app.models.base import sin_tildes


revision: str = '0014'
down_revision: Union[str, Sequence[str], None] = '0013'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

EVENTOS_0013 = ("'INGRESO', 'COMPLETA_ACTIVIDAD', 'COMPLETA_BLOQUE', 'RESPUESTA_REFLEXIVA', 'ESCRIBE_ENTRADA_DIARIO', "
                "'ESCRIBE_ENTRADA_LIBRE', 'REGISTRA_CHECK_IN', 'VISTA_CARRERA', 'SUPERA_CASO', 'PUBLICA_ENTREVISTA', "
                "'ESCRIBE_CARTA', 'COMPLETA_CONVERSACION', 'REINICIA_INSTRUMENTO', 'INVITA_A_CREW', 'FORMA_CREW', "
                "'VENCE_DESAFIO_INTACTO', 'REGISTRO_ADECUADO', 'REVELA_RESULTADO', 'SUPERA_BATALLA', 'VISTA_TESTIMONIO'")
EVENTOS = f"{EVENTOS_0013}, 'VISTA_OCUPACION', 'VISTA_INSTITUCION'"


def _eventos(eventos):
    # --autogenerate no detecta el CHECK de los enumerados no nativos.
    for tabla, columna in (('evento_uso', 'tipo'), ('condicion_desbloqueo', 'tipo_evento')):
        with op.batch_alter_table(tabla, schema=None) as batch_op:
            batch_op.drop_constraint(op.f(f'ck_{tabla}_tipoeventouso'), type_='check')
            batch_op.create_check_constraint(op.f(f'ck_{tabla}_tipoeventouso'), f"{columna} IN ({eventos})")


def _rellenar_busqueda(tabla, campo):
    """Las filas existentes toman su `busqueda` del nombre o título, normalizado como en el modelo."""
    if context.is_offline_mode():
        return
    conexion = op.get_bind()
    filas = conexion.execute(sa.text(f"SELECT id, {campo} FROM {tabla}")).all()
    for identificador, texto in filas:
        conexion.execute(sa.text(f"UPDATE {tabla} SET busqueda = :busqueda WHERE id = :id"),
                         {'busqueda': sin_tildes(texto), 'id': identificador})


def upgrade() -> None:
    op.create_table('ubicacion',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('codigo', sa.String(), nullable=False),
    sa.Column('nombre', sa.String(), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_ubicacion')),
    sa.UniqueConstraint('codigo', name=op.f('uq_ubicacion_codigo'))
    )
    op.create_table('institucion',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('codigo', sa.String(), nullable=False),
    sa.Column('nombre', sa.String(), nullable=False),
    sa.Column('busqueda', sa.String(), nullable=False),
    sa.Column('tipo', sa.Enum('UNIVERSIDAD', 'INSTITUTO', 'FFAA_POLICIA', name='tipoinstitucion', native_enum=False, create_constraint=True), nullable=False),
    sa.Column('descripcion', sa.Text(), nullable=True),
    sa.Column('pagina_web', sa.String(), nullable=True),
    sa.Column('ubicacion_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['ubicacion_id'], ['ubicacion.id'], name=op.f('fk_institucion_ubicacion_id_ubicacion')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_institucion')),
    sa.UniqueConstraint('codigo', name=op.f('uq_institucion_codigo'))
    )
    op.create_table('high_point',
    sa.Column('ocupacion_id', sa.Integer(), nullable=False),
    sa.Column('posicion', sa.Integer(), nullable=False),
    sa.Column('dimension_id', sa.Integer(), nullable=False),
    sa.CheckConstraint('posicion BETWEEN 1 AND 3', name=op.f('ck_high_point_posicion_valida')),
    sa.ForeignKeyConstraint(['dimension_id'], ['dimension.id'], name=op.f('fk_high_point_dimension_id_dimension')),
    sa.ForeignKeyConstraint(['ocupacion_id'], ['ocupacion.id'], name=op.f('fk_high_point_ocupacion_id_ocupacion')),
    sa.PrimaryKeyConstraint('ocupacion_id', 'posicion', name=op.f('pk_high_point')),
    sa.UniqueConstraint('ocupacion_id', 'dimension_id', name=op.f('uq_high_point_ocupacion_id'))
    )
    op.create_table('ingreso_carrera',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('carrera_id', sa.Integer(), nullable=False),
    sa.Column('promedio_mensual', sa.Integer(), nullable=False),
    sa.Column('fuente', sa.String(), nullable=False),
    sa.Column('anio', sa.Integer(), nullable=False),
    sa.CheckConstraint('promedio_mensual >= 0', name=op.f('ck_ingreso_carrera_promedio_valido')),
    sa.ForeignKeyConstraint(['carrera_id'], ['carrera.id'], name=op.f('fk_ingreso_carrera_carrera_id_carrera')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_ingreso_carrera')),
    sa.UniqueConstraint('carrera_id', name=op.f('uq_ingreso_carrera_carrera_id'))
    )
    op.create_table('institucion_carrera',
    sa.Column('institucion_id', sa.Integer(), nullable=False),
    sa.Column('carrera_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['carrera_id'], ['carrera.id'], name=op.f('fk_institucion_carrera_carrera_id_carrera')),
    sa.ForeignKeyConstraint(['institucion_id'], ['institucion.id'], name=op.f('fk_institucion_carrera_institucion_id_institucion')),
    sa.PrimaryKeyConstraint('institucion_id', 'carrera_id', name=op.f('pk_institucion_carrera'))
    )
    op.create_table('tipo_carrera',
    sa.Column('carrera_id', sa.Integer(), nullable=False),
    sa.Column('posicion', sa.Integer(), nullable=False),
    sa.Column('dimension_id', sa.Integer(), nullable=False),
    sa.CheckConstraint('posicion BETWEEN 1 AND 3', name=op.f('ck_tipo_carrera_posicion_valida')),
    sa.ForeignKeyConstraint(['carrera_id'], ['carrera.id'], name=op.f('fk_tipo_carrera_carrera_id_carrera')),
    sa.ForeignKeyConstraint(['dimension_id'], ['dimension.id'], name=op.f('fk_tipo_carrera_dimension_id_dimension')),
    sa.PrimaryKeyConstraint('carrera_id', 'posicion', name=op.f('pk_tipo_carrera')),
    sa.UniqueConstraint('carrera_id', 'dimension_id', name=op.f('uq_tipo_carrera_carrera_id'))
    )
    op.create_table('rango_ingreso',
    sa.Column('ingreso_carrera_id', sa.Integer(), nullable=False),
    sa.Column('posicion', sa.Integer(), nullable=False),
    sa.Column('minimo', sa.Integer(), nullable=False),
    sa.Column('maximo', sa.Integer(), nullable=True),
    sa.Column('porcentaje', sa.Float(), nullable=False),
    sa.CheckConstraint('minimo >= 0 AND (maximo IS NULL OR maximo > minimo)', name=op.f('ck_rango_ingreso_tramo_valido')),
    sa.CheckConstraint('porcentaje BETWEEN 0 AND 100', name=op.f('ck_rango_ingreso_porcentaje_valido')),
    sa.ForeignKeyConstraint(['ingreso_carrera_id'], ['ingreso_carrera.id'], name=op.f('fk_rango_ingreso_ingreso_carrera_id_ingreso_carrera')),
    sa.PrimaryKeyConstraint('ingreso_carrera_id', 'posicion', name=op.f('pk_rango_ingreso'))
    )
    with op.batch_alter_table('carrera', schema=None) as batch_op:
        batch_op.add_column(sa.Column('descripcion', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('duracion', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('codigo_riasec', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('busqueda', sa.String(), nullable=False, server_default=''))
    _rellenar_busqueda('carrera', 'nombre')
    with op.batch_alter_table('carrera', schema=None) as batch_op:
        batch_op.alter_column('busqueda', server_default=None)

    with op.batch_alter_table('ocupacion', schema=None) as batch_op:
        batch_op.add_column(sa.Column('descripcion', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('lugares_trabajo', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('habilidades', sa.JSON(none_as_null=True), server_default=sa.text("'[]'"), nullable=False))
        batch_op.add_column(sa.Column('conocimientos', sa.JSON(none_as_null=True), server_default=sa.text("'[]'"), nullable=False))
        batch_op.add_column(sa.Column('codigo_riasec', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('busqueda', sa.String(), nullable=False, server_default=''))
        batch_op.create_check_constraint(op.f('ck_ocupacion_habilidades_lista'),
                                         TipoJSON(sa.column('habilidades')) == 'array')
        batch_op.create_check_constraint(op.f('ck_ocupacion_conocimientos_lista'),
                                         TipoJSON(sa.column('conocimientos')) == 'array')
    _rellenar_busqueda('ocupacion', 'titulo')
    with op.batch_alter_table('ocupacion', schema=None) as batch_op:
        batch_op.alter_column('busqueda', server_default=None)
    _eventos(EVENTOS)


def downgrade() -> None:
    if not context.is_offline_mode():
        conexion = op.get_bind()
        if (conexion.execute(sa.text(
                "SELECT 1 FROM evento_uso WHERE tipo IN ('VISTA_OCUPACION', 'VISTA_INSTITUCION')")).first()
                or conexion.execute(sa.text(
                    "SELECT 1 FROM condicion_desbloqueo WHERE tipo_evento IN ('VISTA_OCUPACION', 'VISTA_INSTITUCION')"
                )).first()):
            raise RuntimeError('No se puede volver a 0013: hay eventos de vistas de ocupaciones o instituciones.')
    _eventos(EVENTOS_0013)
    with op.batch_alter_table('ocupacion', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_ocupacion_conocimientos_lista'), type_='check')
        batch_op.drop_constraint(op.f('ck_ocupacion_habilidades_lista'), type_='check')
        batch_op.drop_column('busqueda')
        batch_op.drop_column('codigo_riasec')
        batch_op.drop_column('conocimientos')
        batch_op.drop_column('habilidades')
        batch_op.drop_column('lugares_trabajo')
        batch_op.drop_column('descripcion')

    with op.batch_alter_table('carrera', schema=None) as batch_op:
        batch_op.drop_column('busqueda')
        batch_op.drop_column('codigo_riasec')
        batch_op.drop_column('duracion')
        batch_op.drop_column('descripcion')

    op.drop_table('rango_ingreso')
    op.drop_table('tipo_carrera')
    op.drop_table('institucion_carrera')
    op.drop_table('ingreso_carrera')
    op.drop_table('high_point')
    op.drop_table('institucion')
    op.drop_table('ubicacion')
