"""planes de carrera: tarjetas, secciones, referencias de rubros y caminos, gestión y duración

Revisión: 0017
Revisión anterior: 0016
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa


revision: str = '0017'
down_revision: Union[str, Sequence[str], None] = '0016'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

EVENTOS_0016 = ("'INGRESO', 'COMPLETA_ACTIVIDAD', 'COMPLETA_BLOQUE', 'RESPUESTA_REFLEXIVA', 'ESCRIBE_ENTRADA_DIARIO', "
                "'ESCRIBE_ENTRADA_LIBRE', 'REGISTRA_CHECK_IN', 'VISTA_CARRERA', 'SUPERA_CASO', 'PUBLICA_ENTREVISTA', "
                "'ESCRIBE_CARTA', 'COMPLETA_CONVERSACION', 'REINICIA_INSTRUMENTO', 'INVITA_A_CREW', 'FORMA_CREW', "
                "'VENCE_DESAFIO_INTACTO', 'REGISTRO_ADECUADO', 'REVELA_RESULTADO', 'SUPERA_BATALLA', 'VISTA_TESTIMONIO', "
                "'VISTA_OCUPACION', 'VISTA_INSTITUCION', 'MARCA_FAVORITO'")
EVENTOS = f"{EVENTOS_0016}, 'CREA_PLAN', 'ACTUALIZA_PLAN', 'ELIMINA_PLAN'"
OBJETIVOS_0016 = "'BLOQUE', 'ACTIVIDAD', 'FICHA', 'TESTIMONIO', 'PREGUNTA_DIARIO', 'SECCION', 'INSIGNIA', 'NIVEL'"
OBJETIVOS = f"{OBJETIVOS_0016}, 'SECCION_PLAN'"
REFERENCIAS_0016 = "'ELECCION', 'TEXTO', 'RESULTADO', 'COINCIDENCIAS', 'RESPUESTA_CUESTIONARIO', 'FAVORITOS'"
REFERENCIAS = f"{REFERENCIAS_0016}, 'PLAN', 'PLANES', 'PASOS_PLAN_A', 'OPCION_INICIAL'"
PLANES_SIN_FUENTE = "tipo NOT IN ('PLAN', 'PLANES', 'PASOS_PLAN_A', 'OPCION_INICIAL') OR item_registro_id IS NULL"
FK_DUDA_PASO = 'fk_duda_tarjeta_cerrada_por_paso_id_paso_tarjeta'


def _enumerados(eventos, objetivos, referencias):
    # --autogenerate no detecta el CHECK de los enumerados no nativos.
    for tabla, columna in (('evento_uso', 'tipo'), ('condicion_desbloqueo', 'tipo_evento')):
        with op.batch_alter_table(tabla, schema=None) as batch_op:
            batch_op.drop_constraint(op.f(f'ck_{tabla}_tipoeventouso'), type_='check')
            batch_op.create_check_constraint(op.f(f'ck_{tabla}_tipoeventouso'), f"{columna} IN ({eventos})")
    with op.batch_alter_table('regla_desbloqueo', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_regla_desbloqueo_tipoobjetivo'), type_='check')
        batch_op.create_check_constraint(op.f('ck_regla_desbloqueo_tipoobjetivo'), f"tipo_objetivo IN ({objetivos})")
    with op.batch_alter_table('referencia', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_referencia_tiporeferencia'), type_='check')
        batch_op.create_check_constraint(op.f('ck_referencia_tiporeferencia'), f"tipo IN ({referencias})")


def upgrade() -> None:
    op.create_table('seccion_tarjeta',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('codigo', sa.String(), nullable=False),
    sa.Column('nombre', sa.String(), nullable=False),
    sa.Column('orden', sa.Integer(), nullable=False),
    sa.Column('para_comparar', sa.Boolean(), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_seccion_tarjeta')),
    sa.UniqueConstraint('codigo', name=op.f('uq_seccion_tarjeta_codigo')),
    sa.UniqueConstraint('orden', name=op.f('uq_seccion_tarjeta_orden'))
    )
    op.create_table('referencia_camino',
    sa.Column('opcion_id', sa.Integer(), nullable=False),
    sa.Column('incluye_preparacion', sa.Boolean(), nullable=False),
    sa.ForeignKeyConstraint(['opcion_id'], ['opcion_lista.id'], name=op.f('fk_referencia_camino_opcion_id_opcion_lista')),
    sa.PrimaryKeyConstraint('opcion_id', name=op.f('pk_referencia_camino'))
    )
    op.create_table('referencia_rubro',
    sa.Column('opcion_id', sa.Integer(), nullable=False),
    sa.Column('frecuencia_recomendada', sa.Enum('UNICA', 'MENSUAL', 'POR_CICLO', 'ANUAL', name='frecuenciagasto', native_enum=False, create_constraint=True), nullable=False),
    sa.Column('monto_referencia', sa.Integer(), nullable=False),
    sa.Column('cero_si_publica', sa.Boolean(), server_default=sa.false(), nullable=False),
    sa.Column('solo_si_camino_prepara', sa.Boolean(), server_default=sa.false(), nullable=False),
    sa.CheckConstraint('monto_referencia >= 0', name=op.f('ck_referencia_rubro_monto_valido')),
    sa.ForeignKeyConstraint(['opcion_id'], ['opcion_lista.id'], name=op.f('fk_referencia_rubro_opcion_id_opcion_lista')),
    sa.PrimaryKeyConstraint('opcion_id', name=op.f('pk_referencia_rubro'))
    )
    op.create_table('tarjeta_carrera',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('cuenta_id', sa.Integer(), nullable=False),
    sa.Column('carrera_id', sa.Integer(), nullable=False),
    sa.Column('prioridad', sa.Integer(), nullable=False),
    sa.Column('creada_en', sa.DateTime(), nullable=False),
    sa.Column('actualizada_en', sa.DateTime(), nullable=False),
    sa.Column('idea_origen', sa.Enum('MIA', 'FAMILIA', 'CONOCIDO', 'TEST', 'PLATAFORMA', name='origenidea', native_enum=False, create_constraint=True), nullable=True),
    sa.Column('relato', sa.Text(), nullable=True),
    sa.Column('institucion_id', sa.Integer(), nullable=True),
    sa.Column('camino_opcion_id', sa.Integer(), nullable=True),
    sa.Column('camino_otro', sa.Text(), nullable=True),
    sa.Column('entusiasmo', sa.Integer(), nullable=True),
    sa.Column('capacidad', sa.Integer(), nullable=True),
    sa.Column('recursos', sa.Integer(), nullable=True),
    sa.Column('guardada_por_que_en', sa.DateTime(), nullable=True),
    sa.Column('guardada_conocimiento_en', sa.DateTime(), nullable=True),
    sa.Column('guardada_realidad_en', sa.DateTime(), nullable=True),
    sa.Column('guardada_pasos_en', sa.DateTime(), nullable=True),
    sa.Column('ultimo_numero_duda', sa.Integer(), server_default=sa.text('0'), nullable=False),
    sa.Column('ultimo_numero_complicacion', sa.Integer(), server_default=sa.text('0'), nullable=False),
    sa.Column('ultimo_numero_sugerencia', sa.Integer(), server_default=sa.text('0'), nullable=False),
    sa.Column('ultimo_numero_paso', sa.Integer(), server_default=sa.text('0'), nullable=False),
    sa.Column('llamadas_sugerencias', sa.Integer(), server_default=sa.text('0'), nullable=False),
    sa.CheckConstraint('camino_opcion_id IS NULL OR camino_otro IS NULL', name=op.f('ck_tarjeta_carrera_un_camino')),
    sa.CheckConstraint('capacidad BETWEEN 1 AND 3', name=op.f('ck_tarjeta_carrera_capacidad_valida')),
    sa.CheckConstraint('entusiasmo BETWEEN 1 AND 3', name=op.f('ck_tarjeta_carrera_entusiasmo_valido')),
    sa.CheckConstraint('prioridad >= 1', name=op.f('ck_tarjeta_carrera_prioridad_valida')),
    sa.CheckConstraint('recursos BETWEEN 1 AND 3', name=op.f('ck_tarjeta_carrera_recursos_valido')),
    sa.ForeignKeyConstraint(['camino_opcion_id'], ['opcion_lista.id'], name=op.f('fk_tarjeta_carrera_camino_opcion_id_opcion_lista')),
    sa.ForeignKeyConstraint(['carrera_id'], ['carrera.id'], name=op.f('fk_tarjeta_carrera_carrera_id_carrera')),
    sa.ForeignKeyConstraint(['cuenta_id'], ['cuenta.id'], name=op.f('fk_tarjeta_carrera_cuenta_id_cuenta')),
    sa.ForeignKeyConstraint(['institucion_id'], ['institucion.id'], name=op.f('fk_tarjeta_carrera_institucion_id_institucion')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_tarjeta_carrera')),
    sa.UniqueConstraint('cuenta_id', 'carrera_id', name='uq_tarjeta_carrera_carrera'),
    sa.UniqueConstraint('cuenta_id', 'prioridad', name='uq_tarjeta_carrera_prioridad')
    )
    op.create_table('complicacion_tarjeta',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('tarjeta_id', sa.Integer(), nullable=False),
    sa.Column('numero', sa.Integer(), nullable=False),
    sa.Column('opcion_id', sa.Integer(), nullable=True),
    sa.Column('texto_otro', sa.Text(), nullable=True),
    sa.Column('creada_en', sa.DateTime(), nullable=False),
    sa.CheckConstraint('(opcion_id IS NULL) <> (texto_otro IS NULL)', name=op.f('ck_complicacion_tarjeta_opcion_u_otro')),
    sa.ForeignKeyConstraint(['opcion_id'], ['opcion_lista.id'], name=op.f('fk_complicacion_tarjeta_opcion_id_opcion_lista')),
    sa.ForeignKeyConstraint(['tarjeta_id'], ['tarjeta_carrera.id'], name=op.f('fk_complicacion_tarjeta_tarjeta_id_tarjeta_carrera'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_complicacion_tarjeta')),
    sa.UniqueConstraint('tarjeta_id', 'numero', name='uq_complicacion_tarjeta_numero')
    )
    op.create_table('conocimiento_tarjeta',
    sa.Column('tarjeta_id', sa.Integer(), nullable=False),
    sa.Column('pregunta', sa.Enum('DIA_NORMAL', 'DONDE_TRABAJAR', 'CURSOS', 'INGRESO', 'CONOCE_ALGUIEN', name='preguntaconocimiento', native_enum=False, create_constraint=True), nullable=False),
    sa.Column('respuesta', sa.Enum('SI', 'MAS_O_MENOS', 'NO', name='respuestaconocimiento', native_enum=False, create_constraint=True), nullable=False),
    sa.ForeignKeyConstraint(['tarjeta_id'], ['tarjeta_carrera.id'], name=op.f('fk_conocimiento_tarjeta_tarjeta_id_tarjeta_carrera'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('tarjeta_id', 'pregunta', name=op.f('pk_conocimiento_tarjeta'))
    )
    op.create_table('duda_tarjeta',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('tarjeta_id', sa.Integer(), nullable=False),
    sa.Column('numero', sa.Integer(), nullable=False),
    sa.Column('origen', sa.Enum('PREGUNTA', 'SUGERIDA', 'PROPIA', name='origenduda', native_enum=False, create_constraint=True), nullable=False),
    sa.Column('pregunta', sa.Enum('DIA_NORMAL', 'DONDE_TRABAJAR', 'CURSOS', 'INGRESO', 'CONOCE_ALGUIEN', name='preguntaconocimiento', native_enum=False, create_constraint=True), nullable=True),
    sa.Column('opcion_id', sa.Integer(), nullable=True),
    sa.Column('texto', sa.Text(), nullable=False),
    sa.Column('estado', sa.Enum('ABIERTA', 'CERRADA', name='estadoduda', native_enum=False, create_constraint=True), nullable=False),
    sa.Column('creada_en', sa.DateTime(), nullable=False),
    sa.Column('cerrada_por_paso_id', sa.Integer(), nullable=True),
    sa.CheckConstraint("(origen = 'PREGUNTA') = (pregunta IS NOT NULL)", name=op.f('ck_duda_tarjeta_pregunta_segun_origen')),
    sa.CheckConstraint("(origen = 'SUGERIDA') = (opcion_id IS NOT NULL)", name=op.f('ck_duda_tarjeta_opcion_segun_origen')),
    sa.ForeignKeyConstraint(['opcion_id'], ['opcion_lista.id'], name=op.f('fk_duda_tarjeta_opcion_id_opcion_lista')),
    sa.ForeignKeyConstraint(['tarjeta_id'], ['tarjeta_carrera.id'], name=op.f('fk_duda_tarjeta_tarjeta_id_tarjeta_carrera'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_duda_tarjeta')),
    sa.UniqueConstraint('tarjeta_id', 'pregunta', name='uq_duda_tarjeta_pregunta'),
    sa.UniqueConstraint('tarjeta_id', 'numero', name='uq_duda_tarjeta_numero')
    )
    op.create_table('financiamiento_tarjeta',
    sa.Column('tarjeta_id', sa.Integer(), nullable=False),
    sa.Column('posicion', sa.Integer(), nullable=False),
    sa.Column('opcion_id', sa.Integer(), nullable=True),
    sa.Column('texto_otro', sa.Text(), nullable=True),
    sa.CheckConstraint('(opcion_id IS NULL) <> (texto_otro IS NULL)', name=op.f('ck_financiamiento_tarjeta_opcion_u_otro')),
    sa.ForeignKeyConstraint(['opcion_id'], ['opcion_lista.id'], name=op.f('fk_financiamiento_tarjeta_opcion_id_opcion_lista')),
    sa.ForeignKeyConstraint(['tarjeta_id'], ['tarjeta_carrera.id'], name=op.f('fk_financiamiento_tarjeta_tarjeta_id_tarjeta_carrera'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('tarjeta_id', 'posicion', name=op.f('pk_financiamiento_tarjeta'))
    )
    op.create_table('gasto_tarjeta',
    sa.Column('tarjeta_id', sa.Integer(), nullable=False),
    sa.Column('posicion', sa.Integer(), nullable=False),
    sa.Column('rubro_opcion_id', sa.Integer(), nullable=True),
    sa.Column('rubro_otro', sa.Text(), nullable=True),
    sa.Column('monto', sa.Integer(), nullable=False),
    sa.Column('frecuencia', sa.Enum('UNICA', 'MENSUAL', 'POR_CICLO', 'ANUAL', name='frecuenciagasto', native_enum=False, create_constraint=True), nullable=False),
    sa.CheckConstraint('(rubro_opcion_id IS NULL) <> (rubro_otro IS NULL)', name=op.f('ck_gasto_tarjeta_opcion_u_otro')),
    sa.CheckConstraint('monto >= 0', name=op.f('ck_gasto_tarjeta_monto_valido')),
    sa.ForeignKeyConstraint(['rubro_opcion_id'], ['opcion_lista.id'], name=op.f('fk_gasto_tarjeta_rubro_opcion_id_opcion_lista')),
    sa.ForeignKeyConstraint(['tarjeta_id'], ['tarjeta_carrera.id'], name=op.f('fk_gasto_tarjeta_tarjeta_id_tarjeta_carrera'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('tarjeta_id', 'posicion', name=op.f('pk_gasto_tarjeta'))
    )
    op.create_table('motivo_tarjeta',
    sa.Column('tarjeta_id', sa.Integer(), nullable=False),
    sa.Column('posicion', sa.Integer(), nullable=False),
    sa.Column('opcion_id', sa.Integer(), nullable=True),
    sa.Column('texto_otro', sa.Text(), nullable=True),
    sa.CheckConstraint('(opcion_id IS NULL) <> (texto_otro IS NULL)', name=op.f('ck_motivo_tarjeta_opcion_u_otro')),
    sa.ForeignKeyConstraint(['opcion_id'], ['opcion_lista.id'], name=op.f('fk_motivo_tarjeta_opcion_id_opcion_lista')),
    sa.ForeignKeyConstraint(['tarjeta_id'], ['tarjeta_carrera.id'], name=op.f('fk_motivo_tarjeta_tarjeta_id_tarjeta_carrera'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('tarjeta_id', 'posicion', name=op.f('pk_motivo_tarjeta'))
    )
    op.create_table('sugerencia_tarjeta',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('tarjeta_id', sa.Integer(), nullable=False),
    sa.Column('numero', sa.Integer(), nullable=False),
    sa.Column('duda_id', sa.Integer(), nullable=True),
    sa.Column('complicacion_id', sa.Integer(), nullable=True),
    sa.Column('tipo_opcion_id', sa.Integer(), nullable=False),
    sa.Column('texto', sa.Text(), nullable=False),
    sa.Column('estado', sa.Enum('PENDIENTE', 'ACEPTADA', 'DESCARTADA', name='estadosugerencia', native_enum=False, create_constraint=True), nullable=False),
    sa.Column('generada_por', sa.Enum('LLM', 'RESPALDO', name='origensugerencia', native_enum=False, create_constraint=True), nullable=False),
    sa.Column('creada_en', sa.DateTime(), nullable=False),
    sa.CheckConstraint('(duda_id IS NULL) <> (complicacion_id IS NULL)', name=op.f('ck_sugerencia_tarjeta_un_origen')),
    sa.ForeignKeyConstraint(['complicacion_id'], ['complicacion_tarjeta.id'], name=op.f('fk_sugerencia_tarjeta_complicacion_id_complicacion_tarjeta'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['duda_id'], ['duda_tarjeta.id'], name=op.f('fk_sugerencia_tarjeta_duda_id_duda_tarjeta'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['tarjeta_id'], ['tarjeta_carrera.id'], name=op.f('fk_sugerencia_tarjeta_tarjeta_id_tarjeta_carrera'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['tipo_opcion_id'], ['opcion_lista.id'], name=op.f('fk_sugerencia_tarjeta_tipo_opcion_id_opcion_lista')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_sugerencia_tarjeta')),
    sa.UniqueConstraint('tarjeta_id', 'numero', name='uq_sugerencia_tarjeta_numero')
    )
    op.create_table('paso_tarjeta',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('tarjeta_id', sa.Integer(), nullable=False),
    sa.Column('numero', sa.Integer(), nullable=False),
    sa.Column('posicion', sa.Integer(), nullable=False),
    sa.Column('tipo_opcion_id', sa.Integer(), nullable=False),
    sa.Column('texto', sa.Text(), nullable=False),
    sa.Column('duda_id', sa.Integer(), nullable=True),
    sa.Column('complicacion_id', sa.Integer(), nullable=True),
    sa.Column('sugerencia_id', sa.Integer(), nullable=True),
    sa.Column('estado', sa.Enum('PENDIENTE', 'HECHO', name='estadopaso', native_enum=False, create_constraint=True), nullable=False),
    sa.Column('hallazgo', sa.Text(), nullable=True),
    sa.Column('hecho_en', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['complicacion_id'], ['complicacion_tarjeta.id'], name=op.f('fk_paso_tarjeta_complicacion_id_complicacion_tarjeta'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['duda_id'], ['duda_tarjeta.id'], name=op.f('fk_paso_tarjeta_duda_id_duda_tarjeta'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['sugerencia_id'], ['sugerencia_tarjeta.id'], name=op.f('fk_paso_tarjeta_sugerencia_id_sugerencia_tarjeta'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['tarjeta_id'], ['tarjeta_carrera.id'], name=op.f('fk_paso_tarjeta_tarjeta_id_tarjeta_carrera'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['tipo_opcion_id'], ['opcion_lista.id'], name=op.f('fk_paso_tarjeta_tipo_opcion_id_opcion_lista')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_paso_tarjeta')),
    sa.UniqueConstraint('tarjeta_id', 'numero', name='uq_paso_tarjeta_numero')
    )
    with op.batch_alter_table('cuenta', schema=None) as batch_op:
        batch_op.add_column(sa.Column('opcion_inicial_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(batch_op.f('fk_cuenta_opcion_inicial_id_carrera'), 'carrera', ['opcion_inicial_id'], ['id'])

    with op.batch_alter_table('institucion', schema=None) as batch_op:
        batch_op.add_column(sa.Column('gestion', sa.Enum('PUBLICA', 'PRIVADA', name='gestioninstitucion', native_enum=False, create_constraint=True), nullable=True))

    with op.batch_alter_table('institucion_carrera', schema=None) as batch_op:
        batch_op.add_column(sa.Column('duracion_ciclos', sa.Integer(), nullable=True))
        batch_op.create_check_constraint(op.f('ck_institucion_carrera_duracion_valida'), 'duracion_ciclos > 0')

    # `duda_tarjeta` y `paso_tarjeta` se apuntan entre sí: esta clave se crea cuando ya existen las dos.
    with op.batch_alter_table('duda_tarjeta', schema=None) as batch_op:
        batch_op.create_foreign_key(FK_DUDA_PASO, 'paso_tarjeta', ['cerrada_por_paso_id'], ['id'], ondelete='SET NULL')

    with op.batch_alter_table('referencia', schema=None) as batch_op:
        batch_op.create_check_constraint(op.f('ck_referencia_planes_sin_fuente'), PLANES_SIN_FUENTE)
    _enumerados(EVENTOS, OBJETIVOS, REFERENCIAS)


def downgrade() -> None:
    if not context.is_offline_mode():
        conexion = op.get_bind()
        consultas = (
            "SELECT 1 FROM evento_uso WHERE tipo IN ('CREA_PLAN', 'ACTUALIZA_PLAN', 'ELIMINA_PLAN')",
            "SELECT 1 FROM condicion_desbloqueo WHERE tipo_evento IN ('CREA_PLAN', 'ACTUALIZA_PLAN', 'ELIMINA_PLAN')",
            "SELECT 1 FROM regla_desbloqueo WHERE tipo_objetivo = 'SECCION_PLAN'",
            "SELECT 1 FROM referencia WHERE tipo IN ('PLAN', 'PLANES', 'PASOS_PLAN_A', 'OPCION_INICIAL')",
        )
        if any(conexion.execute(sa.text(consulta)).first() for consulta in consultas):
            raise RuntimeError('No se puede volver a 0016: hay eventos, reglas o referencias de planes.')
    _enumerados(EVENTOS_0016, OBJETIVOS_0016, REFERENCIAS_0016)
    with op.batch_alter_table('referencia', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_referencia_planes_sin_fuente'), type_='check')
    with op.batch_alter_table('duda_tarjeta', schema=None) as batch_op:
        batch_op.drop_constraint(FK_DUDA_PASO, type_='foreignkey')

    with op.batch_alter_table('institucion_carrera', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_institucion_carrera_duracion_valida'), type_='check')
        batch_op.drop_column('duracion_ciclos')

    with op.batch_alter_table('institucion', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_institucion_gestioninstitucion'), type_='check')
        batch_op.drop_column('gestion')

    with op.batch_alter_table('cuenta', schema=None) as batch_op:
        batch_op.drop_constraint(batch_op.f('fk_cuenta_opcion_inicial_id_carrera'), type_='foreignkey')
        batch_op.drop_column('opcion_inicial_id')

    op.drop_table('paso_tarjeta')
    op.drop_table('sugerencia_tarjeta')
    op.drop_table('motivo_tarjeta')
    op.drop_table('gasto_tarjeta')
    op.drop_table('financiamiento_tarjeta')
    op.drop_table('duda_tarjeta')
    op.drop_table('conocimiento_tarjeta')
    op.drop_table('complicacion_tarjeta')
    op.drop_table('tarjeta_carrera')
    op.drop_table('referencia_rubro')
    op.drop_table('referencia_camino')
    op.drop_table('seccion_tarjeta')
