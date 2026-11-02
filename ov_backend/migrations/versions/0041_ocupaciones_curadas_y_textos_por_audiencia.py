"""ocupaciones curadas y sus familias, descripción de la familia y textos del instrumento por audiencia
(ajuste resultados-intereses)

El área de `familia_carrera` pasa a ser el campo específico (2 cifras) y el catálogo de ocupaciones sale de la
curaduría: una base con el catálogo anterior se vacía y se vuelve a cargar, como con 0033.

Revisión: 0041
Revisión anterior: 0040
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa

from app.database import TipoJSON


revision: str = '0041'
down_revision: Union[str, Sequence[str], None] = '0040'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TEXTOS = ('lectura_apoderado', 'lectura_orientadora', 'mensaje_estudiante', 'mensaje_apoderado',
          'mensaje_orientadora')


def upgrade() -> None:
    op.create_table('ocupacion_familia',
    sa.Column('ocupacion_id', sa.Integer(), nullable=False),
    sa.Column('familia_id', sa.Integer(), nullable=False),
    sa.Column('es_principal', sa.Boolean(), nullable=False),
    sa.Column('orden', sa.Integer(), nullable=False),
    sa.CheckConstraint('(orden = 0) = es_principal', name=op.f('ck_ocupacion_familia_principal_primera')),
    sa.CheckConstraint('orden BETWEEN 0 AND 2', name=op.f('ck_ocupacion_familia_orden_valido')),
    sa.ForeignKeyConstraint(['familia_id'], ['familia_carrera.id'], name=op.f('fk_ocupacion_familia_familia_id_familia_carrera')),
    sa.ForeignKeyConstraint(['ocupacion_id'], ['ocupacion.id'], name=op.f('fk_ocupacion_familia_ocupacion_id_ocupacion')),
    sa.PrimaryKeyConstraint('ocupacion_id', 'familia_id', name=op.f('pk_ocupacion_familia')),
    sa.UniqueConstraint('ocupacion_id', 'orden', name=op.f('uq_ocupacion_familia_ocupacion_id'))
    )
    with op.batch_alter_table('ocupacion_familia', schema=None) as batch_op:
        batch_op.create_index('ix_ocupacion_familia_principal_unica', ['ocupacion_id'], unique=True,
                              sqlite_where=sa.text('es_principal'), postgresql_where=sa.text('es_principal'))

    with op.batch_alter_table('familia_carrera', schema=None) as batch_op:
        batch_op.add_column(sa.Column('descripcion', sa.Text(), nullable=True))

    # `lectura` era el texto del estudiante: se renombra y conserva su contenido.
    with op.batch_alter_table('instrumento', schema=None) as batch_op:
        batch_op.alter_column('lectura', new_column_name='lectura_estudiante')
        for nombre in TEXTOS:
            batch_op.add_column(sa.Column(nombre, sa.Text(), server_default=sa.text("''"), nullable=False))
        batch_op.add_column(sa.Column('guia_abierta', sa.Boolean(), server_default=sa.false(), nullable=False))

    with op.batch_alter_table('ocupacion', schema=None) as batch_op:
        batch_op.add_column(sa.Column('en_test', sa.Boolean(), server_default=sa.false(), nullable=False))
        batch_op.add_column(sa.Column('en_catalogo', sa.Boolean(), server_default=sa.true(), nullable=False))
        batch_op.add_column(sa.Column('programas_cine', sa.JSON(none_as_null=True), server_default=sa.text("'[]'"),
                                      nullable=False))
        batch_op.create_check_constraint(op.f('ck_ocupacion_programas_cine_lista'),
                                         TipoJSON(sa.column('programas_cine')) == 'array')


def downgrade() -> None:
    # El catálogo curado no cabe en 0040 (área de 1 cifra, sin familias de ocupaciones): se vacía y se recarga.
    if not context.is_offline_mode():
        relacion = sa.table('ocupacion_familia', sa.column('ocupacion_id', sa.Integer()))
        if op.get_bind().execute(sa.select(relacion.c.ocupacion_id).limit(1)).first():
            raise RuntimeError('No se puede volver a 0040: existen familias de ocupaciones del catálogo curado.')
    with op.batch_alter_table('ocupacion', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_ocupacion_programas_cine_lista'), type_='check')
        batch_op.drop_column('programas_cine')
        batch_op.drop_column('en_catalogo')
        batch_op.drop_column('en_test')

    with op.batch_alter_table('instrumento', schema=None) as batch_op:
        batch_op.drop_column('guia_abierta')
        for nombre in reversed(TEXTOS):
            batch_op.drop_column(nombre)
        batch_op.alter_column('lectura_estudiante', new_column_name='lectura')

    with op.batch_alter_table('familia_carrera', schema=None) as batch_op:
        batch_op.drop_column('descripcion')

    with op.batch_alter_table('ocupacion_familia', schema=None) as batch_op:
        batch_op.drop_index('ix_ocupacion_familia_principal_unica', sqlite_where=sa.text('es_principal'),
                            postgresql_where=sa.text('es_principal'))

    op.drop_table('ocupacion_familia')
