"""Favoritos de carreras, ocupaciones e instituciones (B10 · HU-040) y de fichas y testimonios de la mochila (ajuste
mochila). Ninguna regla ni logro de la semilla depende de ellos."""

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.core.contexto import contexto, usar_contexto
from app.exceptions import ErrorAccion
from app.models import (
    Carrera, Cuenta, Favorito, Ficha, Institucion, Ocupacion, Testimonio, TipoEventoUso, TipoFavorito, TipoObjetivo,
)
from app.schemas.acciones import RespuestaAccion
from app.schemas.favoritos import FavoritoEntrada, FavoritosCuenta
from app.services.catalogo import exigir_seccion_catalogo, resumen_carrera, resumen_institucion, resumen_ocupacion
from app.services.comun import buscar_por_codigo, exigir_disponible, fecha_accion, responder_con_eventos
from app.services.motor.reglas import objetivo_corresponde_a_cuenta


CATALOGO = {TipoFavorito.CARRERA: Carrera, TipoFavorito.OCUPACION: Ocupacion,
            TipoFavorito.INSTITUCION: Institucion}
# Recursos de la mochila: su objetivo de desbloqueo y su propio evento al marcarlos (no MARCA_FAVORITO).
MOCHILA = {TipoFavorito.FICHA: (Ficha, TipoObjetivo.FICHA, TipoEventoUso.MARCA_FAVORITO_FICHA),
           TipoFavorito.TESTIMONIO: (Testimonio, TipoObjetivo.TESTIMONIO, TipoEventoUso.MARCA_FAVORITO_TESTIMONIO)}


def _preparar(sesion: Session, entrada: FavoritoEntrada):
    """El catálogo exige su sección abierta; una ficha o un testimonio, solo estar desbloqueado (409 si no)."""
    cuenta = buscar_por_codigo(sesion, Cuenta, entrada.cuenta)
    if entrada.tipo in MOCHILA:
        modelo, objetivo, _ = MOCHILA[entrada.tipo]
        entidad = buscar_por_codigo(sesion, modelo, entrada.codigo)
        if not objetivo_corresponde_a_cuenta(sesion, cuenta, objetivo, entidad.id):
            raise ErrorAccion("Cuenta o referencia no encontrada", estado_http=404)
        exigir_disponible(sesion, cuenta, objetivo, entidad)
        return cuenta, entidad
    entidad = buscar_por_codigo(sesion, CATALOGO[entrada.tipo], entrada.codigo)
    exigir_seccion_catalogo(sesion, cuenta)
    return cuenta, entidad


def _evento_marcar(tipo, entidad):
    return (MOCHILA[tipo][2], entidad.id) if tipo in MOCHILA else (TipoEventoUso.MARCA_FAVORITO, None)


@usar_contexto
def marcar_favorito(sesion: Session, entrada: FavoritoEntrada) -> RespuestaAccion:
    cuenta, entidad = _preparar(sesion, entrada)
    if (entrada.tipo, entidad.id) in contexto(sesion).favoritos_de(cuenta.id):
        raise ErrorAccion('Ya está entre tus favoritos')
    fecha = fecha_accion(entrada)
    sesion.add(Favorito(cuenta_id=cuenta.id, tipo=entrada.tipo, id_referencia=entidad.id, fecha_hora=fecha))
    sesion.flush()
    contexto(sesion).favoritos.pop(cuenta.id, None)
    return responder_con_eventos(sesion, cuenta, [_evento_marcar(entrada.tipo, entidad)], fecha)


@usar_contexto
def desmarcar_favorito(sesion: Session, entrada: FavoritoEntrada) -> RespuestaAccion:
    """Quita el favorito sin registrar eventos; lo que ya se desbloqueó se conserva."""
    cuenta, entidad = _preparar(sesion, entrada)
    borrados = sesion.execute(delete(Favorito).where(
        Favorito.cuenta_id == cuenta.id, Favorito.tipo == entrada.tipo, Favorito.id_referencia == entidad.id,
    )).rowcount
    if not borrados:
        raise ErrorAccion('No está entre tus favoritos')
    contexto(sesion).favoritos.pop(cuenta.id, None)
    return responder_con_eventos(sesion, cuenta, [], fecha_accion(entrada))


@usar_contexto
def listar_favoritos(sesion: Session, cuenta: Cuenta) -> FavoritosCuenta:
    exigir_seccion_catalogo(sesion, cuenta)
    orden = {}
    for tipo, referencia in sesion.execute(select(Favorito.tipo, Favorito.id_referencia).where(
        Favorito.cuenta_id == cuenta.id,
        Favorito.tipo.in_(CATALOGO),
    ).order_by(Favorito.fecha_hora.desc(), Favorito.id.desc())):
        orden.setdefault(tipo, []).append(referencia)
    favoritos = {(tipo, referencia) for tipo, referencias in orden.items() for referencia in referencias}
    opciones = {TipoFavorito.CARRERA: (selectinload(Carrera.familia),),
                TipoFavorito.INSTITUCION: (selectinload(Institucion.ubicacion),), TipoFavorito.OCUPACION: ()}
    entidades = {}
    for tipo, referencias in orden.items():
        modelo = CATALOGO[tipo]
        entidades[tipo] = {e.id: e for e in sesion.scalars(select(modelo).where(modelo.id.in_(referencias)).options(
            *opciones[tipo]))}

    def resumenes(tipo, resumir):
        return [resumir(entidades[tipo][r], favoritos) for r in orden.get(tipo, []) if r in entidades.get(tipo, {})]

    return FavoritosCuenta(carreras=resumenes(TipoFavorito.CARRERA, resumen_carrera),
                           ocupaciones=resumenes(TipoFavorito.OCUPACION, resumen_ocupacion),
                           instituciones=resumenes(TipoFavorito.INSTITUCION, resumen_institucion))
