"""favoritos de fichas y testimonios y sus eventos MARCA_FAVORITO_FICHA y MARCA_FAVORITO_TESTIMONIO (ajuste mochila)

Revisión: 0031
Revisión anterior: 0030
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa


revision: str = '0031'
down_revision: Union[str, Sequence[str], None] = '0030'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

EVENTOS_0030 = ("'INGRESO', 'COMPLETA_ACTIVIDAD', 'COMPLETA_BLOQUE', 'RESPUESTA_REFLEXIVA', 'ESCRIBE_ENTRADA_DIARIO', "
                "'ESCRIBE_ENTRADA_LIBRE', 'REGISTRA_CHECK_IN', 'VISTA_CARRERA', 'SUPERA_CASO', 'PUBLICA_ENTREVISTA', "
                "'ESCRIBE_CARTA', 'COMPLETA_CONVERSACION', 'REINICIA_INSTRUMENTO', 'INVITA_A_CREW', 'FORMA_CREW', "
                "'VENCE_DESAFIO_INTACTO', 'REGISTRO_ADECUADO', 'REVELA_RESULTADO', 'SUPERA_BATALLA', 'VISTA_TESTIMONIO', "
                "'VISTA_OCUPACION', 'VISTA_INSTITUCION', 'MARCA_FAVORITO', 'CREA_PLAN', 'ACTUALIZA_PLAN', 'ELIMINA_PLAN', "
                "'VISTA_FICHA'")
EVENTOS = f"{EVENTOS_0030}, 'MARCA_FAVORITO_FICHA', 'MARCA_FAVORITO_TESTIMONIO'"
FAVORITOS_0030 = "'CARRERA', 'OCUPACION', 'INSTITUCION'"
FAVORITOS = f"{FAVORITOS_0030}, 'FICHA', 'TESTIMONIO'"
NUEVOS_EVENTOS = ('MARCA_FAVORITO_FICHA', 'MARCA_FAVORITO_TESTIMONIO')


def _cambiar_checks(eventos, favoritos, largo, largo_anterior) -> None:
    # --autogenerate no detecta el cambio del CHECK de un enumerado no nativo (como en 0017 y 0030).
    for tabla, columna in (('evento_uso', 'tipo'), ('condicion_desbloqueo', 'tipo_evento')):
        with op.batch_alter_table(tabla, schema=None) as batch_op:
            # El enumerado no nativo es un VARCHAR del largo de su valor más largo (MARCA_FAVORITO_TESTIMONIO, 25).
            batch_op.alter_column(columna, type_=sa.String(largo), existing_type=sa.String(largo_anterior),
                                  existing_nullable=False)
            batch_op.drop_constraint(op.f(f'ck_{tabla}_tipoeventouso'), type_='check')
            batch_op.create_check_constraint(op.f(f'ck_{tabla}_tipoeventouso'), f"{columna} IN ({eventos})")
    with op.batch_alter_table('favorito', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_favorito_tipofavorito'), type_='check')
        batch_op.create_check_constraint(op.f('ck_favorito_tipofavorito'), f"tipo IN ({favoritos})")


def upgrade() -> None:
    _cambiar_checks(EVENTOS, FAVORITOS, 25, 22)


def downgrade() -> None:
    # Evita iniciar una reconstrucción que dejaría una tabla temporal en SQLite.
    if not context.is_offline_mode():
        evento = sa.table('evento_uso', sa.column('tipo', sa.String()))
        condicion = sa.table('condicion_desbloqueo', sa.column('tipo_evento', sa.String()))
        favorito = sa.table('favorito', sa.column('tipo', sa.String()))
        enlace = op.get_bind()
        if (enlace.execute(sa.select(evento.c.tipo).where(evento.c.tipo.in_(NUEVOS_EVENTOS)).limit(1)).first()
                or enlace.execute(sa.select(condicion.c.tipo_evento).where(
                    condicion.c.tipo_evento.in_(NUEVOS_EVENTOS)).limit(1)).first()
                or enlace.execute(sa.select(favorito.c.tipo).where(
                    favorito.c.tipo.in_(('FICHA', 'TESTIMONIO'))).limit(1)).first()):
            raise RuntimeError('No se puede volver a 0030: existen favoritos de fichas o testimonios o sus eventos.')
    _cambiar_checks(EVENTOS_0030, FAVORITOS_0030, 22, 25)
