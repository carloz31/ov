"""Candado de `actualizar.sh --recargar`: la recarga borra toda la base, así que solo se permite si no hay cuentas reales.

Son cuentas conocidas las que la carga de `contenido` vuelve a crear (`datos.contenido.CUENTAS`, con las de
`datos/usuarios_prueba.txt`, y los estudiantes y apoderados de ejemplo del panel) y las cuentas de prueba del piloto
(`CUENTAS_PRUEBA_PILOTO`). Cualquier otra cuenta (las del piloto creadas con `crear_cuentas.py`) bloquea la recarga.
Solo lee la base; no escribe nada.

    uv run python scripts/comprobar_recarga.py

Códigos de salida: 0, se puede recargar; 4, hay cuentas reales (las lista); 1, no se pudo leer la base.
"""

import importlib.util
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
if str(RAIZ) not in sys.path:
    sys.path.insert(0, str(RAIZ))

from sqlalchemy import create_engine, inspect, select  # noqa: E402
from sqlalchemy.exc import SQLAlchemyError  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app import models as m  # noqa: E402
from app.config import cargar_configuracion  # noqa: E402
from datos import contenido  # noqa: E402

# Las cuentas de prueba del piloto (estudiante, su apoderado y orientador): no bloquean la recarga.
CUENTAS_PRUEBA_PILOTO = ('E99', 'A99', 'O99')
CODIGO_BLOQUEADA = 4
MAXIMO_LISTADAS = 20


def _cuentas_ejemplo_panel() -> set[str]:
    """Las cuentas que crea la siembra de ejemplos (otro script; se carga por ruta, como en las pruebas): estudiantes y
    apoderados del panel y la autora del salón egresado (`contenido.SALON_EGRESADO`)."""
    if str(RAIZ / 'scripts') not in sys.path:  # la siembra importa `prerrequisitos_contenido`, que vive en scripts/
        sys.path.insert(0, str(RAIZ / 'scripts'))
    especificacion = importlib.util.spec_from_file_location(
        'sembrar_panel_ejemplo', RAIZ / 'scripts' / 'sembrar_panel_ejemplo.py')
    modulo = importlib.util.module_from_spec(especificacion)
    especificacion.loader.exec_module(modulo)
    return ({fila[0] for fila in (*modulo.CREDENCIALES, *modulo.ESTUDIANTES, *modulo.APODERADOS)}
            | {contenido.SALON_EGRESADO[4]})


def cuentas_conocidas() -> set[str]:
    return {fila[0] for fila in contenido.CUENTAS} | _cuentas_ejemplo_panel() | set(CUENTAS_PRUEBA_PILOTO)


def cuentas_reales(url: str) -> list[str]:
    """Los códigos de las cuentas de la base que no son conocidas, ordenados. Una base sin esquema no tiene ninguna."""
    motor = create_engine(url)
    try:
        if not inspect(motor).has_table(m.Cuenta.__tablename__):
            return []
        with Session(motor) as sesion:
            codigos = sesion.scalars(select(m.Cuenta.codigo)).all()
    finally:
        motor.dispose()
    conocidas = cuentas_conocidas()
    return sorted(c for c in codigos if c not in conocidas)


def main() -> int:
    try:
        reales = cuentas_reales(cargar_configuracion().url_bd)
    except SQLAlchemyError as error:
        print(f'No se pudo leer la base para el candado de la recarga: {error.__class__.__name__}', file=sys.stderr)
        return 1
    if not reales:
        print('Candado de recarga: no hay cuentas reales; se puede recargar.')
        return 0
    listadas = ', '.join(reales[:MAXIMO_LISTADAS]) + (' …' if len(reales) > MAXIMO_LISTADAS else '')
    print(f'RECARGA BLOQUEADA: la base tiene {len(reales)} cuenta(s) reales ({listadas}). La recarga las borraría con '
          'su progreso. No se tocó nada.', file=sys.stderr)
    return CODIGO_BLOQUEADA


if __name__ == '__main__':
    raise SystemExit(main())
