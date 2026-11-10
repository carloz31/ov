"""La tarjeta que corresponde al ítem y a la opción marcada, con sus bases heredadas y los marcadores ya reemplazados.

Recibe la ficha tal como está en `datos/tarjetas_registros` (quien llama la pasa: `app` no importa `datos`).
"""

from collections.abc import Mapping, Sequence
from dataclasses import dataclass

TIPOS = ('propio', 'general', 'emocional', 'no_sabe', 'vacio', 'fuera_de_tema')
CON_REPREGUNTA = ('general', 'no_sabe', 'vacio', 'fuera_de_tema')
MARCADORES = ('carrera', 'plan_a', 'plan_b')


@dataclass(frozen=True, slots=True)
class Tarjeta:
    texto: str
    bases: Mapping[str, str]  # las cuatro de CON_REPREGUNTA, ya heredadas y con marcadores
    filtrar_etiqueta: bool


def _opcion(texto: str, etiquetas: Sequence[str]) -> str:
    """`{opción}` como en el runner: «, {opción}» pasa a «, <etiquetas>» o desaparece si no hay opción marcada."""
    opcion = ' y '.join(etiquetas)
    return texto.replace(', {opción}', f', {opcion}' if opcion else '')


def _marcadores(texto: str, valores: Mapping[str, str]) -> str:
    for marcador, valor in valores.items():
        texto = texto.replace(f'{{{marcador}}}', valor)
    return texto


def resolver(texto: str, etiquetas: Sequence[str] = (), marcadores: Mapping[str, str] | None = None) -> str:
    return _marcadores(_opcion(texto, etiquetas), marcadores or {})


def tarjeta_para(ficha: Mapping, codigo_opcion: str | None = None, etiquetas: Sequence[str] = (),
                 marcadores: Mapping[str, str] | None = None) -> Tarjeta:
    """La tarjeta de la opción marcada si tiene una propia; si no, la del ítem.

    Herencia: sin base de `fuera_de_tema`, la de `general`; con `general_por_opcion` (b1-3-contraste, b2-4-cruce), la
    base de `general` es la de la opción marcada."""
    ficha = ficha.get('por_opcion', {}).get(codigo_opcion, ficha)
    bases = dict(ficha['bases'])
    if 'general_por_opcion' in ficha:
        bases['general'] = ficha['general_por_opcion'][codigo_opcion]
    bases.setdefault('fuera_de_tema', bases.get('general'))
    if set(bases) != set(CON_REPREGUNTA) or not all(bases.values()):
        raise ValueError(f'La tarjeta no trae las cuatro bases: {sorted(k for k, v in bases.items() if v)}')
    return Tarjeta(texto=resolver(ficha['tarjeta'], etiquetas, marcadores),
                   bases={t: resolver(b, etiquetas, marcadores) for t, b in bases.items()},
                   filtrar_etiqueta=bool(ficha['filtrar_etiqueta']))
