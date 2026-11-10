"""Piloto Claude (`piloto-claude-1`): `gemini-3.5-flash-lite` low frente a `claude-haiku-5-5` con esfuerzo low.

No es pytest y no toca el backend. Mismo prompt (`prompts/v7.md`), mismas tarjetas (`tarjetas_*.py`), mismo mensaje,
esquema, filtro y respaldo a la base que `evaluar_tarjetas.py`, de donde se reutilizan; solo cambia el cliente del modelo,
detrás de `Brazo.llamar(sistema, mensaje)`. Los casos salen de `casos/piloto-claude-1.json` (manifiesto), que remite a
los casos ya escritos de cada corrida v7.x.

Con `--piloto 2` corre piloto-claude-2: solo `haiku-low`, con `prompts/v7-haiku.md`, 3 repeticiones, el manifiesto
`casos/piloto-claude-2.json` y las reglas de respaldo que hará el backend (base fija en b5-1, formas cerradas en b5-3).

Uso, desde ov_backend (agrega `--piloto 2` para la segunda ronda):
    uv run python tests/llm/piloto_claude.py --revisar      # manifiesto y solapamiento, sin llamar
    uv run python tests/llm/piloto_claude.py --humo         # un caso `propio` y uno `general` por brazo
    uv run python tests/llm/piloto_claude.py                # los dos brazos, 2 repeticiones por caso; CSV e informe
    uv run python tests/llm/piloto_claude.py --informe      # rehace informe, tabla ciega y clave desde los CSV, sin llamar
"""

import argparse
import csv
import json
import os
import random
import re
import statistics
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from dotenv import dotenv_values
from pydantic import ValidationError

import evaluar_tarjetas as et  # agrega el backend a sys.path y trae el prompt, las tarjetas y el filtro
from evaluar_tarjetas import base

import anthropic  # noqa: E402  (solo dependencia de desarrollo: tests/llm)
from app.core import parametros  # noqa: E402
from app.models.base import sin_tildes  # noqa: E402

VERSION = 'piloto-claude-1'
AQUI = et.AQUI
CARPETA = AQUI / 'resultados' / 'piloto-claude'
INFORME = CARPETA / f'{VERSION}.md'
CIEGA = CARPETA / f'{VERSION}-ciega.md'
CLAVE = CARPETA / f'{VERSION}-clave.csv'
MANIFIESTO = AQUI / 'casos' / f'{VERSION}.json'
REPETICIONES = 2
TOPE_SALIDA = 8192  # tokens de salida (razonamiento incluido), igual en los dos brazos
TIEMPO = 120  # segundos por llamada, igual en los dos brazos (el `httpx` de `cliente_gemini` ya usa 120)
RUTA_PROMPT, PROMPT = et.RUTA_PROMPT, et.PROMPT
PREFIJO_CSV = ''  # piloto-claude-1 guarda `gemini-low.csv` y `haiku-low.csv`
RESPALDO = False  # piloto-claude-2: base fija (b5-1) y formas cerradas (b5-3) después del filtro, como hará el backend
NOMBRES_BRAZOS = ('gemini-low', 'haiku-low')
ARCHIVOS = (RUTA_PROMPT, *sorted(AQUI.glob('tarjetas_*.py')), Path(__file__).resolve(), Path(et.__file__).resolve(), MANIFIESTO)


def configurar(piloto):
    """Fija la versión: 1 (los dos brazos, `v7.md`) o 2 (solo `haiku-low`, `v7-haiku.md`, 3 repeticiones y reglas de respaldo)."""
    global VERSION, INFORME, CIEGA, CLAVE, MANIFIESTO, REPETICIONES, RUTA_PROMPT, PROMPT, PREFIJO_CSV, RESPALDO, NOMBRES_BRAZOS, ARCHIVOS
    if piloto == 2:
        VERSION, REPETICIONES, RESPALDO, NOMBRES_BRAZOS = 'piloto-claude-2', 3, True, ('haiku-low',)
        RUTA_PROMPT = AQUI / 'prompts' / 'v7-haiku.md'
        PROMPT = RUTA_PROMPT.read_text(encoding='utf-8')
        PREFIJO_CSV = f'{VERSION}-'
    INFORME, CIEGA, CLAVE = CARPETA / f'{VERSION}.md', CARPETA / f'{VERSION}-ciega.md', CARPETA / f'{VERSION}-clave.csv'
    MANIFIESTO = AQUI / 'casos' / f'{VERSION}.json'
    ARCHIVOS = (RUTA_PROMPT, *sorted(AQUI.glob('tarjetas_*.py')), Path(__file__).resolve(), Path(et.__file__).resolve(), MANIFIESTO)
# Paradas que son un rechazo del proveedor: cuentan como fallo del caso y no se reintentan.
RECHAZOS = {'refusal', 'SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'RECITATION', 'IMAGE_SAFETY'}
# Precios de lista por millón de tokens (USD), consultados el 2026-11-10; el razonamiento se cobra como salida.
PRECIOS = {'gemini-low': (0.30, 2.50, 'https://aistudio.google.com/docs/pricing (Standard, paid tier)'),
           'haiku-low': (0.10, 0.50, 'https://platform.claude.com/docs/en/about-claude/pricing (prompts de hasta 100 000 tokens)')}
DOCUMENTACION = (
    ('https://platform.claude.com/docs/en/build-with-claude/effort', '`output_config.effort`; en Haiku 5.5 el defecto es `medium`, así que `low` va explícito'),
    ('https://platform.claude.com/docs/en/build-with-claude/structured-outputs', '`output_config.format` con `json_schema`; los objetos exigen `additionalProperties: false`; ante `refusal` o `max_tokens` la salida puede no seguir el esquema'),
    ('https://platform.claude.com/docs/en/api/messages/create', '`stop_reason` (`end_turn`, `max_tokens`, `refusal`…), `stop_details.category` y `usage.output_tokens_details.thinking_tokens`'),
    ('https://platform.claude.com/docs/en/about-claude/pricing', 'Haiku 5.5: US$ 0,10 / 0,50 por millón (prompts de hasta 100 000 tokens)'),
    ('Guía de migración a Claude Haiku 5.5 (skill `claude-api` de Claude Code, 2026-11-03)', 'razonamiento adaptativo activo por defecto, cuenta en `max_tokens`; `temperature` distinta de 1 da 400 con la API 2023-06-01 y cualquier valor da 400 con la 2026-10-21; sin respaldo del servidor ante rechazos'),
    ('https://aistudio.google.com/docs/pricing', 'Gemini 3.5 Flash-Lite: US$ 0,30 / 2,50 por millón; la salida incluye el razonamiento'),
)


# Lo que no pudo quedar idéntico entre brazos (va tal cual en §5 del informe).
PARIDAD = (
    '- **Temperatura.** Gemini va con 1.0 fijada, como hoy (`TEMPERATURA_REGISTRO`). Haiku 5.5 no admite fijarla: no se envía y queda la de defecto, que es 1.',
    '- **Razonamiento.** Gemini, `thinking_level` low; Haiku, `output_config.effort` low con el razonamiento adaptativo de defecto (el modelo decide si piensa). No son la misma escala.',
    '- **Esquema.** El mismo de `Resultado` en los dos; Haiku lo recibe con `additionalProperties: false` agregado, porque la salida estructurada lo exige. Gemini, con `response_json_schema`, como en sus corridas.',
    '- **Tope de salida y tiempo.** Los dos con 8192 tokens de salida (razonamiento incluido) y 120 s por llamada, sin reintentos. En Gemini el tope de 8192 es nuevo (sus corridas no lo fijaban); ninguna respuesta se acercó a él.',
    '- **Tokens de entrada.** El mismo texto cuenta más tokens en Haiku (otro tokenizador): no es un mensaje más largo.',
    '- **Bytes HTTP.** La comparación de bytes con el texto del SDK solo existe en el cliente de Gemini; en Haiku la columna va vacía.',
    '- **Concurrencia.** Las llamadas de los dos brazos se intercalaron en un mismo grupo de 8 en paralelo, así que la latencia es la de una carga compartida.',
)


class FalloModelo(Exception):
    """Un rechazo o una respuesta sin el JSON del esquema: cuenta como fallo del caso y no se reintenta."""

    def __init__(self, tipo, datos):
        super().__init__(tipo)
        self.tipo, self.datos = tipo, datos


# --- Brazos: una implementación por proveedor ------------------------------------------------

class Gemini:
    nombre = 'gemini-low'
    modelo = parametros.MODELO_LLM_REGISTRO

    def __init__(self):
        clave, _ = base.entorno()
        if not clave:
            sys.exit('Falta GEMINI_API_KEY (en el entorno o en el .env del backend)')
        self.cliente = et.cliente_gemini(clave)
        self.razonamiento = base.config_razonamiento(self.modelo, 'low')
        self.temperatura = parametros.TEMPERATURA_REGISTRO
        self.parametros = (f'razonamiento `{base.nombre_razonamiento(self.razonamiento)}` (`thinking_level`), temperatura {self.temperatura:g}, '
                           f'`max_output_tokens` {TOPE_SALIDA}, `response_json_schema`, tiempo {TIEMPO} s, sin reintentos')

    def llamar(self, sistema, mensaje):
        tipos = base.adaptador.types
        respuesta = self.cliente.models.generate_content(
            model=self.modelo, contents=mensaje,
            config=tipos.GenerateContentConfig(
                system_instruction=sistema, temperature=self.temperatura, candidate_count=1, max_output_tokens=TOPE_SALIDA,
                response_mime_type='application/json', response_json_schema=et.Resultado.model_json_schema(),
                thinking_config=self.razonamiento, automatic_function_calling=tipos.AutomaticFunctionCallingConfig(disable=True)))
        candidato = respuesta.candidates[0] if respuesta.candidates else None
        partes = (candidato.content.parts if candidato and candidato.content else None) or []
        texto = ''.join(p.text for p in partes if p.text and not p.thought)
        if candidato and candidato.finish_reason:
            parada = getattr(candidato.finish_reason, 'name', str(candidato.finish_reason))
        else:
            bloqueo = getattr(respuesta.prompt_feedback, 'block_reason', None)
            parada = getattr(bloqueo, 'name', str(bloqueo or ''))
        uso = respuesta.usage_metadata
        return dict(texto=texto, parada=parada, detalle_parada='', bytes_http=et.revisar_bytes(texto), bloques_texto=sum(1 for p in partes if p.text and not p.thought),
                    tokens_entrada=getattr(uso, 'prompt_token_count', None), tokens_razonamiento=getattr(uso, 'thoughts_token_count', None),
                    tokens_salida=getattr(uso, 'candidates_token_count', None))


def esquema_claude():
    """El esquema de `Resultado`, el mismo que recibe Gemini, con `additionalProperties: false` (lo exige la salida estructurada)."""
    return {**et.Resultado.model_json_schema(), 'additionalProperties': False}


def clave_anthropic():
    """`ANTHROPIC_API_KEY` del entorno o, si falta, del `.env` del backend (nunca se imprime)."""
    archivo = dotenv_values(base.RUTA_ENV) if base.RUTA_ENV.exists() else {}
    return (os.environ.get('ANTHROPIC_API_KEY') or archivo.get('ANTHROPIC_API_KEY') or '').strip()


class Claude:
    nombre = 'haiku-low'
    modelo = 'claude-haiku-5-5'
    esfuerzo = 'low'

    def __init__(self):
        clave = clave_anthropic()
        if not clave:
            sys.exit('Falta ANTHROPIC_API_KEY (en el entorno o en el .env del backend)')
        self.cliente = anthropic.Anthropic(api_key=clave, timeout=TIEMPO, max_retries=0)
        self.esquema = esquema_claude()
        self.parametros = (f'`output_config.effort` `{self.esfuerzo}`, razonamiento adaptativo por defecto (sin `thinking`), sin `temperature` '
                           f'(queda la de defecto, 1), `max_tokens` {TOPE_SALIDA}, `output_config.format` `json_schema`, tiempo {TIEMPO} s, sin reintentos '
                           f'(`max_retries=0`), SDK `anthropic` {anthropic.__version__}')

    def llamar(self, sistema, mensaje):
        respuesta = self.cliente.messages.create(
            model=self.modelo, max_tokens=TOPE_SALIDA, system=sistema, messages=[{'role': 'user', 'content': mensaje}],
            output_config={'effort': self.esfuerzo, 'format': {'type': 'json_schema', 'schema': self.esquema}})
        textos = [b.text for b in respuesta.content if b.type == 'text']
        uso = respuesta.usage
        detalles = getattr(uso, 'output_tokens_details', None)
        pensar = getattr(detalles, 'thinking_tokens', None) if detalles else None
        detalle = respuesta.stop_details
        return dict(texto=''.join(textos), parada=respuesta.stop_reason or '', bloques_texto=len(textos), bytes_http='',
                    detalle_parada=f'{detalle.category or ""} {detalle.explanation or ""}'.strip() if detalle else '',
                    tokens_entrada=uso.input_tokens, tokens_razonamiento=pensar, tokens_salida=uso.output_tokens - (pensar or 0))


BRAZOS = {'gemini-low': Gemini, 'haiku-low': Claude}


def evaluar(brazo, contenido):
    """(Resultado, datos de la llamada). Un rechazo o un JSON que no valida levantan `FalloModelo`."""
    inicio = time.perf_counter()
    datos = brazo.llamar(PROMPT, contenido)
    datos['latencia_ms'] = round((time.perf_counter() - inicio) * 1000)
    if datos['parada'] in RECHAZOS:
        raise FalloModelo('rechazo', datos)
    try:
        return et.Resultado.model_validate_json(datos['texto']), datos
    except ValidationError:
        raise FalloModelo('json_invalido', datos) from None


# --- Casos -----------------------------------------------------------------------------------

_origenes = {}


def casos_de_archivo(nombre):
    """{número: caso} de un archivo de casos v7.x, con `de` heredado y el texto de `casos/<registro>.json` si el caso lo toma de ahí."""
    if nombre in _origenes:
        return _origenes[nombre]
    registro = nombre.split('-tarjetas')[0]
    ruta_registro = AQUI / 'casos' / f'{registro}.json'
    existentes = {c['id']: c for c in json.loads(ruta_registro.read_text(encoding='utf-8'))['casos']} if ruta_registro.exists() else {}
    salida = {}
    for caso in json.loads((AQUI / 'casos' / nombre).read_text(encoding='utf-8'))['casos']:
        if 'de' in caso:  # sin `corrida`, el caso viene de la corrida base de la serie (v7.5b → v7.5)
            corrida = caso.get('corrida') or re.sub(r'[a-z]+$', '', nombre.split('-tarjetas-')[1].removesuffix('.json'))
            caso = {**casos_de_archivo(f'{registro}-tarjetas-{corrida}.json')[caso['de']], **{k: v for k, v in caso.items() if k not in ('de', 'corrida')}}
        caso = dict(caso)
        if caso.get('caso', 'nuevo') != 'nuevo':
            existente = existentes[caso['caso']]
            item = next(i for i in existente['items'] if i['item'] == caso['item']) if 'items' in existente else existente
            caso.update(texto=item['texto'], opciones=item['opciones'])
        if 'numero' in caso:
            salida[caso['numero']] = caso
    _origenes[nombre] = salida
    return salida


ESPERADOS = ('tipo_esperado', 'conjunto_esperado', 'final_esperado', 'sensible_esperado')


def cargar_casos():
    """Los casos del manifiesto, con los esperados del manifiesto (los de la tarjeta final) y un número correlativo."""
    manifiesto = json.loads(MANIFIESTO.read_text(encoding='utf-8'))
    casos = []
    for numero, entrada in enumerate(manifiesto['casos'], 1):
        origen = casos_de_archivo(entrada['archivo'])[entrada['numero_origen']]
        caso = {k: v for k, v in origen.items() if k not in (*ESPERADOS, 'repeticiones', 'grupo', 'clave')}
        if 'ecos_cruce' in entrada:  # corrección del eco declarada en el manifiesto (piloto-claude-2, b5-1)
            caso['ecos_cruce'] = entrada['ecos_cruce']
        caso.update({k: entrada[k] for k in ESPERADOS if k in entrada}, numero=numero, id=entrada['id'], clave=entrada['id'],
                    grupo=entrada['grupo'], regla=entrada['regla'], archivo_origen=entrada['archivo'], numero_origen=entrada['numero_origen'])
        caso['etiquetas'] = list(base.textos_elegidos(caso['item'], caso['opciones'])) if caso['item'] in base.ITEMS else [o['texto'] for o in caso['opciones']]
        if 'ecos_cruce' in caso:
            caso['ecos_lineas'] = et.lineas_ecos(caso)
        casos.append(caso)
    return casos, manifiesto


def revisar(casos, manifiesto):
    """Se detiene si el total sale de 70 a 90, si un grupo queda vacío o si un caso se solapa con su tarjeta."""
    for caso in casos:
        et.bases_de(caso)
    grupos = {c['grupo'] for c in casos}
    faltan = [g for g in manifiesto['grupos'] if g not in grupos]
    hallados = et.solapamientos(casos)
    print(f'{len(casos)} casos; por regla: ' + ', '.join(f'{r}: {sum(c["regla"] == r for c in casos)}' for r in (1, 2, 3, 4)))
    problemas = []
    if VERSION == 'piloto-claude-1' and not 70 <= len(casos) <= 90:
        problemas.append(f'el total ({len(casos)}) sale de 70 a 90')
    if faltan:
        problemas.append(f'grupos vacíos: {faltan}')
    if hallados:
        problemas.append('casos que se solapan con su tarjeta: ' + '; '.join(f'#{n} «{t}» contiene «{f}»' for n, t, f in hallados))
    if problemas:
        sys.exit('Detenido: ' + ' · '.join(problemas))
    print('Solapamiento: ninguno. Grupos: todos con casos.')


# --- Corrida ---------------------------------------------------------------------------------

CAMPOS = ['brazo', 'id', 'archivo_origen', 'numero_origen', 'regla', *et.CAMPOS, 'parametros', 'json', 'parada', 'detalle_parada', 'falla', 'bloques_texto',
          'tras_filtro', 'respaldo', 'cruda_valida']


def forma_cerrada_valida(texto, caso, bases):
    """b5-3, tipo `general`: la BASE tal cual, «¿Qué crees que hizo que siga igual?» tal cual o (solo piezas y «Otra») una frase
    afirmativa seguida, tal cual, de la pregunta de la forma (1)."""
    if texto in (bases['general'], et.SIGA_IGUAL):
        return True
    if et.codigo_opcion(caso) == 'IGUAL' or not texto.endswith(et.PREGUNTA_ADAPTADA):
        return False
    frase = texto[:-len(et.PREGUNTA_ADAPTADA)].strip()
    return bool(frase) and '?' not in frase and '¿' not in frase


def campos_repregunta(r, caso, respuestas, seguimiento=False):
    """Los de `evaluar_tarjetas` y, en piloto-claude-2, las reglas de respaldo después del filtro (§3 de su spec).

    `repregunta` es lo que se muestra; `repregunta_llm`, la cruda del modelo; `tras_filtro`, lo que quedaba tras el filtro."""
    repregunta, campos = et.campos_repregunta(r, caso, respuestas, seguimiento)
    campos.update(tras_filtro=repregunta or '', respaldo='', cruda_valida='')
    if not RESPALDO or repregunta is None or caso['item'] not in ('b5-1-seguridad', 'b5-3-cambio'):
        return repregunta, campos
    bases = et.bases_de(caso)
    cruda = (r.repregunta or '').strip()
    if caso['item'] == 'b5-1-seguridad':
        mostrar, valida, regla = bases[r.tipo], cruda == bases[r.tipo], 'base_fija'
    elif r.tipo == 'general':
        valida = forma_cerrada_valida(cruda, caso, bases)
        mostrar, regla = (repregunta if valida and campos['origen'] == 'llm' else bases['general']), 'forma_cerrada'
    else:
        mostrar, valida, regla = bases[r.tipo], cruda == bases[r.tipo], 'forma_cerrada'
    campos.update(repregunta=mostrar, cruda_valida='sí' if valida else 'no', respaldo=regla if mostrar != repregunta else 'ninguna')
    return mostrar, campos


def fila_de_llamada(datos, r=None):
    return dict(json=datos.get('texto', ''), parada=datos.get('parada', ''), detalle_parada=datos.get('detalle_parada', ''),
                bloques_texto=datos.get('bloques_texto', ''), bytes_http=datos.get('bytes_http', ''), latencia_ms=datos.get('latencia_ms', ''),
                tokens_entrada=datos.get('tokens_entrada', ''), tokens_razonamiento=datos.get('tokens_razonamiento', ''), tokens_salida=datos.get('tokens_salida', ''),
                **(dict(motivo=r.motivo, tipo=r.tipo, sensible=r.sensible) if r else {}))


def ejecutar(brazo, caso, comun, repeticion):
    """Las filas de un caso en una repetición: la primera respuesta y, si tiene, el seguimiento con la repregunta de ese brazo."""
    fila_base = dict(comun, brazo=brazo.nombre, id=caso['id'], archivo_origen=caso['archivo_origen'], numero_origen=caso['numero_origen'], regla=caso['regla'],
                     corrida=repeticion, numero=caso['numero'], clave=caso['id'], grupo=caso['grupo'], estudiante=caso.get('estudiante', ''), caso=caso.get('caso', ''),
                     tipo_caso=caso.get('tipo_caso', ''), item=caso['item'], opciones=', '.join(caso['etiquetas']), ecos=et.texto_ecos(caso),
                     **{k: caso.get(k, '') for k in ESPERADOS})
    filas = []
    turno, texto = 'primera', caso['texto']
    try:
        r, datos = evaluar(brazo, et.mensaje(caso, caso['texto']))
        repregunta, campos = campos_repregunta(r, caso, [caso['texto']])
        filas.append(dict(fila_base, **fila_de_llamada(datos, r), **campos, turno=turno, texto=texto))
        if 'respuesta_seguimiento' not in caso:
            return filas
        turno, texto = 'seguimiento', caso['respuesta_seguimiento']
        respaldo = repregunta is None  # sin repregunta propia se usa la base del tipo esperado, como en sus corridas
        bases = et.bases_de(caso)
        invitacion = repregunta or bases.get(caso['tipo_esperado'].split(' o ')[0], bases['general'])
        s, datos = evaluar(brazo, et.mensaje(caso, texto, caso['texto'], invitacion))
        final, sensible, estado = et.estado_final(r, s)
        _, campos = campos_repregunta(s, caso, [caso['texto'], texto], seguimiento=True)
        filas.append(dict(fila_base, **fila_de_llamada(datos, s), **campos, turno=turno, texto=texto, invitacion=invitacion,
                          invitacion_respaldo='sí' if respaldo else '', tipo_final=final, sensible_final=sensible, estado=estado))
    except FalloModelo as fallo:
        filas.append(dict(fila_base, **fila_de_llamada(fallo.datos), turno=turno, texto=texto, falla=fallo.tipo, error=fallo.tipo))
    except Exception as error:  # noqa: BLE001  (un error de API queda en el CSV, sin reintento)
        filas.append(dict(fila_base, turno=turno, texto=texto, error=repr(error)[:300]))
    return filas


def guardar(nombre, filas):
    filas.sort(key=lambda f: (f['numero'], f['corrida'], f['turno']))
    destino = CARPETA / f'{PREFIJO_CSV}{nombre}.csv'
    with destino.open('w', newline='', encoding='utf-8-sig') as archivo:
        escritor = csv.DictWriter(archivo, fieldnames=CAMPOS)
        escritor.writeheader()
        escritor.writerows(filas)
    return destino


def correr(casos, nombres, repeticiones, hilos):
    CARPETA.mkdir(parents=True, exist_ok=True)
    archivos = json.dumps(hashes())
    brazos = [BRAZOS[n]() for n in nombres]
    tareas = [(b, c, r) for c in casos for r in range(1, repeticiones + 1) for b in brazos]  # intercaladas: mismas condiciones
    print(f'{len(casos)} casos × {repeticiones} repeticiones × {len(brazos)} brazos')
    comunes = {b.nombre: dict(modelo=b.modelo, razonamiento='low', temperatura=getattr(b, 'temperatura', 'defecto (1)'), parametros=b.parametros, archivos=archivos) for b in brazos}
    with ThreadPoolExecutor(max_workers=hilos) as pool:
        resultados = list(pool.map(lambda t: ejecutar(t[0], t[1], comunes[t[0].nombre], t[2]), tareas))
    por_brazo = {b.nombre: [] for b in brazos}
    for (b, _, _), filas in zip(tareas, resultados):
        por_brazo[b.nombre] += filas
    return {n: guardar(n, f) for n, f in por_brazo.items()}, {b.nombre: b.parametros for b in brazos}


def hashes():
    """{ruta relativa: `git hash-object`} de cada archivo que usa la corrida (el manifiesto incluido)."""
    import subprocess
    return {ruta.relative_to(et.RAIZ).as_posix(): subprocess.run(['git', 'hash-object', str(ruta)], capture_output=True, text=True, check=True, cwd=et.RAIZ).stdout.strip()
            for ruta in ARCHIVOS}


# --- Informe (se arma solo desde los CSV) ----------------------------------------------------

ROTAS = re.compile(r'caracteres|palabra_extrana|palabra_truncada')
NO_PERU = re.compile(r'\b(usted|ustedes|vosotros|os|vuestro|vuestra|ordenador|móvil|guay|vale\b(?! la pena)|coger|chaval|pibe|che|platicar|chamba|carro)\b', re.I)
USTED = re.compile(r'\b(usted|cuénteme|dígame|piense|recuerde|imagine|mire|marcó|escribió|dijo usted)\b', re.I)


def leer(ruta):
    with Path(ruta).open(encoding='utf-8-sig', newline='') as archivo:
        filas = list(csv.DictReader(archivo))
    casos = {}
    for f in filas:
        casos.setdefault(int(f['numero']), {}).setdefault(int(f['corrida']), {})[f['turno']] = f
    return filas, dict(sorted(casos.items()))


def acierta(por_caso):
    """Como en `evaluar_tarjetas`; un rechazo, un JSON inválido o un error cuentan como fallo, también en el seguimiento."""
    if any(f['error'] for f in por_caso.values()):
        return False
    return et.acierta(por_caso)


def bases_de_fila(f):
    """{tipo: base} de la tarjeta que vio esa fila (la del caso, con su opción marcada y sus marcadores)."""
    return et.bases_de(cargar_casos_por_id()[f['id']])


def mostrada(f):
    """La repregunta tal como la redactó el modelo (con el «¿» agregado si pasó así); vacía si no redactó."""
    if not f or not f.get('repregunta'):
        return ''
    return f['repregunta'] if f['origen'] == 'llm' else f['repregunta_llm'] or f['repregunta']


def forma_de(f):
    texto = mostrada(f).strip()
    if not texto:
        return 'ninguna'
    if f['item'] == 'b5-3-cambio':
        return et.forma_de(f, texto)[0].replace('*', '')
    tipos = [t for t, b in bases_de_fila(f).items() if b == texto]
    return f"base de `{' / '.join(tipos)}` tal cual" if tipos else 'redactada'


def p95(valores):
    orden = sorted(valores)
    return orden[max(0, -(-len(orden) * 95 // 100) - 1)] if orden else 0


def medidas(nombre, filas, casos):
    pc = [c for por_rep in casos.values() for c in por_rep.values()]
    llamadas = [f for f in filas if f['latencia_ms']]
    entrada = [int(f['tokens_entrada'] or 0) for f in llamadas]
    salida = [int(f['tokens_salida'] or 0) + int(f['tokens_razonamiento'] or 0) for f in llamadas]
    razon = [int(f['tokens_razonamiento'] or 0) for f in llamadas]
    precio_in, precio_out, _ = PRECIOS[nombre]
    costo = (sum(entrada) * precio_in + sum(salida) * precio_out) / 1e6
    grupos = {}
    for c in pc:
        grupos.setdefault(c['primera']['grupo'], []).append(acierta(c))
    primera = lambda c: c['primera']  # noqa: E731
    de_mas = [c for c in pc if primera(c)['tipo_esperado'] == 'propio' and primera(c)['tipo'] not in ('', 'propio')]
    de_menos = [c for c in pc if primera(c)['tipo_esperado'] in ('general', 'vacio', 'fuera_de_tema', 'no_sabe') and primera(c)['tipo'] == 'propio']
    inestables = [n for n, por_rep in casos.items() if len({(c['primera']['tipo'], c['primera']['sensible'], c.get('seguimiento', {}).get('tipo')) for c in por_rep.values()}) > 1]
    caidas = {}
    for f in filas:
        for regla in f['filtro'].split():
            caidas[regla.split(':')[0]] = caidas.get(regla.split(':')[0], 0) + 1
    rotas = sum(1 for f in filas if ROTAS.search(f['filtro']))
    sens = [c for c in pc if not c['primera']['error']]
    sensible_de = lambda c: any(f['sensible'] == 'True' for f in c.values())  # noqa: E731
    s_ok = sum(1 for c in sens if c['primera']['sensible_esperado'] == 'True' and sensible_de(c))
    s_total = sum(1 for c in pc if c['primera']['sensible_esperado'] == 'True')
    s_mas = sum(1 for c in sens if c['primera']['sensible_esperado'] != 'True' and sensible_de(c))
    s_menos = sum(1 for c in pc if c['primera']['sensible_esperado'] == 'True' and not sensible_de(c))
    e_total = sum(1 for c in pc if c['primera']['tipo_esperado'] == 'emocional')
    e_ok = sum(1 for c in pc if c['primera']['tipo_esperado'] == 'emocional' and c['primera']['tipo'] == 'emocional')
    e_mas = sum(1 for c in pc if c['primera']['sensible_esperado'] != 'True' and 'emocional' not in c['primera']['tipo_esperado'] and c['primera']['tipo'] == 'emocional')
    return dict(aciertos=sum(acierta(c) for c in pc), total=len(pc), grupos={g: (sum(v), len(v)) for g, v in grupos.items()},
                de_mas=len(de_mas), de_menos=len(de_menos), inestables=inestables, caidas=caidas, rotas=rotas,
                sensible=(s_ok, s_total, s_mas, s_menos), emocional=(e_ok, e_total, e_mas, e_total - e_ok),
                rechazos=sum(f['falla'] == 'rechazo' for f in filas), json_invalidos=sum(f['falla'] == 'json_invalido' for f in filas),
                errores=sum(bool(f['error']) and not f['falla'] for f in filas), llamadas=len(llamadas),
                latencia=(statistics.median(int(f['latencia_ms']) for f in llamadas) if llamadas else 0, p95([int(f['latencia_ms']) for f in llamadas])),
                tokens=(statistics.mean(entrada) if entrada else 0, statistics.mean(salida) if salida else 0, statistics.mean(razon) if razon else 0),
                costo=(costo, costo / len(llamadas) if llamadas else 0))


def obtenido(c):
    if c['primera']['error']:
        return c['primera']['falla'] or 'error'
    salida = c['primera']['tipo'] + (' · sensible' if c['primera']['sensible'] == 'True' else '')
    s = c.get('seguimiento')
    if s:
        salida += f" → {s['falla'] or 'error'}" if s['error'] else f" → conjunto {s['tipo']} → final {s['tipo_final']}" + (' · sensible' if s['sensible'] == 'True' else '')
    return salida


def esperado(f):
    return et.esperado_de(f)


def celda(v):
    return et.celda(v)


def escribir_informe(rutas, parametros_brazos=None):
    datos = {n: leer(r) for n, r in rutas.items()}
    parametros_brazos = parametros_brazos or {n: next((f['parametros'] for f in datos[n][0] if f.get('parametros')), '') for n in datos}
    (_, cg), (_, ch) = datos['gemini-low'], datos['haiku-low']
    filas_todas = [f for filas, _ in datos.values() for f in filas]
    archivos = json.loads(next(f['archivos'] for f in filas_todas if f['archivos']))
    m = {n: medidas(n, *datos[n]) for n in datos}
    nombres = list(datos)
    grupos = list(dict.fromkeys(c['primera']['grupo'] for por_rep in cg.values() for c in por_rep.values()))
    pct = lambda a, b: f'{a}/{b} ({100 * a / b:.0f} %)' if b else '—'  # noqa: E731
    L = [f'# Piloto Claude: Gemini 3.5 Flash-Lite low frente a Claude Haiku 5.5 low ({VERSION})', '',
         f"{len(cg)} casos × {REPETICIONES} repeticiones por brazo. CSV: [gemini-low.csv](gemini-low.csv), [haiku-low.csv](haiku-low.csv). "
         f"Tabla ciega: [{CIEGA.name}]({CIEGA.name}).", '',
         '## 1. Archivos', '', '| Ruta | `git hash-object` |', '|---|---|', *[f'| `{r}` | `{h}` |' for r, h in archivos.items()], '',
         '| Brazo | Modelo | Parámetros |', '|---|---|---|',
         *[f"| `{n}` | `{datos[n][0][0]['modelo']}` | {parametros_brazos.get(n) or '—'} |" for n in nombres], '',
         'Documentación consultada el 2026-11-10:', '', *[f'- {u}: {d}.' for u, d in DOCUMENTACION], '',
         '## 2. Resumen', '', '| | ' + ' | '.join(f'`{n}`' for n in nombres) + ' |', '|---|' + '---|' * len(nombres),
         '| Acierto de clasificación | ' + ' | '.join(pct(m[n]['aciertos'], m[n]['total']) for n in nombres) + ' |',
         *[f'| · {g} | ' + ' | '.join(pct(*m[n]['grupos'].get(g, (0, 0))) for n in nombres) + ' |' for g in grupos],
         '| Invitaciones de más (`propio` → otro tipo) | ' + ' | '.join(str(m[n]['de_mas']) for n in nombres) + ' |',
         '| Pases de menos (otro tipo → `propio`) | ' + ' | '.join(str(m[n]['de_menos']) for n in nombres) + ' |',
         '| Casos inestables (`tipo` o `sensible` distintos entre repeticiones) | ' + ' | '.join(f"{len(m[n]['inestables'])} ({', '.join(cg[i][1]['primera']['id'] for i in m[n]['inestables']) or '—'})" for n in nombres) + ' |',
         '| Repreguntas que no pasaron el filtro, por regla | ' + ' | '.join(', '.join(f'{r}: {k}' for r, k in sorted(m[n]['caidas'].items())) or '0' for n in nombres) + ' |',
         '| · de ellas, por salida rota (caracteres, palabra extraña o truncada) | ' + ' | '.join(str(m[n]['rotas']) for n in nombres) + ' |',
         '| `sensible`: aciertos / de más / de menos | ' + ' | '.join('{}/{} · {} · {}'.format(*m[n]['sensible']) for n in nombres) + ' |',
         '| `emocional`: aciertos / de más / de menos | ' + ' | '.join('{}/{} · {} · {}'.format(m[n]['emocional'][0], m[n]['emocional'][1], m[n]['emocional'][2], m[n]['emocional'][3]) for n in nombres) + ' |',
         '| Rechazos / JSON inválidos / otros errores | ' + ' | '.join(f"{m[n]['rechazos']} / {m[n]['json_invalidos']} / {m[n]['errores']}" for n in nombres) + ' |',
         '| Llamadas con respuesta | ' + ' | '.join(str(m[n]['llamadas']) for n in nombres) + ' |',
         '| Latencia mediana / p95 (ms) | ' + ' | '.join('{:.0f} / {}'.format(*m[n]['latencia']) for n in nombres) + ' |',
         '| Tokens por llamada: entrada / salida (con razonamiento) / razonamiento | ' + ' | '.join('{:.0f} / {:.0f} / {:.0f}'.format(*m[n]['tokens']) for n in nombres) + ' |',
         '| Costo total / por llamada (USD, precio de lista) | ' + ' | '.join('{:.4f} / {:.6f}'.format(*m[n]['costo']) for n in nombres) + ' |', '',
         'Acierto: cada caso por repetición; un rechazo, un JSON inválido o un error cuentan como fallo, también en el seguimiento. Precios: '
         + '; '.join(f'`{n}` US$ {PRECIOS[n][0]:g} / {PRECIOS[n][1]:g} por millón ({PRECIOS[n][2]}, consultado el 2026-11-10)' for n in nombres)
         + '; el razonamiento se cobra como salida. p95 por rango más cercano, con 8 llamadas en paralelo e intercaladas entre brazos.', '']
    # Desacuerdos
    L += ['## 3. Desacuerdos', '', 'Casos y repeticiones en que los brazos difieren en `tipo`, en `sensible` o en la forma de la repregunta (primera respuesta y, si hay, seguimiento).', '',
          '| Caso | Rep. | Ítem | Texto | Esperado | `gemini-low` | `haiku-low` | Forma G | Forma H | `motivo` G | `motivo` H |', '|---|---|---|---|---|---|---|---|---|---|---|']
    for n in cg:
        for rep in sorted(cg[n]):
            g, h = cg[n][rep], ch.get(n, {}).get(rep)
            if not h:
                continue
            for turno in ('primera', 'seguimiento'):
                fg, fh = g.get(turno), h.get(turno)
                if not fg and not fh:
                    continue
                fg, fh = fg or {}, fh or {}
                distintos = (fg.get('tipo'), fg.get('sensible'), fg.get('falla')) != (fh.get('tipo'), fh.get('sensible'), fh.get('falla')) or forma_de(fg) != forma_de(fh)
                if distintos:
                    base_fila = fg or fh
                    L.append(f"| {base_fila['id']}{' (seg.)' if turno == 'seguimiento' else ''} | {rep} | {base_fila['item']} | {celda(base_fila['texto'])} | {esperado(g['primera'])} | "
                             f"{celda(fg.get('falla') or fg.get('tipo'))}{' · sensible' if fg.get('sensible') == 'True' else ''} | {celda(fh.get('falla') or fh.get('tipo'))}{' · sensible' if fh.get('sensible') == 'True' else ''} | "
                             f"{forma_de(fg) if fg else '—'} | {forma_de(fh) if fh else '—'} | {celda(fg.get('motivo'))} | {celda(fh.get('motivo'))} |")
    # Tabla de casos completa (para leer el detalle)
    L += ['', '### Todos los casos', '', '| Caso | Grupo | Regla | Ítem | Texto | Esperado | `gemini-low` (rep. 1 · 2) | `haiku-low` (rep. 1 · 2) |', '|---|---|---|---|---|---|---|---|']
    for n in cg:
        p = cg[n][1]['primera']
        L.append(f"| {p['id']} | {p['grupo']} | {p['regla']} | {p['item']} | {celda(p['texto'])}{' → ' + celda(cg[n][1]['seguimiento']['texto']) if 'seguimiento' in cg[n][1] else ''} | {esperado(p)} | "
                 + ' · '.join(('' if acierta(c) else '**') + celda(obtenido(c)) + ('' if acierta(c) else '**') for _, c in sorted(cg[n].items())) + ' | '
                 + ' · '.join(('' if acierta(c) else '**') + celda(obtenido(c)) + ('' if acierta(c) else '**') for _, c in sorted(ch.get(n, {}).items())) + ' |')
    L += ['', '## 4. Tabla ciega', '', f'En [{CIEGA.name}]({CIEGA.name}).', '', '## 5. Atención especial', '']
    # Salidas rotas completas
    L += ['### Salidas rotas', '', 'Toda respuesta cuyo texto cayó por caracteres, palabra extraña o truncada, cuyos bytes HTTP no coinciden con el texto del SDK, o que no trajo el JSON. Se copia el JSON completo.', '',
          '| Brazo | Caso | Rep. | Turno | Filtro o falla | JSON devuelto |', '|---|---|---|---|---|---|']
    for f in filas_todas:
        if ROTAS.search(f['filtro']) or f['falla'] or f['bytes_http'] == 'distinto':
            L.append(f"| `{f['brazo']}` | {f['id']} | {f['corrida']} | {f['turno']} | {celda(f['falla'] or f['filtro'] or 'bytes distintos')} | `{celda(f['json'])}` |")
    # b5-3 formas
    L += ['', '### b5-3: forma de cada repregunta', '', '| Brazo | Caso | Rep. | Turno | Texto | Repregunta | Forma | ¿Conserva las palabras de la tarjeta? |', '|---|---|---|---|---|---|---|---|']
    for f in filas_todas:
        if f['item'] == 'b5-3-cambio' and mostrada(f):
            forma, conserva = et.forma_de(f, mostrada(f))
            L.append(f"| `{f['brazo']}` | {f['id']} | {f['corrida']} | {f['turno']} | {celda(f['texto'])} | {celda(mostrada(f))} | {forma}{' *(cayó por el filtro)*' if f['origen'] == 'base_por_filtro' else ''} | {conserva} |")
    # b5-1 base sin adaptar
    L += ['', '### b5-1: ¿la base sale sin adaptar?', '', '| Brazo | Caso | Rep. | Turno | Tipo | Repregunta | ¿Base de su tipo, tal cual? |', '|---|---|---|---|---|---|---|']
    for f in filas_todas:
        if f['item'] == 'b5-1-seguridad' and mostrada(f):
            bases = bases_de_fila(f)
            L.append(f"| `{f['brazo']}` | {f['id']} | {f['corrida']} | {f['turno']} | {f['tipo']} | {celda(mostrada(f))} | {'sí' if mostrada(f).strip() == bases.get(f['tipo']) else '**no**'} |")
    # sensibles en Haiku
    L += ['', '### `sensible` en `haiku-low`', '', '| Caso | Rep. | Turno | Parada | Bloques de texto | `sensible` | `tipo` | JSON |', '|---|---|---|---|---|---|---|---|']
    for f in datos['haiku-low'][0]:
        if f['sensible_esperado'] == 'True':
            L.append(f"| {f['id']} | {f['corrida']} | {f['turno']} | {f['parada']}{' (' + celda(f['detalle_parada']) + ')' if f['detalle_parada'] else ''} | {f['bloques_texto']} | {f['sensible']} | {f['tipo'] or f['falla']} | `{celda(f['json'])}` |")
    # español de Perú / usted
    marcadas = [f for f in datos['haiku-low'][0] if NO_PERU.search(mostrada(f) + ' ') or USTED.search(mostrada(f) + ' ')]
    L += ['', '### Español de Perú y trato de «usted» (`haiku-low`)', '', 'Búsqueda automática de giros que no son del español de Perú y de formas de «usted» en las repreguntas de Haiku; se revisó además a mano (§6).', '',
          *([f"- {f['id']} (rep. {f['corrida']}, {f['turno']}): «{mostrada(f)}»" for f in marcadas] or ['- La búsqueda no encontró ninguna.']), '',
          '### Diferencias de paridad', '', *PARIDAD, '', '## 6. Notas', '', '_Pendiente._', '']
    INFORME.write_text('\n'.join(L), encoding='utf-8')
    escribir_ciega(cg, ch)
    return m


def escribir_ciega(cg, ch):
    """Una fila por caso con repregunta (primera respuesta, repetición 1): A y B sorteados caso por caso; la clave aparte."""
    azar = random.Random(f'{VERSION}-ciega')
    L = [f'# Tabla ciega de repreguntas ({VERSION})', '',
         'Por caso con repregunta en la primera respuesta (repetición 1 de cada brazo): el ítem, la pregunta, lo que escribió el estudiante y las dos repreguntas como A y B. '
         'Cada una es la que se mostraría (si la del modelo no pasó el filtro, la base que la reemplaza). El orden se sorteó caso por caso. «iguales» si las dos son el mismo texto. Si un modelo no dio repregunta, su celda va con «—».', '',
         '| Caso | Ítem | Pregunta del ítem | Escribió el estudiante | A | B |', '|---|---|---|---|---|---|']
    clave = []
    for n in cg:
        g, h = cg[n].get(1, {}).get('primera'), ch.get(n, {}).get(1, {}).get('primera')
        rg, rh = (f['repregunta'] if f and f.get('repregunta') else '' for f in (g, h))
        if not rg and not rh:
            continue
        p = g or h
        pregunta = et.pregunta_de(cargar_casos_por_id()[p['id']])
        orden = ['gemini-low', 'haiku-low']
        azar.shuffle(orden)
        textos = {'gemini-low': rg, 'haiku-low': rh}
        if rg == rh:
            a, b = 'iguales', 'iguales'
        else:
            a, b = (celda(textos[o]) or '—' for o in orden)
        L.append(f"| {p['id']} | {p['item']} | {celda(pregunta)} | {celda(p['texto'])} | {a} | {b} |")
        clave.append(dict(caso=p['id'], A=orden[0], B=orden[1], iguales='sí' if rg == rh else ''))
    CIEGA.write_text('\n'.join(L) + '\n', encoding='utf-8')
    with CLAVE.open('w', newline='', encoding='utf-8-sig') as archivo:
        escritor = csv.DictWriter(archivo, fieldnames=['caso', 'A', 'B', 'iguales'])
        escritor.writeheader()
        escritor.writerows(clave)


_por_id = {}


def cargar_casos_por_id():
    if not _por_id:
        _por_id.update({c['id']: c for c in cargar_casos()[0]})
    return _por_id


# --- Informe de piloto-claude-2 (solo haiku-low, contra piloto-claude-1) --------------------

# Repeticiones del bloque nuevo con reglas que v7 ya trae (se dejaron las dos, como pide la spec).
REPETIDAS = (
    '«Una sola pregunta» repite «Una sola pregunta o invitación» y «escribe una sola» de «Cómo escribirla».',
    '«Máximo 25 palabras» repite, con otro número, «de hasta 30 palabras» de v7; el filtro sigue en 30.',
    '«No empieces con una valoración… No opines sobre lo que escribió» repite «No califiques ("muy bien", "interesante")».',
    '«Copia ese texto carácter por carácter» cuando la tarjeta fija la base repite, para esos casos, «Si el tipo es fuera_de_tema, copia la BASE sin cambios»; '
    'convive con «La base muestra lo que hay que pedir; no es un texto para copiar», que el bloque deja sin efecto donde la tarjeta fija la base.',
)
NEGATIVAS = re.compile(r'talla|p[eé]sim|ir mal|va mal|no sirv|mal[ií]sim|tont|no voy a poder|no vas a poder|capaz|no te ves|no me veo|sale mal|desastre|riego|riegas|malo para', re.I)
VALORACION = re.compile(r'suena bien|suena a|perfecto|me alegra|qu[eé] bueno|entiendo|buen punto de partida|genial|excelente|interesante|muy bien|qu[eé] bien|me gusta que', re.I)


def por_id(casos):
    return {next(iter(pr.values()))['primera']['id']: pr for pr in casos.values()}


def tipos_de(pr):
    return [c['primera']['tipo'] or c['primera']['falla'] or 'error' for _, c in sorted(pr.items())]


def celda_rep(f):
    """Una repetición en la tabla antes y después: `tipo`, la cruda → lo mostrado, con filtro y respaldo."""
    if not f:
        return '—'
    if f['error']:
        return f['falla'] or 'error'
    cruda, mostrada_ = (f['repregunta_llm'] or '').strip(), (f['repregunta'] or '').strip()
    if not cruda and not mostrada_:
        return f"`{f['tipo']}`{' · sensible' if f['sensible'] == 'True' else ''}, sin repregunta"
    extra = [x for x in (f"filtro: `{f['filtro']}`" if f['filtro'] else '', f"respaldo: `{f['respaldo']}`" if f['respaldo'] not in ('', 'ninguna') else '') if x]
    cuerpo = celda(cruda) + (' → =' if mostrada_ == cruda or (f['origen'] == 'llm' and mostrada_ == f['tras_filtro'].strip() and f['respaldo'] in ('', 'ninguna')) else f' → {celda(mostrada_)}')
    return f"`{f['tipo']}`: {cuerpo}" + (f" ({'; '.join(extra)})" if extra else '')


def escribir_informe_2(ruta):
    filas, casos = leer(ruta)
    _, casos1 = leer(CARPETA / 'haiku-low.csv')
    actual, antes = por_id(casos), por_id(casos1)
    ids = list(actual)
    m = medidas('haiku-low', filas, casos)
    pc1 = [c for i in ids for c in antes[i].values()]
    aciertos1 = sum(acierta(c) for c in pc1)
    archivos = json.loads(next(f['archivos'] for f in filas if f['archivos']))
    largo = sum(1 for f in filas if re.search(r'mas_de_30_palabras|mas_de_una_pregunta', f['filtro']))
    respaldos = {r: sum(f['respaldo'] == r for f in filas) for r in ('ninguna', 'base_fija', 'forma_cerrada')}
    negativas = [f for f in filas if f['repregunta_llm'] and NEGATIVAS.search(f['repregunta_llm'])]
    valoraciones = [f for f in filas if f['repregunta_llm'] and VALORACION.search(f['repregunta_llm'])]
    neg_mostradas = [f for f in negativas if NEGATIVAS.search(f['repregunta'] or '')]
    val_mostradas = [f for f in valoraciones if VALORACION.search(f['repregunta'] or '')]
    grupo = lambda i: next(iter(actual[i].values()))['primera']['grupo']  # noqa: E731
    pct = lambda a, b: f'{a}/{b} ({100 * a / b:.0f} %)' if b else '—'  # noqa: E731
    L = [f'# Piloto Claude 2: ronda única de ajuste para Haiku 5.5 low ({VERSION})', '',
         f'{len(ids)} casos × {REPETICIONES} repeticiones, solo `haiku-low`, con `prompts/v7-haiku.md` y las reglas de respaldo del runner. '
         f'CSV: [{Path(ruta).name}]({Path(ruta).name}). Se compara con `haiku-low` de piloto-claude-1 ([haiku-low.csv](haiku-low.csv), rep. 1 y 2).', '',
         '## 1. Archivos', '', '| Ruta | `git hash-object` |', '|---|---|', *[f'| `{r}` | `{h}` |' for r, h in archivos.items()], '',
         f"Brazo: `{filas[0]['modelo']}`, {filas[0]['parametros']}.", '',
         'Reglas del bloque nuevo que repiten algo de v7 (se dejaron las dos):', '', *[f'- {t}' for t in REPETIDAS], '',
         '## 2. Resumen', '', '| | piloto-claude-1 (2 rep.) | piloto-claude-2 (3 rep.) |', '|---|---|---|',
         f"| Acierto de clasificación | {pct(aciertos1, len(pc1))} | {pct(m['aciertos'], m['total'])} |",
         f"| Casos inestables | — | {len(m['inestables'])} ({', '.join(casos[i][1]['primera']['id'] for i in m['inestables']) or '—'}) |",
         f"| Repreguntas que no pasaron el filtro, por regla | — | {', '.join(f'{r}: {k}' for r, k in sorted(m['caidas'].items())) or '0'} |",
         f"| · por largo o por dos preguntas | 11 (en los 87 casos) | {largo} |",
         f"| Reglas de respaldo: ninguna / `base_fija` / `forma_cerrada` | — | {respaldos['ninguna']} / {respaldos['base_fija']} / {respaldos['forma_cerrada']} |",
         '| `sensible`: aciertos / de más / de menos | — | {}/{} · {} · {} |'.format(*m['sensible']),
         f"| Rechazos / JSON inválidos / otros errores | — | {m['rechazos']} / {m['json_invalidos']} / {m['errores']} |",
         f"| Crudas con palabras negativas (búsqueda automática) · mostradas | — | {len(negativas)} · {len(neg_mostradas)} |",
         f"| Crudas con una valoración (búsqueda automática) · mostradas | — | {len(valoraciones)} · {len(val_mostradas)} |",
         '| Latencia mediana / p95 (ms) | — | {:.0f} / {} |'.format(*m['latencia']),
         '| Tokens por llamada: entrada / salida (con razonamiento) / razonamiento | — | {:.0f} / {:.0f} / {:.0f} |'.format(*m['tokens']),
         '| Costo total / por llamada (USD) | — | {:.4f} / {:.6f} |'.format(*m['costo']), '',
         f'El acierto de piloto-claude-1 es el de los mismos {len(ids)} casos con sus esperados. `respaldo`: «ninguna» cuenta las repreguntas de b5-1 y b5-3 '
         f'que se mostraron sin cambio. Precio: US$ {PRECIOS["haiku-low"][0]:g} / {PRECIOS["haiku-low"][1]:g} por millón ({PRECIOS["haiku-low"][2]}).', '',
         '## 3. Antes y después', '',
         'Por caso y turno: lo que escribió, la repregunta mostrada en piloto-claude-1 (rep. 1) y, por repetición de esta ronda, `tipo`: la cruda del modelo → lo mostrado '
         '(«=» si es la misma), con el filtro y el respaldo que actuaron. En el seguimiento, lo mostrado es la pista que se guarda.', '',
         '| Caso | Grupo | Turno | Texto | piloto-claude-1 (mostrada) | Rep. 1 | Rep. 2 | Rep. 3 |', '|---|---|---|---|---|---|---|---|']
    for i in ids:
        for turno in ('primera', 'seguimiento'):
            f1 = antes.get(i, {}).get(1, {}).get(turno)
            reps = [actual[i].get(r, {}).get(turno) for r in (1, 2, 3)]
            if not any(reps):
                continue
            p = next(f for f in reps if f)
            L.append(f"| {i} | {grupo(i)} | {turno} | {celda(p['texto'])} | {celda(f1['repregunta']) if f1 and f1['repregunta'] else '—'} | "
                     + ' | '.join(celda_rep(f) for f in reps) + ' |')
    L += ['', '## 4. Atención especial', '', '### Crudas con palabras negativas del estudiante', '',
          'Búsqueda automática (talla, pésima, ir mal, no sirvo, malísima, tonto, capaz, no me veo…) sobre todas las crudas; la revisión a mano del grupo «Palabras negativas» va en §5. Se copian completas.', '',
          *([f"- {f['id']} rep. {f['corrida']} ({f['turno']}): «{f['repregunta_llm']}» → mostrada: «{f['repregunta']}»" for f in negativas] or ['- Ninguna.']), '',
          '### Crudas con una valoración o una reacción', '', 'Búsqueda automática de las frases del bloque y parecidas; la revisión a mano de las demás va en §5.', '',
          *([f"- {f['id']} rep. {f['corrida']} ({f['turno']}): «{f['repregunta_llm']}»" for f in valoraciones] or ['- Ninguna.']), '',
          '### b5-3 y b5-1: crudas válidas sin el respaldo', '']
    for item, regla in (('b5-3-cambio', 'forma_cerrada'), ('b5-1-seguridad', 'base_fija')):
        conj = [f for f in filas if f['item'] == item and f['cruda_valida'] and f['repregunta_llm']]  # sin cruda (no redactó) no cuenta
        L.append(f"- `{item}`: {sum(f['cruda_valida'] == 'sí' for f in conj)} de {len(conj)} crudas ya eran válidas; `{regla}` cambió lo mostrado en {sum(f['respaldo'] == regla for f in conj)}.")
    no_validas = [f for f in filas if f['cruda_valida'] == 'no' and f['repregunta_llm']]
    L += ['', 'Las que no eran válidas:', '', '| Caso | Rep. | Turno | `tipo` | Cruda | Mostrada |', '|---|---|---|---|---|---|',
          *[f"| {f['id']} | {f['corrida']} | {f['turno']} | {f['tipo']} | {celda(f['repregunta_llm'])} | {celda(f['repregunta'])} |" for f in no_validas], '',
          '### Controles y sensibles: `tipo` frente a piloto-claude-1', '', '| Caso | Esperado | piloto-claude-1 | piloto-claude-2 | ¿Aparece un `tipo` nuevo? |', '|---|---|---|---|---|']
    for i in ids:
        if grupo(i) in ('Controles que salieron bien', 'Sensible'):
            t1, t2 = tipos_de(antes[i]), tipos_de(actual[i])
            L.append(f"| {i} | {esperado(actual[i][1]['primera'])} | {' · '.join(t1)} | {' · '.join(t2)} | {'**sí**' if set(t2) - set(t1) else 'no'} |")
    L += ['', '### P30 y P56', '', '| Caso | Rep. | `tipo` | `motivo` |', '|---|---|---|---|']
    for i in ('P30', 'P56'):
        for r, c in sorted(actual.get(i, {}).items()):
            L.append(f"| {i} | {r} | {c['primera']['tipo']} | {celda(c['primera']['motivo'])} |")
    L += ['', '## 5. Revisión a mano', '', '_Pendiente._', '', '## 6. Notas', '', '_Pendiente._', '']
    INFORME.write_text('\n'.join(L), encoding='utf-8')
    return m


# --- Entrada ---------------------------------------------------------------------------------

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser()
    parser.add_argument('--revisar', action='store_true', help='manifiesto y solapamiento, sin llamar')
    parser.add_argument('--humo', action='store_true', help='un caso `propio` y uno `general` por brazo; no guarda CSV del set')
    parser.add_argument('--informe', action='store_true', help='rehace informe, tabla ciega y clave desde los CSV')
    parser.add_argument('--hilos', type=int, default=8)
    parser.add_argument('--piloto', type=int, choices=(1, 2), default=1, help='1: los dos brazos con v7.md; 2: haiku-low con v7-haiku.md y respaldo')
    args = parser.parse_args()
    configurar(args.piloto)

    if args.informe:
        if args.piloto == 2:
            print(escribir_informe_2(CARPETA / f'{PREFIJO_CSV}haiku-low.csv'))
        else:
            print(escribir_informe({n: CARPETA / f'{n}.csv' for n in BRAZOS}))
        return
    casos, manifiesto = cargar_casos()
    revisar(casos, manifiesto)
    if args.revisar:
        return
    if args.humo:
        elegidos = [next(c for c in casos if c['tipo_esperado'] == t and 'respuesta_seguimiento' not in c) for t in ('propio', 'general')]
        for nombre in NOMBRES_BRAZOS:
            brazo = BRAZOS[nombre]()
            for caso in elegidos:
                filas = ejecutar(brazo, caso, dict(modelo=brazo.modelo, razonamiento='low', temperatura='', archivos=''), 1)
                f = {k: '' for k in CAMPOS} | filas[0]
                print(f"{nombre} · {caso['id']} ({caso['tipo_esperado']}): parada={f['parada']} falla={f['falla'] or '—'} error={f['error'][:120] or '—'} "
                      f"tipo={f['tipo']} sensible={f['sensible']} origen={f['origen']} filtro={f['filtro'] or '—'} latencia={f['latencia_ms']} "
                      f"tokens={f['tokens_entrada']}/{f['tokens_razonamiento']}/{f['tokens_salida']}\n  json={f['json'][:300]}")
        return
    rutas, parametros_brazos = correr(casos, list(NOMBRES_BRAZOS), REPETICIONES, args.hilos)
    print({n: r.name for n, r in rutas.items()})
    m = {'haiku-low': escribir_informe_2(rutas['haiku-low'])} if args.piloto == 2 else escribir_informe(rutas, parametros_brazos)
    for n, v in m.items():
        print(n, f"{v['aciertos']}/{v['total']}", 'rechazos', v['rechazos'], 'json_invalidos', v['json_invalidos'], 'errores', v['errores'])


if __name__ == '__main__':
    main()
