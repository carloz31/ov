"""Lo que tres misiones del camino de `contenido` piden fuera del camino (ajuste desbloqueos), para recorrerlo con las
acciones reales: la carta antes de `b1-4`, un caso superado antes de `b1-7`, la misión de Anselmo después de `b1-7` y
el guion listo antes de `b3-2`.

La usan la siembra de estudiantes de ejemplo (`sembrar_panel_ejemplo.py`) y las ayudas de pruebas
(`tests/soporte/soporte_contenido.py`). No importa nada de `tests/` ni llama al LLM: el guion se deja listo con una
pregunta propia, sin pedir sugerencias. Los textos son DATO DE PRUEBA.
"""

from collections.abc import Callable

# accion(nombre, datos): POST /acciones/<nombre> para la cuenta, con la fecha de quien llama.
Accion = Callable[[str, dict], object]
# completar(actividad): completa una actividad INFORMATIVA de la cuenta.
Completar = Callable[[str], object]

CASO = 'c1'
PUNTAJE_CASO = 8  # el máximo de c1 (CONFIGURACION_CASOS): superado
FAMILIA_GUION = '524'
CARTA = 'DATO DE PRUEBA: gracias por acompañarme en esto.'
PIENSO = {'dia': 'DATO DE PRUEBA: creo que revisa instalaciones de casas y edificios.',
          'necesita': 'DATO DE PRUEBA: creo que necesita estudiar en un instituto.',
          'duda': 'DATO DE PRUEBA: ¿es peligroso trabajar con electricidad todos los días?'}


def antes_de(actividad: str, accion: Accion) -> None:
    """Lo que `actividad` pide además de la misión anterior."""
    if actividad == 'b1-4':
        accion('escribir-carta', {'texto': CARTA})
    elif actividad == 'b1-7':
        accion('resolver-caso', {'actividad': CASO, 'puntaje': PUNTAJE_CASO})
    elif actividad == 'b3-2':
        dejar_guion_listo(accion)


def despues_de(actividad: str, completar: Completar) -> None:
    """`b1-7` abre la misión de Anselmo, que abre Investigaciones (lo que pide el guion de `b3-2`)."""
    if actividad == 'b1-7':
        completar('investigador')


def dejar_guion_listo(accion: Accion) -> None:
    accion('guardar-lo-que-pienso', {'familia': FAMILIA_GUION, **PIENSO})
    accion('guardar-guion', {'preguntas': [{'origen': 'PROPIA', 'texto': PIENSO['duda']}], 'descartadas': [],
                             'terminar': True})
