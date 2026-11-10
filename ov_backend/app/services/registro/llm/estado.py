"""Estado final del ítem, pista y texto citable (§8). Función pura: no llama al LLM."""

from dataclasses import dataclass

from app.services.registro.llm.evaluacion import Evaluacion

ORDEN = ('propio', 'general', 'emocional', 'no_sabe', 'vacio', 'fuera_de_tema')  # de mejor a peor
ADECUADOS = ('propio', 'general', 'emocional')
MEJORAN = ('propio', 'general')


def rango(tipo: str) -> int:
    return ORDEN.index(tipo)


@dataclass(frozen=True, slots=True)
class EstadoItem:
    """`sin_evaluar`: falló la primera llamada (no adecuado, sin pista ni cita). `seguimiento_sin_evaluar`: falló la del
    seguimiento; el ítem conserva el tipo de la primera, como si no hubiera respondido la repregunta."""
    sin_evaluar: bool
    tipo: str | None = None
    sensible: bool = False
    abierto: bool = False
    adecuado: bool = False
    pista: str | None = None
    linea_registro: str | None = None
    texto_citable: tuple[str, ...] = ()
    seguimiento_sin_evaluar: bool = False
    causa_seguimiento: str | None = None


def _citable(primera: Evaluacion, texto_primera: str, seguimiento: Evaluacion | None) -> tuple[str, ...]:
    """La primera tal cual si fue `propio` o `general`; la línea del seguimiento solo si mejoró el resultado (el
    conjunto quedó `propio` o `general` y es mejor que la primera)."""
    mejoro = (seguimiento is not None and not seguimiento.sin_evaluar and seguimiento.tipo in MEJORAN
              and rango(seguimiento.tipo) < rango(primera.tipo))
    if primera.tipo == 'propio':
        return (texto_primera,)
    if primera.tipo == 'general':
        return (texto_primera, seguimiento.linea) if mejoro else (texto_primera,)
    if primera.tipo in ('no_sabe', 'vacio', 'fuera_de_tema') and mejoro:
        return (seguimiento.linea,)
    return ()


def estado_final(primera: Evaluacion, texto_primera: str, seguimiento: Evaluacion | None = None) -> EstadoItem:
    """`seguimiento` es la evaluación de la respuesta a la repregunta, o None si no la respondió."""
    if primera.sin_evaluar:
        return EstadoItem(sin_evaluar=True)
    fallo = seguimiento is not None and seguimiento.sin_evaluar
    valido = seguimiento if seguimiento is not None and not fallo else None
    tipo = min((primera.tipo, valido.tipo), key=rango) if valido else primera.tipo
    sensible = primera.sensible or bool(valido and valido.sensible)
    abierto = tipo == 'no_sabe'
    if sensible or tipo in ('propio', 'emocional'):
        pista = None
    elif valido:
        # La repregunta que generó el seguimiento; si no generó ninguna (conjunto emocional), la que vio.
        pista = valido.repregunta or primera.repregunta
    else:
        pista = primera.repregunta  # no respondió la repregunta, o su seguimiento no se pudo evaluar
    return EstadoItem(
        sin_evaluar=False, tipo=tipo, sensible=sensible, abierto=abierto,
        adecuado=tipo in ADECUADOS or sensible or abierto, pista=pista,
        linea_registro=seguimiento.linea if seguimiento is not None else None,
        texto_citable=() if sensible else _citable(primera, texto_primera, valido),
        seguimiento_sin_evaluar=fallo, causa_seguimiento=seguimiento.causa_fallo if fallo else None)
