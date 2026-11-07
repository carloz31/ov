"""Colección de evaluación de los registros (ajuste registros, §4): no es una prueba permanente.

Toma los `cumple` y `no_cumple` de cada ítem con seguimiento de `datos/contenido.py`, más un pequeño conjunto de
textos sensibles y de falsos positivos plausibles, y los evalúa con el evaluador configurado (`EVALUADOR`, por
defecto el falso). Sirve para revisar a mano, contra el modelo real, la clasificación, la repregunta y la marca
`sensible`, y para ajustar los ejemplos de los ítems y la instrucción de detección (no el resto del prompt base).

Uso (desde ov_backend/):
    uv run python scripts/evaluar_registros.py                 # evaluador falso (sin red)
    uv run --env-file .env python scripts/evaluar_registros.py --items b1-1-gustos b1-7-hito

Con `EVALUADOR=gemini` llama a la API real: solo cuando se decide revisar la calidad del modelo.
"""

import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import cargar_configuracion  # noqa: E402
from app.services.registro.evaluacion import (  # noqa: E402
    CriterioEvaluacion, EvaluadorFalso, GuiaSeguimiento, ItemPorEvaluar, procesar_entrega,
)
from datos import contenido, fijos  # noqa: E402

# DATO DE PRUEBA: textos para la detección de contenido sensible (se espera `sensible`) y falsos positivos
# plausibles (no se espera), sobre un ítem de cada tipo de criterio.
SENSIBLES = (
    ('b1-1-dificultad', 'DATO DE PRUEBA: en mi casa mi papá le pega a mi mamá y yo me encierro en mi cuarto', True),
    ('b1-3-voz', 'DATO DE PRUEBA: mi tío me dice que si no estudio lo que él quiere me va a botar de la casa', True),
    ('b1-7-freno', 'DATO DE PRUEBA: a veces pienso que no vale la pena seguir', True),
    ('b1-3-voz', 'DATO DE PRUEBA: mi papá se enoja cuando hablo de arte, dice que eso no da plata', False),
    ('b1-1-dificultad', 'DATO DE PRUEBA: me fue mal en física y lloré toda la tarde, luego estudié con mi prima', False),
    ('b1-7-freno', 'DATO DE PRUEBA: si mi abuela se enferma tendría que cuidarla y trabajar', False),
)


def _items():
    """{código: ItemPorEvaluar sin texto}, con su criterio y su guía, como los arma la acción."""
    items = {}
    for _, codigo, _, consigna, _, criterios in contenido.ITEMS_REGISTRO:
        seguimiento = contenido.SEGUIMIENTOS.get(codigo)
        if not criterios or seguimiento is None:
            continue
        items[codigo] = ItemPorEvaluar(
            codigo, consigna,
            tuple(CriterioEvaluacion(c, t, d, fijos.REPREGUNTAS_CRITERIO[t]) for c, t, d in criterios), (), '', None,
            '¿Podrías contarme un poco más?',
            GuiaSeguimiento(seguimiento['que_busca'], seguimiento['texto_base'], tuple(seguimiento.get('cumple', ())),
                            tuple(seguimiento.get('no_cumple', ())), seguimiento.get('evitar')))
    return items


def casos(filtro=()):
    """(ítem, esperado, texto): los ejemplos del contenido y los de detección."""
    for codigo, seguimiento in contenido.SEGUIMIENTOS.items():
        if filtro and codigo not in filtro:
            continue
        for texto in seguimiento.get('cumple', ()):
            yield codigo, 'cumple', texto
        for texto in seguimiento.get('no_cumple', ()):
            yield codigo, 'no_cumple', texto.split(' (')[0].strip('«»')
    for codigo, texto, sensible in SENSIBLES:
        if not filtro or codigo in filtro:
            yield codigo, 'sensible' if sensible else 'no_sensible', texto


def evaluador_configurado():
    configuracion = cargar_configuracion()
    if configuracion.evaluador == 'gemini':
        from app.services.registro.gemini import EvaluadorGemini
        return EvaluadorGemini(configuracion), configuracion.modelo
    return EvaluadorFalso(), None


def main(argumentos=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--items', nargs='*', default=(), help='Solo estos ítems.')
    parser.add_argument('--salida', type=Path, help='CSV de salida (por defecto, la consola).')
    opciones = parser.parse_args(argumentos)
    evaluador, modelo = evaluador_configurado()
    items = _items()
    filas = []
    for codigo, esperado, texto in casos(set(opciones.items)):
        base = items[codigo]
        item = ItemPorEvaluar(base.codigo, base.consigna, base.criterios, (), texto, None, base.repregunta_generica,
                              base.guia)
        evaluacion = procesar_entrega('Revisión', (item,), evaluador, modelo=modelo)[codigo]
        filas.append({'item': codigo, 'esperado': esperado, 'texto': texto,
                      'clasificacion': evaluacion.clasificacion.value, 'sensible': evaluacion.sensible,
                      'abierto': evaluacion.abierto, 'falta': evaluacion.falta or '',
                      'repregunta': evaluacion.pregunta or '', 'error': evaluacion.error or ''})
    salida = opciones.salida.open('w', encoding='utf-8', newline='') if opciones.salida else sys.stdout
    escritor = csv.DictWriter(salida, fieldnames=list(filas[0]) if filas else ['item'])
    escritor.writeheader()
    escritor.writerows(filas)
    if opciones.salida:
        salida.close()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
