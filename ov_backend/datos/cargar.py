"""Carga explícita y transaccional de conjuntos de datos."""

import argparse
import re

from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import cargar_configuracion
from app.database import comprobar_tablas, crear_motor_bd
from app.models import Actividad, Base, ItemRegistro
from datos import ruta


CONJUNTOS = {'ruta': ruta.cargar}
TABLAS_PRINCIPALES = (
    'cuenta', 'actividad', 'regla_desbloqueo', 'item_instrumento', 'ocupacion', 'item_registro',
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
    """`item_registro` y `referencia` se apuntan entre sí: sin la elección por referencia, se borran en orden."""
    sesion.execute(update(ItemRegistro).where(ItemRegistro.referencia_id.is_not(None)).values(
        referencia_id=None, eleccion_minima=None, eleccion_maxima=None, eleccion_ordenada=False))


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
    opciones = analizador.parse_args(argumentos)
    try:
        conteos = preparar_base(cargar_configuracion().url_bd, opciones.conjunto,
                               vaciar=opciones.vaciar)
    except (OSError, ValueError, RuntimeError) as error:
        analizador.exit(1, f'No se pudieron cargar los datos: {error}\n')
    except SQLAlchemyError:
        analizador.exit(1, 'No se pudieron cargar los datos: no se pudo acceder a la base de datos.\n')
    for tabla, cantidad in conteos.items():
        print(f'{tabla}: {cantidad}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
