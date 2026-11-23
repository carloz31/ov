"""Casos de registro y la `Entrada` de la capa del LLM armada desde ellos, para comparar con `entrada_llm`.

Un caso trae el ítem, lo marcado (códigos o, para una pieza o una «Otra», `{codigo, texto}`), la respuesta y, según el
ítem, sus ecos, sus marcadores y los valores de los ecos que cruzan registros. Desde ellos se resuelve lo mismo que
resuelve el backend: la opción marcada, la pregunta mostrada, los ecos al LLM y la tarjeta. La presentación (pregunta,
ecos al LLM, podio) es la de los ítems de `datos/contenido`; las tarjetas, las de `datos/tarjetas_registros`. Los
archivos están en `casos_registro/`. DATO DE PRUEBA: todos los casos.
"""

import json
import re
from pathlib import Path

from app.services.registro.llm import Entrada, tarjeta_para
from datos.contenido import ITEMS_REGISTRO, REFERENCIAS
from datos.fijos import LISTAS_COMUNES
from datos.tarjetas_registros import TARJETAS

ITEMS = {i[1]: i for i in ITEMS_REGISTRO}
LISTAS = {codigo: dict(opciones) for codigo, _nombre, opciones in LISTAS_COMUNES}
FUENTES_REFERENCIA = {r[0]: r[3] for r in REFERENCIAS}

CASOS = Path(__file__).resolve().parent / 'casos_registro'


# --- Casos -----------------------------------------------------------------------------------

_archivos = {}


def casos_de_archivo(nombre):
    """{número: caso} de un archivo de casos: un caso con `de` hereda el del archivo de su serie (`corrida`; sin ella,
    la base de la serie: v7.5b → v7.5) y lo que traiga además lo reemplaza; un caso con `caso` toma texto y opciones de
    `<registro>.json`."""
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


# --- Lo que se resuelve de un caso: opción, pregunta, ecos y marcadores ------------------------

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
    """La pregunta del texto de la opción marcada o, si no tiene, la del ítem; `{primera}` en minúscula (una «Otra» va
    tal cual) y `{valor 1}` con la etiqueta del valor."""
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
