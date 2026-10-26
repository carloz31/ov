from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.exceptions import ErrorAccion
from app.models import (
    Actividad, Bloque, Cuenta, Desbloqueo, Espacio, Ficha, TipoEventoUso, TipoFavorito, TipoObjetivo,
)
from app.schemas.acciones import RespuestaAccion, VerFichaEntrada
from app.schemas.fichas import ActividadFicha, FichaCuenta, FichaDetalle, TramoFicha
from app.services.comun import buscar_por_codigo, exigir_disponible, existe_evento, fecha_accion, responder_con_eventos
from app.services.motor.reglas import objetivo_corresponde_a_cuenta, objetivo_disponible


@usar_contexto
def listar_fichas_cuenta(sesion: Session, cuenta: Cuenta) -> list[FichaCuenta]:
    datos = contexto(sesion)
    definiciones = datos.definiciones
    # Los eventos de la cuenta (VISTA_FICHA) se leen siempre en una consulta, haya o no fichas obtenidas.
    datos.cargar_conteos([cuenta.id])
    datos.favoritos_de(cuenta.id)
    fichas = [ficha for ficha in sorted(definiciones.listar(Ficha), key=lambda ficha: ficha.codigo)
              if objetivo_corresponde_a_cuenta(sesion, cuenta, TipoObjetivo.FICHA, ficha.id)]
    reglas = {regla.id: (ficha, regla) for ficha in fichas
              for regla in definiciones.reglas_objetivo.get((TipoObjetivo.FICHA, ficha.id), ())}
    # Una sola consulta para las fechas de obtención, sea cual sea el número de fichas.
    obtenidas = {}
    if reglas:
        for regla_id, fecha in sesion.execute(select(Desbloqueo.regla_id, Desbloqueo.fecha_hora).where(
            Desbloqueo.cuenta_id == cuenta.id, Desbloqueo.regla_id.in_(reglas),
        ).order_by(Desbloqueo.fecha_hora)):
            ficha, regla = reglas[regla_id]
            obtenidas.setdefault(ficha.id, (fecha, regla))
    return [_ficha_cuenta(sesion, cuenta, ficha, obtenidas.get(ficha.id)) for ficha in fichas]


def _ficha_cuenta(sesion, cuenta, ficha, obtenida):
    disponible = objetivo_disponible(sesion, cuenta, TipoObjetivo.FICHA, ficha.id)
    if not disponible:
        return FichaCuenta(codigo=ficha.codigo, titulo=ficha.titulo, estado="BLOQUEADA", tema=None, descripcion=None,
                           obtenida_en=None, visto=False, es_favorita=False, actividad=None, tramo=None)
    fecha, regla = obtenida if obtenida else (None, None)
    actividad = None if regla is None else _actividad_de_la_regla(sesion, regla)
    bloque = None if actividad is None else contexto(sesion).definiciones.obtener(Bloque, actividad.bloque_id)
    return FichaCuenta(
        codigo=ficha.codigo, titulo=ficha.titulo, estado="DISPONIBLE", tema=ficha.tema, descripcion=ficha.descripcion,
        obtenida_en=fecha,
        # Por ficha: solo cuenta el evento cuya referencia es esta ficha.
        visto=existe_evento(sesion, cuenta, TipoEventoUso.VISTA_FICHA, ficha.id),
        es_favorita=(TipoFavorito.FICHA, ficha.id) in contexto(sesion).favoritos_de(cuenta.id),
        actividad=None if actividad is None else ActividadFicha(codigo=actividad.codigo, titulo=actividad.titulo),
        tramo=TramoFicha(codigo=bloque.codigo, nombre=bloque.nombre, numero=bloque.numero)
        if bloque is not None and bloque.espacio == Espacio.MISIONES_CAMPO else None,
    )


def _actividad_de_la_regla(sesion, regla):
    for condicion in regla.condiciones:
        if condicion.tipo_evento == TipoEventoUso.COMPLETA_ACTIVIDAD and condicion.id_referencia is not None:
            return contexto(sesion).definiciones.obtener(Actividad, condicion.id_referencia)
    return None


@usar_contexto
def detalle_ficha(sesion: Session, cuenta: Cuenta, codigo: str) -> FichaDetalle:
    """El contenido de una ficha: 404 si no existe o es de otra audiencia; 409 con su mensaje si está bloqueada."""
    ficha = _ficha_de_la_cuenta(sesion, cuenta, codigo)
    exigir_disponible(sesion, cuenta, TipoObjetivo.FICHA, ficha)
    return FichaDetalle(codigo=ficha.codigo, titulo=ficha.titulo, contenido=ficha.contenido)


def _ficha_de_la_cuenta(sesion, cuenta, codigo):
    ficha = buscar_por_codigo(sesion, Ficha, codigo)
    if not objetivo_corresponde_a_cuenta(sesion, cuenta, TipoObjetivo.FICHA, ficha.id):
        raise ErrorAccion("Cuenta o referencia no encontrada", estado_http=404)
    return ficha


@usar_contexto
def ver_ficha(sesion: Session, entrada: VerFichaEntrada) -> RespuestaAccion:
    cuenta = buscar_por_codigo(sesion, Cuenta, entrada.cuenta)
    ficha = _ficha_de_la_cuenta(sesion, cuenta, entrada.ficha)
    exigir_disponible(sesion, cuenta, TipoObjetivo.FICHA, ficha)
    # Solo la primera vista cuenta; volver a abrirla no registra otro evento (como ver-testimonio).
    visto = existe_evento(sesion, cuenta, TipoEventoUso.VISTA_FICHA, ficha.id)
    eventos = [] if visto else [(TipoEventoUso.VISTA_FICHA, ficha.id)]
    return responder_con_eventos(sesion, cuenta, eventos, fecha_accion(entrada))
