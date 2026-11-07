"""registros definitivos: fuente de opciones, seguimiento por ítem, ABIERTA, sensible y textos fijos (ajuste registros)

Los ítems con lista pasan a `fuente_opciones = 'LISTA'`. El downgrade se niega si hay datos que solo existen desde
aquí (ABIERTA, referencias nuevas, opciones propias o por referencia).

Revisión: 0049
Revisión anterior: 0048
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa


revision: str = '0049'
down_revision: Union[str, Sequence[str], None] = '0048'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CLASIFICACIONES_0048 = "'ADECUADA', 'POCO_DESARROLLADA', 'NO_EVALUADA'"
CLASIFICACIONES = f"{CLASIFICACIONES_0048}, 'ABIERTA'"
COLUMNAS_CLASIFICACION = (('respuesta_registro', 'clasificacion_inicial'), ('evaluacion_respuesta', 'clasificacion'))

REFERENCIAS_0048 = ("'ELECCION', 'TEXTO', 'RESULTADO', 'COINCIDENCIAS', 'RESPUESTA_CUESTIONARIO', 'FAVORITOS', 'PLAN', "
                    "'PLANES', 'PASOS_PLAN_A', 'OPCION_INICIAL', 'LO_QUE_PIENSO'")
NUEVAS_REFERENCIAS = ('FAMILIAS_RECOMENDADAS', 'TESTIMONIOS', 'DATOS_CARRERA_PLAN_A')
REFERENCIAS = REFERENCIAS_0048 + ''.join(f", '{tipo}'" for tipo in NUEVAS_REFERENCIAS)
PLANES_SIN_FUENTE_0048 = ("tipo NOT IN ('PLAN', 'PLANES', 'PASOS_PLAN_A', 'OPCION_INICIAL', 'LO_QUE_PIENSO') "
                          "OR item_registro_id IS NULL")
PLANES_SIN_FUENTE = ("tipo NOT IN ('PLAN', 'PLANES', 'PASOS_PLAN_A', 'OPCION_INICIAL', 'LO_QUE_PIENSO', "
                     "'FAMILIAS_RECOMENDADAS', 'TESTIMONIOS', 'DATOS_CARRERA_PLAN_A') OR item_registro_id IS NULL")

ELECCION_VALIDA_0048 = ("(lista_id IS NULL AND referencia_id IS NULL AND eleccion_minima IS NULL"
                        " AND eleccion_maxima IS NULL AND eleccion_ordenada = false AND permite_otra = false)"
                        " OR (lista_id IS NOT NULL AND eleccion_minima >= 0"
                        " AND eleccion_maxima >= 1 AND eleccion_maxima >= eleccion_minima)")
# Igual que `app.models.registro.ELECCION_VALIDA` (la migración no importa la aplicación).
ELECCION_VALIDA = (
    "(fuente_opciones IS NULL AND lista_id IS NULL AND referencia_id IS NULL AND referencia_opciones_id IS NULL"
    " AND opciones_propias IS NULL AND premarcar_si IS NULL AND eleccion_minima IS NULL"
    " AND eleccion_maxima IS NULL AND eleccion_ordenada = false AND permite_otra = false)"
    " OR (fuente_opciones IS NOT NULL AND eleccion_minima >= 0"
    " AND eleccion_maxima >= 1 AND eleccion_maxima >= eleccion_minima"
    " AND (fuente_opciones <> 'LISTA' OR (lista_id IS NOT NULL AND referencia_opciones_id IS NULL))"
    " AND (fuente_opciones <> 'REFERENCIA' OR (referencia_opciones_id IS NOT NULL AND lista_id IS NULL))"
    " AND (fuente_opciones <> 'PROPIAS' OR (lista_id IS NULL AND referencia_opciones_id IS NULL"
    " AND opciones_propias IS NOT NULL)))"
)


def _enumerados(clasificaciones, referencias, planes_sin_fuente) -> None:
    # --autogenerate no detecta el cambio del CHECK de un enumerado no nativo (como en 0038). ABIERTA (7) y
    # FAMILIAS_RECOMENDADAS (21) caben en el largo actual (17 y 22): el VARCHAR no cambia.
    for tabla, columna in COLUMNAS_CLASIFICACION:
        with op.batch_alter_table(tabla, schema=None) as batch_op:
            batch_op.drop_constraint(op.f(f'ck_{tabla}_clasificacionrespuesta'), type_='check')
            batch_op.create_check_constraint(op.f(f'ck_{tabla}_clasificacionrespuesta'),
                                             f"{columna} IN ({clasificaciones})")
    with op.batch_alter_table('referencia', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_referencia_tiporeferencia'), type_='check')
        batch_op.create_check_constraint(op.f('ck_referencia_tiporeferencia'), f"tipo IN ({referencias})")
        batch_op.drop_constraint(op.f('ck_referencia_planes_sin_fuente'), type_='check')
        batch_op.create_check_constraint(op.f('ck_referencia_planes_sin_fuente'), planes_sin_fuente)


def upgrade() -> None:
    op.create_table('texto_fijo',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('codigo', sa.String(), nullable=False),
    sa.Column('texto', sa.Text(), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_texto_fijo')),
    sa.UniqueConstraint('codigo', name=op.f('uq_texto_fijo_codigo'))
    )
    with op.batch_alter_table('actividad', schema=None) as batch_op:
        batch_op.add_column(sa.Column('maximo_seguimientos', sa.Integer(), server_default=sa.text('2'), nullable=False))

    with op.batch_alter_table('evaluacion_respuesta', schema=None) as batch_op:
        batch_op.add_column(sa.Column('sensible', sa.Boolean(), server_default=sa.false(), nullable=False))
        batch_op.add_column(sa.Column('falta', sa.Text(), nullable=True))

    with op.batch_alter_table('item_registro', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_item_registro_eleccion_valida'), type_='check')
        batch_op.add_column(sa.Column('fuente_opciones', sa.Enum('LISTA', 'REFERENCIA', 'PROPIAS', name='fuenteopciones', native_enum=False, create_constraint=True), nullable=True))
        batch_op.add_column(sa.Column('referencia_opciones_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('opciones_propias', sa.JSON(none_as_null=True), nullable=True))
        batch_op.add_column(sa.Column('premarcar_si', sa.JSON(none_as_null=True), nullable=True))
        batch_op.add_column(sa.Column('seguimiento', sa.JSON(none_as_null=True), nullable=True))
        batch_op.create_foreign_key('fk_item_registro_referencia_opciones_id_referencia', 'referencia', ['referencia_opciones_id'], ['id'], use_alter=True)
    op.execute("UPDATE item_registro SET fuente_opciones = 'LISTA' WHERE lista_id IS NOT NULL")
    with op.batch_alter_table('item_registro', schema=None) as batch_op:
        batch_op.create_check_constraint(op.f('ck_item_registro_eleccion_valida'), ELECCION_VALIDA)

    with op.batch_alter_table('pregunta_diario', schema=None) as batch_op:
        batch_op.add_column(sa.Column('respaldo_si', sa.JSON(none_as_null=True), nullable=True))

    with op.batch_alter_table('respuesta_registro', schema=None) as batch_op:
        batch_op.add_column(sa.Column('sensible', sa.Boolean(), server_default=sa.false(), nullable=False))
        batch_op.add_column(sa.Column('requiere_atencion', sa.Boolean(), server_default=sa.false(), nullable=False))

    _enumerados(CLASIFICACIONES, REFERENCIAS, PLANES_SIN_FUENTE)


def downgrade() -> None:
    # Evita iniciar una reconstrucción que dejaría una tabla temporal en SQLite.
    if not context.is_offline_mode():
        enlace = op.get_bind()
        nuevos = (
            "SELECT 1 FROM respuesta_registro WHERE clasificacion_inicial = 'ABIERTA'",
            "SELECT 1 FROM evaluacion_respuesta WHERE clasificacion = 'ABIERTA'",
            "SELECT 1 FROM referencia WHERE tipo IN ('FAMILIAS_RECOMENDADAS', 'TESTIMONIOS', 'DATOS_CARRERA_PLAN_A')",
            "SELECT 1 FROM item_registro WHERE fuente_opciones IN ('REFERENCIA', 'PROPIAS')"
            " OR opciones_propias IS NOT NULL",
        )
        if any(enlace.execute(sa.text(f'{consulta} LIMIT 1')).first() for consulta in nuevos):
            raise RuntimeError('No se puede volver a 0048: existen datos de los registros definitivos.')
    _enumerados(CLASIFICACIONES_0048, REFERENCIAS_0048, PLANES_SIN_FUENTE_0048)
    with op.batch_alter_table('respuesta_registro', schema=None) as batch_op:
        batch_op.drop_column('requiere_atencion')
        batch_op.drop_column('sensible')

    with op.batch_alter_table('pregunta_diario', schema=None) as batch_op:
        batch_op.drop_column('respaldo_si')

    with op.batch_alter_table('item_registro', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_item_registro_eleccion_valida'), type_='check')
        batch_op.drop_constraint(op.f('ck_item_registro_fuenteopciones'), type_='check')
        batch_op.drop_constraint('fk_item_registro_referencia_opciones_id_referencia', type_='foreignkey')
        batch_op.drop_column('seguimiento')
        batch_op.drop_column('premarcar_si')
        batch_op.drop_column('opciones_propias')
        batch_op.drop_column('referencia_opciones_id')
        batch_op.drop_column('fuente_opciones')
    with op.batch_alter_table('item_registro', schema=None) as batch_op:
        batch_op.create_check_constraint(op.f('ck_item_registro_eleccion_valida'), ELECCION_VALIDA_0048)

    with op.batch_alter_table('evaluacion_respuesta', schema=None) as batch_op:
        batch_op.drop_column('falta')
        batch_op.drop_column('sensible')

    with op.batch_alter_table('actividad', schema=None) as batch_op:
        batch_op.drop_column('maximo_seguimientos')

    op.drop_table('texto_fijo')
