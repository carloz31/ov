from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.models import EstadoProgreso, TipoEventoUso
from app.schemas.cuentas import EventoLegible
from app.schemas.diario import EntradaDesbloqueada
from app.schemas.motor import DesbloqueoNuevo


class FechaAccion(BaseModel):
    fecha_hora: datetime | None = None


class AccionCuenta(FechaAccion):
    cuenta: str


class CompletarActividadEntrada(AccionCuenta):
    actividad: str


class ReiniciarInstrumentoEntrada(AccionCuenta):
    instrumento: str
    aplicacion: str | None = None


class RevelarResultadoEntrada(AccionCuenta):
    instrumento: str
    aplicacion: str | None = None


class RespuestaItemEntrada(BaseModel):
    item: str
    opcion: int = Field(ge=1, strict=True)


class ResponderItemsEntrada(CompletarActividadEntrada):
    respuestas: list[RespuestaItemEntrada] = Field(min_length=1)

    @model_validator(mode="after")
    def validar_items_distintos(self):
        if len({respuesta.item for respuesta in self.respuestas}) != len(self.respuestas):
            raise ValueError("Los ítems no pueden repetirse en el mismo envío")
        return self


class RespuestaItemGuardada(BaseModel):
    item: str
    opcion: int


class ProgresoRespuestas(BaseModel):
    estado: EstadoProgreso
    respondidos: int
    total: int


class RespuestaItemsGuardados(BaseModel):
    cuenta: str
    actividad: str
    respuestas_guardadas: list[RespuestaItemGuardada]
    progreso: ProgresoRespuestas


class RespuestaBatallaEntrada(BaseModel):
    pregunta: str
    # Índice de la opción elegida (`OpcionPregunta.indice`).
    opcion: int = Field(ge=0, strict=True)


class ResolverBatallaEntrada(CompletarActividadEntrada):
    """Los destellos están en el front, que decide `victoria`; aciertos y preguntas salen de `respuestas`."""
    victoria: bool
    respuestas: list[RespuestaBatallaEntrada] = Field(min_length=1)


class ResolverCasoEntrada(CompletarActividadEntrada):
    puntaje: float = Field(ge=0, le=100, allow_inf_nan=False)
    # Códigos de las ocupaciones bien asignadas; entran a la colección solo si el caso se supera.
    ocupaciones: list[str] = []


class ResponderRegistroEntrada(AccionCuenta):
    clasificacion: Literal["ADECUADA", "POCO_DESARROLLADA"]
    ampliada: bool


class EscribirEntradaEntrada(AccionCuenta):
    """Sin `pregunta` ni `del_dia`, la entrada es libre."""
    titulo: str | None = None
    texto: str = Field(min_length=1)
    pregunta: str | None = None
    del_dia: bool = False

    @model_validator(mode="after")
    def validar_pregunta(self):
        if self.pregunta is not None and self.del_dia:
            raise ValueError("Una entrada responde una pregunta desbloqueada o la del día, no ambas")
        return self


class EditarEntradaEntrada(AccionCuenta):
    """`titulo` solo cambia si se envía (nulo lo quita)."""
    numero: int
    titulo: str | None = None
    texto: str = Field(min_length=1)


class BorrarEntradaEntrada(AccionCuenta):
    numero: int


class AbrirPreguntaEntrada(AccionCuenta):
    codigo: str


class CheckInEntrada(AccionCuenta):
    nivel_seguridad: int = Field(ge=1, le=5)


class VerCarreraEntrada(AccionCuenta):
    carrera: str


class VerOcupacionEntrada(AccionCuenta):
    ocupacion: str


class VerInstitucionEntrada(AccionCuenta):
    institucion: str


class VerTestimonioEntrada(AccionCuenta):
    testimonio: str


class PublicarEntrevistaEntrada(FechaAccion):
    autores: list[str] = Field(min_length=1)
    resumen: str

    @model_validator(mode="after")
    def validar_autores(self):
        if len(set(self.autores)) != len(self.autores):
            raise ValueError("Los autores no pueden repetirse")
        return self


class EscribirCartaEntrada(AccionCuenta):
    texto: str


class CompletarConversacionEntrada(AccionCuenta):
    conversacion: str


class EventoEntrada(AccionCuenta):
    tipo: TipoEventoUso
    referencia: str | None = None


class RespuestaAccion(BaseModel):
    """`entradas_desbloqueadas` solo aparece si la acción dejó preguntas en el diario."""
    eventos_registrados: list[EventoLegible]
    nuevos_desbloqueos: list[DesbloqueoNuevo]
    entradas_desbloqueadas: list[EntradaDesbloqueada] = []

    def campos(self) -> dict:
        """Los campos de la acción, para heredarlos en una respuesta más amplia sin fijar los omitidos."""
        campos = dict(eventos_registrados=self.eventos_registrados, nuevos_desbloqueos=self.nuevos_desbloqueos)
        if 'entradas_desbloqueadas' in self.model_fields_set:
            campos['entradas_desbloqueadas'] = self.entradas_desbloqueadas
        return campos


class RespuestaResolverCaso(RespuestaAccion):
    ocupaciones_nuevas: list[str]


class RespuestaRevelarResultado(RespuestaAccion):
    cuenta: str
    instrumento: str
    aplicacion: str
    perfil_plano: bool


class ResultadoAnulado(BaseModel):
    instrumento: str
    aplicacion: str
    calculado_en: datetime
    anulado_en: datetime


class RespuestaReiniciarInstrumento(RespuestaAccion):
    cuenta: str
    instrumento: str
    aplicacion: str
    resultado_anulado: ResultadoAnulado
    actividades_reiniciadas: list[str]


class RespuestaAgrupada(BaseModel):
    por_cuenta: dict[str, RespuestaAccion]
