"""Alertas del panel del salón (ajuste panel-salon): qué alertas existen, su grupo, orden, textos y parámetros
están en `grupo_alerta` y `alerta`; aquí solo están los evaluadores, registrados por nombre.

Una fila nueva de `alerta` con un evaluador existente (otro umbral, instrumento, texto o grupo) aparece sola. Un tipo
nuevo de condición necesita un evaluador nuevo en `EVALUADORES_ALERTA`, con las claves de `parametros` que usa y su
valor por defecto: a una fila que no trae una clave se le aplica el defecto. Una alerta activa con un evaluador que
no está registrado se omite y se avisa en el log. Es el mismo patrón de `regla_desbloqueo.evaluador_especial`.
"""

import logging
from collections.abc import Callable, Mapping
from dataclasses import dataclass, field

from sqlalchemy import select

from app.core.parametros import INSTRUMENTO_INTERESES
from app.models import Alerta, GrupoAlerta, ProgresoActividad, RespuestaRegistro
from app.services.panel.comun import Lecturas, aplicaciones_de, muy_atras, por_revisar

registro = logging.getLogger(__name__)


@dataclass(frozen=True)
class EvaluadorAlerta:
    """`funcion(lecturas, parametros)` devuelve los ids de los estudiantes del alcance que cumplen."""
    funcion: Callable[[Lecturas, Mapping], set[int]]
    defectos: Mapping[str, object] = field(default_factory=dict)


def _respuesta_sensible(lecturas: Lecturas, _parametros) -> set[int]:
    """Al menos una respuesta de registro vigente que Lumi derivó a la orientadora (`sensible`)."""
    if not lecturas.alcance.ids:
        return set()
    return set(lecturas.sesion.scalars(select(ProgresoActividad.cuenta_id).join(
        RespuestaRegistro, RespuestaRegistro.progreso_id == ProgresoActividad.id).where(
        ProgresoActividad.cuenta_id.in_(lecturas.alcance.ids), RespuestaRegistro.vigente,
        RespuestaRegistro.sensible).distinct()))


def _seguridad_baja(lecturas: Lecturas, parametros) -> set[int]:
    """Al menos `senales` check-ins y los `senales` más recientes, todos ≤ `nivel_maximo`; no mira las fechas."""
    senales, maximo = int(parametros["senales"]), int(parametros["nivel_maximo"])
    return {cuenta_id for cuenta_id, niveles in lecturas.senales.items()
            if len(niveles) >= senales and all(nivel <= maximo for nivel in niveles[:senales])}


def _sin_ingreso(lecturas: Lecturas, parametros) -> set[int]:
    """Ningún INGRESO en los últimos `dias` días (hora de Lima); quien nunca ingresó también."""
    return lecturas.sin_ingreso_desde(int(parametros["dias"]))


def _avance_bajo_salon(lecturas: Lecturas, parametros) -> set[int]:
    """Tramo actual ≤ mediana de su salón − `tramos` (sin empezar = 0, terminó = último + 1)."""
    return muy_atras(lecturas.alcance.estudiantes, lecturas.camino, int(parametros["tramos"]))


def _instrumento_por_revisar(lecturas: Lecturas, parametros) -> set[int]:
    """Resultado vigente con perfil plano o con `avisos_velocidad` avisos o más (la definición de «Por revisar»)."""
    _, aplicaciones = aplicaciones_de(lecturas.sesion, str(parametros["instrumento"]))
    return set(por_revisar(lecturas.sesion, lecturas.alcance.ids, [a.id for a in aplicaciones],
                           int(parametros["avisos_velocidad"])))


def _familia_pendiente(lecturas: Lecturas, _parametros) -> set[int]:
    """Sin vínculo familiar activo o sin ningún apoderado vinculado que haya ingresado."""
    return set(lecturas.alcance.ids) - lecturas.familias_participando


EVALUADORES_ALERTA: dict[str, EvaluadorAlerta] = {
    "respuesta_sensible": EvaluadorAlerta(_respuesta_sensible),
    "seguridad_baja": EvaluadorAlerta(_seguridad_baja, {"senales": 3, "nivel_maximo": 2}),
    "sin_ingreso": EvaluadorAlerta(_sin_ingreso, {"dias": 7}),
    "avance_bajo_salon": EvaluadorAlerta(_avance_bajo_salon, {"tramos": 2}),
    "instrumento_por_revisar": EvaluadorAlerta(_instrumento_por_revisar,
                                               {"instrumento": INSTRUMENTO_INTERESES, "avisos_velocidad": 2}),
    "familia_pendiente": EvaluadorAlerta(_familia_pendiente),
}


class _Textos(dict):
    """`{clave}` sin parámetro queda tal cual."""

    def __missing__(self, clave):
        return "{" + clave + "}"


def resolver_texto(texto: str | None, parametros: Mapping) -> str | None:
    return None if texto is None else texto.format_map(_Textos(parametros))


@dataclass(frozen=True)
class AlertaCalculada:
    grupo: GrupoAlerta
    alerta: Alerta
    nombre: str
    descripcion: str | None
    estudiantes: set[int]


def calcular_alertas(lecturas: Lecturas) -> list[AlertaCalculada]:
    """Las alertas activas en el orden de la base (grupo y alerta), cada una con sus estudiantes (también vacías)."""
    filas = lecturas.sesion.execute(select(Alerta, GrupoAlerta).join(GrupoAlerta, GrupoAlerta.id == Alerta.grupo_id)
                                    .where(Alerta.activa).order_by(GrupoAlerta.orden, Alerta.orden, Alerta.codigo))
    calculadas = []
    for alerta, grupo in filas:
        evaluador = EVALUADORES_ALERTA.get(alerta.evaluador)
        if evaluador is None:
            registro.warning("La alerta %s usa un evaluador que no existe: %s", alerta.codigo, alerta.evaluador)
            continue
        parametros = {**evaluador.defectos, **(alerta.parametros or {})}
        calculadas.append(AlertaCalculada(grupo, alerta, resolver_texto(alerta.nombre, parametros),
                                          resolver_texto(alerta.descripcion, parametros),
                                          evaluador.funcion(lecturas, parametros)))
    return calculadas
