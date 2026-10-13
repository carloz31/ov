# AGENTS.md

## Proyecto

Backend en FastAPI de una plataforma gamificada de orientación vocacional. `ov_frontend` consume esta API.

Documentos vigentes (lee los que toque la tarea):

| Documento | Qué define |
|---|---|
| `docs/sistema/motor.md` | Eventos, reglas, disponibilidad, acciones y progreso. |
| `docs/sistema/instrumentos.md` | Cuestionarios, cálculo de resultados, coincidencias O*NET y carreras. |
| `docs/sistema/registro.md` | Respuestas de registro, preguntas de seguimiento y evaluador (Gemini o falso). |
| `docs/sistema/integracion.md` | Contrato con el front, conjuntos de datos, fixtures y reinicio. |
| `docs/specs/` | La spec en curso. |
| `docs/decisiones.md` | Decisiones de la spec en curso. |

## Estructura

Esta estructura es fija. No crees carpetas ni módulos sueltos fuera de ella; si algo no encaja, detente y pregunta.

```
app/                    solo la aplicación; no lee archivos de datos
  main.py               crear_aplicacion(): configuración, lifespan, routers
  config.py             Configuracion y cargar_configuracion()
  database.py           motor, sesiones y todo lo que depende del dialecto
  dependencies.py       dependencias compartidas (SesionBD, ejecutar_accion, cuenta)
  exceptions.py         excepciones de dominio y su traducción a HTTP
  api/                  rutas, un archivo por grupo; sin lógica de negocio
  models/               tablas SQLAlchemy por dominio; __init__ reexporta todo
  schemas/              Pydantic de entrada y salida por dominio
  services/             lógica de negocio por dominio
    motor/              núcleo de desbloqueos
    instrumentos/       cálculo, consultas y resultados
    registro/           registro con evaluador de respuestas
  core/                 parámetros, caché de definiciones y contexto de consultas
datos/                  lo que llena la base: fijos.py, ruta.py, ocupaciones.py (Excel O*NET), cargar.py
migrations/             migraciones de Alembic
scripts/                herramientas manuales (exportador de fixtures)
tests/                  pruebas (ver «Pruebas»)
docs/                   sistema/, specs/, decisiones.md, plan-iteraciones.md, historico/
```

### Dónde va cada cosa

| Si agregas… | Va en… |
|---|---|
| Una consulta para una vista | `GET /cuentas/{c}/<dominio>` en `app/api/<dominio>.py`, con su esquema y servicio del mismo nombre. No agregues campos de otro dominio a una respuesta para ahorrar una petición. |
| Una actividad | `datos/ruta.py`, con `contenido` (la clave de su JSON en el front) y `visibilidad`. Si es del apoderado, en un bloque de audiencia `APODERADO` y espacio `PORTAL_FAMILIA`. |
| Un endpoint | `app/api/<grupo>.py`. Solo valida, llama a un servicio y devuelve. |
| Lógica de negocio | `app/services/<dominio>.py`, o `app/services/<dominio>/` si el dominio ya es carpeta. |
| Una tabla o columna | `app/models/<dominio>.py` **y** su migración en `migrations/versions/`, en el mismo commit. |
| Un enumerado | `app/models/enums.py`. |
| Un cuerpo de entrada o respuesta | `app/schemas/<dominio>.py`. |
| Un umbral o constante de método | `app/core/parametros.py`. |
| Una variable de entorno | `app/config.py` y `.env.example`. |
| Lo que tendrá la plataforma sea cual sea la ruta (RIASEC, catálogo O*NET; luego secciones, listas, temáticas…) | `datos/fijos.py`, sin `DATO DE PRUEBA`. Nunca en `app/`. |
| Datos de prueba de una mecánica | `datos/ruta.py`, en tuplas declarativas que interpreta el cargador, con códigos `t-...`. Nunca en `app/`. |
| Una tabla de estado de las cuentas | Además, en `TABLAS_DE_ESTADO` de `app/services/desarrollo.py`, para que el reinicio la vacíe (una prueba exige clasificar toda tabla como catálogo o estado). |
| Un dominio nuevo (favoritos, planes…) | Un archivo en `services/`, `schemas/` y, si tiene tablas, `models/`. Un archivo pasa a carpeta solo cuando ya no cabe en uno. |

### Dependencias entre capas

- `api` → `services` → `core`, `models`. `api` también usa `schemas`, `dependencies` y `exceptions`. `datos` → `app.models`, `app.core.parametros`.
- `app/` nunca importa `datos`, `scripts` ni `tests`.
- `services/` nunca importa `api/`. `core/` y `models/` nunca importan `services/`.
- `services/instrumentos/calculo.py` no accede a la base.
- Si los nombres coinciden entre capas, importa con alias: `from app.services import actividades as servicio_actividades`.

## Base de datos

- La URL viene de `DATABASE_URL` (por defecto `sqlite:///ov.db`, relativa a la raíz). La aplicación funciona igual con SQLite y PostgreSQL.
- Nada de SQL específico de un motor fuera de `app/database.py`. Los índices parciales llevan `sqlite_where` y `postgresql_where`. No reemplaces `func.date` por `CAST(... AS DATE)`: en SQLite devuelve el año.
- El esquema lo gestiona Alembic (`render_as_batch` para SQLite; nombres de restricciones por la `naming_convention` de `Base`). La aplicación nunca llama a `create_all` ni siembra datos: si falta el esquema, no arranca y pide `alembic upgrade head`. Solo las pruebas y el exportador de fixtures usan `create_all`, sobre bases temporales, mediante `datos.cargar`.
- Todo cambio en `app/models/` lleva su migración (`uv run alembic revision --autogenerate -m "..."`), revisada a mano, en el mismo commit. `tests/integration/migraciones/test_migraciones.py` debe seguir en verde.

## Datos

| Conjunto | Para qué |
|---|---|
| `ruta` (`datos/ruta.py` + `datos/fijos.py`) | Ruta mínima de prueba: lo justo para demostrar cada mecánica (`docs/plan-iteraciones.md`, «Ruta mínima de prueba»). Todo lo de `ruta.py` es `DATO DE PRUEBA`; `fijos.py` se carga en todo conjunto. |

- La aplicación no sabe qué conjunto tiene la base. Se carga con `uv run python -m datos.cargar <conjunto>` (`--vaciar` para reemplazarlo). El cargador valida que `contenido` use solo `[a-z0-9_]`.
- `POST /desarrollo/reiniciar`, solo con `ENTORNO=desarrollo`, borra el estado de las cuentas y conserva el catálogo.
- Los datos inventados se marcan con `DATO DE PRUEBA`.

## Convenciones

- Carpetas estándar en inglés (`api`, `models`, `schemas`, `services`, `core`); módulos, código, tablas, columnas y funciones en español y `snake_case`. Sin sufijos como `_service` o `_repo`. Enumerados en MAYÚSCULAS.
- La API expone códigos legibles (`act-tip-01`, `est-ana`), nunca ids internos.
- Cada acción (`POST /acciones/*`) ocurre en una sola transacción, abierta por `ejecutar_accion`; los servicios solo hacen `flush`. Si algo falla, se revierten estado, eventos, desbloqueos y resultados.
- Errores: `detail: {"mensaje": ...}`. 404 si no existe la cuenta, la referencia o el objetivo, o si es de otra audiencia; 409 si la acción no está permitida en el estado actual (con `progreso` del objetivo bloqueado o `items_faltantes` cuando aplica); 422 si la entrada es inválida; 403 solo para el progreso de una insignia oculta no obtenida.
- Fechas: las acciones aceptan `fecha_hora` opcional; se guarda sin zona, conservando la hora local. Sin fecha, se usa la hora de Lima (UTC−05:00). Todos los eventos de una petición comparten la misma fecha.
- Listas ordenadas por código (contenido, reglas), número (niveles, bloques) u orden (actividades, ítems); eventos y desbloqueos por fecha descendente. Los GET nunca escriben.
- Consultas: definiciones en la caché (`core/definiciones.py`), lecturas agrupadas por cuenta (`core/contexto.py`), escrituras en lote y ninguna consulta dentro de bucles. Las pruebas de presupuesto exigen que el número de consultas no crezca con el tamaño del catálogo: cada una agrega sus propias filas (`actividades_extra`, `aplicaciones_extra`, `agregar_ocupaciones`…) y compara pocas contra muchas, sin depender del tamaño de `ruta`. Los límites no se recalibran a la baja.

## Secretos y servicios externos

- La clave de Gemini se lee de `.env`, que nunca se versiona. No la escribas en código, logs, respuestas, errores ni documentación.
- `EVALUADOR=falso` (por defecto) o `EVALUADOR=gemini`. Las pruebas usan siempre el evaluador falso y nunca acceden a la red (salvo las de marca `postgres`, que se omiten sin `TEST_POSTGRES_URL`).
- No ejecutes nada que llame a la API real de Gemini salvo que el usuario lo pida explícitamente.

## Stack y comandos

Python 3.14, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, SQLite (desarrollo y pruebas), PostgreSQL opcional (extra `postgres`), pytest. Dependencias solo con `uv add` (`uv add --dev` para pruebas); no uses `pip` ni `requirements.txt`.

- Instalar: `uv sync` (con PostgreSQL: `uv sync --extra postgres`)
- Esquema: `uv run alembic upgrade head`
- Datos: `uv run python -m datos.cargar ruta`
- Levantar: `uv run uvicorn app.main:app --reload`
- Fixtures para el front: `uv run python scripts/exportar_fixtures_front.py --destino <carpeta de ov_frontend>/tests/fixtures/servidor` (escribe `ruta/ruta-*.json`)

## Pruebas

```text
tests/
  conftest.py        solo autouse sin base (evaluador falso)
  soporte/           ayudas compartidas; ninguna prueba importa un test_*.py
  unit/              arquitectura, configuracion, instrumentos, motor, registro
  integration/
    conftest.py      plantillas SQLite por sesión y proceso; cada prueba copia la suya
    actividades/ cuentas/ desarrollo/ fichas/ instrumentos/ logros/ motor/ secciones/
    datos/ migraciones/ contrato/
    escenarios/ruta/  test_ruta_corta.py: la ruta con las peticiones del front, sin /eventos
```

- `unit/` no usa TestClient ni bases sembradas (permite falsos y SQLite en memoria sin conjunto). Lo que use una base sembrada, migraciones, PostgreSQL o TestClient va en `integration/`; ante la duda, también.
- Las pruebas nuevas usan los fixtures de plantilla (`aplicacion` con `ruta`, `cliente`, `sesion`, `base_aislada`) y las ayudas de `soporte_ruta.py`. Solo las pruebas de carga, migraciones y atomicidad de la carga preparan bases propias.
- Solo se crean carpetas con pruebas. Los nombres `test_*.py` son únicos en todo `tests/` (`--import-mode=importlib`).

| Si cambias… | Corre primero |
|---|---|
| `app/services/<dominio>*`, `app/api/<dominio>.py`, `app/schemas/<dominio>.py` | `tests/unit/<dominio>` y `tests/integration/<dominio>`, si existen |
| `app/services/motor/*`, `app/services/eventos.py`, `app/services/comun.py` | `tests/unit/motor`, `tests/integration/motor`, `tests/integration/actividades` y `tests/integration/escenarios` |
| `app/models/*`, `migrations/*` | `tests/integration/migraciones` y `tests/integration/datos` |
| `datos/*` | `tests/integration/datos` y `tests/integration/escenarios` |
| `app/main.py`, `config.py`, `database.py`, `dependencies.py`, `exceptions.py`, `app/core/*` | `tests/unit` y `tests/integration/escenarios` |
| Una respuesta que consume el front | `tests/integration/contrato`, regenerar fixtures y `npm run test:servidor` en ov_frontend |

Ejemplo: `uv run pytest tests/integration/instrumentos -q`. En Windows, si falla el lanzador, usa `uv run python -m pytest`. Temporales y logs fuera del repo (por ejemplo, `--basetemp="$env:TEMP/ov-pruebas" -p no:cacheprovider`).

## Reglas compartidas

Están en el `AGENTS.md` de la raíz del monorepo.
