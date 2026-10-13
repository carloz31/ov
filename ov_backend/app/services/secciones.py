from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.models import Cuenta, Seccion, TipoObjetivo
from app.schemas.secciones import SeccionEstado
from app.services.comun import exigir_disponible
from app.services.motor.reglas import motivos_bloqueo, objetivo_corresponde_a_cuenta


def _estado(sesion: Session, cuenta: Cuenta, seccion) -> SeccionEstado:
    bloqueo = motivos_bloqueo(sesion, cuenta, TipoObjetivo.SECCION, seccion.id)
    return SeccionEstado(codigo=seccion.codigo, nombre=seccion.nombre,
                         estado="DISPONIBLE" if bloqueo is None else "BLOQUEADA", bloqueo=bloqueo)


@usar_contexto
def listar_secciones_cuenta(sesion: Session, cuenta: Cuenta) -> list[SeccionEstado]:
    return [_estado(sesion, cuenta, seccion)
            for seccion in sorted(contexto(sesion).definiciones.listar(Seccion), key=lambda seccion: seccion.codigo)
            if objetivo_corresponde_a_cuenta(sesion, cuenta, TipoObjetivo.SECCION, seccion.id)]


@usar_contexto
def seccion_de_cuenta(sesion: Session, cuenta: Cuenta, codigo: str):
    """La sección si existe y es de la audiencia de la cuenta; si no, LookupError (404)."""
    seccion = contexto(sesion).definiciones.por_codigo(Seccion, codigo)
    if seccion is None or not objetivo_corresponde_a_cuenta(sesion, cuenta, TipoObjetivo.SECCION, seccion.id):
        raise LookupError("Sección no encontrada para esta cuenta")
    return seccion


@usar_contexto
def estado_seccion(sesion: Session, cuenta: Cuenta, codigo: str) -> SeccionEstado:
    return _estado(sesion, cuenta, seccion_de_cuenta(sesion, cuenta, codigo))


@usar_contexto
def exigir_seccion(sesion: Session, cuenta: Cuenta, codigo: str) -> None:
    """Guardia de lectura y escritura del contenido de una sección: 409 con su mensaje si está bloqueada."""
    exigir_disponible(sesion, cuenta, TipoObjetivo.SECCION, contexto(sesion).definiciones.por_codigo(Seccion, codigo))
