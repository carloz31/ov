"""Prueba de tarjetas y clasificación por `tipo` (v7.2c): método B, repregunta guiada con la base como respaldo, en b1-3.

No es pytest y no toca el backend ni el prompt vigente: reutiliza de `evaluar.py` el entorno y las opciones, y lee su
prompt (`prompts/v7.md`), sus tarjetas (`tarjetas_b1_1.py`, `tarjetas_b1_3.py`), sus casos (`casos/b1-3-tarjetas-v7.2c.json`)
y su léxico (`lexico/es_ES`, hunspell con spylls). Las corridas anteriores quedan en sus CSV e informes y este runner no las rehace.

Uso, desde ov_backend:
    uv run python tests/llm/evaluar_tarjetas.py --revisar           # solapamiento y filtro sobre v7 y v7.2, sin llamar
    uv run python tests/llm/evaluar_tarjetas.py --mostrar 20        # el prompt y el mensaje, sin llamar
    uv run python tests/llm/evaluar_tarjetas.py                     # dos corridas de cada caso; CSV e informe
    uv run python tests/llm/evaluar_tarjetas.py --informe <csv>     # rehace el informe desde un CSV, sin llamar
"""

import argparse
import csv
import json
import re
import subprocess
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Literal

import httpx
from pydantic import BaseModel
from spylls.hunspell import Dictionary

import evaluar as base  # agrega el backend a sys.path
import tarjetas_b1_1
import tarjetas_b1_3

from app.core import parametros  # noqa: E402
from app.models.base import sin_tildes  # noqa: E402

VERSION = 'v7.2c'
REGISTRO = 'b1-3'
AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
CARPETA = AQUI / 'resultados' / REGISTRO
INFORME = CARPETA / 'v7.2c.md'
CASOS = AQUI / 'casos' / f'{REGISTRO}-tarjetas-v7.2c.json'
RUTA_PROMPT = AQUI / 'prompts' / 'v7.md'
PROMPT = RUTA_PROMPT.read_text(encoding='utf-8')
LEXICO = AQUI / 'lexico' / 'es_ES'
ARCHIVOS = (AQUI / 'tarjetas_b1_3.py', AQUI / 'tarjetas_b1_1.py', RUTA_PROMPT, CASOS, LEXICO.with_suffix('.dic'), LEXICO.with_suffix('.aff'))
# (corrida, registro, CSV, casos de los que salen los ecos)
PREVIOS = (('v7', 'b1-1', '2026-11-08_2054_v7-tarjetas_t1_rlow.csv', None),
           ('v7.2', 'b1-3', '2026-11-08_2219_v7.2_t1_rlow.csv', 'b1-3-tarjetas.json'))
TARJETAS = {**tarjetas_b1_1.TARJETAS, **tarjetas_b1_3.TARJETAS}

Tipo = Literal['propio', 'general', 'no_sabe', 'vacio', 'fuera_de_tema', 'emocional']
ORDEN = ('propio', 'general', 'no_sabe', 'vacio', 'fuera_de_tema')  # `emocional` no está en el orden: pierde con todos
CON_REPREGUNTA = ('general', 'vacio', 'no_sabe', 'fuera_de_tema')
PROHIBIDAS = ('pero', 'exactamente', 'específicamente', '¿podrías', 'desarrolla', 'explica', 'demuestra', 'demostraste')
PERMITIDOS = re.compile(r'''[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s.,;:¿?¡!()«»"'“”‘’…–—-]*''')
_TIPO_BASE = '(?:general|no_sabe|vacio|fuera_de_tema)'
BASE_DE = re.compile(rf'^[ \t]*({_TIPO_BASE}(?: / {_TIPO_BASE})*) ·(?:.*\n)??.*?BASE: «(.+?)»', re.M)
PALABRA = re.compile(r'[^\W\d_]+')
TRUNCAMIENTOS = ('qu', 'dnde', 'cmo')  # palabras rotas que el léxico no atrapa siempre («qu» es una entrada de es_ES)


class Resultado(BaseModel):
    motivo: str
    tipo: Tipo
    sensible: bool
    repregunta: str | None = None


# --- Casos, tarjeta y mensaje ----------------------------------------------------------------

def cargar_casos():
    """Los casos de la prueba; los que remiten a `b1-3.json` toman de ahí su texto y sus opciones."""
    existentes = {c['id']: c for c in json.loads((AQUI / 'casos' / f'{REGISTRO}.json').read_text(encoding='utf-8'))['casos']}
    casos = json.loads(CASOS.read_text(encoding='utf-8'))['casos']
    for caso in casos:
        if caso['caso'] != 'nuevo':
            item = next(i for i in existentes[caso['caso']]['items'] if i['item'] == caso['item'])
            caso.update(texto=item['texto'], opciones=item['opciones'])
        caso['etiquetas'] = list(base.textos_elegidos(caso['item'], caso['opciones']))
    return casos


def codigo_opcion(caso):
    primera = caso['opciones'][0] if caso['opciones'] else None
    return primera if isinstance(primera, str) else None


def ficha_de(caso):
    """La pregunta y la tarjeta del ítem o, si la opción marcada tiene las suyas, esas."""
    ficha = TARJETAS[caso['item']]
    return ficha.get('por_opcion', {}).get(codigo_opcion(caso), ficha)


def tarjeta_de(caso):
    """La tarjeta con la opción marcada en lugar de `{opción}`."""
    opcion = ' y '.join(caso['etiquetas'])
    return ficha_de(caso)['tarjeta'].replace(', {opción}', f', {opcion}' if opcion else '')


def bases_de(caso):
    """El texto de respaldo de cada `tipo`. Sin base propia de `fuera_de_tema`, se usa la de `general`."""
    bases = {}
    for tipos, texto in BASE_DE.findall(tarjeta_de(caso)):
        bases.update(dict.fromkeys(tipos.split(' / '), texto))
    por_opcion = ficha_de(caso).get('general_por_opcion')
    if por_opcion:
        bases['general'] = por_opcion[codigo_opcion(caso)]
    bases.setdefault('fuera_de_tema', bases.get('general'))
    if set(bases) != set(CON_REPREGUNTA) or not all(bases.values()):
        raise SystemExit(f"La tarjeta de {caso['item']} no trae las cuatro bases: {sorted(bases)}")
    return bases


def texto_ecos(caso):
    """Los ecos como los recibe el LLM en la plataforma: nombre del ítem, opción elegida y texto."""
    lineas = []
    for clave, eco in caso.get('ecos', {}).items():
        item = f'b1-3-{clave}'
        lineas.append(f"{base.ITEMS[item][2]}: {base.textos_elegidos(item, [eco['opcion']])[0]}. «{eco['texto']}»")
    return '\n'.join(lineas)


def mensaje(caso, texto, anterior=None, invitacion=None):
    """Las etiquetas del prompt; las vacías se omiten."""
    partes = (('tarjeta', tarjeta_de(caso)), ('pregunta_mostrada', ficha_de(caso)['pregunta']),
              ('opcion_marcada', ', '.join(caso['etiquetas'])), ('ecos', texto_ecos(caso)),
              ('respuesta_anterior', anterior), ('invitacion', invitacion), ('respuesta', texto))
    return '\n'.join(f'<{nombre}>{valor}</{nombre}>' for nombre, valor in partes if valor)


# --- Chequeos previos ------------------------------------------------------------------------

def _forma_comparable(texto):
    """Sin mayúsculas ni tildes y con espacios en los bordes, para comparar respetando los límites de palabra."""
    return f" {' '.join(re.findall(r'\w+', sin_tildes(texto)))} "


def frases_de(tarjeta):
    """Los EJEMPLOS y las frases entre comillas de GENERAL SI."""
    general = re.search(r'^GENERAL SI:(.*?)^(?:MATICES|EJEMPLOS):', tarjeta, re.S | re.M).group(1)
    ejemplos = re.search(r'^EJEMPLOS:(.*?)^REPREGUNTA', tarjeta, re.S | re.M).group(1)
    return re.findall(r'"([^"]+)"', general) + re.findall(r'^\s*"([^"]+)"', ejemplos, re.M)


def solapamientos(casos):
    """(número, texto del caso, frase de la tarjeta) de cada caso que coincide con su tarjeta o contiene una de sus frases."""
    hallados = []
    for caso in casos:
        frases = frases_de(ficha_de(caso)['tarjeta'])
        for texto in filter(None, (caso['texto'], caso.get('respuesta_seguimiento'))):
            hallados += [(caso['numero'], texto, f) for f in frases if _forma_comparable(f) in _forma_comparable(texto)]
    return hallados


def hashes():
    """{ruta relativa: `git hash-object`} de cada archivo que usa la corrida."""
    return {ruta.relative_to(RAIZ).as_posix(): subprocess.run(['git', 'hash-object', str(ruta)], capture_output=True, text=True, check=True, cwd=RAIZ).stdout.strip()
            for ruta in ARCHIVOS}


# --- Filtro y estado final -------------------------------------------------------------------

@lru_cache(maxsize=1)
def lexico():
    return Dictionary.from_files(str(LEXICO))


@lru_cache(maxsize=None)
def en_lexico(palabra):
    return lexico().lookup(palabra)


def palabras_permitidas(respuestas, etiquetas, ecos):
    """Lo que escribió o marcó el estudiante vale aunque no esté en el léxico (nombres propios, lugares, carreras)."""
    fuentes = [*respuestas, *etiquetas]
    for clave, eco in ecos.items():
        fuentes += [base.textos_elegidos(f'b1-3-{clave}', [eco['opcion']])[0], eco['texto']]
    return {p.lower() for texto in fuentes if texto for p in PALABRA.findall(texto)}


def abrir_interrogacion(texto):
    """Con «?» y sin «¿», agrega el «¿» al inicio de la oración interrogativa."""
    if '?' not in texto or '¿' in texto:
        return texto
    fin = texto.index('?')
    inicio = max(texto.rfind(signo, 0, fin) for signo in '.!:;…') + 1
    inicio += len(texto[inicio:]) - len(texto[inicio:].lstrip())
    return f'{texto[:inicio]}¿{texto[inicio:]}'


def filtrar(repregunta, tipo, item, etiquetas, filtrar_etiqueta, permitidas):
    """(texto, reglas incumplidas). El texto puede volver con el «¿» agregado; sin reglas, la repregunta pasa."""
    texto = abrir_interrogacion(repregunta.strip())
    normal, reglas = sin_tildes(texto), []
    for palabra in PROHIBIDAS:
        if re.search(rf'(?<!\w){re.escape(sin_tildes(palabra))}(?!\w)', normal):
            reglas.append(f'prohibida:{palabra}')
    excepcion = tipo == 'fuera_de_tema' and item == 'b1-1-logro'
    if filtrar_etiqueta and not excepcion and any(sin_tildes(e) in normal for e in etiquetas):
        reglas.append('etiqueta_opcion')
    if len(texto.split()) > 30:
        reglas.append('mas_de_30_palabras')
    if texto.count('?') > 1:
        reglas.append('mas_de_una_pregunta')
    if not texto.endswith(('?', '.')):
        reglas.append('no_termina_en_interrogacion_ni_punto')
    if not PERMITIDOS.fullmatch(texto):
        reglas.append('caracteres')
    for palabra in PALABRA.findall(texto):
        if palabra.lower() in TRUNCAMIENTOS:
            reglas.append(f'palabra_truncada:{palabra}')
        # Con la mayúscula original: el léxico solo conoce los nombres propios así («Arequipa»).
        elif palabra.lower() not in permitidas and not en_lexico(palabra):
            reglas.append(f'palabra_extrana:{palabra}')
    return texto, reglas


def repregunta_de(r, caso, respuestas, seguimiento=False):
    """(repregunta final, origen, reglas incumplidas, si se agregó «¿»). Sin repregunta: (None, '', [], False).

    Si el filtro rechaza la del seguimiento, el respaldo es la base de `no_sabe / vacio`: la del `tipo` repetiría lo que ya vio."""
    if r.sensible or r.tipo not in CON_REPREGUNTA:
        return None, '', [], False
    respaldo = bases_de(caso)[r.tipo]
    if not (r.repregunta or '').strip():
        return respaldo, 'base_sin_redactar', [], False
    permitidas = palabras_permitidas(respuestas, caso['etiquetas'], caso.get('ecos', {}))
    texto, reglas = filtrar(r.repregunta, r.tipo, caso['item'], caso['etiquetas'], ficha_de(caso)['filtrar_etiqueta'], permitidas)
    if reglas:
        return bases_de(caso)['no_sabe'] if seguimiento else respaldo, 'base_por_filtro', reglas, False
    return texto, 'llm', [], texto != r.repregunta.strip()


def _rango(tipo):
    return ORDEN.index(tipo) if tipo in ORDEN else len(ORDEN)


def estado_final(primera, conjunto):
    """(tipo final, sensible, estado), como lo haría el backend. Estado: `sensible`, `abierto` o vacío."""
    tipo = min((primera.tipo, conjunto.tipo), key=_rango)
    sensible = primera.sensible or conjunto.sensible
    return tipo, sensible, 'sensible' if sensible else 'abierto' if tipo == 'no_sabe' else ''


# --- Corrida ---------------------------------------------------------------------------------

_http = threading.local()  # los bytes de la última respuesta de este hilo


def _guardar_bytes(respuesta):
    respuesta.read()
    _http.bytes = respuesta.content


def cliente_gemini(clave):
    """El cliente del SDK con un `httpx` que deja ver los bytes de cada respuesta."""
    tipos = base.adaptador.types
    http = httpx.Client(timeout=120, event_hooks={'response': [_guardar_bytes]})
    return base.adaptador.genai.Client(api_key=clave, http_options=tipos.HttpOptions(httpx_client=http))


def revisar_bytes(texto_sdk):
    """`igual` si los bytes HTTP, leídos como UTF-8 estricto, dan el mismo texto que entregó el SDK."""
    crudo = getattr(_http, 'bytes', None)
    if crudo is None:
        return 'sin bytes'
    partes = json.loads(crudo.decode('utf-8'))['candidates'][0]['content']['parts']
    return 'igual' if ''.join(p.get('text', '') for p in partes if not p.get('thought')) == texto_sdk else 'distinto'


def llamar(cliente, modelo, razonamiento, contenido, temperatura):
    tipos = base.adaptador.types
    inicio = time.perf_counter()
    respuesta = cliente.models.generate_content(
        model=modelo, contents=contenido,
        config=tipos.GenerateContentConfig(
            system_instruction=PROMPT, temperature=temperatura, candidate_count=1,
            response_mime_type='application/json', response_json_schema=Resultado.model_json_schema(),
            thinking_config=razonamiento, automatic_function_calling=tipos.AutomaticFunctionCallingConfig(disable=True)))
    latencia = round((time.perf_counter() - inicio) * 1000)
    partes = respuesta.candidates[0].content.parts if respuesta.candidates else []
    texto = ''.join(p.text for p in partes or [] if p.text and not p.thought)
    uso = respuesta.usage_metadata
    return Resultado.model_validate_json(texto), dict(
        latencia_ms=latencia, bytes_http=revisar_bytes(texto), tokens_entrada=getattr(uso, 'prompt_token_count', None),
        tokens_razonamiento=getattr(uso, 'thoughts_token_count', None), tokens_salida=getattr(uso, 'candidates_token_count', None))


def con_reintento(funcion, intentos=3):
    """Una falla de red o de esquema se reintenta para no dejar huecos en la única corrida."""
    for intento in range(intentos):
        try:
            return funcion()
        except Exception:  # noqa: BLE001
            if intento == intentos - 1:
                raise
            time.sleep(2)


def campos_repregunta(r, caso, respuestas, seguimiento=False):
    repregunta, origen, reglas, apertura = repregunta_de(r, caso, respuestas, seguimiento)
    return repregunta, dict(repregunta_llm=r.repregunta, repregunta=repregunta, origen=origen, filtro=' '.join(reglas),
                            apertura='sí' if apertura else '', ignorada='sí' if r.repregunta and repregunta is None else '')


def ejecutar(llamada, caso, comun, corrida):
    """Las filas de un caso en una corrida: la primera respuesta y, si tiene, el seguimiento."""
    fila_base = dict(comun, corrida=corrida, numero=caso['numero'], caso=caso['caso'], item=caso['item'], opciones=', '.join(caso['etiquetas']),
                     tipo_esperado=caso.get('tipo_esperado', ''), conjunto_esperado=caso.get('conjunto_esperado', ''), final_esperado=caso.get('final_esperado', ''),
                     sensible_esperado=caso.get('sensible_esperado', ''))
    try:
        r, uso = con_reintento(lambda: llamada(mensaje(caso, caso['texto'])))
        repregunta, campos = campos_repregunta(r, caso, [caso['texto']])
        filas = [dict(fila_base, **uso, **campos, turno='primera', texto=caso['texto'], motivo=r.motivo, tipo=r.tipo, sensible=r.sensible)]
        if 'respuesta_seguimiento' not in caso:
            return filas
        # Sin invitación propia (el modelo no pidió repregunta) se usa la base del tipo esperado, y se informa.
        respaldo = repregunta is None
        invitacion = repregunta or bases_de(caso)[caso['tipo_esperado']]
        s, uso = con_reintento(lambda: llamada(mensaje(caso, caso['respuesta_seguimiento'], caso['texto'], invitacion)))
        final, sensible, estado = estado_final(r, s)
        # La repregunta del seguimiento no se muestra: es la pista que se guarda para cuando edite el ítem.
        _, campos = campos_repregunta(s, caso, [caso['texto'], caso['respuesta_seguimiento']], seguimiento=True)
        filas.append(dict(fila_base, **uso, **campos, turno='seguimiento', texto=caso['respuesta_seguimiento'], motivo=s.motivo, tipo=s.tipo,
                          sensible=s.sensible, invitacion=invitacion, invitacion_respaldo='sí' if respaldo else '', tipo_final=final,
                          sensible_final=sensible, estado=estado))
        return filas
    except Exception as error:  # noqa: BLE001
        return [dict(fila_base, turno='primera', texto=caso['texto'], error=repr(error)[:300])]


CAMPOS = ['corrida', 'numero', 'caso', 'item', 'turno', 'texto', 'opciones', 'tipo_esperado', 'conjunto_esperado', 'final_esperado', 'sensible_esperado', 'motivo', 'tipo',
          'sensible', 'repregunta_llm', 'repregunta', 'origen', 'filtro', 'apertura', 'ignorada', 'invitacion', 'invitacion_respaldo', 'tipo_final',
          'sensible_final', 'estado', 'modelo', 'razonamiento', 'temperatura', 'latencia_ms', 'bytes_http', 'tokens_entrada', 'tokens_razonamiento', 'tokens_salida', 'archivos', 'error']


def guardar(filas, nivel, temperatura, etiqueta):
    filas.sort(key=lambda f: (f['corrida'], f['numero'], f['turno']))
    sufijo = f'_{etiqueta}' if etiqueta else ''
    destino = CARPETA / f'{datetime.now():%Y-%m-%d_%H%M}_{VERSION}_t{temperatura:g}_r{nivel}{sufijo}.csv'
    with destino.open('w', newline='', encoding='utf-8-sig') as archivo:
        escritor = csv.DictWriter(archivo, fieldnames=CAMPOS)
        escritor.writeheader()
        escritor.writerows(filas)
    return destino


def agregar_resumen(destino, modelo, nivel, temperatura, medidas):
    linea = (f"| {datetime.now():%Y-%m-%d %H:%M} | {VERSION} | {modelo} · {nivel} | {temperatura:g} | {medidas['corridas']} | "
             f"{medidas['aciertos']}/{medidas['total']} | — | {medidas['errores']} | {destino.name} |")
    with (CARPETA / 'resumen.md').open('a', encoding='utf-8') as archivo:
        archivo.write(linea + '\n')
    return linea


# --- Informe (se arma solo desde el CSV) -----------------------------------------------------

def celda(valor):
    return str(valor or '').replace('|', '\\|').replace('\n', ' ')


def leer_csv(ruta):
    with Path(ruta).open(encoding='utf-8-sig', newline='') as archivo:
        filas = list(csv.DictReader(archivo))
    casos = {}
    for fila in filas:
        casos.setdefault(int(fila['numero']), {}).setdefault(int(fila['corrida']), {})[fila['turno']] = fila
    return filas, dict(sorted(casos.items()))


def sensible_de(por_caso):
    return any(f['sensible'] == 'True' for f in por_caso.values())


def acierta(por_caso):
    primera, seguimiento = por_caso['primera'], por_caso.get('seguimiento')
    if primera['error']:
        return False
    sensible = sensible_de(por_caso)
    if primera['sensible_esperado'] == 'True':
        return sensible
    if sensible:
        return False
    if primera['final_esperado'] and not (seguimiento and seguimiento['tipo_final'] == primera['final_esperado']):
        return False
    if primera['conjunto_esperado'] and not (seguimiento and seguimiento['tipo'] == primera['conjunto_esperado']):
        return False
    return primera['tipo'] == primera['tipo_esperado']


def esperado_de(primera):
    if primera['sensible_esperado'] == 'True':
        return '`sensible: true`'
    salida = primera['tipo_esperado']
    if primera['conjunto_esperado']:
        salida += f" → conjunto {primera['conjunto_esperado']}"
    if primera['final_esperado']:
        salida += f" → final {primera['final_esperado']}"
    return salida + (' · `sensible: false`' if primera['sensible_esperado'] == 'False' else '')


def obtenido_de(por_caso):
    primera, seguimiento = por_caso['primera'], por_caso.get('seguimiento')
    if primera['error']:
        return 'error'
    salida = primera['tipo'] + (f" → conjunto {seguimiento['tipo']} → final {seguimiento['tipo_final']}" if seguimiento else '')
    return salida + (' · sensible' if sensible_de(por_caso) else '')


def filtro_de_fila(fila):
    if fila['origen'] == 'base_sin_redactar':
        return 'no redactó (se usa la base)'
    if fila['filtro']:
        return f"no: `{fila['filtro']}` (se usa la base)"
    if not fila['repregunta_llm'] or not fila['repregunta']:
        return '—'
    return 'sí, se agregó «¿»' if fila['apertura'] else 'sí'


def repregunta_mostrada(fila):
    """La del modelo; si pasó con el «¿» agregado, ya con él."""
    return celda(fila['repregunta'] if fila['origen'] == 'llm' else fila['repregunta_llm'] or fila['repregunta']) or '—'


def seccion_repaso():
    """El filtro actual sobre las repreguntas de B guardadas en v7 y v7.2 (no gasta llamadas)."""
    resumen, rechazadas = [], []
    for corrida, registro, archivo, casos_json in PREVIOS:
        with (AQUI / 'resultados' / registro / archivo).open(encoding='utf-8-sig', newline='') as entrada:
            filas = [f for f in csv.DictReader(entrada) if f.get('metodo', 'B') == 'B']
        primeras = {f['numero']: f['texto'] for f in filas if f['turno'] == 'primera'}
        ecos = {str(c['numero']): c.get('ecos', {}) for c in json.loads((AQUI / 'casos' / casos_json).read_text(encoding='utf-8'))['casos']} if casos_json else {}
        guardadas = [f for f in filas if f['repregunta_llm']]
        antes = sum(1 for f in guardadas if f['origen'] == 'base_por_filtro')
        rechazadas_aqui = []
        for f in guardadas:
            etiquetas = f['opciones'].split(', ') if f['opciones'] else []
            permitidas = palabras_permitidas([primeras[f['numero']], f['texto']], etiquetas, ecos.get(f['numero'], {}))
            _, reglas = filtrar(f['repregunta_llm'], f['tipo'], f['item'], etiquetas, TARJETAS[f['item']]['filtrar_etiqueta'], permitidas)
            if reglas:
                rechazadas_aqui.append((corrida, f, reglas))
        resumen.append(f'- **{corrida}:** de {len(guardadas)} repreguntas guardadas pasan {len(guardadas) - len(rechazadas_aqui)} y se rechazan {len(rechazadas_aqui)} (en su corrida, el filtro rechazó {antes}).')
        rechazadas += rechazadas_aqui
    lineas = ['## 3. Filtro nuevo aplicado a v7 y v7.2, sin API', '', *resumen]
    if rechazadas:
        lineas += ['', '| Corrida | # | Turno | Repregunta | Regla |', '|---|---|---|---|---|']
        lineas += [f"| {corrida} | {f['numero']} | {f['turno']} | {celda(f['repregunta_llm'])} | `{' '.join(reglas)}` |" for corrida, f, reglas in rechazadas]
    return lineas


def escribir_informe(ruta_csv):
    filas, casos = leer_csv(ruta_csv)
    primera = filas[0]
    corridas = [por_caso for por_corrida in casos.values() for por_caso in por_corrida.values()]
    medidas = dict(aciertos=sum(acierta(c) for c in corridas), total=len(corridas), errores=sum(bool(c['primera']['error']) for c in corridas),
                   corridas=len({f['corrida'] for f in filas}))
    llamadas = sum(1 for f in filas if not f['error'])
    con_bytes = [f for f in filas if f['bytes_http']]
    iguales = sum(f['bytes_http'] == 'igual' for f in con_bytes)
    lineas = [f'# {REGISTRO} con tarjetas (v7.2c, método B)', '',
              f"`{primera['modelo']}` · {primera['razonamiento']}, temperatura {primera['temperatura']}, {medidas['corridas']} corridas de cada caso, {llamadas} llamadas con respuesta, "
              f"{medidas['errores']} con error. Bytes HTTP iguales al texto del SDK en {iguales} de {len(con_bytes)} respuestas. CSV: [{Path(ruta_csv).name}]({Path(ruta_csv).name}).", '',
              '## 1. Archivos', '', '| Ruta | `git hash-object` |', '|---|---|',
              *[f'| `{ruta}` | `{valor}` |' for ruta, valor in json.loads(primera['archivos']).items()], '',
              '## 2. Casos', '', '| # | Ítem · opción | Texto | Esperado | Corrida | Obtenido | ¿Coincide? | Repregunta | ¿Pasó el filtro? | `motivo` |',
              '|---|---|---|---|---|---|---|---|---|---|']
    for numero, por_corrida in casos.items():
        for corrida, por_caso in sorted(por_corrida.items()):
            f = por_caso['primera']
            lineas.append(f"| {numero} | {f['item'].removeprefix('b1-3-')} · {celda(f['opciones']) or '—'} | {celda(f['texto'])} | {esperado_de(f)} | {corrida} | {obtenido_de(por_caso)} | "
                          f"{'sí' if acierta(por_caso) else '**no**'} | {repregunta_mostrada(f)} | {filtro_de_fila(f)} | {celda(f['motivo'])} |")
    lineas += ['', '## 3. Pistas de los seguimientos', '', '| # | Corrida | Invitación que vio | Respondió | `tipo` del conjunto | `tipo` final | Pista guardada | ¿Pasó el filtro? |', '|---|---|---|---|---|---|---|---|']
    for numero, por_corrida in casos.items():
        for corrida, por_caso in sorted(por_corrida.items()):
            s = por_caso.get('seguimiento')
            if s:
                invitacion = celda(s['invitacion']) + (' *(respaldo)*' if s['invitacion_respaldo'] else '')
                lineas.append(f"| {numero} | {corrida} | {invitacion} | {celda(s['texto'])} | {s['tipo']} | {s['tipo_final']} | {celda(s['repregunta']) or '— (ninguna)'} | {filtro_de_fila(s)} |")
    lineas += ['', '## 4. Notas', '', '_Pendiente: notas._', '']
    INFORME.write_text('\n'.join(lineas), encoding='utf-8')
    return medidas


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser()
    parser.add_argument('--modelo', default=parametros.MODELO_LLM_REGISTRO)
    parser.add_argument('--razonamiento', default=parametros.NIVEL_RAZONAMIENTO_REGISTRO, choices=('minimal', 'low', 'medium', 'high'))
    parser.add_argument('--corridas', type=int, default=2)
    parser.add_argument('--hilos', type=int, default=8)
    parser.add_argument('--etiqueta', default='')
    parser.add_argument('--informe', help='rehace el informe desde este CSV, sin llamar al modelo')
    parser.add_argument('--mostrar', type=int, metavar='NUMERO', help='imprime el prompt y el mensaje, sin llamar')
    parser.add_argument('--revisar', action='store_true', help='chequeo de solapamiento y filtro sobre v7 y v7.2, sin llamar')
    args = parser.parse_args()

    if args.informe:
        print(escribir_informe(args.informe))
        return
    casos = cargar_casos()
    for caso in casos:
        bases_de(caso)
    if args.mostrar:
        caso = next(c for c in casos if c['numero'] == args.mostrar)
        print(PROMPT, '\n----\n', mensaje(caso, caso['texto']), sep='')
        return
    hallados = solapamientos(casos)
    if hallados:
        sys.exit('Casos que se solapan con su tarjeta:\n' + '\n'.join(f'#{n}: «{texto}» contiene «{frase}»' for n, texto, frase in hallados))
    print(f'Solapamiento: ninguno en {len(casos)} casos')
    print('\n'.join(seccion_repaso()))
    if args.revisar:
        return

    clave, _ = base.entorno()
    if not clave:
        sys.exit('Falta GEMINI_API_KEY (en el entorno o en el .env del backend)')
    cliente = cliente_gemini(clave)
    razonamiento = base.config_razonamiento(args.modelo, args.razonamiento)
    nivel = base.nombre_razonamiento(razonamiento)
    temperatura = parametros.TEMPERATURA_REGISTRO
    comun = dict(modelo=args.modelo, razonamiento=nivel, temperatura=temperatura, archivos=json.dumps(hashes()))
    llamada = lambda contenido: llamar(cliente, args.modelo, razonamiento, contenido, temperatura)  # noqa: E731
    tareas = [(caso, corrida) for corrida in range(1, args.corridas + 1) for caso in casos]
    print(f'{len(casos)} casos × {args.corridas} corridas (método B)')
    with ThreadPoolExecutor(max_workers=args.hilos) as pool:
        filas = [f for grupo in pool.map(lambda t: ejecutar(llamada, t[0], comun, t[1]), tareas) for f in grupo]
    destino = guardar(filas, nivel, temperatura, args.etiqueta)
    medidas = escribir_informe(destino)
    print(destino.name)
    print(agregar_resumen(destino, args.modelo, nivel, temperatura, medidas))


if __name__ == '__main__':
    main()
