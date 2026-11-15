"""Lista «Estudiantes» del portal de la orientadora (ajuste panel-estudiantes §4): filtros, accesos rápidos con su
conteo, orden en el servidor sobre toda la lista y página. Solo trae los campos de sus columnas; todo se lee por lotes
sobre el alcance (`Lecturas`)."""

from collections.abc import Callable
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.contexto import usar_contexto
from app.exceptions import ErrorAccion
from app.models import Carrera, TarjetaCarrera
from app.models.base import sin_tildes
from app.schemas.cuentas import SalonDatos
from app.schemas.panel_estudiante import AccesoLista, FilaEstudiante, OpcionAviso, PaginaEstudiantes
from app.services.panel.alertas import calcular_alertas
from app.services.panel.comun import Lecturas, entero, leer_parametros, resolver_alcance
from app.services.panel.perfil import avisos_por_estudiante, dias_sin_ingreso, estados_del_test, tramo_de

ESTADOS_TEST = ("LISTO", "POR_REVISAR", "EN_CURSO", "SIN_EMPEZAR")
LIMITE_MAXIMO = 100
SIN_DATO = float("inf")


def _plan_a(sesion: Session, ids: list[int]) -> dict[int, str]:
    if not ids:
        return {}
    return dict(sesion.execute(select(TarjetaCarrera.cuenta_id, Carrera.nombre).join(
        Carrera, Carrera.id == TarjetaCarrera.carrera_id).where(
        TarjetaCarrera.cuenta_id.in_(ids), TarjetaCarrera.activa, TarjetaCarrera.prioridad == 1)).all())


def _clave_avisos(fila: FilaEstudiante, importancia: dict[str, int]) -> tuple:
    """Por aviso más importante, luego más avisos; sin avisos al final."""
    if fila.aviso is None:
        return (1, 0, 0)
    return (0, importancia[fila.codigo], -(fila.avisos_mas + 1))


def _ordenar(filas: list[FilaEstudiante], orden: str | None, importancia: dict[str, int]) -> list[FilaEstudiante]:
    por_nombre = sorted(filas, key=lambda f: sin_tildes(f.nombre))
    columna = (orden or "avisos").removeprefix("-")
    claves: dict[str, Callable[[FilaEstudiante], object]] = {
        "estudiante": lambda f: sin_tildes(f.nombre),
        "tramo": lambda f: f.tramo.numero,
        "test": lambda f: ESTADOS_TEST.index(f.test),
        "plan_a": lambda f: (f.plan_a is None, sin_tildes(f.plan_a or "")),
        "ingreso": lambda f: SIN_DATO if f.dias_sin_ingreso is None else f.dias_sin_ingreso,
        "avisos": lambda f: _clave_avisos(f, importancia),
    }
    if columna not in claves:
        raise ErrorAccion("Orden desconocido", estado_http=422)
    return sorted(por_nombre, key=claves[columna], reverse=bool(orden) and orden.startswith("-"))


@usar_contexto
def lista_estudiantes(sesion: Session, codigo_cuenta: str, salon: str | None, buscar: str | None, aviso: str | None,
                      test: str | None, acceso: str | None, orden: str | None, limite: int | None, desde: int,
                      ahora: datetime) -> PaginaEstudiantes:
    alcance = resolver_alcance(sesion, codigo_cuenta, salon, ahora)
    parametros = leer_parametros(sesion)
    limite = entero(parametros, "PANEL_FILAS_ESTUDIANTES") if limite is None else limite
    if not 1 <= limite <= LIMITE_MAXIMO or desde < 0:
        raise ErrorAccion("Página fuera de rango", estado_http=422)
    if test is not None and test not in ESTADOS_TEST:
        raise ErrorAccion("Estado del test desconocido", estado_http=422)
    lecturas = Lecturas(sesion, alcance)
    alertas = calcular_alertas(lecturas)
    por_estudiante = avisos_por_estudiante(alertas)
    orden_alerta = {c.alerta.codigo: i for i, c in enumerate(alertas)}
    if aviso is not None and aviso not in orden_alerta:
        raise ErrorAccion("Aviso desconocido", estado_http=422)
    grupos_rapidos = []
    for c in alertas:
        if c.grupo.orden == 1 and c.grupo.codigo not in {g.codigo for g in grupos_rapidos}:
            grupos_rapidos.append(c.grupo)
    accesos_validos = {"todos", "con_avisos", "sin_avisos", *(g.codigo for g in grupos_rapidos)}
    if acceso is not None and acceso not in accesos_validos:
        raise ErrorAccion("Acceso desconocido", estado_http=422)
    estados, _ = estados_del_test(lecturas, parametros)
    planes = _plan_a(sesion, alcance.ids)
    filas = []
    for e in alcance.estudiantes:
        suyas = por_estudiante.get(e.id, [])
        filas.append(FilaEstudiante(
            codigo=e.codigo, nombre=e.nombre, salon=SalonDatos.model_validate(alcance.salones[e.salon_id]), tramo=tramo_de(lecturas, e.id),
            test=estados[e.id], plan_a=planes.get(e.id), dias_sin_ingreso=dias_sin_ingreso(lecturas, e.id),
            aviso=suyas[0].nombre_perfil(e.id) if suyas else None, avisos_mas=max(len(suyas) - 1, 0)))
    ids_por_codigo = {e.codigo: e.id for e in alcance.estudiantes}

    def tiene_grupo(fila, grupo_codigo):
        return any(c.grupo.codigo == grupo_codigo for c in por_estudiante.get(ids_por_codigo[fila.codigo], []))

    filtros_acceso = {
        "todos": lambda f: True,
        "con_avisos": lambda f: f.aviso is not None,
        "sin_avisos": lambda f: f.aviso is None,
        **{g.codigo: (lambda f, g=g: tiene_grupo(f, g.codigo)) for g in grupos_rapidos},
    }
    accesos = [AccesoLista(codigo="todos", nombre=None, cantidad=len(filas)),
               AccesoLista(codigo="con_avisos", nombre=None, cantidad=sum(map(filtros_acceso["con_avisos"], filas))),
               *(AccesoLista(codigo=g.codigo, nombre=g.nombre, cantidad=sum(map(filtros_acceso[g.codigo], filas)))
                 for g in grupos_rapidos),
               AccesoLista(codigo="sin_avisos", nombre=None, cantidad=sum(map(filtros_acceso["sin_avisos"], filas)))]
    elegidas = [f for f in filas if filtros_acceso[acceso or "todos"](f)]
    if buscar and buscar.strip():
        elegidas = [f for f in elegidas if sin_tildes(buscar.strip()) in sin_tildes(f.nombre)]
    if aviso is not None:
        elegidas = [f for f in elegidas if ids_por_codigo[f.codigo] in alertas[orden_alerta[aviso]].datos]
    if test is not None:
        elegidas = [f for f in elegidas if f.test == test]
    importancia = {f.codigo: orden_alerta[por_estudiante[ids_por_codigo[f.codigo]][0].alerta.codigo]
                   for f in elegidas if f.aviso is not None}
    ordenadas = _ordenar(elegidas, orden, importancia)
    return PaginaEstudiantes(
        salon=SalonDatos.model_validate(alcance.salon) if alcance.salon else None,
        total_estudiantes=len(filas), total=len(ordenadas), accesos=accesos,
        avisos=[OpcionAviso(codigo=c.alerta.codigo, nombre=c.nombre_perfil(0)) for c in alertas],
        items=ordenadas[desde:desde + limite])
