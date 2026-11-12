"""Modos `--guion` y `--pasos` del runner de `tests/llm` (ajuste llm-sugerencias, §4). No es pytest.

Corre los casos de `casos/guion-v4-haiku.json` y `casos/pasos-v5-haiku.json` contra Claude Haiku con el prompt, el
mensaje, el esquema, el filtro (guion) y la validación (pasos) del backend, sin base: el contexto sale del caso. Escribe
en `resultados/guion/` o `resultados/pasos/` un CSV, un informe con los chequeos automáticos y una tabla para la
lectura a ciegas (sin lo esperado, la clase ni el motivo). El informe de pasos empieza con la medición de la llamada
(casos M01-M10: tokens de razonamiento y de salida, latencia y parada)."""

import csv
import json
import random
import re
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.core.parametros import (  # noqa: E402
    MAXIMO_CARACTERES_PASO, MAXIMO_CARACTERES_PREGUNTA_GUION, MAXIMO_CARACTERES_PROMPT_GUION,
    MAXIMO_CARACTERES_PROMPT_PASO, MAXIMO_TOKENS_SALIDA_PASOS, TIEMPO_MAXIMO_PASOS_SEGUNDOS,
)
from app.services.investigaciones import prompt_guion_v4_haiku as prompt_guion  # noqa: E402
from app.services.investigaciones.sugerencias import (  # noqa: E402
    ContextoGuion, RespuestaGuion, armar_mensaje as mensaje_guion, clave_pregunta, filtrar_preguntas,
)
from app.services.planes import prompt_pasos_v5_haiku as prompt_pasos  # noqa: E402
from app.services.planes.sugerencias import (  # noqa: E402
    ContextoSugerencias, Novedad, armar_mensaje as mensaje_pasos, modelo_respuesta, validar_sugerencias,
)
from app.services.registro.llm import LlamadaFallida, SalidaInvalida, salida_json  # noqa: E402
from datos.fijos import LISTAS_COMUNES, PREGUNTAS_BASE_GUION  # noqa: E402

AQUI = Path(__file__).resolve().parent
BASE = tuple(texto for _, texto in PREGUNTAS_BASE_GUION)
PASOS = dict((c, o) for c, _, o in LISTAS_COMUNES)['PASOS']
CAMPOS = ('dia', 'necesita', 'duda')
INFINITIVO = re.compile(r'^[a-záéíóúñ]+(ar|er|ir)(me|le|les|lo|la|se)?$')
SEGUNDA_PERSONA = re.compile(r'\b(tu|tus|te|podrías)\b', re.I)
CIFRAS_O_WEB = re.compile(r'\d|www\.|https?:|\.(pe|com|org|edu)\b', re.I)


def _casos(nombre):
    return json.loads((AQUI / 'casos' / nombre).read_text(encoding='utf-8'))['casos']


def _llamar(cliente, sistema, mensaje, modelo, **topes):
    """(salida o None, causa, respuesta cruda o None)."""
    try:
        salida, cruda = salida_json(cliente, sistema, mensaje, modelo, **topes)
        return salida, '', cruda
    except LlamadaFallida as fallo:
        return None, fallo.causa, None
    except SalidaInvalida as fallo:
        return None, fallo.causa, fallo.cruda


def _medidas(cruda):
    if cruda is None:
        return {'parada': '', 'tokens_entrada': '', 'tokens_razonamiento': '', 'tokens_salida': '', 'latencia_ms': ''}
    return {'parada': cruda.parada, 'tokens_entrada': cruda.tokens_entrada,
            'tokens_razonamiento': cruda.tokens_razonamiento, 'tokens_salida': cruda.tokens_salida,
            'latencia_ms': cruda.latencia_ms}


def _guardar(carpeta, filas, etiqueta):
    marca = datetime.now().strftime('%Y%m%d-%H%M%S') + (f'-{etiqueta}' if etiqueta else '')
    destino = carpeta / f'{marca}.csv'
    carpeta.mkdir(parents=True, exist_ok=True)
    with destino.open('w', newline='', encoding='utf-8') as archivo:
        escritor = csv.DictWriter(archivo, fieldnames=list(filas[0]))
        escritor.writeheader()
        escritor.writerows(filas)
    return destino


def _celda(valor):
    return str(valor if valor is not None else '').replace('|', '\\|').replace('\n', ' ')


def _tabla(encabezado, filas):
    lineas = ['| ' + ' | '.join(encabezado) + ' |', '|' + '---|' * len(encabezado)]
    return lineas + ['| ' + ' | '.join(_celda(v) for v in fila) + ' |' for fila in filas]


def _lectura_a_ciegas(filas, campo_texto, semilla):
    """Las sugerencias en orden aleatorio, sin lo esperado, la clase ni el motivo: id, contexto y texto."""
    elegidas = [f for f in filas if f[campo_texto]]
    random.Random(semilla).shuffle(elegidas)
    return _tabla(('#', 'caso', 'de', 'texto', 'sale de lo suyo', 'sirve', 'es realista'),
                  [(n, f['caso'], f['de'], f[campo_texto], '', '', '') for n, f in enumerate(elegidas, start=1)])


# --- Guion -------------------------------------------------------------------------------------

def contexto_guion(caso):
    return ContextoGuion(familia=caso['familia'], dia=caso['dia'], necesita=caso['necesita'], duda=caso['duda'],
                         preguntas_base=BASE)


def chequeos_pregunta(texto):
    if texto is None:
        return []
    fallas = []
    if not texto.endswith('?'):
        fallas.append('sin_cierre')
    if texto.count('¿') != 1:
        fallas.append('signos')
    if len(texto) > MAXIMO_CARACTERES_PROMPT_GUION:
        fallas.append('largo_prompt' if len(texto) <= MAXIMO_CARACTERES_PREGUNTA_GUION else 'largo_filtro')
    if len(texto.split()) > 20:
        fallas.append('palabras')
    if clave_pregunta(texto) in {clave_pregunta(b) for b in BASE}:
        fallas.append('repite_base')
    return fallas


def correr_guion(cliente, casos):
    filas = []
    for caso in casos:
        contexto = contexto_guion(caso)
        salida, causa, cruda = _llamar(cliente, prompt_guion.PROMPT, mensaje_guion(contexto), RespuestaGuion)
        utiles = {p.campo.value.lower(): p.texto for p in filtrar_preguntas(salida, set())} if salida else {}
        for campo in CAMPOS:
            sugerencia = getattr(salida, campo) if salida else None
            pregunta = sugerencia.pregunta if sugerencia else None
            esperado = caso['esperado'][campo]
            ok_esperado = (esperado == 'cualquiera' or (esperado == 'null') == (pregunta is None)) if salida else False
            filas.append({'caso': caso['id'], 'de': campo, 'texto_estudiante': caso[campo], 'esperado': esperado,
                          'pregunta': pregunta or '', 'motivo': sugerencia.motivo if sugerencia else '',
                          'pasa_filtro': 'sí' if campo in utiles else '', 'acierta': 'sí' if ok_esperado else 'no',
                          'chequeos': ' '.join(chequeos_pregunta(pregunta)),
                          'repite_base_aceptado': 'sí' if campo in caso.get('repite_base_aceptado', ()) else '',
                          'causa_fallo': causa, 'nota': caso.get('nota', ''), **_medidas(cruda)})
    return filas


def informe_guion(destino, filas, modelo):
    llamadas = {f['caso']: f for f in filas}
    aciertos = sum(f['acierta'] == 'sí' for f in filas)
    lineas = [f'# Guion · {prompt_guion.VERSION} · {destino.stem}', '',
              f'Modelo `{modelo}`, prompt `{prompt_guion.VERSION}` (`{prompt_guion.HASH[:12]}`). Casos: '
              f'`casos/guion-v4-haiku.json` ({len(llamadas)}). Una llamada por caso.', '',
              f'- Campos que aciertan lo esperado (propone / no propone): **{aciertos}/{len(filas)}**.',
              f'- Llamadas fallidas o fuera de esquema: {sum(bool(f["causa_fallo"]) for f in llamadas.values())}.',
              f'- Chequeos automáticos con falla: {sum(bool(f["chequeos"].replace("repite_base", "").strip()) for f in filas)}.',
              '- Repite base (defecto conocido y aceptado, no cuenta como fallo): '
              + (', '.join(f'{f["caso"]}·{f["de"]}' for f in filas if 'repite_base' in f['chequeos']
                           or f['repite_base_aceptado']) or 'ninguno') + '.', '',
              '## Por caso', '']
    lineas += _tabla(('caso', 'de', 'esperado', 'pregunta', 'motivo', 'filtro', 'acierta', 'chequeos'),
                     [(f['caso'], f['de'], f['esperado'], f['pregunta'], f['motivo'], f['pasa_filtro'], f['acierta'],
                       f['chequeos']) for f in filas])
    lineas += ['', '## Lectura a ciegas', '',
               '¿La pregunta sale de lo que escribió el estudiante? ¿Sirve en la entrevista? ¿Es realista?', '']
    lineas += _lectura_a_ciegas([{**f, 'texto': f['pregunta']} for f in filas], 'texto', destino.stem)
    ruta = destino.with_suffix('.md')
    ruta.write_text('\n'.join(lineas) + '\n', encoding='utf-8')
    return ruta


# --- Pasos -------------------------------------------------------------------------------------

def contexto_pasos(caso):
    return ContextoSugerencias(
        tipo=caso['tipo'], carrera=caso['carrera'], institucion=caso.get('institucion'), camino=caso.get('camino'),
        financiamiento=tuple(caso.get('financiamiento', ())), tipos_paso=PASOS,
        pasos_actuales=tuple(caso.get('pasos_actuales', ())),
        novedades=tuple(Novedad(numero=n, texto=nov['texto']) for n, nov in enumerate(caso['novedades'], start=1)))


def chequeos_paso(texto, pasos_actuales):
    fallas = []
    primera = texto.split()[0].lower().strip('«"') if texto.split() else ''
    if not INFINITIVO.match(primera):
        fallas.append('no_infinitivo')
    if SEGUNDA_PERSONA.search(texto):
        fallas.append('segunda_persona')
    if CIFRAS_O_WEB.search(texto):
        fallas.append('cifras_o_web')
    if len(texto) > MAXIMO_CARACTERES_PROMPT_PASO:
        fallas.append('largo_prompt' if len(texto) <= MAXIMO_CARACTERES_PASO else 'largo_validacion')
    if clave_pregunta(texto) in {clave_pregunta(p) for p in pasos_actuales}:
        fallas.append('repite_actual')
    return fallas


def correr_pasos(cliente, casos):
    filas, medicion = [], []
    codigos = tuple(codigo for codigo, _ in PASOS)
    for caso in casos:
        contexto = contexto_pasos(caso)
        salida, causa, cruda = _llamar(cliente, prompt_pasos.PROMPT, mensaje_pasos(contexto), modelo_respuesta(codigos),
                                       maximo_tokens=MAXIMO_TOKENS_SALIDA_PASOS, tiempo=TIEMPO_MAXIMO_PASOS_SEGUNDOS)
        medidas = _medidas(cruda)
        if caso.get('medicion'):
            medicion.append({'caso': caso['id'], 'novedades': len(caso['novedades']), 'causa_fallo': causa, **medidas})
        crudas = {item.numero: item for item in salida.sugerencias} if salida else {}
        validas = validar_sugerencias(salida, contexto) if salida else {}
        for numero, novedad in enumerate(caso['novedades'], start=1):
            item, valida = crudas.get(numero), validas.get(numero)
            esperado = novedad.get('esperado', {})
            pasos = list(item.pasos) if item else []
            chequeos = []
            if esperado.get('clase') and (item is None or item.clase not in esperado['clase']):
                chequeos.append('clase')
            if esperado.get('sin_pasos') and pasos:
                chequeos.append('con_pasos')
            if len(pasos) > esperado.get('max_pasos', 2):
                chequeos.append('cantidad')
            base = {'caso': caso['id'], 'de': numero, 'novedad': novedad['texto'], 'origen': novedad['origen'],
                    'clase': item.clase if item else '', 'esperado_clase': '/'.join(esperado.get('clase', ())),
                    'motivo': item.motivo if item else '', 'validos': len(valida.pasos) if valida else 0,
                    'causa_fallo': causa, 'nota': caso.get('nota', ''), **medidas}
            if not pasos:
                filas.append({**base, 'tipo': '', 'paso': '', 'chequeos': ' '.join(chequeos)})
            for paso in pasos:
                filas.append({**base, 'tipo': paso.tipo, 'paso': paso.texto, 'chequeos': ' '.join(
                    chequeos + chequeos_paso(paso.texto, caso.get('pasos_actuales', ())))})
    return filas, medicion


def informe_pasos(destino, filas, medicion, modelo):
    casos = sorted({f['caso'] for f in filas})
    con_falla = [f for f in filas if f['chequeos']]
    lineas = [f'# Pasos · {prompt_pasos.VERSION} · {destino.stem}', '',
              f'Modelo `{modelo}`, prompt `{prompt_pasos.VERSION}` (`{prompt_pasos.HASH[:12]}`), topes provisionales '
              f'{MAXIMO_TOKENS_SALIDA_PASOS} tokens y {TIEMPO_MAXIMO_PASOS_SEGUNDOS} s. Casos: '
              f'`casos/pasos-v5-haiku.json` ({len(casos)}). Una llamada por caso.', '',
              '## Medición de la llamada', '',
              'Tokens de salida sin el razonamiento; latencia de la llamada completa.', '']
    lineas += _tabla(('caso', 'dudas', 'tokens de entrada', 'tokens de razonamiento', 'tokens de salida',
                      'latencia (ms)', 'parada', 'fallo'),
                     [(m['caso'], m['novedades'], m['tokens_entrada'], m['tokens_razonamiento'], m['tokens_salida'],
                       m['latencia_ms'], m['parada'], m['causa_fallo']) for m in medicion])
    lineas += ['', '## Resumen', '',
               f'- Llamadas fallidas o fuera de esquema: '
               f'{len({f["caso"] for f in filas if f["causa_fallo"]})} de {len(casos)}.',
               f'- Filas con algún chequeo automático: {len(con_falla)} de {len(filas)}.',
               '- Revisar a mano que nada de «lo que puede existir o no» (una persona de la carrera, charlas, '
               'talleres, una entrevista publicada) aparezca como si existiera.', '', '## Por caso', '']
    lineas += _tabla(('caso', 'n.º', 'novedad', 'clase', 'esperada', 'tipo', 'paso', 'motivo', 'chequeos'),
                     [(f['caso'], f['de'], f['novedad'], f['clase'], f['esperado_clase'], f['tipo'], f['paso'],
                       f['motivo'], f['chequeos']) for f in filas])
    lineas += ['', '## Lectura a ciegas', '',
               '¿El paso sale de la duda o complicación? ¿Sirve? ¿Es realista para el estudiante?', '']
    lineas += _lectura_a_ciegas([{**f, 'de': f'{f["de"]}. {f["novedad"]}'} for f in filas
                                 if not str(f['caso']).startswith('M')], 'paso', destino.stem)
    ruta = destino.with_suffix('.md')
    ruta.write_text('\n'.join(lineas) + '\n', encoding='utf-8')
    return ruta


# --- Entrada -----------------------------------------------------------------------------------

def main(args, crear_cliente):
    guion = args.guion
    casos = _casos('guion-v4-haiku.json' if guion else 'pasos-v5-haiku.json')
    if args.solo:
        casos = [c for c in casos if c['id'] in args.solo]
    if args.mostrar:
        caso = next(c for c in casos if c['id'] == args.mostrar)
        sistema, mensaje = ((prompt_guion.PROMPT, mensaje_guion(contexto_guion(caso))) if guion else
                            (prompt_pasos.PROMPT, mensaje_pasos(contexto_pasos(caso))))
        print(sistema, '\n----\n', mensaje, sep='')
        return
    print(f'{len(casos)} casos; llamadas previstas: {len(casos)}')
    if args.revisar:
        return
    cliente = crear_cliente()
    carpeta = AQUI / 'resultados' / ('guion' if guion else 'pasos')
    if guion:
        filas = correr_guion(cliente, casos)
        destino = _guardar(carpeta, filas, args.etiqueta)
        print(destino.name, informe_guion(destino, filas, cliente.modelo).name)
    else:
        filas, medicion = correr_pasos(cliente, casos)
        destino = _guardar(carpeta, filas, args.etiqueta)
        print(destino.name, informe_pasos(destino, filas, medicion, cliente.modelo).name)
