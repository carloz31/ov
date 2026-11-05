"""Coherencia entre los conjuntos `contenido` y `ruta` y los JSON del front (ajustes carga-actividades y carga-casos).

Carga cada conjunto en una base temporal y comprueba, sin servicios externos:
- en `contenido`: que cada actividad tiene su JSON (`plataforma/`, o `ruta/` para lo provisional); que cada `desafio`
  de un JSON es una batalla cargada y existe en `challenges.ts`; que cada `item` de un JSON es un ítem cargado de esa
  actividad, del tipo de su nodo (elección si es podio); que cada referencia de un eco está cargada para esa
  actividad; que ningún JSON de `plataforma/` trae `recompensa.recursoIds`, y que cada caso lo juega exactamente una
  actividad;
- en los dos conjuntos, los casos: cada actividad CASO nombra un `caso` con su JSON en `src/data/cases/plataforma/`;
  el JSON cumple el formato (ver `docs/sistema/integracion.md`); cada `onet` es una ocupación cargada; el total de
  necesidades es el `puntaje_maximo` de cada actividad que lo juega y los conteos por problema son los de
  `CONFIGURACION_CASOS`, con `puntaje_minimo` ≤ máximo; la ocupación de cada testimonio es una necesidad del caso
  que lo regala (su regla SUPERA_CASO).
Las imágenes de un caso que no están en `ov_frontend/public/` son avisos, no discrepancias.

Uso: `uv run python scripts/verificar_contenido_front.py [--front ../ov_frontend]`. Sale con 1 si hay discrepancias.
"""

import argparse
import json
from pathlib import Path
import re
import sys
from tempfile import TemporaryDirectory

if __package__ in (None, ''):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app import models as m  # noqa: E402
from app.database import crear_motor_bd  # noqa: E402
from datos import contenido as datos_contenido, ruta as datos_ruta  # noqa: E402
from datos.cargar import preparar_base  # noqa: E402

MODULOS = {'contenido': datos_contenido, 'ruta': datos_ruta}


def _ecos(nodo):
    eco = nodo.get('eco')
    return [] if eco is None else [eco] if isinstance(eco, str) else list(eco)


def _json_actividad(contenidos: Path, actividad) -> Path:
    carpeta = 'ruta' if actividad.codigo.startswith('t-') else 'plataforma'
    return contenidos / carpeta / f'{actividad.contenido}.json'


def _verificar_actividades(front: Path, sesion, actividades) -> list[str]:
    contenidos = front / 'src/data/activities/contenidos'
    desafios = set(re.findall(r"id: '(desafio-[a-z0-9-]+)'",
                              (front / 'src/data/content/challenges.ts').read_text(encoding='utf-8')))
    items = {i.codigo: i for i in sesion.scalars(select(m.ItemRegistro))}
    referencias = {(r.codigo, r.actividad_id) for r in sesion.scalars(select(m.Referencia))}
    errores = []
    for codigo, actividad in sorted(actividades.items()):
        archivo = _json_actividad(contenidos, actividad)
        if not archivo.exists():
            errores.append(f'{codigo}: no tiene {archivo.relative_to(front)}')
            continue
        datos = json.loads(archivo.read_text(encoding='utf-8'))
        if archivo.parent.name == 'plataforma' and 'recursoIds' in (datos.get('recompensa') or {}):
            errores.append(f'{codigo}: trae recompensa.recursoIds')
        if 'desafio' in datos and (actividad.tipo != m.TipoActividad.BATALLA or datos['desafio'] not in desafios):
            errores.append(f'{codigo}: el desafío {datos["desafio"]} no es una batalla cargada')
        if actividad.tipo == m.TipoActividad.BATALLA and 'desafio' not in datos:
            errores.append(f'{codigo}: es una batalla y su JSON no nombra un desafío')
        for nodo in datos.get('nodos', []):
            if nodo.get('item'):
                item = items.get(nodo['item'])
                if item is None or item.actividad_id != actividad.id:
                    errores.append(f'{codigo}: el ítem {nodo["item"]} no está cargado en esta actividad')
                elif ('podio' in nodo or 'eleccion' in nodo) != (item.lista_id is not None):
                    errores.append(f'{codigo}: el ítem {nodo["item"]} no es del tipo de su nodo')
            for eco in _ecos(nodo):
                if (eco, actividad.id) not in referencias:
                    errores.append(f'{codigo}: la referencia {eco} ({nodo["id"]}) no está cargada')
    sobrantes = {p.stem for p in (contenidos / 'plataforma').glob('*.json')} - {
        a.contenido for a in actividades.values()}
    errores += [f'plataforma/{s}.json no corresponde a ninguna actividad' for s in sorted(sobrantes)]
    return errores


def _textos(valor, ruta=''):
    """Los textos vacíos de un JSON, con su ruta."""
    if isinstance(valor, str):
        return [ruta] if not valor.strip() else []
    if isinstance(valor, dict):
        return [r for k, v in valor.items() for r in _textos(v, f'{ruta}.{k}' if ruta else k)]
    if isinstance(valor, list):
        return [r for n, v in enumerate(valor) for r in _textos(v, f'{ruta}[{n}]')]
    return []


def _imagenes(caso: dict) -> list[str]:
    return [caso['intro']['imagen'], *(f['fondo']['imagen'] for f in caso['fases'])]


def necesidades_por_problema(caso: dict) -> list[list[str]]:
    """Los `onet` que necesita cada problema, en orden de fase y problema."""
    return [[n['onet'] for n in p['necesidades']] for f in caso['fases'] for p in f['problemas']]


def verificar_formato_caso(caso: dict) -> list[str]:
    """Las reglas del formato de un JSON de caso que no dependen del servidor."""
    errores = []
    try:
        profesionales = [p['onet'] for p in caso['profesionales']]
        ids = [f['id'] for f in caso['fases']]
        ids += [x['id'] for f in caso['fases'] for x in (*f['mensajes'], *f['problemas'])]
        problemas = [p for f in caso['fases'] for p in f['problemas']]
        posiciones = [x['posicion'][eje] for f in caso['fases'] for x in f['mensajes'] for eje in ('x', 'y')]
        imagenes = _imagenes(caso)
        presupuesto = caso['presupuesto']
    except (KeyError, TypeError) as error:
        return [f'falta el campo {error}']
    if len(set(profesionales)) != len(profesionales):
        errores.append('hay `onet` repetidos en profesionales')
    for problema in problemas:
        onets = [n['onet'] for n in problema['necesidades']]
        if fuera := sorted(set(onets) - set(profesionales)):
            errores.append(f'el problema {problema["id"]} necesita ocupaciones fuera del directorio: {fuera}')
        if len(set(onets)) != len(onets):
            errores.append(f'el problema {problema["id"]} repite una ocupación')
    if repetidos := sorted({i for i in ids if ids.count(i) > 1}):
        errores.append(f'ids repetidos de fases, mensajes o problemas: {repetidos}')
    errores += [f'texto vacío en {r}' for r in _textos(caso)]
    if any(not isinstance(p, (int, float)) or not 0 <= p <= 100 for p in posiciones):
        errores.append('hay posiciones fuera de 0–100')
    total = sum(len(n) for n in necesidades_por_problema(caso))
    if not isinstance(presupuesto, int) or presupuesto < total:
        errores.append(f'el presupuesto {presupuesto} no alcanza el total de necesidades ({total})')
    errores += [f'la imagen {i} lleva parámetros' for i in imagenes if '?' in i]
    return errores


def _verificar_casos(front: Path, conjunto: str, sesion, actividades) -> tuple[list[str], list[str]]:
    modulo = MODULOS[conjunto]
    contenidos = front / 'src/data/activities/contenidos'
    publico = front / 'public'
    ocupaciones = set(sesion.scalars(select(m.Ocupacion.codigo)))
    errores, avisos, jugados, casos = [], [], {}, {}
    for codigo, actividad in sorted(actividades.items()):
        if actividad.tipo != m.TipoActividad.CASO:
            continue
        archivo = _json_actividad(contenidos, actividad)
        nombre = json.loads(archivo.read_text(encoding='utf-8')).get('caso') if archivo.exists() else None
        if not nombre:
            errores.append(f'{conjunto} · {codigo}: su JSON no nombra un caso')
            continue
        ruta_caso = front / 'src/data/cases/plataforma' / f'{nombre}.json'
        if not ruta_caso.exists():
            errores.append(f'{conjunto} · {codigo}: no existe {ruta_caso.relative_to(front)}')
            continue
        jugados.setdefault(nombre, []).append(codigo)
        if nombre not in casos:
            caso = json.loads(ruta_caso.read_text(encoding='utf-8'))
            casos[nombre] = caso
            if caso.get('id') != nombre:
                errores.append(f'{nombre}.json: su id es {caso.get("id")!r}')
            formato = verificar_formato_caso(caso)
            errores += [f'{nombre}.json: {e}' for e in formato]
            if formato:
                continue
            fuera = sorted({p['onet'] for p in caso['profesionales']} - ocupaciones)
            errores += [f'{nombre}.json: {o} no es una ocupación cargada' for o in fuera]
            avisos += [f'{nombre}.json: falta la imagen {i}' for i in _imagenes(caso)
                       if not (publico / i).exists() and not (publico / 'images' / i).exists()]
        caso = casos[nombre]
        if verificar_formato_caso(caso):
            continue
        conteos = tuple(len(n) for n in necesidades_por_problema(caso))
        if actividad.puntaje_maximo != sum(conteos):
            errores.append(f'{conjunto} · {codigo}: el máximo {actividad.puntaje_maximo} no es el total de '
                           f'necesidades de {nombre} ({sum(conteos)})')
        if tuple(modulo.CONFIGURACION_CASOS.get(codigo, (None, ()))[1]) != conteos:
            errores.append(f'{conjunto} · {codigo}: CONFIGURACION_CASOS no coincide con {nombre} {conteos}')
        if actividad.puntaje_minimo is None or actividad.puntaje_minimo > sum(conteos):
            errores.append(f'{conjunto} · {codigo}: el mínimo {actividad.puntaje_minimo} supera el máximo')
    if conjunto == 'contenido':
        errores += [f'contenido · el caso {n} lo juegan varias actividades: {c}' for n, c in sorted(jugados.items())
                    if len(c) > 1]
    caso_de = {codigo: n for n, codigos in jugados.items() for codigo in codigos}
    ocupacion_de = {c: ocupacion for c, *_, ocupacion, _contexto, _cita in modulo.TESTIMONIOS}
    for _regla, tipo, testimonio, _mensaje, condiciones in modulo.REGLAS:
        if tipo != 'TESTIMONIO':
            continue
        for evento, actividad, *_ in condiciones:
            nombre = caso_de.get(actividad) if evento == 'SUPERA_CASO' else None
            if nombre is None or verificar_formato_caso(casos[nombre]):
                continue
            if ocupacion_de.get(testimonio) not in {o for n in necesidades_por_problema(casos[nombre]) for o in n}:
                errores.append(f'{conjunto} · {testimonio}: su ocupación {ocupacion_de.get(testimonio)} no es una '
                               f'necesidad de {nombre}, el caso que lo regala')
    return errores, avisos


def verificar(front: Path) -> tuple[list[str], list[str]]:
    errores, avisos = [], []
    with TemporaryDirectory() as carpeta:
        for conjunto in ('contenido', 'ruta'):
            url = f'sqlite:///{(Path(carpeta) / f"{conjunto}.db").as_posix()}'
            preparar_base(url, conjunto, crear_tablas=True)
            motor = crear_motor_bd(url)
            try:
                with Session(motor) as sesion:
                    actividades = {a.codigo: a for a in sesion.scalars(select(m.Actividad))}
                    if conjunto == 'contenido':
                        errores += _verificar_actividades(front, sesion, actividades)
                    de_casos, avisos_casos = _verificar_casos(front, conjunto, sesion, actividades)
                    errores += de_casos
                    avisos += [a for a in avisos_casos if a not in avisos]
            finally:
                motor.dispose()
    return errores, avisos


def main(argumentos=None) -> int:
    analizador = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    analizador.add_argument('--front', type=Path, default=Path(__file__).resolve().parents[2] / 'ov_frontend')
    opciones = analizador.parse_args(argumentos)
    errores, avisos = verificar(opciones.front)
    for aviso in avisos:
        print(f'Aviso: {aviso}')
    for error in errores:
        print(error)
    print('Sin discrepancias.' if not errores else f'{len(errores)} discrepancias.')
    return 1 if errores else 0


if __name__ == '__main__':
    raise SystemExit(main())
