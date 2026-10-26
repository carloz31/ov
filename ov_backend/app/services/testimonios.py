from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.models import Actividad, Cuenta, Ocupacion, Testimonio, Rol, TipoEventoUso, TipoFavorito, TipoObjetivo
from app.schemas.acciones import RespuestaAccion, VerTestimonioEntrada
from app.schemas.testimonios import CasoTestimonio, OcupacionTestimonio, TestimonioEstado
from app.services.comun import (
    buscar_por_codigo, exigir_disponible, exigir_estudiante, existe_evento, fecha_accion, responder_con_eventos,
)
from app.services.motor.reglas import objetivo_disponible


@usar_contexto
def listar_testimonios_cuenta(sesion: Session, cuenta: Cuenta) -> list[TestimonioEstado]:
    if cuenta.rol != Rol.ESTUDIANTE:
        return []
    definiciones = contexto(sesion).definiciones
    testimonios = sorted(definiciones.listar(Testimonio), key=lambda t: t.codigo)
    # Una sola consulta para las ocupaciones, sea cual sea el número de testimonios (el catálogo no va en caché).
    ids = {t.ocupacion_id for t in testimonios if t.ocupacion_id is not None}
    ocupaciones = {o.id: o for o in sesion.scalars(select(Ocupacion).where(Ocupacion.id.in_(ids)))} if ids else {}
    favoritos = contexto(sesion).favoritos_de(cuenta.id)
    respuesta = []
    for testimonio in testimonios:
        disponible = objetivo_disponible(sesion, cuenta, TipoObjetivo.TESTIMONIO, testimonio.id)
        ocupacion = ocupaciones.get(testimonio.ocupacion_id) if disponible else None
        caso = caso_del_testimonio(definiciones, testimonio)
        respuesta.append(TestimonioEstado(
            codigo=testimonio.codigo, titulo=testimonio.titulo, estado="DISPONIBLE" if disponible else "BLOQUEADA",
            visto=existe_evento(sesion, cuenta, TipoEventoUso.VISTA_TESTIMONIO, testimonio.id),
            pista=None if disponible else testimonio.pista,
            descripcion=testimonio.descripcion if disponible else None,
            enlace=testimonio.enlace if disponible else None,
            persona=testimonio.persona if disponible else None,
            ocupacion=OcupacionTestimonio(codigo=ocupacion.codigo, titulo=ocupacion.titulo) if ocupacion else None,
            anios_experiencia=testimonio.anios_experiencia if disponible else None,
            cita=testimonio.cita if disponible else None,
            caso=None if caso is None else CasoTestimonio(codigo=caso.codigo, titulo=caso.titulo),
            caso_disponible=caso is not None and objetivo_disponible(sesion, cuenta, TipoObjetivo.ACTIVIDAD, caso.id),
            es_favorita=(TipoFavorito.TESTIMONIO, testimonio.id) in favoritos,
        ))
    return respuesta


def caso_del_testimonio(definiciones, testimonio):
    """La actividad CASO de la primera regla del testimonio que exige superarla (SUPERA_CASO)."""
    for regla in definiciones.reglas_objetivo.get((TipoObjetivo.TESTIMONIO, testimonio.id), ()):
        for condicion in regla.condiciones:
            if condicion.tipo_evento == TipoEventoUso.SUPERA_CASO and condicion.id_referencia is not None:
                return definiciones.obtener(Actividad, condicion.id_referencia)
    return None


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
