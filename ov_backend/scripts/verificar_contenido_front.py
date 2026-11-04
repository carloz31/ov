"""Coherencia entre el conjunto `contenido` y los JSON del front (ajuste carga-actividades).

Carga `contenido` en una base temporal y comprueba, sin servicios externos:
- que cada actividad tiene su JSON (`plataforma/`, o `ruta/` para lo provisional);
- que cada `desafio` de un JSON es una batalla cargada y existe en `challenges.ts`;
- que cada `item` de un JSON es un ítem cargado de esa actividad, del tipo de su nodo (elección si es podio);
- que cada referencia de un eco (consigna o diálogo) está cargada para esa actividad;
- que ningún JSON de `plataforma/` trae `recompensa.recursoIds` (las fichas las deciden las reglas FICHA).

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
from datos.cargar import preparar_base  # noqa: E402


def _ecos(nodo):
    eco = nodo.get('eco')
    return [] if eco is None else [eco] if isinstance(eco, str) else list(eco)


def verificar(front: Path) -> list[str]:
    contenidos = front / 'src/data/activities/contenidos'
    desafios = set(re.findall(r"id: '(desafio-[a-z0-9-]+)'",
                              (front / 'src/data/content/challenges.ts').read_text(encoding='utf-8')))
    errores = []
    with TemporaryDirectory() as carpeta:
        url = f'sqlite:///{(Path(carpeta) / "contenido.db").as_posix()}'
        preparar_base(url, 'contenido', crear_tablas=True)
        motor = crear_motor_bd(url)
        try:
            with Session(motor) as sesion:
                actividades = {a.codigo: a for a in sesion.scalars(select(m.Actividad))}
                items = {i.codigo: i for i in sesion.scalars(select(m.ItemRegistro))}
                referencias = {(r.codigo, r.actividad_id) for r in sesion.scalars(select(m.Referencia))}
                for codigo, actividad in sorted(actividades.items()):
                    carpeta_json = 'ruta' if codigo.startswith('t-') else 'plataforma'
                    archivo = contenidos / carpeta_json / f'{actividad.contenido}.json'
                    if not archivo.exists():
                        errores.append(f'{codigo}: no tiene {archivo.relative_to(front)}')
                        continue
                    datos = json.loads(archivo.read_text(encoding='utf-8'))
                    if carpeta_json == 'plataforma' and 'recursoIds' in (datos.get('recompensa') or {}):
                        errores.append(f'{codigo}: trae recompensa.recursoIds')
                    if 'desafio' in datos and (actividad.tipo != m.TipoActividad.BATALLA
                                               or datos['desafio'] not in desafios):
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
        finally:
            motor.dispose()
    return errores


def main(argumentos=None) -> int:
    analizador = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    analizador.add_argument('--front', type=Path, default=Path(__file__).resolve().parents[2] / 'ov_frontend')
    opciones = analizador.parse_args(argumentos)
    errores = verificar(opciones.front)
    for error in errores:
        print(error)
    print('Sin discrepancias.' if not errores else f'{len(errores)} discrepancias.')
    return 1 if errores else 0


if __name__ == '__main__':
    raise SystemExit(main())
