"""Cuentas de una prueba (estudiantes, apoderados y la orientadora) desde un CSV, sin tocar nada más.

Columnas: `rol` (ESTUDIANTE, APODERADO u ORIENTADORA), `codigo`, `nombre` (un alias: «Navegante-07»), `salon`
(estudiante y orientadora; el apoderado va sin salón), `correo` (ficticio: nav07@ov.test), `contrasena` (vacía: se
genera una), `hijos` (solo APODERADO: códigos separados por punto y coma) y `parentesco` (solo APODERADO).

- El salón que no existe se escribe como `AAAA-S` (promoción y sección: `2026-C`) y se crea con ese código en
  `col-piloto`; otro formato, o una promoción y sección que el colegio ya tiene, es un error de fila. La configuración
  (cuestionarios visibles para el apoderado y registros destacados) es del colegio, así que no se copia nada. La
  orientadora del CSV queda asignada solo a su salón.
- Todo va en una transacción: si una fila falla, no se crea nada. Las cuentas que ya existen (por código) se saltan y se
  informan, sin modificarlas.
- `--simular` valida y lista lo que crearía, sin escribir.
- Las contraseñas no se imprimen. Las generadas van a `<entrada>.resultado.csv` (código, correo, contraseña), junto al
  CSV de entrada; ni ese archivo ni el CSV real entran al repo (`.gitignore`). Ejemplo: `scripts/cuentas_ejemplo.csv`.

    uv run python scripts/crear_cuentas.py cuentas-prueba.csv --simular
    uv run python scripts/crear_cuentas.py cuentas-prueba.csv
"""

import argparse
import csv
import re
import secrets
import sys
from dataclasses import dataclass, field
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
if str(RAIZ) not in sys.path:
    sys.path.insert(0, str(RAIZ))

from sqlalchemy import create_engine, select  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app import models as m  # noqa: E402
from app.config import cargar_configuracion  # noqa: E402
from app.core.parametros import MINIMO_CARACTERES_CONTRASENA  # noqa: E402
from app.services.acceso import normalizar_correo  # noqa: E402
from datos.cargador import (  # noqa: E402
    asignar_orientadoras, crear_cuentas, crear_salones, vincular_familias,
)

COLEGIO = 'col-piloto'
ROLES = ('ESTUDIANTE', 'APODERADO', 'ORIENTADORA')
COLUMNAS = ('rol', 'codigo', 'nombre', 'salon', 'correo', 'contrasena', 'hijos', 'parentesco')
MAXIMO_PARENTESCO = 30
FORMATO_SALON_NUEVO = re.compile(r'(\d{4})-([A-Z])')


class ErrorCuentas(Exception):
    """El CSV no se puede aplicar; no se escribe nada."""


@dataclass
class Fila:
    numero: int
    rol: str
    codigo: str
    nombre: str
    salon: str
    correo: str
    contrasena: str
    hijos: tuple[str, ...]
    parentesco: str
    generada: bool = False


@dataclass
class Plan:
    salones_nuevos: list[str] = field(default_factory=list)
    nuevas: list[Fila] = field(default_factory=list)
    existentes: list[Fila] = field(default_factory=list)


def leer_csv(ruta: Path) -> list[Fila]:
    with ruta.open(encoding='utf-8-sig', newline='') as archivo:
        lector = csv.DictReader(archivo)
        faltan = [c for c in COLUMNAS if c not in (lector.fieldnames or ())]
        if faltan:
            raise ErrorCuentas(f'Faltan columnas en el CSV: {", ".join(faltan)}')
        filas = []
        for numero, crudo in enumerate(lector, start=2):
            valor = {c: (crudo.get(c) or '').strip() for c in COLUMNAS}
            filas.append(Fila(numero=numero, rol=valor['rol'].upper(), codigo=valor['codigo'], nombre=valor['nombre'],
                              salon=valor['salon'], correo=normalizar_correo(valor['correo']),
                              contrasena=valor['contrasena'],
                              hijos=tuple(h.strip() for h in valor['hijos'].split(';') if h.strip()),
                              parentesco=valor['parentesco']))
    if not filas:
        raise ErrorCuentas('El CSV no tiene filas')
    return filas


def validar_filas(filas: list[Fila]) -> list[str]:
    """Lo que se puede validar sin la base: roles, campos, repetidos, contraseña, salón, hijos y parentesco."""
    errores = []
    codigos, correos = {}, {}
    for f in filas:
        donde = f'Fila {f.numero} ({f.codigo or "sin código"})'
        if f.rol not in ROLES:
            errores.append(f'{donde}: rol «{f.rol}» inválido (ESTUDIANTE, APODERADO u ORIENTADORA)')
        for campo in ('codigo', 'nombre', 'correo'):
            if not getattr(f, campo):
                errores.append(f'{donde}: falta {campo}')
        if f.codigo in codigos:
            errores.append(f'{donde}: código repetido (fila {codigos[f.codigo]})')
        codigos.setdefault(f.codigo, f.numero)
        if f.correo and f.correo in correos:
            errores.append(f'{donde}: correo repetido (fila {correos[f.correo]})')
        correos.setdefault(f.correo, f.numero)
        if f.correo and '@' not in f.correo:
            errores.append(f'{donde}: el correo no tiene @')
        if f.contrasena and len(f.contrasena) < MINIMO_CARACTERES_CONTRASENA:
            errores.append(f'{donde}: la contraseña tiene menos de {MINIMO_CARACTERES_CONTRASENA} caracteres')
        if f.rol in ('ESTUDIANTE', 'ORIENTADORA') and not f.salon:
            errores.append(f'{donde}: falta el salón')
        if f.rol == 'APODERADO':
            if f.salon:
                errores.append(f'{donde}: el apoderado va sin salón')
            if not f.hijos:
                errores.append(f'{donde}: el apoderado necesita al menos un hijo')
            if not f.parentesco:
                errores.append(f'{donde}: falta el parentesco')
            elif f.parentesco != f.parentesco.lower() or len(f.parentesco) > MAXIMO_PARENTESCO:
                errores.append(f'{donde}: el parentesco va en minúsculas y con hasta {MAXIMO_PARENTESCO} caracteres '
                               '(se muestra como «tu madre»)')
        elif f.hijos or f.parentesco:
            errores.append(f'{donde}: hijos y parentesco son solo para APODERADO')
    return errores


def planificar(sesion, filas: list[Fila]) -> tuple[Plan, list[str]]:
    """Contrasta el CSV con la base: cuentas que ya existen, correos de otras cuentas, salones e hijos."""
    plan, errores = Plan(), []
    existentes = {c.codigo: c for c in sesion.scalars(select(m.Cuenta).where(
        m.Cuenta.codigo.in_([f.codigo for f in filas])))}
    por_correo = {c.correo: c.codigo for c in sesion.scalars(select(m.Cuenta).where(
        m.Cuenta.correo.in_([f.correo for f in filas])))}
    salones = {s.codigo: s for s in sesion.scalars(select(m.Salon).options())}
    colegio = sesion.scalar(select(m.Colegio).where(m.Colegio.codigo == COLEGIO))
    if colegio is None:
        errores.append(f'No existe el colegio {COLEGIO}: la base no tiene el conjunto cargado')
    ocupados = {(s.promocion, s.seccion): s.codigo for s in salones.values()
                if colegio is not None and s.colegio_id == colegio.id}
    estudiantes_csv = {f.codigo for f in filas if f.rol == 'ESTUDIANTE'}
    for f in filas:
        donde = f'Fila {f.numero} ({f.codigo})'
        if f.codigo in existentes:
            plan.existentes.append(f)
            continue
        if f.correo in por_correo:
            errores.append(f'{donde}: el correo ya es de la cuenta {por_correo[f.correo]}')
        if f.salon and f.salon in salones and colegio is not None and salones[f.salon].colegio_id != colegio.id:
            errores.append(f'{donde}: el salón {f.salon} es de otro colegio')
        if f.salon and f.salon not in salones and f.salon not in plan.salones_nuevos:
            if (formato := FORMATO_SALON_NUEVO.fullmatch(f.salon)) is None:
                errores.append(f'{donde}: el salón nuevo {f.salon} debe escribirse como promoción y sección (2026-C)')
            elif colegio is not None and (igual := ocupados.get((int(formato[1]), formato[2]))):
                errores.append(f'{donde}: el colegio ya tiene la promoción {formato[1]} sección {formato[2]} '
                               f'(salón {igual})')
            else:
                plan.salones_nuevos.append(f.salon)
        for hijo in f.hijos:
            if hijo in estudiantes_csv:
                continue
            cuenta = existentes.get(hijo) or sesion.scalar(select(m.Cuenta).where(m.Cuenta.codigo == hijo))
            if cuenta is None:
                errores.append(f'{donde}: el hijo {hijo} no existe ni viene en el CSV')
            elif cuenta.rol != m.Rol.ESTUDIANTE:
                errores.append(f'{donde}: {hijo} no es un estudiante')
        plan.nuevas.append(f)
    return plan, errores


def aplicar(sesion, plan: Plan) -> None:
    """Escribe el plan con las funciones del cargador. Quien llama abre y confirma la transacción."""
    colegio = sesion.scalar(select(m.Colegio).where(m.Colegio.codigo == COLEGIO))
    salones = {s.codigo: s for s in sesion.scalars(select(m.Salon))}
    nuevos = crear_salones(sesion, {COLEGIO: colegio}, [(s, int(s[:4]), s[5:], COLEGIO) for s in plan.salones_nuevos])
    salones.update(nuevos)
    for f in plan.nuevas:
        if not f.contrasena:
            f.contrasena, f.generada = secrets.token_urlsafe(9), True
    cuentas = crear_cuentas(sesion, salones, [
        (f.codigo, f.nombre, f.rol, f.salon or None, f.correo, f.contrasena) for f in plan.nuevas])
    sesion.flush()
    cuentas.update({c.codigo: c for c in sesion.scalars(select(m.Cuenta).where(m.Cuenta.codigo.in_(
        [h for f in plan.nuevas for h in f.hijos])))})
    vincular_familias(sesion, cuentas, [(f'VIN-{f.codigo}-{h}', h, f.codigo, f.parentesco)
                                        for f in plan.nuevas if f.rol == 'APODERADO' for h in f.hijos])
    asignar_orientadoras(sesion, cuentas, salones, [(f.codigo, f.salon, True)
                                                    for f in plan.nuevas if f.rol == 'ORIENTADORA'])
    sesion.flush()


def crear(url: str, ruta: Path, simular: bool = False) -> Plan:
    filas = leer_csv(ruta)
    errores = validar_filas(filas)
    if errores:
        raise ErrorCuentas('\n'.join(errores))
    motor = create_engine(url)
    try:
        with Session(motor) as sesion, sesion.begin():
            plan, errores = planificar(sesion, filas)
            if errores:
                raise ErrorCuentas('\n'.join(errores))
            if not simular:
                aplicar(sesion, plan)
    finally:
        motor.dispose()
    return plan


def escribir_resultado(ruta: Path, plan: Plan) -> Path | None:
    generadas = [f for f in plan.nuevas if f.generada]
    if not generadas:
        return None
    salida = ruta.with_name(ruta.stem + '.resultado.csv')
    with salida.open('w', encoding='utf-8', newline='') as archivo:
        escritor = csv.writer(archivo)
        escritor.writerow(('codigo', 'correo', 'contrasena'))
        escritor.writerows((f.codigo, f.correo, f.contrasena) for f in generadas)
    return salida


def main(argumentos=None) -> int:
    analizador = argparse.ArgumentParser(description='Crea las cuentas de una prueba desde un CSV.')
    analizador.add_argument('csv', type=Path)
    analizador.add_argument('--simular', action='store_true', help='Valida y lista lo que crearía, sin escribir.')
    opciones = analizador.parse_args(argumentos)
    try:
        plan = crear(cargar_configuracion().url_bd, opciones.csv, opciones.simular)
    except (ErrorCuentas, OSError) as error:
        print(f'No se creó nada:\n{error}', file=sys.stderr)
        return 1
    verbo = 'Se crearían' if opciones.simular else 'Creadas'
    for salon in plan.salones_nuevos:
        print(f'{"Se crearía" if opciones.simular else "Creado"} el salón {salon} en {COLEGIO}, con la configuración '
              'del colegio')
    print(f'{verbo} {len(plan.nuevas)} cuentas:')
    for f in plan.nuevas:
        extra = f' · hijos {", ".join(f.hijos)} ({f.parentesco})' if f.rol == 'APODERADO' else f' · salón {f.salon}'
        clave = ' · contraseña generada' if not f.contrasena or f.generada else ''
        print(f'  {f.rol:<11} {f.codigo} «{f.nombre}» {f.correo}{extra}{clave}')
    for f in plan.existentes:
        print(f'  Ya existe, no se modifica: {f.codigo}')
    if not opciones.simular and (salida := escribir_resultado(opciones.csv, plan)):
        print(f'Contraseñas generadas en {salida} (no se muestran aquí; no subas ese archivo al repo)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
