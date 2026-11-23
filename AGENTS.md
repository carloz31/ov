# AGENTS.md

Monorepo de una plataforma gamificada de orientación vocacional. Dos carpetas, un solo repo git:

| Carpeta | Qué es | Reglas propias |
|---|---|---|
| `ov_backend/` | FastAPI, SQLAlchemy, Alembic, pytest (uv) | `ov_backend/AGENTS.md` |
| `ov_frontend/` | React + Vite + TypeScript, node --test (npm) | `ov_frontend/AGENTS.md` |

Lee el `AGENTS.md` de la carpeta que vayas a tocar. Los comandos se corren desde la carpeta correspondiente (`cd ov_backend && …`).

## Qué leer

El `AGENTS.md` de la carpeta y los documentos del sistema que toque la tarea: `ov_backend/docs/sistema/` y `ov_frontend/docs/`. Si dos de ellos se contradicen, detente y explica la contradicción; no la resuelvas en el código.

## Cómo se trabaja

- No agregues endpoints, vistas ni funciones que la tarea no pida. Si algo no está definido, elige la opción más simple.
- Por fases. Al terminar cada fase, detente y resume qué hiciste y qué carpetas de pruebas corriste.
- Si un escenario falla, se corrige la implementación, no el escenario.
- Datos de prueba: si el dato existe en el front, úsalo adaptado. Si no existe, créalo y márcalo con `DATO DE PRUEBA` (comentario en código) o `"_dato_de_prueba": true` (JSON).
- Ninguna dependencia nueva sin avisar antes.

## El modelo de datos cambia

El modelo sigue vivo. La única fuente de verdad es `ov_backend/app/models/` con sus migraciones; los documentos describen la intención, y si chocan con el código, gana el código.

- Todo cambio de modelo es un cambio completo, en el mismo commit: modelo, migración autogenerada y revisada a mano, `datos/` (`fijos.py` y `ruta.py`), documento de `docs/sistema/`, esquemas y pruebas afectadas y, si cambia una respuesta que consume el front, todo lo que pide «Contrato».
- Un cambio de modelo que la tarea no pide es una decisión de diseño: detente y propónlo antes de hacerlo.
- Nunca edites a mano una migración ya integrada en `main`; crea otra. Compactar migraciones (rehacer `0001`) solo si el usuario lo pide.
- Dos ramas que cambian el modelo a la vez crean dos `head` de Alembic. Antes de integrar, `uv run alembic heads` debe mostrar uno solo; si hay dos, rebasa y regenera la migración sobre la última.

## Política de pruebas

Las tablas de impacto de cada `AGENTS.md` indican qué carpetas corresponden a cada archivo.

| Momento | Qué se corre |
|---|---|
| Durante el desarrollo, tras cada cambio | Solo las carpetas de la tabla de impacto. |
| Al terminar una fase | Las carpetas de impacto de lo que tocó la fase, más `tests/integration/escenarios` (back) o `npm run test:servidor` (front). |
| Antes de integrar una rama | Todo: `uv run pytest -n auto -q`; `npm test`, `npm run build`, `npm run lint` y `npm run check:estructura`. |

## Una sola base de datos

- La base del backend es la única fuente de disponibilidad, progreso, respuestas de cuestionario, resultados, fichas obtenidas, insignias y nivel.
- En modo `VITE_DATOS=api`, el front nunca decide si algo está disponible, completado u obtenido: lo lee del servidor. Si el servidor no responde, lo dice; no inventa un estado.
- El contenido narrativo de las actividades (nodos JSON) está en el front. El backend guarda estructura y estado, y no interpreta ese contenido.
- El modo `local` del front está congelado: conserva lo que hace hoy y no recibe funciones nuevas (ver `ov_frontend/AGENTS.md`).

## Contrato

El detalle está en `ov_backend/docs/sistema/integracion.md`.

- El backend lista bloques y actividades con su orden, tipo, `contenido` y `visibilidad`. El front guarda el contenido de cada actividad en `src/data/activities/contenidos/` (`plataforma/` para el conjunto `contenido`, `ruta/` para `ruta`), como `<clave>.json`, y lo encuentra por la clave `contenido`. Una actividad cuyo contenido no existe en el front no se muestra.
- Cada dominio tiene su propia consulta de lectura (`GET /cuentas/{c}/<dominio>`). El front pide al ingresar solo lo que se ve siempre, y el resto al abrir su vista.
- Los códigos del backend son los ids del front (`b0-1`, `F01`, `R`); una ocupación se nombra por su O*NET (`19-3033.00`). No hay tablas de traducción.
- El JSON usa los nombres en español y `snake_case` de los esquemas Pydantic. El front los copia tal cual en `src/types/servidor.ts`, accede al backend solo desde `src/services/api/` (un archivo por router) y las vistas leen esos datos a través de `src/store/servidor/`.
- Si el backend entrega un dato que ninguna vista muestra, o una vista necesita un dato que el backend no entrega, no se crea ni se modifica interfaz sin que el usuario lo pida: se le avisa.
- **Acceso:** toda ruta del backend pasa por el guardia de acceso del router, salvo `POST /sesion/ingresar` y lo que solo existe en desarrollo. Por defecto, una cuenta solo actúa sobre sí misma (`{cuenta}` o `cuenta` del cuerpo deben ser la del token). Una ruta que deba servir a otra cuenta (el apoderado sobre su hijo, la orientadora sobre su salón) declara su política con `politica_acceso(...)`. El front envía el token en `Authorization` desde `services/api/cliente.ts`.
- **Colegio:** una cuenta ve lo de su salón y, a lo mucho (Leyendas), lo de su colegio; nunca lo de otro colegio. Toda consulta nueva que lea o cuente datos de otras cuentas debe respetarlo. El colegio no se expone en la API.
- Si una tarea cambia una respuesta que consume el front, en la misma tarea se actualizan: el esquema y las pruebas del backend; `src/types/servidor.ts`, `src/services/api/` y `src/lib/servidor/adaptadores.ts` del front; los fixtures (desde `ov_backend/`: `uv run python scripts/exportar_fixtures_front.py --destino ../ov_frontend/tests/fixtures/servidor`), y las pruebas del front.

## Git

No hagas push salvo que se pida. Commits con mensaje en español; un commit puede tocar ambas carpetas. Nunca versiones `.env`, `.env.local` ni archivos `*.db`, y no dejes logs, bases temporales ni carpetas temporales de pruebas.

## Idioma

Documentación, mensajes al usuario y commits en español.
