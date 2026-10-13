"""Migraciones."""

from io import StringIO
from pathlib import Path
import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.script import ScriptDirectory
from fastapi.testclient import TestClient
from sqlalchemy import CheckConstraint, ForeignKeyConstraint, MetaData, UniqueConstraint, inspect, select, text
from sqlalchemy.dialects import postgresql
from sqlalchemy.exc import IntegrityError
from sqlalchemy.schema import AddConstraint, CreateIndex, CreateTable
from app import database
from app.main import crear_aplicacion
from app.models import Base
from datos.cargar import preparar_base


RUTA_CONFIGURACION = Path(__file__).resolve().parents[3] / 'alembic.ini'


@pytest.fixture
def base_migrada(tmp_path, monkeypatch):
    url = f'sqlite:///{(tmp_path / "migrada.db").as_posix()}'
    monkeypatch.setenv('DATABASE_URL', url)
    configuracion = Config(str(RUTA_CONFIGURACION))
    command.upgrade(configuracion, 'head')
    motor = database.crear_motor_bd(url)
    try:
        yield url, configuracion, motor
    finally:
        motor.dispose()


def normalizar(sql):
    return ' '.join(str(sql).split())


def test_migracion_inicial_coincide_completamente_con_modelos(base_migrada):
    _, configuracion, motor = base_migrada
    inspector = inspect(motor)
    assert len(Base.metadata.tables) == 56
    assert set(inspector.get_table_names()) == set(Base.metadata.tables) | {'alembic_version'}
    with motor.connect() as conexion:
        assert compare_metadata(MigrationContext.configure(conexion), Base.metadata) == []
        assert conexion.scalar(text('SELECT version_num FROM alembic_version')) == (
            ScriptDirectory.from_config(configuracion).get_current_head())
        assert conexion.scalar(text('PRAGMA foreign_keys')) == 1
        assert conexion.execute(text('PRAGMA foreign_key_check')).all() == []
    for tabla in Base.metadata.sorted_tables:
        columnas = inspector.get_columns(tabla.name)
        assert {c['name'] for c in columnas} == set(tabla.columns.keys())
        for columna in columnas:
            modelo = tabla.c[columna['name']]
            assert columna['nullable'] == modelo.nullable
            assert normalizar(columna['type'].compile(dialect=motor.dialect)) == normalizar(
                modelo.type.compile(dialect=motor.dialect))
            esperado = (normalizar(modelo.server_default.arg.compile(dialect=motor.dialect))
                        if modelo.server_default is not None else None)
            assert columna['default'] == esperado
        pk = inspector.get_pk_constraint(tabla.name)
        assert pk['name'] == tabla.primary_key.name
        assert pk['constrained_columns'] == [c.name for c in tabla.primary_key.columns]
        unicas = {(c['name'], tuple(c['column_names']))
                  for c in inspector.get_unique_constraints(tabla.name)}
        assert unicas == {(c.name, tuple(c.columns.keys())) for c in tabla.constraints
                          if isinstance(c, UniqueConstraint)}
        foraneas = {(c['name'], tuple(c['constrained_columns']), c['referred_table'],
                     tuple(c['referred_columns'])) for c in inspector.get_foreign_keys(tabla.name)}
        assert foraneas == {(c.name, tuple(c.columns.keys()), c.referred_table.name,
                             tuple(e.column.name for e in c.elements)) for c in tabla.constraints
                            if isinstance(c, ForeignKeyConstraint)}
        checks = {c['name']: normalizar(c['sqltext'])
                  for c in inspector.get_check_constraints(tabla.name)}
        assert checks == {c.name: normalizar(c.sqltext.compile(
            dialect=motor.dialect, compile_kwargs={'literal_binds': True, 'include_table': False}))
            for c in tabla.constraints if isinstance(c, CheckConstraint)}
        indices = inspector.get_indexes(tabla.name)
        assert {(i['name'], tuple(i['column_names']), bool(i['unique'])) for i in indices} == {
            (i.name, tuple(i.columns.keys()), bool(i.unique)) for i in tabla.indexes}
        for indice in indices:
            modelo = next(i for i in tabla.indexes if i.name == indice['name'])
            condicion = modelo.dialect_options['sqlite'].get('where')
            if condicion is not None:
                assert normalizar(indice['dialect_options']['sqlite_where']) == normalizar(condicion)


def test_upgrade_repetible_downgrade_y_nuevo_upgrade(base_migrada):
    _, configuracion, motor = base_migrada
    command.upgrade(configuracion, 'head')
    with motor.connect() as conexion:
        assert conexion.execute(text('SELECT version_num FROM alembic_version')).all() == [
            (ScriptDirectory.from_config(configuracion).get_current_head(),)]
    command.downgrade(configuracion, 'base')
    assert inspect(motor).get_table_names() == ['alembic_version']
    with motor.connect() as conexion:
        assert conexion.execute(text('SELECT version_num FROM alembic_version')).all() == []
    command.upgrade(configuracion, 'head')
    assert set(inspect(motor).get_table_names()) == set(Base.metadata.tables) | {'alembic_version'}


@pytest.mark.parametrize('conjunto', ['ruta'])
def test_carga_vaciado_y_reinicio_conservan_revision(base_migrada, conjunto):
    url, configuracion, motor = base_migrada
    preparar_base(url, conjunto)
    aplicacion = crear_aplicacion(url)
    with TestClient(aplicacion) as cliente:
        assert cliente.post('/desarrollo/reiniciar').json() == {'mensaje': 'Datos de prueba reiniciados'}
    preparar_base(url, conjunto, vaciar=True)
    with motor.connect() as conexion:
        assert conexion.execute(text('SELECT version_num FROM alembic_version')).all() == [
            (ScriptDirectory.from_config(configuracion).get_current_head(),)]
        assert conexion.execute(text('PRAGMA foreign_key_check')).all() == []


def test_esquema_migrado_vacio_arranca_y_rechaza_enumerado_invalido(base_migrada):
    url, _, motor = base_migrada
    with TestClient(crear_aplicacion(url)) as cliente:
        assert cliente.get('/cuentas').json() == []
    with pytest.raises(IntegrityError), motor.begin() as conexion:
        conexion.execute(text("INSERT INTO cuenta (codigo, nombre, rol) VALUES ('prueba', 'Prueba', 'INVALIDO')"))


def test_migracion_y_modelos_compilan_para_postgresql(monkeypatch):
    monkeypatch.setenv('DATABASE_URL', 'postgresql+psycopg://ov:ov@localhost/ov')
    salida = StringIO()
    command.upgrade(Config(str(RUTA_CONFIGURACION), output_buffer=salida), 'head', sql=True)
    sql = salida.getvalue()
    assert sql.count('CREATE TABLE ') == 58
    assert 'esquema_version' not in sql
    assert "json_typeof(criterios_objetivo) = 'array'" in sql
    assert "json_typeof(criterios_faltantes) = 'array'" in sql
    assert 'json_type(' not in sql and 'PRAGMA' not in sql
    assert "WHERE origen = 'GUIADA'" in sql
    assert 'WHERE anulado_en IS NULL' in sql
    assert sql.count('BOOLEAN DEFAULT false') == 12
    dialecto = postgresql.dialect()
    for tabla in Base.metadata.sorted_tables:
        ddl = str(CreateTable(tabla).compile(dialect=dialecto))
        assert 'json_type(' not in ddl
        for restriccion in tabla.constraints:
            assert restriccion.name is not None
            # PostgreSQL trunca determinísticamente los nombres que exceden su límite. Las FK con `use_alter`
            # (el ciclo entre `item_registro` y `referencia`) se crean aparte, con ALTER TABLE.
            ddl_restriccion = (str(AddConstraint(restriccion).compile(dialect=dialecto))
                               if getattr(restriccion, 'use_alter', False) else ddl)
            assert dialecto.identifier_preparer.format_constraint(restriccion) in ddl_restriccion
        for indice in tabla.indexes:
            ddl_indice = str(CreateIndex(indice).compile(dialect=dialecto))
            condicion = indice.dialect_options['sqlite'].get('where')
            if condicion is not None:
                assert str(indice.dialect_options['postgresql']['where']) == str(condicion)
                assert f'WHERE {condicion}' in ddl_indice


def test_migracion_0002_conserva_filas_y_referencias_de_0001(tmp_path, monkeypatch):
    url = f'sqlite:///{(tmp_path / "anterior.db").as_posix()}'
    monkeypatch.setenv('DATABASE_URL', url)
    configuracion = Config(str(RUTA_CONFIGURACION))
    command.upgrade(configuracion, '0001')
    motor = database.crear_motor_bd(url)
    try:
        with motor.begin() as conexion:
            # DATO DE PRUEBA: catálogo antiguo con estado que referencia la actividad.
            conexion.execute(text("INSERT INTO cuenta (id, codigo, nombre, rol) VALUES (1, 'prueba', 'Prueba', 'ESTUDIANTE')"))
            conexion.execute(text("INSERT INTO bloque (id, codigo, numero, nombre, espacio, audiencia) "
                                  "VALUES (1, 'B1', 1, 'Prueba', 'MISIONES_CAMPO', 'ESTUDIANTE')"))
            conexion.execute(text("INSERT INTO actividad (id, codigo, titulo, tipo, orden, bloque_id) "
                                  "VALUES (1, 'ACT-01', 'Prueba', 'INFORMATIVA', 1, 1), "
                                  "(2, 'REG-ACT08', 'Registro', 'REGISTRO', 2, 1)"))
            conexion.execute(text("INSERT INTO progreso_actividad (cuenta_id, actividad_id, estado) "
                                  "VALUES (1, 1, 'EN_CURSO')"))
        anteriores = MetaData()
        anteriores.reflect(motor)
        with motor.connect() as conexion:
            filas_antes = {nombre: conexion.execute(select(tabla).order_by(*tabla.primary_key.columns)).all()
                           for nombre, tabla in anteriores.tables.items()
                           # 0005 retira actividad_item_registro; sus filas pasan a item_registro.
                           if nombre not in {'alembic_version', 'actividad_item_registro'}}
        command.upgrade(configuracion, 'head')
        with motor.connect() as conexion:
            assert conexion.scalar(text('SELECT version_num FROM alembic_version')) == (
                ScriptDirectory.from_config(configuracion).get_current_head())
            assert conexion.execute(text('SELECT codigo, contenido, visibilidad FROM actividad ORDER BY id')).all() == [
                ('ACT-01', 'act_01', 'SIEMPRE'), ('REG-ACT08', 'reg_act08', 'SIEMPRE'),
            ]
            assert conexion.scalar(text('PRAGMA foreign_keys')) == 1
            assert conexion.execute(text('PRAGMA foreign_key_check')).all() == []
            for nombre, antes in filas_antes.items():
                tabla = anteriores.tables[nombre]
                assert conexion.execute(select(tabla).order_by(*tabla.primary_key.columns)).all() == antes
        command.downgrade(configuracion, '0001')
        assert {'contenido', 'visibilidad'}.isdisjoint(c['name'] for c in inspect(motor).get_columns('actividad'))
        command.upgrade(configuracion, 'head')
        with motor.connect() as conexion:
            assert compare_metadata(MigrationContext.configure(conexion), Base.metadata) == []
            assert conexion.execute(text('PRAGMA foreign_key_check')).all() == []
    finally:
        motor.dispose()


@pytest.mark.parametrize('contenido, visibilidad', [(None, 'SIEMPRE'), ('prueba', None), ('prueba', 'INVALIDA')])
def test_columnas_de_actividad_rechazan_nulos_y_visibilidad_invalida(base_migrada, contenido, visibilidad):
    _, _, motor = base_migrada
    with motor.begin() as conexion:
        conexion.execute(text("INSERT INTO bloque (id, codigo, numero, nombre, espacio, audiencia) "
                              "VALUES (1, 'B1', 1, 'Prueba', 'MISIONES_CAMPO', 'ESTUDIANTE')"))
    with pytest.raises(IntegrityError), motor.begin() as conexion:
        conexion.execute(text("INSERT INTO actividad (codigo, titulo, tipo, orden, bloque_id, contenido, visibilidad) "
                              "VALUES ('prueba', 'Prueba', 'INFORMATIVA', 1, 1, :contenido, :visibilidad)"),
                         {'contenido': contenido, 'visibilidad': visibilidad})


def test_visibilidad_predeterminada_y_al_desbloquear_en_base_migrada(base_migrada):
    _, _, motor = base_migrada
    with motor.begin() as conexion:
        conexion.execute(text("INSERT INTO bloque (id, codigo, numero, nombre, espacio, audiencia) "
                              "VALUES (1, 'B1', 1, 'Prueba', 'MISIONES_CAMPO', 'ESTUDIANTE')"))
        conexion.execute(text("INSERT INTO actividad (codigo, titulo, tipo, orden, bloque_id, contenido) "
                              "VALUES ('prueba', 'Prueba', 'INFORMATIVA', 1, 1, 'prueba')"))
        assert conexion.scalar(text('SELECT visibilidad FROM actividad')) == 'SIEMPRE'
        conexion.execute(text("UPDATE actividad SET visibilidad = 'AL_DESBLOQUEAR'"))
        assert conexion.scalar(text('SELECT visibilidad FROM actividad')) == 'AL_DESBLOQUEAR'


@pytest.mark.parametrize('desde_0002', [False, True], ids=['base_nueva', 'desde_0002'])
def test_migracion_0003_admite_familia_conserva_datos_y_rechaza_otros_espacios(tmp_path, monkeypatch, desde_0002):
    url = f'sqlite:///{(tmp_path / "familia.db").as_posix()}'
    monkeypatch.setenv('DATABASE_URL', url)
    configuracion = Config(str(RUTA_CONFIGURACION))
    motor = database.crear_motor_bd(url)
    try:
        anteriores = {}
        if desde_0002:
            command.upgrade(configuracion, '0002')
            with motor.begin() as conexion:
                # DATO DE PRUEBA: relaciones anteriores a PORTAL_FAMILIA.
                conexion.execute(text("INSERT INTO cuenta (id, codigo, nombre, rol) "
                                      "VALUES (1, 'prueba', 'Prueba', 'ESTUDIANTE')"))
                conexion.execute(text("INSERT INTO bloque (id, codigo, numero, nombre, espacio, audiencia) "
                                      "VALUES (1, 'B1', 1, 'Prueba', 'CIUDAD', 'ESTUDIANTE')"))
                conexion.execute(text("INSERT INTO actividad (id, codigo, titulo, tipo, orden, bloque_id, contenido) "
                                      "VALUES (1, 'prueba', 'Prueba', 'INFORMATIVA', 1, 1, 'prueba')"))
                conexion.execute(text("INSERT INTO progreso_actividad (cuenta_id, actividad_id, estado) "
                                      "VALUES (1, 1, 'COMPLETADA')"))
                # SQL literal: el modelo vigente tiene columnas posteriores a 0003.
                anteriores = {nombre: conexion.execute(text(f'SELECT * FROM {nombre}')).all()
                              for nombre in ('cuenta', 'bloque', 'actividad', 'progreso_actividad')}
        command.upgrade(configuracion, '0003')
        with motor.begin() as conexion:
            assert conexion.scalar(text('SELECT version_num FROM alembic_version')) == '0003'
            for nombre, filas in anteriores.items():
                assert conexion.execute(text(f'SELECT * FROM {nombre}')).all() == filas
            conexion.execute(text("INSERT INTO bloque (codigo, numero, nombre, espacio, audiencia) "
                                  "VALUES ('familia-prueba', 1, 'DATO DE PRUEBA', 'PORTAL_FAMILIA', 'APODERADO')"))
        with pytest.raises(IntegrityError), motor.begin() as conexion:
            conexion.execute(text("INSERT INTO bloque (codigo, numero, nombre, espacio, audiencia) "
                                  "VALUES ('otro-prueba', 1, 'DATO DE PRUEBA', 'OTRO', 'APODERADO')"))
        with motor.connect() as conexion:
            assert conexion.execute(text('PRAGMA foreign_key_check')).all() == []
    finally:
        motor.dispose()


# B06: la ruta tiene referencias a una aplicación, así que el primer downgrade que falla es el de 0009
# (antes, desde B05, era el de 0008 por la elección por referencia, y desde B03, el de 0005).
def test_downgrade_con_items_con_eleccion_falla_sin_perder_catalogo_ni_estado(base_migrada):
    url, configuracion, motor = base_migrada
    preparar_base(url, 'ruta')
    aplicacion = crear_aplicacion(url)
    try:
        with TestClient(aplicacion) as cliente:
            for actividad in ('t-apo-1', 't-apo-carta'):
                assert cliente.post('/acciones/completar-actividad', json={
                    'cuenta': 'apo-rosa', 'actividad': actividad,
                }).status_code == 200
        with motor.connect() as conexion:
            anteriores = {tabla.name: conexion.execute(select(tabla).order_by(*tabla.primary_key.columns)).mappings().all()
                          for tabla in Base.metadata.sorted_tables}
        # B08: `ruta` tiene una batalla, así que 0013 se detiene antes de bajar nada.
        with pytest.raises(RuntimeError, match='hay batallas'):
            command.downgrade(configuracion, '0002')
        assert set(inspect(motor).get_table_names()) == set(Base.metadata.tables) | {'alembic_version'}
        with motor.connect() as conexion:
            assert conexion.scalar(text('SELECT version_num FROM alembic_version')) == '0013'
            for tabla in Base.metadata.sorted_tables:
                # Solo las columnas que existen en 0005: el modelo tiene columnas posteriores.
                columnas = [tabla.c[c['name']] for c in inspect(motor).get_columns(tabla.name) if c['name'] in tabla.c]
                assert conexion.execute(select(*columnas).order_by(*tabla.primary_key.columns)).mappings().all() == [
                    {c.name: fila[c.name] for c in columnas} for fila in anteriores[tabla.name]]
            assert conexion.execute(text('PRAGMA foreign_key_check')).all() == []
    finally:
        aplicacion.state.motor_bd.dispose()


def test_migracion_0004_convierte_conversaciones_en_seccion_y_vuelve_sin_ella(tmp_path, monkeypatch):
    url = f'sqlite:///{(tmp_path / "secciones.db").as_posix()}'
    monkeypatch.setenv('DATABASE_URL', url)
    configuracion = Config(str(RUTA_CONFIGURACION))
    motor = database.crear_motor_bd(url)
    try:
        command.upgrade(configuracion, '0003')
        with motor.begin() as conexion:
            # DATO DE PRUEBA: una regla de CONVERSACIONES y otra de bloque anteriores a 0004.
            conexion.execute(text("INSERT INTO bloque (id, codigo, numero, nombre, espacio, audiencia) "
                                  "VALUES (1, 'B1', 1, 'Prueba', 'CIUDAD', 'ESTUDIANTE')"))
            conexion.execute(text("INSERT INTO regla_desbloqueo (id, codigo, nombre, tipo_objetivo, id_objetivo) "
                                  "VALUES (1, 'R-A', 'Regla A', 'CONVERSACIONES', NULL), "
                                  "(2, 'R-B', 'Regla B', 'BLOQUE', 1)"))
        command.upgrade(configuracion, '0004')
        with motor.begin() as conexion:
            filas = conexion.execute(text("SELECT r.codigo, r.mensaje_bloqueo, r.tipo_objetivo, s.codigo, s.audiencia "
                                          "FROM regla_desbloqueo r LEFT JOIN seccion s ON s.id = r.id_objetivo "
                                          "AND r.tipo_objetivo = 'SECCION' ORDER BY r.codigo")).all()
            assert filas == [('R-A', 'Regla A', 'SECCION', 'CONVERSACIONES', 'APODERADO'),
                             ('R-B', 'Regla B', 'BLOQUE', None, None)]
        with pytest.raises(IntegrityError), motor.begin() as conexion:
            conexion.execute(text("INSERT INTO regla_desbloqueo (codigo, nombre, mensaje_bloqueo, tipo_objetivo, "
                                  "id_objetivo) VALUES ('R-C', 'C', 'C', 'CONVERSACIONES', 1)"))
        with pytest.raises(RuntimeError, match='existen reglas de SECCION'):
            command.downgrade(configuracion, '0003')
        with motor.begin() as conexion:
            conexion.execute(text("DELETE FROM regla_desbloqueo WHERE tipo_objetivo = 'SECCION'"))
        command.downgrade(configuracion, '0003')
        with motor.connect() as conexion:
            assert conexion.scalar(text('SELECT version_num FROM alembic_version')) == '0003'
            assert 'seccion' not in inspect(motor).get_table_names()
    finally:
        motor.dispose()


def test_migracion_0005_conserva_filas_de_registro_y_renombra_la_clasificacion(tmp_path, monkeypatch):
    url = f'sqlite:///{(tmp_path / "registro.db").as_posix()}'
    monkeypatch.setenv('DATABASE_URL', url)
    configuracion = Config(str(RUTA_CONFIGURACION))
    motor = database.crear_motor_bd(url)
    try:
        command.upgrade(configuracion, '0004')
        with motor.begin() as conexion:
            # DATO DE PRUEBA: un ítem en su actividad, con criterio, respuesta y evaluación VAGA anteriores a 0005.
            for sql in (
                "INSERT INTO bloque (id, codigo, numero, nombre, espacio, audiencia) "
                "VALUES (1, 'B1', 1, 'Prueba', 'MISIONES_CAMPO', 'ESTUDIANTE')",
                "INSERT INTO actividad (id, codigo, titulo, tipo, contenido, orden, bloque_id, visibilidad) "
                "VALUES (1, 'A1', 'Registro', 'REGISTRO', 'a1', 1, 1, 'SIEMPRE')",
                "INSERT INTO cuenta (id, codigo, nombre, rol) VALUES (1, 'C1', 'Cuenta', 'ESTUDIANTE')",
                "INSERT INTO item_registro (id, codigo, nombre, consigna, min_caracteres, obligatorio, "
                "repregunta_generica) VALUES (1, 'I1', 'Ítem', 'Consigna', 20, 1, 'Cuéntame más')",
                "INSERT INTO actividad_item_registro (actividad_id, item_registro_id, orden) VALUES (1, 1, 2)",
                "INSERT INTO criterio_completitud (id, item_registro_id, codigo, descripcion, orden) "
                "VALUES (1, 1, 'C1', 'Un ejemplo', 1)",
                "INSERT INTO progreso_actividad (id, cuenta_id, actividad_id, estado) VALUES (1, 1, 1, 'EN_CURSO')",
                "INSERT INTO respuesta_registro (id, progreso_id, item_registro_id, texto_inicial, estado, "
                "clasificacion_inicial, ampliada, creada_en, actualizada_en) "
                "VALUES (1, 1, 1, 'Texto', 'FINAL', 'VAGA', 0, '2026-10-01', '2026-10-01')",
                "INSERT INTO evaluacion_respuesta (id, respuesta_id, numero, origen, clasificacion, "
                "criterios_faltantes, requiere_atencion, texto_evaluado, fecha_hora) "
                "VALUES (1, 1, 1, 'LLM', 'VAGA', '[\"C1\"]', 0, 'Texto', '2026-10-01')",
            ):
                conexion.execute(text(sql))
        command.upgrade(configuracion, '0005')
        with motor.connect() as conexion:
            assert conexion.execute(text(
                'SELECT codigo, actividad_id, orden, min_caracteres, nucleo, lista_id FROM item_registro'
            )).all() == [('I1', 1, 2, 20, False, None)]
            assert conexion.execute(text('SELECT tipo, repregunta FROM criterio_completitud')).all() == [
                ('EJEMPLO', 'Cuéntame más')]
            assert conexion.execute(text(
                'SELECT texto_inicial, clasificacion_inicial, opciones_elegidas, texto_consolidado FROM respuesta_registro'
            )).all() == [('Texto', 'POCO_DESARROLLADA', '[]', None)]
            assert conexion.execute(text('SELECT clasificacion FROM evaluacion_respuesta')).all() == [
                ('POCO_DESARROLLADA',)]
            assert 'actividad_item_registro' not in inspect(motor).get_table_names()
        with pytest.raises(IntegrityError), motor.begin() as conexion:
            conexion.execute(text("UPDATE respuesta_registro SET clasificacion_inicial = 'VAGA'"))
        command.downgrade(configuracion, '0004')
        with motor.connect() as conexion:
            assert conexion.execute(text('SELECT * FROM actividad_item_registro')).all() == [(1, 1, 2)]
            assert conexion.execute(text('SELECT clasificacion FROM evaluacion_respuesta')).all() == [('VAGA',)]
    finally:
        motor.dispose()


def test_migracion_0006_quita_nucleo_y_renombra_el_origen_conservando_filas(tmp_path, monkeypatch):
    url = f'sqlite:///{(tmp_path / "origen.db").as_posix()}'
    monkeypatch.setenv('DATABASE_URL', url)
    configuracion = Config(str(RUTA_CONFIGURACION))
    motor = database.crear_motor_bd(url)
    try:
        command.upgrade(configuracion, '0005')
        with motor.begin() as conexion:
            # DATO DE PRUEBA: un ítem núcleo con respuesta y evaluación de respaldo anteriores a 0006.
            for sql in (
                "INSERT INTO bloque (id, codigo, numero, nombre, espacio, audiencia) "
                "VALUES (1, 'B1', 1, 'Prueba', 'MISIONES_CAMPO', 'ESTUDIANTE')",
                "INSERT INTO actividad (id, codigo, titulo, tipo, contenido, orden, bloque_id, visibilidad) "
                "VALUES (1, 'A1', 'Registro', 'REGISTRO', 'a1', 1, 1, 'SIEMPRE')",
                "INSERT INTO cuenta (id, codigo, nombre, rol) VALUES (1, 'C1', 'Cuenta', 'ESTUDIANTE')",
                "INSERT INTO item_registro (id, codigo, actividad_id, orden, nombre, consigna, obligatorio, nucleo, "
                "repregunta_generica) VALUES (1, 'I1', 1, 1, 'Ítem', 'Consigna', 1, 1, 'Cuéntame más')",
                "INSERT INTO progreso_actividad (id, cuenta_id, actividad_id, estado) VALUES (1, 1, 1, 'EN_CURSO')",
                "INSERT INTO respuesta_registro (id, progreso_id, item_registro_id, texto_inicial, opciones_elegidas, "
                "estado, clasificacion_inicial, ampliada, creada_en, actualizada_en) "
                "VALUES (1, 1, 1, 'Texto', '[]', 'FINAL', 'NO_EVALUADA', 0, '2026-10-01', '2026-10-01')",
                "INSERT INTO evaluacion_respuesta (id, respuesta_id, numero, origen, clasificacion, "
                "criterios_faltantes, requiere_atencion, texto_evaluado, fecha_hora) "
                "VALUES (1, 1, 1, 'RESPALDO_LONGITUD', 'NO_EVALUADA', '[]', 0, 'Texto', '2026-10-01')",
            ):
                conexion.execute(text(sql))
        command.upgrade(configuracion, '0006')
        with motor.connect() as conexion:
            assert 'nucleo' not in {c['name'] for c in inspect(motor).get_columns('item_registro')}
            assert conexion.execute(text('SELECT codigo FROM item_registro')).all() == [('I1',)]
            assert conexion.execute(text('SELECT origen FROM evaluacion_respuesta')).all() == [('EXTENSION_MINIMA',)]
        with pytest.raises(IntegrityError), motor.begin() as conexion:
            conexion.execute(text("UPDATE evaluacion_respuesta SET origen = 'RESPALDO_LONGITUD'"))
        command.downgrade(configuracion, '0005')
        with motor.connect() as conexion:
            assert conexion.execute(text('SELECT codigo, nucleo FROM item_registro')).all() == [('I1', False)]
            assert conexion.execute(text('SELECT origen FROM evaluacion_respuesta')).all() == [('RESPALDO_LONGITUD',)]
    finally:
        motor.dispose()


def test_migracion_0007_agrega_intentos_e_inicializa_la_marca_reflexiva(tmp_path, monkeypatch):
    url = f'sqlite:///{(tmp_path / "intentos.db").as_posix()}'
    monkeypatch.setenv('DATABASE_URL', url)
    configuracion = Config(str(RUTA_CONFIGURACION))
    motor = database.crear_motor_bd(url)
    try:
        command.upgrade(configuracion, '0006')
        with motor.begin() as conexion:
            # DATO DE PRUEBA: tres respuestas con turno; solo la 1 pasó de poco desarrollada a adecuada.
            sqls = [
                "INSERT INTO bloque (id, codigo, numero, nombre, espacio, audiencia) "
                "VALUES (1, 'B1', 1, 'Prueba', 'MISIONES_CAMPO', 'ESTUDIANTE')",
                "INSERT INTO actividad (id, codigo, titulo, tipo, contenido, orden, bloque_id, visibilidad) "
                "VALUES (1, 'A1', 'Registro', 'REGISTRO', 'a1', 1, 1, 'SIEMPRE')",
                "INSERT INTO cuenta (id, codigo, nombre, rol) VALUES (1, 'C1', 'Cuenta', 'ESTUDIANTE')",
                "INSERT INTO progreso_actividad (id, cuenta_id, actividad_id, estado) VALUES (1, 1, 1, 'COMPLETADA')",
            ]
            clasificaciones = {1: ('POCO_DESARROLLADA', 'ADECUADA'), 2: ('ADECUADA', None),
                               3: ('POCO_DESARROLLADA', 'POCO_DESARROLLADA')}
            for numero, (inicial, siguiente) in clasificaciones.items():
                sqls += [
                    f"INSERT INTO item_registro (id, codigo, actividad_id, orden, nombre, consigna, obligatorio, "
                    f"repregunta_generica) VALUES ({numero}, 'I{numero}', 1, {numero}, 'Ítem', 'Consigna', 1, '¿Más?')",
                    f"INSERT INTO respuesta_registro (id, progreso_id, item_registro_id, texto_inicial, "
                    f"opciones_elegidas, estado, clasificacion_inicial, ampliada, creada_en, actualizada_en) "
                    f"VALUES ({numero}, 1, {numero}, 'Texto', '[]', 'FINAL', '{inicial}', "
                    f"{1 if siguiente else 0}, '2026-10-01', '2026-10-01')",
                    f"INSERT INTO evaluacion_respuesta (respuesta_id, numero, origen, clasificacion, "
                    f"criterios_faltantes, requiere_atencion, texto_evaluado, fecha_hora) "
                    f"VALUES ({numero}, 1, 'LLM', '{inicial}', '[]', 0, 'Texto', '2026-10-01')",
                ]
                if siguiente:
                    sqls += [
                        f"INSERT INTO turno_seguimiento (respuesta_id, orden, pregunta, criterios_objetivo, "
                        f"respuesta, respondido_en, creado_en) "
                        f"VALUES ({numero}, 1, '¿Más?', '[]', 'Más', '2026-10-01', '2026-10-01')",
                        f"INSERT INTO evaluacion_respuesta (respuesta_id, numero, origen, clasificacion, "
                        f"criterios_faltantes, requiere_atencion, texto_evaluado, fecha_hora) "
                        f"VALUES ({numero}, 2, 'LLM', '{siguiente}', '[]', 0, 'Texto', '2026-10-01')",
                    ]
            for sql in sqls:
                conexion.execute(text(sql))
        command.upgrade(configuracion, '0007')
        with motor.connect() as conexion:
            assert conexion.execute(text(
                'SELECT id, intento, reflexiva_registrada FROM respuesta_registro ORDER BY id')).all() == [
                (1, 1, True), (2, 1, False), (3, 1, False)]
            assert conexion.execute(text('SELECT intento FROM turno_seguimiento')).scalars().all() == [1, 1]
        with motor.begin() as conexion:
            # La única es por intento: el mismo orden cabe en un intento nuevo.
            conexion.execute(text(
                "INSERT INTO turno_seguimiento (respuesta_id, intento, orden, pregunta, criterios_objetivo, creado_en) "
                "VALUES (1, 2, 1, '¿Más?', '[]', '2026-10-02')"))
            conexion.execute(text('UPDATE respuesta_registro SET intento = 2 WHERE id = 1'))
        with pytest.raises(RuntimeError, match='editados'):
            command.downgrade(configuracion, '0006')
        with motor.begin() as conexion:
            conexion.execute(text('DELETE FROM turno_seguimiento WHERE intento = 2'))
            conexion.execute(text('UPDATE respuesta_registro SET intento = 1'))
        command.downgrade(configuracion, '0006')
        with motor.connect() as conexion:
            assert 'intento' not in {c['name'] for c in inspect(motor).get_columns('turno_seguimiento')}
            assert conexion.execute(text('SELECT COUNT(*) FROM turno_seguimiento')).scalar() == 2
            assert conexion.execute(text('SELECT COUNT(*) FROM respuesta_registro')).scalar() == 3
    finally:
        motor.dispose()
