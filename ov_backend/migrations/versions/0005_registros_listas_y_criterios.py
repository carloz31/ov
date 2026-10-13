"""registros listas y criterios

Revisión: 0005
Revisión anterior: 0004
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa

from app.database import TipoJSON


revision: str = '0005'
down_revision: Union[str, Sequence[str], None] = '0004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

EVENTOS = ("'INGRESO', 'COMPLETA_ACTIVIDAD', 'COMPLETA_BLOQUE', 'RESPUESTA_REFLEXIVA', 'ESCRIBE_ENTRADA_DIARIO', "
           "'ESCRIBE_ENTRADA_LIBRE', 'REGISTRA_CHECK_IN', 'VISTA_CARRERA', 'SUPERA_CASO', 'PUBLICA_ENTREVISTA', "
           "'ESCRIBE_CARTA', 'COMPLETA_CONVERSACION', 'REINICIA_INSTRUMENTO', 'INVITA_A_CREW', 'FORMA_CREW', "
           "'VENCE_DESAFIO_INTACTO'")
CLASIFICACIONES = "'ADECUADA', '{}', 'NO_EVALUADA'"
ELECCION_VALIDA = (
    "(lista_id IS NULL AND eleccion_minima IS NULL AND eleccion_maxima IS NULL"
    " AND eleccion_ordenada = false AND permite_otra = false)"
    " OR (lista_id IS NOT NULL AND eleccion_minima >= 0 AND eleccion_maxima >= 1"
    " AND eleccion_maxima >= eleccion_minima)"
)
# Columnas con la clasificación: (tabla, columna, nula).
COLUMNAS_CLASIFICACION = (('respuesta_registro', 'clasificacion_inicial', True),
                          ('evaluacion_respuesta', 'clasificacion', False))


def _eventos(tabla, columna, con_registro):
    # --autogenerate no detecta el CHECK de los enumerados no nativos.
    valores = f"{EVENTOS}, 'REGISTRO_ADECUADO'" if con_registro else EVENTOS
    with op.batch_alter_table(tabla, schema=None) as batch_op:
        batch_op.drop_constraint(op.f(f'ck_{tabla}_tipoeventouso'), type_='check')
        batch_op.create_check_constraint(op.f(f'ck_{tabla}_tipoeventouso'), f"{columna} IN ({valores})")


def _clasificacion(anterior, nueva, largo_anterior, largo_nuevo):
    for tabla, columna, nula in COLUMNAS_CLASIFICACION:
        with op.batch_alter_table(tabla, schema=None) as batch_op:
            batch_op.drop_constraint(op.f(f'ck_{tabla}_clasificacionrespuesta'), type_='check')
            batch_op.alter_column(columna, existing_type=sa.String(length=largo_anterior),
                                  type_=sa.String(length=largo_nuevo), existing_nullable=nula)
        filas = sa.table(tabla, sa.column(columna, sa.String()))
        op.execute(filas.update().where(filas.c[columna] == anterior).values({columna: nueva}))
        with op.batch_alter_table(tabla, schema=None) as batch_op:
            batch_op.create_check_constraint(op.f(f'ck_{tabla}_clasificacionrespuesta'),
                                             f"{columna} IN ({CLASIFICACIONES.format(nueva)})")


def upgrade() -> None:
    if not context.is_offline_mode():
        conexion = op.get_bind()
        sueltos = conexion.execute(sa.text(
            'SELECT codigo FROM item_registro WHERE id NOT IN (SELECT item_registro_id FROM actividad_item_registro)'
        )).first()
        if sueltos is not None:
            raise RuntimeError(f'No se puede migrar: el ítem {sueltos[0]} no pertenece a ninguna actividad.')
    op.create_table('lista_opciones',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('codigo', sa.String(), nullable=False),
    sa.Column('nombre', sa.String(), nullable=False),
    sa.Column('comun', sa.Boolean(), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_lista_opciones')),
    sa.UniqueConstraint('codigo', name=op.f('uq_lista_opciones_codigo'))
    )
    op.create_table('opcion_lista',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('lista_id', sa.Integer(), nullable=False),
    sa.Column('codigo', sa.String(), nullable=False),
    sa.Column('texto', sa.Text(), nullable=False),
    sa.Column('orden', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['lista_id'], ['lista_opciones.id'], name=op.f('fk_opcion_lista_lista_id_lista_opciones')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_opcion_lista')),
    sa.UniqueConstraint('lista_id', 'codigo', name='uq_opcion_lista_codigo'),
    sa.UniqueConstraint('lista_id', 'orden', name='uq_opcion_lista_orden')
    )

    # Cada ítem pasa a pertenecer a una actividad; si estaba en varias, conserva la de menor id.
    with op.batch_alter_table('item_registro', schema=None) as batch_op:
        batch_op.add_column(sa.Column('actividad_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('orden', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('nucleo', sa.Boolean(), server_default=sa.false(), nullable=False))
        batch_op.add_column(sa.Column('lista_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('eleccion_minima', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('eleccion_maxima', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('eleccion_ordenada', sa.Boolean(), server_default=sa.false(), nullable=False))
        batch_op.add_column(sa.Column('permite_otra', sa.Boolean(), server_default=sa.false(), nullable=False))
    op.execute(
        'UPDATE item_registro SET '
        'actividad_id = (SELECT MIN(r.actividad_id) FROM actividad_item_registro r'
        ' WHERE r.item_registro_id = item_registro.id), '
        'orden = (SELECT MIN(r.orden) FROM actividad_item_registro r WHERE r.item_registro_id = item_registro.id'
        ' AND r.actividad_id = (SELECT MIN(s.actividad_id) FROM actividad_item_registro s'
        ' WHERE s.item_registro_id = item_registro.id))'
    )
    with op.batch_alter_table('item_registro', schema=None) as batch_op:
        batch_op.alter_column('actividad_id', existing_type=sa.Integer(), nullable=False)
        batch_op.alter_column('orden', existing_type=sa.Integer(), nullable=False)
        batch_op.alter_column('min_caracteres', existing_type=sa.INTEGER(), nullable=True)
        batch_op.create_unique_constraint(batch_op.f('uq_item_registro_actividad_id'), ['actividad_id', 'orden'])
        batch_op.create_foreign_key(batch_op.f('fk_item_registro_actividad_id_actividad'), 'actividad',
                                    ['actividad_id'], ['id'])
        batch_op.create_foreign_key(batch_op.f('fk_item_registro_lista_id_lista_opciones'), 'lista_opciones',
                                    ['lista_id'], ['id'])
        batch_op.create_check_constraint(op.f('ck_item_registro_min_caracteres_valido'),
                                         'min_caracteres IS NULL OR min_caracteres >= 1')
        batch_op.create_check_constraint(op.f('ck_item_registro_eleccion_valida'), ELECCION_VALIDA)
    op.drop_table('actividad_item_registro')

    # Los criterios existentes toman el tipo EJEMPLO y la repregunta genérica de su ítem.
    with op.batch_alter_table('criterio_completitud', schema=None) as batch_op:
        batch_op.add_column(sa.Column('tipo', sa.Enum('EJEMPLO', 'RAZON', 'ACCION', 'CONTRASTE', name='tipocriterio',
                                                      native_enum=False, create_constraint=True), nullable=True))
        batch_op.add_column(sa.Column('repregunta', sa.Text(), nullable=True))
    op.execute("UPDATE criterio_completitud SET tipo = 'EJEMPLO', repregunta = (SELECT i.repregunta_generica"
               " FROM item_registro i WHERE i.id = criterio_completitud.item_registro_id)")
    with op.batch_alter_table('criterio_completitud', schema=None) as batch_op:
        batch_op.alter_column('tipo', existing_type=sa.String(length=9), nullable=False)
        batch_op.alter_column('repregunta', existing_type=sa.Text(), nullable=False)

    _clasificacion('VAGA', 'POCO_DESARROLLADA', 11, 17)

    with op.batch_alter_table('respuesta_registro', schema=None) as batch_op:
        batch_op.add_column(sa.Column('opciones_elegidas', sa.JSON(none_as_null=True), server_default=sa.text("'[]'"),
                                      nullable=False))
        batch_op.add_column(sa.Column('texto_consolidado', sa.Text(), nullable=True))
        batch_op.create_check_constraint(op.f('ck_respuesta_registro_opciones_elegidas_lista'),
                                         TipoJSON(sa.column('opciones_elegidas')) == 'array')

    _eventos('evento_uso', 'tipo', True)
    _eventos('condicion_desbloqueo', 'tipo_evento', True)


def downgrade() -> None:
    # Evita iniciar una reconstrucción que dejaría una tabla temporal en SQLite.
    if not context.is_offline_mode():
        conexion = op.get_bind()
        for tabla, columna in (('evento_uso', 'tipo'), ('condicion_desbloqueo', 'tipo_evento')):
            if conexion.execute(sa.text(f"SELECT 1 FROM {tabla} WHERE {columna} = 'REGISTRO_ADECUADO'")).first():
                raise RuntimeError(f'No se puede volver a 0004: {tabla} usa REGISTRO_ADECUADO.')
        if conexion.execute(sa.text('SELECT 1 FROM item_registro WHERE lista_id IS NOT NULL')).first():
            raise RuntimeError('No se puede volver a 0004: hay ítems con elección.')
    _eventos('condicion_desbloqueo', 'tipo_evento', False)
    _eventos('evento_uso', 'tipo', False)

    with op.batch_alter_table('respuesta_registro', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_respuesta_registro_opciones_elegidas_lista'), type_='check')
        batch_op.drop_column('texto_consolidado')
        batch_op.drop_column('opciones_elegidas')

    _clasificacion('POCO_DESARROLLADA', 'VAGA', 17, 11)

    with op.batch_alter_table('criterio_completitud', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_criterio_completitud_tipocriterio'), type_='check')
        batch_op.drop_column('repregunta')
        batch_op.drop_column('tipo')

    op.create_table('actividad_item_registro',
    sa.Column('actividad_id', sa.INTEGER(), nullable=False),
    sa.Column('item_registro_id', sa.INTEGER(), nullable=False),
    sa.Column('orden', sa.INTEGER(), nullable=False),
    sa.ForeignKeyConstraint(['actividad_id'], ['actividad.id'], name=op.f('fk_actividad_item_registro_actividad_id_actividad')),
    sa.ForeignKeyConstraint(['item_registro_id'], ['item_registro.id'], name=op.f('fk_actividad_item_registro_item_registro_id_item_registro')),
    sa.PrimaryKeyConstraint('actividad_id', 'item_registro_id', name=op.f('pk_actividad_item_registro'))
    )
    op.execute('INSERT INTO actividad_item_registro (actividad_id, item_registro_id, orden)'
               ' SELECT actividad_id, id, orden FROM item_registro')
    op.execute('UPDATE item_registro SET min_caracteres = 1 WHERE min_caracteres IS NULL')
    with op.batch_alter_table('item_registro', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_item_registro_eleccion_valida'), type_='check')
        batch_op.drop_constraint(op.f('ck_item_registro_min_caracteres_valido'), type_='check')
        batch_op.drop_constraint(batch_op.f('fk_item_registro_lista_id_lista_opciones'), type_='foreignkey')
        batch_op.drop_constraint(batch_op.f('fk_item_registro_actividad_id_actividad'), type_='foreignkey')
        batch_op.drop_constraint(batch_op.f('uq_item_registro_actividad_id'), type_='unique')
        batch_op.alter_column('min_caracteres', existing_type=sa.INTEGER(), nullable=False)
        batch_op.drop_column('permite_otra')
        batch_op.drop_column('eleccion_ordenada')
        batch_op.drop_column('eleccion_maxima')
        batch_op.drop_column('eleccion_minima')
        batch_op.drop_column('lista_id')
        batch_op.drop_column('nucleo')
        batch_op.drop_column('orden')
        batch_op.drop_column('actividad_id')

    op.drop_table('opcion_lista')
    op.drop_table('lista_opciones')
