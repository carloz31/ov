"""testimonio con video por tramo y línea de contexto, sin enlace ni años de experiencia (ajuste testimonios).

El ID de cada video se toma de su enlace; un enlace que no es de YouTube detiene la migración. Al bajar, el enlace se
reconstruye desde el ID y los años vuelven nulos, porque no se pueden recuperar.

Revisión: 0045
Revisión anterior: 0044
"""

import re
from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa


revision: str = '0045'
down_revision: Union[str, Sequence[str], None] = '0044'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_ID_DE_ENLACE = re.compile(r'(?:youtu\.be/|[?&]v=|/embed/|/shorts/|/live/)([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])')


def upgrade() -> None:
    with op.batch_alter_table('testimonio', schema=None) as batch_op:
        batch_op.add_column(sa.Column('video_id', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('inicio', sa.Integer(), server_default=sa.text('0'), nullable=False))
        batch_op.add_column(sa.Column('fin', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('contexto', sa.String(), nullable=True))

    if not context.is_offline_mode():
        conexion = op.get_bind()
        tabla = sa.table('testimonio', sa.column('id', sa.Integer), sa.column('codigo', sa.String),
                         sa.column('enlace', sa.String), sa.column('video_id', sa.String))
        for fila in conexion.execute(sa.select(tabla.c.id, tabla.c.codigo, tabla.c.enlace)).all():
            encontrado = _ID_DE_ENLACE.search(fila.enlace)
            if encontrado is None:
                raise ValueError(f'El testimonio {fila.codigo} no tiene un enlace de YouTube: {fila.enlace}')
            conexion.execute(tabla.update().where(tabla.c.id == fila.id).values(video_id=encontrado.group(1)))

    with op.batch_alter_table('testimonio', schema=None) as batch_op:
        batch_op.alter_column('video_id', existing_type=sa.String(), nullable=False)
        batch_op.drop_column('anios_experiencia')
        batch_op.drop_column('enlace')


def downgrade() -> None:
    with op.batch_alter_table('testimonio', schema=None) as batch_op:
        batch_op.add_column(sa.Column('enlace', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('anios_experiencia', sa.Integer(), nullable=True))

    if not context.is_offline_mode():
        conexion = op.get_bind()
        tabla = sa.table('testimonio', sa.column('id', sa.Integer), sa.column('enlace', sa.String),
                         sa.column('video_id', sa.String))
        for fila in conexion.execute(sa.select(tabla.c.id, tabla.c.video_id)).all():
            conexion.execute(tabla.update().where(tabla.c.id == fila.id)
                             .values(enlace=f'https://www.youtube.com/watch?v={fila.video_id}'))

    with op.batch_alter_table('testimonio', schema=None) as batch_op:
        batch_op.alter_column('enlace', existing_type=sa.String(), nullable=False)
        batch_op.drop_column('contexto')
        batch_op.drop_column('fin')
        batch_op.drop_column('inicio')
        batch_op.drop_column('video_id')
