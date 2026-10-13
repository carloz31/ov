"""Contrato, reproducibilidad y aislamiento del exportador de fixtures `ruta-*`."""

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest
from pydantic import TypeAdapter
from scripts import exportar_fixtures_front as exportador
from soporte_ruta import BLOQUE_FAMILIA

from app import main as principal
from app.schemas.acciones import RespuestaCompletarActividad
from app.schemas.cuentas import CuentaResumen, DesbloqueoLegible, ResumenCuenta
from app.schemas.actividades import BloqueActividades
from app.schemas.comun import ContenidoEstado
from app.schemas.logros import LogrosCuenta
from app.schemas.secciones import SeccionEstado
from app.schemas.instrumentos import ItemPublico, ResultadoPublico


SCRIPT = Path(exportador.__file__).resolve()
NOMBRES = {f'ruta-{nombre}.json' for nombre in (
    'cuentas', 'resumen-inicial', 'actividades-inicial', 'actividades-t1', 'actividades-ciudad',
    'fichas-inicial', 'fichas-final', 'logros-inicial', 'logros-final',
    'completar-t-inicio', 'completar-t-cierre-inicio', 'items-t-mision-intereses', 'resultado-riasec',
    'desbloqueos-no-vistos', 'apoderado-actividades-inicial', 'apoderado-actividades-final',
    'secciones-inicial', 'secciones-t1', 'apoderado-secciones-inicial', 'apoderado-secciones-final',
)}


def leer(archivos):
    return {ruta.name.removeprefix('ruta-').removesuffix('.json'): json.loads(ruta.read_bytes())
            for ruta in archivos}


def estados(bloques):
    return {a['codigo']: a['estado'] for b in bloques for a in b['actividades']}


def test_exportador_exige_destino_incluso_desde_otro_directorio(tmp_path):
    resultado = subprocess.run([sys.executable, str(SCRIPT)], cwd=tmp_path,
                               capture_output=True, text=True)
    assert resultado.returncode == 2
    assert 'Falta --destino' in resultado.stderr
    assert 'tests/fixtures/servidor de ov_frontend' in resultado.stderr
    assert list(tmp_path.iterdir()) == []


def test_fixtures_reproducen_el_contrato_y_se_regeneran_identicos(tmp_path, monkeypatch):
    monkeypatch.setenv('EVALUADOR', 'gemini')
    ruta_ajena = tmp_path / 'base-del-usuario.db'
    # DATO DE PRUEBA: un archivo que jamás debe abrir ni reiniciar el exportador.
    ruta_ajena.write_bytes(b'Base del usuario: conservar estos bytes')
    monkeypatch.setenv('DATABASE_URL', f'sqlite:///{ruta_ajena.as_posix()}')
    bases = []
    crear = principal.crear_aplicacion
    crear_evaluador = principal.crear_evaluador_registro

    def crear_temporal(url_bd):
        ruta = Path(url_bd.removeprefix('sqlite:///'))
        assert ruta.name == 'ruta.db' and ruta.parent.is_dir()
        assert ruta != ruta_ajena
        bases.append(ruta)
        return crear(url_bd)

    def solo_falso(configuracion):
        assert configuracion.evaluador == 'falso'
        return crear_evaluador(configuracion)

    monkeypatch.setattr(principal, 'crear_aplicacion', crear_temporal)
    monkeypatch.setattr(principal, 'crear_evaluador_registro', solo_falso)
    destino = tmp_path / 'front' / 'tests' / 'fixtures' / 'servidor'
    # Los fixtures congelados de la raíz no se tocan.
    destino.mkdir(parents=True)
    congelado = destino / 'actividades-inicial.json'
    congelado.write_text('congelado', encoding='utf-8')
    archivos = exportador.exportar_fixtures(destino)
    assert {ruta.name for ruta in archivos} == NOMBRES
    assert all(ruta.parent == destino / 'ruta' for ruta in archivos)
    assert {ruta.name for ruta in (destino / 'ruta').iterdir()} == NOMBRES
    assert congelado.read_text(encoding='utf-8') == 'congelado'
    bytes_antes = {ruta.name: ruta.read_bytes() for ruta in archivos}
    datos = leer(archivos)
    ResumenCuenta.model_validate(datos['resumen-inicial'])
    for nombre in ('actividades-inicial', 'actividades-t1', 'actividades-ciudad'):
        TypeAdapter(list[BloqueActividades]).validate_python(datos[nombre])
    for momento in ('inicial', 'final'):
        TypeAdapter(list[ContenidoEstado]).validate_python(datos[f'fichas-{momento}'])
        LogrosCuenta.model_validate(datos[f'logros-{momento}'])
    for nombre in ('completar-t-inicio', 'completar-t-cierre-inicio'):
        RespuestaCompletarActividad.model_validate(datos[nombre])
    TypeAdapter(list[ItemPublico]).validate_python(datos['items-t-mision-intereses'])
    TypeAdapter(list[DesbloqueoLegible]).validate_python(datos['desbloqueos-no-vistos'])
    ResultadoPublico.model_validate(datos['resultado-riasec'])
    inicial = estados(datos['actividades-inicial'])
    assert inicial['t-inicio'] == 'DISPONIBLE'
    assert all(e == 'BLOQUEADA' for c, e in inicial.items() if c != 't-inicio')
    assert datos['resumen-inicial']['nivel_actual']['numero'] == 1
    assert any(i['codigo'] == '???' for i in datos['logros-inicial']['insignias'])
    assert {d['regla'] for d in datos['completar-t-inicio']['nuevos_desbloqueos']} == {
        'R-t-cierre-inicio', 'R-t-ficha', 'R-t-ins-1', 'R-SEC-DIARIO', 'R-SEC-CATALOGO', 'R-SEC-PLANES'}
    cierre = datos['completar-t-cierre-inicio']
    assert {d['regla'] for d in cierre['nuevos_desbloqueos']} == {'R-T1', 'R-NIV-2', 'R-SEC-CHECK_IN'}
    for nombre in ('secciones-inicial', 'secciones-t1', 'apoderado-secciones-inicial', 'apoderado-secciones-final'):
        TypeAdapter(list[SeccionEstado]).validate_python(datos[nombre])
    assert all(s['estado'] == 'BLOQUEADA' and s['bloqueo'] for s in datos['secciones-inicial'])
    assert {s['codigo']: s['estado'] for s in datos['secciones-t1']} == {
        'CATALOGO': 'DISPONIBLE', 'CHECK_IN': 'DISPONIBLE', 'DIARIO': 'DISPONIBLE', 'FAMILIA': 'BLOQUEADA',
        'PLANES': 'DISPONIBLE'}
    assert [(s['codigo'], s['estado']) for s in datos['apoderado-secciones-inicial']] == [('CONVERSACIONES', 'BLOQUEADA')]
    assert [(s['codigo'], s['estado']) for s in datos['apoderado-secciones-final']] == [('CONVERSACIONES', 'DISPONIBLE')]
    assert cierre['eventos_registrados'][-1]['referencia'] == 'T0'
    assert estados(datos['actividades-t1'])['t-expectativas'] == 'DISPONIBLE'
    ciudad = next(b for b in datos['actividades-ciudad'] if b['codigo'] == 'CIUDAD')
    assert ciudad['estado'] == 'DISPONIBLE'
    assert [(a['codigo'], a['estado']) for a in ciudad['actividades']] == [
        ('t-mision-intereses', 'DISPONIBLE'), ('t-mision-intereses-2', 'BLOQUEADA'), ('t-caso', 'BLOQUEADA')]
    assert next(b for b in datos['actividades-inicial'] if b['codigo'] == 'CIUDAD')['bloqueo'][0]['mensaje']
    items = datos['items-t-mision-intereses']
    assert [i['codigo'] for i in items] == [f'RIASEC-{n:02}' for n in range(1, 31)]
    assert len(items[0]['escala']['opciones']) == 5
    resultado = datos['resultado-riasec']
    assert resultado['calculado_en'] == exportador.FECHA
    assert resultado['codigo_interes'] == {'codigo': 'IRA', 'hay_empate': False}
    assert {d['codigo']: d['porcentaje'] for d in resultado['dimensiones']} == {
        'I': 100, 'R': 75, 'A': 50, 'S': 0, 'E': 0, 'C': 0,
    }
    assert len(resultado['coincidencias']) == 10
    assert resultado['coincidencias'][0]['codigo'] == 'geologist'
    assert {c['codigo'] for c in resultado['carreras_recomendadas']} == {
        'environmental-engineering', 'civil-engineering', 'veterinary-medicine',
    }
    avisos = datos['desbloqueos-no-vistos']
    assert {d['regla'] for d in avisos} == {
        'R-t-cierre-inicio', 'R-t-ficha', 'R-t-ins-1', 'R-T1', 'R-NIV-2', 'R-CIUDAD', 'R-t-opcional',
        'R-SEC-DIARIO', 'R-SEC-CATALOGO', 'R-SEC-PLANES', 'R-SEC-CHECK_IN', 'R-SEC-FAMILIA'}
    assert all(d['visto'] is False and d['fecha_hora'] == exportador.FECHA for d in avisos)
    assert [(f['codigo'], f['estado']) for f in datos['fichas-inicial']] == [('t-ficha', 'BLOQUEADA')]
    assert [(f['codigo'], f['estado']) for f in datos['fichas-final']] == [('t-ficha', 'DISPONIBLE')]
    assert [n['estado'] for n in datos['logros-final']['niveles']] == ['OBTENIDO', 'OBTENIDO']
    # Regenera sobre archivos existentes sin tocar otros archivos del destino.
    conservar = destino / 'ruta' / 'conservar.txt'
    conservar.write_text('Conservar', encoding='utf-8')
    exportador.exportar_fixtures(destino)
    assert {ruta.name: ruta.read_bytes() for ruta in archivos} == bytes_antes
    assert conservar.read_text(encoding='utf-8') == 'Conservar'
    assert len(bases) == 2 and all(not ruta.parent.exists() for ruta in bases)
    assert ruta_ajena.read_bytes() == b'Base del usuario: conservar estos bytes'
    assert exportador.os.environ['EVALUADOR'] == 'gemini'


def test_fallo_del_recorrido_no_escribe_fixtures_y_restaura_evaluador(tmp_path, monkeypatch):
    monkeypatch.delenv('EVALUADOR', raising=False)
    destino = tmp_path / 'no-publicado'

    def fallar(cliente):
        raise RuntimeError('Fallo de prueba del recorrido')

    monkeypatch.setattr(exportador, '_recorrer', fallar)
    with pytest.raises(RuntimeError, match='Fallo de prueba del recorrido'):
        exportador.exportar_fixtures(destino)
    assert not destino.exists()
    assert 'EVALUADOR' not in exportador.os.environ


def test_fixtures_de_cuentas_y_apoderado(tmp_path):
    datos = leer(exportador.exportar_fixtures(tmp_path / 'servidor'))
    cuentas = TypeAdapter(list[CuentaResumen]).validate_python(datos['cuentas'])
    assert [(c.codigo, c.rol) for c in cuentas] == [
        ('apo-rosa', 'APODERADO'), ('est-ana', 'ESTUDIANTE'), ('est-beto', 'ESTUDIANTE'), ('est-luis', 'ESTUDIANTE'),
        ('ori-carmen', 'ORIENTADORA'),
    ]
    for momento in ('inicial', 'final'):
        TypeAdapter(list[BloqueActividades]).validate_python(datos[f'apoderado-actividades-{momento}'])
    assert datos['apoderado-actividades-inicial'] == [BLOQUE_FAMILIA]
    bloque, = datos['apoderado-actividades-final']
    assert bloque['actividades'] == [{**a, 'estado': 'COMPLETADA', 'bloqueo': None} for a in BLOQUE_FAMILIA['actividades']]


@pytest.mark.parametrize('evaluador_previo', [None, 'gemini'])
def test_fallo_del_apoderado_no_escribe_fixtures_y_restaura_evaluador(tmp_path, monkeypatch, evaluador_previo):
    if evaluador_previo is None:
        monkeypatch.delenv('EVALUADOR', raising=False)
    else:
        monkeypatch.setenv('EVALUADOR', evaluador_previo)
    destino = tmp_path / 'sin-publicar'

    def fallar(cliente):
        assert os.environ['EVALUADOR'] == 'falso'
        raise RuntimeError('Fallo de prueba del apoderado')

    monkeypatch.setattr(exportador, '_recorrer_apoderado', fallar)
    with pytest.raises(RuntimeError, match='Fallo de prueba del apoderado'):
        exportador.exportar_fixtures(destino)
    assert not destino.exists()
    assert os.environ.get('EVALUADOR') == evaluador_previo


def test_cli_exporta_los_fixtures_de_ruta(tmp_path):
    destino = tmp_path / 'front' / 'tests' / 'fixtures' / 'servidor'
    resultado = subprocess.run([sys.executable, str(SCRIPT), '--destino', str(destino)],
                               cwd=tmp_path, capture_output=True, text=True)
    assert resultado.returncode == 0, resultado.stderr
    assert f'Exportados {len(NOMBRES)} fixtures' in resultado.stdout
    assert {ruta.name for ruta in (destino / 'ruta').glob('*.json')} == NOMBRES
    assert list(destino.glob('*.json')) == []
