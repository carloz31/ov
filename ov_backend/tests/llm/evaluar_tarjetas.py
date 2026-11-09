"""Prueba de tarjetas y clasificación nueva en b1-1: método A (texto fijo) frente a B (repregunta guiada).

No es pytest y no toca el backend ni el prompt vigente: reutiliza de `evaluar.py` el entorno y las opciones, y tiene su
propio prompt (`prompt_tarjetas.py`), sus tarjetas (`tarjetas_b1_1.py`) y sus casos (`casos/b1-1-tarjetas.json`).

Uso, desde ov_backend:
    uv run python tests/llm/evaluar_tarjetas.py --mostrar 8 B       # el prompt y el mensaje, sin llamar
    uv run python tests/llm/evaluar_tarjetas.py                     # una corrida por método; CSV e informe
    uv run python tests/llm/evaluar_tarjetas.py --informe <csv>     # rehace el informe desde un CSV, sin llamar
"""

import argparse
import csv
import json
import random
import re
import sys
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path
from typing import Literal

from pydantic import BaseModel

import evaluar as base  # agrega el backend a sys.path
from prompt_tarjetas import PROMPTS, VERSION
from tarjetas_b1_1 import TARJETAS

from app.core import parametros  # noqa: E402
from app.models.base import sin_tildes  # noqa: E402

REGISTRO = 'b1-1'
AQUI = Path(__file__).resolve().parent
CARPETA = AQUI / 'resultados' / REGISTRO
INFORME = CARPETA / 'v7-tarjetas.md'
REFERENCIA_V6_10 = CARPETA / '2026-11-08_1030_v6.10_t1_rlow_b1-1-v6.10.csv'
SEMILLA = 20261108

Tipo = Literal['propio', 'general', 'no_sabe', 'vacio', 'fuera_de_tema', 'emocional']
ORDEN = ('propio', 'general', 'no_sabe', 'vacio', 'fuera_de_tema')  # `emocional` no está en el orden: pierde con todos
CON_REPREGUNTA = ('general', 'vacio', 'no_sabe', 'fuera_de_tema')
PROHIBIDAS = ('pero', 'exactamente', 'específicamente', '¿podrías', 'desarrolla', 'explica', 'demuestra', 'demostraste')
PERMITIDOS = re.compile(r'''[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s.,;:¿?¡!()«»"'“”‘’…–—-]*''')
BASE_DE = re.compile(r'^\s*(general|no_sabe / vacio|no_sabe|vacio|fuera_de_tema) ·(?:.*\n)??.*?BASE: «(.+?)»', re.M)


class ResultadoA(BaseModel):
    motivo: str
    tipo: Tipo
    sensible: bool


class ResultadoB(ResultadoA):
    repregunta: str | None = None


ESQUEMAS = {'A': ResultadoA, 'B': ResultadoB}


# --- Casos, tarjeta y mensaje ----------------------------------------------------------------

def cargar_casos():
    """Los casos de la prueba con su texto, sus opciones y su seguimiento leídos de `b1-1.json`."""
    existentes = {c['id']: c for c in json.loads((AQUI / 'casos' / 'b1-1.json').read_text(encoding='utf-8'))['casos']}
    casos = json.loads((AQUI / 'casos' / 'b1-1-tarjetas.json').read_text(encoding='utf-8'))['casos']
    for caso in casos:
        if caso['caso'] != 'nuevo':
            origen = existentes[caso['caso']]
            if origen['tipo'] == 'seguimiento':
                if origen['item'] != caso['item']:
                    raise SystemExit(f"{caso['caso']} no es de {caso['item']}")
                caso.update(texto=origen['texto'], opciones=origen['opciones'], respuesta_seguimiento=origen['turnos'][0][1])
            else:
                item = next(i for i in origen['items'] if i['item'] == caso['item'])
                caso.update(texto=item['texto'], opciones=item['opciones'])
        caso['etiquetas'] = list(base.textos_elegidos(caso['item'], caso['opciones']))
    return casos


def tarjeta_de(item, etiquetas):
    """La tarjeta con la opción marcada en lugar de `{opción}`."""
    opcion = ' y '.join(etiquetas)
    return TARJETAS[item]['tarjeta'].replace(', {opción}', f', {opcion}' if opcion else '')


def bases_de(item, etiquetas):
    """El texto fijo de cada `tipo`, leído de las líneas `BASE:` de la tarjeta."""
    bases = {}
    for tipos, texto in BASE_DE.findall(tarjeta_de(item, etiquetas)):
        bases.update(dict.fromkeys(tipos.split(' / '), texto))
    if set(bases) != set(CON_REPREGUNTA):
        raise SystemExit(f'La tarjeta de {item} no trae las cuatro bases: {sorted(bases)}')
    return bases


def mensaje(item, etiquetas, texto, anterior=None, invitacion=None):
    """Las etiquetas del prompt; las vacías se omiten."""
    partes = (('tarjeta', tarjeta_de(item, etiquetas)), ('pregunta_mostrada', TARJETAS[item]['pregunta']),
              ('opcion_marcada', ', '.join(etiquetas)), ('respuesta_anterior', anterior), ('invitacion', invitacion),
              ('respuesta', texto))
    return '\n'.join(f'<{nombre}>{valor}</{nombre}>' for nombre, valor in partes if valor)


# --- Filtro de B y estado final --------------------------------------------------------------

def filtrar(repregunta, tipo, item, etiquetas):
    """Las reglas que incumple una repregunta del método B; vacío si pasa."""
    texto, normal, reglas = repregunta.strip(), sin_tildes(repregunta), []
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
    if not texto.endswith('?'):
        reglas.append('no_termina_en_interrogacion')
    if not PERMITIDOS.fullmatch(texto):
        reglas.append('caracteres')
    return reglas


def repregunta_de(metodo, r, caso):
    """(repregunta que vería el estudiante, origen, reglas incumplidas). Sin repregunta: (None, '', [])."""
    if r.sensible or r.tipo not in CON_REPREGUNTA:
        return None, '', []
    fija = bases_de(caso['item'], caso['etiquetas'])[r.tipo]
    if metodo == 'A':
        return fija, 'fijo', []
    if not (r.repregunta or '').strip():
        return fija, 'base_sin_redactar', []
    reglas = filtrar(r.repregunta, r.tipo, caso['item'], caso['etiquetas'])
    return (fija, 'base_por_filtro', reglas) if reglas else (r.repregunta.strip(), 'llm', [])


def _rango(tipo):
    return ORDEN.index(tipo) if tipo in ORDEN else len(ORDEN)


def estado_final(primera, conjunto):
    """(tipo final, sensible, estado), como lo haría el backend. Estado: `sensible`, `abierto` o vacío."""
    tipo = min((primera.tipo, conjunto.tipo), key=_rango)
    sensible = primera.sensible or conjunto.sensible
    return tipo, sensible, 'sensible' if sensible else 'abierto' if tipo == 'no_sabe' else ''


# --- Corrida ---------------------------------------------------------------------------------

def llamar(cliente, modelo, razonamiento, metodo, contenido, temperatura):
    tipos = base.adaptador.types
    inicio = time.perf_counter()
    respuesta = cliente.models.generate_content(
        model=modelo, contents=contenido,
        config=tipos.GenerateContentConfig(
            system_instruction=PROMPTS[metodo], temperature=temperatura, candidate_count=1,
            response_mime_type='application/json', response_json_schema=ESQUEMAS[metodo].model_json_schema(),
            thinking_config=razonamiento, automatic_function_calling=tipos.AutomaticFunctionCallingConfig(disable=True)))
    latencia = round((time.perf_counter() - inicio) * 1000)
    partes = respuesta.candidates[0].content.parts if respuesta.candidates else []
    texto = ''.join(p.text for p in partes or [] if p.text and not p.thought)
    uso = respuesta.usage_metadata
    return ESQUEMAS[metodo].model_validate_json(texto), dict(
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


def ejecutar(llamada, metodo, caso, comun):
    """Las filas de un caso: la primera respuesta y, si tiene, el seguimiento."""
    fila_base = dict(comun, metodo=metodo, numero=caso['numero'], caso=caso['caso'], item=caso['item'],
                     opciones=', '.join(caso['etiquetas']), tipo_esperado=caso.get('tipo_esperado', ''),
                     final_esperado=caso.get('final_esperado', ''), estado_esperado=caso.get('estado_esperado', ''),
                     sensible_esperado=caso.get('sensible_esperado', ''))
    try:
        contenido = mensaje(caso['item'], caso['etiquetas'], caso['texto'])
        r, uso = con_reintento(lambda: llamada(metodo, contenido))
        repregunta, origen, reglas = repregunta_de(metodo, r, caso)
        crudo = getattr(r, 'repregunta', None)
        filas = [dict(fila_base, **uso, turno='primera', texto=caso['texto'], motivo=r.motivo, tipo=r.tipo, sensible=r.sensible,
                      repregunta_llm=crudo, repregunta=repregunta, origen=origen, filtro=' '.join(reglas),
                      ignorada='sí' if crudo and repregunta is None else '')]
        if 'respuesta_seguimiento' not in caso:
            return filas
        # Sin invitación propia (el modelo no pidió repregunta) se usa el texto fijo del tipo esperado, y se informa.
        respaldo = repregunta is None
        invitacion = repregunta or bases_de(caso['item'], caso['etiquetas'])[caso['final_esperado']]
        contenido = mensaje(caso['item'], caso['etiquetas'], caso['respuesta_seguimiento'], caso['texto'], invitacion)
        s, uso = con_reintento(lambda: llamada(metodo, contenido))
        final, sensible, estado = estado_final(r, s)
        filas.append(dict(fila_base, **uso, turno='seguimiento', texto=caso['respuesta_seguimiento'], motivo=s.motivo, tipo=s.tipo,
                          sensible=s.sensible, repregunta_llm=getattr(s, 'repregunta', None), invitacion=invitacion,
                          invitacion_respaldo='sí' if respaldo else '', tipo_final=final, sensible_final=sensible, estado=estado,
                          ignorada='sí' if getattr(s, 'repregunta', None) else ''))
        return filas
    except Exception as error:  # noqa: BLE001
        return [dict(fila_base, turno='primera', texto=caso['texto'], error=repr(error)[:300])]


CAMPOS = ['metodo', 'numero', 'caso', 'item', 'turno', 'texto', 'opciones', 'tipo_esperado', 'final_esperado', 'estado_esperado',
          'sensible_esperado', 'motivo', 'tipo', 'sensible', 'repregunta_llm', 'repregunta', 'origen', 'filtro', 'ignorada', 'invitacion',
          'invitacion_respaldo', 'tipo_final', 'sensible_final', 'estado', 'modelo', 'razonamiento', 'temperatura', 'latencia_ms',
          'tokens_entrada', 'tokens_razonamiento', 'tokens_salida', 'error']


def guardar(filas, modelo, nivel, temperatura, etiqueta):
    filas.sort(key=lambda f: (f['metodo'], f['numero'], f['turno']))
    sufijo = f'_{etiqueta}' if etiqueta else ''
    destino = CARPETA / f'{datetime.now():%Y-%m-%d_%H%M}_{VERSION}_t{temperatura:g}_r{nivel}{sufijo}.csv'
    with destino.open('w', newline='', encoding='utf-8-sig') as archivo:
        escritor = csv.DictWriter(archivo, fieldnames=CAMPOS)
        escritor.writeheader()
        escritor.writerows(filas)
    return destino


def agregar_resumen(destino, modelo, nivel, temperatura, medidas):
    lineas = [f"| {datetime.now():%Y-%m-%d %H:%M} | {VERSION}-{metodo} | {modelo} · {nivel} | {temperatura:g} | 1 | "
              f"{m['aciertos']}/{m['total']} | — | {m['errores']} | {destino.name} |" for metodo, m in medidas.items()]
    with (CARPETA / 'resumen.md').open('a', encoding='utf-8') as archivo:
        archivo.write('\n'.join(lineas) + '\n')
    return lineas


# --- Informe (se arma solo desde el CSV) -----------------------------------------------------

def celda(valor):
    return str(valor or '').replace('|', '\\|').replace('\n', ' ')


def leer_csv(ruta):
    with Path(ruta).open(encoding='utf-8-sig', newline='') as archivo:
        filas = list(csv.DictReader(archivo))
    casos = {}
    for fila in filas:
        casos.setdefault(int(fila['numero']), {}).setdefault(fila['metodo'], {})[fila['turno']] = fila
    return filas, dict(sorted(casos.items()))


def verdadero(valor):
    return valor == 'True'


def sensible_de(por_metodo):
    return any(verdadero(f['sensible']) for f in por_metodo.values())


def acierta(por_metodo):
    primera, seguimiento = por_metodo['primera'], por_metodo.get('seguimiento')
    if primera['error']:
        return False
    if primera['sensible_esperado']:
        return sensible_de(por_metodo)
    if primera['final_esperado']:
        return bool(seguimiento) and seguimiento['tipo_final'] == primera['final_esperado'] \
            and seguimiento['estado'] == primera['estado_esperado'] \
            and (not primera['tipo_esperado'] or primera['tipo'] == primera['tipo_esperado'])
    return primera['tipo'] == primera['tipo_esperado']


def esperado_de(primera):
    if primera['sensible_esperado']:
        return '`sensible: true`'
    if primera['final_esperado']:
        estado = f" → {primera['estado_esperado']}" if primera['estado_esperado'] else ''
        return f"{primera['tipo_esperado'] or '—'} → final {primera['final_esperado']}{estado}"
    return primera['tipo_esperado']


def obtenido_de(por_metodo):
    primera, seguimiento = por_metodo['primera'], por_metodo.get('seguimiento')
    if primera['error']:
        return 'error'
    salida = primera['tipo']
    if seguimiento:
        estado = f" → {seguimiento['estado']}" if seguimiento['estado'] else ''
        salida += f" → final {seguimiento['tipo_final']}{estado}"
    if sensible_de(por_metodo):
        salida += ' · sensible'
    return salida


def medir(casos, metodo):
    numeros = {'invitaciones': [], 'pases': [], 'fn': [], 'fp': []}
    aciertos = errores = 0
    for numero, por_caso in casos.items():
        por_metodo = por_caso[metodo]
        primera = por_metodo['primera']
        errores += bool(primera['error'])
        aciertos += acierta(por_metodo)
        if primera['error']:
            continue
        if primera['tipo_esperado'] == 'propio' and primera['tipo'] != 'propio':
            numeros['invitaciones'].append(numero)
        if primera['tipo_esperado'] in ('vacio', 'fuera_de_tema') and primera['tipo'] == 'propio':
            numeros['pases'].append(numero)
        sensible = sensible_de(por_metodo)
        if primera['sensible_esperado'] and not sensible:
            numeros['fn'].append(numero)
        if not primera['sensible_esperado'] and sensible:
            numeros['fp'].append(numero)
    return dict(numeros, aciertos=aciertos, errores=errores, total=len(casos))


def lista_casos(numeros):
    return f"{len(numeros)}" + (f" (#{', #'.join(map(str, numeros))})" if numeros else '')


def referencia_v6_10():
    with REFERENCIA_V6_10.open(encoding='utf-8-sig', newline='') as archivo:
        return {(f['caso'], f['item']): f['repregunta'] for f in csv.DictReader(archivo) if f['corrida'] == '1'}


def columna_referencia(primera, referencia):
    if primera['caso'] == 'nuevo':
        return '— (caso nuevo)'
    if primera['caso'].startswith('S'):
        return '— (v6.10 solo tiene la repregunta tras el seguimiento)'
    return referencia.get((primera['caso'], primera['item'])) or '*(sin repregunta)*'


def asignar_columnas(casos, numeros, semilla):
    """{número: True si X es A}, barajado con la semilla. El reparto parejo (±1) se cuenta sobre las filas en que X e Y
    difieren: donde son iguales no hay nada que cegar."""
    distintas = [n for n in numeros if casos[n]['A']['primera']['repregunta'] != casos[n]['B']['primera']['repregunta']]
    orden = [i % 2 == 0 for i in range(len(distintas))]
    random.Random(semilla).shuffle(orden)
    barajado = dict(zip(distintas, orden))
    return {n: barajado.get(n, True) for n in numeros}


def seccion_clasificacion(casos, medidas):
    lineas = ['## a) Clasificación (medido)', '',
              '| # | Caso · ítem | Texto | Marcó | Esperado | A | B | ¿Coincide? (A / B) | Motivo A | Motivo B |',
              '|---|---|---|---|---|---|---|---|---|---|']
    for numero, por_caso in casos.items():
        a, b = por_caso['A'], por_caso['B']
        primera = a['primera']
        marca = lambda m: 'sí' if acierta(m) else '**no**'  # noqa: E731
        lineas.append(f"| {numero} | {primera['caso']} · {primera['item'].removeprefix('b1-1-')} | {celda(primera['texto'])} | "
                      f"{celda(primera['opciones']) or '—'} | {esperado_de(primera)} | {obtenido_de(a)} | {obtenido_de(b)} | "
                      f"{marca(a)} / {marca(b)} | {celda(a['primera']['motivo'])} | {celda(b['primera']['motivo'])} |")
    lineas += ['', 'En los casos con seguimiento, el motivo es el de la primera respuesta. El caso 21 se cuenta por `sensible`, no por `tipo`.', '',
               '| Medida | A | B |', '|---|---|---|']
    filas = (('Acierto', lambda m: f"{m['aciertos']}/{m['total']}"),
             ('Invitaciones de más (`propio` → otro tipo)', lambda m: lista_casos(m['invitaciones'])),
             ('Pases de menos (`vacio` o `fuera_de_tema` → `propio`)', lambda m: lista_casos(m['pases'])),
             ('`sensible`: falsos negativos', lambda m: lista_casos(m['fn'])),
             ('`sensible`: falsos positivos', lambda m: lista_casos(m['fp'])),
             ('Errores de API o de esquema', lambda m: str(m['errores'])))
    lineas += [f"| {nombre} | {valor(medidas['A'])} | {valor(medidas['B'])} |" for nombre, valor in filas]
    return lineas


def seccion_ciega(casos, columnas, semilla):
    referencia = referencia_v6_10()
    lineas = ['## b) Repreguntas, tabla ciega', '',
              f'Solo los casos con repregunta en la primera respuesta. X e Y están barajadas con la semilla {semilla}; la clave va al final. '
              'Donde X e Y coinciden, B copió la base o no pasó el filtro. El reparto parejo se cuenta sobre las filas en que difieren. '
              'La tercera columna no es ciega.', '',
              '| # | Caso · ítem | Texto | Marcó | X | Y | v6.10, corrida 1 (referencia) |', '|---|---|---|---|---|---|---|']
    for numero, x_es_a in columnas.items():
        a, b = casos[numero]['A']['primera'], casos[numero]['B']['primera']
        x, y = (a, b) if x_es_a else (b, a)
        texto = lambda f: celda(f['repregunta']) or '*(sin repregunta)*'  # noqa: E731
        lineas.append(f"| {numero} | {a['caso']} · {a['item'].removeprefix('b1-1-')} | {celda(a['texto'])} | {celda(a['opciones']) or '—'} | "
                      f"{texto(x)} | {texto(y)} | {celda(columna_referencia(a, referencia))} |")
    return lineas


def seccion_filtro(filas):
    de_b = [f for f in filas if f['metodo'] == 'B' and f['turno'] == 'primera' and not f['error']]
    rechazadas = [f for f in de_b if f['origen'] == 'base_por_filtro']
    redactadas = [f for f in de_b if f['origen'] in ('llm', 'base_por_filtro')]
    sin_redactar = [f for f in de_b if f['origen'] == 'base_sin_redactar']
    ignoradas = [f for f in filas if f['metodo'] == 'B' and f['ignorada']]
    reglas = Counter(r for f in rechazadas for r in f['filtro'].split())
    copias = [f for f in redactadas if f['repregunta_llm'].strip() == bases_de(f['item'], f['opciones'].split(', ') if f['opciones'] else [])[f['tipo']]]
    lineas = ['## c) Filtro de B (medido)', '',
              f'- Repreguntas redactadas por el modelo: {len(redactadas)}. No pasaron el filtro: **{len(rechazadas)}**'
              + (f" (#{', #'.join(f['numero'] for f in rechazadas)})." if rechazadas else '.'),
              f"- Copias literales de la base, hayan pasado o no: {len(copias)}"
              + (f" (#{', #'.join(f['numero'] for f in copias)})." if copias else '.'),
              f"- Debía redactar y no lo hizo (se usó la base): {len(sin_redactar)}"
              + (f" (#{', #'.join(f['numero'] for f in sin_redactar)})." if sin_redactar else '.'),
              f'- Redactó cuando no correspondía (se descartó): {len(ignoradas)}.']
    if reglas:
        lineas += ['', '| Regla | Veces |', '|---|---|'] + [f'| `{regla}` | {veces} |' for regla, veces in reglas.most_common()]
    return lineas


def seccion_seguimientos(casos):
    lineas = ['## d) Seguimientos (medido)', '',
              '| # | Caso | Método | `tipo` de la primera | Invitación | `tipo` del conjunto | `tipo` final | Estado | Esperado |',
              '|---|---|---|---|---|---|---|---|---|']
    for numero, por_caso in casos.items():
        for metodo in 'AB':
            s = por_caso[metodo].get('seguimiento')
            if s:
                invitacion = 'respaldo (texto fijo del esperado)' if s['invitacion_respaldo'] else 'la del método'
                lineas.append(f"| {numero} | {s['caso']} | {metodo} | {por_caso[metodo]['primera']['tipo']} | {invitacion} | {s['tipo']} | "
                              f"{s['tipo_final']} | {s['estado'] or '—'} | {esperado_de(s)} |")
    return lineas


def seccion_clave(filas, columnas):
    lineas = ['## Clave de la tabla ciega', '', '| # | X | Y |', '|---|---|---|']
    lineas += [f"| {n} | {'A' if x_es_a else 'B'} | {'B' if x_es_a else 'A'} |" for n, x_es_a in columnas.items()]
    rechazadas = [f for f in filas if f['origen'] == 'base_por_filtro']
    if rechazadas:
        lineas += ['', 'Repreguntas de B que no pasaron el filtro:', '', '| # | Repregunta | Reglas |', '|---|---|---|']
        lineas += [f"| {f['numero']} | {celda(f['repregunta_llm'])} | {celda(f['filtro'])} |" for f in rechazadas]
    return lineas


def escribir_informe(ruta_csv, semilla, notas=None):
    filas, casos = leer_csv(ruta_csv)
    medidas = {metodo: medir(casos, metodo) for metodo in 'AB'}
    numeros = [n for n, c in casos.items() if c['A']['primera']['repregunta'] or c['B']['primera']['repregunta']]
    columnas = asignar_columnas(casos, numeros, semilla)
    primera = filas[0]
    llamadas = sum(1 for f in filas if not f['error'])
    errores = sum(1 for f in filas if f['error'])
    lineas = ['# b1-1 con tarjetas y clasificación nueva (métodos A y B)', '',
              f"`{primera['modelo']}` · {primera['razonamiento']}, temperatura {primera['temperatura']}, una corrida por método, "
              f"{llamadas} llamadas con respuesta, {errores} con error. CSV: [{Path(ruta_csv).name}]({Path(ruta_csv).name}).", '',
              '**A:** el LLM solo clasifica y la repregunta es el texto fijo. **B:** el LLM clasifica y redacta; si no pasa el filtro, se usa el texto fijo.', '']
    for seccion in (seccion_clasificacion(casos, medidas), seccion_ciega(casos, columnas, semilla), seccion_filtro(filas),
                    seccion_seguimientos(casos), ['## e) Notas', '', notas or '_Pendiente._'], seccion_clave(filas, columnas)):
        lineas += seccion + ['']
    INFORME.write_text('\n'.join(lineas), encoding='utf-8')
    return medidas


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser()
    parser.add_argument('--metodos', nargs='+', choices=('A', 'B'), default=['A', 'B'])
    parser.add_argument('--modelo', default=parametros.MODELO_LLM_REGISTRO)
    parser.add_argument('--razonamiento', default=parametros.NIVEL_RAZONAMIENTO_REGISTRO, choices=('minimal', 'low', 'medium', 'high'))
    parser.add_argument('--semilla', type=int, default=SEMILLA, help='baraja de X e Y en la tabla ciega')
    parser.add_argument('--hilos', type=int, default=8)
    parser.add_argument('--etiqueta', default='')
    parser.add_argument('--informe', help='rehace el informe desde este CSV, sin llamar al modelo')
    parser.add_argument('--mostrar', nargs=2, metavar=('NUMERO', 'METODO'), help='imprime el prompt y el mensaje, sin llamar')
    args = parser.parse_args()

    if args.informe:
        print(escribir_informe(args.informe, args.semilla))
        return
    casos = cargar_casos()
    for caso in casos:
        bases_de(caso['item'], caso['etiquetas'])
    if args.mostrar:
        caso = next(c for c in casos if c['numero'] == int(args.mostrar[0]))
        print(PROMPTS[args.mostrar[1]], '\n----\n', mensaje(caso['item'], caso['etiquetas'], caso['texto']), sep='')
        return

    clave, _ = base.entorno()
    if not clave:
        sys.exit('Falta GEMINI_API_KEY (en el entorno o en el .env del backend)')
    cliente = base.adaptador.genai.Client(api_key=clave)
    razonamiento = base.config_razonamiento(args.modelo, args.razonamiento)
    nivel = base.nombre_razonamiento(razonamiento)
    temperatura = parametros.TEMPERATURA_REGISTRO
    comun = dict(modelo=args.modelo, razonamiento=nivel, temperatura=temperatura)
    llamada = lambda metodo, contenido: llamar(cliente, args.modelo, razonamiento, metodo, contenido, temperatura)  # noqa: E731
    tareas = [(m, c) for m in args.metodos for c in casos]
    print(f'{len(tareas)} casos ({len(args.metodos)} métodos)')
    with ThreadPoolExecutor(max_workers=args.hilos) as pool:
        filas = [f for grupo in pool.map(lambda t: ejecutar(llamada, *t, comun), tareas) for f in grupo]
    destino = guardar(filas, args.modelo, nivel, temperatura, args.etiqueta)
    medidas = escribir_informe(destino, args.semilla)
    print(destino.name)
    print('\n'.join(agregar_resumen(destino, args.modelo, nivel, temperatura, medidas)))


if __name__ == '__main__':
    main()
