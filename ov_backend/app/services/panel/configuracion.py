"""Configuración del colegio de la orientadora (ajuste panel-entrevistas-configuracion): qué cuestionarios opcionales
ve el apoderado y qué registros ve ella destacados en el perfil. Es una sola para todos los salones del colegio; el
colegio es el de sus salones y nunca se expone. No registra eventos ni notifica."""

from sqlalchemy import delete, insert, select
from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.exceptions import ErrorAccion
from app.models import (
    Actividad, Bloque, ColegioActividadDestacada, ColegioInstrumentoVisible, Espacio, Instrumento, Salon,
    TipoActividad, VisibilidadApoderado,
)
from app.schemas.panel import (
    BloqueConfiguracion, ConfiguracionColegio, ConfigurarColegioEntrada, CuestionarioConfiguracion,
    RegistroConfiguracion,
)
from app.services.avance import por_espacio
from app.services.investigaciones.acciones import exigir_orientadora


def _colegio(sesion: Session, codigo_cuenta: str) -> int:
    """El colegio de sus salones; otro rol, 404. Sin salones, o con salones de varios colegios (caso no soportado),
    422."""
    _, salones = exigir_orientadora(sesion, codigo_cuenta)
    colegios = set(sesion.scalars(select(Salon.colegio_id).where(Salon.id.in_(salones)))) if salones else set()
    if len(colegios) > 1:
        raise ErrorAccion("Sus salones pertenecen a más de un colegio", estado_http=422)
    if not colegios:
        raise ErrorAccion("No tiene salones asignados", estado_http=422)
    return colegios.pop()


def _registros_por_bloque(sesion: Session) -> list[tuple[Bloque, list[Actividad]]]:
    """Las actividades de registro del estudiante por bloque, en el orden del camino; las de la Ciudad al final."""
    grupos: dict[int, tuple[Bloque, list[Actividad]]] = {}
    for espacio in (Espacio.MISIONES_CAMPO, Espacio.CIUDAD):
        for bloque, actividad in sorted(por_espacio(sesion, espacio),
                                        key=lambda par: (par[0].numero, par[1].orden, par[1].codigo)):
            if actividad.tipo == TipoActividad.REGISTRO:
                grupos.setdefault(bloque.id, (bloque, []))[1].append(actividad)
    return list(grupos.values())


def _respuesta(sesion: Session, colegio_id: int) -> ConfiguracionColegio:
    actual = contexto(sesion)
    visibles = actual.instrumentos_visibles(colegio_id)
    destacadas = actual.actividades_destacadas(colegio_id)
    cuestionarios = [CuestionarioConfiguracion(
        codigo=i.codigo, nombre=i.nombre, descripcion=i.descripcion, obligatorio=i.obligatorio,
        visibilidad_apoderado=i.visibilidad_apoderado.value,
        visible=i.visibilidad_apoderado == VisibilidadApoderado.SIEMPRE
        or (i.visibilidad_apoderado == VisibilidadApoderado.SEGUN_COLEGIO and i.id in visibles),
    ) for i in sorted(actual.definiciones.listar(Instrumento), key=lambda i: (not i.obligatorio, i.codigo))]
    registros = [BloqueConfiguracion(codigo=bloque.codigo, nombre=bloque.nombre, registros=[RegistroConfiguracion(
        codigo=a.codigo, titulo=a.titulo, requerida=a.requerida, destacado=a.id in destacadas) for a in actividades])
        for bloque, actividades in _registros_por_bloque(sesion)]
    return ConfiguracionColegio(cuestionarios=cuestionarios, registros=registros)


@usar_contexto
def consultar_configuracion(sesion: Session, codigo_cuenta: str) -> ConfiguracionColegio:
    return _respuesta(sesion, _colegio(sesion, codigo_cuenta))


@usar_contexto
def configurar_colegio(sesion: Session, entrada: ConfigurarColegioEntrada) -> ConfiguracionColegio:
    """Reemplaza toda la configuración del colegio (un borrado y una inserción por tabla)."""
    colegio_id = _colegio(sesion, entrada.cuenta)
    definiciones = contexto(sesion).definiciones
    instrumentos = {i.codigo: i for i in definiciones.listar(Instrumento)}
    actividades = {a.codigo: a for a in definiciones.listar(Actividad)}
    for codigo in entrada.visibles:
        if codigo not in instrumentos:
            raise ErrorAccion(f"Cuestionario desconocido: {codigo}", estado_http=422)
        if instrumentos[codigo].visibilidad_apoderado != VisibilidadApoderado.SEGUN_COLEGIO:
            raise ErrorAccion(f"La visibilidad de «{instrumentos[codigo].nombre}» no se puede cambiar", estado_http=422)
    registros = {a.codigo for _, lista in _registros_por_bloque(sesion) for a in lista}
    for codigo in entrada.destacados:
        if codigo not in actividades:
            raise ErrorAccion(f"Actividad desconocida: {codigo}", estado_http=422)
        if codigo not in registros:
            raise ErrorAccion(f"«{actividades[codigo].titulo}» no es un registro", estado_http=422)
    sesion.execute(delete(ColegioInstrumentoVisible).where(ColegioInstrumentoVisible.colegio_id == colegio_id))
    sesion.execute(delete(ColegioActividadDestacada).where(ColegioActividadDestacada.colegio_id == colegio_id))
    if entrada.visibles:
        sesion.execute(insert(ColegioInstrumentoVisible), [
            {"colegio_id": colegio_id, "instrumento_id": instrumentos[c].id} for c in dict.fromkeys(entrada.visibles)])
    if entrada.destacados:
        sesion.execute(insert(ColegioActividadDestacada), [
            {"colegio_id": colegio_id, "actividad_id": actividades[c].id} for c in dict.fromkeys(entrada.destacados)])
    sesion.flush()
    contexto(sesion).invalidar_configuracion()
    return _respuesta(sesion, colegio_id)
