from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.models import (
    Actividad, Audiencia, Bloque, Cuenta, Espacio, EstadoProgreso, Insignia, Nivel, Rol, TipoEventoUso, TipoObjetivo,
)
from app.schemas.logros import InsigniaEstado, LogrosCuenta, NivelEstado
from app.services.motor.reglas import objetivo_disponible
from app.services.tematicas import porcentaje


def es_mision_adicional(definiciones, actividad: Actividad) -> bool:
    """Opcional que se abre con REGISTRO_ADECUADO: la misión adicional de un registro bien desarrollado."""
    return not actividad.requerida and any(
        condicion.tipo_evento == TipoEventoUso.REGISTRO_ADECUADO
        for regla in definiciones.reglas_objetivo.get((TipoObjetivo.ACTIVIDAD, actividad.id), ())
        for condicion in regla.condiciones)


def afinidad(sesion: Session, cuenta: Cuenta) -> float:
    """Completadas de la Ciudad sobre las de la Ciudad sin misiones adicionales; las adicionales suman, tope 100 %."""
    datos = contexto(sesion)
    definiciones = datos.definiciones
    ciudad = [actividad for actividad in definiciones.listar(Actividad)
              if (bloque := definiciones.obtener(Bloque, actividad.bloque_id)).espacio == Espacio.CIUDAD
              and bloque.audiencia == Audiencia.ESTUDIANTE]
    completadas = {actividad_id for actividad_id, progreso in datos.progresos_de(cuenta.id).items()
                   if progreso.estado == EstadoProgreso.COMPLETADA}
    total = sum(not es_mision_adicional(definiciones, actividad) for actividad in ciudad)
    return porcentaje(sum(actividad.id in completadas for actividad in ciudad), total)


@usar_contexto
def logros_cuenta(sesion: Session, cuenta: Cuenta) -> LogrosCuenta:
    datos = contexto(sesion)
    insignias = []
    for insignia in sorted((insignia for insignia in datos.definiciones.listar(Insignia)
                           if insignia.audiencia == cuenta.rol.value), key=lambda insignia: insignia.codigo):
        obtenida = objetivo_disponible(sesion, cuenta, TipoObjetivo.INSIGNIA, insignia.id)
        oculta = insignia.es_oculta and not obtenida
        insignias.append(InsigniaEstado(
            codigo="???" if oculta else insignia.codigo,
            nombre="Logro oculto" if oculta else insignia.nombre,
            descripcion=None if oculta else insignia.descripcion,
            requisito=None if oculta else insignia.requisito,
            estado="OBTENIDA" if obtenida else "BLOQUEADA",
        ))

    niveles = []
    if cuenta.rol == Rol.ESTUDIANTE:
        niveles = [NivelEstado(
            numero=nivel.numero, titulo=nivel.titulo,
            estado="OBTENIDO" if objetivo_disponible(sesion, cuenta, TipoObjetivo.NIVEL, nivel.id) else "BLOQUEADO",
        ) for nivel in sorted(datos.definiciones.listar(Nivel), key=lambda nivel: nivel.numero)]
    if cuenta.rol != Rol.ESTUDIANTE:
        return LogrosCuenta(insignias=insignias, niveles=niveles)
    return LogrosCuenta(insignias=insignias, niveles=niveles, afinidad=afinidad(sesion, cuenta))
