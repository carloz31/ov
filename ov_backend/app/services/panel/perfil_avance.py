"""Pestaña «Avance y familia» del perfil (ajuste panel-estudiantes §10): su camino tramo por tramo, sus últimas
señales de seguridad, cuántas entradas tiene su diario (nunca su contenido) y su familia (nunca las cartas)."""

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.contexto import contexto, usar_contexto
from app.models import (
    Actividad, Conversacion, ConversacionVinculo, Cuenta, EntradaDiario, Espacio, ProgresoActividad,
    ResultadoCaso, TipoActividad, VinculoFamiliar,
)
from app.schemas.panel_estudiante import (
    AvanceEstudiantePerfil, FamiliaAvance, Senal, TramoCamino, ViniendoBajando,
)
from app.services.avance import por_espacio, tramos_del_camino
from app.services.familia import avance_ruta
from app.services.panel.alertas import calcular_alertas
from app.services.panel.comun import Lecturas, dias_desde, entero, leer_parametros
from app.services.panel.perfil_acceso import Acceso, estudiante_de_orientadora

ESTADOS_TRAMO = {"COMPLETO": "COMPLETO", "ACTUAL": "VA_AQUI", "PENDIENTE": "POR_ABRIR"}


def _camino(sesion: Session, lecturas: Lecturas, cuenta_id: int) -> list[TramoCamino]:
    camino = por_espacio(sesion, Espacio.MISIONES_CAMPO)
    tramos, _ = tramos_del_camino(camino, lecturas.completadas.get(cuenta_id, set()))
    siguiente = lecturas.camino.posiciones[cuenta_id].siguiente
    return [TramoCamino(numero=indice, nombre=t.nombre, hechas=t.completadas, total=t.total,
                        estado=ESTADOS_TRAMO[t.estado],
                        siguiente=siguiente.titulo if t.estado == "ACTUAL" and siguiente else None)
            for indice, t in enumerate(tramos, start=1)]


def _opcionales(sesion: Session, completadas: set[int]) -> int:
    """Misiones opcionales de la ciudad completadas (sin los casos de la Central, que se cuentan aparte)."""
    ciudad = [a for _, a in por_espacio(sesion, Espacio.CIUDAD) if not a.requerida and a.tipo != TipoActividad.CASO]
    return sum(a.id in completadas for a in ciudad)


def _casos_superados(sesion: Session, cuenta_id: int) -> int:
    """Casos de la Central con algún intento de puntaje ≥ su mínimo (el criterio de `casos.py`)."""
    definiciones = contexto(sesion).definiciones
    superados = set()
    for actividad_id, puntaje in sesion.execute(select(ProgresoActividad.actividad_id, ResultadoCaso.puntaje).join(
            ResultadoCaso, ResultadoCaso.progreso_id == ProgresoActividad.id).where(
            ProgresoActividad.cuenta_id == cuenta_id)):
        actividad = definiciones.obtener(Actividad, actividad_id)
        if actividad.puntaje_minimo is not None and puntaje >= actividad.puntaje_minimo:
            superados.add(actividad_id)
    return len(superados)


def _senales(lecturas: Lecturas, cuenta_id: int, parametros: dict) -> list[Senal]:
    baja, alta = entero(parametros, "PANEL_SEGURIDAD_BAJA_MAXIMO"), entero(parametros, "PANEL_SEGURIDAD_ALTA_MINIMO")
    ultimas = lecturas.senales_con_fecha.get(cuenta_id, [])[:entero(parametros, "PANEL_SENALES_PERFIL")]
    return [Senal(nivel=nivel, fecha=fecha, banda="BAJA" if nivel <= baja else "ALTA" if nivel >= alta else "MEDIA")
            for nivel, fecha in reversed(ultimas)]


def _viene_bajando(acceso: Acceso, lecturas: Lecturas) -> ViniendoBajando | None:
    """Si tiene el aviso de seguridad baja (el de la base), con sus parámetros."""
    for calculada in calcular_alertas(lecturas):
        if calculada.alerta.evaluador == "seguridad_baja" and acceso.estudiante.id in calculada.datos:
            return ViniendoBajando(senales=int(calculada.parametros["senales"]),
                                   nivel_maximo=int(calculada.parametros["nivel_maximo"]))
    return None


def _familia(sesion: Session, lecturas: Lecturas, cuenta_id: int) -> FamiliaAvance | None:
    fila = sesion.execute(select(VinculoFamiliar.id, VinculoFamiliar.parentesco, Cuenta).join(
        Cuenta, Cuenta.id == VinculoFamiliar.apoderado_id).where(
        VinculoFamiliar.estudiante_id == cuenta_id, VinculoFamiliar.es_activo).order_by(VinculoFamiliar.id)).first()
    if fila is None:
        return None
    vinculo_id, parentesco, apoderado = fila
    ruta = avance_ruta(sesion, apoderado)
    catalogo = {c.id for c in contexto(sesion).definiciones.listar(Conversacion)}
    registros = [r for r in sesion.scalars(select(ConversacionVinculo).where(ConversacionVinculo.vinculo_id == vinculo_id))
                 if r.conversacion_id in catalogo]
    return FamiliaAvance(
        nombre=apoderado.nombre, parentesco=parentesco,
        ingreso="INGRESO" if apoderado.id in lecturas.ingreso_apoderados else "AUN_NO_INGRESA",
        ruta_hechas=ruta.completadas, ruta_total=ruta.total,
        conversadas=sum(r.conversada_en is not None for r in registros), conversaciones_total=len(catalogo),
        esperan_apoderado=sum(r.respondida_estudiante_en is not None and r.respondida_apoderado_en is None
                              for r in registros))


@usar_contexto
def avance(sesion: Session, codigo_cuenta: str, codigo_estudiante: str, ahora: datetime) -> AvanceEstudiantePerfil:
    acceso = estudiante_de_orientadora(sesion, codigo_cuenta, codigo_estudiante, ahora)
    parametros = leer_parametros(sesion)
    cuenta_id = acceso.estudiante.id
    lecturas = Lecturas(sesion, acceso.solo, companeros=acceso.salon.estudiantes)
    completadas = lecturas.completadas.get(cuenta_id, set())
    entradas, ultima = sesion.execute(select(func.count(EntradaDiario.id), func.max(EntradaDiario.fecha_hora)).where(
        EntradaDiario.cuenta_id == cuenta_id)).one()
    return AvanceEstudiantePerfil(
        tramos=_camino(sesion, lecturas, cuenta_id), opcionales_ciudad=_opcionales(sesion, completadas),
        casos_superados=_casos_superados(sesion, cuenta_id), senales=_senales(lecturas, cuenta_id, parametros),
        viene_bajando=_viene_bajando(acceso, lecturas), entradas_diario=entradas,
        dias_ultima_entrada=dias_desde(ahora, ultima) if ultima else None,
        familia=_familia(sesion, lecturas, cuenta_id))

