from sqlalchemy import delete, func, insert, select
from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.exceptions import ErrorAccion
from app.models import (
    Cuenta, Desbloqueo, GrupoInsignia, Insignia, InsigniaVitrina, Nivel, Rol, TipoObjetivo,
)
from app.schemas.logros import (
    GrupoInsigniaPublico, InsigniaEstado, LogrosCuenta, NivelEstado, VitrinaCuenta, VitrinaEntrada,
)
from app.services.avance import avance_ciudad
from app.services.comun import buscar_por_codigo, exigir_estudiante
from app.services.motor.reglas import objetivo_disponible

MAXIMO_VITRINA = 3


def afinidad(sesion: Session, cuenta: Cuenta) -> float:
    """Completadas de la Ciudad sobre todas las de la Ciudad, tope 100 %: el mismo cálculo que `/avance`."""
    return avance_ciudad(sesion, cuenta).porcentaje


def _insignias_de(sesion: Session, cuenta: Cuenta) -> list[Insignia]:
    definiciones = contexto(sesion).definiciones
    return sorted((insignia for insignia in definiciones.listar(Insignia) if insignia.audiencia == cuenta.rol.value),
                  key=lambda insignia: (definiciones.obtener(GrupoInsignia, insignia.grupo_id).orden,
                                        insignia.orden, insignia.codigo))


def _fechas_obtencion(sesion: Session, cuenta: Cuenta, insignias: list[Insignia]) -> dict[int, object]:
    """Por insignia, el primer desbloqueo de cualquiera de sus reglas (una sola consulta)."""
    reglas = {regla.id: insignia.id for insignia in insignias
              for regla in contexto(sesion).definiciones.reglas_objetivo.get((TipoObjetivo.INSIGNIA, insignia.id), ())}
    fechas = {}
    if not reglas:
        return fechas
    for regla_id, fecha in sesion.execute(select(Desbloqueo.regla_id, func.min(Desbloqueo.fecha_hora)).where(
        Desbloqueo.cuenta_id == cuenta.id, Desbloqueo.regla_id.in_(reglas),
    ).group_by(Desbloqueo.regla_id)):
        insignia_id = reglas[regla_id]
        fechas[insignia_id] = min(fecha, fechas.get(insignia_id, fecha))
    return fechas


def _vitrina(sesion: Session, cuenta: Cuenta) -> list[str]:
    definiciones = contexto(sesion).definiciones
    return [definiciones.obtener(Insignia, insignia_id).codigo for insignia_id in sesion.scalars(
        select(InsigniaVitrina.insignia_id).where(InsigniaVitrina.cuenta_id == cuenta.id)
        .order_by(InsigniaVitrina.orden))]


@usar_contexto
def logros_cuenta(sesion: Session, cuenta: Cuenta) -> LogrosCuenta:
    datos = contexto(sesion)
    lista = _insignias_de(sesion, cuenta)
    fechas = _fechas_obtencion(sesion, cuenta, lista)
    insignias = []
    for insignia in lista:
        obtenida = objetivo_disponible(sesion, cuenta, TipoObjetivo.INSIGNIA, insignia.id)
        oculta = insignia.es_oculta and not obtenida
        grupo = datos.definiciones.obtener(GrupoInsignia, insignia.grupo_id)
        insignias.append(InsigniaEstado(
            codigo="???" if oculta else insignia.codigo,
            nombre="Logro oculto" if oculta else insignia.nombre,
            descripcion=None if oculta else insignia.descripcion,
            requisito=None if oculta else insignia.requisito,
            estado="OBTENIDA" if obtenida else "BLOQUEADA",
            grupo=GrupoInsigniaPublico(codigo=grupo.codigo, nombre=grupo.nombre, orden=grupo.orden),
            orden=insignia.orden,
            pista=insignia.pista,
            obtenida_en=fechas.get(insignia.id) if obtenida else None,
        ))

    niveles = []
    if cuenta.rol == Rol.ESTUDIANTE:
        niveles = [NivelEstado(
            numero=nivel.numero, titulo=nivel.titulo, descripcion=nivel.descripcion,
            estado="OBTENIDO" if objetivo_disponible(sesion, cuenta, TipoObjetivo.NIVEL, nivel.id) else "BLOQUEADO",
        ) for nivel in sorted(datos.definiciones.listar(Nivel), key=lambda nivel: nivel.numero)]
    if cuenta.rol != Rol.ESTUDIANTE:
        return LogrosCuenta(insignias=insignias, niveles=niveles, vitrina=[])
    return LogrosCuenta(insignias=insignias, niveles=niveles, vitrina=_vitrina(sesion, cuenta),
                        afinidad=afinidad(sesion, cuenta))


@usar_contexto
def guardar_vitrina(sesion: Session, entrada: VitrinaEntrada) -> VitrinaCuenta:
    """Reemplaza la vitrina completa (ajuste pasaporte-perfil): hasta 3 insignias obtenidas, en el orden recibido."""
    cuenta = buscar_por_codigo(sesion, Cuenta, entrada.cuenta)
    exigir_estudiante(cuenta)
    if len(entrada.codigos) > MAXIMO_VITRINA:
        raise ErrorAccion(f"La vitrina admite hasta {MAXIMO_VITRINA} insignias", estado_http=422)
    if len(set(entrada.codigos)) != len(entrada.codigos):
        raise ErrorAccion("La vitrina no admite insignias repetidas", estado_http=422)
    definiciones = contexto(sesion).definiciones
    insignias = [definiciones.por_codigo(Insignia, codigo) for codigo in entrada.codigos]
    if any(insignia is None or insignia.audiencia != cuenta.rol.value for insignia in insignias):
        raise ErrorAccion("Alguna insignia no existe", estado_http=422)
    if not all(objetivo_disponible(sesion, cuenta, TipoObjetivo.INSIGNIA, insignia.id) for insignia in insignias):
        raise ErrorAccion("Solo puedes mostrar insignias que ya obtuviste")
    sesion.execute(delete(InsigniaVitrina).where(InsigniaVitrina.cuenta_id == cuenta.id))
    if insignias:
        sesion.execute(insert(InsigniaVitrina), [dict(cuenta_id=cuenta.id, insignia_id=insignia.id, orden=orden)
                                                for orden, insignia in enumerate(insignias, start=1)])
    sesion.flush()
    return VitrinaCuenta(vitrina=[insignia.codigo for insignia in insignias])
