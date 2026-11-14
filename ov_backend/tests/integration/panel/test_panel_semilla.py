"""Ajuste panel-estudiantes §12: el script de estudiantes de ejemplo se niega a correr sin confirmar desarrollo."""

import subprocess
import sys
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[3] / 'scripts' / 'sembrar_panel_ejemplo.py'


def test_sin_la_bandera_de_desarrollo_no_siembra(tmp_path):
    base = tmp_path / 'ajena.db'
    base.write_bytes(b'DATO DE PRUEBA: no tocar')
    entorno = {'DATABASE_URL': f'sqlite:///{base.as_posix()}', 'PATH': '', 'SYSTEMROOT': __import__('os').environ.get(
        'SYSTEMROOT', '')}
    resultado = subprocess.run([sys.executable, str(SCRIPT)], cwd=tmp_path, capture_output=True, text=True, env=entorno)
    assert resultado.returncode == 2 and 'Falta --desarrollo' in resultado.stderr
    resultado = subprocess.run([sys.executable, str(SCRIPT), '--desarrollo'], cwd=tmp_path, capture_output=True,
                               text=True, env={**entorno, 'ENTORNO': 'produccion', 'JWT_SECRETO': 'x' * 40})
    assert resultado.returncode == 1 and 'ENTORNO no es desarrollo' in resultado.stderr
    assert base.read_bytes() == b'DATO DE PRUEBA: no tocar'
