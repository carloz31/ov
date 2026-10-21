# AGENTS.md

Monorepo de una plataforma gamificada de orientación vocacional. Dos carpetas, un solo repo git:

| Carpeta | Qué es | Reglas propias |
|---|---|---|
| `ov_backend/` | FastAPI, SQLAlchemy, Alembic, pytest (uv) | `ov_backend/AGENTS.md` |
| `ov_frontend/` | React + Vite + TypeScript, node --test (npm) | `ov_frontend/AGENTS.md` |

Lee el `AGENTS.md` de la carpeta que vayas a tocar. Los comandos se corren desde la carpeta correspondiente (`cd ov_backend && …`).

## Qué leer

1. La spec de la tarea, en `ov_backend/docs/specs/`. Define el alcance y prevalece sobre todo lo demás.
2. El `AGENTS.md` de la carpeta y los documentos vigentes que nombre la tarea: `ov_backend/docs/sistema/` y `ov_frontend/docs/`.
3. `ov_backend/docs/plan-iteraciones.md`, solo para no cerrar caminos a las iteraciones siguientes. No se adelanta trabajo de otro lote.

No leas `docs/historico/` salvo que el usuario lo pida. Si algo de ahí contradice un documento vigente, prevalece el vigente. Si dos fuentes vigentes se contradicen, detente y explica la contradicción; no la resuelvas en el código.

## Cómo se trabaja

- Lee la spec completa antes de escribir código. No agregues endpoints, vistas ni funciones que la spec no pida.
- Por fases, en el orden de la spec. Al terminar cada fase, detente y resume qué hiciste, qué carpetas de pruebas corriste y qué queda pendiente.
- Si la spec no define algo, elige la opción más simple, anótala en `ov_backend/docs/decisiones.md` y sigue.
- Una prueba existente solo se adapta cuando la spec lo autoriza; anótalo también en `decisiones.md`. Si un escenario falla, se corrige la implementación, no el escenario.
- Datos de prueba: si el dato existe en el front, úsalo adaptado. Si no existe, créalo y márcalo con `DATO DE PRUEBA` (comentario en código) o `"_dato_de_prueba": true` (JSON).
- Ninguna dependencia nueva sin avisar antes.

## El modelo de datos cambia

El modelo sigue vivo. La única fuente de verdad es `ov_backend/app/models/` con sus migraciones; los documentos describen la intención, y si chocan con el código, gana el código.

- Todo cambio de modelo es un cambio completo, en el mismo commit: modelo, migración autogenerada y revisada a mano, `datos/` (`fijos.py` y `ruta.py`), documento vigente de `docs/sistema/`, esquemas y pruebas afectadas y, si cambia una respuesta que consume el front, todo lo que pide «Contrato».
- Un cambio de modelo que la spec no pide es una decisión de diseño: detente y propónlo antes de hacerlo. Si se aprueba, anótalo en `decisiones.md` (qué cambió y por qué).
- Nunca edites a mano una migración ya integrada en `main`; crea otra. Compactar migraciones (rehacer `0001`) solo si el usuario lo pide.
- Dos ramas que cambian el modelo a la vez crean dos `head` de Alembic. Antes de integrar, `uv run alembic heads` debe mostrar uno solo; si hay dos, rebasa y regenera la migración sobre la última.

## Documentación

- `ov_backend/docs/decisiones.md` es el único registro de decisiones, y solo de la spec en curso. Una viñeta por decisión: qué y por qué, en una o dos líneas.
- Al cerrar una spec, lo que siga vigente de ella y de `decisiones.md` se incorpora al `AGENTS.md` o al documento vigente que corresponda. Después, la spec y `decisiones.md` se mueven a `ov_backend/docs/historico/<nombre-de-la-spec>/` y `decisiones.md` vuelve a quedar con su encabezado.
- Ningún documento vigente remite a uno histórico.

## Política de pruebas

Las tablas de impacto de cada `AGENTS.md` indican qué carpetas corresponden a cada archivo.

| Momento | Qué se corre |
|---|---|
| Durante el desarrollo, tras cada cambio | Solo las carpetas de la tabla de impacto. |
| Al terminar una fase | Las carpetas de impacto de lo que tocó la fase, más `tests/integration/escenarios` (back) o `npm run test:servidor` (front). |
| Al cerrar una spec o antes de integrar una rama | Todo: `uv run pytest -n auto -q`; `npm test`, `npm run build`, `npm run lint` y `npm run check:estructura`. |

## Una sola base de datos

- La base del backend es la única fuente de disponibilidad, progreso, respuestas de cuestionario, resultados, fichas obtenidas, insignias y nivel.
- En modo `VITE_DATOS=api`, el front nunca decide si algo está disponible, completado u obtenido: lo lee del servidor. Si el servidor no responde, lo dice; no inventa un estado.
- El contenido narrativo de las actividades (nodos JSON) está en el front. El backend guarda estructura y estado, y no interpreta ese contenido.
- El modo `local` del front está congelado: conserva lo que hace hoy y no recibe funciones nuevas (ver `ov_frontend/AGENTS.md`).

## Contrato

El detalle está en `ov_backend/docs/sistema/integracion.md`.

- El backend lista bloques y actividades con su orden, tipo, `contenido` y `visibilidad`. El front guarda el contenido de cada actividad en `src/data/activities/contenidos/<clave>.json` y lo encuentra por la clave `contenido`. Una actividad cuyo contenido no existe en el front no se muestra, y se anota en `ov_frontend/docs/pendientes-interfaz.md`.
- Cada dominio tiene su propia consulta de lectura (`GET /cuentas/{c}/<dominio>`). El front pide al ingresar solo lo que se ve siempre, y el resto al abrir su vista.
- Los códigos del backend son los ids del front (`mission-welcome`, `act-tip-01`, `I1`, `psychologist`). No hay tablas de traducción.
- El JSON usa los nombres en español y `snake_case` de los esquemas Pydantic. El front los copia tal cual en `src/types/servidor.ts`, accede al backend solo desde `src/services/api/` (un archivo por router) y las vistas leen esos datos a través de `src/store/servidor/`.
- Si el backend entrega un dato que ninguna vista muestra, o una vista necesita un dato que el backend no entrega, y la spec no autoriza la interfaz, no se crea ni se modifica interfaz: se registra en `ov_frontend/docs/pendientes-interfaz.md` y se avisa al usuario.
- **Acceso:** toda ruta del backend pasa por el guardia de acceso del router, salvo `POST /sesion/ingresar` y lo que solo existe en desarrollo. Por defecto, una cuenta solo actúa sobre sí misma (`{cuenta}` o `cuenta` del cuerpo deben ser la del token). Una ruta que deba servir a otra cuenta (el apoderado sobre su hijo, la orientadora sobre su salón) declara su política con `politica_acceso(...)`. El front envía el token en `Authorization` desde `services/api/cliente.ts`.
- Si una tarea cambia una respuesta que consume el front, en la misma tarea se actualizan: el esquema y las pruebas del backend; `src/types/servidor.ts`, `src/services/api/` y `src/lib/servidor/adaptadores.ts` del front; los fixtures (desde `ov_backend/`: `uv run python scripts/exportar_fixtures_front.py --destino ../ov_frontend/tests/fixtures/servidor`), y las pruebas del front.

## Git

No hagas push salvo que se pida. Trabaja en la rama del lote (`lote/<id>`), con un commit por fase y mensaje en español (`Lote 2B · F1: semilla de registros`). Un commit puede tocar ambas carpetas. Nunca versiones `.env`, `.env.local` ni archivos `*.db`, y no dejes logs, bases temporales ni carpetas temporales de pruebas.

## Idioma

Documentación, mensajes al usuario y commits en español.
