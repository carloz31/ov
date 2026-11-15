"""Carga explícita y transaccional de conjuntos de datos."""

import argparse
import re
import sys

from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import cargar_configuracion
from app.database import comprobar_tablas, crear_motor_bd
from app.models import Actividad, Base, ItemRegistro
from datos import contenido, ruta


CONJUNTOS = {'ruta': ruta.cargar, 'contenido': contenido.cargar}
TABLAS_PRINCIPALES = (
    'cuenta', 'actividad', 'regla_desbloqueo', 'item_instrumento', 'ocupacion', 'item_registro', 'carrera',
    'institucion',
)
MENSAJE_SIN_ESQUEMA_CARGA = (
    'La base no tiene el esquema. Ejecuta `uv run alembic upgrade head`.'
)


def validar_contenidos_actividades(sesion: Session) -> None:
    """Valida las claves sin depender de expresiones regulares del motor SQL."""
    for codigo, contenido in sesion.execute(select(Actividad.codigo, Actividad.contenido)):
        if re.fullmatch(r'[a-z0-9_]+', contenido) is None:
            raise ValueError(f'Contenido inválido en la actividad {codigo}: usa minúsculas, dígitos y _.')


def romper_ciclos(sesion):
    """`item_registro` y `referencia` se apuntan entre sí: sin la referencia de los ítems, se borran en orden.
    Desde F02 esos ítems conservan su lista, así que la elección sigue siendo válida."""
    sesion.execute(update(ItemRegistro).where(ItemRegistro.referencia_id.is_not(None)).values(referencia_id=None))
    # Ajuste registros: los que eligen de una referencia no tienen lista; se quedan sin elección antes de borrarse.
    sesion.execute(update(ItemRegistro).where(ItemRegistro.referencia_opciones_id.is_not(None)).values(
        referencia_opciones_id=None, fuente_opciones=None, opciones_propias=None, premarcar_si=None,
        eleccion_minima=None, eleccion_maxima=None, eleccion_ordenada=False, permite_otra=False))


def preparar_base(
    url: str, conjunto: str, *, crear_tablas: bool = False, vaciar: bool = False,
) -> dict[str, int]:
    if conjunto not in CONJUNTOS:
        raise ValueError(f'El conjunto debe ser uno de: {", ".join(CONJUNTOS)}')
    motor = crear_motor_bd(url)
    try:
        if crear_tablas:
            Base.metadata.create_all(motor)
        try:
            comprobar_tablas(motor)
        except RuntimeError:
            raise RuntimeError(MENSAJE_SIN_ESQUEMA_CARGA) from None
        with Session(motor) as sesion, sesion.begin():
            if vaciar:
                romper_ciclos(sesion)
                for tabla in reversed(Base.metadata.sorted_tables):
                    sesion.execute(delete(tabla))
            elif any(sesion.execute(select(tabla).limit(1)).first() is not None
                     for tabla in Base.metadata.sorted_tables):
                raise ValueError('La base ya contiene datos. Usa --vaciar para volver a cargarla.')
            CONJUNTOS[conjunto](sesion)
            sesion.flush()
            validar_contenidos_actividades(sesion)
            return {nombre: sesion.scalar(select(func.count()).select_from(Base.metadata.tables[nombre]))
                    for nombre in TABLAS_PRINCIPALES}
    finally:
        motor.dispose()




def main(argumentos=None) -> int:
    analizador = argparse.ArgumentParser(description=__doc__)
    analizador.add_argument('conjunto', choices=CONJUNTOS)
    analizador.add_argument('--vaciar', action='store_true')
    analizador.add_argument('--sin-ejemplos', action='store_true', help=(
        'Solo con `contenido`: carga sin sembrar los estudiantes de ejemplo del panel (scripts/sembrar_panel_ejemplo.py). '
        'Úsalo antes de una prueba con usuarios: son cuentas inventadas con credenciales en el repositorio.'))
    opciones = analizador.parse_args(argumentos)
    configuracion = cargar_configuracion()
    try:
        conteos = preparar_base(configuracion.url_bd, opciones.conjunto, vaciar=opciones.vaciar)
    except (OSError, ValueError, RuntimeError) as error:
        analizador.exit(1, f'No se pudieron cargar los datos: {error}\n')
    except SQLAlchemyError:
        analizador.exit(1, 'No se pudieron cargar los datos: no se pudo acceder a la base de datos.\n')
    for tabla, cantidad in conteos.items():
        print(f'{tabla}: {cantidad}')
    if opciones.conjunto != 'contenido' or opciones.sin_ejemplos:
        return 0
    # Ajuste desbloqueos: con `contenido`, los estudiantes de ejemplo se siembran por defecto, en cualquier entorno.
    codigo = _sembrar_ejemplos(configuracion.url_bd)
    if codigo == 0:
        return 0
    # Un fallo de la siembra no deja la base a medias: vuelve a quedar `contenido`, sin ejemplos.
    print(f'ERROR: no se pudieron sembrar los estudiantes de ejemplo (código {codigo}). La base queda con '
          '`contenido`, sin ejemplos.', file=sys.stderr)
    try:
        preparar_base(configuracion.url_bd, 'contenido', vaciar=True)
    except (OSError, ValueError, RuntimeError, SQLAlchemyError) as error:
        print(f'ERROR: tampoco se pudo volver a cargar `contenido`: {error}', file=sys.stderr)
    return CODIGO_SIEMBRA_FALLIDA


# `actualizar.sh` reinicia el backend igual con este código y lo informa después.
CODIGO_SIEMBRA_FALLIDA = 3


def _sembrar_ejemplos(url: str) -> int:
    """Corre la siembra como otro proceso (`datos` no importa `scripts`), sobre la misma base. Ese proceso, y solo él,
    va con ENTORNO=desarrollo (la siembra fija la fecha de cada acción) y sin clave del LLM (usa el cliente de prueba):
    el backend desplegado sigue en su entorno y no acepta la fecha del cliente."""
    import os
    import subprocess
    from pathlib import Path
    script = Path(__file__).resolve().parents[1] / 'scripts' / 'sembrar_panel_ejemplo.py'
    entorno = {**os.environ, 'DATABASE_URL': url, 'ENTORNO': 'desarrollo', 'ANTHROPIC_API_KEY': ''}
    try:
        return subprocess.run([sys.executable, str(script), '--desarrollo'], env=entorno, check=False).returncode
    except OSError as error:
        print(f'ERROR: no se pudo iniciar la siembra: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
