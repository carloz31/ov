"""Los estudiantes de un conjunto del panel (botón «Ver», ajuste panel-salon §6): nombre y salón, por nombre.
Cada conjunto usa el mismo cálculo que el conteo que lo muestra."""

from collections.abc import Callable
from datetime import datetime

from sqlalchemy.orm import Session

from app.core.contexto import usar_contexto
from app.exceptions import ErrorAccion
from app.schemas.panel import EstudiantePanel
from app.services.panel.alertas import calcular_alertas
from app.services.panel.comun import (
    Lecturas, aplicaciones_de, entero, estados_test, leer_parametros, resolver_alcance,
)
from app.services.panel.intereses import (
    DatosIntereses, frente_test, interesados_en_area, interesados_en_institucion,
)
from app.services.panel.seguimiento import bandas_seguridad, detenidos

ESTADOS_TEST = ("LISTO", "POR_REVISAR", "EN_CURSO", "SIN_EMPEZAR")


def _no_encontrado() -> ErrorAccion:
    return ErrorAccion("Conjunto desconocido", estado_http=422)


def _alerta(lecturas: Lecturas, _parametros, valor: str | None) -> set[int]:
    alertas = calcular_alertas(lecturas)
    if valor is None:
        return set().union(*(a.estudiantes for a in alertas))
    elegida = next((a for a in alertas if a.alerta.codigo == valor), None)
    if elegida is None:
        raise _no_encontrado()
    return elegida.estudiantes


def _test(lecturas: Lecturas, parametros, valor: str | None) -> set[int]:
    if valor not in ESTADOS_TEST:
        raise _no_encontrado()
    _, aplicaciones = aplicaciones_de(lecturas.sesion, parametros["PANEL_INSTRUMENTO_PRINCIPAL"])
    estados, _ = estados_test(lecturas.sesion, lecturas.alcance.ids, [a.id for a in aplicaciones],
                              entero(parametros, "PANEL_AVISOS_VELOCIDAD_PRISA"), lecturas.completadas)
    return {cuenta_id for cuenta_id, estado in estados.items() if estado == valor}


def _tramo(lecturas: Lecturas, _parametros, valor: str | None) -> set[int]:
    posiciones = lecturas.camino.posiciones
    if valor not in {"SIN_EMPEZAR", "TERMINO", *(b.codigo for b in lecturas.camino.bloques)}:
        raise _no_encontrado()
    return {cuenta_id for cuenta_id, posicion in posiciones.items() if posicion.codigo == valor}


def _detenidos(lecturas: Lecturas, parametros, _valor) -> set[int]:
    return detenidos(lecturas, parametros)[1]


def _seguridad_baja(lecturas: Lecturas, parametros, _valor) -> set[int]:
    return bandas_seguridad(lecturas, parametros)["BAJA"]


def _area(lecturas: Lecturas, _parametros, valor: str | None) -> set[int]:
    return interesados_en_area(DatosIntereses(lecturas.sesion, lecturas.alcance), valor or "")


def _institucion(lecturas: Lecturas, _parametros, valor: str | None) -> set[int]:
    return interesados_en_institucion(DatosIntereses(lecturas.sesion, lecturas.alcance), valor or "")


def _plan_fuera_test(lecturas: Lecturas, parametros, _valor) -> set[int]:
    return frente_test(lecturas, DatosIntereses(lecturas.sesion, lecturas.alcance), parametros).no_coinciden


CONJUNTOS: dict[str, Callable[[Lecturas, dict, str | None], set[int]]] = {
    "avisos": lambda lecturas, parametros, _valor: _alerta(lecturas, parametros, None),
    "alerta": lambda lecturas, parametros, valor: _alerta(lecturas, parametros, valor or ""),
    "test": _test,
    "tramo": _tramo,
    "detenidos": _detenidos,
    "seguridad_baja": _seguridad_baja,
    "area": _area,
    "institucion": _institucion,
    "plan_fuera_test": _plan_fuera_test,
}


@usar_contexto
def estudiantes_del_conjunto(sesion: Session, codigo_cuenta: str, salon: str | None, conjunto: str,
                             valor: str | None, ahora: datetime) -> list[EstudiantePanel]:
    alcance = resolver_alcance(sesion, codigo_cuenta, salon, ahora)
    calcular = CONJUNTOS.get(conjunto)
    if calcular is None:
        raise _no_encontrado()
    ids = calcular(Lecturas(sesion, alcance), leer_parametros(sesion), valor)
    return [EstudiantePanel(codigo=e.codigo, nombre=e.nombre, salon=alcance.salones[e.salon_id].nombre)
            for e in alcance.estudiantes if e.id in ids]
