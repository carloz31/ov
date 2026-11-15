"""configuración del colegio: obligatorio y visibilidad del instrumento, y dos tablas por colegio

Ajuste panel-entrevistas-configuracion. Salen `salon_instrumento` y `salon_actividad_prioritaria`, que estaban en la
caché de definiciones. Lo que había pasa al colegio de cada salón: un registro destacado en algún salón queda destacado
en su colegio, y un cuestionario SEGUN_COLEGIO visible en algún salón queda visible en su colegio. La partida y el test
de intereses son obligatorios; intereses siempre se ve, partida nunca, y los otros dos según el colegio. Al bajar, cada
salón recibe la configuración de su colegio (los obligatorios que no son COMPARACION, como prioritarios).

Revisión: 0059
Revisión anterior: 0058
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0059'
down_revision: Union[str, Sequence[str], None] = '0058'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('colegio_instrumento_visible',
    sa.Column('colegio_id', sa.Integer(), nullable=False),
    sa.Column('instrumento_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['colegio_id'], ['colegio.id'], name=op.f('fk_colegio_instrumento_visible_colegio_id_colegio')),
    sa.ForeignKeyConstraint(['instrumento_id'], ['instrumento.id'], name=op.f('fk_colegio_instrumento_visible_instrumento_id_instrumento')),
    sa.PrimaryKeyConstraint('colegio_id', 'instrumento_id', name=op.f('pk_colegio_instrumento_visible'))
    )
    op.create_table('colegio_actividad_destacada',
    sa.Column('colegio_id', sa.Integer(), nullable=False),
    sa.Column('actividad_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['actividad_id'], ['actividad.id'], name=op.f('fk_colegio_actividad_destacada_actividad_id_actividad')),
    sa.ForeignKeyConstraint(['colegio_id'], ['colegio.id'], name=op.f('fk_colegio_actividad_destacada_colegio_id_colegio')),
    sa.PrimaryKeyConstraint('colegio_id', 'actividad_id', name=op.f('pk_colegio_actividad_destacada'))
    )
    with op.batch_alter_table('instrumento', schema=None) as batch_op:
        batch_op.add_column(sa.Column('obligatorio', sa.Boolean(), server_default=sa.false(), nullable=False))
        batch_op.add_column(sa.Column('visibilidad_apoderado', sa.Enum('SIEMPRE', 'NUNCA', 'SEGUN_COLEGIO', name='visibilidadapoderado', native_enum=False, create_constraint=True), server_default=sa.text("'SEGUN_COLEGIO'"), nullable=False))
    op.execute("UPDATE instrumento SET obligatorio = true WHERE codigo IN ('TEST-PARTIDA-LLEGADA', 'TEST-RIASEC')")
    op.execute("UPDATE instrumento SET visibilidad_apoderado = 'SIEMPRE' WHERE codigo = 'TEST-RIASEC'")
    op.execute("UPDATE instrumento SET visibilidad_apoderado = 'NUNCA' WHERE codigo = 'TEST-PARTIDA-LLEGADA'")
    op.execute('INSERT INTO colegio_actividad_destacada (colegio_id, actividad_id) '
               'SELECT DISTINCT salon.colegio_id, p.actividad_id FROM salon_actividad_prioritaria p '
               'JOIN salon ON salon.id = p.salon_id')
    op.execute('INSERT INTO colegio_instrumento_visible (colegio_id, instrumento_id) '
               'SELECT DISTINCT salon.colegio_id, si.instrumento_id FROM salon_instrumento si '
               'JOIN salon ON salon.id = si.salon_id JOIN instrumento ON instrumento.id = si.instrumento_id '
               "WHERE si.visible_apoderado AND instrumento.visibilidad_apoderado = 'SEGUN_COLEGIO'")
    op.drop_table('salon_instrumento')
    op.drop_table('salon_actividad_prioritaria')


def downgrade() -> None:
    op.create_table('salon_actividad_prioritaria',
    sa.Column('salon_id', sa.INTEGER(), nullable=False),
    sa.Column('actividad_id', sa.INTEGER(), nullable=False),
    sa.ForeignKeyConstraint(['actividad_id'], ['actividad.id'], name=op.f('fk_salon_actividad_prioritaria_actividad_id_actividad')),
    sa.ForeignKeyConstraint(['salon_id'], ['salon.id'], name=op.f('fk_salon_actividad_prioritaria_salon_id_salon')),
    sa.PrimaryKeyConstraint('salon_id', 'actividad_id', name=op.f('pk_salon_actividad_prioritaria'))
    )
    op.create_table('salon_instrumento',
    sa.Column('salon_id', sa.INTEGER(), nullable=False),
    sa.Column('instrumento_id', sa.INTEGER(), nullable=False),
    sa.Column('es_prioritario', sa.BOOLEAN(), server_default=sa.false(), nullable=False),
    sa.Column('visible_apoderado', sa.BOOLEAN(), server_default=sa.false(), nullable=False),
    sa.ForeignKeyConstraint(['instrumento_id'], ['instrumento.id'], name=op.f('fk_salon_instrumento_instrumento_id_instrumento')),
    sa.ForeignKeyConstraint(['salon_id'], ['salon.id'], name=op.f('fk_salon_instrumento_salon_id_salon')),
    sa.PrimaryKeyConstraint('salon_id', 'instrumento_id', name=op.f('pk_salon_instrumento'))
    )
    op.execute('INSERT INTO salon_actividad_prioritaria (salon_id, actividad_id) '
               'SELECT salon.id, d.actividad_id FROM colegio_actividad_destacada d '
               'JOIN salon ON salon.colegio_id = d.colegio_id')
    op.execute(
        'INSERT INTO salon_instrumento (salon_id, instrumento_id, es_prioritario, visible_apoderado) '
        'SELECT salon.id, instrumento.id, '
        "CASE WHEN instrumento.obligatorio AND instrumento.tipo_resultado <> 'COMPARACION' THEN true ELSE false END, "
        "CASE WHEN instrumento.visibilidad_apoderado = 'SIEMPRE' OR v.instrumento_id IS NOT NULL THEN true ELSE false END "
        'FROM salon CROSS JOIN instrumento '
        'LEFT JOIN colegio_instrumento_visible v ON v.colegio_id = salon.colegio_id AND v.instrumento_id = instrumento.id '
        "WHERE (instrumento.obligatorio AND instrumento.tipo_resultado <> 'COMPARACION') "
        "OR instrumento.visibilidad_apoderado = 'SIEMPRE' OR v.instrumento_id IS NOT NULL")
    with op.batch_alter_table('instrumento', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_instrumento_visibilidadapoderado'), type_='check')
        batch_op.drop_column('visibilidad_apoderado')
        batch_op.drop_column('obligatorio')
    op.drop_table('colegio_actividad_destacada')
    op.drop_table('colegio_instrumento_visible')
