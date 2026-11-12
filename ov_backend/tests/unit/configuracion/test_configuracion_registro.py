"""Configuración del LLM: la clave de Claude se lee de `.env` sin interpolar y nunca sale en el `repr`."""

from app.config import Configuracion, cargar_configuracion


def test_configuracion_predeterminada_sin_clave(tmp_path):
    configuracion = cargar_configuracion(ruta_env=tmp_path / 'ausente', entorno={})
    assert configuracion == Configuracion()
    assert configuracion.clave_anthropic is None


def test_clave_anthropic_desde_env_sin_interpolar_ni_mostrar(tmp_path):
    ruta = tmp_path / '.env'
    ruta.write_text('ANTHROPIC_API_KEY=valor-${NO_INTERPOLAR}\n', encoding='utf-8')
    configuracion = cargar_configuracion(ruta_env=ruta, entorno={})
    assert configuracion.clave_anthropic == 'valor-${NO_INTERPOLAR}'
    assert 'valor-' not in repr(configuracion)
    # La variable del proceso manda sobre `.env`; vacía equivale a sin clave.
    assert cargar_configuracion(ruta_env=ruta, entorno={'ANTHROPIC_API_KEY': '  '}).clave_anthropic is None
