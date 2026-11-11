from datetime import datetime

from sqlalchemy import (
    CheckConstraint, DateTime, ForeignKey, Index, JSON, Text, UniqueConstraint, column, false, text, true,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import TipoJSON
from app.models.base import Base, enumerado
from app.models.enums import EstadoRespuestaRegistro, FuenteOpciones

# Ajuste registros llm (lote 2): los tipos de la capa del LLM v7 (`app/services/registro/llm/tarjeta.TIPOS`).
TIPOS_LLM = ('propio', 'general', 'emocional', 'no_sabe', 'vacio', 'fuera_de_tema')
# Fuentes de opciones que arma la función de contexto con piezas de la cuenta (lote 2, §4).
FUENTES_PIEZAS = ('PIEZAS_PERFIL', 'PIEZAS_PERFIL_MENOS', 'PIEZAS_INICIO')


class ListaOpciones(Base):
    __tablename__ = "lista_opciones"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    nombre: Mapped[str]
    comun: Mapped[bool]


class OpcionLista(Base):
    __tablename__ = "opcion_lista"
    __table_args__ = (UniqueConstraint("lista_id", "codigo", name="uq_opcion_lista_codigo"),
                      UniqueConstraint("lista_id", "orden", name="uq_opcion_lista_orden"))
    id: Mapped[int] = mapped_column(primary_key=True)
    lista_id: Mapped[int] = mapped_column(ForeignKey("lista_opciones.id"))
    codigo: Mapped[str]
    texto: Mapped[str] = mapped_column(Text)
    orden: Mapped[int]


# Sin elección, nada de elección; con elección, su fuente: LISTA (lista_id), REFERENCIA (referencia_opciones_id),
# PROPIAS (solo opciones_propias) o una lista armada de piezas (PIEZAS_*, sin lista ni referencia). Las opciones
# propias pueden sumarse a una lista, a una referencia o a las piezas.
ELECCION_VALIDA = (
    "(fuente_opciones IS NULL AND lista_id IS NULL AND referencia_id IS NULL AND referencia_opciones_id IS NULL"
    " AND opciones_propias IS NULL AND premarcar_si IS NULL AND eleccion_minima IS NULL"
    " AND eleccion_maxima IS NULL AND eleccion_ordenada = false AND permite_otra = false)"
    " OR (fuente_opciones IS NOT NULL AND eleccion_minima >= 0"
    " AND eleccion_maxima >= 1 AND eleccion_maxima >= eleccion_minima"
    " AND (fuente_opciones <> 'LISTA' OR (lista_id IS NOT NULL AND referencia_opciones_id IS NULL))"
    " AND (fuente_opciones <> 'REFERENCIA' OR (referencia_opciones_id IS NOT NULL AND lista_id IS NULL))"
    " AND (fuente_opciones <> 'PROPIAS' OR (lista_id IS NULL AND referencia_opciones_id IS NULL"
    " AND opciones_propias IS NOT NULL))"
    " AND (fuente_opciones NOT IN ('PIEZAS_PERFIL', 'PIEZAS_PERFIL_MENOS', 'PIEZAS_INICIO')"
    " OR (lista_id IS NULL AND referencia_opciones_id IS NULL)))"
)


class ItemRegistro(Base):
    __tablename__ = "item_registro"
    __table_args__ = (
        UniqueConstraint("actividad_id", "orden"),
        CheckConstraint(ELECCION_VALIDA, name="eleccion_valida"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    actividad_id: Mapped[int] = mapped_column(ForeignKey("actividad.id"))
    orden: Mapped[int]
    nombre: Mapped[str]
    # Ajuste registros llm (lote 2): la consigna en sus cuatro partes; cualquiera puede llevar marcadores
    # (`{carrera}`, `{valor 1}`…), que se resuelven por cuenta. Solo la pregunta del texto es obligatoria.
    dialogo: Mapped[str | None] = mapped_column(Text, default=None)
    pregunta_eleccion: Mapped[str | None] = mapped_column(Text, default=None)
    pregunta_texto: Mapped[str] = mapped_column(Text)
    arranque: Mapped[str | None] = mapped_column(Text, default=None)
    obligatorio: Mapped[bool]
    lista_id: Mapped[int | None] = mapped_column(ForeignKey("lista_opciones.id"))
    # Elección que retoma una anterior (F02): las opciones son las de la lista; esta referencia ELECCION solo
    # marca lo elegido la vez pasada. Cierra un ciclo con `referencia.item_registro_id`; por eso la FK se crea aparte.
    referencia_id: Mapped[int | None] = mapped_column(ForeignKey(
        "referencia.id", use_alter=True, name="fk_item_registro_referencia_id_referencia"))
    eleccion_minima: Mapped[int | None]
    eleccion_maxima: Mapped[int | None]
    eleccion_ordenada: Mapped[bool] = mapped_column(default=False, server_default=false())
    # En un ítem de varias opciones, cada «Otra» va con su código (`OTRA-1`, `OTRA-2`…); en uno de una, `OTRA`.
    permite_otra: Mapped[bool] = mapped_column(default=False, server_default=false())
    # La etiqueta de la «Otra» cuando no es la de siempre («Otra cosa mía», «Otra cosa que cambió»).
    etiqueta_otra: Mapped[str | None] = mapped_column(default=None)
    # Ajuste registros. De dónde salen las opciones; con REFERENCIA, la de la actividad que las da en vivo
    # (PLANES, FAMILIAS_RECOMENDADAS, ELECCION, TESTIMONIOS). Forma un ciclo como `referencia_id`.
    fuente_opciones: Mapped[FuenteOpciones | None] = mapped_column(enumerado(FuenteOpciones), default=None)
    referencia_opciones_id: Mapped[int | None] = mapped_column(ForeignKey(
        "referencia.id", use_alter=True, name="fk_item_registro_referencia_opciones_id_referencia"), default=None)
    # [{codigo, texto, exclusiva?, pregunta?, arranque?, tarjeta?, sin_llm?}]: `pregunta` y `arranque` reemplazan los
    # del ítem al marcarla; `tarjeta`, la del ítem; `sin_llm`, la opción no se evalúa aunque el ítem tenga tarjeta.
    opciones_propias: Mapped[list | None] = mapped_column(JSON(none_as_null=True), default=None)
    # {item, opcion, marca}: si en `item` (anterior, misma actividad) se eligió `opcion`, llega marcada `marca`.
    premarcar_si: Mapped[dict | None] = mapped_column(JSON(none_as_null=True), default=None)
    # Dos listas de ecos (lote 2): los que se muestran y los que van al LLM, cada uno
    # {origen: TEXTO|ELECCION|REFERENCIA, codigo, nombre?, ...}; los arma `services/registro/contexto.py`.
    ecos_mostrar: Mapped[list | None] = mapped_column(JSON(none_as_null=True), default=None)
    ecos_llm: Mapped[list | None] = mapped_column(JSON(none_as_null=True), default=None)
    # La tarjeta del LLM v7 tal como está en `datos/tarjetas_registros` (`tarjeta`, `bases`, `general_por_opcion`,
    # `filtrar_etiqueta`), sin las de opción, que van en su opción propia. Sin tarjeta, el ítem va sin LLM.
    tarjeta: Mapped[dict | None] = mapped_column(JSON(none_as_null=True), default=None)


_TIPOS = ", ".join(f"'{tipo}'" for tipo in TIPOS_LLM)


class RespuestaRegistro(Base):
    """Un intento de un ítem (lote 2). El vigente es el único que se muestra, se cita y cuenta para el registro;
    guardar un intento nuevo pasa el anterior, completo, al histórico (`vigente = false`)."""
    __tablename__ = "respuesta_registro"
    __table_args__ = (
        UniqueConstraint("progreso_id", "item_registro_id", "intento"),
        Index("uq_respuesta_registro_vigente", "progreso_id", "item_registro_id", unique=True,
              sqlite_where=text("vigente"), postgresql_where=text("vigente")),
        CheckConstraint("intento >= 1", name="intento_valido"),
        CheckConstraint(TipoJSON(column("opciones_elegidas")) == 'array', name="opciones_elegidas_lista"),
        CheckConstraint(TipoJSON(column("texto_citable")) == 'array', name="texto_citable_lista"),
        CheckConstraint(f"primera_tipo IS NULL OR primera_tipo IN ({_TIPOS})", name="primera_tipo_valido"),
        CheckConstraint(f"conjunto_tipo IS NULL OR conjunto_tipo IN ({_TIPOS})", name="conjunto_tipo_valido"),
        CheckConstraint(f"tipo_final IS NULL OR tipo_final IN ({_TIPOS})", name="tipo_final_valido"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    progreso_id: Mapped[int] = mapped_column(ForeignKey("progreso_actividad.id"))
    item_registro_id: Mapped[int] = mapped_column(ForeignKey("item_registro.id"))
    intento: Mapped[int] = mapped_column(default=1, server_default=text("1"))
    vigente: Mapped[bool] = mapped_column(default=True, server_default=true())
    # La elección tal como se mostró: [{codigo, texto, origen?, grupo?}], en su orden (en un podio, el puesto).
    opciones_elegidas: Mapped[list[dict]] = mapped_column(JSON(none_as_null=True), default=list,
                                                          server_default=text("'[]'"))
    # {marcadores: {...}, ecos: [...]}: los valores con que se respondió (el lote 3 detecta el eco cambiado).
    valores_contexto: Mapped[dict | None] = mapped_column(JSON(none_as_null=True), default=None)
    primera_respuesta: Mapped[str] = mapped_column(Text)
    primera_tipo: Mapped[str | None] = mapped_column(default=None)
    primera_motivo: Mapped[str | None] = mapped_column(Text, default=None)
    repregunta: Mapped[str | None] = mapped_column(Text, default=None)
    segunda_respuesta: Mapped[str | None] = mapped_column(Text, default=None)
    conjunto_tipo: Mapped[str | None] = mapped_column(default=None)
    conjunto_motivo: Mapped[str | None] = mapped_column(Text, default=None)
    arranque: Mapped[str | None] = mapped_column(Text, default=None)
    tipo_final: Mapped[str | None] = mapped_column(default=None)
    estado: Mapped[EstadoRespuestaRegistro] = mapped_column(enumerado(EstadoRespuestaRegistro))
    sensible: Mapped[bool] = mapped_column(default=False, server_default=false())
    seguimiento_sin_evaluar: Mapped[bool] = mapped_column(default=False, server_default=false())
    pista: Mapped[str | None] = mapped_column(Text, default=None)
    linea_registro: Mapped[str | None] = mapped_column(Text, default=None)
    # Lo que se puede citar en otras actividades: 0 a 2 líneas (`llm/estado.py`).
    texto_citable: Mapped[list[str]] = mapped_column(JSON(none_as_null=True), default=list,
                                                     server_default=text("'[]'"))
    version_prompt: Mapped[str | None] = mapped_column(default=None)
    creada_en: Mapped[datetime] = mapped_column(DateTime)
    actualizada_en: Mapped[datetime] = mapped_column(DateTime)


class TextoFijo(Base):
    """Texto de la plataforma igual en todas las actividades (p. ej. `LUMI_SENSIBLE`); lo carga `fijos`."""
    __tablename__ = "texto_fijo"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(unique=True)
    texto: Mapped[str] = mapped_column(Text)
