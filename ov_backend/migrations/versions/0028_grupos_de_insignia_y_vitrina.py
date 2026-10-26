"""grupos de insignia, vitrina y textos del pasaporte (ajuste pasaporte-perfil)

Revisión: 0028
Revisión anterior: 0027
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa


revision: str = '0028'
down_revision: Union[str, Sequence[str], None] = '0027'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('grupo_insignia',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('codigo', sa.String(), nullable=False),
    sa.Column('nombre', sa.String(), nullable=False),
    sa.Column('orden', sa.Integer(), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_grupo_insignia')),
    sa.UniqueConstraint('codigo', name=op.f('uq_grupo_insignia_codigo'))
    )
    op.create_table('insignia_vitrina',
    sa.Column('cuenta_id', sa.Integer(), nullable=False),
    sa.Column('insignia_id', sa.Integer(), nullable=False),
    sa.Column('orden', sa.Integer(), nullable=False),
    sa.CheckConstraint('orden BETWEEN 1 AND 3', name=op.f('ck_insignia_vitrina_orden_vitrina_valido')),
    sa.ForeignKeyConstraint(['cuenta_id'], ['cuenta.id'], name=op.f('fk_insignia_vitrina_cuenta_id_cuenta')),
    sa.ForeignKeyConstraint(['insignia_id'], ['insignia.id'], name=op.f('fk_insignia_vitrina_insignia_id_insignia')),
    sa.PrimaryKeyConstraint('cuenta_id', 'insignia_id', name=op.f('pk_insignia_vitrina')),
    sa.UniqueConstraint('cuenta_id', 'orden', name=op.f('uq_insignia_vitrina_cuenta_id'))
    )
    with op.batch_alter_table('condicion_desbloqueo', schema=None) as batch_op:
        batch_op.add_column(sa.Column('texto', sa.String(), nullable=True))

    # Las insignias existentes van a un grupo por defecto y con orden 0; el conjunto de datos los reemplaza al recargarse.
    with op.batch_alter_table('insignia', schema=None) as batch_op:
        batch_op.add_column(sa.Column('grupo_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('orden', sa.Integer(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('pista', sa.Text(), nullable=True))
    # Sin consultar antes, para que también compile en modo offline (PostgreSQL).
    op.execute("INSERT INTO grupo_insignia (codigo, nombre, orden) "
               "SELECT 'GENERAL', 'Insignias', 1 WHERE EXISTS (SELECT 1 FROM insignia)")
    op.execute("UPDATE insignia SET grupo_id = (SELECT id FROM grupo_insignia WHERE codigo = 'GENERAL')")
    with op.batch_alter_table('insignia', schema=None) as batch_op:
        batch_op.alter_column('grupo_id', existing_type=sa.Integer(), nullable=False)
        batch_op.alter_column('orden', existing_type=sa.Integer(), server_default=None)
        batch_op.create_foreign_key(batch_op.f('fk_insignia_grupo_id_grupo_insignia'), 'grupo_insignia', ['grupo_id'], ['id'])

    with op.batch_alter_table('nivel', schema=None) as batch_op:
        batch_op.add_column(sa.Column('descripcion', sa.Text(), nullable=True))



def downgrade() -> None:
    # Bajar perdería las páginas, pistas, textos y vitrinas: se detiene si hay grupos (como 0013 y siguientes).
    if not context.is_offline_mode() and op.get_bind().execute(sa.text('SELECT 1 FROM grupo_insignia')).first():
        raise RuntimeError('No se puede bajar 0028: existen grupos de insignia')
    with op.batch_alter_table('nivel', schema=None) as batch_op:
        batch_op.drop_column('descripcion')

    with op.batch_alter_table('insignia', schema=None) as batch_op:
        batch_op.drop_constraint(batch_op.f('fk_insignia_grupo_id_grupo_insignia'), type_='foreignkey')
        batch_op.drop_column('pista')
        batch_op.drop_column('orden')
        batch_op.drop_column('grupo_id')

    with op.batch_alter_table('condicion_desbloqueo', schema=None) as batch_op:
        batch_op.drop_column('texto')

    op.drop_table('insignia_vitrina')
    op.drop_table('grupo_insignia')
