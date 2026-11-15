"""La única lectura de la tabla `parametro` (ajuste color-partida-llegada): la usan el panel de la orientadora y la marca
de «respuesta baja» que recibe el estudiante (`PANEL_OPCIONES_BAJAS`)."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Parametro


def leer_parametros(sesion: Session) -> dict[str, str]:
    """Todos los parámetros, en una consulta."""
    return dict(sesion.execute(select(Parametro.codigo, Parametro.valor)).all())


def entero(parametros: dict[str, str], codigo: str) -> int:
    """El valor de un parámetro; si falta, es un dato fijo ausente y la lectura falla."""
    return int(parametros[codigo])
