"""Notas de la orientadora sobre un estudiante (HU-108, ajuste panel-estudiantes). Cada orientadora ve, edita y
elimina solo las suyas; nadie más las ve. Son acciones (`/acciones/escribir-nota`, `editar-nota`, `borrar-nota`)
sin eventos de uso. El tope de caracteres es el parámetro `PANEL_MAXIMO_CARACTERES_NOTA`."""

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.contexto import usar_contexto
from app.exceptions import ErrorAccion
from app.models import NotaOrientadora
from app.schemas.panel_estudiante import (
    BorrarNotaEntrada, EditarNotaEntrada, EscribirNotaEntrada, NotaBorrada, NotaPerfil,
)
from app.services.panel.comun import entero, leer_parametros
from app.services.panel.perfil_acceso import estudiante_de_orientadora


def nota_publica(nota: NotaOrientadora) -> NotaPerfil:
    return NotaPerfil(numero=nota.numero, texto=nota.texto, creada_en=nota.creada_en,
                      actualizada_en=nota.actualizada_en)


def notas_de(sesion: Session, orientadora_id: int, estudiante_id: int) -> list[NotaPerfil]:
    """De la más reciente a la más antigua."""
    return [nota_publica(n) for n in sesion.scalars(select(NotaOrientadora).where(
        NotaOrientadora.orientadora_id == orientadora_id, NotaOrientadora.estudiante_id == estudiante_id)
        .order_by(NotaOrientadora.creada_en.desc(), NotaOrientadora.numero.desc()))]


def _texto(sesion: Session, texto: str) -> str:
    limpio = texto.strip()
    if not limpio:
        raise ErrorAccion("Escriba la nota", estado_http=422)
    if len(limpio) > entero(leer_parametros(sesion), "PANEL_MAXIMO_CARACTERES_NOTA"):
        raise ErrorAccion("La nota es demasiado larga", estado_http=422)
    return limpio


def _nota(sesion: Session, orientadora_id: int, estudiante_id: int, numero: int) -> NotaOrientadora:
    nota = sesion.scalar(select(NotaOrientadora).where(
        NotaOrientadora.orientadora_id == orientadora_id, NotaOrientadora.estudiante_id == estudiante_id,
        NotaOrientadora.numero == numero))
    if nota is None:
        raise ErrorAccion("Nota no encontrada", estado_http=404)
    return nota


@usar_contexto
def escribir_nota(sesion: Session, entrada: EscribirNotaEntrada, ahora: datetime) -> NotaPerfil:
    acceso = estudiante_de_orientadora(sesion, entrada.cuenta, entrada.estudiante, ahora)
    texto = _texto(sesion, entrada.texto)
    ultimo = sesion.scalar(select(func.max(NotaOrientadora.numero)).where(
        NotaOrientadora.orientadora_id == acceso.orientadora.id)) or 0
    nota = NotaOrientadora(numero=ultimo + 1, orientadora_id=acceso.orientadora.id,
                           estudiante_id=acceso.estudiante.id, texto=texto, creada_en=ahora, actualizada_en=ahora)
    sesion.add(nota)
    sesion.flush()
    return nota_publica(nota)


@usar_contexto
def editar_nota(sesion: Session, entrada: EditarNotaEntrada, ahora: datetime) -> NotaPerfil:
    acceso = estudiante_de_orientadora(sesion, entrada.cuenta, entrada.estudiante, ahora)
    nota = _nota(sesion, acceso.orientadora.id, acceso.estudiante.id, entrada.nota)
    nota.texto, nota.actualizada_en = _texto(sesion, entrada.texto), ahora
    sesion.flush()
    return nota_publica(nota)


@usar_contexto
def borrar_nota(sesion: Session, entrada: BorrarNotaEntrada, ahora: datetime) -> NotaBorrada:
    acceso = estudiante_de_orientadora(sesion, entrada.cuenta, entrada.estudiante, ahora)
    sesion.delete(_nota(sesion, acceso.orientadora.id, acceso.estudiante.id, entrada.nota))
    sesion.flush()
    return NotaBorrada(nota=entrada.nota)
