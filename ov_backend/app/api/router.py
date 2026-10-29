from fastapi import APIRouter, Depends

from app.api import (
    acciones, actividades, avance, batallas, casos, catalogo, conversaciones, cuentas, desarrollo, diario, familia, favoritos,
    fichas, instrumentos, investigaciones, logros, planes, presentaciones, referencias, registro, secciones, sesion, tematicas, testimonios,
)
from app.dependencies import guardia, habilitar_fecha_cliente


def crear_router(entorno: str) -> APIRouter:
    router = APIRouter()
    router.include_router(sesion.router_ingreso)
    # B17: todo lo demás pasa por el guardia, aunque la ruta nueva olvide declararlo.
    protegido = APIRouter()
    protegido.include_router(sesion.router)
    protegido.include_router(cuentas.router)
    protegido.include_router(actividades.router)
    protegido.include_router(fichas.router)
    protegido.include_router(testimonios.router)
    protegido.include_router(catalogo.router)
    protegido.include_router(favoritos.router)
    protegido.include_router(conversaciones.router)
    protegido.include_router(familia.router)
    protegido.include_router(planes.router)
    protegido.include_router(investigaciones.router)
    protegido.include_router(batallas.router)
    protegido.include_router(casos.router)
    protegido.include_router(secciones.router)
    protegido.include_router(diario.router)
    protegido.include_router(logros.router)
    protegido.include_router(presentaciones.router)
    protegido.include_router(tematicas.router)
    protegido.include_router(avance.router)
    protegido.include_router(acciones.router)
    protegido.include_router(instrumentos.router)
    protegido.include_router(registro.router)
    protegido.include_router(referencias.router)
    router.include_router(protegido, dependencies=[Depends(guardia)])
    if entorno == 'desarrollo':
        router.include_router(desarrollo.router, dependencies=[Depends(habilitar_fecha_cliente)])
    return router
