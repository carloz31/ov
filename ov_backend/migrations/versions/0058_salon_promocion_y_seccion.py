"""salon: promoción y sección en lugar de nombre

Ajuste panel-entrevistas-configuracion. Los salones que ya existen toman la promoción 2026 y la sección de la letra
final de su nombre («Quinto A») o, si no termina en letra, de su código («5A»). Si alguno no permite deducirla, la
migración falla con su código. Al bajar, el nombre vuelve como el código.

Revisión: 0058
Revisión anterior: 0057
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa


revision: str = '0058'
down_revision: Union[str, Sequence[str], None] = '0057'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_ULTIMA_NOMBRE = "UPPER(SUBSTR(nombre, LENGTH(nombre), 1))"
_ULTIMA_CODIGO = "UPPER(SUBSTR(codigo, LENGTH(codigo), 1))"


def _es_letra(expresion):
    return f"{expresion} IN ({', '.join(repr(chr(c)) for c in range(ord('A'), ord('Z') + 1))})"


def upgrade() -> None:
    with op.batch_alter_table('salon', schema=None) as batch_op:
        batch_op.add_column(sa.Column('promocion', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('seccion', sa.String(), nullable=True))
    op.execute(
        f"UPDATE salon SET promocion = 2026, seccion = CASE "
        f"WHEN {_es_letra(_ULTIMA_NOMBRE)} THEN {_ULTIMA_NOMBRE} "
        f"WHEN {_es_letra(_ULTIMA_CODIGO)} THEN {_ULTIMA_CODIGO} END"
    )
    # Sin leer la base en modo desconectado (`--sql`): allí la restricción NOT NULL es la que falla.
    if not context.is_offline_mode():
        sin_seccion = op.get_bind().execute(
            sa.text('SELECT codigo FROM salon WHERE seccion IS NULL ORDER BY codigo')).scalars().all()
        if sin_seccion:
            raise RuntimeError(f'No se puede deducir la sección de los salones: {", ".join(sin_seccion)}')
    with op.batch_alter_table('salon', schema=None) as batch_op:
        batch_op.alter_column('promocion', existing_type=sa.Integer(), nullable=False)
        batch_op.alter_column('seccion', existing_type=sa.String(), nullable=False)
        batch_op.create_unique_constraint(batch_op.f('uq_salon_colegio_id'), ['colegio_id', 'promocion', 'seccion'])
        batch_op.drop_column('nombre')


def downgrade() -> None:
    with op.batch_alter_table('salon', schema=None) as batch_op:
        batch_op.add_column(sa.Column('nombre', sa.VARCHAR(), nullable=True))
    op.execute('UPDATE salon SET nombre = codigo')
    with op.batch_alter_table('salon', schema=None) as batch_op:
        batch_op.alter_column('nombre', existing_type=sa.VARCHAR(), nullable=False)
        batch_op.drop_constraint(batch_op.f('uq_salon_colegio_id'), type_='unique')
        batch_op.drop_column('seccion')
        batch_op.drop_column('promocion')
