"""diario: recomendaciones, números de entrada y referencia a favoritos

Revisión: 0016
Revisión anterior: 0015
"""

from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa


revision: str = '0016'
down_revision: Union[str, Sequence[str], None] = '0015'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

REFERENCIAS_0015 = "'ELECCION', 'TEXTO', 'RESULTADO', 'COINCIDENCIAS', 'RESPUESTA_CUESTIONARIO'"
REFERENCIAS = f"{REFERENCIAS_0015}, 'FAVORITOS'"
ORIGENES_0015 = "'GUIADA', 'LIBRE'"
ORIGENES = f"{ORIGENES_0015}, 'RECOMENDACION_DIA'"
PREGUNTA_SEGUN_ORIGEN = ("(origen = 'GUIADA' AND pregunta_id IS NOT NULL) OR "
                         "(origen = 'LIBRE' AND pregunta_id IS NULL)")
RECOMENDACION_SEGUN_ORIGEN = ("(origen = 'LIBRE') = (recomendacion_id IS NULL) AND "
                              "(origen = 'LIBRE') = (numero_libre IS NOT NULL)")


def upgrade() -> None:
    op.create_table('contador_diario',
    sa.Column('cuenta_id', sa.Integer(), nullable=False),
    sa.Column('ultimo_numero', sa.Integer(), nullable=False),
    sa.Column('ultimo_libre', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['cuenta_id'], ['cuenta.id'], name=op.f('fk_contador_diario_cuenta_id_cuenta')),
    sa.PrimaryKeyConstraint('cuenta_id', name=op.f('pk_contador_diario'))
    )
    op.create_table('recomendacion',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('cuenta_id', sa.Integer(), nullable=False),
    sa.Column('pregunta_diario_id', sa.Integer(), nullable=False),
    sa.Column('tipo', sa.Enum('DESBLOQUEADA', 'DIARIA', name='tiporecomendacion', native_enum=False, create_constraint=True), nullable=False),
    sa.Column('contexto', sa.JSON(none_as_null=True), nullable=True),
    sa.Column('texto', sa.Text(), nullable=True),
    sa.Column('origen', sa.Enum('FIJA', 'LLM', name='origenredaccion', native_enum=False, create_constraint=True), nullable=True),
    sa.Column('fecha', sa.Date(), nullable=True),
    sa.Column('creada_en', sa.DateTime(), nullable=False),
    sa.CheckConstraint("(tipo = 'DIARIA') = (fecha IS NOT NULL)", name=op.f('ck_recomendacion_fecha_solo_diaria')),
    sa.CheckConstraint('(texto IS NULL) = (origen IS NULL)', name=op.f('ck_recomendacion_texto_con_origen')),
    sa.ForeignKeyConstraint(['cuenta_id'], ['cuenta.id'], name=op.f('fk_recomendacion_cuenta_id_cuenta')),
    sa.ForeignKeyConstraint(['pregunta_diario_id'], ['pregunta_diario.id'], name=op.f('fk_recomendacion_pregunta_diario_id_pregunta_diario')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_recomendacion'))
    )
    with op.batch_alter_table('recomendacion', schema=None) as batch_op:
        batch_op.create_index('recomendacion_desbloqueada_unica', ['cuenta_id', 'pregunta_diario_id'], unique=True, sqlite_where=sa.text("tipo = 'DESBLOQUEADA'"), postgresql_where=sa.text("tipo = 'DESBLOQUEADA'"))
        batch_op.create_index('recomendacion_diaria_unica', ['cuenta_id', 'fecha'], unique=True, sqlite_where=sa.text("tipo = 'DIARIA'"), postgresql_where=sa.text("tipo = 'DIARIA'"))

    # Preguntas existentes: desbloqueables, fijas y con el código como nombre provisional.
    with op.batch_alter_table('pregunta_diario', schema=None) as batch_op:
        batch_op.add_column(sa.Column('nombre', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('personalizada', sa.Boolean(), server_default=sa.false(), nullable=False))
        batch_op.add_column(sa.Column('uso', sa.Enum('DESBLOQUEABLE', 'DIARIA', name='usopreguntadiario', native_enum=False, create_constraint=True), nullable=True))
        batch_op.add_column(sa.Column('dimension_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(batch_op.f('fk_pregunta_diario_dimension_id_dimension'), 'dimension', ['dimension_id'], ['id'])
    op.execute("UPDATE pregunta_diario SET nombre = codigo, uso = 'DESBLOQUEABLE'")
    with op.batch_alter_table('pregunta_diario', schema=None) as batch_op:
        batch_op.alter_column('nombre', existing_type=sa.String(), nullable=False)
        batch_op.alter_column('uso', existing_type=sa.String(length=13), nullable=False)
        batch_op.create_check_constraint(op.f('ck_pregunta_diario_dimension_solo_diaria'),
                                         "uso = 'DIARIA' OR dimension_id IS NULL")

    # --autogenerate no detecta el CHECK de los enumerados no nativos ni los CHECK de la tabla.
    with op.batch_alter_table('entrada_diario', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_entrada_diario_origenentrada'), type_='check')
        batch_op.drop_constraint(op.f('ck_entrada_diario_pregunta_segun_origen'), type_='check')
        batch_op.drop_index('entrada_guiada_unica', sqlite_where=sa.text("origen = 'GUIADA'"),
                            postgresql_where=sa.text("origen = 'GUIADA'"))
        batch_op.alter_column('origen', existing_type=sa.String(length=6), type_=sa.String(length=17),
                              existing_nullable=False)
        batch_op.add_column(sa.Column('recomendacion_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('numero', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('numero_libre', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('titulo', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('actualizada_en', sa.DateTime(), nullable=True))

    # Cada pregunta ya desbloqueada o respondida pasa a ser una recomendación fija.
    op.execute("""
        INSERT INTO recomendacion (cuenta_id, pregunta_diario_id, tipo, texto, origen, creada_en)
        SELECT d.cuenta_id, p.id, 'DESBLOQUEADA', p.pregunta, 'FIJA', MIN(d.fecha_hora)
        FROM desbloqueo d
        JOIN regla_desbloqueo r ON r.id = d.regla_id AND r.tipo_objetivo = 'PREGUNTA_DIARIO'
        JOIN pregunta_diario p ON p.id = r.id_objetivo
        GROUP BY d.cuenta_id, p.id, p.pregunta
    """)
    op.execute("""
        INSERT INTO recomendacion (cuenta_id, pregunta_diario_id, tipo, texto, origen, creada_en)
        SELECT e.cuenta_id, p.id, 'DESBLOQUEADA', p.pregunta, 'FIJA', e.fecha_hora
        FROM entrada_diario e JOIN pregunta_diario p ON p.id = e.pregunta_id
        WHERE e.origen = 'GUIADA' AND NOT EXISTS (
            SELECT 1 FROM recomendacion x WHERE x.cuenta_id = e.cuenta_id AND x.pregunta_diario_id = p.id)
    """)
    op.execute("""
        UPDATE entrada_diario SET recomendacion_id = (
            SELECT x.id FROM recomendacion x
            WHERE x.cuenta_id = entrada_diario.cuenta_id AND x.pregunta_diario_id = entrada_diario.pregunta_id)
        WHERE origen = 'GUIADA'
    """)
    op.execute("""
        UPDATE entrada_diario SET numero = (
            SELECT COUNT(*) FROM entrada_diario o WHERE o.cuenta_id = entrada_diario.cuenta_id AND o.id <= entrada_diario.id)
    """)
    op.execute("""
        UPDATE entrada_diario SET numero_libre = (
            SELECT COUNT(*) FROM entrada_diario o
            WHERE o.cuenta_id = entrada_diario.cuenta_id AND o.origen = 'LIBRE' AND o.id <= entrada_diario.id)
        WHERE origen = 'LIBRE'
    """)
    op.execute("""
        INSERT INTO contador_diario (cuenta_id, ultimo_numero, ultimo_libre)
        SELECT cuenta_id, MAX(numero), COALESCE(MAX(numero_libre), 0) FROM entrada_diario GROUP BY cuenta_id
    """)

    with op.batch_alter_table('entrada_diario', schema=None) as batch_op:
        batch_op.drop_constraint(batch_op.f('fk_entrada_diario_pregunta_id_pregunta_diario'), type_='foreignkey')
        batch_op.drop_column('pregunta_id')
        batch_op.alter_column('numero', existing_type=sa.Integer(), nullable=False)
        batch_op.create_unique_constraint(batch_op.f('uq_entrada_diario_cuenta_id'), ['cuenta_id', 'numero'])
        batch_op.create_unique_constraint(batch_op.f('uq_entrada_diario_recomendacion_id'), ['recomendacion_id'])
        batch_op.create_foreign_key(batch_op.f('fk_entrada_diario_recomendacion_id_recomendacion'), 'recomendacion', ['recomendacion_id'], ['id'])
        batch_op.create_check_constraint(op.f('ck_entrada_diario_origenentrada'), f"origen IN ({ORIGENES})")
        batch_op.create_check_constraint(op.f('ck_entrada_diario_recomendacion_segun_origen'), RECOMENDACION_SEGUN_ORIGEN)

    with op.batch_alter_table('referencia', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_referencia_tiporeferencia'), type_='check')
    with op.batch_alter_table('referencia', schema=None) as batch_op:
        batch_op.create_check_constraint(op.f('ck_referencia_tiporeferencia'), f"tipo IN ({REFERENCIAS})")
        batch_op.create_check_constraint(op.f('ck_referencia_favoritos_sin_fuente'),
                                         "tipo <> 'FAVORITOS' OR item_registro_id IS NULL")


def downgrade() -> None:
    if not context.is_offline_mode():
        conexion = op.get_bind()
        for consulta, motivo in (
            ("SELECT 1 FROM referencia WHERE tipo = 'FAVORITOS'", 'hay referencias a favoritos'),
            ("SELECT 1 FROM recomendacion WHERE tipo = 'DIARIA' OR origen = 'LLM' OR texto IS NULL",
             'hay preguntas del día o personalizadas'),
            ("SELECT 1 FROM pregunta_diario WHERE uso = 'DIARIA' OR personalizada", 'hay preguntas DIARIA o personalizadas'),
        ):
            if conexion.execute(sa.text(consulta)).first():
                raise RuntimeError(f'No se puede volver a 0015: {motivo}.')
    with op.batch_alter_table('referencia', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_referencia_favoritos_sin_fuente'), type_='check')
        batch_op.drop_constraint(op.f('ck_referencia_tiporeferencia'), type_='check')
    with op.batch_alter_table('referencia', schema=None) as batch_op:
        batch_op.create_check_constraint(op.f('ck_referencia_tiporeferencia'), f"tipo IN ({REFERENCIAS_0015})")

    with op.batch_alter_table('entrada_diario', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_entrada_diario_recomendacion_segun_origen'), type_='check')
        batch_op.drop_constraint(op.f('ck_entrada_diario_origenentrada'), type_='check')
        batch_op.add_column(sa.Column('pregunta_id', sa.Integer(), nullable=True))
    op.execute("""
        UPDATE entrada_diario SET pregunta_id = (
            SELECT x.pregunta_diario_id FROM recomendacion x WHERE x.id = entrada_diario.recomendacion_id)
    """)
    with op.batch_alter_table('entrada_diario', schema=None) as batch_op:
        batch_op.drop_constraint(batch_op.f('fk_entrada_diario_recomendacion_id_recomendacion'), type_='foreignkey')
        batch_op.drop_constraint(batch_op.f('uq_entrada_diario_recomendacion_id'), type_='unique')
        batch_op.drop_constraint(batch_op.f('uq_entrada_diario_cuenta_id'), type_='unique')
        batch_op.create_foreign_key(batch_op.f('fk_entrada_diario_pregunta_id_pregunta_diario'), 'pregunta_diario', ['pregunta_id'], ['id'])
        batch_op.drop_column('actualizada_en')
        batch_op.drop_column('titulo')
        batch_op.drop_column('numero_libre')
        batch_op.drop_column('numero')
        batch_op.drop_column('recomendacion_id')
        batch_op.alter_column('origen', existing_type=sa.String(length=17), type_=sa.String(length=6),
                              existing_nullable=False)
        batch_op.create_index('entrada_guiada_unica', ['cuenta_id', 'pregunta_id'], unique=True,
                              sqlite_where=sa.text("origen = 'GUIADA'"), postgresql_where=sa.text("origen = 'GUIADA'"))
        batch_op.create_check_constraint(op.f('ck_entrada_diario_origenentrada'), f"origen IN ({ORIGENES_0015})")
        batch_op.create_check_constraint(op.f('ck_entrada_diario_pregunta_segun_origen'), PREGUNTA_SEGUN_ORIGEN)

    with op.batch_alter_table('pregunta_diario', schema=None) as batch_op:
        batch_op.drop_constraint(op.f('ck_pregunta_diario_dimension_solo_diaria'), type_='check')
        batch_op.drop_constraint(batch_op.f('fk_pregunta_diario_dimension_id_dimension'), type_='foreignkey')
        batch_op.drop_constraint(op.f('ck_pregunta_diario_usopreguntadiario'), type_='check')
        batch_op.drop_column('dimension_id')
        batch_op.drop_column('uso')
        batch_op.drop_column('personalizada')
        batch_op.drop_column('nombre')

    with op.batch_alter_table('recomendacion', schema=None) as batch_op:
        batch_op.drop_index('recomendacion_diaria_unica', sqlite_where=sa.text("tipo = 'DIARIA'"), postgresql_where=sa.text("tipo = 'DIARIA'"))
        batch_op.drop_index('recomendacion_desbloqueada_unica', sqlite_where=sa.text("tipo = 'DESBLOQUEADA'"), postgresql_where=sa.text("tipo = 'DESBLOQUEADA'"))
    op.drop_table('recomendacion')
    op.drop_table('contador_diario')
