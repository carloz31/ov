"""panel-estudiantes: textos de perfil de las alertas, grupos fuera del Inicio y notas de la orientadora

Ajuste panel-estudiantes, F1. `grupo_alerta.en_inicio` (los temas «Para conversar» van en un grupo que no cuenta en
el Inicio), `alerta.nombre_perfil`, `descripcion_perfil` y `destino` (textos y pestaña cuando se habla de un
estudiante) y la tabla de estado `nota_orientadora` (HU-108). Las filas existentes de `grupo_alerta` quedan en el
Inicio; los textos de perfil los pone la carga de `datos/fijos.py`.

Revisión: 0057
Revisión anterior: 0056
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0057'
down_revision: Union[str, Sequence[str], None] = '0056'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('nota_orientadora',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('numero', sa.Integer(), nullable=False),
    sa.Column('orientadora_id', sa.Integer(), nullable=False),
    sa.Column('estudiante_id', sa.Integer(), nullable=False),
    sa.Column('texto', sa.Text(), nullable=False),
    sa.Column('creada_en', sa.DateTime(), nullable=False),
    sa.Column('actualizada_en', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['estudiante_id'], ['cuenta.id'], name=op.f('fk_nota_orientadora_estudiante_id_cuenta')),
    sa.ForeignKeyConstraint(['orientadora_id'], ['cuenta.id'], name=op.f('fk_nota_orientadora_orientadora_id_cuenta')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_nota_orientadora')),
    sa.UniqueConstraint('orientadora_id', 'numero', name=op.f('uq_nota_orientadora_numero'))
    )
    with op.batch_alter_table('nota_orientadora', schema=None) as batch_op:
        batch_op.create_index('ix_nota_orientadora_orientadora_estudiante', ['orientadora_id', 'estudiante_id'],
                              unique=False)

    with op.batch_alter_table('alerta', schema=None) as batch_op:
        batch_op.add_column(sa.Column('nombre_perfil', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('descripcion_perfil', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('destino', sa.Enum('TESTS', 'PLANES', 'RESPUESTAS', 'AVANCE', name='destinoperfil',
                                                         native_enum=False, create_constraint=True), nullable=True))

    with op.batch_alter_table('grupo_alerta', schema=None) as batch_op:
        batch_op.add_column(sa.Column('en_inicio', sa.Boolean(), server_default=sa.true(), nullable=False))


def downgrade() -> None:
    with op.batch_alter_table('grupo_alerta', schema=None) as batch_op:
        batch_op.drop_column('en_inicio')

    with op.batch_alter_table('alerta', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_alerta_destinoperfil'), type_='check')
        batch_op.drop_column('destino')
        batch_op.drop_column('descripcion_perfil')
        batch_op.drop_column('nombre_perfil')

    with op.batch_alter_table('nota_orientadora', schema=None) as batch_op:
        batch_op.drop_index('ix_nota_orientadora_orientadora_estudiante')

    op.drop_table('nota_orientadora')
