"""Cálculos puros de instrumentos: sin base de datos, archivos ni routers."""

import statistics
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from fractions import Fraction
from math import isfinite
from typing import Literal

from app.core.parametros import (
    CORRELACION_MINIMA, FACTOR_PORCENTAJE, FAMILIAS_RECOMENDADAS, ITEMS_ENTRE_AVISOS_VELOCIDAD,
    LONGITUD_CODIGO_INTERES, MAX_AVISOS_VELOCIDAD, MAXIMO_OCUPACIONES_AFINES, MINIMO_OCUPACIONES_AFINES, OCUPACIONES_POR_FAMILIA, RELLENO_SEGUNDA_OCUPACION,
    UMBRAL_AFIN, UMBRAL_AFIN_PARECIDO, UMBRAL_MUY_AFIN, UMBRAL_ZONA_EN_CAMINO, UMBRAL_ZONA_FUERTE,
    ZONAS_PREPARACION_AMPLIA, ZONAS_PREPARACION_INTERMEDIA,
)


BandaAfinidad = Literal["MUY_AFIN", "AFIN", "CERCANA"]
Preparacion = Literal["AMPLIA", "INTERMEDIA"]
ZonaCalculada = Literal["FUERTE", "EN_CAMINO", "POR_TRABAJAR"]


@dataclass(frozen=True)
class EstadoRitmo:
    racha_rapida: int = 0
    items_desde_aviso: int = 0
    avisos_velocidad: int = 0


def umbral_ms(enunciado: str, ms_por_palabra: int, ms_respuesta: int) -> int:
    return len(enunciado.split()) * ms_por_palabra + ms_respuesta


def evaluar_ritmo(estado: EstadoRitmo, item, tiempo_ms: int | None, instrumento,
                  permitir_aviso: bool = True) -> tuple[EstadoRitmo, int | None]:
    """Cuenta la primera respuesta de un ítem. Sin tiempo, no cuenta. `permitir_aviso=False`: el lote ya dio el suyo."""
    if tiempo_ms is None:
        return estado, None
    rapido = tiempo_ms < umbral_ms(item.enunciado, instrumento.ms_por_palabra, instrumento.ms_respuesta)
    racha = estado.racha_rapida + 1 if rapido else 0
    desde_aviso = estado.items_desde_aviso + 1
    if (permitir_aviso and racha >= instrumento.racha_aviso and estado.avisos_velocidad < MAX_AVISOS_VELOCIDAD
            and (estado.avisos_velocidad == 0 or desde_aviso >= ITEMS_ENTRE_AVISOS_VELOCIDAD)):
        aviso = estado.avisos_velocidad + 1
        return EstadoRitmo(avisos_velocidad=aviso), aviso
    return EstadoRitmo(racha, desde_aviso, estado.avisos_velocidad), None


def orden_canonico_riasec():
    """Compatibilidad de llamadas puras; las peticiones pasan el orden de la BD."""
    from app.core.parametros import DIMENSIONES_RIASEC
    return tuple(codigo for codigo, _ in DIMENSIONES_RIASEC)


@dataclass(frozen=True)
class ItemParaCalculo:
    puntaje: float
    minimo: float
    maximo: float
    inverso: bool = False


@dataclass(frozen=True)
class DimensionCalculada:
    codigo: str
    puntaje: float
    puntaje_maximo: float


@dataclass(frozen=True)
class PerfilOcupacion:
    codigo_onet: str
    titulo: str
    puntajes: tuple[float, ...]  # Mismo orden de dimensiones que el estudiante.


@dataclass(frozen=True)
class CoincidenciaCalculada:
    posicion: int
    codigo_onet: str
    titulo: str
    correlacion: float


@dataclass(frozen=True)
class CoincidenciasCalculadas:
    perfil_plano: bool
    coincidencias: tuple[CoincidenciaCalculada, ...]


@dataclass(frozen=True)
class OcupacionAfin:
    """Ocupación afín que se muestra: `parecido` es r × 100 redondeado; el r crudo no sale del backend."""
    codigo: str
    correlacion: float
    parecido: int
    banda: BandaAfinidad


@dataclass(frozen=True)
class OcupacionesAfines:
    ocupaciones: tuple[OcupacionAfin, ...]
    poco_marcado: bool


@dataclass(frozen=True)
class FamiliaRecomendada:
    """Familia en el orden de recomendación; su afinidad solo ordena y no se expone."""
    codigo: str
    ocupaciones: tuple[OcupacionAfin, ...]
    unica_ocupacion: bool


@dataclass(frozen=True)
class CodigoInteresCalculado:
    codigo: str
    hay_empate: bool


def calcular_puntaje_item(puntaje: float, minimo: float, maximo: float, inverso: bool = False) -> float:
    """Recibe el puntaje de la opción, no su orden en la escala."""
    if not all(isfinite(valor) for valor in (puntaje, minimo, maximo)):
        raise ValueError("El puntaje y los límites de la escala deben ser finitos")
    if minimo > maximo or not minimo <= puntaje <= maximo:
        raise ValueError("El puntaje debe pertenecer a los límites de la escala")
    return maximo + minimo - puntaje if inverso else puntaje


def calcular_zona(puntaje: float, cantidad_items: int) -> ZonaCalculada:
    """Zona de una dimensión de partida o llegada según el promedio de sus ítems (inversos ya aplicados)."""
    if not isfinite(puntaje) or isinstance(cantidad_items, bool) or not isinstance(cantidad_items, int) or cantidad_items < 1:
        raise ValueError("La zona requiere un puntaje finito y al menos un ítem")
    promedio = puntaje / cantidad_items
    if promedio >= UMBRAL_ZONA_FUERTE:
        return "FUERTE"
    if promedio >= UMBRAL_ZONA_EN_CAMINO:
        return "EN_CAMINO"
    return "POR_TRABAJAR"


def _validar_dimension(puntaje: float, puntaje_maximo: float) -> None:
    if not isfinite(puntaje) or not isfinite(puntaje_maximo) or puntaje_maximo <= 0:
        raise ValueError("El puntaje debe ser finito y el máximo debe ser finito y positivo")
    if not 0 <= puntaje <= puntaje_maximo:
        raise ValueError("El puntaje debe estar entre cero y el máximo")


def puntaje_visual(valor: float, minimo: float, maximo: float) -> int:
    """0–100 de cualquier escala: `(valor − mín) / (máx − mín) · 100`, redondeado con ROUND_HALF_UP.
    Solo para mostrar; ningún cálculo de resultado lo usa."""
    if not all(isfinite(v) for v in (valor, minimo, maximo)) or minimo >= maximo:
        raise ValueError("Los límites deben ser finitos y el mínimo menor que el máximo")
    if not minimo <= valor <= maximo:
        raise ValueError("El valor debe estar entre el mínimo y el máximo")
    proporcion = (Decimal(str(valor)) - Decimal(str(minimo))) / (Decimal(str(maximo)) - Decimal(str(minimo)))
    return int((proporcion * FACTOR_PORCENTAJE).quantize(Decimal(1), rounding=ROUND_HALF_UP))


def calcular_dimension(codigo: str, items: Iterable[ItemParaCalculo]) -> DimensionCalculada:
    puntaje = 0.0
    puntaje_maximo = 0.0
    for item in items:
        puntaje += calcular_puntaje_item(item.puntaje, item.minimo, item.maximo, item.inverso)
        puntaje_maximo += item.maximo
    _validar_dimension(puntaje, puntaje_maximo)
    return DimensionCalculada(codigo, puntaje, puntaje_maximo)


def calcular_dimensiones_destacadas(dimensiones: Sequence[DimensionCalculada]) -> tuple[str, ...]:
    """Conserva el orden recibido y compara proporciones sin redondearlas."""
    proporciones = []
    for dimension in dimensiones:
        _validar_dimension(dimension.puntaje, dimension.puntaje_maximo)
        proporciones.append(Fraction(dimension.puntaje) / Fraction(dimension.puntaje_maximo))
    if not proporciones:
        return ()
    mayor = max(proporciones)
    return tuple(d.codigo for d, proporcion in zip(dimensiones, proporciones, strict=True) if proporcion == mayor)


def _validar_vector(vector: Sequence[float], cantidad_dimensiones: int | None = None) -> None:
    cantidad = len(orden_canonico_riasec()) if cantidad_dimensiones is None else cantidad_dimensiones
    if len(vector) != cantidad or not all(isfinite(valor) for valor in vector):
        raise ValueError("El vector RIASEC debe tener seis puntajes finitos en el orden R, I, A, S, E, C")


def calcular_pearson(vector_estudiante: Sequence[float], vector_ocupacion: Sequence[float],
                     cantidad_dimensiones: int | None = None) -> float:
    _validar_vector(vector_estudiante, cantidad_dimensiones)
    _validar_vector(vector_ocupacion, cantidad_dimensiones)
    try:
        return statistics.correlation(vector_estudiante, vector_ocupacion)
    except statistics.StatisticsError as error:
        raise ValueError("La correlación de Pearson no está definida para un vector constante") from error


def _validar_correlacion(correlacion: float) -> None:
    if not isfinite(correlacion) or not -1 <= correlacion <= 1:
        raise ValueError("La correlación debe ser finita y estar entre -1 y 1")


def calcular_parecido(correlacion: float) -> int:
    """r × 100, entero con ROUND_HALF_UP (0,685 → 69)."""
    _validar_correlacion(correlacion)
    return int((Decimal(str(correlacion)) * FACTOR_PORCENTAJE).quantize(Decimal(1), rounding=ROUND_HALF_UP))


def clasificar_banda(parecido: int) -> BandaAfinidad:
    if parecido >= UMBRAL_MUY_AFIN:
        return "MUY_AFIN"
    if parecido >= UMBRAL_AFIN_PARECIDO:
        return "AFIN"
    return "CERCANA"


def clasificar_preparacion(job_zone: int | None) -> Preparacion | None:
    """La preparación que suele pedir una ocupación afín, por su job_zone; nula sin job_zone o fuera de los cortes."""
    if job_zone in ZONAS_PREPARACION_AMPLIA:
        return "AMPLIA"
    if job_zone in ZONAS_PREPARACION_INTERMEDIA:
        return "INTERMEDIA"
    return None


def calcular_coincidencias(
    vector_estudiante: Sequence[float], ocupaciones: Iterable[PerfilOcupacion],
    cantidad_dimensiones: int | None = None,
) -> CoincidenciasCalculadas:
    _validar_vector(vector_estudiante, cantidad_dimensiones)
    if len(set(vector_estudiante)) == 1:
        return CoincidenciasCalculadas(perfil_plano=True, coincidencias=())
    candidatas = []
    for ocupacion in ocupaciones:
        try:
            correlacion = calcular_pearson(vector_estudiante, ocupacion.puntajes, cantidad_dimensiones)
        except ValueError as error:
            raise ValueError(f"No se puede calcular Pearson para la ocupación {ocupacion.codigo_onet}: {error}") from error
        _validar_correlacion(correlacion)
        # Las negativas se descartan; las demás se guardan todas, para derivar al leer.
        if correlacion >= CORRELACION_MINIMA:
            candidatas.append((ocupacion, correlacion))
    candidatas.sort(key=lambda candidata: (-candidata[1], candidata[0].codigo_onet))
    coincidencias = tuple(
        CoincidenciaCalculada(posicion, ocupacion.codigo_onet, ocupacion.titulo, correlacion)
        for posicion, (ocupacion, correlacion) in enumerate(candidatas, start=1)
    )
    return CoincidenciasCalculadas(perfil_plano=False, coincidencias=coincidencias)


def seleccionar_afines(coincidencias: Sequence[tuple[str, float]]) -> OcupacionesAfines:
    """Las que se muestran, de `(codigo, r)` ordenadas por r descendente: r ≥ UMBRAL_AFIN, hasta el máximo; si
    menos de MINIMO pasan el umbral, las MINIMO mejores y el perfil queda «poco marcado»."""
    for _, correlacion in coincidencias:
        _validar_correlacion(correlacion)
    if any(a[1] < b[1] for a, b in zip(coincidencias, coincidencias[1:])):
        raise ValueError("Las coincidencias deben venir ordenadas por correlación descendente")
    pasan = [c for c in coincidencias if c[1] >= UMBRAL_AFIN][:MAXIMO_OCUPACIONES_AFINES]
    poco_marcado = len(pasan) < MINIMO_OCUPACIONES_AFINES
    elegidas = coincidencias[:MINIMO_OCUPACIONES_AFINES] if poco_marcado else pasan
    afines = []
    for codigo, correlacion in elegidas:
        parecido = calcular_parecido(correlacion)
        afines.append(OcupacionAfin(codigo, correlacion, parecido, clasificar_banda(parecido)))
    return OcupacionesAfines(tuple(afines), poco_marcado)


def recomendar_familias(afines: Sequence[OcupacionAfin], principal: dict[str, str]) -> tuple[FamiliaRecomendada, ...]:
    """Familias de las ocupaciones mostradas por su familia principal (`principal`: código → familia; las
    secundarias no puntúan). Afinidad = media de los 2 mayores r; con una sola, el segundo cupo vale 0,5. Se
    devuelven las mejores en orden, con el código de familia como desempate."""
    por_familia: dict[str, list[OcupacionAfin]] = {}
    for afin in afines:
        if afin.codigo in principal:
            por_familia.setdefault(principal[afin.codigo], []).append(afin)
    puntuadas = []
    for familia, ocupaciones in por_familia.items():
        ocupaciones.sort(key=lambda o: (-o.correlacion, o.codigo))
        mejores = [o.correlacion for o in ocupaciones[:OCUPACIONES_POR_FAMILIA]]
        mejores += [RELLENO_SEGUNDA_OCUPACION] * (OCUPACIONES_POR_FAMILIA - len(mejores))
        puntuadas.append((sum(mejores) / OCUPACIONES_POR_FAMILIA, familia, ocupaciones))
    puntuadas.sort(key=lambda p: (-p[0], p[1]))
    return tuple(FamiliaRecomendada(familia, tuple(ocupaciones), len(ocupaciones) == 1)
                 for _, familia, ocupaciones in puntuadas[:FAMILIAS_RECOMENDADAS])


def calcular_codigo_interes(puntajes: Sequence[float], orden: Sequence[str] | None = None) -> CodigoInteresCalculado:
    orden = orden_canonico_riasec() if orden is None else orden
    _validar_vector(puntajes, len(orden))
    if len(orden) <= LONGITUD_CODIGO_INTERES:
        raise ValueError("Faltan dimensiones para el código de interés y su desempate")
    posiciones = sorted(range(len(orden)), key=lambda posicion: (-puntajes[posicion], posicion))
    return CodigoInteresCalculado(
        codigo="".join(orden[posicion] for posicion in posiciones[:LONGITUD_CODIGO_INTERES]),
        hay_empate=puntajes[posiciones[LONGITUD_CODIGO_INTERES - 1]] == puntajes[posiciones[LONGITUD_CODIGO_INTERES]],
    )
