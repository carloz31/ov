"""Panel del salón de la orientadora (ajuste panel-salon). Todo conteo es de estudiantes distintos; ninguna
respuesta lleva texto del diario ni de registros."""

from datetime import date
from typing import Literal

from pydantic import BaseModel


class SalonPanel(BaseModel):
    codigo: str
    nombre: str


class IndicadoresPanel(BaseModel):
    """Los cuatro indicadores de Seguimiento, cada uno «n de total_estudiantes»."""
    ingresaron: int
    dias_ingreso: int
    test_listo: int
    test_por_revisar: int
    test_sin_terminar: int
    con_plan_a: int
    con_tres_planes: int
    familias_participando: int
    familias_ruta_completa: int
    familias_conversaron: int


class AlertaPanel(BaseModel):
    """Una alerta con al menos un estudiante; `nombres` solo si caben (`PANEL_NOMBRES_VISIBLES_ALERTA`)."""
    codigo: str
    nombre: str
    descripcion: str | None
    cantidad: int
    nombres: list[str] | None


class GrupoAlertaPanel(BaseModel):
    codigo: str
    nombre: str
    alertas: list[AlertaPanel]


class AvisosPanel(BaseModel):
    con_avisos: int
    grupos: list[GrupoAlertaPanel]


EtiquetaCuestionario = Literal["REQUISITO", "REQUISITO_ALGUNOS", "CAMINO", "OPCIONAL"]
EstadoTest = Literal["LISTO", "POR_REVISAR", "EN_CURSO", "SIN_EMPEZAR"]


class TestPanel(BaseModel):
    """El instrumento principal (`PANEL_INSTRUMENTO_PRINCIPAL`): cada estudiante en un solo estado."""
    instrumento: str
    nombre: str
    etiqueta: EtiquetaCuestionario
    listo: int
    por_revisar: int
    perfil_plano: int
    prisa: int
    en_curso: int
    sin_empezar: int


class CuestionarioPanel(BaseModel):
    """Una aplicación de los demás instrumentos: `n` con resultado vigente (partida y llegada: respondida completa)."""
    aplicacion: str
    nombre: str
    etiqueta: EtiquetaCuestionario
    n: int


class TramoPanel(BaseModel):
    """`SIN_EMPEZAR`, un bloque del camino (su código) o `TERMINO`."""
    codigo: str
    nombre: str
    cantidad: int


class DetenidosPanel(BaseModel):
    actividad: str
    titulo: str
    cantidad: int
    dias: int


class BandaSeguridad(BaseModel):
    codigo: Literal["BAJA", "MEDIA", "ALTA"]
    desde: int
    hasta: int
    cantidad: int


class SeguridadPanel(BaseModel):
    bandas: list[BandaSeguridad]
    sin_senales: int


class SeguimientoPanel(BaseModel):
    fecha: date
    salon: SalonPanel | None
    total_estudiantes: int
    indicadores: IndicadoresPanel
    avisos: AvisosPanel
    test: TestPanel
    cuestionarios: list[CuestionarioPanel]
    tramos: list[TramoPanel]
    detenidos: DetenidosPanel | None
    seguridad: SeguridadPanel


class EstudiantePanel(BaseModel):
    codigo: str
    nombre: str
    salon: str
