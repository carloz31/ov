"""Auditoría plataforma (ráfaga de ingresos): al arrancar, cada worker sube el límite de hilos de AnyIO a
`HILOS_POR_WORKER`, para que los ingresos que esperan su turno de Argon2 no dejen sin hilo al cierre de las sesiones."""
import anyio
import anyio.to_thread

from app.core.parametros import HILOS_POR_WORKER, VERIFICACIONES_CONTRASENA_SIMULTANEAS
from app.main import crear_aplicacion


def test_al_arrancar_el_worker_fija_el_limite_de_hilos(url_base_ruta):
    assert HILOS_POR_WORKER == 120
    assert VERIFICACIONES_CONTRASENA_SIMULTANEAS == 1
    aplicacion = crear_aplicacion(url_base_ruta)

    async def arrancar():
        limitador = anyio.to_thread.current_default_thread_limiter()
        assert limitador.total_tokens == 40
        async with aplicacion.router.lifespan_context(aplicacion):
            assert limitador.total_tokens == HILOS_POR_WORKER

    anyio.run(arrancar)
