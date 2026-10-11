# Refactor de estructura de `ov_frontend`

> Especificación para ejecutar con Codex sobre la rama `iteracion-1` (commit `1bbacce`). Es un refactor: **la aplicación se ve y se comporta igual** (rutas, marcado, textos, peticiones HTTP, claves de almacenamiento y modo `local`). Lo que cambia es dónde vive cada cosa, de dónde sale cada dato y el tamaño de los componentes. Es la contraparte de `ov_backend/docs/spec-refactor-estructura.md`; el contrato entre ambos no cambia.

## 0. Cómo usar este documento

- Lee completos este documento, `docs/refactor/mapa-archivos.md` (Anexo C) y el `AGENTS.md` vigente antes de empezar.
- Trabaja en una rama nueva `refactor-estructura` creada desde `iteracion-1`. Al terminar, la rama queda lista para integrarse (no la integres tú).
- Se ejecuta por fases (§10). Al terminar cada fase: `npm run build`, `npm run lint`, `npm test` y, desde R3b, `npm run check:estructura`; commit (`Refactor · R3a: capas compartidas`) y detente con un resumen: qué moviste, conteo de pruebas antes y después, infracciones de estructura pendientes y qué queda.
- **Portales de orientadora y apoderado.** El `AGENTS.md` anterior prohíbe abrir `src/features/counselor-portal/`, `src/features/parent-portal/` y `tests/counselor-portal.test.mjs`. Esa regla queda derogada desde ahora: el usuario la retiró, y el `AGENTS.md` nuevo (R7) ya no la incluye. En este refactor esos archivos se mueven y dividen como el resto, con los mismos límites (sin cambiar comportamiento ni presentación; en las pruebas, solo las adaptaciones de §9).
- Para la presentación siguen vigentes las especificaciones de `docs/student-experience/` y `docs/staff-experience/`: este refactor no cambia ningún texto, clase CSS ni marcado.
- Si algo no está definido aquí, elige lo más simple, anótalo en `docs/refactor/decisiones.md` y sigue. Si afecta al backend, detente y pregunta.

## 1. Objetivo

1. Que cualquiera sepa dónde va cada cosa mirando el árbol, y que esa estructura se mantenga en las próximas iteraciones (lo comprueba `npm run check:estructura`).
2. Que el acceso al backend esté en un solo lugar y agrupado por recurso, igual que las rutas del backend.
3. Que esté claro qué datos vienen del servidor, cuáles son contenido del front y cuáles son de demostración, y que las vistas no decidan el origen (`modoApi`) por su cuenta. Así, cuando una iteración pase un dato al servidor, se cambia un hook y no diez vistas.
4. Que ningún componente defina media pantalla: archivos pequeños, un componente por archivo y piezas reutilizables donde ya se repiten.
5. Quitar el código del prototipo inicial que ya no tiene ruta.

## 2. Situación actual (lo que se reemplaza)

| Tema | Hoy |
|---|---|
| Tamaño | 337 archivos en `src/`, 61.215 líneas de TS, TSX y CSS. |
| Organización | `features/` mezcla dominios (`missions`, `servidor`), portales (`student-experience`, `parent-portal`, `counselor-portal`) y el prototipo inicial (`occupation-exploration`). Las vistas de ruta viven dentro de las features; no hay `pages/`. |
| Prototipo sin ruta | 30 archivos no son alcanzables desde ninguna ruta; 29 de ellos (9.422 líneas) son código muerto: vistas del primer prototipo (`CityMapView`, `JournalView`, `StudentDecisionSection` de 1.370 líneas, `FieldActivities`, `JourneyPlayer`…), páginas exportadas que ninguna ruta usa (`ExplorationHomePage`, `ExplorationCatalogPage`…) y componentes huérfanos (`MetricCard`, `ReviewInboxView`, `StudentResourceBoard`). Algunas pruebas todavía los cargan. El trigésimo, `reflection/additional.ts`, se conserva (§9.2, A4). |
| Dependencias cruzadas | `student-experience` importa 103 veces de `occupation-exploration` (su almacén, tipos, datos y contexto siguen ahí). `servidor` importa de `missions`, `student-experience` y `occupation-exploration`: la capa de red depende de las vistas. El portal del apoderado importa datos, selectores y componentes del de la orientadora. |
| Backend | Bien: `fetch` solo está en `servidor/cliente.ts`. Pero las 13 peticiones (§5.1) se arman dentro de dos módulos con estado (`acciones.ts`, `estadoServidor.ts`) mezcladas con caché, revisiones y avisos. |
| Origen de los datos | `modoApi` se consulta en 25 archivos, 19 de ellos vistas, con unos 110 usos (`modoApi ? servidor.x : localY` en el JSX). |
| Datos fijos | Repartidos en 24 módulos de 8 carpetas, mezclando contenido, catálogo y demostración en el mismo archivo (`AdventureData.ts` tiene casos, alias de salones de demo y entrevistas de leyenda). `interviewDetails` está duplicado de forma idéntica en dos archivos. Solo dos líneas en todo `src/` están marcadas `DATO DE PRUEBA`. |
| Componentes | 30 archivos `.tsx` pasan de 300 líneas. `StudentDetailView.tsx` (orientadora) tiene 1.484 líneas y 20 componentes; `StudentActivityPlayer.tsx` es un solo componente de 536 líneas con 13 hooks. `FamilyConversationsView.tsx` y `StudentFamilyConversationsView.tsx` son 88 % iguales. Una vista de ruta (`QuestionnaireDetailView`) vive dentro de un archivo de componentes. |
| Almacenes | Ocho almacenes persistentes escritos a mano con `useSyncExternalStore` + `localStorage`; solo dos usan el ayudante genérico `persistentStore`. |
| Nombres | Módulos `.ts` en PascalCase (`AdventureStore.ts`, `Utils.ts`) junto a camelCase; primitivas de shadcn en minúscula (`drawer.tsx`, `select.tsx`) junto a PascalCase. |
| Basura versionada | `.env` (vacío) está versionado y no está en `.gitignore`; `.f6-cierre-vite.config.ts`; `src/assets/` solo tiene los archivos de la plantilla de Vite y nadie los usa. |
| Pruebas | 356 pruebas: 340 pasan y 16 fallan desde antes (lista en §9.1). Están muy acopladas a rutas: 346 rutas a `src/`, 33 módulos sustituidos por su especificador de import y 14 aserciones sobre el texto fuente de un archivo. |

## 3. Estructura objetivo

Sigue la guía «Recommended Industry-Standard React.js Folder Structure» adaptada a Vite + TypeScript. El detalle archivo por archivo está en el Anexo C.

```
src/
├── main.tsx                 # punto de entrada: configura el entorno y monta App
├── App.tsx                  # DemoAccessGate + AppRoutes
├── index.css                # Tailwind y estilos globales
├── assets/                  # imágenes y fuentes que se importan desde código (hoy vacía; public/ sigue para URLs)
├── config/                  # configuración de la aplicación
│   ├── env.ts               # modoApi, urlApi, desarrollo, configurarServidor (antes servidor/config.ts)
│   └── studentDemoScope.ts  # alcance de la demo del estudiante
├── routes/
│   ├── AppRoutes.tsx        # SOLO la tabla de rutas
│   ├── SoloLocal.tsx        # guarda «Disponible en una próxima iteración» (sale de AppRoutes)
│   ├── paths.ts             # appPaths
│   └── discoveryPaths.ts
├── pages/                   # un archivo por ruta (y los layouts de cada portal); componen features
│   ├── auth/                # LoginRoute, RoleSelectionRoute (salen de AppRoutes)
│   ├── student/             # StudentShell, CaminoScreen, CiudadScreen, StudentJournalView, …
│   ├── parent/
│   └── counselor/
├── features/                # un dominio por carpeta (ver tabla)
│   └── <dominio>/
│       ├── components/      # componentes del dominio (subcarpetas por área si hace falta)
│       ├── hooks/           # hooks del dominio; aquí se decide el origen de los datos
│       ├── lib/             # lógica pura y selectores
│       ├── data/            # contenido fijo que solo usa este dominio
│       ├── store/           # estado que solo usa este dominio
│       ├── context/         # contextos de React del dominio
│       ├── styles/          # CSS del dominio
│       └── types.ts         # tipos que solo usa este dominio
├── components/              # componentes reutilizables, sin lógica de dominio
│   ├── ui/                  # primitivas shadcn/Radix (Button, Dialog, Drawer, Select…)
│   ├── common/              # PageHeader, ThemeScope, GuideDialogue
│   ├── layout/              # AppShell, AppSidebar, AppTopBar… (portales de personal)
│   ├── staff/               # patrones visuales compartidos por orientadora y apoderado
│   └── student/             # piezas visuales del estudiante que usan varios dominios (Parchment, Seal, CharacterAvatar…)
├── context/                 # contextos compartidos entre dominios (occupationExplorationContext)
├── store/                   # estado global
│   ├── servidor/            # estado sincronizado con el backend: sesión de cuenta, estado, operaciones
│   ├── adventureStore.ts    # aventura del estudiante (antes AdventureStore.ts)
│   ├── journeyStore.ts      # progreso local de actividades (antes missions/store.ts)
│   ├── discoveryStore.ts, explorationStore.ts, reflectionStore.ts, studentUiStore.ts
├── services/
│   └── api/                 # ÚNICO lugar que habla con el backend
│       ├── cliente.ts       # pedir(): el único fetch
│       ├── cuentas.ts       # /cuentas…
│       ├── acciones.ts      # /acciones/…
│       ├── instrumentos.ts  # /actividades/{a}/items, /cuentas/{c}/instrumentos…
│       └── demo.ts          # /demo/reiniciar
├── data/                    # datos fijos que usan dos o más dominios
│   ├── activities/          # nodos JSON de las actividades + content.ts, standardActivities.ts, reflectionConfig.ts
│   ├── catalog/             # ocupaciones, carreras e instituciones
│   ├── content/             # textos y contenido narrativo (guías, personajes, casos, diario, investigación, familia…)
│   └── demo/                # perfiles de estudiantes ficticios para orientadora y apoderado
├── lib/                     # utilidades y lógica pura compartida
│   ├── utils.ts             # cn() (shadcn)
│   ├── persistentStore.ts   # ayudante de almacenes persistentes
│   ├── activities/          # motor de actividades: logic.ts, validation.ts
│   ├── servidor/            # adaptadores.ts: respuesta del servidor → modelo de la vista
│   └── challenges.ts, lumiFriendship.ts, explorationAssets.ts, studentViews.ts
├── hooks/                   # hooks globales (useIsMobile, useLumiNow, useReturnFocus, useTypewriter)
├── types/                   # tipos compartidos entre capas
│   ├── servidor.ts          # contrato con el backend (antes servidor/tipos.ts)
│   └── activities.ts, adventure.ts, cases.ts, catalog.ts, challenges.ts, decisions.ts, reflection.ts, studentProfile.ts, …
└── styles/
    ├── theme.css            # tokens de la plataforma (antes Theme.css)
    └── student/             # CSS global del estudiante (student-experience, discovery, journey, adventure…)
```

### 3.1 Dominios (`features/`)

| Feature | Contenido | Viene de |
|---|---|---|
| `auth` | Ingreso de demostración, selección de perfil, `demoAccess`. | `access/`, `role-selection/` |
| `activities` | Reproductor de actividades y sus nodos, preguntas de seguimiento, piloto de reflexión y desafíos. | `student-experience/player`, `reflection`, `challenges` |
| `adventure` | Mapa de Camino y Ciudad, panel, menú del usuario, novedades, check-in y Lumi. | `student-experience/map`, `overlays`, `modules` (layout y menú) |
| `backpack` | Mochila, recursos y fichas. | `student-experience/backpack`, `occupation-exploration/lib/TravelerResources` |
| `cases` | Casos de la Ciudad (incendio forestal). | `occupation-exploration` (`ForestFire*`) |
| `discovery` | Catálogo, perfil, pasaporte, libro de Helena, planes e investigaciones. | `student-experience/catalog`, `profile`, `plans`, `research`, `discovery` |
| `journal` | Diario, señales y vínculo con Lumi. | `student-experience/journal`, partes de `occupation-exploration` |
| `family-conversations` | Conversaciones en familia (estudiante y apoderado). **Compartida.** | `family-conversations` |
| `parent` | Portal del apoderado. | `parent-portal` |
| `counselor` | Portal de la orientadora. | `counselor-portal` |
| `student-tracking` | Perfil del estudiante visto por el personal (cuestionarios, dimensiones, secciones). **Compartida** por orientadora y apoderado. | `counselor-portal/profile` |

Una feature **compartida** es la única cuyos componentes pueden usar otras features. Hoy son `family-conversations` y `student-tracking`.

### 3.2 Decisiones de forma

- **Carpetas estándar en inglés**, como la guía. Los módulos del dominio del servidor conservan sus nombres en español (`cliente`, `operaciones`, `adaptadores`, `cuenta`), igual que el contrato. No se renombran símbolos: **un archivo puede cambiar de nombre o de carpeta, pero lo que exporta se llama igual**. Renombrar símbolos queda para otra tarea.
- **Nombres de archivo**: componentes en `PascalCase.tsx`; todo lo demás en `camelCase.ts`; CSS en `kebab-case.css`; JSON de contenido como están.
- **Sin barriles** (`index.ts`). Los cargadores de las pruebas no resuelven carpetas y los barriles empeoran el HMR de Vite. Se importa siempre el archivo concreto.
- **`@/` para salir de la propia carpeta**: los imports relativos (`./`, `../`) solo dentro de la misma feature o de la misma capa.
- **`pages/` con los nombres actuales** (`CaminoScreen.tsx`, `StudentJournalView.tsx`): no se agregan sufijos `Page`, para no tocar símbolos ni pruebas.
- **Sin Redux ni Zustand**: los almacenes siguen con `useSyncExternalStore`. No hay dependencias nuevas.
- **Contenido narrativo en el front**: los JSON de nodos se quedan en `src/data/activities/`, como exige la regla compartida.
- **`lib/` en lugar de `utils/`**: es la convención de shadcn (`components.json` apunta a `@/lib/utils`).

### 3.3 Dónde va cada cosa

| Si agregas… | Va en… |
|---|---|
| Una ruta | La entrada en `routes/AppRoutes.tsx` y su vista en `pages/<portal>/`. |
| Una vista de ruta | `pages/<portal>/<Nombre>.tsx`: lee parámetros, llama a hooks y compone componentes. Hasta 150 líneas como guía, 300 como máximo. |
| Un componente de un dominio | `features/<dominio>/components/`. |
| Un componente que usan dos dominios | `components/student/`, `components/staff/` o `components/common/` si no conoce el dominio; si lo conoce, en la feature dueña y marcándola compartida en `AGENTS.md` (decisión del usuario). |
| Una primitiva de interfaz | `components/ui/` (shadcn). |
| Una llamada al backend | `services/api/<recurso>.ts`, igual que el router del backend. |
| Un tipo del contrato | `types/servidor.ts`, copiado tal cual del esquema Pydantic. |
| Convertir una respuesta del servidor en datos para la vista | `lib/servidor/adaptadores.ts`. |
| Estado que viene del servidor | `store/servidor/`. |
| Decidir si un dato sale del servidor o es local | Un hook en `features/<dominio>/hooks/` (§7). Nunca en una vista. |
| Estado persistente que usan varios dominios | `store/<nombre>Store.ts`. Si lo usa uno solo, `features/<dominio>/store/`. |
| Lógica pura | `features/<dominio>/lib/`; si la usan varios dominios o una capa inferior, `lib/`. |
| Contenido fijo | `features/<dominio>/data/` si lo usa un dominio; si no, `data/content/` (texto narrativo), `data/catalog/` (catálogo que podría venir del servidor) o `data/activities/`. |
| Datos inventados | `data/demo/` o `features/<dominio>/data/`, con `DATO DE PRUEBA` al inicio del archivo (§5.4). |
| Un tipo que usan varias capas | `types/<dominio>.ts`. Si solo lo usa una feature, `features/<dominio>/types.ts`. |
| Una variable de entorno | `config/env.ts` y `.env.example`. |
| CSS | `features/<dominio>/styles/`; el que se aplica a todo el portal del estudiante, `styles/student/`. |

### 3.4 Decisión D1: el código sin ruta se elimina

Los 29 archivos de código que no alcanza ninguna ruta (más los tres de la plantilla en `src/assets/`) se eliminan en R2, antes de mover nada, para no reubicar 9.422 líneas que nadie usa. Son el primer prototipo, que las vistas inmersivas ya reemplazaron (`StudentResourceBoard`, por ejemplo, lo sustituyó `StudentResearchView`, que conserva sus metadatos). El historial de git los conserva y, para encontrarlos fácil (por ejemplo, para las evidencias del incremento 1), R0 crea la etiqueta local `prototipo-v1` en el commit de partida. El usuario confirmó la eliminación.

## 4. Reglas de dependencias

```
routes → pages → features → store → services/api
                    │          │         │
                    ▼          ▼         ▼
     components, context, hooks, lib, data, types, config
```

| Capa | No puede importar |
|---|---|
| `components/` | `features`, `pages`, `store`, `services`, `context` |
| `services/` | nada salvo `config`, `types` y `services` |
| `store/` | `features`, `pages`, `components`, `context`, `hooks` |
| `lib/`, `data/` | `features`, `pages`, `store`, `components`, `context`, `services`, `hooks` |
| `types/`, `config/` | ninguna otra capa (salvo `types`) |
| `hooks/` | `features`, `pages`, `components`, `context`, `services` |
| `context/` | `features`, `pages`, `components`, `services` |
| `features/` | `pages`, `services`. Tampoco `features/<otra>/components/` salvo de una feature compartida. |
| `pages/` | `services` (los datos del backend llegan por `store/servidor` y los hooks) |
| `routes/` | `services`, `store` |

Además:

- `fetch` solo en `services/api/cliente.ts`, y `pedir` solo se importa dentro de `services/api/`.
- `modoApi` y `desarrollo` no se importan en `components/`, `pages/` ni `features/*/components/`.
- Las features pueden usar `lib/`, `hooks/`, `store/`, `data/` y `context/` de otra feature, pero no sus componentes. Si un componente de otro dominio hace falta, se pasa desde la vista de ruta como `children` o como prop, o se sube a `components/`.
- Los módulos que las pruebas cargan aislados (`lib/activities/logic.ts`, `lib/servidor/adaptadores.ts`, `lib/explorationAssets.ts`) solo importan tipos.

### 4.1 Verificador (`npm run check:estructura`)

`scripts/verificar-estructura.mjs` (Anexo B, se copia tal cual) comprueba todo lo anterior, más carpetas permitidas, nombres, ausencia de barriles y tamaño (300 líneas por `.tsx`, 400 por `.ts`; quedan fuera `src/data/**`, `features/*/data/**`, `components/ui/**` y el CSS). Agrega a `package.json`:

```json
"check:estructura": "node scripts/verificar-estructura.mjs"
```

Las infracciones conocidas se registran en `scripts/estructura-excepciones.json` con `node scripts/verificar-estructura.mjs --actualizar-excepciones`. El verificador falla si aparece una infracción que no está en la lista **o** si una de la lista ya se resolvió (así la lista solo puede achicarse). Solo se regenera en R3b; desde ahí las fases la reducen hasta dejarla vacía en R6.

## 5. Origen de los datos

Este inventario es la respuesta a «qué es dato fijo y qué viene del servidor». Al terminar, `docs/refactor/origen-de-datos.md` contiene esta sección actualizada con las rutas nuevas, y cada archivo de `data/` empieza con un comentario de una línea que dice a qué grupo pertenece.

### 5.1 Del servidor (`VITE_DATOS=api`)

Trece peticiones, todas de `store/servidor/`. Se agrupan en `services/api/` como los routers del backend:

| Módulo | Función | Petición | La usa |
|---|---|---|---|
| `cuentas.ts` | `listarCuentas()` | `GET /cuentas` | ingreso |
| | `obtenerEstado(cuenta)` | `GET /cuentas/{c}/estado` | `refrescar` |
| | `obtenerProgreso(cuenta, tipo, codigo)` | `GET /cuentas/{c}/progreso/{tipo}/{codigo}` | `consultarProgreso` |
| | `obtenerDesbloqueosNoVistos(cuenta)` | `GET /cuentas/{c}/desbloqueos?solo_no_vistos=true` | `consultarNoVistos` |
| | `marcarDesbloqueosVistos(cuenta)` | `POST /cuentas/{c}/desbloqueos/marcar-vistos` `{}` | `marcarVistos` |
| `acciones.ts` | `ingresar(cuenta)` | `POST /acciones/ingresar` `{cuenta}` | ingreso |
| | `completarActividad(cuenta, actividad)` | `POST /acciones/completar-actividad` `{cuenta, actividad}` | `completarActividad` |
| | `responderItems(cuenta, actividad, respuestas)` | `POST /acciones/responder-items` `{cuenta, actividad, respuestas}` | `responderItems` |
| `instrumentos.ts` | `obtenerItems(actividad)` | `GET /actividades/{a}/items` | `consultarItems` |
| | `obtenerRespuestas(cuenta, actividad)` | `GET /cuentas/{c}/actividades/{a}/respuestas` | `consultarRespuestas` |
| | `obtenerAvance(cuenta)` | `GET /cuentas/{c}/instrumentos` | `consultarAvanceInstrumentos` |
| | `obtenerResultado(cuenta, instrumento)` | `GET /cuentas/{c}/instrumentos/{i}/resultado` | `cargarResultadoRiasec` |
| `demo.ts` | `reiniciar()` | `POST /demo/reiniciar` `{}` | `reiniciarDatosDePrueba` |

Con eso el servidor decide disponibilidad y finalización de actividades, acceso a la Ciudad, respuestas de Mara, resultado RIASEC y carreras afines, fichas obtenidas, insignias, nivel y avisos de desbloqueo.

### 5.2 Contenido del front (se queda en el front)

Lo define la regla compartida: el backend no interpreta el contenido narrativo.

| Qué | Destino |
|---|---|
| Nodos de las actividades (7 JSON) y su catálogo (`content.ts`, `standardActivities.ts`) | `data/activities/` |
| Configuración del piloto de reflexión (escenarios, criterios, misiones adicionales) | `data/activities/reflectionConfig.ts` |
| Personajes, textos de guía | `data/content/characters.ts`, `guideTexts.ts` |
| Recuerdos de Lumi | `features/journal/data/lumiMemories.ts` |
| Desafíos (bancos de preguntas, recompensas) | `data/content/challenges.ts` |
| Geometría y puntos del mapa, títulos de viajero, íconos de insignias | `features/adventure/lib/`, `features/discovery/lib/passport.ts` |
| Rol del apoderado (motivación) | `features/parent/data/parentMotivation.ts` |
| Opciones de rol | `features/auth/data/roleOptions.ts` |

### 5.3 Catálogo fijo (hoy en el front; podría venir del servidor)

No se mueve al servidor en este refactor. Se agrupa para que, cuando una iteración lo haga, se reemplace en un solo lugar:

| Qué | Destino | Iteración que lo toca (plan) |
|---|---|---|
| Ocupaciones (`occupationCatalog`, `additionalOccupationCatalog`) | `data/catalog/occupations.ts`, `additionalOccupations.ts` | 3 (catálogos) |
| Carreras e instituciones | `data/catalog/careersAndInstitutions.ts` | 3 |
| Preguntas del diario | `data/content/journalPrompts.ts` | 3 (diario) |
| Caso del incendio forestal | `data/content/forestFireCase.ts` | 4 (casos) |
| Entrevistas de leyenda, videos y detalles de entrevistas | `data/content/adventure.ts`, `data/content/research.ts` | 4 (entrevistas) |
| Temas de conversaciones en familia | `data/content/familyConversations.ts` | 4 (familia) |
| Niveles de viajero (`travelerLevels`) | sigue en `store/adventureStore.ts` (en `api` ya usa `nivel_actual`) | — |

### 5.4 Datos de demostración (`DATO DE PRUEBA`)

Cada uno de estos archivos empieza con `// DATO DE PRUEBA: <qué es y qué lo reemplazará>`. Las exportaciones de demostración que viven en un archivo de contenido llevan el comentario sobre la exportación.

| Qué | Destino |
|---|---|
| Perfiles de estudiantes, cuestionarios y planes ficticios (orientadora y apoderado) | `data/demo/studentProfiles.ts` |
| Salones, personas y etiquetas del portal de la orientadora | `features/counselor/data/counselorPortal.ts`, `exampleStudents.ts` |
| Hijos y perfil del apoderado | `features/parent/data/parentPortal.ts` |
| Comentarios y reacciones de entrevistas, aliados y nivel de investigación | `data/content/research.ts` (`interviewDetails`, `demoLevel`, `receivedReactions`, `getAllies`) |
| Alias de salón, avisos, videos y lecturas de recursos | `data/content/adventure.ts` (`classroomAliases`, `resourceDemoNotices`, `resourceDemoVideos`, `resourceReading`) |
| Entradas y check-ins del diario de ejemplo | `data/content/journalPrompts.ts` (`journalDemoEntries`, `readinessDemoCheckIns`) |
| Perfiles de ocupación de ejemplo | `data/catalog/occupations.ts` (`mockOccupationProfiles`) |
| Intereses de ejemplo del libro de Helena | `features/discovery/lib/helenaPages.ts` (`demoInterests`) |
| Conversaciones familiares de ejemplo | `data/content/familyConversations.ts` (`familyConversationDemoData`) |

`interviewDetails` existe idéntico en `counselor-portal/data/InterviewDetails.ts` y `student-experience/research/researchData.ts`. Queda **una** copia, en `data/content/research.ts`; `features/counselor/data/interviewDetails.ts` conserva solo `reactionOptions` e importa `interviewDetails` de ahí.

### 5.5 Estado local (navegador)

Se mueven los archivos, **no las claves ni el formato**. Cambiar una clave borra el progreso guardado de quien ya usó la demo.

| Clave | Almacén | Contenido |
|---|---|---|
| `ov.demo-access.v1` (`sessionStorage`) | `features/auth/lib/demoAccess.ts` | sesión de demostración |
| `ov.cuenta-servidor.v1` (`sessionStorage`) | `store/servidor/cuenta.ts` | usuario y cuenta activa en `api` |
| `ov.missions.v2` · `.api` por cuenta | `store/journeyStore.ts` | progreso, intentos, entregas y borradores de actividades |
| `ov.mission-files` (IndexedDB) | `store/journeyStore.ts` | archivos adjuntos |
| `ov.student-adventure.v1` · `.api` por cuenta | `store/adventureStore.ts` | aventura, diario, casos, investigación, conversaciones |
| `ov.student-discovery.v1` | `store/discoveryStore.ts` | visitas, favoritos, publicaciones, páginas reveladas |
| `ov.student-exploration.v1` | `store/explorationStore.ts` | intereses y hojas de decisión |
| `ov.student-reflections.v1` | `store/reflectionStore.ts` | respuestas y evaluaciones del piloto |
| `ov.student-followups.v1` | `features/activities/store/followUpStore.ts` | preguntas de seguimiento |
| `ov.student-ui.v1` | `store/studentUiStore.ts` | guías vistas, desbloqueos vistos, preferencias de interfaz |
| `ov.parent-missions.v1` | `features/parent/store/parentJourneyStore.ts` | actividades del apoderado |
| `ov.staff.priorities.v1` | `features/counselor/store/prioritySettings.ts` | prioridades de la orientadora |
| `ov.staff.selected-salon.v1` | `features/counselor/hooks/useSelectedSalon.ts` | salón elegido |

En `api`, el servidor manda sobre disponibilidad y finalización; lo local guarda borradores, nodo actual, comprobaciones y lo que el servidor todavía no tiene (las mismas reglas del `README`).

## 6. Acceso al backend

### 6.1 `services/api/`

- `cliente.ts`: `pedir` sin cambios.
- `cuentas.ts`, `acciones.ts`, `instrumentos.ts`, `demo.ts`: funciones delgadas de §5.1. Cada una arma la URL (con `encodeURIComponent`, como hoy), el cuerpo y el tipo de respuesta, y devuelve `Promise<RespuestaServidor<T>>`. **No guardan estado, no leen la cuenta activa y no conocen `modoApi`.**
- Se importan como espacio de nombres para que no se confundan con las operaciones: `import * as apiAcciones from '@/services/api/acciones'`.

### 6.2 `store/servidor/`

- `cuenta.ts`: sin cambios.
- `estadoServidor.ts`: el almacén y sus consultas (`refrescar`, `consultarNoVistos`, `cargarResultadoRiasec`…) usan `services/api/*` en lugar de `pedir`. Conservan revisiones, caché de promesas, comprobación de cuenta activa y mensajes.
- `operaciones.ts` (antes `acciones.ts`): `prepararIngreso`, `ingresar`, `completarActividad`, `marcarVistos`, `responderItems`, `reiniciarDatosDePrueba`, igual que hoy pero llamando a `services/api/*`.
- Las peticiones salen idénticas: misma URL, método, cabeceras y cuerpo, en el mismo orden. Las pruebas `servidor-*` lo comprueban con sus `fetch` simulados.

### 6.3 Tipos y adaptadores

- `types/servidor.ts` (antes `servidor/tipos.ts`): el contrato, sin cambios.
- `lib/servidor/adaptadores.ts`: sin cambios de lógica. Para que solo importe tipos de `types/`, en R3a se mueven a `types/` los cinco tipos de vista que hoy importa de las features: `JourneyState` (de `logic.ts`) a `types/activities.ts`; `StudentDiscoveryState` y los tipos que lo componen (de `discoveryStore.ts`) a `types/discovery.ts`; `HelenaPage` (de `helenaPages.ts`), `PassportBadge` (de `passport.ts`) y `AchievementGroup` (de `AdventureAchievements.ts`) a `types/profile.ts`. Los módulos de origen dejan de declararlos y los importan.

## 7. Las vistas no deciden el origen de los datos

Hoy una vista hace, por ejemplo:

```tsx
// StudentPassportView.tsx (hoy)
const servidor = useEstadoServidor()
const gruposApi = modoApi ? insigniasServidor(servidor.estado, getAchievementPresentations()) : undefined
…
<p>{earned.length} de {modoApi ? (servidor.estado?.insignias.length ?? 0) : all.length} insignias</p>
```

Después, la decisión vive en un hook del dominio y la vista solo pinta:

```tsx
// features/discovery/hooks/usePassport.ts
export function usePassport() {
  const servidor = useEstadoServidor()
  const adventure = useAdventure()
  // misma lógica que antes, en el mismo orden
  if (modoApi) return { grupos: insigniasServidor(…), total: servidor.estado?.insignias.length ?? 0, … }
  return { grupos: getStudentAchievementGroups(…), total: all.length, … }
}

// features/discovery/components/StudentPassportView.tsx
const { grupos, total, earned } = usePassport()
<p>{earned.length} de {total} insignias</p>
```

Reglas:

- Un hook por necesidad de la vista, en `features/<dominio>/hooks/use<Algo>.ts`. Devuelve un modelo listo para pintar, el mismo en `local` y en `api` (los campos que solo existen en un modo, opcionales).
- Si la vista muestra algo solo en un modo («Disponible en una próxima iteración», el botón de reinicio), el hook devuelve una bandera con nombre del dominio (`puedeReiniciar`, `mostrarRequisito`), no `modoApi`.
- La lógica se mueve, no se reescribe: mismas condiciones, mismos textos, mismo orden de llamadas.
- Las acciones (`completarActividad`, `marcarVistos`…) también pasan por el hook (`useActivityCompletion`). En `StudentActivityPlayer` debe seguir habiendo **una sola** llamada a `await completarActividad(` en todo `src/`, y solo desde el movimiento al llegar a `$fin`.

Vistas que cambian (hooks sugeridos; el nombre exacto es tuyo si describe mejor el dato):

| Vista (ruta nueva) | Hook |
|---|---|
| `pages/student/StudentShell.tsx` | `features/adventure/hooks/useServerSession.ts` (ingreso y refresco al montar) |
| `features/adventure/components/AdventurePanel.tsx`, `MapScreenLayout.tsx`, `CityLocked.tsx`, `pages/student/CiudadScreen.tsx` | `features/adventure/hooks/useTravelerLevel.ts`, `useCityAccess.ts`, `useMapScreen.ts` |
| `features/adventure/components/StudentUserMenu.tsx` | `features/adventure/hooks/useStudentAccount.ts` |
| `features/adventure/components/overlays/NoveltiesMenu.tsx`, `OverlayQueue.tsx` | `features/adventure/hooks/useNovelties.ts` |
| `features/activities/components/StudentActivityPlayer.tsx`, `FinishScreen.tsx`, `ResourceSheet.tsx`, `nodes/ResultNode.tsx` | `features/activities/hooks/useActivityCompletion.ts`, `useActivityResources.ts`, `useInstrumentResult.ts` |
| `pages/student/StudentBackpackView.tsx` | `features/backpack/hooks/useBackpack.ts` |
| `pages/student/StudentCatalogView.tsx`, `OccupationDetailView.tsx` | `features/discovery/hooks/useCatalogAffinity.ts` |
| `pages/student/StudentProfileView.tsx`, `features/discovery/components/StudentPassportView.tsx`, `PassportBadgeDialog.tsx` | `features/discovery/hooks/useStudentProfile.ts`, `usePassport.ts`, `useBadgeDetail.ts` |
| `pages/student/HelenaBookView.tsx` | `features/discovery/hooks/useHelenaPages.ts` |

`lib/` y `store/` pueden seguir consultando `modoApi` (por ejemplo `mapPoints.ts`, `travelerResources.ts`, `challengeResources.ts`): son selectores, no vistas.

## 8. División de componentes

### 8.1 Reglas

- Un componente exportado por archivo. Se permiten ayudantes privados pequeños (hasta unas 40 líneas en total) en el mismo archivo; un subcomponente más grande va a su propio archivo.
- Máximo 300 líneas por `.tsx` y 400 por `.ts` (lo comprueba el verificador). Una vista de ruta, idealmente 150.
- El estado y los efectos de un componente grande van a un hook del mismo dominio (`useForestFireCase`, `useJournalPage`), y la vista queda como composición.
- Se divide sin cambiar el marcado: mismo árbol de elementos, mismas clases, mismos atributos `aria-*` y el mismo orden. Las pruebas de renderizado comparan HTML.
- Antes de crear un componente, busca uno que ya haga lo mismo (`components/ui`, `components/student`, `components/staff`). Si dos dominios necesitan la misma pieza, súbela a `components/` en lugar de copiarla.

### 8.2 Divisiones obligatorias

| Archivo (ruta nueva) | Líneas | Cómo se divide |
|---|---:|---|
| `pages/counselor/StudentDetailView.tsx` | 1.484 | La vista queda con el encabezado y las pestañas. `Summary`, `ProgressSection`, `InstrumentsSection`, `InterestsSection`, `RecordsSection`, `JournalSection`, `FamilySection` y `DataSection` van a `features/counselor/components/student-detail/`, uno por archivo. Las piezas pequeñas (`CircleMetric`, `CareerRow`, `CardPartStatus`, `Detail`, `CompletionMark`, `FamilyAction`, `StatInline`, `DataItem`, `Stat`) junto a la sección que las usa, o en `StudentDetailParts.tsx` si las comparten. `activityTypeLabel` e `institutionTypeLabel` a `features/counselor/lib/labels.ts`. |
| `features/cases/components/ForestFireCaseView.tsx` | 761 | Estado y transiciones a `features/cases/hooks/useForestFireCase.ts`. `StepActions`, `ClueList`, `SatisfactionBar`, `PhaseResultScreen` y `FinalReportScreen`, uno por archivo. |
| `pages/student/StudentJournalView.tsx` | 753 | Estado a `features/journal/hooks/useJournalPage.ts`. `JournalHome`, `JournalEditor`, `JournalDetail`, `JournalOnboarding`, `JournalCard`, `JournalTags` y `JournalTab` a `features/journal/components/`. |
| `pages/parent/ParentActivityView.tsx` | 651 | `ParentActivitySession` (416 líneas) se parte en `features/parent/hooks/useParentActivitySession.ts` y sus componentes; `ParentQuestion`, `PreviousButton` y `ActivityUnavailable` a `features/parent/components/`. |
| `features/family-conversations/components/FamilyConversationsView.tsx` y `pages/student/StudentFamilyConversationsView.tsx` | 642 y 609 | Ver §8.3. |
| `features/student-tracking/components/ProfileSections.tsx` | 640 | Un archivo por sección: `SummarySection`, `RecordsSection`, `OptionsSection`, y sus piezas (`SummaryCard`, `PlatformProgress`, `FamilySummary`, `PlanCard`). |
| `features/adventure/lib/mapPoints.ts` | 623 | Por zona: `caminoPoints.ts`, `ciudadPoints.ts`, `pointDetails.ts` y `missionSync.ts` en la misma carpeta. Las pruebas cargan el archivo donde quede cada función (§9, A3). |
| `pages/student/StudentBackpackView.tsx` | 616 | Estado a `features/backpack/hooks/useBackpack.ts`; `BackpackCard` y `ResourceContent` a `features/backpack/components/`. |
| `features/activities/components/StudentActivityPlayer.tsx` | 574 | Navegación entre nodos y finalización a `features/activities/hooks/useActivityPlayer.ts` y `useActivityCompletion.ts`; el render por tipo de nodo, a un componente `NodeRenderer.tsx`. |
| `features/counselor/components/ResourcePreviews.tsx` | 491 | `ResourceDetail.tsx` e `InterviewDetail.tsx`. |
| `features/student-tracking/components/Questionnaires.tsx` | 408 | `QuestionnaireBars`, `QuestionnairesSection`, `InterestDetails` y `QuestionnaireDetailContent`, uno por archivo. `QuestionnaireDetailView` es una vista de ruta: va a `pages/counselor/QuestionnaireDetailView.tsx`. |
| `pages/counselor/CounselorDashboardView.tsx` | 386 | `Section` y `ConfigurePriorities` a `features/counselor/components/`; las secciones del tablero, una por archivo. |
| `pages/counselor/PrioritiesView.tsx`, `PublicationsView.tsx`, `pages/parent/ParentOverviewView.tsx`, `pages/student/HelenaBookView.tsx`, `ResearchGuideView.tsx`, `StudentResearchView.tsx`, `features/activities/components/challenges/ChallengePlayer.tsx`, `features/adventure/components/MapScreenLayout.tsx`, `features/cases/components/ForestFireExtraScreens.tsx` | 312–381 | Estado a un hook del dominio y bloques visibles (secciones, diálogos, pasos) a componentes del dominio, hasta quedar bajo el límite. |

Cualquier otro archivo que el verificador marque se resuelve igual.

### 8.3 Duplicados

- **Conversaciones en familia.** La versión del estudiante cambió su presentación (estilo inmersivo, guía, `useStudentOverlays`), así que **no** se fusionan los dos componentes. Se unifica lo que es igual: `updateConversation`, `getTopicStatus` y el cálculo del regalo van a `features/family-conversations/lib/conversations.ts` (con el parámetro `audience` que ya tiene la versión compartida). Las piezas visuales se dividen en `features/family-conversations/components/` (personal) y `features/family-conversations/components/immersive/` (estudiante). Las dos vistas usan la misma lógica.
- **`interviewDetails`**: una sola copia (§5.4).
- **`JourneyContent` / `ContentBlocks`** (61 % iguales) y **`ParentContent` / `ContentBlocks`** (53 %): no se fusionan en este refactor. Anótalo en `docs/refactor/decisiones.md` como candidato.

### 8.4 Componentes de otra feature

Las tres infracciones E7 que deja R3 se resuelven así:

- `features/adventure/components/ActivityDrawer.tsx` usa `JournalEntryCard` (journal) y `ForestFireCaseProgress` (cases): la vista de ruta que abre el cajón (`CiudadScreen`, `CaminoScreen`) los pasa como prop o `children`.
- `features/adventure/components/MapScreenLayout.tsx` usa `AdditionalReveal` (activities): igual, lo recibe de `CaminoScreen`.

### 8.5 CSS

- No se reescribe ninguna regla.
- `styles/student/student-experience.css` (3.681 líneas) se parte por sus cuatro secciones comentadas en `student-base.css`, `student-logbook.css`, `student-targets.css` y `student-progress.css`, importados en ese orden donde hoy se importa el archivo. Comprobación: `cat` de los cuatro, en orden, es idéntico al original.
- El resto del CSS solo cambia de carpeta. El orden de los `import './x.css'` dentro de cada archivo no cambia.

## 9. Pruebas

### 9.1 Línea base

`npm test`: 356 pruebas, 340 pasan y 16 fallan. Las 16 fallas son previas y deben **seguir fallando con el mismo nombre** (no se corrigen en este refactor):

```
real access conditions lock successive missions and expose the city gate without changing review mode
immersive submission preserves validation, drafts, versions and the keep action
immersive questions preserve attempts, hints, revelation, retry and fresh revision behavior
immersive finish shows saved sheets, narrative rewards and the prompted journal action
follow-up service waits 700ms, respects both text thresholds and never asks a third turn
first text submission saves version one before follow-up; edits and matrices use the normal form
follow-up accepts two replies, caps the field at available space and saves one condensed version
omitting all turns preserves version one, while a long reply ends follow-up after one turn
no question, failure, timeout or fewer than 40 free characters advances silently with the original
interrupted follow-up recovers only answered turns and loads the condensed form without duplicate versions
follow-up requires 40 free characters and stops before a second question that cannot fit
leaving during evaluation never stores a late question and recovery preserves the replied turn
every supplied mission node renders, including matrices, slides, questions and instrument items
phase 8 path sequence respects both completion records without changing catalog or real thresholds
phase 8 direct links open blocked details instead of starting unavailable players
discovery atlas covers existing IDs, symmetric relations and gated affinity
```

Si una de ellas empieza a pasar o falla por otro motivo, anótalo en el resumen de la fase.

### 9.2 Adaptaciones autorizadas por adelantado

Anótalas en `docs/refactor/decisiones.md` con la lista de pruebas tocadas. Ninguna cambia un valor esperado, un texto, un marcado ni una aserción de comportamiento.

- **A1. Rutas.** Rutas de archivo en `readFileSync`, `load`, `path.resolve` y `import()`; especificadores con los que se sustituyen módulos (`'@/features/occupation-exploration/lib/AdventureStore': {...}` pasa a `'@/store/adventureStore': {...}`); bases de ayudantes (`const base = 'src/features/student-experience/'`, `file(name)`, `caseFile(name)`, `immersivePlayerHarness('../modules/…')`), que se reemplazan por rutas explícitas cuando un mismo ayudante sirve a carpetas distintas; rutas de los JSON de actividades; y patrones que comprueban un import en el texto fuente (`/from '@\/components\/ui\/drawer'/` pasa a `Drawer`).
- **A2. Resolución de `@/` en los cargadores.** `adventure-state.test.mjs` y `mission-store.test.mjs` cargan módulos que, al moverse, importan con `@/`. Se les agrega la misma resolución de alias que ya tiene `adventure-rendering.test.mjs`. No se agrega resolución de carpetas (`index.ts`).
- **A3. Código que cambió de archivo.** Cuando una aserción lee el texto fuente de un archivo o carga una función, y esa parte se movió a otro archivo en R5 o R6, la prueba apunta al archivo nuevo con la misma aserción. El conteo de `await completarActividad(` se hace sobre el archivo donde quede (debe seguir siendo 1 en todo `src/`). La aserción sobre `student-experience.css` se hace sobre el archivo donde quede la regla.
- **A4. Código eliminado (D1).** Se eliminan las aserciones que solo ejercitan archivos borrados y, si una prueba queda vacía, la prueba. Están identificadas:
  - `adventure-rendering`: «case drawers contain only the start action and no embedded questions» (`CityMapView`), «map details use the shadcn drawer and expose a close button» (`MapPointDrawer`), «only field missions connect their map points with a route» (`AdventureMap`) e «investigation cards preserve visits, favorites and a single reaction without changing the published draft» (`StudentResourceBoard`) se eliminan; en «adventure keeps the original mission route and switches between path and city» se quitan las dos líneas que leen `AdventureMap.tsx`; en «journal home supports topics and keeps readiness separate from entries» se quitan las aserciones sobre `PostActivityJournalSheet.tsx`.
  - `forest-fire-case`: en «both map drawers expose the same status, score and action for every case state» se quita la mitad que renderiza `CityMapView`; la del mapa nuevo (`mapPoints`) se conserva.
  - `reflection/additional.ts` **no** se elimina (lo usa una prueba del piloto y lo usará la iteración 2).
  - Resultado esperado: 352 pruebas (las 16 fallas previas, el resto en verde).
- **A5. Ayudantes.** `servidor-ayudas.mjs` y `servidor-mara-ayudas.mjs` pasan a `tests/soporte/`; se actualizan sus imports.

Cualquier otra prueba que falle se arregla en la implementación. Si no se puede sin tocar una aserción, detente y pregunta.

### 9.3 Pruebas nuevas

- `tests/servidor-servicios.test.mjs`: para cada función de §5.1, con `fetch` simulado, comprueba método, URL, cabecera y cuerpo exactos.
- El verificador de estructura corre como paso de verificación (no como prueba de `node --test`).

## 10. Fases

| Fase | Contenido | Para terminar |
|---|---|---|
| R0 | Comprueba el punto de partida: `git diff --stat 1bbacce HEAD -- src tests` debe salir vacío (el refactor del backend puede haber cambiado `README.md` u otra documentación, eso no importa). Si `src/` o `tests/` cambiaron, detente: el mapa del Anexo C se hizo sobre `1bbacce`. Línea base: `npm ci`, `npm run build`, `npm run lint`, `npm test`. Crea la etiqueta local `git tag prototipo-v1` en el commit de partida (no la subas). Anota en `docs/refactor/decisiones.md` el commit de partida, el conteo (356/340/16) y que el build pasa. | Conteo registrado. |
| R1 | Limpieza: `git rm --cached .env` y agrega `.env` a `.gitignore` (queda `.env.example`); `git rm .f6-cierre-vite.config.ts` y los tres archivos de `src/assets/`; copia `docs/refactor/verificar-estructura.mjs` (Anexo B) a `scripts/verificar-estructura.mjs` y agrega `check:estructura` a `package.json` (aún no se corre). | Pruebas iguales que en R0. |
| R2 | **Código sin ruta (D1).** Borra los 29 archivos de la sección «Se elimina» del Anexo C (además de los tres de R1). En `OccupationExplorationPages.tsx` deja solo `ExplorationCaseIntroPage` y `ForestFireCasePage`. Adaptación A4. | 352 pruebas; las 16 fallas previas, resto en verde. `npm run build` pasa. |
| R3a | **Capas compartidas, solo mover** (`git mv`, Anexo C): `config/`, `types/`, `services/api/cliente.ts`, `lib/` (incluidos `lib/activities/` y `lib/servidor/`), `data/`, `store/`, `hooks/`, `context/`, `components/` (incluidos `ui/Drawer.tsx`, `ui/Select.tsx`, `components/student/`), `styles/`. Mueve los cinco tipos de §6.3 y la copia duplicada de `interviewDetails` (§5.4). Actualiza `components.json` (`"utils": "@/lib/utils"`) y el import de `styles/theme.css` en `index.css`. Adaptaciones A1, A2 y A5. | Mismo resultado que R2. Ningún import apunta a `src/features/servidor`, `missions` u `occupation-exploration/lib|data|types`. |
| R3b | **Features y páginas, solo mover**: el resto del Anexo C. Extrae de `AppRoutes.tsx` `LoginRoute` y `RoleSelectionRoute` a `pages/auth/` y `SoloLocal` a `routes/SoloLocal.tsx` (mismo código). Borra las carpetas vacías de `features/` (`access`, `role-selection`, `missions`, `servidor`, `occupation-exploration`, `student-experience`, `parent-portal`, `counselor-portal`). Corre `node scripts/verificar-estructura.mjs --actualizar-excepciones`. | Mismo resultado que R2. `npm run check:estructura` pasa con exactamente estas excepciones: 22 E3 (tamaño), 2 E4 (red), 19 E5 (modo de datos) y 3 E7 (features), 46 en total. Si te da otra cifra, explica la diferencia antes de seguir. |
| R4 | **Servicios del backend** (§6): crea `services/api/cuentas.ts`, `acciones.ts`, `instrumentos.ts`, `demo.ts`; `store/servidor/` deja de importar `cliente`. Prueba nueva `servidor-servicios.test.mjs`. | Pruebas `servidor-*` en verde; desaparecen las 2 excepciones E4. |
| R5 | **Origen de datos fuera de la vista** (§7). Un commit por dominio (`adventure`, `activities`, `backpack`, `discovery`). Adaptación A3. | Desaparecen las 19 excepciones E5; mismas pruebas que en R2. |
| R6 | **División de componentes** (§8): divisiones de §8.2, duplicados de §8.3, infracciones E7 (§8.4), CSS (§8.5) y marcas `DATO DE PRUEBA` (§5.4). Un commit por portal (estudiante, apoderado, orientadora). Adaptación A3. | `scripts/estructura-excepciones.json` es `[]`. Mismas pruebas que en R2. |
| R7 | **Documentación**: reemplaza `AGENTS.md` por `docs/refactor/AGENTS.md` (Anexo A) y borra esa copia y `docs/refactor/verificar-estructura.mjs`; en `README.md` agrega «Estructura del proyecto» (el árbol de §3 y la tabla de §3.3) y actualiza las rutas que menciona (`StudentActivityPlayer.tsx`, `src/features/servidor/`); escribe `docs/refactor/origen-de-datos.md` (§5 con rutas finales); este documento y el mapa se quedan donde están. Si `ov_backend` está disponible, en su `AGENTS.md` actualiza **solo** la sección «Reglas compartidas» para que quede idéntica a la del Anexo A, y en un commit aparte de ese repo. | `grep -rn "features/servidor\|occupation-exploration\|student-experience/\|counselor-portal\|parent-portal" src tests AGENTS.md README.md` no devuelve nada (salvo nombres de carpetas de `docs/`). |

## 11. Comandos finales

```bash
npm install                    # instalar
npm run dev                    # desarrollo (con VITE_DATOS=api en .env.local para usar el backend)
npm run build                  # tsc -b + vite build
npm run lint                   # oxlint
npm test                       # pruebas
npm run check:estructura       # estructura de carpetas y dependencias
```

## 12. Invariantes del refactor

1. Mismas rutas, mismo marcado y mismos textos en todas las pantallas, en `local` y en `api`.
2. Mismas peticiones al backend (método, URL, cabeceras, cuerpo y orden) y el mismo manejo de errores.
3. Mismas claves y formatos de `localStorage`, `sessionStorage` e IndexedDB (§5.5).
4. Las pruebas pasan igual que en R2 (352 con las 16 fallas previas), con solo las adaptaciones de §9.2.
5. Ningún símbolo exportado cambia de nombre. Un módulo que una prueba sustituye por su especificador conserva todos sus exports (`adventureStore` sigue exportando `prototypeAllUnlocked`; `studentDemoScope`, `studentDemoEnabled`; etc.).
6. Sin dependencias nuevas.
7. `fetch` solo en `services/api/cliente.ts`; `modoApi` nunca en una vista.
8. `npm run check:estructura` pasa con la lista de excepciones vacía.

## 13. Cómo ejecutarlo en Codex

La guía paso a paso para el usuario está fuera de este documento. Codex: ejecuta una fase por prompt y detente al terminarla.

## 14. Fuera de alcance (anótalo como siguiente paso, no lo hagas)

- Renombrar símbolos con nombres del prototipo (`OccupationExplorationModule`, `useOccupationExplorationContext`).
- Pasar los ocho almacenes a `persistentStore` (cambiaría validación y migraciones).
- Partir el bundle (hoy un solo chunk de 1,6 MB) con `React.lazy` por portal.
- Fusionar `JourneyContent`, `ContentBlocks` y `ParentContent`.
- Corregir las 16 pruebas que ya fallaban.
- Quitar el modo `local`.

---

## Anexo A. `AGENTS.md` nuevo

Está en `docs/refactor/AGENTS.md`. En R7 reemplaza con él el contenido completo de `AGENTS.md` y borra la copia. Hasta R7 sigue vigente el `AGENTS.md` anterior, salvo lo que esta spec deroga en §0.

## Anexo B. Verificador de estructura

Está en `docs/refactor/verificar-estructura.mjs`. En R1 cópialo tal cual a `scripts/verificar-estructura.mjs`.

## Anexo C. Mapa de archivos

Está en `docs/refactor/mapa-archivos.md`. Lista los 337 archivos de `src/` con su destino.
