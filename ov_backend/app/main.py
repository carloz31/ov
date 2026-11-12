import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy.orm import sessionmaker

from app.api.router import crear_router
from app.config import cargar_configuracion, crear_cliente_llm
from app.core.definiciones import CacheDefiniciones
from app.database import comprobar_tablas, crear_motor_bd


def crear_aplicacion(url_bd: str | None = None) -> FastAPI:
    variables = None if url_bd is None else {**os.environ, 'DATABASE_URL': url_bd}
    configuracion = cargar_configuracion(entorno=variables)
    motor_bd = crear_motor_bd(configuracion.url_bd)
    fabrica_sesiones = sessionmaker(bind=motor_bd)

    @asynccontextmanager
    async def ciclo_vida(aplicacion: FastAPI):
        try:
            comprobar_tablas(motor_bd)
            motor_bd.cache_definiciones = CacheDefiniciones(motor_bd)
            yield
        finally:
            motor_bd.dispose()

    aplicacion = FastAPI(title="Plataforma de orientación vocacional", lifespan=ciclo_vida)
    aplicacion.state.motor_bd = motor_bd
    aplicacion.state.configuracion = configuracion
    aplicacion.state.fabrica_sesiones = fabrica_sesiones
    # El cliente del LLM (registros, guion y pasos del plan); las pruebas lo reemplazan.
    aplicacion.state.cliente_llm = crear_cliente_llm(configuracion)
    aplicacion.include_router(crear_router(configuracion.entorno))
    return aplicacion


app = crear_aplicacion()
