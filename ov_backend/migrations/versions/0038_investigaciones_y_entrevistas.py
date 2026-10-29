"""investigaciones y entrevistas: guion, entrevista completa, reacciones, reportes y Leyenda (B13)

Revisión: 0038
Revisión anterior: 0037
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa


revision: str = '0038'
down_revision: Union[str, Sequence[str], None] = '0037'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

EVENTOS_0037 = ("'INGRESO', 'COMPLETA_ACTIVIDAD', 'COMPLETA_BLOQUE', 'RESPUESTA_REFLEXIVA', 'ESCRIBE_ENTRADA_DIARIO', "
                "'ESCRIBE_ENTRADA_LIBRE', 'REGISTRA_CHECK_IN', 'VISTA_CARRERA', 'SUPERA_CASO', 'PUBLICA_ENTREVISTA', "
                "'ESCRIBE_CARTA', 'COMPLETA_CONVERSACION', 'REINICIA_INSTRUMENTO', 'INVITA_A_CREW', 'FORMA_CREW', "
                "'VENCE_DESAFIO_INTACTO', 'REGISTRO_ADECUADO', 'REVELA_RESULTADO', 'SUPERA_BATALLA', 'VISTA_TESTIMONIO', "
                "'VISTA_OCUPACION', 'VISTA_INSTITUCION', 'MARCA_FAVORITO', 'CREA_PLAN', 'ACTUALIZA_PLAN', 'ELIMINA_PLAN', "
                "'VISTA_FICHA', 'MARCA_FAVORITO_FICHA', 'MARCA_FAVORITO_TESTIMONIO'")
NUEVOS_EVENTOS = ('INICIA_INVESTIGACION', 'TERMINA_GUION', 'EDITA_ENTREVISTA', 'VISTA_ENTREVISTA',
                  'MARCA_FAVORITO_ENTREVISTA', 'REACCIONA_ENTREVISTA', 'ENTREVISTA_DESTACADA', 'ENTREVISTA_LEYENDA')
EVENTOS = EVENTOS_0037 + ''.join(f", '{evento}'" for evento in NUEVOS_EVENTOS)
FAVORITOS_0037 = "'CARRERA', 'OCUPACION', 'INSTITUCION', 'FICHA', 'TESTIMONIO'"
FAVORITOS = f"{FAVORITOS_0037}, 'ENTREVISTA'"
REFERENCIAS_0037 = ("'ELECCION', 'TEXTO', 'RESULTADO', 'COINCIDENCIAS', 'RESPUESTA_CUESTIONARIO', 'FAVORITOS', 'PLAN', "
                    "'PLANES', 'PASOS_PLAN_A', 'OPCION_INICIAL'")
REFERENCIAS = f"{REFERENCIAS_0037}, 'LO_QUE_PIENSO'"
PLANES_SIN_FUENTE_0037 = "tipo NOT IN ('PLAN', 'PLANES', 'PASOS_PLAN_A', 'OPCION_INICIAL') OR item_registro_id IS NULL"
PLANES_SIN_FUENTE = ("tipo NOT IN ('PLAN', 'PLANES', 'PASOS_PLAN_A', 'OPCION_INICIAL', 'LO_QUE_PIENSO') "
                     "OR item_registro_id IS NULL")


def _enumerados(eventos, favoritos, referencias, planes_sin_fuente) -> None:
    # --autogenerate no detecta el cambio del CHECK de un enumerado no nativo (como en 0031). El valor más largo
    # (MARCA_FAVORITO_ENTREVISTA) mide 25, igual que el de 0031: el largo del VARCHAR no cambia.
    for tabla, columna in (('evento_uso', 'tipo'), ('condicion_desbloqueo', 'tipo_evento')):
        with op.batch_alter_table(tabla, schema=None) as batch_op:
            batch_op.drop_constraint(op.f(f'ck_{tabla}_tipoeventouso'), type_='check')
            batch_op.create_check_constraint(op.f(f'ck_{tabla}_tipoeventouso'), f"{columna} IN ({eventos})")
    with op.batch_alter_table('favorito', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_favorito_tipofavorito'), type_='check')
        batch_op.create_check_constraint(op.f('ck_favorito_tipofavorito'), f"tipo IN ({favoritos})")
    with op.batch_alter_table('referencia', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_referencia_tiporeferencia'), type_='check')
        batch_op.create_check_constraint(op.f('ck_referencia_tiporeferencia'), f"tipo IN ({referencias})")
        batch_op.drop_constraint(op.f('ck_referencia_planes_sin_fuente'), type_='check')
        batch_op.create_check_constraint(op.f('ck_referencia_planes_sin_fuente'), planes_sin_fuente)


def upgrade() -> None:
    op.create_table('pregunta_base_guion',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('codigo', sa.String(), nullable=False),
    sa.Column('orden', sa.Integer(), nullable=False),
    sa.Column('texto', sa.Text(), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_pregunta_base_guion')),
    sa.UniqueConstraint('codigo', name=op.f('uq_pregunta_base_guion_codigo')),
    sa.UniqueConstraint('orden', name=op.f('uq_pregunta_base_guion_orden'))
    )
    op.create_table('tipo_reaccion',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('codigo', sa.String(), nullable=False),
    sa.Column('nombre', sa.String(), nullable=False),
    sa.Column('descripcion', sa.Text(), nullable=False),
    sa.Column('pregunta', sa.String(), nullable=False),
    sa.Column('comentario_obligatorio', sa.Boolean(), nullable=False),
    sa.Column('icono', sa.String(), nullable=False),
    sa.Column('orden', sa.Integer(), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_tipo_reaccion')),
    sa.UniqueConstraint('codigo', name=op.f('uq_tipo_reaccion_codigo')),
    sa.UniqueConstraint('orden', name=op.f('uq_tipo_reaccion_orden'))
    )
    op.create_table('investigacion',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('codigo', sa.String(), nullable=False),
    sa.Column('cuenta_id', sa.Integer(), nullable=False),
    sa.Column('ocupacion_id', sa.Integer(), nullable=False),
    sa.Column('estado', sa.Enum('EN_CURSO', 'GUIA_LISTA', 'PUBLICADA', name='estadoinvestigacion', native_enum=False, create_constraint=True), nullable=False),
    sa.Column('piensa_dia', sa.Text(), nullable=False),
    sa.Column('piensa_necesita', sa.Text(), nullable=False),
    sa.Column('piensa_duda', sa.Text(), nullable=False),
    sa.Column('sugerencias_vigentes', sa.Boolean(), server_default=sa.false(), nullable=False),
    sa.Column('creada_en', sa.DateTime(), nullable=False),
    sa.Column('guia_lista_en', sa.DateTime(), nullable=True),
    sa.Column('entrevista_id', sa.Integer(), nullable=True),
    sa.CheckConstraint("(estado = 'PUBLICADA') = (entrevista_id IS NOT NULL)", name=op.f('ck_investigacion_publicada_con_entrevista')),
    sa.ForeignKeyConstraint(['cuenta_id'], ['cuenta.id'], name=op.f('fk_investigacion_cuenta_id_cuenta')),
    sa.ForeignKeyConstraint(['entrevista_id'], ['entrevista.id'], name=op.f('fk_investigacion_entrevista_id_entrevista')),
    sa.ForeignKeyConstraint(['ocupacion_id'], ['ocupacion.id'], name=op.f('fk_investigacion_ocupacion_id_ocupacion')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_investigacion')),
    sa.UniqueConstraint('codigo', name=op.f('uq_investigacion_codigo'))
    )
    with op.batch_alter_table('investigacion', schema=None) as batch_op:
        batch_op.create_index('investigacion_activa_unica', ['cuenta_id'], unique=True, sqlite_where=sa.text("estado IN ('EN_CURSO', 'GUIA_LISTA')"), postgresql_where=sa.text("estado IN ('EN_CURSO', 'GUIA_LISTA')"))

    op.create_table('reaccion',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('codigo', sa.String(), nullable=False),
    sa.Column('entrevista_id', sa.Integer(), nullable=False),
    sa.Column('cuenta_id', sa.Integer(), nullable=False),
    sa.Column('tipo_reaccion_id', sa.Integer(), nullable=True),
    sa.Column('comentario', sa.Text(), nullable=True),
    sa.Column('creada_en', sa.DateTime(), nullable=False),
    sa.Column('editada_en', sa.DateTime(), nullable=True),
    sa.Column('eliminada_en', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['cuenta_id'], ['cuenta.id'], name=op.f('fk_reaccion_cuenta_id_cuenta')),
    sa.ForeignKeyConstraint(['entrevista_id'], ['entrevista.id'], name=op.f('fk_reaccion_entrevista_id_entrevista')),
    sa.ForeignKeyConstraint(['tipo_reaccion_id'], ['tipo_reaccion.id'], name=op.f('fk_reaccion_tipo_reaccion_id_tipo_reaccion')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_reaccion')),
    sa.UniqueConstraint('codigo', name=op.f('uq_reaccion_codigo'))
    )
    with op.batch_alter_table('reaccion', schema=None) as batch_op:
        batch_op.create_index('reaccion_estudiante_unica', ['entrevista_id', 'cuenta_id'], unique=True, sqlite_where=sa.text('tipo_reaccion_id IS NOT NULL AND eliminada_en IS NULL'), postgresql_where=sa.text('tipo_reaccion_id IS NOT NULL AND eliminada_en IS NULL'))

    op.create_table('pregunta_guion',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('investigacion_id', sa.Integer(), nullable=False),
    sa.Column('posicion', sa.Integer(), nullable=False),
    sa.Column('origen', sa.Enum('DUDA', 'SUGERIDA', 'PROPIA', name='origenpreguntaguion', native_enum=False, create_constraint=True), nullable=False),
    sa.Column('texto', sa.Text(), nullable=False),
    sa.ForeignKeyConstraint(['investigacion_id'], ['investigacion.id'], name=op.f('fk_pregunta_guion_investigacion_id_investigacion')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_pregunta_guion')),
    sa.UniqueConstraint('investigacion_id', 'posicion', name=op.f('uq_pregunta_guion_investigacion_id'))
    )
    op.create_table('reporte',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('codigo', sa.String(), nullable=False),
    sa.Column('cuenta_id', sa.Integer(), nullable=False),
    sa.Column('entrevista_id', sa.Integer(), nullable=True),
    sa.Column('reaccion_id', sa.Integer(), nullable=True),
    sa.Column('motivo', sa.Enum('OFENSIVO', 'VIDEO', 'DATOS_PRIVADOS', 'OTRO', name='motivoreporte', native_enum=False, create_constraint=True), nullable=False),
    sa.Column('detalle', sa.Text(), nullable=True),
    sa.Column('estado', sa.Enum('PENDIENTE', 'DESCARTADO', 'RESUELTO', name='estadoreporte', native_enum=False, create_constraint=True), nullable=False),
    sa.Column('fecha_hora', sa.DateTime(), nullable=False),
    sa.CheckConstraint('(entrevista_id IS NULL) <> (reaccion_id IS NULL)', name=op.f('ck_reporte_un_contenido')),
    sa.ForeignKeyConstraint(['cuenta_id'], ['cuenta.id'], name=op.f('fk_reporte_cuenta_id_cuenta')),
    sa.ForeignKeyConstraint(['entrevista_id'], ['entrevista.id'], name=op.f('fk_reporte_entrevista_id_entrevista')),
    sa.ForeignKeyConstraint(['reaccion_id'], ['reaccion.id'], name=op.f('fk_reporte_reaccion_id_reaccion')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_reporte')),
    sa.UniqueConstraint('codigo', name=op.f('uq_reporte_codigo'))
    )
    with op.batch_alter_table('reporte', schema=None) as batch_op:
        batch_op.create_index('reporte_entrevista_unico', ['cuenta_id', 'entrevista_id'], unique=True, sqlite_where=sa.text('entrevista_id IS NOT NULL'), postgresql_where=sa.text('entrevista_id IS NOT NULL'))
        batch_op.create_index('reporte_reaccion_unico', ['cuenta_id', 'reaccion_id'], unique=True, sqlite_where=sa.text('reaccion_id IS NOT NULL'), postgresql_where=sa.text('reaccion_id IS NOT NULL'))

    op.create_table('sugerencia_guion',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('codigo', sa.String(), nullable=False),
    sa.Column('investigacion_id', sa.Integer(), nullable=False),
    sa.Column('texto', sa.Text(), nullable=False),
    sa.Column('estado', sa.Enum('PENDIENTE', 'AGREGADA', 'DESCARTADA', name='estadosugerenciaguion', native_enum=False, create_constraint=True), nullable=False),
    sa.ForeignKeyConstraint(['investigacion_id'], ['investigacion.id'], name=op.f('fk_sugerencia_guion_investigacion_id_investigacion')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_sugerencia_guion')),
    sa.UniqueConstraint('codigo', name=op.f('uq_sugerencia_guion_codigo'))
    )
    # Las entrevistas anteriores solo tenían resumen (nunca hubo pantalla que las publicara): se vacían para poder
    # agregar las columnas obligatorias.
    op.execute(sa.text('DELETE FROM entrevista_autor'))
    op.execute(sa.text('DELETE FROM entrevista'))
    with op.batch_alter_table('entrevista', schema=None) as batch_op:
        batch_op.add_column(sa.Column('ocupacion_id', sa.Integer(), nullable=False))
        batch_op.add_column(sa.Column('titulo', sa.String(), nullable=False))
        batch_op.add_column(sa.Column('profesional', sa.String(), nullable=False))
        batch_op.add_column(sa.Column('duracion', sa.String(), nullable=False))
        batch_op.add_column(sa.Column('enlace', sa.String(), nullable=False))
        batch_op.add_column(sa.Column('busqueda', sa.String(), nullable=False))
        batch_op.add_column(sa.Column('estado', sa.Enum('PUBLICADA', 'RETIRADA', 'ELIMINADA', name='estadoentrevista', native_enum=False, create_constraint=True), nullable=False))
        batch_op.add_column(sa.Column('editada_en', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('destacada_en', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('destacada_por', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('leyenda_en', sa.DateTime(), nullable=True))
        batch_op.create_foreign_key(batch_op.f('fk_entrevista_destacada_por_cuenta'), 'cuenta', ['destacada_por'], ['id'])
        batch_op.create_foreign_key(batch_op.f('fk_entrevista_ocupacion_id_ocupacion'), 'ocupacion', ['ocupacion_id'], ['id'])
        batch_op.create_check_constraint(op.f('ck_entrevista_leyenda_destacada'),
                                         'leyenda_en IS NULL OR destacada_en IS NOT NULL')
    _enumerados(EVENTOS, FAVORITOS, REFERENCIAS, PLANES_SIN_FUENTE)


def downgrade() -> None:
    # Evita iniciar una reconstrucción que dejaría una tabla temporal en SQLite.
    if not context.is_offline_mode():
        evento = sa.table('evento_uso', sa.column('tipo', sa.String()))
        condicion = sa.table('condicion_desbloqueo', sa.column('tipo_evento', sa.String()))
        favorito = sa.table('favorito', sa.column('tipo', sa.String()))
        referencia = sa.table('referencia', sa.column('tipo', sa.String()))
        enlace = op.get_bind()
        if (enlace.execute(sa.select(evento.c.tipo).where(evento.c.tipo.in_(NUEVOS_EVENTOS)).limit(1)).first()
                or enlace.execute(sa.select(condicion.c.tipo_evento).where(
                    condicion.c.tipo_evento.in_(NUEVOS_EVENTOS)).limit(1)).first()
                or enlace.execute(sa.select(favorito.c.tipo).where(favorito.c.tipo == 'ENTREVISTA').limit(1)).first()
                or enlace.execute(sa.select(referencia.c.tipo).where(
                    referencia.c.tipo == 'LO_QUE_PIENSO').limit(1)).first()):
            raise RuntimeError('No se puede volver a 0037: existen eventos, favoritos o referencias de investigaciones.')
    _enumerados(EVENTOS_0037, FAVORITOS_0037, REFERENCIAS_0037, PLANES_SIN_FUENTE_0037)
    op.execute(sa.text('DELETE FROM entrevista_autor'))
    op.execute(sa.text('DELETE FROM entrevista'))
    op.drop_table('sugerencia_guion')
    with op.batch_alter_table('reporte', schema=None) as batch_op:
        batch_op.drop_index('reporte_reaccion_unico', sqlite_where=sa.text('reaccion_id IS NOT NULL'), postgresql_where=sa.text('reaccion_id IS NOT NULL'))
        batch_op.drop_index('reporte_entrevista_unico', sqlite_where=sa.text('entrevista_id IS NOT NULL'), postgresql_where=sa.text('entrevista_id IS NOT NULL'))

    op.drop_table('reporte')
    op.drop_table('pregunta_guion')
    with op.batch_alter_table('reaccion', schema=None) as batch_op:
        batch_op.drop_index('reaccion_estudiante_unica', sqlite_where=sa.text('tipo_reaccion_id IS NOT NULL AND eliminada_en IS NULL'), postgresql_where=sa.text('tipo_reaccion_id IS NOT NULL AND eliminada_en IS NULL'))

    op.drop_table('reaccion')
    with op.batch_alter_table('investigacion', schema=None) as batch_op:
        batch_op.drop_index('investigacion_activa_unica', sqlite_where=sa.text("estado IN ('EN_CURSO', 'GUIA_LISTA')"), postgresql_where=sa.text("estado IN ('EN_CURSO', 'GUIA_LISTA')"))

    op.drop_table('investigacion')
    op.drop_table('tipo_reaccion')
    op.drop_table('pregunta_base_guion')
    with op.batch_alter_table('entrevista', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_entrevista_leyenda_destacada'), type_='check')
        batch_op.drop_constraint(op.f('ck_entrevista_estadoentrevista'), type_='check')
        batch_op.drop_constraint(batch_op.f('fk_entrevista_ocupacion_id_ocupacion'), type_='foreignkey')
        batch_op.drop_constraint(batch_op.f('fk_entrevista_destacada_por_cuenta'), type_='foreignkey')
        batch_op.drop_column('leyenda_en')
        batch_op.drop_column('destacada_por')
        batch_op.drop_column('destacada_en')
        batch_op.drop_column('editada_en')
        batch_op.drop_column('estado')
        batch_op.drop_column('busqueda')
        batch_op.drop_column('enlace')
        batch_op.drop_column('duracion')
        batch_op.drop_column('profesional')
        batch_op.drop_column('titulo')
        batch_op.drop_column('ocupacion_id')
