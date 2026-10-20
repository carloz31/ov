# Decisiones de la spec en curso

<!-- Spec en curso: B17 · Acceso. -->

- **Orientadora en B17:** prevalece la spec sobre `plan-iteraciones.md`; `es_de_su_salon` solo se prueba en unitarias y la cobertura exige 404 de ori-carmen sobre est-ana. Se ajustó la línea del plan.
- **Rutas sin cuenta objetivo** (`GET /reglas`, `GET /instrumentos`, `GET /actividades/{a}/items`, `GET /actividades/{a}/items-registro`): exigen token válido, sin política de objetivo.
- **`fecha_hora` solo en desarrollo:** un `ContextVar` en `app/core/` prohibido por defecto; el guardia lo habilita solo con `ENTORNO=desarrollo` y `fecha_accion()` lo lee. Evita tocar sus 40 llamadas.
- **Guardia y transacción:** el guardia carga el actor en la sesión de la petición; al terminar hace `sesion.rollback()` (para que `ejecutar_accion` pueda abrir `sesion.begin()`) y guarda en `request.state` solo `id`, `codigo` y `rol`.
- **Intentos fallidos:** el intento se confirma con commit y el 401 se responde después de cerrar la transacción; si no, el rollback borraría el intento y el bloqueo nunca ocurriría.
- **Usuarios del modo local** en `src/data/demo/usuariosPrueba.ts`: `store/` no puede importar `features/`.
- **Línea de error del login:** `<p role="alert">` con la clase del aviso existente del login (`.ov-login-demo`); sin estilo nuevo.
- **`configurarAcceso`** en `cliente.ts`, llamado desde `main.tsx` como `configurarServidor` (que vive en `config/env.ts`).
- **Modelo (M):** `cuenta.intentos_fallidos` (0) y `cuenta.bloqueada_hasta` (nulo), migración `0019`, para el bloqueo de 5 intentos durante 15 minutos. `OrigenSesion` solo viaja en el token.
- **Hash en `datos/`:** `ruta.py` usa `argon2.PasswordHasher()` directo (mismos parámetros por defecto que `services/acceso.py`), porque `datos/` solo importa `app.models` y `app.core.parametros`.
- **`JWT_SECRETO` en producción:** se adaptaron `tests/unit/configuracion/test_configuracion.py` y `tests/integration/desarrollo/test_entorno_desarrollo.py`, que creaban configuración de producción sin secreto (lo exige la spec).
