from fastapi import APIRouter

from app.api import (
    acciones, actividades, batallas, casos, catalogo, conversaciones, cuentas, desarrollo, diario, favoritos, fichas,
    instrumentos, logros, planes, referencias, registro, secciones, tematicas, testimonios,
)


def crear_router(entorno: str) -> APIRouter:
    router = APIRouter()
    router.include_router(cuentas.router)
    router.include_router(actividades.router)
    router.include_router(fichas.router)
    router.include_router(testimonios.router)
    router.include_router(catalogo.router)
    router.include_router(favoritos.router)
    router.include_router(conversaciones.router)
    router.include_router(planes.router)
    router.include_router(batallas.router)
    router.include_router(casos.router)
    router.include_router(secciones.router)
    router.include_router(diario.router)
    router.include_router(logros.router)
    router.include_router(tematicas.router)
    router.include_router(acciones.router)
    router.include_router(instrumentos.router)
    router.include_router(registro.router)
    router.include_router(referencias.router)
    if entorno == 'desarrollo':
        router.include_router(desarrollo.router)
    return router
