"""Prueba de tarjetas y clasificación por `tipo` (v7.2): método B, repregunta guiada con la base como respaldo, en b1-3.

No es pytest y no toca el backend ni el prompt vigente: reutiliza de `evaluar.py` el entorno y las opciones, y tiene su
propio prompt (`prompt_tarjetas.py`), sus tarjetas (`tarjetas_b1_1.py`, `tarjetas_b1_3.py`) y sus casos
(`casos/b1-3-tarjetas.json`). Las corridas anteriores (v7 y v7.1) quedan en sus CSV e informes y este runner ya no las rehace.

Uso, desde ov_backend:
    uv run python tests/llm/evaluar_tarjetas.py --mostrar 16        # el prompt y el mensaje, sin llamar
    uv run python tests/llm/evaluar_tarjetas.py                     # una corrida; CSV e informe
    uv run python tests/llm/evaluar_tarjetas.py --informe <csv>     # rehace el informe desde un CSV, sin llamar
"""

import argparse
import csv
import json
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path
from typing import Literal

from pydantic import BaseModel

import evaluar as base  # agrega el backend a sys.path
import tarjetas_b1_1
import tarjetas_b1_3
from prompt_tarjetas import PROMPT, VERSION

from app.core import parametros  # noqa: E402
from app.models.base import sin_tildes  # noqa: E402

REGISTRO = 'b1-3'
AQUI = Path(__file__).resolve().parent
CARPETA = AQUI / 'resultados' / REGISTRO
INFORME = CARPETA / 'v7.2.md'
TARJETAS = {**tarjetas_b1_1.TARJETAS, **tarjetas_b1_3.TARJETAS}

Tipo = Literal['propio', 'general', 'no_sabe', 'vacio', 'fuera_de_tema', 'emocional']
ORDEN = ('propio', 'general', 'no_sabe', 'vacio', 'fuera_de_tema')  # `emocional` no está en el orden: pierde con todos
CON_REPREGUNTA = ('general', 'vacio', 'no_sabe', 'fuera_de_tema')
PROHIBIDAS = ('pero', 'exactamente', 'específicamente', '¿podrías', 'desarrolla', 'explica', 'demuestra', 'demostraste')
PERMITIDOS = re.compile(r'''[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s.,;:¿?¡!()«»"'“”‘’…–—-]*''')
_TIPO_BASE = '(?:general|no_sabe|vacio|fuera_de_tema)'
BASE_DE = re.compile(rf'^[ \t]*({_TIPO_BASE}(?: / {_TIPO_BASE})*) ·(?:.*\n)??.*?BASE: «(.+?)»', re.M)


class Resultado(BaseModel):
    motivo: str
    tipo: Tipo
    sensible: bool
    repregunta: str | None = None


# --- Casos, tarjeta y mensaje ----------------------------------------------------------------

def cargar_casos():
    """Los casos de la prueba; los que remiten a `b1-3.json` toman de ahí su texto y sus opciones."""
    existentes = {c['id']: c for c in json.loads((AQUI / 'casos' / f'{REGISTRO}.json').read_text(encoding='utf-8'))['casos']}
    casos = json.loads((AQUI / 'casos' / f'{REGISTRO}-tarjetas.json').read_text(encoding='utf-8'))['casos']
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


# --- Filtro y estado final -------------------------------------------------------------------

def abrir_interrogacion(texto):
    """Con «?» y sin «¿», agrega el «¿» al inicio de la oración interrogativa."""
    if '?' not in texto or '¿' in texto:
        return texto
    fin = texto.index('?')
    inicio = max(texto.rfind(signo, 0, fin) for signo in '.!:;…') + 1
    inicio += len(texto[inicio:]) - len(texto[inicio:].lstrip())
    return f'{texto[:inicio]}¿{texto[inicio:]}'


def filtrar(repregunta, tipo, item, etiquetas):
    """(texto, reglas incumplidas). El texto puede volver con el «¿» agregado; sin reglas, la repregunta pasa."""
    texto = abrir_interrogacion(repregunta.strip())
    normal, reglas = sin_tildes(texto), []
    for palabra in PROHIBIDAS:
        if re.search(rf'(?<!\w){re.escape(sin_tildes(palabra))}(?!\w)', normal):
            reglas.append(f'prohibida:{palabra}')
    excepcion = tipo == 'fuera_de_tema' and item == 'b1-1-logro'
    if not excepcion and any(sin_tildes(e) in normal for e in etiquetas):
        reglas.append('etiqueta_opcion')
    if len(texto.split()) > 30:
        reglas.append('mas_de_30_palabras')
    if texto.count('?') > 1:
        reglas.append('mas_de_una_pregunta')
    if not texto.endswith(('?', '.')):
        reglas.append('no_termina_en_interrogacion_ni_punto')
    if not PERMITIDOS.fullmatch(texto):
        reglas.append('caracteres')
    return texto, reglas


def repregunta_de(r, caso):
    """(repregunta final, origen, reglas incumplidas, si se agregó «¿»). Sin repregunta: (None, '', [], False)."""
    if r.sensible or r.tipo not in CON_REPREGUNTA:
        return None, '', [], False
    respaldo = bases_de(caso)[r.tipo]
    if not (r.repregunta or '').strip():
        return respaldo, 'base_sin_redactar', [], False
    texto, reglas = filtrar(r.repregunta, r.tipo, caso['item'], caso['etiquetas'])
    if reglas:
        return respaldo, 'base_por_filtro', reglas, False
    return texto, 'llm', [], texto != r.repregunta.strip()


def _rango(tipo):
    return ORDEN.index(tipo) if tipo in ORDEN else len(ORDEN)


def estado_final(primera, conjunto):
    """(tipo final, sensible, estado), como lo haría el backend. Estado: `sensible`, `abierto` o vacío."""
    tipo = min((primera.tipo, conjunto.tipo), key=_rango)
    sensible = primera.sensible or conjunto.sensible
    return tipo, sensible, 'sensible' if sensible else 'abierto' if tipo == 'no_sabe' else ''


# --- Corrida ---------------------------------------------------------------------------------

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
        latencia_ms=latencia, tokens_entrada=getattr(uso, 'prompt_token_count', None),
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


def campos_repregunta(r, caso):
    repregunta, origen, reglas, apertura = repregunta_de(r, caso)
    return repregunta, dict(repregunta_llm=r.repregunta, repregunta=repregunta, origen=origen, filtro=' '.join(reglas),
                            apertura='sí' if apertura else '', ignorada='sí' if r.repregunta and repregunta is None else '')


def ejecutar(llamada, caso, comun):
    """Las filas de un caso: la primera respuesta y, si tiene, el seguimiento."""
    fila_base = dict(comun, numero=caso['numero'], caso=caso['caso'], item=caso['item'], opciones=', '.join(caso['etiquetas']),
                     tipo_esperado=caso.get('tipo_esperado', ''), final_esperado=caso.get('final_esperado', ''),
                     sensible_esperado=caso.get('sensible_esperado', ''))
    try:
        r, uso = con_reintento(lambda: llamada(mensaje(caso, caso['texto'])))
        repregunta, campos = campos_repregunta(r, caso)
        filas = [dict(fila_base, **uso, **campos, turno='primera', texto=caso['texto'], motivo=r.motivo, tipo=r.tipo, sensible=r.sensible)]
        if 'respuesta_seguimiento' not in caso:
            return filas
        # Sin invitación propia (el modelo no pidió repregunta) se usa la base del tipo esperado, y se informa.
        respaldo = repregunta is None
        invitacion = repregunta or bases_de(caso)[caso['tipo_esperado']]
        s, uso = con_reintento(lambda: llamada(mensaje(caso, caso['respuesta_seguimiento'], caso['texto'], invitacion)))
        final, sensible, estado = estado_final(r, s)
        # La repregunta del seguimiento no se muestra: es la pista que se guarda para cuando edite el ítem.
        _, campos = campos_repregunta(s, caso)
        filas.append(dict(fila_base, **uso, **campos, turno='seguimiento', texto=caso['respuesta_seguimiento'], motivo=s.motivo, tipo=s.tipo,
                          sensible=s.sensible, invitacion=invitacion, invitacion_respaldo='sí' if respaldo else '', tipo_final=final,
                          sensible_final=sensible, estado=estado))
        return filas
    except Exception as error:  # noqa: BLE001
        return [dict(fila_base, turno='primera', texto=caso['texto'], error=repr(error)[:300])]


CAMPOS = ['numero', 'caso', 'item', 'turno', 'texto', 'opciones', 'tipo_esperado', 'final_esperado', 'sensible_esperado', 'motivo', 'tipo',
          'sensible', 'repregunta_llm', 'repregunta', 'origen', 'filtro', 'apertura', 'ignorada', 'invitacion', 'invitacion_respaldo', 'tipo_final',
          'sensible_final', 'estado', 'modelo', 'razonamiento', 'temperatura', 'latencia_ms', 'tokens_entrada', 'tokens_razonamiento', 'tokens_salida', 'error']


def guardar(filas, nivel, temperatura, etiqueta):
    filas.sort(key=lambda f: (f['numero'], f['turno']))
    sufijo = f'_{etiqueta}' if etiqueta else ''
    destino = CARPETA / f'{datetime.now():%Y-%m-%d_%H%M}_{VERSION}_t{temperatura:g}_r{nivel}{sufijo}.csv'
    with destino.open('w', newline='', encoding='utf-8-sig') as archivo:
        escritor = csv.DictWriter(archivo, fieldnames=CAMPOS)
        escritor.writeheader()
        escritor.writerows(filas)
    return destino


def agregar_resumen(destino, modelo, nivel, temperatura, medidas):
    linea = (f"| {datetime.now():%Y-%m-%d %H:%M} | {VERSION} | {modelo} · {nivel} | {temperatura:g} | 1 | "
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
        casos.setdefault(int(fila['numero']), {})[fila['turno']] = fila
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
    return primera['tipo'] == primera['tipo_esperado']


def esperado_de(primera):
    if primera['sensible_esperado'] == 'True':
        return '`sensible: true`'
    salida = primera['tipo_esperado']
    if primera['final_esperado']:
        salida += f" → final {primera['final_esperado']}"
    return salida + (' · `sensible: false`' if primera['sensible_esperado'] == 'False' else '')


def obtenido_de(por_caso):
    primera, seguimiento = por_caso['primera'], por_caso.get('seguimiento')
    if primera['error']:
        return 'error'
    salida = primera['tipo'] + (f" → final {seguimiento['tipo_final']}" if seguimiento else '')
    return salida + (' · sensible' if sensible_de(por_caso) else '')


def medir(casos):
    medidas = {clave: [] for clave in ('invitaciones', 'pases', 'fn', 'fp', 'emocional_fn', 'emocional_fp')}
    aciertos = errores = 0
    for numero, por_caso in casos.items():
        primera = por_caso['primera']
        errores += bool(primera['error'])
        aciertos += acierta(por_caso)
        if primera['error']:
            continue
        esperado, tipo = primera['tipo_esperado'], primera['tipo']
        sensible, espera_sensible = sensible_de(por_caso), primera['sensible_esperado'] == 'True'
        condiciones = dict(invitaciones=esperado == 'propio' and tipo != 'propio', pases=esperado in ('vacio', 'fuera_de_tema') and tipo == 'propio',
                           fn=espera_sensible and not sensible, fp=sensible and not espera_sensible,
                           emocional_fn=esperado == 'emocional' and tipo != 'emocional', emocional_fp=tipo == 'emocional' and esperado != 'emocional')
        for clave, ocurre in condiciones.items():
            if ocurre:
                medidas[clave].append(numero)
    return dict(medidas, aciertos=aciertos, errores=errores, total=len(casos))


def lista_casos(numeros):
    return f"{len(numeros)}" + (f" (#{', #'.join(map(str, numeros))})" if numeros else '')


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


def escribir_informe(ruta_csv):
    filas, casos = leer_csv(ruta_csv)
    primera = filas[0]
    medidas = medir(casos)
    llamadas = sum(1 for f in filas if not f['error'])
    lineas = [f'# {REGISTRO} con tarjetas (v7.2, método B)', '',
              f"`{primera['modelo']}` · {primera['razonamiento']}, temperatura {primera['temperatura']}, una corrida, {llamadas} llamadas con respuesta, "
              f"{medidas['errores']} con error. CSV: [{Path(ruta_csv).name}]({Path(ruta_csv).name}).", '',
              '## 1. Casos', '', '| # | Ítem · opción | Texto | Esperado | Obtenido | ¿Coincide? | `motivo` | Repregunta | ¿Pasó el filtro? |',
              '|---|---|---|---|---|---|---|---|---|']
    for numero, por_caso in casos.items():
        f = por_caso['primera']
        lineas.append(f"| {numero} | {f['item'].removeprefix('b1-3-')} · {celda(f['opciones']) or '—'} | {celda(f['texto'])} | {esperado_de(f)} | {obtenido_de(por_caso)} | "
                      f"{'sí' if acierta(por_caso) else '**no**'} | {celda(f['motivo'])} | {repregunta_mostrada(f)} | {filtro_de_fila(f)} |")
    for numero, por_caso in casos.items():
        s = por_caso.get('seguimiento')
        if s:
            invitacion = celda(s['invitacion']) + (' *(respaldo)*' if s['invitacion_respaldo'] else '')
            lineas += ['', f'**Seguimiento de #{numero}:** respondió «{celda(s["texto"])}».', '',
                       '| Invitación que vio | `tipo` del conjunto | `tipo` final | Pista guardada | ¿Pasó el filtro? | `motivo` |', '|---|---|---|---|---|---|',
                       f"| {invitacion} | {s['tipo']} | {s['tipo_final']} | {celda(s['repregunta']) or '— (ninguna)'} | {filtro_de_fila(s)} | {celda(s['motivo'])} |"]
    lineas += ['', '## 2. Totales', '', '| Medida | Resultado |', '|---|---|', f"| Acierto | {medidas['aciertos']}/{medidas['total']} |",
               f"| Invitaciones de más (`propio` → otro tipo) | {lista_casos(medidas['invitaciones'])} |",
               f"| Pases de menos (`vacio` o `fuera_de_tema` → `propio`) | {lista_casos(medidas['pases'])} |",
               f"| `sensible`: falsos negativos | {lista_casos(medidas['fn'])} |", f"| `sensible`: falsos positivos | {lista_casos(medidas['fp'])} |",
               f"| `emocional`: esperado y no obtenido | {lista_casos(medidas['emocional_fn'])} |", f"| `emocional`: obtenido y no esperado | {lista_casos(medidas['emocional_fp'])} |",
               '', '## 3. Notas', '', '_Pendiente._', '']
    INFORME.write_text('\n'.join(lineas), encoding='utf-8')
    return medidas


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser()
    parser.add_argument('--modelo', default=parametros.MODELO_LLM_REGISTRO)
    parser.add_argument('--razonamiento', default=parametros.NIVEL_RAZONAMIENTO_REGISTRO, choices=('minimal', 'low', 'medium', 'high'))
    parser.add_argument('--hilos', type=int, default=8)
    parser.add_argument('--etiqueta', default='')
    parser.add_argument('--informe', help='rehace el informe desde este CSV, sin llamar al modelo')
    parser.add_argument('--mostrar', type=int, metavar='NUMERO', help='imprime el prompt y el mensaje, sin llamar')
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

    clave, _ = base.entorno()
    if not clave:
        sys.exit('Falta GEMINI_API_KEY (en el entorno o en el .env del backend)')
    cliente = base.adaptador.genai.Client(api_key=clave)
    razonamiento = base.config_razonamiento(args.modelo, args.razonamiento)
    nivel = base.nombre_razonamiento(razonamiento)
    temperatura = parametros.TEMPERATURA_REGISTRO
    comun = dict(modelo=args.modelo, razonamiento=nivel, temperatura=temperatura)
    llamada = lambda contenido: llamar(cliente, args.modelo, razonamiento, contenido, temperatura)  # noqa: E731
    print(f'{len(casos)} casos (método B)')
    with ThreadPoolExecutor(max_workers=args.hilos) as pool:
        filas = [f for grupo in pool.map(lambda c: ejecutar(llamada, c, comun), casos) for f in grupo]
    destino = guardar(filas, nivel, temperatura, args.etiqueta)
    medidas = escribir_informe(destino)
    print(destino.name)
    print(agregar_resumen(destino, args.modelo, nivel, temperatura, medidas))


if __name__ == '__main__':
    main()
