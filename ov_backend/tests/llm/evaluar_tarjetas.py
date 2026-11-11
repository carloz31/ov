"""Runner de las tarjetas v7 (método B) sobre la capa del LLM del backend (`app/services/registro/llm`, lote 1).

No es pytest. El armado del mensaje, la llamada (Claude Haiku), la validación, el filtro, el arranque, el estado final y
el texto citable son los del backend: aquí solo quedan los casos, cómo se resuelven (opción marcada, pregunta, ecos,
marcadores), el chequeo de solapamiento con la tarjeta, la forma de las repreguntas y los informes. Las tarjetas son las
de `datos/tarjetas_registros`. Las corridas v7.x y piloto-claude-* quedan en sus CSV e informes; el código con que
corrieron (incluido el brazo Gemini) está en el historial de git.

Uso, desde ov_backend (la clave es `ANTHROPIC_API_KEY` del `.env` del backend):
    uv run python tests/llm/evaluar_tarjetas.py --casos b5-3-tarjetas-v7.12c.json --revisar   # solapamiento, sin llamar
    uv run python tests/llm/evaluar_tarjetas.py --casos b5-3-tarjetas-v7.12c.json --mostrar 6  # prompt y mensaje, sin llamar
    uv run python tests/llm/evaluar_tarjetas.py --manifiesto piloto-claude-3 --repeticiones 3 --etiqueta equivalencia
    uv run python tests/llm/evaluar_tarjetas.py --seguimientos --etiqueta seguimientos      # todos los seguimientos, sin repetidos
    uv run python tests/llm/evaluar_tarjetas.py --informe <csv> [--anterior <csv>]            # rehace el informe, sin llamar
"""

import argparse
import csv
import hashlib
import json
import re
import statistics
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.config import cargar_configuracion  # noqa: E402
from app.models.base import sin_tildes  # noqa: E402
from app.services.registro.llm import (HASH_PROMPT, PROMPT, VERSION_PROMPT_LLM, ClienteClaude, Entrada,  # noqa: E402
                                       estado_final, evaluar_primera, evaluar_seguimiento, tarjeta_para)
from datos.contenido import ITEMS_REGISTRO, REFERENCIAS  # noqa: E402
from datos.fijos import LISTAS_COMUNES  # noqa: E402
from datos.tarjetas_registros import HASHES, TARJETAS  # noqa: E402

# Ajuste registros llm (lote 2): la presentación (pregunta mostrada, ecos al LLM, podio) es la de los ítems de
# `datos/contenido`, sin copia propia; las tarjetas solo traen lo que usa el LLM.
ITEMS = {i[1]: i for i in ITEMS_REGISTRO}
LISTAS = {codigo: dict(opciones) for codigo, _nombre, opciones in LISTAS_COMUNES}
FUENTES_REFERENCIA = {r[0]: r[3] for r in REFERENCIAS}

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
CASOS = AQUI / 'casos'
CARPETA = AQUI / 'resultados' / 'capa-llm'
CAPA = RAIZ / 'app' / 'services' / 'registro' / 'llm'
ESPERADOS = ('tipo_esperado', 'conjunto_esperado', 'final_esperado', 'sensible_esperado')


# --- Casos -----------------------------------------------------------------------------------

_archivos = {}


def casos_de_archivo(nombre):
    """{número: caso} de un archivo de casos v7.x: un caso con `de` hereda el de su corrida (sin `corrida`, la base de la
    serie: v7.5b → v7.5) y lo que traiga además lo reemplaza; un caso con `caso` toma texto y opciones de `<registro>.json`."""
    if nombre in _archivos:
        return _archivos[nombre]
    registro = nombre.split('-tarjetas')[0]
    ruta_registro = CASOS / f'{registro}.json'
    existentes = {c['id']: c for c in json.loads(ruta_registro.read_text(encoding='utf-8'))['casos']} if ruta_registro.exists() else {}
    salida = {}
    for caso in json.loads((CASOS / nombre).read_text(encoding='utf-8'))['casos']:
        if 'de' in caso:
            corrida = caso.get('corrida') or re.sub(r'[a-z]+$', '', nombre.split('-tarjetas-')[1].removesuffix('.json'))
            caso = {**casos_de_archivo(f'{registro}-tarjetas-{corrida}.json')[caso['de']], **{k: v for k, v in caso.items() if k not in ('de', 'corrida')}}
        caso = dict(caso, archivo_origen=nombre)
        if caso.get('caso', 'nuevo') != 'nuevo':
            existente = existentes[caso['caso']]
            item = next(i for i in existente['items'] if i['item'] == caso['item']) if 'items' in existente else existente
            caso.update(texto=item['texto'], opciones=item['opciones'])
        if 'numero' in caso:
            salida[caso['numero']] = dict(caso, numero_origen=caso['numero'])
    _archivos[nombre] = salida
    return salida


def preparar(caso):
    """Agrega `etiquetas` (lo que se marcó, ya resuelto) y, si el caso trae ecos que son solo elecciones, sus líneas."""
    caso['etiquetas'] = (list(textos_elegidos(caso['item'], caso['opciones'])) if caso['item'] in ITEMS
                         else [o['texto'] for o in caso['opciones']])
    if 'ecos_cruce' in caso:
        caso['ecos_lineas'] = lineas_ecos(caso)
    caso.setdefault('id', f"{caso['archivo_origen'].removesuffix('.json')}#{caso['numero_origen']}")
    caso.setdefault('grupo', 'principal')
    return caso


def casos_del_archivo(nombre):
    """Los casos del archivo, ya preparados. Un caso que no calza con el contenido vigente (una opción o un eco que el
    rediseño quitó: `NO_RECUERDO`, el eco `cuesta`, la variante «Hoy» de b5-3) queda fuera con un aviso."""
    casos, fuera = [], []
    for n, c in enumerate(casos_de_archivo(nombre).values(), 1):
        try:
            casos.append(preparar(dict(c, numero=n)))
        except (KeyError, ValueError, SystemExit) as error:
            fuera.append(f"#{c.get('numero_origen', n)} ({c['item']}): {error}")
    if fuera:
        print(f'{nombre}: fuera por no calzar con el contenido vigente:\n  ' + '\n  '.join(fuera))
    return casos


def casos_del_manifiesto(nombre):
    """Los casos de un manifiesto (piloto-claude-*), con los esperados del manifiesto y un número correlativo."""
    manifiesto = json.loads((CASOS / f'{nombre}.json').read_text(encoding='utf-8'))
    casos = []
    for numero, entrada in enumerate(manifiesto['casos'], 1):
        origen = casos_de_archivo(entrada['archivo'])[entrada['numero_origen']]
        caso = {k: v for k, v in origen.items() if k not in (*ESPERADOS, 'repeticiones', 'grupo', 'clave')}
        if 'ecos_cruce' in entrada:
            caso['ecos_cruce'] = entrada['ecos_cruce']
        caso.update({k: entrada[k] for k in ESPERADOS if k in entrada}, numero=numero, id=entrada['id'], grupo=entrada['grupo'])
        casos.append(preparar(caso))
    return casos


def _orden_version(nombre):
    """Para quedarse con el caso más reciente: sin versión (la primera ronda) va antes que v7.x."""
    version = nombre.removesuffix('.json').split('-tarjetas')[1].lstrip('-')
    return [int(p) if p.isdigit() else p for p in re.findall(r'\d+|[a-z]+', version)]


def casos_de_seguimiento():
    """Todos los casos con `respuesta_seguimiento` de los `casos/*-tarjetas*.json`, sin repetidos (mismo ítem, opciones,
    textos, ecos y marcadores); de los repetidos queda el de la corrida más reciente, con su esperado."""
    unicos = {}
    for ruta in sorted(CASOS.glob('*-tarjetas*.json'), key=lambda r: (r.name.split('-tarjetas')[0], _orden_version(r.name))):
        for caso in casos_de_archivo(ruta.name).values():
            if 'respuesta_seguimiento' not in caso or caso['item'] not in TARJETAS:
                continue
            clave = json.dumps([caso['item'], caso.get('opciones'), caso['texto'], caso['respuesta_seguimiento'],
                                caso.get('ecos'), caso.get('ecos_cruce'), caso.get('marcadores')], ensure_ascii=False, sort_keys=True)
            unicos[clave] = caso
    casos, fuera = [], []
    for caso in unicos.values():
        caso = preparar(dict(caso, numero=len(casos) + 1, grupo='seguimiento'))
        try:
            entrada_de(caso, caso['texto'])
        except (KeyError, ValueError, SystemExit) as error:  # opciones de una tarjeta anterior (EN_PARTE en b2-4-cruce, v7.6)
            fuera.append(f"{caso['id']} ({caso['item']}): {error!r}")
            continue
        casos.append(caso)
    if fuera:
        print('Fuera por no calzar con la tarjeta vigente:\n  ' + '\n  '.join(fuera))
    return casos


# --- Lo que el runner resuelve: opción, pregunta, ecos y marcadores ---------------------------

def presentacion(codigo_item):
    return ITEMS[codigo_item][3]


def eleccion(codigo_item):
    return ITEMS[codigo_item][4] or {}


def propias(codigo_item):
    return {o['codigo']: o for o in eleccion(codigo_item).get('propias', ())}


def textos_elegidos(codigo_item, elegidas):
    """Los textos de lo marcado: la etiqueta de la lista o de la opción propia, o el texto que trae el caso («Otra»)."""
    textos = {**LISTAS.get(eleccion(codigo_item).get('lista'), {}),
              **{c: o['texto'] for c, o in propias(codigo_item).items()}}
    salida = []
    for e in elegidas:
        if isinstance(e, dict):
            salida.append(e['texto'])
        elif e in textos:
            salida.append(textos[e])
        else:
            raise SystemExit(f'Opción {e} no existe en {codigo_item}')
    return tuple(salida)


def codigo_opcion(caso):
    primera = caso['opciones'][0] if caso['opciones'] else None
    return primera['codigo'] if isinstance(primera, dict) else primera


def ficha_de(caso):
    ficha = TARJETAS[caso['item']]
    return ficha.get('por_opcion', {}).get(codigo_opcion(caso), ficha)


def con_marcadores(texto, caso):
    for marcador, valor in caso.get('marcadores', {}).items():
        texto = texto.replace(f'{{{marcador}}}', valor)
    return texto


def lista_del_eco(eco):
    """La lista con que se nombran los códigos de un eco de elección: la del ítem fuente (directo o por referencia)."""
    fuente = eco['codigo'] if eco['origen'] != 'REFERENCIA' else FUENTES_REFERENCIA.get(eco['codigo'])
    return LISTAS.get(eleccion(fuente).get('lista'), {}) if fuente in ITEMS else {}


def claves_del_eco(eco):
    """[(clave en `ecos_cruce` del caso, nombre de la línea)]: la forma `plan_a_b` da dos líneas; `carrera` es el Plan A,
    `carrera_institucion` el proyecto, y en el resto la clave es la última parte del código (`b2-4-bien` → `bien`)."""
    if eco.get('forma') == 'plan_a_b':
        return [('plan_a', 'Plan A'), ('plan_b', 'Plan B')]
    clave = {'carrera': 'plan_a', 'carrera_institucion': 'proyecto'}.get(eco.get('forma'), eco['codigo'].rsplit('-', 1)[-1])
    return [(clave, eco.get('nombre') or clave)]


def lineas_ecos(caso):
    """Los ecos al LLM del ítem (`ecos_llm` del contenido) con los valores del caso, una línea por eco."""
    lineas, declaradas = [], set()
    for eco in presentacion(caso['item']).get('ecos_llm') or ():
        etiquetas = lista_del_eco(eco)
        for clave, nombre in claves_del_eco(eco):
            declaradas.add(clave)
            if clave in caso['ecos_cruce']:
                nombres = [v['texto'] if isinstance(v, dict) else etiquetas.get(v, v) for v in caso['ecos_cruce'][clave]]
                lineas.append(f'{nombre}: ' + ', '.join(nombres))
    ajenas = set(caso['ecos_cruce']) - declaradas
    if ajenas:
        raise ValueError(f"{caso['item']} no declara los ecos {sorted(ajenas)} en el contenido")
    return lineas


def ecos_de(caso):
    """Los ecos como líneas: nombre del ítem, opción elegida y texto (b1-3), o las líneas de `ecos_cruce`."""
    if 'ecos_lineas' in caso:
        return tuple(caso['ecos_lineas'])
    return tuple(f"{ITEMS[f'b1-3-{clave}'][2]}: {textos_elegidos(f'b1-3-{clave}', [eco['opcion']])[0]}. «{eco['texto']}»"
                 for clave, eco in caso.get('ecos', {}).items())


def _primera_del_eco(caso, codigo_eco):
    """El primero de la elección de un eco (`{primera}`, `{valor 1}`), con la etiqueta de su lista."""
    eco = next(e for e in presentacion(caso['item']).get('ecos_llm') or () if e['codigo'] == codigo_eco)
    clave, _ = claves_del_eco(eco)[0]
    primero = caso['ecos_cruce'][clave][0]
    return (primero['texto'], True) if isinstance(primero, dict) else (lista_del_eco(eco)[primero], False)


def pregunta_de(caso):
    """La pregunta del texto de la opción marcada o, si no tiene, la del ítem; `{primera}` en minúscula (formato del
    runner; una «Otra» va tal cual) y `{valor 1}` con la etiqueta del valor."""
    propia = propias(caso['item']).get(codigo_opcion(caso)) or {}
    pregunta = propia.get('pregunta') or presentacion(caso['item'])['pregunta_texto']
    if '{primera}' in pregunta:
        primera, es_otra = _primera_del_eco(caso, 'b2-4-bien')
        pregunta = pregunta.replace('{primera}', primera if es_otra else primera.lower())
    if '{valor 1}' in pregunta:
        pregunta = pregunta.replace('{valor 1}', _primera_del_eco(caso, 'b3-4-ref-valores')[0])
    return con_marcadores(pregunta, caso)


def ordenada(caso):
    return bool(eleccion(caso['item']).get('ordenada'))


def entrada_de(caso, respuesta, anterior=None, invitacion=None):
    tarjeta = tarjeta_para(TARJETAS[caso['item']], codigo_opcion(caso), caso['etiquetas'], caso.get('marcadores'))
    return Entrada(tarjeta=tarjeta, pregunta=pregunta_de(caso), respuesta=respuesta, etiquetas=tuple(caso['etiquetas']),
                   ordenada=ordenada(caso), ecos=ecos_de(caso), respuesta_anterior=anterior, invitacion=invitacion)


# --- Chequeo de solapamiento con la tarjeta ---------------------------------------------------

def _comparable(texto):
    return f" {' '.join(re.findall(r'\w+', sin_tildes(texto)))} "


def frases_de(tarjeta):
    """Los EJEMPLOS y las frases entre comillas de GENERAL SI y, si la tarjeta lo tiene, del bloque SEGUIMIENTO."""
    general = re.search(r'^GENERAL SI:(.*?)^(?:MATICES|EJEMPLOS):', tarjeta, re.S | re.M).group(1)
    ejemplos = re.search(r'^EJEMPLOS:(.*?)^REPREGUNTA', tarjeta, re.S | re.M).group(1)
    seguimiento = re.search(r'^SEGUIMIENTO:(.*)', tarjeta, re.S | re.M)
    return (re.findall(r'"([^"]+)"', general) + re.findall(r'^\s*"([^"]+)"', ejemplos, re.M)
            + (re.findall(r'"([^"]+)"', seguimiento.group(1)) if seguimiento else []))


def solapamientos(casos):
    hallados = []
    for caso in (c for c in casos if not c.get('solapamiento_aceptado')):
        frases = frases_de(ficha_de(caso)['tarjeta'])
        for texto in filter(None, (caso['texto'], caso.get('respuesta_seguimiento'))):
            hallados += [(caso['id'], texto, f) for f in frases if _comparable(f) in _comparable(texto)]
    return hallados


# --- Corrida ---------------------------------------------------------------------------------

def archivos_de(casos_usados):
    rutas = [Path(__file__).resolve(), *sorted(CAPA.glob('*.py')), *sorted((RAIZ / 'datos' / 'tarjetas_registros').glob('*.py')),
             *(CASOS / n for n in sorted(casos_usados))]
    return {r.relative_to(RAIZ).as_posix(): subprocess.run(['git', 'hash-object', str(r)], capture_output=True, text=True,
                                                          check=True, cwd=RAIZ).stdout.strip() for r in rutas}


def campos_llamada(e):
    c = e.llamada
    return dict(json=c.texto if c else '', parada=c.parada if c else '', latencia_ms=c.latencia_ms if c else '',
                tokens_entrada=c.tokens_entrada if c else '', tokens_razonamiento=c.tokens_razonamiento if c else '',
                tokens_salida=c.tokens_salida if c else '')


def campos_evaluacion(e):
    return dict(sin_evaluar='sí' if e.sin_evaluar else '', causa_fallo=e.causa_fallo or '', motivo=e.motivo or '', tipo=e.tipo or '',
                sensible=e.sensible, repregunta_llm=e.repregunta_modelo or '', repregunta=e.repregunta or '',
                origen=e.causa_base or ('llm' if e.repregunta else ''), filtro=' '.join(e.reglas_filtro),
                apertura='sí' if e.apertura else '', **campos_llamada(e))


def ejecutar(cliente, caso, comun, corrida):
    """Las filas de un caso en una corrida: la primera respuesta y, si tiene, el seguimiento."""
    fila = dict(comun, corrida=corrida, numero=caso['numero'], id=caso['id'], grupo=caso['grupo'], item=caso['item'],
                archivo_origen=caso.get('archivo_origen', ''), numero_origen=caso.get('numero_origen', ''),
                tipo_caso=caso.get('tipo_caso', ''), opciones=', '.join(caso['etiquetas']), ecos=' | '.join(ecos_de(caso)),
                **{k: caso.get(k, '') for k in ESPERADOS})
    try:
        p = evaluar_primera(entrada_de(caso, caso['texto']), cliente)
        filas = [dict(fila, turno='primera', texto=caso['texto'], **campos_evaluacion(p))]
        if 'respuesta_seguimiento' not in caso or p.sin_evaluar:
            estado = estado_final(p, caso['texto'])
            filas[0].update(tipo_final=estado.tipo or '', adecuado=estado.adecuado, citable=' ¶ '.join(estado.texto_citable))
            return filas
        # Solo del runner: si el modelo no pidió repregunta, la invitación es la base del tipo esperado (como en sus corridas).
        respaldo = p.repregunta is None
        tarjeta = entrada_de(caso, caso['texto']).tarjeta
        invitacion = p.repregunta or tarjeta.bases.get(caso['tipo_esperado'].split(' o ')[0], tarjeta.bases['general'])
        s = evaluar_seguimiento(entrada_de(caso, caso['respuesta_seguimiento'], caso['texto'], invitacion), cliente)
        estado = estado_final(p, caso['texto'], s)
        filas.append(dict(fila, turno='seguimiento', texto=caso['respuesta_seguimiento'], **campos_evaluacion(s),
                          invitacion=invitacion, invitacion_respaldo='sí' if respaldo else '', arranque_llm=s.arranque_modelo or '',
                          arranque=s.arranque or '', causa_arranque=s.causa_arranque or '', linea=s.linea or '',
                          tipo_final=estado.tipo or '', sensible_final=estado.sensible, adecuado=estado.adecuado,
                          estado='sensible' if estado.sensible else 'abierto' if estado.abierto else '', pista=estado.pista or '',
                          citable=' ¶ '.join(estado.texto_citable)))
        return filas
    except Exception as error:  # noqa: BLE001  (un error del runner queda en el CSV)
        return [dict(fila, turno='primera', texto=caso['texto'], error=repr(error)[:300])]


CAMPOS = ['corrida', 'numero', 'id', 'grupo', 'item', 'archivo_origen', 'numero_origen', 'tipo_caso', 'turno', 'texto', 'opciones', 'ecos',
          *ESPERADOS, 'sin_evaluar', 'causa_fallo', 'motivo', 'tipo', 'sensible', 'repregunta_llm', 'repregunta', 'origen', 'filtro', 'apertura',
          'invitacion', 'invitacion_respaldo', 'arranque_llm', 'arranque', 'causa_arranque', 'linea', 'tipo_final', 'sensible_final', 'adecuado',
          'estado', 'pista', 'citable', 'modelo', 'prompt', 'json', 'parada', 'latencia_ms', 'tokens_entrada', 'tokens_razonamiento',
          'tokens_salida', 'archivos', 'error']


def guardar(filas, etiqueta):
    CARPETA.mkdir(parents=True, exist_ok=True)
    filas.sort(key=lambda f: (f['numero'], f['corrida'], f['turno']))
    destino = CARPETA / f"{datetime.now():%Y-%m-%d_%H%M}_{VERSION_PROMPT_LLM}{'_' + etiqueta if etiqueta else ''}.csv"
    with destino.open('w', newline='', encoding='utf-8-sig') as archivo:
        escritor = csv.DictWriter(archivo, fieldnames=CAMPOS)
        escritor.writeheader()
        escritor.writerows(filas)
    return destino


# --- Informe (se arma solo desde el CSV) -----------------------------------------------------

def celda(valor):
    return str(valor or '').replace('|', '\\|').replace('\n', ' ')


def leer_csv(ruta):
    with Path(ruta).open(encoding='utf-8-sig', newline='') as archivo:
        filas = list(csv.DictReader(archivo))
    casos = {}
    for f in filas:
        casos.setdefault(f['id'], {}).setdefault(int(f['corrida']), {})[f['turno']] = f
    return filas, casos


def _uno_de(valor, esperado):
    return valor in esperado.split(' o ')


def acierta(por_caso):
    """La primera contra `tipo_esperado` y, si el caso lo declara, el conjunto y el final; `sensible` manda."""
    p, s = por_caso['primera'], por_caso.get('seguimiento')
    if p['error'] or p['sin_evaluar'] or (s and s['sin_evaluar']):
        return False
    sensible = any(f['sensible'] == 'True' for f in por_caso.values())
    if p['sensible_esperado'] == 'True':
        return sensible
    if sensible:
        return False
    if p['conjunto_esperado'] and not (s and _uno_de(s['tipo'], p['conjunto_esperado'])):
        return False
    if p['final_esperado'] and not (s and _uno_de(s['tipo_final'], p['final_esperado'])):
        return False
    return not p['tipo_esperado'] or _uno_de(p['tipo'], p['tipo_esperado'])


def esperado_de(p):
    if p['sensible_esperado'] == 'True':
        return '`sensible`'
    salida = p['tipo_esperado'] or '—'
    if p['conjunto_esperado']:
        salida += f" → conjunto {p['conjunto_esperado']}"
    if p['final_esperado']:
        salida += f" → final {p['final_esperado']}"
    return salida


def obtenido_de(por_caso):
    p, s = por_caso['primera'], por_caso.get('seguimiento')
    if p['error']:
        return 'error del runner'
    if p['sin_evaluar']:
        return f"sin_evaluar ({p['causa_fallo']})"
    salida = p['tipo'] + (' · sensible' if p['sensible'] == 'True' else '')
    if s:
        salida += (f" → sin_evaluar ({s['causa_fallo']})" if s['sin_evaluar'] else
                   f" → conjunto {s['tipo']} → final {s['tipo_final']}" + (' · sensible' if s['sensible'] == 'True' else ''))
    return salida


SIGA_IGUAL = '¿Qué crees que hizo que siga igual?'


def forma_de(f):
    """La repregunta mostrada frente a la tarjeta: la base de un tipo tal cual o redactada; en b5-3-cambio, sus formas."""
    texto = (f['repregunta'] or '').strip()
    if not texto:
        return '—'
    caso = {'item': f['item'], 'opciones': [{'codigo': 'IGUAL' if f['opciones'] == 'Lo veo todo igual' else 'PIEZA'}]}
    tarjeta = tarjeta_para(TARJETAS[f['item']], codigo_opcion(caso)) if f['item'] == 'b5-3-cambio' else None
    if tarjeta:
        if texto == SIGA_IGUAL:
            return 'siga igual'
        bases = tarjeta.bases
        if texto == bases['general']:
            return 'BASE'
        if codigo_opcion(caso) != 'IGUAL' and texto.endswith(bases['general']) and '?' not in texto[:-len(bases['general'])]:
            return 'frase + BASE'
    return 'base tal cual' if f['origen'] in ('base_sin_redactar', 'base_por_filtro') else 'redactada'


def medidas(filas, casos):
    pc = [c for por_corrida in casos.values() for c in por_corrida.values()]
    llamadas = [f for f in filas if f['latencia_ms']]
    latencias = sorted(int(f['latencia_ms']) for f in llamadas)
    salida = [int(f['tokens_salida'] or 0) + int(f['tokens_razonamiento'] or 0) for f in llamadas]
    caidas, fallos, arranques = {}, {}, {}
    for f in filas:
        for regla in f['filtro'].split():
            caidas[regla.split(':')[0]] = caidas.get(regla.split(':')[0], 0) + 1
        if f['sin_evaluar']:
            fallos[f['causa_fallo']] = fallos.get(f['causa_fallo'], 0) + 1
        if f['turno'] == 'seguimiento' and not f['sin_evaluar']:
            clave = 'pasó' if f['arranque'] else f['causa_arranque']
            arranques[clave] = arranques.get(clave, 0) + 1
    return dict(aciertos=sum(acierta(c) for c in pc), total=len(pc), caidas=caidas, fallos=fallos, arranques=arranques,
                errores=sum(bool(f['error']) for f in filas), llamadas=len(llamadas),
                latencia=(statistics.median(latencias) if latencias else 0, latencias[max(0, -(-len(latencias) * 95 // 100) - 1)] if latencias else 0),
                salida_max=max(salida, default=0))


def tipos_de(por_corrida):
    return [f"{c['primera']['tipo'] or 'falla'}" + (f"→{c['seguimiento']['tipo']}" if c.get('seguimiento') else '') for _, c in sorted(por_corrida.items())]


def escribir_informe(ruta_csv, anterior=None):
    filas, casos = leer_csv(ruta_csv)
    m = medidas(filas, casos)
    primera = filas[0]
    lista = lambda d: ', '.join(f'{k}: {v}' for k, v in sorted(d.items())) or 'ninguna'  # noqa: E731
    grupos = {}
    for por_corrida in casos.values():
        for c in por_corrida.values():
            grupos.setdefault(c['primera']['grupo'], []).append(acierta(c))
    L = [f'# Capa del LLM: {Path(ruta_csv).stem}', '',
         f"`{primera['modelo']}`, prompt `{primera['prompt']}`. {len(casos)} casos, {m['total']} corridas de caso, {m['llamadas']} llamadas con respuesta. "
         f'CSV: [{Path(ruta_csv).name}]({Path(ruta_csv).name}).', '',
         '## 1. Archivos', '', '| Ruta | `git hash-object` |', '|---|---|',
         *[f'| `{r}` | `{h}` |' for r, h in json.loads(primera['archivos']).items()], '',
         '## 2. Resumen', '',
         f"- **Clasificación contra el esperado:** {m['aciertos']}/{m['total']} ({', '.join(f'{g}: {sum(v)}/{len(v)}' for g, v in grupos.items())}).",
         f"- **`sin_evaluar`:** {lista(m['fallos'])}. Errores del runner: {m['errores']}.",
         f"- **Caídas del filtro, por regla:** {lista(m['caidas'])}.",
         f"- **Arranques del seguimiento:** {lista(m['arranques'])}.",
         f"- **Latencia** mediana / p95: {m['latencia'][0]:.0f} / {m['latencia'][1]} ms. Máximo de tokens de salida (con razonamiento): {m['salida_max']}.", '',
         '## 3. Casos', '', '| Caso | Grupo | Ítem | Opción | Texto | Esperado | Obtenido | ¿Coincide? |', '|---|---|---|---|---|---|---|---|']
    for i, por_corrida in casos.items():
        for _, c in sorted(por_corrida.items()):
            p = c['primera']
            L.append(f"| {i} | {p['grupo']} | {p['item']} | {celda(p['opciones'])} | {celda(p['texto'])} | {esperado_de(p)} | {obtenido_de(c)} | {'sí' if acierta(c) else '**no**'} |")
    seguimientos = [(i, n, c) for i, por_corrida in casos.items() for n, c in sorted(por_corrida.items()) if c.get('seguimiento')]
    if seguimientos:
        L += ['', '## 4. Arranques y línea del seguimiento', '',
              'La línea se revisa a ojo: basta con que se entienda. «Propuesta» es la de Claude; la confirma el usuario.', '',
              '| Caso | Primera respuesta | Repregunta mostrada | Segunda respuesta | Conjunto | Arranque | Chequeo | Línea armada | Citable | Propuesta |',
              '|---|---|---|---|---|---|---|---|---|---|']
        for i, _, c in seguimientos:
            p, s = c['primera'], c['seguimiento']
            invitacion = celda(s['invitacion']) + (' *(respaldo)*' if s['invitacion_respaldo'] else '')
            chequeo = '—' if s['sin_evaluar'] else 'pasó' if s['arranque'] else f"cayó: `{s['causa_arranque']}`"
            L.append(f"| {i} | {celda(p['texto'])} | {invitacion} | {celda(s['texto'])} | {s['tipo'] or 'sin_evaluar'} | {celda(s['arranque_llm']) or '—'} | {chequeo} | "
                     f"{celda(s['linea'])} | {celda(s['citable']) or '— (nada)'} | _pendiente_ |")
    L += ['', '## 5. Repreguntas', '', 'Primera respuesta: la repregunta mostrada; seguimiento: la pista. Cruda → mostrada («=» si es la misma).', '',
          '| Caso | Rep. | Turno | Tipo | Repregunta | Forma | Filtro |', '|---|---|---|---|---|---|---|']
    for i, por_corrida in casos.items():
        for n, c in sorted(por_corrida.items()):
            for turno in ('primera', 'seguimiento'):
                f = c.get(turno)
                if f and (f['repregunta'] or f['repregunta_llm']):
                    cruda, mostrada = celda(f['repregunta_llm']) or '(no redactó)', celda(f['repregunta'])
                    texto = f"{cruda} → {'=' if mostrada == cruda or (f['origen'] == 'llm' and f['apertura']) else mostrada or '(descartada)'}"
                    L.append(f"| {i} | {n} | {turno} | {f['tipo']} | {texto} | {forma_de(f)} | {f['filtro'] or '—'} |")
    if anterior:
        _, previos = leer_csv(anterior)
        L += ['', f'## 6. Frente a {Path(anterior).name}', '', 'Solo se reporta: la equivalencia se mide contra el esperado (§2).', '',
              '| Caso | Esperado | Antes | Ahora | ¿Cambia? |', '|---|---|---|---|---|']
        for i, por_corrida in casos.items():
            antes = tipos_de(previos[i]) if i in previos else ['—']
            ahora = tipos_de(por_corrida)
            L.append(f"| {i} | {esperado_de(next(iter(por_corrida.values()))['primera'])} | {' · '.join(antes)} | {' · '.join(ahora)} | "
                     f"{'**sí**' if sorted(antes) != sorted(ahora) else 'no'} |")
    L += ['', '## 7. Notas', '', '_Pendiente._', '']
    informe = Path(ruta_csv).with_suffix('.md')
    informe.write_text('\n'.join(L), encoding='utf-8')
    return informe, m


# --- Entrada ---------------------------------------------------------------------------------

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser()
    fuente = parser.add_mutually_exclusive_group()
    fuente.add_argument('--casos', help='un archivo de casos/*-tarjetas*.json')
    fuente.add_argument('--manifiesto', help='un manifiesto de casos/ (piloto-claude-3)')
    fuente.add_argument('--seguimientos', action='store_true', help='todos los casos con seguimiento, sin repetidos')
    fuente.add_argument('--informe', help='rehace el informe desde este CSV, sin llamar')
    parser.add_argument('--anterior', help='CSV de una corrida anterior con los mismos `id`, para comparar en el informe')
    parser.add_argument('--repeticiones', type=int, default=1)
    parser.add_argument('--hilos', type=int, default=8)
    parser.add_argument('--etiqueta', default='')
    parser.add_argument('--solo', nargs='*', help='solo estos `id`')
    parser.add_argument('--mostrar', help='imprime el prompt y el mensaje de este `id` o número, sin llamar')
    parser.add_argument('--revisar', action='store_true', help='solo el chequeo de solapamiento, sin llamar')
    args = parser.parse_args()

    if args.informe:
        print(escribir_informe(args.informe, args.anterior))
        return
    if args.casos:
        casos, usados = casos_del_archivo(args.casos), {args.casos}
    elif args.manifiesto:
        casos, usados = casos_del_manifiesto(args.manifiesto), {f'{args.manifiesto}.json'}
    else:
        casos = casos_de_seguimiento()
        usados = set()
    usados |= {c['archivo_origen'] for c in casos}
    if args.solo:
        casos = [c for c in casos if c['id'] in args.solo]
    for caso in casos:
        entrada_de(caso, caso['texto'])  # se detiene si una tarjeta no trae sus bases
    if args.mostrar:
        caso = next(c for c in casos if args.mostrar in (c['id'], str(c['numero'])))
        print(PROMPT, '\n----\n', __import__('app.services.registro.llm', fromlist=['armar']).armar(entrada_de(caso, caso['texto'])), sep='')
        return
    hallados = solapamientos(casos)
    print(f'{len(casos)} casos; con seguimiento: {sum("respuesta_seguimiento" in c for c in casos)}; '
          f'llamadas previstas: {sum(1 + ("respuesta_seguimiento" in c) for c in casos) * args.repeticiones}')
    if hallados:
        aviso = '\n'.join(f'{i}: «{t}» contiene «{f}»' for i, t, f in hallados)
        if not args.seguimientos:  # los de --seguimientos ya corrieron en su ronda: solo se informan
            sys.exit('Casos que se solapan con su tarjeta:\n' + aviso)
        print('Casos que se solapan con su tarjeta (ya corrieron en su ronda; se informan):\n' + aviso)
    if args.revisar:
        return
    clave = cargar_configuracion().clave_anthropic
    if not clave:
        sys.exit('Falta ANTHROPIC_API_KEY en el .env del backend')
    cliente = ClienteClaude(clave)
    comun = dict(modelo=cliente.modelo, prompt=f'{VERSION_PROMPT_LLM} ({HASH_PROMPT[:12]})', archivos=json.dumps(archivos_de(usados)))
    tareas = [(c, r) for c in casos for r in range(1, args.repeticiones + 1)]
    with ThreadPoolExecutor(max_workers=args.hilos) as pool:
        filas = [f for grupo in pool.map(lambda t: ejecutar(cliente, t[0], comun, t[1]), tareas) for f in grupo]
    destino = guardar(filas, args.etiqueta)
    informe, m = escribir_informe(destino, args.anterior)
    print(destino.name, informe.name, f"{m['aciertos']}/{m['total']}", 'sin_evaluar:', m['fallos'], 'errores:', m['errores'])


if __name__ == '__main__':
    main()
