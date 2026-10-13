from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.models import Cuenta, Testimonio, Rol, TipoEventoUso, TipoObjetivo
from app.schemas.acciones import RespuestaAccion, VerTestimonioEntrada
from app.schemas.testimonios import TestimonioEstado
from app.services.comun import (
    buscar_por_codigo, exigir_disponible, exigir_estudiante, existe_evento, fecha_accion, responder_con_eventos,
)
from app.services.motor.reglas import objetivo_disponible


@usar_contexto
def listar_testimonios_cuenta(sesion: Session, cuenta: Cuenta) -> list[TestimonioEstado]:
    if cuenta.rol != Rol.ESTUDIANTE:
        return []
    respuesta = []
    for testimonio in sorted(contexto(sesion).definiciones.listar(Testimonio), key=lambda t: t.codigo):
        disponible = objetivo_disponible(sesion, cuenta, TipoObjetivo.TESTIMONIO, testimonio.id)
        respuesta.append(TestimonioEstado(
            codigo=testimonio.codigo, titulo=testimonio.titulo, estado="DISPONIBLE" if disponible else "BLOQUEADA",
            visto=existe_evento(sesion, cuenta, TipoEventoUso.VISTA_TESTIMONIO, testimonio.id),
            pista=None if disponible else testimonio.pista,
            descripcion=testimonio.descripcion if disponible else None,
            enlace=testimonio.enlace if disponible else None,
        ))
    return respuesta


@usar_contexto
def ver_testimonio(sesion: Session, entrada: VerTestimonioEntrada) -> RespuestaAccion:
    cuenta = buscar_por_codigo(sesion, Cuenta, entrada.cuenta)
    exigir_estudiante(cuenta)
    testimonio = buscar_por_codigo(sesion, Testimonio, entrada.testimonio)
    exigir_disponible(sesion, cuenta, TipoObjetivo.TESTIMONIO, testimonio)
    # Solo la primera vista cuenta; volver a verlo no registra otro evento.
    visto = existe_evento(sesion, cuenta, TipoEventoUso.VISTA_TESTIMONIO, testimonio.id)
    eventos = [] if visto else [(TipoEventoUso.VISTA_TESTIMONIO, testimonio.id)]
    return responder_con_eventos(sesion, cuenta, eventos, fecha_accion(entrada))
