"""conversaciones con orden, preguntas y respuestas de cada rol; objetivo CONVERSACION

Revisión: 0018
Revisión anterior: 0017
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa


revision: str = '0018'
down_revision: Union[str, Sequence[str], None] = '0017'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

OBJETIVOS_0017 = ("'BLOQUE', 'ACTIVIDAD', 'FICHA', 'TESTIMONIO', 'PREGUNTA_DIARIO', 'SECCION', 'INSIGNIA', 'NIVEL', "
                  "'SECCION_PLAN'")
OBJETIVOS = f"{OBJETIVOS_0017}, 'CONVERSACION'"
FK_CONVERSADA_POR = 'fk_conversacion_vinculo_conversada_por_cuenta'


def _objetivos(objetivos):
    # --autogenerate no detecta el CHECK de los enumerados no nativos.
    with op.batch_alter_table('regla_desbloqueo', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_regla_desbloqueo_tipoobjetivo'), type_='check')
        batch_op.create_check_constraint(op.f('ck_regla_desbloqueo_tipoobjetivo'), f"tipo_objetivo IN ({objetivos})")


def upgrade() -> None:
    with op.batch_alter_table('conversacion', schema=None) as batch_op:
        batch_op.add_column(sa.Column('orden', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('pregunta_estudiante', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('pregunta_apoderado', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('preguntas_guia', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('mensaje_diferencias', sa.Text(), nullable=True))
    # Filas existentes: el tema pasa a ser la pregunta de ambos roles, sin guía; el orden sigue al id.
    op.execute("UPDATE conversacion SET orden = id, pregunta_estudiante = tema, preguntas_guia = '[]', "
               "mensaje_diferencias = ''")
    with op.batch_alter_table('conversacion', schema=None) as batch_op:
        for columna, tipo in (('orden', sa.Integer()), ('pregunta_estudiante', sa.Text()),
                              ('preguntas_guia', sa.JSON()), ('mensaje_diferencias', sa.Text())):
            batch_op.alter_column(columna, existing_type=tipo, nullable=False)
        batch_op.create_unique_constraint(batch_op.f('uq_conversacion_orden'), ['orden'])
        batch_op.drop_column('tema')

    with op.batch_alter_table('conversacion_vinculo', schema=None) as batch_op:
        batch_op.add_column(sa.Column('respuesta_estudiante', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('respondida_estudiante_en', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('respuesta_apoderado', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('respondida_apoderado_en', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('conversada_en', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('conversada_por', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(batch_op.f(FK_CONVERSADA_POR), 'cuenta', ['conversada_por'], ['id'])
    # Una conversada sin fecha toma la de la migración.
    op.execute("UPDATE conversacion_vinculo SET conversada_en = COALESCE(conversado_en, CURRENT_TIMESTAMP) "
               "WHERE conversado = true")
    with op.batch_alter_table('conversacion_vinculo', schema=None) as batch_op:
        batch_op.drop_column('conversado_en')
        batch_op.drop_column('conversado')
    _objetivos(OBJETIVOS)


def downgrade() -> None:
    # Las respuestas y las reglas de conversación no caben en 0017: se detiene antes de perderlas.
    if not context.is_offline_mode():
        consultas = (
            "SELECT 1 FROM regla_desbloqueo WHERE tipo_objetivo = 'CONVERSACION'",
            "SELECT 1 FROM conversacion_vinculo WHERE respuesta_estudiante IS NOT NULL "
            "OR respuesta_apoderado IS NOT NULL",
        )
        if any(op.get_bind().execute(sa.text(consulta)).first() for consulta in consultas):
            raise RuntimeError('No se puede volver a 0017: hay reglas o respuestas de conversaciones.')
    _objetivos(OBJETIVOS_0017)
    with op.batch_alter_table('conversacion_vinculo', schema=None) as batch_op:
        batch_op.add_column(sa.Column('conversado', sa.Boolean(), server_default=sa.false(), nullable=False))
        batch_op.add_column(sa.Column('conversado_en', sa.DateTime(), nullable=True))
    op.execute("UPDATE conversacion_vinculo SET conversado = true, conversado_en = conversada_en "
               "WHERE conversada_en IS NOT NULL")
    with op.batch_alter_table('conversacion_vinculo', schema=None) as batch_op:
        batch_op.drop_constraint(batch_op.f(FK_CONVERSADA_POR), type_='foreignkey')
        for columna in ('conversada_por', 'conversada_en', 'respondida_apoderado_en', 'respuesta_apoderado',
                        'respondida_estudiante_en', 'respuesta_estudiante'):
            batch_op.drop_column(columna)

    with op.batch_alter_table('conversacion', schema=None) as batch_op:
        batch_op.add_column(sa.Column('tema', sa.Text(), nullable=True))
    op.execute("UPDATE conversacion SET tema = pregunta_estudiante")
    with op.batch_alter_table('conversacion', schema=None) as batch_op:
        batch_op.alter_column('tema', existing_type=sa.Text(), nullable=False)
        batch_op.drop_constraint(batch_op.f('uq_conversacion_orden'), type_='unique')
        for columna in ('mensaje_diferencias', 'preguntas_guia', 'pregunta_apoderado', 'pregunta_estudiante', 'orden'):
            batch_op.drop_column(columna)
