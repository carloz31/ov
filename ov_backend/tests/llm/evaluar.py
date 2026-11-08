"""Validación del LLM de seguimiento de registros contra Gemini real.

No es una prueba de pytest (no se llama `test_*.py` y no corre en la suite): mide cómo responde el modelo a casos
escritos a mano, con el mismo mensaje, prompt, esquema, modelo y temperatura que usa el backend.

    tests/llm/casos/<registro>.json          casos y lo esperado por ítem
    tests/llm/resultados/<registro>/*.csv    una fila por caso, corrida e ítem
    tests/llm/resultados/<registro>/resumen.md  una línea por corrida (se agrega sola)

Uso, desde ov_backend (GEMINI_API_KEY y GEMINI_MODELO del entorno o, si faltan, del .env del backend):
    uv run python tests/llm/evaluar.py b1-1 b1-3                  # todos los casos, 2 corridas
    uv run python tests/llm/evaluar.py b1-1 --solo E4 S1 --corridas 3
    uv run python tests/llm/evaluar.py b1-1 --temperaturas 0.2 1.0
    uv run python tests/llm/evaluar.py b1-1 --modelo gemini-3.1-flash-lite --razonamiento low  # sin él, el del backend
    uv run python tests/llm/evaluar.py b1-1 --mostrar E4          # imprime el mensaje, sin llamar al modelo
"""

import argparse
import csv
import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
sys.path.insert(0, str(RAIZ))

from dotenv import dotenv_values  # noqa: E402  (ya es dependencia del backend: la usa app.config)

from app.config import RUTA_ENV  # noqa: E402
from app.core import parametros  # noqa: E402
from app.services.registro import gemini as adaptador  # noqa: E402
from app.services.registro.acciones import NOMBRES_ECO_REFERENCIA, guia_para  # noqa: E402
from app.services.registro.evaluacion import (  # noqa: E402
    ContextoEntrega, ContextoSeguimiento, CriterioEvaluacion, EcoEvaluacion, ItemEntrega, ResultadoEntrega,
    ResultadoSeguimiento, TurnoEvaluacion, pregunta_valida,
)
from app.services.registro.gemini import mensaje_evaluador as mensaje  # noqa: E402
from app.services.registro.prompt import PROMPT_ENTREGA, PROMPT_SEGUIMIENTO  # noqa: E402
from datos.contenido import ACTIVIDADES, ITEMS_REGISTRO, REFERENCIAS, SEGUIMIENTOS  # noqa: E402
from datos.fijos import LISTAS_COMUNES, REPREGUNTAS_CRITERIO  # noqa: E402

ITEMS = {i[1]: i for i in ITEMS_REGISTRO}
FUENTES_REFERENCIA = {r[0]: r[3] for r in REFERENCIAS}  # ítem fuente, aplicación o None, según el tipo
LISTAS = {codigo: dict(opciones) for codigo, _nombre, opciones in LISTAS_COMUNES}
TITULOS = {a[0]: a[2] for a in ACTIVIDADES}  # el título de la actividad, como lo envía el backend
PROHIBIDAS = ('explica más', 'desarrolla', 'por qué crees que', 'criterio', 'inteligencia artificial')
FUTURO = re.compile(r'\b(harías|harás|podrías hacer|si pasara mañana|si tuvieras que)\b')
GENERICA = '¿podrías darme un ejemplo concreto'
CALIFICA = (('suena', 'a'), ('eso', 'no', 'es'))  # frases que califican, por palabras y sin puntuación



def entorno():
    """`GEMINI_API_KEY` y `GEMINI_MODELO` del entorno o, si faltan, del `.env` del backend (nunca se imprimen)."""
    archivo = dotenv_values(RUTA_ENV) if RUTA_ENV.exists() else {}
    clave = (os.environ.get('GEMINI_API_KEY') or archivo.get('GEMINI_API_KEY') or '').strip()
    modelo = (os.environ.get('GEMINI_MODELO') or archivo.get('GEMINI_MODELO') or parametros.MODELO_LLM_REGISTRO).strip()
    return clave, modelo


# --- Armado de contextos (la guía es `acciones.guia_para`; opciones y ecos, sin base de datos) ---------

def opciones_de(codigo_item):
    eleccion = ITEMS[codigo_item][4] or {}
    textos = dict(LISTAS.get(eleccion.get('lista'), {}))
    propias = {o['codigo']: o for o in eleccion.get('propias', ())}
    textos.update({codigo: o['texto'] for codigo, o in propias.items()})
    return textos, propias


def textos_elegidos(codigo_item, elegidas):
    textos, _ = opciones_de(codigo_item)
    salida = []
    for e in elegidas:
        if isinstance(e, dict):
            salida.append(e['texto'])
        elif e in textos:
            salida.append(textos[e])
        else:
            raise SystemExit(f'Opción {e} no existe en {codigo_item}')
    return tuple(salida)


def criterio_y_guia(codigo_item, elegidas):
    """Los criterios del ítem como los lee `acciones.criterios_de` y la guía con `acciones.guia_para`."""
    eleccion = ITEMS[codigo_item][4] or {}
    criterios = tuple(CriterioEvaluacion(c, t, d, REPREGUNTAS_CRITERIO[t]) for c, t, d in ITEMS[codigo_item][5] or ())
    elegidas = [{'codigo': e} if isinstance(e, str) else {'codigo': 'OTRA', 'texto': e['texto']} for e in elegidas]
    return guia_para(SEGUIMIENTOS.get(codigo_item), eleccion.get('propias', ()), criterios, elegidas)


def nombre_eco_referencia(codigo, tipo):
    """Como `acciones.ecos_de`: el nombre del ítem fuente o, sin ítem fuente, el nombre legible del tipo."""
    fuente = FUENTES_REFERENCIA.get(codigo)
    return ITEMS[fuente][2] if fuente in ITEMS else NOMBRES_ECO_REFERENCIA.get(tipo, tipo)


def ecos_de(codigo_item, otros, referencias):
    """`otros`: {código: {'texto', 'opciones'}} de la misma actividad; `referencias`: {código: {'tipo', 'texto'}}."""
    ecos = []
    for tipo, codigo in SEGUIMIENTOS.get(codigo_item, {}).get('ecos_llm', ()):
        if tipo == 'REFERENCIA':
            if codigo in referencias:
                ecos.append(EcoEvaluacion(nombre_eco_referencia(codigo, referencias[codigo]['tipo']),
                                          referencias[codigo]['texto']))
            continue
        otro = otros.get(codigo)
        if otro is None:
            continue
        if tipo == 'TEXTO' and otro['texto']:
            ecos.append(EcoEvaluacion(ITEMS[codigo][2], otro['texto']))
        elif tipo == 'ELECCION' and otro['opciones']:
            ecos.append(EcoEvaluacion(ITEMS[codigo][2], ', '.join(textos_elegidos(codigo, otro['opciones']))))
    return tuple(ecos)


def titulo(registro):
    return TITULOS[registro]


def contexto_entrega(registro, caso):
    """Solo los ítems con criterio van al modelo, como en el backend; los demás se informan como «sin LLM»."""
    otros = {i['item']: i for i in caso['items']}
    con_llm, sin_llm = [], []
    for i in caso['items']:
        criterios, guia = criterio_y_guia(i['item'], i['opciones'])
        if not criterios:
            sin_llm.append(i['item'])
            continue
        con_llm.append(ItemEntrega(i['item'], ITEMS[i['item']][3], criterios, guia,
                                   textos_elegidos(i['item'], i['opciones']),
                                   ecos_de(i['item'], otros, caso.get('referencias', {})), i['texto']))
    return ContextoEntrega(titulo(registro), tuple(con_llm)), sin_llm


def contexto_seguimiento(registro, caso):
    codigo = caso['item']
    criterios, guia = criterio_y_guia(codigo, caso['opciones'])
    otros = {i['item']: i for i in caso.get('contexto', ())}
    return ContextoSeguimiento(titulo(registro), ITEMS[codigo][3], criterios, guia,
                               textos_elegidos(codigo, caso['opciones']),
                               ecos_de(codigo, otros, caso.get('referencias', {})), caso['texto'],
                               tuple(TurnoEvaluacion(p, r) for p, r in caso['turnos']))


# --- Llamada y chequeos ---------------------------------------------------------------------

def config_razonamiento(modelo, nivel):
    """Con `--razonamiento`, ese nivel; sin él, el del backend para el registro, adaptado al modelo."""
    if nivel:
        return adaptador.types.ThinkingConfig(thinking_level=nivel)
    return adaptador.razonamiento_para(modelo, parametros.NIVEL_RAZONAMIENTO_REGISTRO)


def nombre_razonamiento(config):
    """El nivel como se escribe en el CSV y en resumen.md (`minimal`, `low`…; `b<n>` en los modelos con presupuesto)."""
    if config is None:
        return 'defecto'
    if config.thinking_level is not None:
        return str(getattr(config.thinking_level, 'value', config.thinking_level)).lower()
    return f'b{config.thinking_budget}'


def llamar(cliente, modelo, razonamiento, contexto, prompt, esquema, temperatura):
    inicio = time.perf_counter()
    respuesta = cliente.models.generate_content(
        model=modelo, contents=mensaje(contexto),
        config=adaptador.types.GenerateContentConfig(
            system_instruction=prompt, temperature=temperatura, candidate_count=1,
            response_mime_type='application/json', response_json_schema=esquema.model_json_schema(),
            thinking_config=razonamiento,
            automatic_function_calling=adaptador.types.AutomaticFunctionCallingConfig(disable=True)))
    latencia = round((time.perf_counter() - inicio) * 1000)
    partes = respuesta.candidates[0].content.parts if respuesta.candidates else []
    texto = ''.join(p.text for p in partes or [] if p.text and not p.thought)
    uso = respuesta.usage_metadata
    tokens = dict(tokens_entrada=getattr(uso, 'prompt_token_count', None),
                  tokens_razonamiento=getattr(uso, 'thoughts_token_count', None),
                  tokens_salida=getattr(uso, 'candidates_token_count', None))
    return esquema.model_validate_json(texto), latencia, tokens


def chequeos(r, guia, esperado):
    """Lo automatizable de la rúbrica; el ángulo, el tono y si la repregunta sirve (`util`) se revisan a mano."""
    fallas, pregunta, falta = [], r.repregunta, r.falta
    if pregunta:
        baja = pregunta.lower()
        if not pregunta_valida(pregunta):
            fallas.append('filtro_backend')
        if pregunta.count('?') != 1:
            fallas.append('R2_preguntas')
        if len(pregunta.split()) > 35:
            fallas.append('R3_largo')
        if esperado.get('sin_futuro') and FUTURO.search(baja):
            fallas.append('R4_futuro')
        if GENERICA in baja:
            fallas.append('R1_generica')
        if guia is not None and pregunta.strip() == guia.texto_base.strip():
            fallas.append('R5_texto_base')
        if any(p in baja for p in PROHIBIDAS):
            fallas.append('R8_prohibida')
        palabras = re.findall(r'\w+', baja)
        if any(palabras[i:i + len(f)] == list(f) for f in CALIFICA for i in range(len(palabras))):
            fallas.append('R9_califica')
        if any(p in baja for p in esperado.get('no_contiene', ())):
            fallas.append('R6_otro_item')
        if esperado.get('contiene_alguno') and not any(p in baja for p in esperado['contiene_alguno']):
            fallas.append('fuera_de_tema')
        if esperado.get('retoma') and not any(p in baja for p in esperado['retoma']):
            fallas.append('R7_no_retoma')
    if falta and ('?' in falta or len(falta.split()) > 20 or falta.lower().startswith(('necesito', 'cuéntame'))):
        fallas.append('R10_falta')
    return fallas


def comparar(esperado, r):
    distintos = [f'{k}≠{v}' for k, v in esperado.items() if k in ('cumple', 'abierto', 'emocional', 'sensible')
                 and getattr(r, k) != v]
    if esperado.get('repregunta_nula') and r.repregunta is not None:
        distintos.append('repregunta≠null')
    return 'OK' if not distintos else ' '.join(distintos)


# --- Corrida --------------------------------------------------------------------------------

def tareas(registro, casos, temperaturas, corridas):
    for temperatura in temperaturas:
        for corrida in range(1, corridas + 1):
            for caso in casos:
                yield registro, caso, temperatura, corrida


def ejecutar(cliente, modelo, razonamiento, registro, caso, temperatura, corrida):
    base = dict(registro=registro, caso=caso['id'], tipo=caso['tipo'], temperatura=temperatura, corrida=corrida,
                razonamiento=nombre_razonamiento(razonamiento))
    try:
        if caso['tipo'] == 'entrega':
            contexto, sin_llm = contexto_entrega(registro, caso)
            filas = [dict(base, item=i, coincide='sin LLM', chequeos='') for i in sin_llm]
            if not contexto.items:
                return filas
            resultado, ms, tokens = llamar(cliente, modelo, razonamiento, contexto, PROMPT_ENTREGA, ResultadoEntrega,
                                           temperatura)
            guias = {i.item: i.guia for i in contexto.items}
            for r in resultado.items:
                esperado = caso['esperado'].get(r.item, {})
                filas.append(dict(base, item=r.item, latencia_ms=ms, **tokens,
                                  esperado=json.dumps(esperado, ensure_ascii=False),
                                  util=esperado.get('util', ''),
                                  coincide=comparar(esperado, r), cumple=r.cumple, abierto=r.abierto, emocional=r.emocional,
                                  sensible=r.sensible, repregunta=r.repregunta, falta=r.falta,
                                  chequeos=' '.join(chequeos(r, guias.get(r.item), esperado)) or 'OK'))
            return filas
        contexto = contexto_seguimiento(registro, caso)
        r, ms, tokens = llamar(cliente, modelo, razonamiento, contexto, PROMPT_SEGUIMIENTO, ResultadoSeguimiento,
                               temperatura)
        escrito = ' '.join([caso['texto']] + [t[1] for t in caso['turnos']])
        ratio = round(len(r.consolidada or '') / max(1, len(escrito)), 2)
        fallas = chequeos(r, contexto.guia, caso['esperado'])
        limite = parametros.FACTOR_MAXIMO_CONSOLIDADA * len(escrito) + parametros.MARGEN_CONSOLIDADA
        if len(r.consolidada or '') > limite:
            fallas.append('C3_consolidada_larga')
        return [dict(base, item=caso['item'], latencia_ms=ms, **tokens,
                     esperado=json.dumps(caso['esperado'], ensure_ascii=False),
                     util=caso['esperado'].get('util', ''),
                     coincide=comparar(caso['esperado'], r), cumple=r.cumple, abierto=r.abierto, emocional=r.emocional, sensible=r.sensible,
                     repregunta=r.repregunta, falta=r.falta, consolidada=r.consolidada, ratio_consolidada=ratio,
                     chequeos=' '.join(fallas) or 'OK')]
    except Exception as error:  # noqa: BLE001 — una falla de red o de esquema se registra y la corrida sigue
        return [dict(base, item=caso.get('item', '-'), error=repr(error)[:300])]


CAMPOS = ['registro', 'caso', 'tipo', 'temperatura', 'razonamiento', 'corrida', 'item', 'esperado', 'util', 'coincide', 'cumple',
          'abierto', 'emocional', 'sensible', 'repregunta', 'falta', 'consolidada', 'ratio_consolidada', 'chequeos', 'latencia_ms',
          'tokens_entrada', 'tokens_razonamiento', 'tokens_salida', 'error']


def guardar(registro, filas, modelo, nivel, temperaturas, corridas, etiqueta):
    carpeta = AQUI / 'resultados' / registro
    carpeta.mkdir(parents=True, exist_ok=True)
    temps = '-'.join(f'{t:g}' for t in temperaturas)
    nombre = f"{datetime.now():%Y-%m-%d_%H%M}_{parametros.VERSION_PROMPT_REGISTRO}_t{temps}_r{nivel}"
    destino = carpeta / f"{nombre}{'_' + etiqueta if etiqueta else ''}.csv"
    filas.sort(key=lambda f: (f['temperatura'], f['corrida'], f['caso'], f['item']))
    with destino.open('w', newline='', encoding='utf-8-sig') as archivo:
        escritor = csv.DictWriter(archivo, fieldnames=CAMPOS)
        escritor.writeheader()
        escritor.writerows(filas)
    lineas = []
    for t in temperaturas:
        de_t = [f for f in filas if f['temperatura'] == t and f.get('coincide') not in (None, 'sin LLM')]
        errores = sum(1 for f in filas if f['temperatura'] == t and f.get('error'))
        ok = sum(f['coincide'] == 'OK' for f in de_t)
        limpias = sum(f['chequeos'] == 'OK' for f in de_t)
        lineas.append(f"| {datetime.now():%Y-%m-%d %H:%M} | {parametros.VERSION_PROMPT_REGISTRO} | {modelo} · {nivel} | {t:g} | "
                      f"{corridas} | {ok}/{len(de_t)} | {limpias}/{len(de_t)} | {errores} | {destino.name} |")
    resumen = carpeta / 'resumen.md'
    if not resumen.exists():
        resumen.write_text(f'# Validación del LLM · {registro}\n\n| Fecha | Prompt | Modelo | Temp. | Corridas | '
                           'Clasificación | Chequeos | Errores | CSV |\n|---|---|---|---|---|---|---|---|---|\n',
                           encoding='utf-8')
    with resumen.open('a', encoding='utf-8') as archivo:
        archivo.write('\n'.join(lineas) + '\n')
    return destino, lineas


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('registros', nargs='+')
    parser.add_argument('--solo', nargs='*', help='ids de casos (valen para todos los registros indicados)')
    parser.add_argument('--corridas', type=int, default=2)
    parser.add_argument('--temperaturas', type=float, nargs='+', default=[parametros.TEMPERATURA_REGISTRO])
    parser.add_argument('--modelo', help='por defecto, GEMINI_MODELO del entorno o del .env (el del backend)')
    parser.add_argument('--razonamiento', choices=('minimal', 'low', 'medium', 'high'),
                        help='por defecto, el del backend para el registro (`NIVEL_RAZONAMIENTO_REGISTRO` adaptado al modelo)')
    parser.add_argument('--hilos', type=int, default=8, help='llamadas en paralelo (Tier 1 admite de sobra)')
    parser.add_argument('--etiqueta', default='', help='sufijo del CSV, p. ej. «tras-ajuste»')
    parser.add_argument('--mostrar')
    args = parser.parse_args()

    por_registro = {}
    for registro in args.registros:
        datos = json.loads((AQUI / 'casos' / f'{registro}.json').read_text(encoding='utf-8'))
        por_registro[registro] = [c for c in datos['casos'] if not args.solo or c['id'] in args.solo]

    if args.mostrar:
        registro = args.registros[0]
        caso = next(c for c in json.loads((AQUI / 'casos' / f'{registro}.json').read_text(encoding='utf-8'))['casos']
                    if c['id'] == args.mostrar)
        contexto = contexto_entrega(registro, caso)[0] if caso['tipo'] == 'entrega' else contexto_seguimiento(registro, caso)
        print(mensaje(contexto))
        return

    clave, modelo = entorno()
    args.modelo = args.modelo or modelo
    if not clave:
        sys.exit('Falta GEMINI_API_KEY (en el entorno o en el .env del backend)')
    cliente = adaptador.genai.Client(api_key=clave)
    razonamiento = config_razonamiento(args.modelo, args.razonamiento)
    nivel = nombre_razonamiento(razonamiento)
    for registro, casos in por_registro.items():
        lista = list(tareas(registro, casos, args.temperaturas, args.corridas))
        print(f'{registro}: {len(lista)} llamadas')
        with ThreadPoolExecutor(max_workers=args.hilos) as pool:
            filas = [f for grupo in pool.map(lambda t: ejecutar(cliente, args.modelo, razonamiento, *t), lista) for f in grupo]
        destino, lineas = guardar(registro, filas, args.modelo, nivel, args.temperaturas, args.corridas, args.etiqueta)
        print(destino.relative_to(RAIZ))
        print('\n'.join(lineas))


if __name__ == '__main__':
    main()
