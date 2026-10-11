# AGENTS.md

## Proyecto

Frontend en React + Vite + TypeScript de una plataforma gamificada de orientación vocacional, con tres portales: estudiante (aventura inmersiva), apoderado y orientadora. Consume la API de `ov_backend`.

Documentos vigentes (lee los que toque la tarea):

| Documento | Qué define |
|---|---|
| `docs/origen-de-datos.md` | Qué viene del servidor, qué es contenido, catálogo o demostración, y las claves del navegador. |
| `docs/contenidos-actividades.md` | Formato de los JSON de actividades: nodos, tipos y reglas de completitud. |
| `docs/pendientes-interfaz.md` | Datos sin vista que esperan decisión del usuario. |
| `ov_backend/docs/sistema/integracion.md` | Contrato con el backend. |
| `ov_backend/docs/specs/` | La spec en curso. |

## Estructura

Esta estructura es fija. No crees carpetas ni archivos fuera de ella; si algo no encaja, detente y pregunta. `npm run check:estructura` la comprueba.

```
src/
  main.tsx, App.tsx, index.css
  config/        entorno (env.ts: modoApi, urlApi, desarrollo) y alcance de la demo
  routes/        AppRoutes.tsx (solo la tabla de rutas), paths.ts, guardas
  pages/         una vista por ruta y los layouts de cada portal: auth/, student/, parent/, counselor/
  features/      un dominio por carpeta: auth, activities, adventure, backpack, cases, discovery,
                 journal, family-conversations, parent, counselor, student-tracking
    <dominio>/   components/, hooks/, lib/, data/, store/, context/, styles/, types.ts
  components/    reutilizables sin lógica de dominio: ui/ (shadcn), common/, layout/, staff/, student/
  context/       contextos que usan varios dominios
  store/         estado global; servidor/ es el estado sincronizado con el backend
  services/api/  el único acceso al backend: cliente.ts y un archivo por grupo de rutas
  data/          datos fijos de varios dominios: activities/, catalog/, content/, demo/
  lib/           lógica pura compartida; lib/activities (motor de actividades), lib/servidor (adaptadores)
  hooks/         hooks globales
  types/         tipos compartidos; servidor.ts es el contrato con el backend
  styles/        theme.css y styles/student/
```

### Dónde va cada cosa

| Si agregas… | Va en… |
|---|---|
| Un contenido de actividad | `src/data/activities/contenidos/<clave>.json`, registrado en `contenidos.ts` con un import explícito (sin `import.meta.glob`). La clave es la que indica el backend en `contenido`. |
| Una sección nueva de datos del servidor | `services/api/<dominio>.ts` y una sección en `store/servidor/` que se pide al abrir su vista. |
| Una ruta | `routes/AppRoutes.tsx` + su vista en `pages/<portal>/`. La vista lee parámetros, llama a hooks y compone; no contiene lógica de dominio. |
| Un componente de un dominio | `features/<dominio>/components/`. |
| Un componente que usan dos dominios | `components/student/`, `components/staff/` o `components/common/` si no conoce el dominio. Si lo conoce, detente y pregunta. |
| Una primitiva de interfaz | `components/ui/`. Usa la de shadcn antes de crear otra. |
| Una llamada al backend | `services/api/<recurso>.ts`, agrupado como los routers del backend. GET → `obtener`, POST → `enviar`, PATCH → `actualizar`, DELETE → `eliminar`. Si el backend define un PUT, detente y avisa antes de agregar un método al cliente. |
| Un tipo del contrato | `types/servidor.ts`, copiado tal cual del esquema Pydantic. |
| Convertir una respuesta en datos para la vista | `lib/servidor/adaptadores.ts`. |
| Estado que viene del servidor | `store/servidor/`. El del portal del apoderado, en `store/servidor/apoderado.ts`; no reutiliza el almacén del estudiante. |
| Elegir entre dato del servidor y dato local | Un hook en `features/<dominio>/hooks/`. Nunca en una vista. |
| Estado persistente de varios dominios | `store/<nombre>Store.ts`; de un dominio, `features/<dominio>/store/`. |
| Lógica pura | `features/<dominio>/lib/`; si la usan varios dominios o una capa inferior, `lib/`. |
| Contenido fijo | `features/<dominio>/data/` si es de un dominio; si no, `data/content/` (narrativo), `data/catalog/` (catálogo que podría venir del servidor) o `data/activities/`. |
| Datos inventados | `data/demo/` o `features/<dominio>/data/`, con `// DATO DE PRUEBA: <qué es y qué lo reemplazará>` al inicio. |
| Un tipo de varias capas | `types/<dominio>.ts`; de una feature, `features/<dominio>/types.ts`. |
| Una variable de entorno | `config/env.ts` y `.env.example`. |
| CSS | `features/<dominio>/styles/`; si es de todo el portal del estudiante, `styles/student/`. |
| Un dominio nuevo (favoritos…) | Su carpeta en `features/`, con las subcarpetas que necesite; agrégalo a la lista de arriba. |

### Dependencias entre capas

- `routes → pages → features → store → services/api`. Todas pueden usar `components`, `hooks`, `lib`, `data`, `types` y `config`, salvo lo que sigue.
- `components/` no importa `features`, `pages`, `store`, `services` ni `context`.
- `services/api/` solo importa `config` y `types`. `fetch` solo existe en `services/api/cliente.ts`, cuyas funciones solo se importan dentro de `services/api/`.
- `store/` no importa `features`, `pages`, `components` ni `context`. `lib/`, `data/`, `types/` y `config/` no importan capas superiores.
- `pages/` y `features/` no importan `services/`: los datos del backend llegan por `store/servidor/` y los hooks.
- Una feature no usa componentes de otra, salvo de `family-conversations` y `student-tracking`. Si hace falta un componente ajeno, pásalo desde la vista de ruta como prop o `children`, o súbelo a `components/`.
- `modoApi` y `desarrollo` no se importan en `components/`, `pages/` ni `features/*/components/` (sí en `lib/` y `store/`, que son selectores). El hook del dominio devuelve el mismo modelo en los dos modos y, si algo solo se muestra en uno, una bandera con nombre del dominio (`puedeReiniciar`, `mostrarRequisito`), no `modoApi`.
- `lib/activities/logic.ts`, `lib/servidor/adaptadores.ts` y `lib/explorationAssets.ts` solo importan tipos: las pruebas los cargan aislados.

### Componentes

- Un componente exportado por archivo; ayudantes privados de hasta unas 40 líneas en el mismo archivo.
- Máximo 300 líneas por `.tsx` y 400 por `.ts` (sin contar `data/` ni `components/ui/`). Una vista de ruta, idealmente 150. El estado y los efectos de un componente grande van a un hook del dominio. Dividir un componente no cambia su marcado (mismos elementos, clases, `aria-*` y orden): las pruebas de renderizado comparan HTML.
- Antes de crear un componente, busca uno que ya lo haga. No copies un componente para variarlo: agrega una prop o extrae la parte común.
- Componentes en `PascalCase.tsx`; el resto en `camelCase.ts`; CSS en `kebab-case.css`. Sin barriles (`index.ts`): importa el archivo concreto. Usa `@/` para salir de la propia feature o capa.
- `scripts/estructura-excepciones.json` está vacío. No agregues excepciones; si una regla no se puede cumplir, detente y explica por qué.

## Origen de los datos

- `VITE_DATOS=local` (por defecto) debe comportarse exactamente como antes. En `VITE_DATOS=api`, `prototypeAllUnlocked`, `studentDemoEnabled` y `pendingContent` no afectan la disponibilidad.
- Si una tarea mueve un dato entre servidor, contenido, catálogo o demostración, actualiza `docs/origen-de-datos.md` en la misma tarea. Cuando un dato pase al servidor, cambian el hook del dominio y `store/servidor/`; las vistas no deberían cambiar.
- No cambies claves ni formatos de `localStorage`, `sessionStorage` o IndexedDB sin una migración que conserve lo guardado (claves en `docs/origen-de-datos.md`).
- Para la red basta `fetch`. El proxy de desarrollo `/api` apunta a `http://127.0.0.1:8000`.

## Interfaz

Las vistas actuales son la referencia: el código y sus pruebas definen cómo se ven y se comportan. La interfaz la decide el usuario; una vista nueva o un cambio de vista llega como spec, con su mockup, y solo se hace lo que esa spec describe (qué vista, qué elemento, qué texto). Cita en el resumen la sección que lo autoriza.

### Datos del servidor sin vista

Un agente conecta datos a la interfaz que ya existe; no diseña interfaz nueva para mostrarlos.

- **Conectar sí:** que un elemento que ya existe (un contador, una insignia, un candado, un texto) tome su valor del servidor en lugar del dato local, con el mismo marcado, textos y estilo.
- **Agregar no:** si el backend entrega un dato que ninguna vista muestra, o mostrarlo exige algo que no existe (pantalla, sección, tarjeta, columna, pestaña, texto, ícono, estado visual o ruta), no crees ni modifiques interfaz. Tampoco reutilices un componente en otro lugar ni pongas un texto provisional.
- El dato sí puede llegar hasta `types/servidor.ts`, `services/api/`, `store/servidor/`, `lib/servidor/adaptadores.ts` y el hook del dominio, sin pintarse.
- **Detente y avisa.** Anota cada caso en `docs/pendientes-interfaz.md` (formato en `ov_backend/docs/sistema/integracion.md`) y en tu resumen, con 2 o 3 opciones de interfaz. No implementes ninguna hasta que el usuario responda.
- **Al revés:** si una vista necesita un dato que el servidor no entrega, no lo inventes ni lo calcules en el front; anótalo igual y avisa.
- Si crees que la tarea no se puede terminar sin tocar una vista, detente antes de tocarla y pide autorización. Nunca cambies una vista esperando aprobarla después.
- Estados de carga y error: usa los mensajes y componentes que ya existen (`mensajeErrorServidor`, los avisos actuales). Un estado visual nuevo también se consulta.

## Comandos y pruebas

- Instalar: `npm ci`. Desarrollo: `npm run dev` (con `VITE_DATOS=api` en `.env.local` para usar el backend).
- `npm run check:estructura` debe pasar al terminar cualquier tarea.

```text
tests/
  local/        actividades/, aventura/, casos/, perfil/, portales/   (modo local)
  servidor/     actividades/, mapa/, instrumentos/, logros/, perfil/  (modo api, con fixtures)
  despliegue/
  fixtures/servidor/   generados por ov_backend; no se editan a mano
  soporte/             ayudantes compartidos
```

- Las pruebas nuevas de integración van en `tests/servidor/<área>/` y usan `tests/fixtures/servidor/`.
- Las pruebas cargan archivos por su ruta: si mueves un archivo, actualiza esas rutas en la misma tarea. No agregues resolución de carpetas a los cargadores.
- Comandos: `npm test`, `npm run test:local`, `npm run test:servidor`, `npm run test:despliegue`. Una carpeta: `node --test "tests/servidor/instrumentos/**/*.test.mjs"` (con comillas, para que funcione en PowerShell).
- Ninguna tarea debe agregar fallas. Las pruebas de aventura usan el seguimiento por criterios y el alcance vigente de la demo.

| Si cambias… | Corre primero |
|---|---|
| `store/servidor/`, `lib/servidor/`, `services/api/`, `types/servidor.ts`, o regeneras fixtures | `npm run test:servidor` |
| `features/activities/`, `lib/activities/`, `data/activities/` | `tests/local/actividades` y `tests/servidor/actividades` |
| `features/adventure/` | `tests/local/aventura`, `tests/servidor/mapa` y `tests/servidor/logros` |
| `features/discovery/` | `tests/servidor/instrumentos`, `tests/servidor/perfil` y `tests/servidor/logros` |
| `features/cases/` | `tests/local/casos` |
| `features/parent/`, `features/counselor/`, `features/student-tracking/`, `pages/parent/`, `pages/counselor/` | `tests/local/portales` y `tests/local/perfil` |
| `lib/explorationAssets.ts` o recursos de `public/` | `npm run test:despliegue` |

## Reglas compartidas entre ov_backend y ov_frontend

> Esta sección es idéntica en el `AGENTS.md` de ambos repos. Si la cambias en uno, cámbiala en el otro en la misma tarea.

**Los repos.** `ov_backend` (FastAPI) y `ov_frontend` (React + Vite + TypeScript) son repos git separados, en carpetas independientes. Para referirte al otro, usa su nombre de carpeta; no asumas una ruta relativa entre ellos.

**Qué leer.**

1. La spec de la tarea, en `ov_backend/docs/specs/`. Define el alcance y prevalece sobre todo lo demás.
2. Este `AGENTS.md` y, del repo que toques, los documentos vigentes que nombre la tarea: `ov_backend/docs/sistema/` y `ov_frontend/docs/`.
3. `ov_backend/docs/plan-iteraciones.md`, solo para no cerrar caminos a las iteraciones siguientes. No se adelanta trabajo de otra iteración.

No leas `docs/historico/` de ningún repo salvo que el usuario lo pida: es el registro del trabajo terminado. Si algo de ahí contradice un documento vigente, prevalece el vigente. Si dos fuentes vigentes se contradicen, detente y explica la contradicción; no la resuelvas en el código.

**Cómo se trabaja.**

- Lee la spec completa antes de escribir código. No agregues endpoints, vistas ni funciones que la spec no pida.
- Por fases, en el orden de la spec. Al terminar cada fase, detente y resume qué hiciste, qué carpetas de pruebas corriste en cada repo y qué queda pendiente.
- Si la spec no define algo, elige la opción más simple, anótala en `ov_backend/docs/decisiones.md` y sigue.
- Una prueba existente solo se adapta cuando la spec lo autoriza; anótalo también en `decisiones.md`. Si un escenario falla, se corrige la implementación, no el escenario.
- Datos de prueba: si el dato existe en el front, úsalo adaptado. Si no existe, créalo y márcalo con `DATO DE PRUEBA` (comentario en código) o `"_dato_de_prueba": true` (JSON).
- Ninguna dependencia nueva en ninguno de los repos sin avisar antes.

**Documentación.**

- `ov_backend/docs/decisiones.md` es el único registro de decisiones, para los dos repos, y solo de la spec en curso. Una viñeta por decisión: qué se decidió y por qué, en una o dos líneas. No registra conteos de pruebas, tiempos, líneas base ni el relato de cada fase; eso va en el resumen al usuario.
- Al cerrar una spec, lo que siga vigente de ella y de `decisiones.md` se incorpora al `AGENTS.md` o al documento vigente que corresponda. Después, la spec y `decisiones.md` se mueven a `ov_backend/docs/historico/<nombre-de-la-spec>/` y `decisiones.md` vuelve a quedar con su encabezado.
- Ningún documento vigente remite a uno histórico.

**Política de pruebas.** Las tablas de impacto de cada `AGENTS.md` indican qué carpetas corresponden a cada archivo.

| Momento | Qué se corre |
|---|---|
| Durante el desarrollo, tras cada cambio | Solo las carpetas de la tabla de impacto. |
| Al terminar una fase | Las carpetas de impacto de todo lo que tocó la fase, más `tests/integration/escenarios` (back) o `npm run test:servidor` (front). |
| Al cerrar una spec o antes de integrar una rama | Todo, en los dos repos: `uv run pytest -n auto -q`; `npm test`, `npm run build`, `npm run lint` y `npm run check:estructura`. |

**Una sola base de datos.**

- La base del backend es la única fuente de disponibilidad, progreso, respuestas de cuestionario, resultados, fichas obtenidas, insignias y nivel.
- En modo `VITE_DATOS=api`, el front nunca decide si algo está disponible, completado u obtenido: lo lee del servidor. Si el servidor no responde, lo dice; no inventa un estado.
- El contenido narrativo de las actividades (nodos JSON) está en el front. El backend guarda estructura y estado, y no interpreta ese contenido.
- El modo `local` del front debe seguir funcionando igual.

**Contrato.** El detalle está en `ov_backend/docs/sistema/integracion.md`.

- El backend lista bloques y actividades con su orden, tipo, `contenido` y `visibilidad`. El front guarda el contenido de cada actividad en `src/data/activities/contenidos/<clave>.json` y lo encuentra por la clave `contenido`. Una actividad cuyo contenido no existe en el front no se muestra, y se anota en `ov_frontend/docs/pendientes-interfaz.md`.
- Cada dominio tiene su propia consulta de lectura (`GET /cuentas/{c}/<dominio>`). El front pide al ingresar solo lo que se ve siempre, y el resto al abrir su vista.
- Los códigos del backend son los ids del front (`mission-welcome`, `act-tip-01`, `I1`, `psychologist`). No hay tablas de traducción.
- El JSON usa los nombres en español y `snake_case` de los esquemas Pydantic. El front los copia tal cual en `src/types/servidor.ts`, accede al backend solo desde `src/services/api/` (un archivo por router) y las vistas leen esos datos a través de `src/store/servidor/`.
- Si el backend entrega un dato que ninguna vista muestra, o una vista necesita un dato que el backend no entrega, no se crea ni se modifica interfaz para cubrirlo: se registra en `ov_frontend/docs/pendientes-interfaz.md` y se avisa al usuario, que decide (detalle en «Datos del servidor sin vista» del `AGENTS.md` del front). Vale también al trabajar solo en el backend.
- Si una tarea cambia una respuesta que consume el front, en la misma tarea se actualizan: el esquema y las pruebas del backend; `src/types/servidor.ts`, `src/services/api/` y `src/lib/servidor/adaptadores.ts` del front; los fixtures (se regeneran con `scripts/exportar_fixtures_front.py`), y las pruebas del front.

**Git.** No hagas push salvo que se pida. Trabaja en la rama que indique la spec, con un commit por fase y por repo y mensaje en español (`Iteración 2 · F1: semilla de registros`). Nunca versiones `.env`, `.env.local` ni archivos `*.db`, y no dejes en los repos logs, bases temporales ni carpetas temporales de pruebas.

**Idioma.** Documentación, mensajes al usuario y commits en español.
