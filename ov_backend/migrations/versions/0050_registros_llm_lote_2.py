"""registros llm (lote 2): consigna en partes, ecos, tarjeta, piezas, intentos con histórico; sin criterios ni seguimiento

Ajuste registros llm (lote 2). `item_registro.consigna` pasa a `pregunta_texto` y suma diálogo, pregunta de elección,
arranque, etiqueta de la «Otra», ecos y tarjeta; salen `repregunta_generica`, `seguimiento` y `criterio_completitud`,
y `actividad.maximo_seguimientos`. Las respuestas no se migran (§12.2 del texto): `respuesta_registro` se rehace con
un intento por fila (vigente o histórico), y salen `turno_seguimiento` y `evaluacion_respuesta`. Por eso el upgrade
se niega si hay respuestas de registro guardadas, y el downgrade, si hay ítems o respuestas.

Revisión: 0050
Revisión anterior: 0049
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa

from app.database import TipoJSON


revision: str = '0050'
down_revision: Union[str, Sequence[str], None] = '0049'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

FUENTES_0049 = ('LISTA', 'REFERENCIA', 'PROPIAS')
FUENTES = (*FUENTES_0049, 'PIEZAS_PERFIL', 'PIEZAS_PERFIL_MENOS', 'PIEZAS_INICIO')
ESTADOS_0049 = ('BORRADOR', 'PENDIENTE_SEGUIMIENTO', 'FINAL')
ESTADOS = ('COMPLETADO', 'CERRADO', 'ABIERTO', 'SIN_EVALUAR')
REFERENCIAS_0049 = ('ELECCION', 'TEXTO', 'RESULTADO', 'COINCIDENCIAS', 'RESPUESTA_CUESTIONARIO', 'FAVORITOS', 'PLAN',
                    'PLANES', 'PASOS_PLAN_A', 'OPCION_INICIAL', 'LO_QUE_PIENSO', 'FAMILIAS_RECOMENDADAS',
                    'TESTIMONIOS', 'DATOS_CARRERA_PLAN_A')
REFERENCIAS = (*REFERENCIAS_0049, 'CHECK_IN_PRIMERO')
SIN_FUENTE_0049 = ('PLAN', 'PLANES', 'PASOS_PLAN_A', 'OPCION_INICIAL', 'LO_QUE_PIENSO', 'FAMILIAS_RECOMENDADAS',
                   'TESTIMONIOS', 'DATOS_CARRERA_PLAN_A')
SIN_FUENTE = (*SIN_FUENTE_0049, 'CHECK_IN_PRIMERO')
TIPOS = "'propio', 'general', 'emocional', 'no_sabe', 'vacio', 'fuera_de_tema'"

_ELECCION_COMUN = (
    "(fuente_opciones IS NULL AND lista_id IS NULL AND referencia_id IS NULL AND referencia_opciones_id IS NULL"
    " AND opciones_propias IS NULL AND premarcar_si IS NULL AND eleccion_minima IS NULL"
    " AND eleccion_maxima IS NULL AND eleccion_ordenada = false AND permite_otra = false)"
    " OR (fuente_opciones IS NOT NULL AND eleccion_minima >= 0"
    " AND eleccion_maxima >= 1 AND eleccion_maxima >= eleccion_minima"
    " AND (fuente_opciones <> 'LISTA' OR (lista_id IS NOT NULL AND referencia_opciones_id IS NULL))"
    " AND (fuente_opciones <> 'REFERENCIA' OR (referencia_opciones_id IS NOT NULL AND lista_id IS NULL))"
    " AND (fuente_opciones <> 'PROPIAS' OR (lista_id IS NULL AND referencia_opciones_id IS NULL"
    " AND opciones_propias IS NOT NULL))"
)
ELECCION_VALIDA_0049 = _ELECCION_COMUN + ")"
# Igual que `app.models.registro.ELECCION_VALIDA` (la migración no importa la aplicación).
ELECCION_VALIDA = _ELECCION_COMUN + (
    " AND (fuente_opciones NOT IN ('PIEZAS_PERFIL', 'PIEZAS_PERFIL_MENOS', 'PIEZAS_INICIO')"
    " OR (lista_id IS NULL AND referencia_opciones_id IS NULL)))"
)


def _en(columna, valores):
    return f"{columna} IN ({', '.join(repr(v) for v in valores)})"


def _sin_fuente(valores):
    return f"tipo NOT IN ({', '.join(repr(v) for v in valores)}) OR item_registro_id IS NULL"


def _hay(consulta):
    return op.get_bind().execute(sa.text(f'{consulta} LIMIT 1')).first() is not None


def _item_registro(fuentes, eleccion_valida):
    with op.batch_alter_table('item_registro', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_item_registro_eleccion_valida'), type_='check')
        batch_op.drop_constraint(op.f('ck_item_registro_fuenteopciones'), type_='check')
        batch_op.alter_column('fuente_opciones', existing_type=sa.String(), type_=sa.String(max(map(len, fuentes))),
                              existing_nullable=True)
    with op.batch_alter_table('item_registro', schema=None) as batch_op:
        batch_op.create_check_constraint(op.f('ck_item_registro_fuenteopciones'), _en('fuente_opciones', fuentes))
        batch_op.create_check_constraint(op.f('ck_item_registro_eleccion_valida'), eleccion_valida)


def _referencia(tipos, sin_fuente):
    # --autogenerate no detecta el cambio del CHECK de un enumerado no nativo (como en 0049). CHECK_IN_PRIMERO (16)
    # cabe en el largo actual (22).
    with op.batch_alter_table('referencia', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_referencia_tiporeferencia'), type_='check')
        batch_op.create_check_constraint(op.f('ck_referencia_tiporeferencia'), _en('tipo', tipos))
        batch_op.drop_constraint(op.f('ck_referencia_planes_sin_fuente'), type_='check')
        batch_op.create_check_constraint(op.f('ck_referencia_planes_sin_fuente'), _sin_fuente(sin_fuente))


def upgrade() -> None:
    if not context.is_offline_mode() and _hay('SELECT 1 FROM respuesta_registro'):
        raise RuntimeError('La 0050 no migra las respuestas de registro (ajuste registros llm, lote 2): vacía la base '
                           'y vuelve a cargarla.')
    op.drop_table('criterio_completitud')
    op.drop_table('turno_seguimiento')
    op.drop_table('evaluacion_respuesta')
    op.drop_table('respuesta_registro')
    op.create_table(
        'respuesta_registro',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('progreso_id', sa.Integer(), nullable=False),
        sa.Column('item_registro_id', sa.Integer(), nullable=False),
        sa.Column('intento', sa.Integer(), server_default=sa.text('1'), nullable=False),
        sa.Column('vigente', sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column('opciones_elegidas', sa.JSON(none_as_null=True), server_default=sa.text("'[]'"), nullable=False),
        sa.Column('valores_contexto', sa.JSON(none_as_null=True), nullable=True),
        sa.Column('primera_respuesta', sa.Text(), nullable=False),
        sa.Column('primera_tipo', sa.String(), nullable=True),
        sa.Column('primera_motivo', sa.Text(), nullable=True),
        sa.Column('repregunta', sa.Text(), nullable=True),
        sa.Column('segunda_respuesta', sa.Text(), nullable=True),
        sa.Column('conjunto_tipo', sa.String(), nullable=True),
        sa.Column('conjunto_motivo', sa.Text(), nullable=True),
        sa.Column('arranque', sa.Text(), nullable=True),
        sa.Column('tipo_final', sa.String(), nullable=True),
        sa.Column('estado', sa.Enum(*ESTADOS, name='estadorespuestaregistro', native_enum=False,
                                    create_constraint=True), nullable=False),
        sa.Column('sensible', sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column('seguimiento_sin_evaluar', sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column('eco_cambiado', sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column('pista', sa.Text(), nullable=True),
        sa.Column('linea_registro', sa.Text(), nullable=True),
        sa.Column('texto_citable', sa.JSON(none_as_null=True), server_default=sa.text("'[]'"), nullable=False),
        sa.Column('version_prompt', sa.String(), nullable=True),
        sa.Column('creada_en', sa.DateTime(), nullable=False),
        sa.Column('actualizada_en', sa.DateTime(), nullable=False),
        sa.CheckConstraint('intento >= 1', name=op.f('ck_respuesta_registro_intento_valido')),
        sa.CheckConstraint(TipoJSON(sa.column('opciones_elegidas')) == 'array',
                           name=op.f('ck_respuesta_registro_opciones_elegidas_lista')),
        sa.CheckConstraint(TipoJSON(sa.column('texto_citable')) == 'array',
                           name=op.f('ck_respuesta_registro_texto_citable_lista')),
        sa.CheckConstraint(f'primera_tipo IS NULL OR primera_tipo IN ({TIPOS})',
                           name=op.f('ck_respuesta_registro_primera_tipo_valido')),
        sa.CheckConstraint(f'conjunto_tipo IS NULL OR conjunto_tipo IN ({TIPOS})',
                           name=op.f('ck_respuesta_registro_conjunto_tipo_valido')),
        sa.CheckConstraint(f'tipo_final IS NULL OR tipo_final IN ({TIPOS})',
                           name=op.f('ck_respuesta_registro_tipo_final_valido')),
        sa.ForeignKeyConstraint(['item_registro_id'], ['item_registro.id'],
                                name=op.f('fk_respuesta_registro_item_registro_id_item_registro')),
        sa.ForeignKeyConstraint(['progreso_id'], ['progreso_actividad.id'],
                                name=op.f('fk_respuesta_registro_progreso_id_progreso_actividad')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_respuesta_registro')),
        sa.UniqueConstraint('progreso_id', 'item_registro_id', 'intento',
                            name=op.f('uq_respuesta_registro_progreso_id')),
    )
    with op.batch_alter_table('respuesta_registro', schema=None) as batch_op:
        batch_op.create_index('uq_respuesta_registro_vigente', ['progreso_id', 'item_registro_id'], unique=True,
                              sqlite_where=sa.text('vigente'), postgresql_where=sa.text('vigente'))

    with op.batch_alter_table('actividad', schema=None) as batch_op:
        batch_op.drop_column('maximo_seguimientos')

    with op.batch_alter_table('item_registro', schema=None) as batch_op:
        batch_op.alter_column('consigna', new_column_name='pregunta_texto', existing_type=sa.Text(),
                              existing_nullable=False)
        batch_op.add_column(sa.Column('dialogo', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('pregunta_eleccion', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('arranque', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('etiqueta_otra', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('ecos_mostrar', sa.JSON(none_as_null=True), nullable=True))
        batch_op.add_column(sa.Column('ecos_llm', sa.JSON(none_as_null=True), nullable=True))
        batch_op.add_column(sa.Column('tarjeta', sa.JSON(none_as_null=True), nullable=True))
        batch_op.drop_column('seguimiento')
        batch_op.drop_column('repregunta_generica')
    _item_registro(FUENTES, ELECCION_VALIDA)
    _referencia(REFERENCIAS, SIN_FUENTE)


def downgrade() -> None:
    # Evita iniciar una reconstrucción que dejaría una tabla temporal en SQLite.
    if not context.is_offline_mode() and (_hay('SELECT 1 FROM item_registro') or _hay('SELECT 1 FROM respuesta_registro')
                                          or _hay("SELECT 1 FROM referencia WHERE tipo = 'CHECK_IN_PRIMERO'")):
        raise RuntimeError('No se puede volver a 0049: existen datos de los registros definitivos.')
    _referencia(REFERENCIAS_0049, SIN_FUENTE_0049)
    _item_registro(FUENTES_0049, ELECCION_VALIDA_0049)
    with op.batch_alter_table('item_registro', schema=None) as batch_op:
        batch_op.add_column(sa.Column('repregunta_generica', sa.Text(), nullable=False))
        batch_op.add_column(sa.Column('seguimiento', sa.JSON(none_as_null=True), nullable=True))
        batch_op.drop_column('tarjeta')
        batch_op.drop_column('ecos_llm')
        batch_op.drop_column('ecos_mostrar')
        batch_op.drop_column('etiqueta_otra')
        batch_op.drop_column('arranque')
        batch_op.drop_column('pregunta_eleccion')
        batch_op.drop_column('dialogo')
        batch_op.alter_column('pregunta_texto', new_column_name='consigna', existing_type=sa.Text(),
                              existing_nullable=False)

    with op.batch_alter_table('actividad', schema=None) as batch_op:
        batch_op.add_column(sa.Column('maximo_seguimientos', sa.Integer(), server_default=sa.text('2'), nullable=False))

    with op.batch_alter_table('respuesta_registro', schema=None) as batch_op:
        batch_op.drop_index('uq_respuesta_registro_vigente', sqlite_where=sa.text('vigente'),
                            postgresql_where=sa.text('vigente'))
    op.drop_table('respuesta_registro')
    op.create_table(
        'respuesta_registro',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('progreso_id', sa.Integer(), nullable=False),
        sa.Column('item_registro_id', sa.Integer(), nullable=False),
        sa.Column('texto_inicial', sa.Text(), nullable=False),
        sa.Column('opciones_elegidas', sa.JSON(none_as_null=True), server_default=sa.text("'[]'"), nullable=False),
        sa.Column('texto_consolidado', sa.Text(), nullable=True),
        sa.Column('estado', sa.Enum(*ESTADOS_0049, name='estadorespuestaregistro', native_enum=False,
                                    create_constraint=True), nullable=False),
        sa.Column('clasificacion_inicial', sa.Enum('ADECUADA', 'POCO_DESARROLLADA', 'NO_EVALUADA', 'ABIERTA',
                                                   name='clasificacionrespuesta', native_enum=False,
                                                   create_constraint=True), nullable=True),
        sa.Column('ampliada', sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column('intento', sa.Integer(), server_default=sa.text('1'), nullable=False),
        sa.Column('reflexiva_registrada', sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column('sensible', sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column('requiere_atencion', sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column('creada_en', sa.DateTime(), nullable=False),
        sa.Column('actualizada_en', sa.DateTime(), nullable=False),
        sa.CheckConstraint(TipoJSON(sa.column('opciones_elegidas')) == 'array',
                           name=op.f('ck_respuesta_registro_opciones_elegidas_lista')),
        sa.ForeignKeyConstraint(['item_registro_id'], ['item_registro.id'],
                                name=op.f('fk_respuesta_registro_item_registro_id_item_registro')),
        sa.ForeignKeyConstraint(['progreso_id'], ['progreso_actividad.id'],
                                name=op.f('fk_respuesta_registro_progreso_id_progreso_actividad')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_respuesta_registro')),
        sa.UniqueConstraint('progreso_id', 'item_registro_id', name=op.f('uq_respuesta_registro_progreso_id')),
    )
    op.create_table(
        'evaluacion_respuesta',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('respuesta_id', sa.Integer(), nullable=False),
        sa.Column('numero', sa.Integer(), nullable=False),
        sa.Column('origen', sa.Enum('LLM', 'EXTENSION_MINIMA', name='origenevaluacion', native_enum=False,
                                    create_constraint=True), nullable=False),
        sa.Column('clasificacion', sa.Enum('ADECUADA', 'POCO_DESARROLLADA', 'NO_EVALUADA', 'ABIERTA',
                                           name='clasificacionrespuesta', native_enum=False, create_constraint=True),
                  nullable=False),
        sa.Column('criterios_faltantes', sa.JSON(none_as_null=True), nullable=False),
        sa.Column('pregunta_generada', sa.Text(), nullable=True),
        sa.Column('requiere_atencion', sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column('modelo', sa.String(), nullable=True),
        sa.Column('version_prompt', sa.String(), nullable=True),
        sa.Column('latencia_ms', sa.Integer(), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('texto_evaluado', sa.Text(), nullable=False),
        sa.Column('fecha_hora', sa.DateTime(), nullable=False),
        sa.Column('opciones_evaluadas', sa.JSON(none_as_null=True), server_default=sa.text("'[]'"), nullable=False),
        sa.Column('sensible', sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column('falta', sa.Text(), nullable=True),
        sa.CheckConstraint(TipoJSON(sa.column('criterios_faltantes')) == 'array',
                           name=op.f('ck_evaluacion_respuesta_criterios_faltantes_lista')),
        sa.CheckConstraint(TipoJSON(sa.column('opciones_evaluadas')) == 'array',
                           name=op.f('ck_evaluacion_respuesta_opciones_evaluadas_lista')),
        sa.CheckConstraint('numero >= 1 AND numero = CAST(numero AS INTEGER)',
                           name=op.f('ck_evaluacion_respuesta_numero_evaluacion_valido')),
        sa.ForeignKeyConstraint(['respuesta_id'], ['respuesta_registro.id'],
                                name=op.f('fk_evaluacion_respuesta_respuesta_id_respuesta_registro')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_evaluacion_respuesta')),
    )
    op.create_table(
        'turno_seguimiento',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('respuesta_id', sa.Integer(), nullable=False),
        sa.Column('orden', sa.Integer(), nullable=False),
        sa.Column('pregunta', sa.Text(), nullable=False),
        sa.Column('criterios_objetivo', sa.JSON(none_as_null=True), nullable=False),
        sa.Column('respuesta', sa.Text(), nullable=True),
        sa.Column('respondido_en', sa.DateTime(), nullable=True),
        sa.Column('creado_en', sa.DateTime(), nullable=False),
        sa.Column('intento', sa.Integer(), server_default=sa.text('1'), nullable=False),
        sa.CheckConstraint(TipoJSON(sa.column('criterios_objetivo')) == 'array',
                           name=op.f('ck_turno_seguimiento_criterios_objetivo_lista')),
        sa.CheckConstraint('orden IN (1, 2)', name=op.f('ck_turno_seguimiento_orden_seguimiento_valido')),
        sa.ForeignKeyConstraint(['respuesta_id'], ['respuesta_registro.id'],
                                name=op.f('fk_turno_seguimiento_respuesta_id_respuesta_registro')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_turno_seguimiento')),
        sa.UniqueConstraint('respuesta_id', 'intento', 'orden', name=op.f('uq_turno_seguimiento_respuesta_id')),
    )
    op.create_table(
        'criterio_completitud',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('item_registro_id', sa.Integer(), nullable=False),
        sa.Column('codigo', sa.String(), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=False),
        sa.Column('orden', sa.Integer(), nullable=False),
        sa.Column('tipo', sa.Enum('EJEMPLO', 'RAZON', 'ACCION', 'CONTRASTE', name='tipocriterio', native_enum=False,
                                  create_constraint=True), nullable=False),
        sa.Column('repregunta', sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(['item_registro_id'], ['item_registro.id'],
                                name=op.f('fk_criterio_completitud_item_registro_id_item_registro')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_criterio_completitud')),
        sa.UniqueConstraint('item_registro_id', 'codigo', name=op.f('uq_criterio_completitud_item_registro_id')),
    )
