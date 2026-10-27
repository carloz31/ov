"""catálogo real: carreras, instituciones e ingresos de Ponte en Carrera y ocupaciones de Mi Próximo Paso
(ajuste catalogo-datos-reales, F5a)

Revisión: 0033
Revisión anterior: 0032
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa

from app.database import TipoJSON


revision: str = '0033'
down_revision: Union[str, Sequence[str], None] = '0032'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TIPO_INSTITUCION = sa.Enum('UNIVERSIDAD', 'INSTITUTO', 'FFAA_POLICIA', name='tipoinstitucion', native_enum=False,
                           create_constraint=True)
LISTAS_NUEVAS = ('tambien_llamado', 'tareas', 'aptitudes', 'estilos_trabajo')


def upgrade() -> None:
    # Las columnas nuevas son obligatorias y sin un valor que deducir de las filas de prueba: el catálogo se carga
    # de nuevo con `datos.cargar`, sobre una base vacía.
    if not context.is_offline_mode():
        conexion = op.get_bind()
        if any(conexion.execute(sa.text(f'SELECT 1 FROM {tabla}')).first()
               for tabla in ('familia_carrera', 'carrera', 'ocupacion', 'institucion')):
            raise RuntimeError('No se puede subir a 0033 con el catálogo cargado: crea la base de nuevo '
                               '(`alembic upgrade head`) y carga el conjunto con `python -m datos.cargar`.')
    op.create_table('estilo_trabajo',
    sa.Column('codigo', sa.String(), nullable=False),
    sa.Column('nombre', sa.String(), nullable=False),
    sa.PrimaryKeyConstraint('codigo', name=op.f('pk_estilo_trabajo'))
    )
    op.create_table('grupo_ocupacional',
    sa.Column('codigo', sa.String(), nullable=False),
    sa.Column('nombre', sa.String(), nullable=False),
    sa.PrimaryKeyConstraint('codigo', name=op.f('pk_grupo_ocupacional'))
    )
    op.create_table('ingreso_familia',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('tipo', TIPO_INSTITUCION, nullable=False),
    sa.Column('familia_id', sa.Integer(), nullable=False),
    sa.Column('ubicacion_id', sa.Integer(), nullable=True),
    sa.Column('promedio_jovenes', sa.Integer(), nullable=False),
    sa.Column('minimo_jovenes', sa.Integer(), nullable=False),
    sa.Column('maximo_jovenes', sa.Integer(), nullable=False),
    sa.Column('promedio_adultos', sa.Integer(), nullable=False),
    sa.Column('minimo_adultos', sa.Integer(), nullable=False),
    sa.Column('maximo_adultos', sa.Integer(), nullable=False),
    sa.CheckConstraint('minimo_adultos >= 0 AND minimo_adultos <= maximo_adultos', name=op.f('ck_ingreso_familia_adultos_valido')),
    sa.CheckConstraint('minimo_jovenes >= 0 AND minimo_jovenes <= maximo_jovenes', name=op.f('ck_ingreso_familia_jovenes_valido')),
    sa.CheckConstraint('promedio_jovenes >= 0 AND promedio_adultos >= 0', name=op.f('ck_ingreso_familia_promedios_validos')),
    sa.ForeignKeyConstraint(['familia_id'], ['familia_carrera.id'], name=op.f('fk_ingreso_familia_familia_id_familia_carrera')),
    sa.ForeignKeyConstraint(['ubicacion_id'], ['ubicacion.id'], name=op.f('fk_ingreso_familia_ubicacion_id_ubicacion')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_ingreso_familia')),
    sa.UniqueConstraint('tipo', 'familia_id', 'ubicacion_id', name=op.f('uq_ingreso_familia_tipo'))
    )
    # Lo nacional es `ubicacion_id` nulo, que la restricción única no distingue: un índice parcial lo hace único.
    with op.batch_alter_table('ingreso_familia', schema=None) as batch_op:
        batch_op.create_index('ix_ingreso_familia_nacional', ['tipo', 'familia_id'], unique=True,
                              sqlite_where=sa.text('ubicacion_id IS NULL'),
                              postgresql_where=sa.text('ubicacion_id IS NULL'))
    op.create_table('ingreso_institucion',
    sa.Column('institucion_id', sa.Integer(), nullable=False),
    sa.Column('familia_id', sa.Integer(), nullable=False),
    sa.Column('promedio', sa.Integer(), nullable=False),
    sa.Column('minimo', sa.Integer(), nullable=False),
    sa.Column('maximo', sa.Integer(), nullable=False),
    sa.CheckConstraint('promedio >= 0 AND minimo >= 0 AND minimo <= maximo', name=op.f('ck_ingreso_institucion_tramo_valido')),
    sa.ForeignKeyConstraint(['familia_id'], ['familia_carrera.id'], name=op.f('fk_ingreso_institucion_familia_id_familia_carrera')),
    sa.ForeignKeyConstraint(['institucion_id'], ['institucion.id'], name=op.f('fk_ingreso_institucion_institucion_id_institucion')),
    sa.PrimaryKeyConstraint('institucion_id', 'familia_id', name=op.f('pk_ingreso_institucion'))
    )
    op.drop_table('rango_ingreso')
    op.drop_table('ingreso_carrera')
    with op.batch_alter_table('carrera', schema=None) as batch_op:
        batch_op.add_column(sa.Column('tipo', TIPO_INSTITUCION, nullable=False))
        batch_op.add_column(sa.Column('codigo_cine', sa.String(), nullable=False))
        batch_op.add_column(sa.Column('nombre_cine', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('ambito_laboral', sa.Text(), nullable=True))
    with op.batch_alter_table('familia_carrera', schema=None) as batch_op:
        batch_op.add_column(sa.Column('area_codigo', sa.String(), nullable=False))
        batch_op.add_column(sa.Column('area_nombre', sa.String(), nullable=False))
    with op.batch_alter_table('institucion', schema=None) as batch_op:
        batch_op.add_column(sa.Column('distrito', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('direccion', sa.String(), nullable=True))
    with op.batch_alter_table('ocupacion', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_ocupacion_habilidades_lista'), type_='check')
        batch_op.drop_column('lugares_trabajo')
        batch_op.drop_column('habilidades')
        batch_op.add_column(sa.Column('grupo', sa.String(), nullable=False))
        batch_op.add_column(sa.Column('resumen', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('job_zone', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('personalidad', sa.Text(), nullable=True))
        for lista in LISTAS_NUEVAS:
            batch_op.add_column(sa.Column(lista, sa.JSON(none_as_null=True), server_default=sa.text("'[]'"),
                                          nullable=False))
            batch_op.create_check_constraint(op.f(f'ck_ocupacion_{lista}_lista'), TipoJSON(sa.column(lista)) == 'array')
        batch_op.create_check_constraint(op.f('ck_ocupacion_job_zone_valido'), 'job_zone BETWEEN 1 AND 5')
        batch_op.alter_column('codigo', existing_type=sa.VARCHAR(), nullable=False)
        batch_op.create_foreign_key(batch_op.f('fk_ocupacion_grupo_grupo_ocupacional'), 'grupo_ocupacional',
                                    ['grupo'], ['codigo'])


def downgrade() -> None:
    # Bajar perdería el catálogo real (ingresos, grupos y los campos de Mi Próximo Paso): se detiene si está cargado.
    if not context.is_offline_mode() and op.get_bind().execute(sa.text('SELECT 1 FROM ocupacion')).first():
        raise RuntimeError('No se puede bajar 0033: existe el catálogo real cargado')
    with op.batch_alter_table('ocupacion', schema=None) as batch_op:
        batch_op.drop_constraint(batch_op.f('fk_ocupacion_grupo_grupo_ocupacional'), type_='foreignkey')
        batch_op.alter_column('codigo', existing_type=sa.VARCHAR(), nullable=True)
        batch_op.drop_constraint(op.f('ck_ocupacion_job_zone_valido'), type_='check')
        for lista in LISTAS_NUEVAS:
            batch_op.drop_constraint(op.f(f'ck_ocupacion_{lista}_lista'), type_='check')
            batch_op.drop_column(lista)
        batch_op.drop_column('personalidad')
        batch_op.drop_column('job_zone')
        batch_op.drop_column('resumen')
        batch_op.drop_column('grupo')
        batch_op.add_column(sa.Column('lugares_trabajo', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('habilidades', sa.JSON(none_as_null=True), server_default=sa.text("'[]'"),
                                      nullable=False))
        batch_op.create_check_constraint(op.f('ck_ocupacion_habilidades_lista'),
                                         TipoJSON(sa.column('habilidades')) == 'array')
    with op.batch_alter_table('institucion', schema=None) as batch_op:
        batch_op.drop_column('direccion')
        batch_op.drop_column('distrito')
    with op.batch_alter_table('familia_carrera', schema=None) as batch_op:
        batch_op.drop_column('area_nombre')
        batch_op.drop_column('area_codigo')
    with op.batch_alter_table('carrera', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_carrera_tipoinstitucion'), type_='check')
        batch_op.drop_column('ambito_laboral')
        batch_op.drop_column('nombre_cine')
        batch_op.drop_column('codigo_cine')
        batch_op.drop_column('tipo')
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
    op.drop_table('ingreso_institucion')
    with op.batch_alter_table('ingreso_familia', schema=None) as batch_op:
        batch_op.drop_index('ix_ingreso_familia_nacional', sqlite_where=sa.text('ubicacion_id IS NULL'),
                            postgresql_where=sa.text('ubicacion_id IS NULL'))
    op.drop_table('ingreso_familia')
    op.drop_table('grupo_ocupacional')
    op.drop_table('estilo_trabajo')
