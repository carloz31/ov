"""panel-salon: alertas configurables y parámetros del panel del salón

Ajuste panel-salon, F1. Tablas nuevas de catálogo `grupo_alerta`, `alerta` (con `parametros` JSON y el nombre del
evaluador que la calcula) y `parametro` (umbrales y cantidades del panel, como texto). Las llena la carga de
`datos/fijos.py`; no hay datos que migrar.

Revisión: 0056
Revisión anterior: 0055
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0056'
down_revision: Union[str, Sequence[str], None] = '0055'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('grupo_alerta',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('codigo', sa.String(), nullable=False),
    sa.Column('nombre', sa.String(), nullable=False),
    sa.Column('orden', sa.Integer(), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_grupo_alerta')),
    sa.UniqueConstraint('codigo', name=op.f('uq_grupo_alerta_codigo'))
    )
    op.create_table('parametro',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('codigo', sa.String(), nullable=False),
    sa.Column('valor', sa.String(), nullable=False),
    sa.Column('descripcion', sa.Text(), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_parametro')),
    sa.UniqueConstraint('codigo', name=op.f('uq_parametro_codigo'))
    )
    op.create_table('alerta',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('codigo', sa.String(), nullable=False),
    sa.Column('grupo_id', sa.Integer(), nullable=False),
    sa.Column('nombre', sa.String(), nullable=False),
    sa.Column('descripcion', sa.Text(), nullable=True),
    sa.Column('evaluador', sa.String(), nullable=False),
    sa.Column('parametros', sa.JSON(), nullable=False),
    sa.Column('orden', sa.Integer(), nullable=False),
    sa.Column('activa', sa.Boolean(), server_default=sa.true(), nullable=False),
    sa.ForeignKeyConstraint(['grupo_id'], ['grupo_alerta.id'], name=op.f('fk_alerta_grupo_id_grupo_alerta')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_alerta')),
    sa.UniqueConstraint('codigo', name=op.f('uq_alerta_codigo'))
    )


def downgrade() -> None:
    op.drop_table('alerta')
    op.drop_table('parametro')
    op.drop_table('grupo_alerta')
