from uuid import uuid4

from sqlalchemy import insert, select
from sqlalchemy.orm import Session

from app.core.contexto import usar_contexto
from app.exceptions import ErrorAccion
from app.models import Cuenta, Entrevista, EntrevistaAutor, TipoEventoUso
from app.schemas.acciones import PublicarEntrevistaEntrada, RespuestaAgrupada
from app.services.comun import exigir_estudiante, fecha_accion, responder_varias_cuentas


@usar_contexto
def publicar_entrevista(sesion: Session, entrada: PublicarEntrevistaEntrada) -> RespuestaAgrupada:
    por_codigo = {cuenta.codigo: cuenta for cuenta in sesion.scalars(select(Cuenta).where(Cuenta.codigo.in_(entrada.autores)))}
    if any(codigo not in por_codigo for codigo in entrada.autores):
        raise ErrorAccion("Cuenta o referencia no encontrada", estado_http=404)
    cuentas = [por_codigo[codigo] for codigo in entrada.autores]
    for cuenta in cuentas:
        exigir_estudiante(cuenta)
    fecha = fecha_accion(entrada)
    entrevista = Entrevista(codigo=f"ENT-{uuid4().hex}", resumen=entrada.resumen, fecha_hora=fecha)
    sesion.add(entrevista)
    sesion.flush()
    sesion.execute(insert(EntrevistaAutor.__table__), [dict(entrevista_id=entrevista.id, cuenta_id=cuenta.id) for cuenta in cuentas])
    return responder_varias_cuentas(sesion, cuentas, {
        cuenta.id: [(TipoEventoUso.PUBLICA_ENTREVISTA, entrevista.id)] for cuenta in cuentas
    }, fecha)

