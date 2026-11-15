from pydantic import BaseModel, model_serializer

from app.models import TipoConteo, TipoEventoUso, TipoObjetivo


class ObjetivoLegible(BaseModel):
    codigo: str
    nombre: str


class CondicionLegible(BaseModel):
    tipo_evento: TipoEventoUso
    referencia: str | None
    tipo_conteo: TipoConteo
    cantidad_minima: int


class ReglaLegible(BaseModel):
    regla: str
    nombre: str
    mensaje_bloqueo: str
    tipo_objetivo: TipoObjetivo
    objetivo: ObjetivoLegible
    condiciones: list[CondicionLegible]
    evaluador_especial: str | None


class ProgresoCondicion(BaseModel):
    tipo_evento: TipoEventoUso
    referencia: str | None
    tipo_conteo: TipoConteo
    actual: int
    requerido: int
    cumplida: bool
    texto: str | None = None


class ResultadoEvaluador(BaseModel):
    """Ajuste logros: `actual` y `requerido` son el avance del evaluador, si lo da; sin avance no se serializan,
    para que las respuestas de los evaluadores que solo dicen sí o no no cambien."""
    nombre: str
    cumplido: bool
    actual: int | None = None
    requerido: int | None = None

    @model_serializer(mode='wrap')
    def _sin_avance_nulo(self, serializar):
        datos = serializar(self)
        for campo in ('actual', 'requerido'):
            if datos.get(campo) is None:
                datos.pop(campo, None)
        return datos


class ResultadoRegla(BaseModel):
    cumple: bool
    condiciones: list[ProgresoCondicion]
    evaluador_especial: ResultadoEvaluador | None = None


class MotivoBloqueo(BaseModel):
    """Una regla del objetivo (son alternativas) con las condiciones que aún no se cumplen."""
    regla: str
    mensaje: str
    condiciones_faltantes: list[ProgresoCondicion]
    evaluador_especial: ResultadoEvaluador | None = None


class DesbloqueoNuevo(BaseModel):
    regla: str
    tipo_objetivo: TipoObjetivo
    objetivo: ObjetivoLegible
    condiciones: list[ProgresoCondicion]
    evaluador_especial: ResultadoEvaluador | None = None
