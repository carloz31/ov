"""secciones salon y mensajes

Revisión: 0004
Revisión anterior: 0003
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa


revision: str = '0004'
down_revision: Union[str, Sequence[str], None] = '0003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ROLES = "'ESTUDIANTE', 'APODERADO'"
OBJETIVOS = "'BLOQUE', 'ACTIVIDAD', 'FICHA', 'TESTIMONIO', 'PREGUNTA_DIARIO', '{}', 'INSIGNIA', 'NIVEL'"
OBJETIVO_SEGUN_TIPO = (
    "(tipo_objetivo = 'CONVERSACIONES' AND id_objetivo IS NULL) OR "
    "(tipo_objetivo != 'CONVERSACIONES' AND id_objetivo IS NOT NULL)"
)


def _audiencia():
    return sa.Enum('ESTUDIANTE', 'APODERADO', name='audiencia', native_enum=False, create_constraint=True)


def upgrade() -> None:
    op.create_table('salon',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('codigo', sa.String(), nullable=False),
    sa.Column('nombre', sa.String(), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_salon')),
    sa.UniqueConstraint('codigo', name=op.f('uq_salon_codigo'))
    )
    op.create_table('seccion',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('codigo', sa.String(), nullable=False),
    sa.Column('nombre', sa.String(), nullable=False),
    sa.Column('audiencia', _audiencia(), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_seccion')),
    sa.UniqueConstraint('codigo', name=op.f('uq_seccion_codigo'))
    )
    op.create_table('orientadora_salon',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('orientadora_id', sa.Integer(), nullable=False),
    sa.Column('salon_id', sa.Integer(), nullable=False),
    sa.Column('es_principal', sa.Boolean(), nullable=False),
    sa.ForeignKeyConstraint(['orientadora_id'], ['cuenta.id'], name=op.f('fk_orientadora_salon_orientadora_id_cuenta')),
    sa.ForeignKeyConstraint(['salon_id'], ['salon.id'], name=op.f('fk_orientadora_salon_salon_id_salon')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_orientadora_salon')),
    sa.UniqueConstraint('orientadora_id', 'salon_id', name=op.f('uq_orientadora_salon_orientadora_id'))
    )
    with op.batch_alter_table('actividad', schema=None) as batch_op:
        batch_op.add_column(sa.Column('requerida', sa.Boolean(), server_default=sa.true(), nullable=False))
        batch_op.add_column(sa.Column('duracion_estimada_min', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('descripcion', sa.Text(), nullable=True))

    # --autogenerate no detecta el CHECK de los enumerados no nativos; el largo de `rol` pasa de 10 a 11.
    with op.batch_alter_table('cuenta', schema=None) as batch_op:
        batch_op.add_column(sa.Column('salon_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('correo', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('contrasena_hash', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('activa', sa.Boolean(), server_default=sa.true(), nullable=False))
        batch_op.drop_constraint(op.f('ck_cuenta_rol'), type_='check')
        batch_op.alter_column('rol', existing_type=sa.String(length=10), type_=sa.String(length=11),
                              existing_nullable=False)
        batch_op.create_check_constraint(op.f('ck_cuenta_rol'), f"rol IN ({ROLES}, 'ORIENTADORA')")
        batch_op.create_unique_constraint(batch_op.f('uq_cuenta_correo'), ['correo'])
        batch_op.create_foreign_key(batch_op.f('fk_cuenta_salon_id_salon'), 'salon', ['salon_id'], ['id'])

    with op.batch_alter_table('ficha', schema=None) as batch_op:
        batch_op.add_column(sa.Column('audiencia', _audiencia(), server_default=sa.text("'ESTUDIANTE'"),
                                      nullable=False))

    with op.batch_alter_table('regla_desbloqueo', schema=None) as batch_op:
        batch_op.add_column(sa.Column('mensaje_bloqueo', sa.Text(), nullable=True))
        batch_op.drop_constraint(op.f('ck_regla_desbloqueo_objetivo_segun_tipo'), type_='check')
        batch_op.drop_constraint(op.f('ck_regla_desbloqueo_tipoobjetivo'), type_='check')
        batch_op.create_check_constraint(
            op.f('ck_regla_desbloqueo_tipoobjetivo'),
            f"tipo_objetivo IN ({OBJETIVOS.format('CONVERSACIONES')}, 'SECCION')",
        )
    # Las reglas existentes toman su nombre como mensaje; las de CONVERSACIONES pasan a la sección
    # CONVERSACIONES del apoderado.
    regla = sa.table('regla_desbloqueo', sa.column('nombre', sa.String()), sa.column('mensaje_bloqueo', sa.Text()),
                     sa.column('tipo_objetivo', sa.String()), sa.column('id_objetivo', sa.Integer()))
    op.execute(regla.update().values(mensaje_bloqueo=regla.c.nombre))
    if not context.is_offline_mode():
        conexion = op.get_bind()
        conversaciones = sa.select(regla.c.nombre).where(regla.c.tipo_objetivo == 'CONVERSACIONES').limit(1)
        if conexion.execute(conversaciones).first() is not None:
            seccion = sa.table('seccion', sa.column('id', sa.Integer()), sa.column('codigo', sa.String()),
                               sa.column('nombre', sa.String()), sa.column('audiencia', sa.String()))
            conexion.execute(seccion.insert().values(codigo='CONVERSACIONES', nombre='Conversaciones',
                                                     audiencia='APODERADO'))
            identificador = conexion.execute(
                sa.select(seccion.c.id).where(seccion.c.codigo == 'CONVERSACIONES'),
            ).scalar_one()
            conexion.execute(regla.update().where(regla.c.tipo_objetivo == 'CONVERSACIONES').values(
                tipo_objetivo='SECCION', id_objetivo=identificador,
            ))
    with op.batch_alter_table('regla_desbloqueo', schema=None) as batch_op:
        batch_op.alter_column('mensaje_bloqueo', existing_type=sa.Text(), nullable=False)
        batch_op.alter_column('id_objetivo', existing_type=sa.Integer(), nullable=False)
        batch_op.drop_constraint(op.f('ck_regla_desbloqueo_tipoobjetivo'), type_='check')
        batch_op.create_check_constraint(
            op.f('ck_regla_desbloqueo_tipoobjetivo'), f"tipo_objetivo IN ({OBJETIVOS.format('SECCION')})",
        )

    with op.batch_alter_table('vinculo_familiar', schema=None) as batch_op:
        batch_op.add_column(sa.Column('parentesco', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('es_activo', sa.Boolean(), server_default=sa.true(), nullable=False))


def downgrade() -> None:
    # Evita iniciar una reconstrucción que dejaría una tabla temporal en SQLite.
    if not context.is_offline_mode():
        conexion = op.get_bind()
        cuenta = sa.table('cuenta', sa.column('rol', sa.String()))
        regla = sa.table('regla_desbloqueo', sa.column('tipo_objetivo', sa.String()))
        if conexion.execute(sa.select(cuenta.c.rol).where(cuenta.c.rol == 'ORIENTADORA').limit(1)).first():
            raise RuntimeError('No se puede volver a 0003: existen cuentas ORIENTADORA.')
        if conexion.execute(sa.select(regla.c.tipo_objetivo).where(
            regla.c.tipo_objetivo == 'SECCION',
        ).limit(1)).first():
            raise RuntimeError('No se puede volver a 0003: existen reglas de SECCION.')
    with op.batch_alter_table('vinculo_familiar', schema=None) as batch_op:
        batch_op.drop_column('es_activo')
        batch_op.drop_column('parentesco')

    with op.batch_alter_table('regla_desbloqueo', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_regla_desbloqueo_tipoobjetivo'), type_='check')
        batch_op.create_check_constraint(
            op.f('ck_regla_desbloqueo_tipoobjetivo'), f"tipo_objetivo IN ({OBJETIVOS.format('CONVERSACIONES')})",
        )
        batch_op.alter_column('id_objetivo', existing_type=sa.Integer(), nullable=True)
        batch_op.create_check_constraint(op.f('ck_regla_desbloqueo_objetivo_segun_tipo'), OBJETIVO_SEGUN_TIPO)
        batch_op.drop_column('mensaje_bloqueo')

    with op.batch_alter_table('ficha', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_ficha_audiencia'), type_='check')
        batch_op.drop_column('audiencia')

    with op.batch_alter_table('cuenta', schema=None) as batch_op:
        batch_op.drop_constraint(batch_op.f('fk_cuenta_salon_id_salon'), type_='foreignkey')
        batch_op.drop_constraint(batch_op.f('uq_cuenta_correo'), type_='unique')
        batch_op.drop_constraint(op.f('ck_cuenta_rol'), type_='check')
        batch_op.alter_column('rol', existing_type=sa.String(length=11), type_=sa.String(length=10),
                              existing_nullable=False)
        batch_op.create_check_constraint(op.f('ck_cuenta_rol'), f"rol IN ({ROLES})")
        batch_op.drop_column('activa')
        batch_op.drop_column('contrasena_hash')
        batch_op.drop_column('correo')
        batch_op.drop_column('salon_id')

    with op.batch_alter_table('actividad', schema=None) as batch_op:
        batch_op.drop_column('descripcion')
        batch_op.drop_column('duracion_estimada_min')
        batch_op.drop_column('requerida')

    op.drop_table('orientadora_salon')
    op.drop_table('seccion')
    op.drop_table('salon')
