"""colegio: la tabla y el colegio de cada salón

Los salones que ya existen quedan en un mismo colegio, así que no aparecen datos cruzados entre colegios. En una base
sin salones no se inserta nada, para que la carga de datos cree los suyos.

Revisión: 0047
Revisión anterior: 0046
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0047'
down_revision: Union[str, Sequence[str], None] = '0046'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('colegio',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('codigo', sa.String(), nullable=False),
    sa.Column('nombre', sa.String(), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_colegio')),
    sa.UniqueConstraint('codigo', name=op.f('uq_colegio_codigo'))
    )
    with op.batch_alter_table('salon', schema=None) as batch_op:
        batch_op.add_column(sa.Column('colegio_id', sa.Integer(), nullable=True))
    # Sin leer la base en Python: también debe compilar en modo desconectado (`--sql`).
    op.execute("INSERT INTO colegio (codigo, nombre) SELECT 'col-piloto', 'Technology School - Sede Palao' "
               "WHERE EXISTS (SELECT 1 FROM salon)")
    op.execute("UPDATE salon SET colegio_id = (SELECT id FROM colegio WHERE codigo = 'col-piloto')")
    with op.batch_alter_table('salon', schema=None) as batch_op:
        batch_op.alter_column('colegio_id', existing_type=sa.Integer(), nullable=False)
        batch_op.create_foreign_key(batch_op.f('fk_salon_colegio_id_colegio'), 'colegio', ['colegio_id'], ['id'])


def downgrade() -> None:
    with op.batch_alter_table('salon', schema=None) as batch_op:
        batch_op.drop_constraint(batch_op.f('fk_salon_colegio_id_colegio'), type_='foreignkey')
        batch_op.drop_column('colegio_id')
    op.drop_table('colegio')
