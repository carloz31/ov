"""Alertas del panel del salón (ajuste panel-salon): qué alertas existen, su grupo, orden, textos y parámetros
están en `grupo_alerta` y `alerta`; aquí solo están los evaluadores, registrados por nombre.

Una fila nueva de `alerta` con un evaluador existente (otro umbral, instrumento, texto o grupo) aparece sola. Un tipo
nuevo de condición necesita un evaluador nuevo en `EVALUADORES_ALERTA`, con las claves de `parametros` que usa y su
valor por defecto: a una fila que no trae una clave se le aplica el defecto. Una alerta activa con un evaluador que
no está registrado se omite y se avisa en el log. Es el mismo patrón de `regla_desbloqueo.evaluador_especial`.

Ajuste panel-estudiantes: cada evaluador devuelve, por estudiante que cumple, los datos con que se llenan las
`{clave}` de `nombre_perfil` y `descripcion_perfil`. Los temas «Para conversar» (`temas.py`) usan el mismo registro y
son filas de un grupo con `en_inicio = false`.
"""

import logging
from math import floor
from collections.abc import Callable, Mapping
from dataclasses import dataclass, field

from sqlalchemy import select

from app.core.parametros import INSTRUMENTO_INTERESES
from app.models import Actividad, Alerta, GrupoAlerta, ProgresoActividad, RespuestaRegistro
from app.services.panel.comun import (
    SIN_EMPEZAR, TERMINO, Lecturas, aplicaciones_de, muy_atras,
)
from app.services.panel.temas import EVALUADORES_TEMAS
from app.services.panel.textos import fecha_en_palabras, fechas_en_palabras, resolver_texto, unir

registro = logging.getLogger(__name__)


@dataclass(frozen=True)
class EvaluadorAlerta:
    """`funcion(lecturas, parametros)` devuelve, por cada estudiante del alcance que cumple, los datos con que se
    llenan las `{clave}` de sus textos de perfil (vacío si no hay nada que decir). El Inicio solo usa quién cumple."""
    funcion: Callable[[Lecturas, Mapping], dict[int, dict]]
    defectos: Mapping[str, object] = field(default_factory=dict)


def _respuesta_sensible(lecturas: Lecturas, _parametros) -> dict[int, dict]:
    """Al menos una respuesta de registro vigente que Lumi derivó a la orientadora (`sensible`). `registro`: el título
    de la actividad de la más reciente."""
    if not lecturas.alcance.ids:
        return {}
    datos = {}
    for cuenta_id, titulo in lecturas.sesion.execute(select(ProgresoActividad.cuenta_id, Actividad.titulo).join(
            RespuestaRegistro, RespuestaRegistro.progreso_id == ProgresoActividad.id).join(
            Actividad, Actividad.id == ProgresoActividad.actividad_id).where(
            ProgresoActividad.cuenta_id.in_(lecturas.alcance.ids), RespuestaRegistro.vigente,
            RespuestaRegistro.sensible).order_by(RespuestaRegistro.id.desc())):
        datos.setdefault(cuenta_id, {"registro": titulo})
    return datos


def _seguridad_baja(lecturas: Lecturas, parametros) -> dict[int, dict]:
    """Al menos `senales` check-ins y los `senales` más recientes, todos ≤ `nivel_maximo`; no mira las fechas.
    `valores` y `fechas`: las señales contadas, de la más antigua a la más reciente."""
    senales, maximo = int(parametros["senales"]), int(parametros["nivel_maximo"])
    datos = {}
    for cuenta_id, filas in lecturas.senales_con_fecha.items():
        contadas = filas[:senales]
        if len(contadas) == senales and all(nivel <= maximo for nivel, _ in contadas):
            contadas = list(reversed(contadas))
            datos[cuenta_id] = {"valores": unir(str(nivel) for nivel, _ in contadas),
                                "fechas": fechas_en_palabras(fecha for _, fecha in contadas)}
    return datos


def _sin_ingreso(lecturas: Lecturas, parametros) -> dict[int, dict]:
    """Ningún INGRESO en los últimos `dias` días (hora de Lima); quien nunca ingresó también. `ultimo`: la fecha del
    último ingreso o `texto_nunca`."""
    datos = {}
    for cuenta_id in lecturas.sin_ingreso_desde(int(parametros["dias"])):
        ultimo = lecturas.ultimo_ingreso.get(cuenta_id)
        datos[cuenta_id] = {"ultimo": fecha_en_palabras(ultimo) if ultimo else str(parametros["texto_nunca"])}
    return datos


def _avance_bajo_salon(lecturas: Lecturas, parametros) -> dict[int, dict]:
    """Tramo actual ≤ mediana de su salón − `tramos` (sin empezar = 0, terminó = último + 1). `tramo`: el suyo;
    `tramo_salon`: el de la mediana de su salón, el mismo valor con que se decide (una mediana entre dos tramos
    nombra el menor)."""
    camino = lecturas.camino
    nombres = {b.codigo: b.nombre for b in camino.bloques} | dict(parametros["textos_tramo"])
    por_numero = {0: SIN_EMPEZAR, **{i: b.codigo for i, b in enumerate(camino.bloques, start=1)},
                  len(camino.bloques) + 1: TERMINO}
    medianas = lecturas.medianas_salon
    salon_de = {e.id: e.salon_id for e in lecturas.alcance.estudiantes}
    datos = {}
    for cuenta_id in muy_atras(lecturas.alcance.estudiantes, camino, int(parametros["tramos"]), medianas):
        mediana = por_numero[floor(medianas[salon_de[cuenta_id]])]
        datos[cuenta_id] = {"tramo": nombres[camino.posiciones[cuenta_id].codigo], "tramo_salon": nombres[mediana]}
    return datos


def _instrumento_por_revisar(lecturas: Lecturas, parametros) -> dict[int, dict]:
    """Resultado vigente con perfil plano o con `avisos_velocidad` avisos o más (la definición de «Por revisar»).
    `motivo`: el texto de `textos_motivo` para PLANO o PRISA."""
    _, aplicaciones = aplicaciones_de(lecturas.sesion, str(parametros["instrumento"]))
    textos = parametros["textos_motivo"]
    revisar = lecturas.por_revisar([a.id for a in aplicaciones], int(parametros["avisos_velocidad"]))
    return {cuenta_id: {"motivo": textos[motivo]} for cuenta_id, motivo in revisar.items()}


def _familia_pendiente(lecturas: Lecturas, parametros) -> dict[int, dict]:
    """Sin vínculo familiar activo o sin ningún apoderado vinculado que haya ingresado. `motivo`: el texto de
    `textos_motivo` para SIN_VINCULO o SIN_INGRESO."""
    textos = parametros["textos_motivo"]
    return {cuenta_id: {"motivo": textos["SIN_INGRESO" if lecturas.apoderados.get(cuenta_id) else "SIN_VINCULO"]}
            for cuenta_id in set(lecturas.alcance.ids) - lecturas.familias_participando}


EVALUADORES_ALERTA: dict[str, EvaluadorAlerta] = {
    "respuesta_sensible": EvaluadorAlerta(_respuesta_sensible),
    "seguridad_baja": EvaluadorAlerta(_seguridad_baja, {"senales": 3, "nivel_maximo": 2}),
    "sin_ingreso": EvaluadorAlerta(_sin_ingreso, {"dias": 7, "texto_nunca": "nunca"}),
    "avance_bajo_salon": EvaluadorAlerta(_avance_bajo_salon, {
        "tramos": 2, "textos_tramo": {SIN_EMPEZAR: "Sin empezar", TERMINO: "Terminó el camino"}}),
    "instrumento_por_revisar": EvaluadorAlerta(_instrumento_por_revisar, {
        "instrumento": INSTRUMENTO_INTERESES, "avisos_velocidad": 2,
        "textos_motivo": {"PLANO": "Su resultado salió plano: todas las respuestas parecidas",
                          "PRISA": "Lo respondió muy rápido (estimado por tiempo)"}}),
    "familia_pendiente": EvaluadorAlerta(_familia_pendiente, {
        "textos_motivo": {"SIN_VINCULO": "No tiene un apoderado vinculado",
                          "SIN_INGRESO": "Su apoderado tiene cuenta, pero no ha ingresado"}}),
    # Ajuste panel-estudiantes: temas «Para conversar».
    **{nombre: EvaluadorAlerta(funcion, defectos) for nombre, (funcion, defectos) in EVALUADORES_TEMAS.items()},
}


@dataclass(frozen=True)
class AlertaCalculada:
    grupo: GrupoAlerta
    alerta: Alerta
    nombre: str
    descripcion: str | None
    parametros: Mapping
    datos: dict[int, dict]

    @property
    def estudiantes(self) -> set[int]:
        return set(self.datos)

    def nombre_perfil(self, cuenta_id: int) -> str:
        """El título cuando se habla de ese estudiante (sin `nombre_perfil`, el `nombre`)."""
        return resolver_texto(self.alerta.nombre_perfil or self.alerta.nombre, self.datos.get(cuenta_id, {}),
                              self.parametros)

    def descripcion_perfil(self, cuenta_id: int) -> str | None:
        return resolver_texto(self.alerta.descripcion_perfil, self.datos.get(cuenta_id, {}), self.parametros)


def calcular_alertas(lecturas: Lecturas, en_inicio: bool | None = True) -> list[AlertaCalculada]:
    """Las alertas activas en el orden de la base (grupo y alerta), cada una con sus estudiantes (también vacías).
    Por defecto, solo las de grupos del Inicio (`en_inicio`); `False`, solo las demás (los temas); `None`, todas."""
    consulta = (select(Alerta, GrupoAlerta).join(GrupoAlerta, GrupoAlerta.id == Alerta.grupo_id).where(Alerta.activa)
                .order_by(GrupoAlerta.orden, Alerta.orden, Alerta.codigo))
    if en_inicio is not None:
        consulta = consulta.where(GrupoAlerta.en_inicio.is_(en_inicio))
    calculadas = []
    for alerta, grupo in lecturas.sesion.execute(consulta):
        evaluador = EVALUADORES_ALERTA.get(alerta.evaluador)
        if evaluador is None:
            registro.warning("La alerta %s usa un evaluador que no existe: %s", alerta.codigo, alerta.evaluador)
            continue
        parametros = {**evaluador.defectos, **(alerta.parametros or {})}
        calculadas.append(AlertaCalculada(grupo, alerta, resolver_texto(alerta.nombre, parametros),
                                          resolver_texto(alerta.descripcion, parametros), parametros,
                                          evaluador.funcion(lecturas, parametros)))
    return calculadas
