"""`scripts/comprobar_recarga.py`: el candado de `actualizar.sh --recargar`. Alias y correos ficticios; DATO DE PRUEBA."""

import csv
import importlib.util
from pathlib import Path
from types import SimpleNamespace

RAIZ = Path(__file__).resolve().parents[3]


def _cargar(nombre):
    especificacion = importlib.util.spec_from_file_location(nombre, RAIZ / 'scripts' / f'{nombre}.py')
    modulo = importlib.util.module_from_spec(especificacion)
    especificacion.loader.exec_module(modulo)
    return modulo


comprobar_recarga = _cargar('comprobar_recarga')
crear_cuentas = _cargar('crear_cuentas')

CLAVE = 'DATO-DE-PRUEBA-2026'


def _crear(aplicacion, tmp_path, filas):
    ruta = tmp_path / 'cuentas-prueba.csv'
    with ruta.open('w', encoding='utf-8', newline='') as archivo:
        escritor = csv.writer(archivo)
        escritor.writerow(crear_cuentas.COLUMNAS)
        escritor.writerows(filas)
    crear_cuentas.crear(aplicacion.state.configuracion.url_bd, ruta)


def test_contenido_y_cuentas_de_prueba_del_piloto_no_bloquean(aplicacion_contenido, tmp_path):
    _crear(aplicacion_contenido, tmp_path, [
        ('ESTUDIANTE', 'E99', 'Prueba', '2026-C', 'e99@ov.test', CLAVE, '', ''),
        ('APODERADO', 'A99', 'Prueba', '', 'a99@ov.test', CLAVE, 'E99', 'apoderado'),
        ('ORIENTADORA', 'O99', 'Prueba', '2026-C', 'o99@ov.test', CLAVE, '', ''),
    ])
    assert comprobar_recarga.cuentas_reales(aplicacion_contenido.state.configuracion.url_bd) == []


def test_las_cuentas_ejemplo_del_panel_son_conocidas():
    assert {'est-panel-1', 'apo-panel-3', 'est-2024a-1', 'est-ana', 'apo-rosa', 'ori-carmen', 'E99'} <= \
        comprobar_recarga.cuentas_conocidas()


def test_una_cuenta_del_piloto_bloquea_la_recarga(aplicacion_contenido, tmp_path, monkeypatch, capsys):
    url = aplicacion_contenido.state.configuracion.url_bd
    _crear(aplicacion_contenido, tmp_path, [
        ('ESTUDIANTE', 'E01', 'Explorador 01', '2026-C', 'e01@ov.test', CLAVE, '', ''),
        ('APODERADO', 'A01', 'Apoderado 01', '', 'a01@ov.test', CLAVE, 'E01', 'apoderado'),
    ])
    assert comprobar_recarga.cuentas_reales(url) == ['A01', 'E01']
    monkeypatch.setattr(comprobar_recarga, 'cargar_configuracion', lambda: SimpleNamespace(url_bd=url))
    assert comprobar_recarga.main() == comprobar_recarga.CODIGO_BLOQUEADA
    assert 'RECARGA BLOQUEADA' in capsys.readouterr().err


def test_una_base_sin_esquema_se_puede_recargar(tmp_path):
    assert comprobar_recarga.cuentas_reales(f'sqlite:///{(tmp_path / "vacia.db").as_posix()}') == []
