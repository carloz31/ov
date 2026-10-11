# Especificación: vistas de descubrimiento del estudiante

Repositorio: `carloz31/ov_frontend` · Versión 1 · 4 de octubre de 2026

Este documento describe cómo implementar seis grupos de vistas del estudiante: el perfil, el libro de Helena, los planes, las investigaciones y el detalle del catálogo. Complementa `docs/student-experience/especificacion-interfaz-inmersiva-estudiante.md` (en adelante, **la especificación base**). Todo lo que este documento no cambia sigue lo que dice la especificación base.

Guárdalo como `docs/student-experience/especificacion-vistas-descubrimiento.md`. En `AGENTS.md`, agrega una línea que diga que, para las vistas que cubre, este documento prevalece sobre la especificación base.

Implementa el trabajo por fases (sección 12). Al cerrar cada fase, ejecuta `npm run build`, `npm run lint` y `npm test`, con el criterio de línea base de la sección 12.

---

## 1. Objetivo

Hoy el perfil, la decisión, la investigación y el catálogo se ven como pantallas de una plataforma web convencional: tarjetas blancas, formularios y diálogos estándar. El objetivo es que el estudiante sienta que **descubre cosas sobre sí mismo** mientras recorre el mundo junto a Lumi:

- El perfil es la **ficha del viajero**, con tres capítulos: lo que ha logrado, lo que Helena descubre de él y hacia dónde va.
- Los resultados de los instrumentos son las **páginas del libro de Helena**: selladas, listas para revelar o descifradas.
- Los planes son **cartas de ruta** A, B y C que el estudiante construye.
- Las investigaciones son **expediciones**: arma su guion, encuentra aliados y comparte lo que descubrió.
- El catálogo es un **atlas** con páginas de detalle de carreras, ocupaciones e instituciones.

**Esto no debe parecer una interfaz web estándar.** Si una vista terminada se ve como un panel de administración, un formulario de Google o una tienda en línea, no cumple esta especificación. La sección 3 dice cómo lograrlo.

### 1.1. Alcance

| Vista | Ruta | Reemplaza a |
| --- | --- | --- |
| Mi perfil (ficha del viajero) | `/student/profile` | `ExplorationProfilePage view="general"` sin `section` |
| El libro de Helena | `/student/profile/helena` (nueva) | — |
| Mis planes | `/student/profile/decisions` | `ExplorationProfilePage view="decision"` |
| Investigaciones | `/student/research` | La vista actual de Investigaciones, salvo sus tarjetas y su detalle de entrevista, que se conservan (sección 9.1) |
| Guion de la entrevista | `/student/research/guion` (nueva) | El flujo actual para iniciar una investigación |
| Catálogo (listas) | `/student/catalog/{professions,careers,institutions}` | `ExplorationCatalogPage` |
| Detalle de carrera | `/student/catalog/careers/:careerId` (nueva) | `CareerDetailDialog` |
| Detalle de ocupación | `/student/catalog/professions/:occupationId` (nueva) | `OccupationDetailDialog` |
| Detalle de institución | `/student/catalog/institutions/:institutionId` (nueva) | `InstitutionDetailDialog` |

`/student/profile?section=passport` **sigue mostrando el pasaporte actual sin cambios** (sección 6.1).

### 1.2. Fuera de alcance

- **El llenado de las tarjetas de plan.** La vista de planes muestra las tarjetas, su completitud y sus acciones, pero no se programa ni se diseña el formulario de cada sección. Los botones que llevarían a ese formulario quedan como acciones pendientes (sección 8.6).
- Los instrumentos de habilidades sociales e inteligencias, que todavía no existen en el contenido. Sus páginas del libro usan datos de demostración (sección 7.2).
- La selección de las tres insignias que se muestran a los compañeros.
- Las vistas del apoderado y de la orientadora.

---

## 2. Reglas

### 2.1. Se heredan de la especificación base

Se mantienen todas las reglas de la sección 2 de la especificación base: las áreas que no se tocan, los datos y la lógica que se conservan, lo que no se incorpora del prototipo anterior y las reglas de estilo, salvo lo que cambia la sección 2.2 de este documento. En particular:

- No abras, leas ni modifiques `src/features/parent-portal/**`, `src/features/counselor-portal/**` ni `tests/counselor-portal.test.mjs`.
- No modifiques `src/components/**`, `src/styles/Theme.css`, `src/index.css`, `src/features/missions/**` (modelo, lógica, store, contenido y datos) ni `src/features/occupation-exploration/lib/**`, `types/**` y `data/**`.
- Todo componente nuevo vive en `src/features/student-experience/` y solo lo usan rutas `/student`.
- Si una tarea parece requerir un cambio en un archivo prohibido, **detente y repórtalo**.

### 2.2. Excepciones y permisos nuevos

- **Una clave nueva de localStorage**, `ov.student-discovery.v1`, para el estado de estas vistas (sección 5.3). No reemplaza ni duplica datos que ya existen en `ov.student-adventure.v1` ni en `ov.missions.v2`.
- **Rutas nuevas** dentro del bloque `<Route path="/student">` de `AppRoutes.tsx` (sección 5.2). Las rutas se definen en un archivo propio, `src/features/student-experience/paths.ts`. **No modifiques** `src/routes/paths.ts`.
- **Datos nuevos de catálogo** en un archivo propio (sección 11.1), porque `occupation-exploration/data/**` no se puede modificar.
- **Se retira la estación de investigación del mapa de la ciudad** (sección 9.10).
- **Recursos no se toca.** Su vista, sus pestañas (fichas y testimonios) y sus pruebas quedan como están.
- Los archivos que dejan de usarse (`ExplorationCatalogView.tsx`, `ExplorationProfileView.tsx`, `StudentDecisionSection.tsx` y los diálogos de detalle) **no se borran ni se modifican**. `ExplorationProfileView` se sigue usando para el pasaporte.

### 2.3. Escrituras de estado

- Las escrituras sobre datos existentes usan `updateAdventure` o `setDecisionSheets` del contexto, **con las mismas transformaciones que usa hoy el código existente**. Donde este documento dice "copiar la lógica de X", copia la función o el bloque tal cual y cambia solo el marcado.
- Los favoritos se leen y se cambian con lo que ya entrega `useOccupationExplorationContext()`: `careerInterestIds`, `institutionInterestIds`, `profiles` (con `interested`) y `toggleCareerInterest`, `toggleInstitutionInterest` y `toggleOccupationInterest`.
- Lo que no tiene un lugar en el modelo actual va a `ov.student-discovery.v1`.

---

## 3. Dirección visual

### 3.1. Principio

Estas vistas son **lugares del mundo**, no páginas de un sistema. Cada una tiene un ambiente y objetos propios: una ficha de viajero, un libro con sellos de cera, cartas de ruta, un tablero de expedición y un atlas. La información siempre es clara y legible, pero se presenta como algo que el estudiante encuentra, reúne o desbloquea.

Toma como referencia lo que ya existe en la interfaz del estudiante:

- **El reproductor nocturno** (`PlayerAmbient`): un fondo oscuro con luz cálida.
- **La mochila** (`StudentBackpackView` y `resources.css`): una cabecera ilustrada, casillas de inventario y objetos por descubrir.
- **El panel del mapa**: el sello de nivel, el anillo de recorrido y los puntos con estados.

### 3.2. Qué evitar

- Tarjetas blancas planas sobre fondo gris, con un título y una lista de atributos.
- Tablas de datos, salvo el bloque de ingresos de la carrera, que se presenta como tarjetas comparables (sección 11.3).
- Formularios largos con muchos campos seguidos y etiquetas encima.
- Badges genéricos de shadcn como único recurso para mostrar estados.
- Diálogos modales estándar para el detalle del catálogo: el detalle es una página.
- Barras de progreso sin contexto. Toda barra dice qué mide y, cuando aplica, qué falta.

### 3.3. Patrones del mundo

Estos patrones se reutilizan en las vistas. Cada uno tiene su componente en `src/features/student-experience/discovery/` (sección 5.1).

| Patrón | Qué es | Dónde se usa |
| --- | --- | --- |
| **Escenario nocturno** | Fondo `--sx-night` que llena el área de contenido del módulo, con una viñeta suave y un brillo radial del color del ambiente arriba a la derecha | Todas las vistas de este documento |
| **Pergamino** | Tarjeta de fondo `--sx-parchment`, borde de 2 px `--sx-parchment-edge` y radio `--radius-xl` | Páginas, capítulos, tarjetas de detalle |
| **Sello** | Círculo con relleno, anillo grueso y un ícono o letra al centro. Estados: lacrado, brillante (listo) o abierto | Libro de Helena, código de interés, nivel |
| **Carta** | Pergamino dentro de un marco de color de 8 px, con una sombra inferior sólida que la levanta | Planes A, B y C |
| **Casilla de colección** | Celda con ícono y nombre, que se ilumina cuando el objeto está reunido | Logros, íconos de ocupación, favoritos |
| **Rastro** | Barra gruesa de 12 px con extremos redondeados, siempre con su etiqueta y su valor | Recorrido, afinidad, completitud, misiones |
| **Niebla** | Contenido desenfocado (`filter: blur`) con un candado encima, que se desplaza lento | Páginas selladas |

### 3.4. Tokens nuevos

Agrega estos tokens al final de `student-experience.css`, dentro de `.sx-root`. Solo usan variables de `Theme.css` y los tokens que ya existen. No agregues hexadecimales.

```css
.sx-root {
  /* Superficies de las vistas de descubrimiento */
  --sx-parchment: color-mix(in srgb, var(--warning-soft) 60%, var(--card));
  --sx-parchment-edge: color-mix(in srgb, var(--warning) 28%, var(--card));
  --sx-parchment-ink: var(--foreground);
  --sx-parchment-muted: color-mix(in srgb, var(--foreground) 68%, var(--warning-soft));
  --sx-gold: var(--sx-lumi);
  --sx-gold-deep: color-mix(in srgb, var(--warning) 70%, var(--foreground));
  --sx-seal: color-mix(in srgb, var(--danger) 72%, var(--accent));
  --sx-night-raised: color-mix(in srgb, var(--sx-night) 82%, var(--primary));
  --sx-night-border: color-mix(in srgb, var(--primary) 40%, var(--sx-night));
  --sx-night-text: rgb(255 255 255 / 0.92);
  --sx-night-muted: rgb(255 255 255 / 0.74);

  /* Ambiente de cada vista: el color del brillo y de los acentos */
  --sx-amb-profile: var(--primary);   /* ficha y libro: misterio, autoconocimiento */
  --sx-amb-plans: var(--warning);     /* planes: rutas y destinos */
  --sx-amb-research: var(--case-mint);/* investigaciones: expedición */
  --sx-amb-atlas: var(--case-blue);   /* catálogo: atlas, mundo exterior */

  /* Marcos de los planes */
  --sx-plan-a: var(--warning);
  --sx-plan-b: var(--case-mint);
  --sx-plan-c: var(--data-secondary);
}
```

**Justificación de los colores.** El color principal de la plataforma (`--primary`) sigue siendo el de las acciones principales, los sellos de nivel y el ambiente del perfil. Los acentos nuevos salen de colores que la plataforma ya usa en los casos (`--case-mint`, `--case-blue`) y en Lumi (`--warning`). Cada vista tiene un ambiente propio para que el estudiante perciba que entra a un lugar distinto del mundo, sin que la plataforma pierda unidad:

- **Perfil y libro:** violeta nocturno, porque es el lugar del autoconocimiento y del misterio de Helena.
- **Planes:** dorado, el mismo de la luz de Lumi y del siguiente paso en el mapa, porque los planes son hacia dónde va.
- **Investigaciones:** verde menta, el color de las expediciones y de la ciudad.
- **Catálogo:** azul, porque es el atlas del mundo exterior.

### 3.5. Reglas de estilo

- **Fuente:** Inter (`var(--font-sans)`), como el resto de la plataforma. La jerarquía se logra con tamaño y peso: títulos de vista en 30 px y peso 800, títulos de pergamino en 22 px y peso 800, cuerpo en 15 a 16 px.
- **Textos en minúscula inicial.** Las etiquetas pequeñas que van sobre los títulos (por ejemplo, "Página I · descifrada" o "Capítulo II") van en 13 px, peso 700, color `--sx-gold-deep` sobre pergamino o `--sx-gold` sobre fondo oscuro. No van en mayúsculas sostenidas.
- **Íconos:** lucide, en trazo. No uses emoji en estas vistas.
- **Contraste:** sobre el escenario nocturno, el texto no baja de `--sx-night-muted`. Sobre pergamino, el texto secundario usa `--sx-parchment-muted`.
- **Objetivos táctiles** de 44 px como mínimo.
- **Animaciones** con CSS. Todas se desactivan con `prefers-reduced-motion: reduce`: el sello no pulsa, la niebla no se mueve, las cartas no brillan y las revelaciones aparecen sin transición.
- **Escritorio primero**, a partir de 1280 px. Por debajo de 768 px, las cuadrículas de tres columnas pasan a una y nada se desborda horizontalmente desde 360 px.

### 3.6. Contenedor

`StudentModuleLayout` se mantiene: cabecera clara de 56 px con "Volver al mapa", título, ayuda, novedades y menú. El área de contenido de estas vistas lleva la clase `sx-discovery` con el ambiente de la vista:

```tsx
<div className="sx-discovery" data-ambient="profile">…</div>
```

`.sx-discovery` aplica el escenario nocturno a todo el alto disponible, con un relleno de 28 px y un contenedor de 1240 px como máximo.

---

## 4. Personajes y ayuda

**En estas vistas no hay mensajes de personajes en pantalla.** No hay globos de Lumi ni de Helena, ni diálogos en línea (`InlineDialogue`). Lo que los personajes dirían pasa al botón de ayuda de la cabecera, que abre `LumiOverlay` con los pasos de la vista. Agrega estos textos a `guide-texts.ts`:

| Vista (`StudentView`) | Pasos |
| --- | --- |
| `profile-general` | 1. "Este es tu perfil de viajero. Aquí se reúne todo lo que vas descubriendo." 2. "En el primer capítulo ves lo que has logrado y qué te falta para tu siguiente nivel." 3. "En el segundo, lo que Helena va descifrando de ti. Cuando una página brilla, tiene algo nuevo que mostrarte." 4. "Y en el tercero, los caminos que estás considerando y lo que guardaste en el atlas." |
| `profile-helena` | 1. "Este es el libro de Helena. Cada página guarda algo que ella descubre de ti." 2. "Una página sellada se abre cuando completas sus misiones en la ciudad." 3. "Cuando Helena termina de leer una página, el sello brilla. Rómpelo cuando quieras verla." 4. "Ninguna página es mejor que otra: describen cómo eres, no cuánto vales." |
| `profile-decisions` | 1. "Tus planes son las rutas que estás considerando. Puedes tener hasta tres: A, B y C." 2. "Cada carta se completa con tu motivación, tus fortalezas y obstáculos, un presupuesto y cómo te preparas." 3. "Puedes cambiar su prioridad cuando quieras. Lo que descubras en el camino puede confirmar un plan o abrir otro." |
| `research` | 1. "Aquí conoces el mundo profesional de cerca: entrevistando a alguien que ya trabaja en lo que te interesa." 2. "Primero armas tu guion conmigo. Luego haces la entrevista fuera de la plataforma y vuelves a compartirla." 3. "También puedes ver las entrevistas de tu salón y reaccionar a ellas." |
| `research-guide` | 1. "Antes de preguntar, anotemos lo que piensas hoy de esta ocupación. Cuando vuelvas de la entrevista será interesante ver qué cambió." 2. "Te dejé unas preguntas para empezar. Agrega las tuyas: lo que de verdad te da curiosidad saber." 3. "Lo más importante ocurre fuera de aquí: la conversación con esa persona." |
| `catalog-*` y `catalog-detail` | Se conservan los textos actuales del catálogo. En el detalle, agrega: "Esta es la página del atlas. Guárdala en favoritos para tenerla a mano cuando armes tus planes." |

Ajuste del plan aprobado: las vistas de descubrimiento abren sin diálogos antes de interacción. La ayuda se abre desde la cabecera; las presentaciones automáticas de la especificación base siguen vigentes en las demás vistas.

---

## 5. Arquitectura

### 5.1. Archivos nuevos

```
src/features/student-experience/
  paths.ts                               Rutas propias de estas vistas
  discovery/
    discovery.css                        Patrones de la sección 3.3, con prefijo .sx-d-
    discoveryStore.ts                    Estado ov.student-discovery.v1
    DiscoveryStage.tsx                   Contenedor .sx-discovery con ambiente
    Parchment.tsx                        Pergamino con título y etiqueta opcional
    Seal.tsx                             Sello con estados lacrado, listo y abierto
    TrailBar.tsx                         Rastro con etiqueta y valor
    CollectionSlot.tsx                   Casilla de colección
    FavoriteButton.tsx                   Botón de favorito con corazón
  profile/
    StudentProfileView.tsx               Ficha del viajero (V4.6 resumen)
    HelenaBookView.tsx                   El libro de Helena
    helenaPages.ts                       Modelo y cálculo de las páginas
  plans/
    StudentPlansView.tsx                 Mis planes
    PlanCard.tsx                         Carta de plan
    plans.ts                             Orden, completitud y favoritos
  research/
    StudentResearchView.tsx              Investigaciones (sin investigación, en curso y publicada)
    ResearchGuideView.tsx                Guion de la entrevista
    GuideSheet.tsx                       Panel "Mi guion"
    AlliesSheet.tsx                      Panel "Aliados"
    PublishDialog.tsx                    Publicación de la entrevista
    researchData.ts                      Datos de demostración (aliados, niveles, umbral de Leyenda)
  catalog/
    catalogDetails.ts                    Datos de detalle del catálogo (sección 11.1)
    catalogSelectors.ts                  Funciones de consulta
    StudentCatalogView.tsx               Listas del catálogo con tarjetas de resumen
    CareerDetailView.tsx
    OccupationDetailView.tsx
    InstitutionDetailView.tsx
```

### 5.2. Rutas

`paths.ts`:

```ts
export const discoveryPaths = {
  helena: '/student/profile/helena',
  researchGuide: '/student/research/guion',
  career: (id: string) => `/student/catalog/careers/${encodeURIComponent(id)}`,
  occupation: (id: string) => `/student/catalog/professions/${encodeURIComponent(id)}`,
  institution: (id: string) => `/student/catalog/institutions/${encodeURIComponent(id)}`,
}
```

En `AppRoutes.tsx`, dentro de `<Route element={<StudentShell />}>`:

```tsx
<Route element={<ResearchRoute />} path="research" />
<Route element={<ResearchGuideView />} path="research/guion" />
<Route element={<StudentCatalogView section="professions" />} path="catalog/professions" />
<Route element={<StudentCatalogView section="careers" />} path="catalog/careers" />
<Route element={<StudentCatalogView section="institutions" />} path="catalog/institutions" />
<Route element={<OccupationDetailView />} path="catalog/professions/:occupationId" />
<Route element={<CareerDetailView />} path="catalog/careers/:careerId" />
<Route element={<InstitutionDetailView />} path="catalog/institutions/:institutionId" />
<Route element={<ProfileRoute />} path="profile" />
<Route element={<HelenaBookView />} path="profile/helena" />
<Route element={<StudentPlansView />} path="profile/decisions" />
```

- `ProfileRoute` renderiza `ExplorationProfilePage view="general"` cuando `section=passport`, y `StudentProfileView` en cualquier otro caso.
- `ResearchRoute` renderiza `StudentResearchView`. Si la vista actual de Investigaciones ya tiene su propia ruta, reemplaza solo el componente que renderiza y conserva la URL.
- Retira de las importaciones solo los nombres que quedan sin uso en el bloque `/student`, como dice la sección 2.1 de la especificación base.

### 5.3. Estado de las vistas (`discoveryStore.ts`)

Mismo patrón que `ui-state.ts`: `useSyncExternalStore`, `try/catch` al escribir, escucha del evento `storage` y vuelta al estado inicial si los datos guardados no son válidos.

```ts
type InstrumentPageId = 'intereses' | 'inteligencias' | 'habilidades'

type ResearchPublication = {
  interviewee: string
  summary: string
  change: string          // ¿Qué cambió después de conversar? Privado
  videoUrl: string
  coauthors: string[]     // alias de aliados
}

type ResearchInProgress = {
  occupationId: string
  before: string          // lo que pensaba antes de la entrevista
  ownQuestions: string[]
  guideReadyAt?: string   // ISO; si existe, el guion está listo
  publication?: ResearchPublication   // borrador de "Guardar para después"
  publishedVideoId?: string
}

type InterviewReaction = {
  learned?: { text: string; createdAt: string }
  liked?: string          // ISO
}

type StudentDiscoveryState = {
  version: 1
  revealedPages: InstrumentPageId[]
  planOrder: string[]                       // ids de DecisionSheet activas, en orden de prioridad
  research?: ResearchInProgress
  publishedResearch: { videoId: string; occupationId: string; coauthors: string[]; change: string }[]
  reactions: Record<string, InterviewReaction>   // por id de video
  viewedCareerIds: string[]                 // para "explorando familias"
}
```

Estado inicial: todas las listas vacías, `reactions` vacío y `research` sin definir.

### 5.4. `views.ts`

- Agrega `'profile-helena'`, `'research-guide'` y `'catalog-detail'` a `StudentView` y a `studentViews`.
- `getStudentView` debe reconocer las rutas nuevas **antes** de las comprobaciones actuales con `endsWith`, que no coinciden con rutas de detalle:
  - `/student/profile/helena` → `'profile-helena'`.
  - `/student/research/guion` → `'research-guide'`.
  - `/student/catalog/(careers|professions|institutions)/:id` → `'catalog-detail'`.
- `getStudentViewLabel`: `'profile-helena'` → "Mi perfil", `'research'` y `'research-guide'` → "Investigaciones" (antes "Misión de investigación"), `'catalog-detail'` → "Catálogo".
- El selector del catálogo aparece al inicio del contenido de la página, también en los detalles, y marca la sección abierta. Sus tres opciones incluyen íconos: Profesiones (`BriefcaseBusiness`), Carreras (`GraduationCap`) e Instituciones educativas (`School`). El perfil no muestra pestañas: la ficha ya enlaza al libro, a los planes y al pasaporte.

---

## 6. Mi perfil: la ficha del viajero

**Ruta:** `/student/profile`. **Ambiente:** `profile`. **Mecánicas:** CD2-04, CD2-05, CD2-06, CD4-04, CD5-05, CD6-03.

### 6.1. Pasaporte

`/student/profile?section=passport` sigue renderizando el pasaporte actual (`ExplorationProfilePage view="general"`). El botón "Ver mis logros" de la ficha navega a `appPaths.student.passport`. No agregues un acceso "Mi pasaporte" al panel.

### 6.2. Composición

```
┌ Volver al mapa | Mi perfil                                         [🔔][?](AL) ┐
│                                                                                 │
│  ┌ Ficha del viajero ───────────────────────────────────────────────────────┐  │
│  │ (AL)  Alex                                   Lo que muestras a tus        │  │
│  │       [NIVEL 01] Observador del horizonte    compañeros  [◆][◆][◆]        │  │
│  │       Todo lo que vas descubriendo…          Elegir qué muestro           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│  ┌ Capítulo I ──────────┐ ┌ Capítulo II (borde dorado) ┐ ┌ Capítulo III ──────┐  │
│  │ Lo que he logrado    │ │ Lo que Helena descubre de mí│ │ Hacia dónde voy    │  │
│  │ Para el nivel 2: …   │ │ (SAI) Lo que te atrae hacer │ │ [A] Psicología  ✓  │  │
│  │ Recorrido ▓▓▓░ 38 %  │ │ (✦) Tus formas de ser…      │ │ [B] Diseño   2 de 4│  │
│  │ Afinidad  ▓▓░░       │ │ (🔒) Cómo te relacionas     │ │ [C] Espacio libre  │  │
│  │ Logros recientes     │ │                             │ │ Lo que guardaste   │  │
│  │ [▣ ][▣ ]  8 obtenidos│ │                             │ │ 5 · 3 · 2          │  │
│  │ [▣ ][▣ ]             │ │                             │ │                    │  │
│  │ [Ver mis logros]     │ │ [Abrir el libro de Helena]  │ │ [Ver mis planes y  │  │
│  └──────────────────────┘ └─────────────────────────────┘ │  favoritos]        │  │
│                                                           └────────────────────┘  │
│  👁 Tus compañeros solo ven tu nivel y las tres insignias que elijas.            │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 6.3. Ficha del viajero

Pergamino oscuro: fondo `--sx-night-raised` y borde `--sx-night-border`.

- **Avatar** de 108 px con las iniciales "AL" sobre `--sx-gold` y anillo de 4 px `--sx-parchment`.
- **Nombre** "Alex" en 28 px, peso 800, `--sx-night-text`.
- **Sello de nivel:** reutiliza el mismo diseño del sello "NIVEL 01" del panel del mapa, seguido del título del nivel (`getTravelerLevel(adventure).label`) en 17 px y peso 800. El número va con dos dígitos.
- **Descripción:** "Todo lo que vas descubriendo en el viaje se reúne aquí: lo que has logrado, lo que Helena lee de ti y los caminos que estás considerando." en `--sx-night-muted`.
- **Lo que muestras a tus compañeros:** tres casillas de 64 px con las tres primeras insignias obtenidas (en el orden de `getAchievementGroups`). Si hay menos de tres, las casillas faltantes van punteadas. Debajo, el enlace "Elegir qué muestro", que por ahora no hace nada (acción pendiente, sección 8.6).

### 6.4. Capítulo I: lo que he logrado

Pergamino. Etiqueta "Capítulo I" y título "Lo que he logrado".

- **Siguiente nivel:** casilla blanca con "Para el nivel {n + 1}" y el texto `getTravelerLevel(adventure).nextStep`. En el último nivel, "Llegaste al último nivel del viaje".
- **Rastro "Recorrido":** el valor de `getZoneProgress('camino', …)`, en `--primary`. La etiqueta es "Recorrido" (no "Nivel de recorrido", para no confundirlo con el nivel).
- **Rastro "Afinidad con la ciudad":** el valor de `getZoneProgress('ciudad', …)`, en `--sx-gold`. Si la ciudad no está abierta, el rastro se ve vacío con el texto "Se abre al llegar a la ciudad".
- **Logros recientes:** encabezado "Logros recientes" a la izquierda y "{n} obtenidos" a la derecha. Debajo, una cuadrícula de **2 columnas** con las cuatro últimas insignias obtenidas, cada una como casilla de colección: ícono en un cuadrado de 36 px con el color de su grupo y el título en 13 px y peso 800. Los logros ocultos se muestran igual que los demás: aquí no se distinguen.
- **Botón:** "Ver mis logros" (principal, `--sx-parchment-ink` sobre `--sx-parchment`, invertido), que navega al pasaporte.

### 6.5. Capítulo II: lo que Helena descubre de mí

Pergamino con borde de 3 px `--sx-gold`, porque concentra la curiosidad. Etiqueta "Capítulo II" y título "Lo que Helena descubre de mí".

- Una fila por página del libro (sección 7.2), con un sello de 48 px y dos líneas: el título de la página y su estado.
  - **Descifrada:** el sello abierto muestra el resumen (por ejemplo, las tres letras del código) y el estado dice "Descifrada".
  - **Lista para revelar:** el sello brilla (`--sx-seal` con anillo `--sx-gold` y pulso) y el estado dice "Lista para revelar" en `--sx-gold-deep`.
  - **Sellada:** el sello con candado y el estado "Sellada · {hechas} de {total} misiones".
- **Botón:** "Abrir el libro de Helena" (dorado, con sombra sólida), que navega a `discoveryPaths.helena`.

### 6.6. Capítulo III: hacia dónde voy

Pergamino. Etiqueta "Capítulo III" y título "Hacia dónde voy".

- **Mis planes:** tres filas en miniatura, una por posición A, B y C (sección 8). Cada una muestra la letra en un cuadrado del color del plan, el nombre de la carrera y, a la derecha, "Opción real" si está completa o "{n} de 4". Una posición vacía se ve punteada con "Espacio libre".
- **Lo que guardaste en el camino:** tres casillas con el número de carreras, ocupaciones e instituciones favoritas.
- **Empujón:** si hay carreras favoritas que no son plan y quedan posiciones libres, una línea dice "Tienes {n} carreras favoritas que aún no son un plan.".
- **Botón:** "Ver mis planes y favoritos", que navega a `appPaths.student.decisions`.

**No hay** botones "Ver mi progreso", "Mi punto de partida" ni "Ver mis favoritos".

### 6.7. Privacidad

Al pie, sobre el escenario: ícono `Eye` y "Tus compañeros solo ven tu nivel y las tres insignias que elijas. Lo demás lo ven tú y tu orientadora.".

---

## 7. El libro de Helena

**Ruta:** `/student/profile/helena`. **Ambiente:** `profile`. **Mecánicas:** CD4-04, CD6-03, CD7-03.

### 7.1. Composición

- **Encabezado** sobre el escenario: título "El libro de Helena", subtítulo "Lo que Helena va descubriendo de ti" y, a la derecha, el contador "{n} de 3 páginas descifradas" con tres sellos pequeños (llenos, brillante o punteados según el estado de cada página).
- **Tres páginas** en una cuadrícula de 3 columnas, en este orden: intereses, inteligencias, habilidades sociales.
- **Privacidad** al pie: "Tu libro lo ven tú y tu orientadora. Tu apoderado solo ve las páginas que ella habilite.".

### 7.2. Modelo de las páginas (`helenaPages.ts`)

```ts
type HelenaPageState = 'sealed' | 'ready' | 'revealed'

type HelenaPage = {
  id: InstrumentPageId
  numeral: 'I' | 'II' | 'III'
  title: string            // cómo lo vive el estudiante
  subtitle: string         // nombre del instrumento
  required: boolean        // "Para tu proyecto" u "Opcional"
  state: HelenaPageState
  missions: { done: number; total: number }
  teaser: string           // texto de la página sellada
  activityHref?: string    // siguiente misión
  result?: HelenaResult
}
```

| Página | Título | Subtítulo | Requerida | Fuente |
| --- | --- | --- | --- | --- |
| I | Lo que te atrae hacer | Tus intereses | Sí | **Real:** la actividad `act-tip-01` en `journey.progress`. `done` sale del avance de sus 14 interacciones; `total` es 14 |
| II | Tus formas de ser inteligente | Tus inteligencias | No | **Demostración:** completada, estado inicial `ready` |
| III | Cómo te relacionas | Tus habilidades sociales | Sí | **Demostración:** 2 de 4 misiones, estado `sealed` |

El estado se calcula así:

- `sealed` si las misiones no están completas.
- `ready` si están completas y el id **no** está en `discovery.revealedPages`.
- `revealed` si están completas y el id está en `discovery.revealedPages`.

Así, un estudiante que ya completó el test antes de este cambio encuentra su página lista para revelar, lo que mantiene la sorpresa.

Los datos de demostración viven en `helenaPages.ts`, con un comentario que diga que se reemplazan cuando existan los instrumentos.

### 7.3. Página sellada

Pergamino apagado: fondo `color-mix(in srgb, var(--sx-parchment) 60%, var(--muted))` y borde punteado de 2 px `--sx-night-border`.

- Etiqueta "Página {numeral} · sellada" y la etiqueta de requerida ("Para tu proyecto" en menta, "Opcional" en violeta suave).
- Título y subtítulo.
- **Niebla:** un recuadro de 150 px de alto con cuatro barras desenfocadas que se desplazan lentamente y un candado de 64 px al centro. La niebla **nunca** deja ver nada del resultado: las barras son decorativas y su forma no depende de las respuestas.
- **Teaser** en cursiva: "Esta página aún guarda algo sobre {cómo te relacionas con los demás}.". No es un mensaje de Helena: es el texto de la página.
- Rastro "Misiones de Helena · {hechas} de {total}" en `--primary` y el botón "Ir a la siguiente misión", que navega a la actividad (`activityHref`) o, si no hay una disponible, al mapa de la ciudad.

### 7.4. Página lista para revelar

Pergamino con borde de 3 px `--sx-gold`.

- Etiqueta "Página {numeral} · lista para revelar".
- Al centro, un sello de 112 px en `--sx-seal` con anillo de 4 px `--sx-gold`, el ícono `Sparkles` y un pulso dorado cada 2.2 s.
- Texto: "Completaste todas sus misiones. Helena terminó de leer esta página, pero quiere mostrártela ella misma.".
- Botón dorado "Romper el sello", a todo el ancho, con sombra sólida.

**Al romper el sello:** agrega el id a `revealedPages`, el sello se agranda y se desvanece en 400 ms, y el contenido descifrado aparece con un leve ascenso. El contador del encabezado se actualiza. Si el estudiante tiene movimiento reducido, el contenido aparece sin animación.

### 7.5. Página descifrada

Pergamino normal. Etiqueta "Página {numeral} · descifrada".

- **Intereses:** las tres áreas con mayor puntaje del resultado, como sellos abiertos de 70 px con su inicial y su nombre debajo. Usa el mismo cálculo de resultado que hoy muestra el nodo `resultado` del test (copia la lógica de `ResultNode`). Debajo, una frase que describe el área principal sin juzgarla. Botones: "Ocupaciones afines" (principal) y "Qué significa" (secundario).
  - "Ocupaciones afines" navega a `appPaths.student.catalog.professions` con `?afines=1`, que en la lista muestra primero las ocupaciones afines (sección 11.2).
  - "Qué significa" abre la actividad en modo revisión (`?actividad=act-tip-01&revision=1`), donde está la explicación del resultado.
- **Inteligencias (demostración):** las inteligencias destacadas como filas con ícono, nombre y descripción breve. Si hay empate, todas, con la nota "Destacan por igual. Ninguna es mejor que otra: describen cómo te gusta aprender y resolver.".
- **Habilidades sociales (demostración):** cuando se revele, el porcentaje por característica como rastros.

### 7.6. Reglas de validez

- Nada del resultado aparece antes de completar el instrumento y romper el sello.
- Los textos describen, nunca califican: no se usan "bueno", "malo", "alto" ni "bajo" para hablar de la persona.
- Ningún resultado se compara con el de otros estudiantes.

---

## 8. Mis planes

**Ruta:** `/student/profile/decisions`. **Ambiente:** `plans`. **Mecánicas:** CD2-07, CD3-08, CD4-02.

### 8.1. Datos (`plans.ts`)

- Los planes son las `DecisionSheet` con `status === 'active'` de `decisionSheets` del contexto.
- **Orden:** `discovery.planOrder`. Las hojas activas que no están en la lista se agregan al final por `createdAt`. Se muestran **como máximo tres**: la primera es el plan A, la segunda el B y la tercera el C.
- **Primer interés:** la hoja activa con el `createdAt` más antiguo lleva la etiqueta "Tu primer interés".
- **Completitud**, en cuatro secciones:

| Sección | Se considera completa si |
| --- | --- |
| Motivación | `motivation.trim()` no está vacío |
| Fortalezas y obstáculos | `strengths.trim()` y `challenges.trim()` no están vacíos |
| Presupuesto | `budgets.length > 0` |
| Cómo me preparo | `preparation.length + customPreparation.length > 0` |

### 8.2. Composición

- **Encabezado:** "Mis planes", subtítulo "Las rutas que estás considerando para después del colegio" y, a la derecha, una estrella con "{n} de 3 planes listos" (cartas completas).
- **Tres posiciones** en una cuadrícula de 3 columnas: las cartas de los planes y, si sobran posiciones, el espacio libre.
- **Lo que guardaste en el camino** (sección 8.5).
- **Privacidad:** "Tus planes los ven tú y tu orientadora. Tus compañeros no los ven.".

No hay mensaje de Lumi en pantalla. La sugerencia de revisar los planes tras un descubrimiento (V7.5) es una novedad de la campana (sección 8.7).

### 8.3. Carta de plan (`PlanCard`)

Marco de 8 px del color de su posición (`--sx-plan-a`, `--sx-plan-b`, `--sx-plan-c`), pergamino dentro y sombra inferior sólida de 8 px.

- **Cabecera:** la letra en un cuadrado de 52 px del color del plan, con borde de 3 px `--sx-parchment-ink`, y "Plan {letra}". A la derecha, el botón de ícono `Trash2` con `aria-label="Archivar plan"`.
- **Carrera:** el nombre en 25 px y peso 800. Debajo, la institución del primer presupuesto (`budgets[0].name`) o "Aún sin institución elegida". Si corresponde, la etiqueta "Tu primer interés".
- **Por qué la elijo:** una caja blanca con borde punteado que muestra la motivación entre comillas y en cursiva, recortada a tres líneas. Si está vacía: "Todavía no escribes por qué la eliges.".
- **Secciones:** las cuatro de la tabla, cada una con un círculo de 26 px. Completa: relleno `--success` con check. Pendiente: círculo punteado y texto `--sx-parchment-muted`.
- **Rastro de completitud:** "Opción real" si están las cuatro, o "En construcción", con "{n} de 4".
- **Botón principal:** "Revisar mi plan" si está completa, o "Seguir con: {primera sección pendiente}".
- **Prioridad:** dos botones, "Subir prioridad" y "Bajar prioridad", deshabilitados en los extremos. Cambian el orden en `discovery.planOrder`. Al moverse, la carta cambia de letra y de color de marco.
- **Carta completa:** un brillo diagonal la recorre cada 3.5 s.

### 8.4. Espacio libre

Borde punteado de 3 px `--sx-night-border`, sin pergamino. Al centro, una letra punteada en un cuadrado de 72 px, "Espacio para tu plan {letra}" y el texto "Tener otra ruta a la mano también es parte de decidir. Puedes partir de una carrera que marcaste como favorita.". Botones:

- **"Desde mis favoritos"** (dorado): lleva a la sección 8.5.
- **"Buscar en el catálogo"**: navega a `appPaths.student.catalog.careers`.

### 8.5. Lo que guardaste en el camino

Pergamino con un corazón en `--sx-gold`, el título "Lo que guardaste en el camino", el texto "Tus favoritos del catálogo. Una carrera favorita puede convertirse en un plan." y, a la derecha, el botón "Explorar el catálogo" con el ícono `Search`.

Tres columnas:

- **Carreras** (`careerInterestIds`): cada fila con el nombre. Si la carrera ya es un plan, la etiqueta "Plan {letra}". Si no y hay una posición libre, el botón "Hacer mi plan {letra}". Toda la fila enlaza al detalle de la carrera.
- **Ocupaciones** (`profiles` con `interested`): nombre y una nota: "Investigación en curso" si es la ocupación de `discovery.research`, "Afín a tu perfil" si es afín (sección 11.2), o nada. Enlaza al detalle.
- **Instituciones** (`institutionInterestIds`): nombre, tipo y departamento. Enlaza al detalle.

Cada columna muestra su conteo. Si una columna está vacía: "Aún no guardas {carreras}." con el enlace a esa sección del catálogo.

### 8.6. Acciones

| Acción | Comportamiento |
| --- | --- |
| Subir o bajar prioridad | Implementada (sección 8.3) |
| Archivar plan | Cambia el estado de la hoja a `archived` con la misma transformación que usa hoy `StudentDecisionSection`, incluido el evento de la línea de tiempo. Pide confirmación con `Dialog`: "¿Archivar {carrera}? Podrás volver a crearla desde tus favoritos." |
| Hacer mi plan desde un favorito | Crea la hoja con `createDecisionSheet(name, careerId)` y `setDecisionSheets`, como hoy, y la agrega al final de `planOrder` |
| Seguir con una sección o revisar el plan | **Pendiente.** Muestra un aviso breve (por ejemplo, con el mismo estilo de `BadgeToast`) que dice "El armado de esta sección llega pronto." |
| Elegir qué muestro (perfil) | **Pendiente.** Mismo aviso |

### 8.7. Sugerencia de revisión (V7.5)

Agrega a `unlocks.ts` una novedad "Revisa tus planes", que aparece en la campana cuando el estudiante rompe un sello en el libro de Helena. Al tocarla, navega a `appPaths.student.decisions`. No hay globo en la pantalla.

---

## 9. Investigaciones

**Rutas:** `/student/research` y `/student/research/guion`. **Ambiente:** `research`. **Mecánicas:** CD1-04, CD2-09, CD3-09, CD3-11, CD5-03, CD5-04.

### 9.1. Qué se conserva y qué se reemplaza

Investigaciones ya tiene su propia vista, con acceso rápido en el panel. Antes de cambiar nada, ubica en el código actual:

- **La tarjeta de entrevista** que lista las entrevistas del salón.
- **La vista de detalle** que se abre al tocar una tarjeta, con el video y las reacciones.
- **La lista de Leyendas**, si la vista la muestra.

En una versión anterior, estas piezas vivían en `StudentResourceBoard.tsx` (la lista de videos, el estado `selectedInterview` y su detalle). Si ya se movieron, usa su ubicación actual.

| Pieza | Qué pasa |
| --- | --- |
| Tarjeta de entrevista | **Se conserva** su contenido y su comportamiento (abre el detalle). Se restiliza (sección 9.5) |
| Detalle de la entrevista | **Se conserva** su estructura, su reproducción del video y su apertura. Cambian sus reacciones y se agrega la vista del autor (sección 9.6) |
| Cálculo de la lista de entrevistas | **Se conserva** (videos de demostración más `state.videos`, sin los ocultos por moderación, y la marca de Leyenda) |
| Lista de Leyendas | **Se conserva** su contenido. Cambia su acceso (sección 9.4) |
| Todo lo demás de la vista actual (encabezado, flujo para iniciar una investigación, invitaciones, pasos) | **Se reemplaza** por lo que describe esta sección |

Si la tarjeta o el detalle son componentes compartidos con otro rol, no los modifiques: cópialos a `src/features/student-experience/research/` y trabaja sobre la copia.

### 9.2. Acceso

- Si la investigación no está habilitada, se mantiene la condición que usa hoy la vista (por ejemplo, `researchUnlocked`). La vista muestra un pergamino con candado: "Las investigaciones se abren al resolver tu primer caso en la Central de Casos." y el botón "Ir a la ciudad". Debajo, el acceso a Leyendas sigue visible como pista (Dangling).
- La investigación es sobre una **ocupación**, no sobre una carrera. La ocupación sale de `occupationCatalog`.

### 9.3. Estados de la vista principal

| Estado | Condición | Botones de la cabecera de la vista |
| --- | --- | --- |
| Sin investigación | `!discovery.research?.guideReadyAt` | "Iniciar investigación" (dorado) |
| En curso | `guideReadyAt` y sin `publishedVideoId` | "Aliados · {n}" y "Ver mi guion" (dorado). **No** se muestra "Iniciar investigación" |
| Recién publicada | `publishedVideoId` | Tarjeta de confirmación y "Iniciar otra investigación" |

"Iniciar otra investigación" borra `discovery.research` y navega al guion. Si el estudiante salió del guion a mitad, "Iniciar investigación" dice "Continuar mi guion" y lo retoma donde lo dejó.

### 9.4. Composición

```
┌ Volver al mapa | Investigaciones                                   [🔔][?](AL) ┐
│                                                                                 │
│   Investigaciones                                 [Aliados · 2] [Ver mi guion]  │
│   Entrevistas a profesionales hechas por tu salón                               │
│                                                                                 │
│   ┌ Tu investigación en curso (borde dorado) ──────────────────────────────┐   │
│   │ Psicólogo clínico        [✓ Guion listo][🎙 Realizar][⬆ Publicar]       │   │
│   │                          ¿Ya conversaste?   [Publicar mi entrevista]     │   │
│   └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│   [De mi salón | Mis investigaciones]                    (♛ Salón de Leyendas)  │
│                                                                                 │
│   ┌ Tarjeta ────────────────┐   ┌ Tarjeta ────────────────┐                     │
│   │ …                        │   │ …                        │                     │
│   └──────────────────────────┘   └──────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Márgenes.** La vista respira más que la actual: relleno del contenido de 40 px en escritorio (20 px por debajo de 768 px), 28 px entre bloques, 24 px entre tarjetas y 24 px de relleno dentro de cada pergamino.

- **Tarjeta en curso:** pergamino con borde de 3 px `--sx-gold`. La etiqueta "Tu investigación en curso", la ocupación en 27 px y tres pasos como casillas: "Guion listo" (relleno `--sx-amb-research`, check, "{n} preguntas"), "Realizar la entrevista" ("Fuera de la plataforma") y "Publicar" (punteada, "Resumen y enlace al video"). A la derecha, "¿Ya conversaste con esa persona? Comparte lo que descubriste con tu salón." y el botón "Publicar mi entrevista", con un pulso dorado.
- **Recién publicada:** pergamino con borde menta, un check de 76 px, "Tu entrevista ya está en el salón" y "La publicaste junto a {coautores}. Tus compañeros ya pueden verla y reaccionar." (sin la primera parte si no hay coautores). Botón "Ver en Mis investigaciones".
- **Pestañas:** "De mi salón" y "Mis investigaciones", como píldoras sobre el escenario, con navegación por teclado (flechas, Inicio y Fin). Si la vista actual ya tiene pestañas, conserva su mecanismo y cambia solo los textos y el estilo.
- **Salón de Leyendas:** deja de ser una pestaña del mismo nivel. Es un botón aparte, a la derecha de las pestañas, con el ícono `Crown`, borde de 2 px `--sx-gold` y texto `--sx-gold`. Abre la lista de Leyendas que ya existe, con el ambiente dorado en lugar del menta, para que se sienta como entrar a otro lugar. Visualmente no se parece a las pestañas.

### 9.5. Tarjetas (restilizadas)

La tarjeta conserva lo que muestra hoy y su apertura del detalle. Cambia su presentación al estilo de esta especificación:

- **Pergamino** con borde de 2 px `--sx-parchment-edge`. Al pasar el cursor, se eleva 4 px y su borde pasa a `--sx-amb-research`.
- **Cabecera ilustrada** de 96 px: un degradado de `--sx-amb-research` al 18 % sobre el pergamino, con el ícono de la ocupación (o `Mic` si no hay uno) en un círculo blanco de 56 px y anillo menta. Si la entrevista es Leyenda, una etiqueta oscura con `Crown` y "Leyenda" arriba a la derecha.
- Etiqueta "Entrevista a" en `--sx-gold-deep`, la ocupación (o el título) en 22 px y peso 800 y el entrevistado.
- El resumen recortado a tres líneas.
- **Autores:** "Por" y una píldora por autor con avatar de iniciales, alias y "Nivel {n} · {título}". El nivel de los compañeros de demostración sale de `researchData.ts`.
- **Pie:** el botón "Ver la entrevista" a todo el ancho, en `--sx-parchment-ink` con texto claro. Si el estudiante ya reaccionó, una marca discreta "Ya reaccionaste" con `Check` en menta.
- **No muestra conteos de reacciones** en las entrevistas de otros.
- Cuadrícula de 2 columnas en escritorio y de 1 por debajo de 768 px.

### 9.6. Detalle de la entrevista

Se conserva el detalle actual: cómo se abre, cómo se cierra y cómo muestra el video. Se le aplica el pergamino y el ambiente menta, y cambian dos cosas:

**Reacciones (si la entrevista es de otro estudiante).** Se reemplazan por dos:

- **"Aprendí algo"** (borde `--sx-amb-research`, ícono `Lightbulb`). Abre debajo una caja con la etiqueta "¿Qué aprendiste con esta entrevista?", un `textarea` de tres líneas y "{autores} verá lo que escribas.". "Enviar" se habilita con 15 caracteres o más y guarda `discovery.reactions[id].learned`. Después, el botón queda marcado y sin acción, y debajo aparece "Lo que aprendiste: {texto}".
- **"Me gustó cómo se realizó"** (borde `--primary`, ícono `Star`). Alterna `discovery.reactions[id].liked`. Se puede marcar junto con "Aprendí algo".
- Ambas son solo positivas, y no se muestran conteos.

**Vista del autor (si la entrevista es del estudiante).** En lugar de las reacciones:

- **Reacciones recibidas:** dos píldoras, "{n} aprendieron algo" y "{n} les gustó cómo se realizó".
- **Lo que aprendieron tus compañeros:** hasta tres textos, con el alias en negrita.
- **Camino a Leyenda:** un recuadro oscuro con `Crown`, el rastro "Reacciones · {n} de {umbral}" y la fila "Destacada por tu orientadora · Aún no / Sí" (de `interviewModeration[id].featured`). Debajo: "Si llega a Leyenda, la verán estudiantes de todos los salones y de futuras promociones.".
- **Lo que cambió para ti:** el texto de "¿Qué cambió después de conversar?", con "Solo lo ves tú y tu orientadora.".

Las reacciones recibidas y sus textos son de demostración (`researchData.ts`), porque no hay otros estudiantes reales. El umbral es la constante `LEGEND_REACTIONS_REQUIRED = 10`, en el mismo archivo.

### 9.7. Mis investigaciones

Las mismas tarjetas, filtradas a las entrevistas del estudiante (`discovery.publishedResearch`, más las que ya tenga publicadas con su alias en `state.videos`). En su pie, en lugar de "Ya reaccionaste", la tarjeta muestra "{n} reacciones". Al tocarla se abre el detalle en la vista del autor.

Si no hay entrevistas publicadas: "Cuando publiques tu primera entrevista, aquí verás lo que tus compañeros aprendieron con ella.".

### 9.8. Paneles y publicación

**Ver mi guion (`GuideSheet`):** `Sheet` derecho de 520 px, sobre pergamino. Etiqueta "Mi guion", la ocupación, una caja punteada "Lo que pensaba antes de la entrevista" con el texto en cursiva y la lista numerada de preguntas: las sugeridas con fondo menta suave y número en menta, y las propias con fondo blanco y número en dorado. Al pie: "Llévalo contigo a la entrevista: puedes abrirlo desde el celular.".

**Aliados (`AlliesSheet`):** `Sheet` derecho de 460 px, sobre `--sx-night-raised`. Título "Aliados" y "Compañeros de tu salón que también armaron su guion para {ocupación}.". Una fila por aliado con avatar, alias y nivel. Al pie: "Si hicieron la entrevista juntos, podrás sumarlos como coautores al publicar.". Los aliados son informativos: no hay acciones sobre ellos. Salen de `researchData.ts`, con alias de `classroomAliases`. Se muestran **solo** a partir de que el guion está listo.

**Publicar (`PublishDialog`):** `Dialog` de 680 px sobre pergamino. Campos, en este orden:

1. "¿A quién entrevistaste?" (texto).
2. "Resumen de la entrevista" (cuatro líneas), con la indicación "Lo más importante que te contó: cómo es su trabajo, qué estudió, qué consejo dio.".
3. Una caja punteada con "Antes pensabas" y el texto previo en cursiva, seguida de "¿Qué cambió después de conversar?" (tres líneas) y "Esto solo lo ves tú y tu orientadora.".
4. "Enlace al video", con "Súbelo a tu canal de YouTube como «no listado» y pega aquí el enlace.".
5. "Coautores (opcional)": una píldora por aliado que se marca o desmarca con un toque, con "Coautor" al marcarse.

Botones: "Guardar para después" (guarda el borrador en `research.publication` y cierra) y "Publicar en mi salón" (menta), que se habilita con un nombre, un resumen de 30 caracteres o más y un enlace válido según `safeVideoUrl`.

**Al publicar:**

1. Agrega el video a `adventure.videos` con la misma transformación que usa hoy la publicación de la vista de investigaciones (copiada): `title` es el nombre de la ocupación, `alias` "Alex", `url` de `safeVideoUrl` y `reflection` el resumen.
2. Guarda `publishedVideoId` en `research` y agrega la entrada a `publishedResearch` con la ocupación, los coautores y el texto de "¿Qué cambió?".

### 9.9. Guion de la entrevista (`ResearchGuideView`)

**Ruta:** `/student/research/guion`. Escenario con ambiente `research`. Sin panel de Lumi: los textos de Lumi están en la ayuda (sección 4).

- **Arriba:** "Volver a investigaciones" y, al centro, tres pasos como píldoras: "Lo que pienso", "Mis preguntas" y "Lista". El paso actual va en pergamino y los demás sobre el escenario, con un punto dorado en los hechos.
- **Contenido** en un pergamino de 760 px como máximo.

**Paso 1, lo que pienso:**

- Etiqueta "Vas a entrevistar a" y una casilla con la ocupación y el botón "Cambiar ocupación". Si aún no hay ocupación, la casilla dice "Elige a quién entrevistarás" y el botón "Elegir ocupación".
- El botón abre un `Sheet` con un buscador y la lista de `occupationCatalog`, con las favoritas primero.
- La pregunta "Antes de conversar con esta persona, ¿qué crees que hace en su trabajo y qué esperas descubrir?" sobre un `textarea` de seis líneas, con el marcador "Escribe lo que piensas hoy. No hay respuestas incorrectas.".
- "Esto queda guardado tal cual. Después de la entrevista podrás compararlo con lo que descubriste.".
- "Seguir con las preguntas" se habilita con una ocupación y 20 caracteres o más.

**Paso 2, mis preguntas:**

- Título "Mi lista de preguntas" y "{n} preguntas" a la derecha.
- "Sugeridas por Lumi": tres preguntas fijas que no se pueden quitar: "¿Cómo es un día normal en tu trabajo?", "¿Qué estudiaste para llegar a donde estás?" y "¿Qué consejo le darías a alguien de mi edad?".
- "Mis preguntas": las del estudiante, cada una con un botón `X` (`aria-label="Quitar pregunta"`). Si no hay: "Aún no agregas preguntas propias. ¿Qué te gustaría saber que no esté arriba?".
- Un campo "Escribe una pregunta que quieras hacer" con el botón "Agregar" (habilitado desde 5 caracteres). Enter también agrega.
- Botones "Volver" y "Terminar mi guion", que se habilita con al menos una pregunta propia.

**Paso 3, lista:**

- Un ícono de portapapeles con check en un círculo dorado de 96 px que pulsa.
- "Tu guía de entrevista está lista" en 28 px y "{ocupación} · {n} preguntas".
- Tres pasos numerados: "Busca a alguien que ejerza esta ocupación: un familiar, un conocido o alguien que te recomienden.", "Haz la entrevista con tu guía y grábala en video, con su permiso." y "Vuelve a Investigaciones para publicarla con un resumen y el enlace al video.".
- Botones "Ver mi guion completo" (abre `GuideSheet`) e "Ir a Investigaciones".
- Al llegar a este paso se guarda `guideReadyAt`.

Todo lo que se escribe se guarda en `discovery.research` a medida que cambia, para poder retomarlo.

### 9.10. Lo que se retira

- **Del mapa de la ciudad:** el punto "Estación de investigación". En `mapPoints.ts`, retíralo de `getCiudadPoints` y de las reglas del siguiente paso. El acceso a Investigaciones queda en los accesos rápidos del panel, como ya está.
- **De la vista de Investigaciones:** su encabezado y su flujo actual para iniciar una investigación (sección 9.1).
- **Recursos no cambia.**

---

## 10. Compatibilidad con lo existente

- Los datos guardados antes del cambio siguen funcionando: los favoritos, las hojas de decisión, los videos publicados, la moderación y el progreso del test aparecen igual.
- El borrador de investigación antiguo (`adventure.research`) no se migra. La vista nueva empieza vacía y lo ignora.
- Las reacciones antiguas (`adventure.reactions`) no se muestran en el detalle nuevo, que usa `discovery.reactions`.
- `ExplorationProfileView` sigue mostrando el pasaporte en `?section=passport`.

---

## 11. Catálogo: el atlas

**Rutas:** listas y detalles de la sección 5.2. **Ambiente:** `atlas`. **Mecánicas:** CD2-04 (exploración por familias), CD4-06, CD4-07.

### 11.1. Datos de detalle (`catalogDetails.ts`)

**La información de las vistas de detalle es la que manda.** Las tarjetas de resumen de las listas muestran un subconjunto de esos datos, y nada que no esté en el detalle.

```ts
type IncomeRange = { average: number; min: number; max: number }   // soles mensuales

type CareerFamily = {
  id: string
  name: string                       // nombre de la familia de carreras (clasificador del INEI)
  incomes: Record<'LIMA' | 'NACIONAL', {
    rank: number                     // posición en el ranking de ingresos
    rankTotal: number
    young?: IncomeRange              // jóvenes
    adult?: IncomeRange              // adultos
  }>
  source: string                     // texto de la fuente
}

type CareerDetail = {
  id: string                         // mismo id que careerCatalog cuando existe
  name: string
  familyId: string
  description: string
  durationYears: number
  institutionIds: string[]
  occupationIds: string[]
}

type RiasecDimension = 'R' | 'I' | 'A' | 'S' | 'E' | 'C'

type OccupationDetail = {
  id: string                         // mismo id que occupationCatalog
  onetCode: string
  name: string
  whatTheyDo: string
  knowledge: string[]                // ordenados por importancia
  skills: string[]
  interestScores: Record<RiasecDimension, number>   // 0 a 100
  highPoints: RiasecDimension[]      // hasta tres, en orden
  careerIds: string[]
}

type InstitutionType = 'UNIVERSITARIA' | 'TECNICA' | 'FFAA_POLICIA'

type InstitutionDetail = {
  id: string
  name: string
  type: InstitutionType
  management: 'PUBLICA' | 'PRIVADA'
  description: string
  address: string
  location: { department: string; province: string; district: string }
  website: string
  careerIds: string[]
}
```

- Las ocupaciones **no** tienen grado de formación: la formación se ve solo a través de sus carreras asociadas. Si una ocupación no tiene carreras, su bloque de carreras no aparece.
- Completa el archivo con todas las ocupaciones de `occupationCatalog` y las seis carreras de `careerCatalog`, conservando sus ids. Agrega instituciones específicas de demostración (al menos dos universidades, un instituto técnico y una escuela de las Fuerzas Armadas o la Policía), porque las de `institutionCatalog` son genéricas.
- Las relaciones son simétricas: si una carrera lista una institución, esa institución lista la carrera. Una prueba lo verifica (sección 13).
- Los ingresos son **de demostración**, con un comentario que lo diga y `source` con el texto "[Fuente de datos salariales]". Se reemplazan después por los datos reales.
- Los nombres de dimensión RIASEC: Realista, Investigador, Artístico, Social, Emprendedor y Convencional.

`catalogSelectors.ts` expone las consultas: `getCareer(id)`, `getOccupation(id)`, `getInstitution(id)`, `getFamily(id)`, `careersOfOccupation(id)`, `occupationsOfCareer(id)`, `institutionsOfCareer(id)`, `careersOfInstitution(id)` e `isAffine(occupationId)`.

**Afinidad (`isAffine`).** Devuelve un nivel ("Gran ajuste" o "Buen ajuste") solo si la página de intereses está revelada (`revealedPages` incluye `intereses`). Mientras no exista el cálculo real, usa una tabla de demostración en el mismo archivo.

### 11.2. Listas y tarjetas de resumen

`StudentCatalogView` es una copia de `ExplorationCatalogView` con el diseño de esta especificación. Conserva el buscador por nombre (`matchesName` y `normalizeSearchText`, copiados), los textos de cada sección y el resultado vacío. Las tarjetas son pergaminos en una cuadrícula de 3 columnas, y **toda la tarjeta navega al detalle** en lugar de abrir un diálogo. El botón de favorito va arriba a la derecha y no navega.

| Tarjeta | Contenido |
| --- | --- |
| Carrera | Nombre, familia, "{n} años" y la descripción recortada a dos líneas |
| Ocupación | Nombre, el código de interés como tres sellos pequeños, "qué hacen" recortado a dos líneas y, si se desbloqueó en la Central de Casos (`discoveryState` distinto de `unused`), la etiqueta "Ícono obtenido" |
| Institución | Nombre, tipo, gestión, departamento y "{n} carreras" |

- La lista no muestra indicadores de popularidad.
- En ocupaciones, con `?afines=1`, las afines van primero con la etiqueta "Afín a tu perfil".
- En la cabecera de profesiones, un resumen compacto: "Tu exploración" y "{n} ocupaciones descubiertas" (singular cuando corresponda). No mostrar el total de ocupaciones ni una casilla o ícono por cada ocupación; el catálogo puede crecer.

### 11.3. Detalle de carrera

**Encabezado** (pergamino oscuro, ancho completo): etiqueta "Carrera", el nombre en 36 px y peso 800, las etiquetas de la familia y de la duración, y el botón "Guardar en favoritos" (borde y corazón `--sx-gold`; relleno cuando ya es favorita).

**Columna principal:**

- **De qué trata:** la descripción y la etiqueta "Duración referencial: {n} años".
- **Cuánto se gana:** "Ingresos de egresados de la familia {familia}" y un selector "Lima | Nacional" en píldoras. Debajo, dos tarjetas lado a lado, "Jóvenes" y "Adultos", cada una con "Promedio mensual", el promedio en 28 px, un rastro que dibuja el rango entre el mínimo y el máximo, y "Mín. S/ {min}" y "Máx. S/ {max}". Debajo, "En {Lima | el país}, esta familia ocupa el puesto {rank} de {rankTotal} en el ranking de ingresos." y la fuente, seguida de "Son ingresos de toda la familia de carreras, no solo de esta carrera.". Si falta un grupo, su tarjeta dice "Sin datos para este grupo".
- **Ocupaciones a las que conduce:** cuadrícula de 2 columnas con filas enlazadas al detalle de la ocupación, con "Gran ajuste contigo" o "Buen ajuste contigo" cuando corresponde.

**Columna lateral:**

- **Dónde estudiarla:** filas enlazadas a cada institución, con tipo y departamento, y "Los costos se consultan en la página de cada institución.".
- **En tus planes** (borde dorado), solo si la carrera es un plan: "Ya es tu Plan {letra}." y "Ver mi tarjeta". Si no lo es y hay posiciones libres: "¿Y si la conviertes en un plan?" y "Hacer mi plan {letra}" (sección 8.6).
- **Explorando familias:** tres segmentos, llenos según cuántas familias distintas tienen las carreras de `viewedCareerIds`, con "Revisaste carreras de {n} familias distintas." y, si son menos de tres, "Mira una más para tu insignia de exploración.". Al abrir un detalle de carrera, su id se agrega a `viewedCareerIds`. Este bloque solo muestra el avance: no otorga la insignia, que sigue dependiendo de `AdventureAchievements`.

### 11.4. Detalle de ocupación

**Encabezado:** etiqueta "Ocupación · O*NET {código}", el nombre, la etiqueta con el código de interés en palabras ("Investigador · Social · Artístico") y, si corresponde, la etiqueta "Ícono obtenido en la Central de Casos" en menta. Botón de favorito.

**Columna principal:**

- **Qué hacen.**
- **Conocimientos que usan:** etiquetas, con "Ordenados por importancia.".
- **Habilidades que necesitan:** etiquetas.
- **A qué tipo de persona le suele atraer:** los tres `highPoints` como sellos de 54 px con su letra, la frase "Su código de interés es {palabras}: los tres intereses que más pesan en esta ocupación." y seis rastros horizontales, uno por dimensión, con los `highPoints` en `--sx-gold` y el resto apagados.

**Columna lateral:**

- **Afinidad contigo** (borde menta), solo si `isAffine` devuelve un nivel: ícono `Sparkles`, el nivel y "Según lo que Helena descifró de tus intereses".
- **Carreras que conducen a ella:** "Las carreras del Perú que forman para esta ocupación." y filas enlazadas al detalle de cada carrera, con la familia y la duración. Si no hay carreras, el bloque no aparece.
- **Entrevistas de tu salón:** las entrevistas publicadas sobre esta ocupación, enlazadas a Investigaciones. Si no hay: "Nadie de tu salón la ha investigado todavía." y "Investigarla", que navega al guion con esta ocupación elegida.

### 11.5. Detalle de institución

**Encabezado:** etiqueta "Institución", el nombre, las etiquetas de tipo ("Universitaria", "Técnica" o "Fuerzas Armadas y Policía"), gestión ("Pública" o "Privada") y departamento. Botón de favorito.

**Columna principal:**

- **Sobre la institución:** la descripción.
- **Carreras que ofrece:** cuadrícula de 2 columnas con filas enlazadas al detalle de cada carrera. Las carreras favoritas van primero, con la nota "Tus carreras favoritas aparecen primero.".

**Columna lateral:**

- **Dónde queda:** la dirección y "{distrito} · {provincia} · {departamento}".
- **Costos y admisión:** "Los costos, becas y fechas de admisión cambian cada año. Revísalos en su página oficial y anótalos en el presupuesto de tu tarjeta.", el botón "Ir a su página web" (ícono `ExternalLink`, abre otra pestaña) y "Usarla en un presupuesto", que por ahora navega a `appPaths.student.decisions`.

### 11.6. Navegación entre detalles

- Cada detalle tiene, arriba, un botón "{Carreras | Ocupaciones | Instituciones}" con `ArrowLeft` que vuelve a su lista, y la línea "Catálogo · {sección}".
- Los enlaces entre detalles usan `discoveryPaths` y mantienen el historial del navegador.
- Un id inexistente muestra un pergamino con "No encontramos esta página del atlas." y "Volver al catálogo".

---

## 12. Fases de implementación

Cada fase termina ejecutando `npm run build`, `npm run lint` y `npm test`. Build y lint deben quedar en verde. Todas las pruebas nuevas deben pasar y no se admiten regresiones adicionales: solo pueden permanecer los siete fallos previos registrados en `plan.md`, por el mismo motivo. Si un fallo previo pertenece a una vista que cambia esta especificación, se actualiza en esa fase y se retira de la lista al aprobarse. Recursos, sus pruebas y la prueba de accesos rápidos no se modifican. Al finalizar se entrega la lista residual. Las aserciones actualizadas y el resultado de cada fase se registran en `plan.md`.

1. **Base.** `paths.ts`, `discoveryStore.ts`, los tokens de la sección 3.4, `discovery.css` con los patrones, `DiscoveryStage`, `Parchment`, `Seal`, `TrailBar`, `CollectionSlot`, `FavoriteButton`, los cambios de `views.ts` y los textos de ayuda.
2. **Perfil y libro.** `StudentProfileView`, `HelenaBookView`, `helenaPages.ts`, `ProfileRoute` y la novedad "Revisa tus planes".
3. **Planes.** `StudentPlansView`, `PlanCard` y `plans.ts`, con prioridad, archivo, creación desde favoritos y acciones pendientes.
4. **Investigaciones.** `StudentResearchView`, `ResearchGuideView`, los paneles, la publicación y `researchData.ts`; restilizado de las tarjetas y ajustes del detalle. Retiro de la estación de la ciudad.
5. **Catálogo.** `catalogDetails.ts`, `catalogSelectors.ts`, `StudentCatalogView` y los tres detalles.
6. **Cierre.** Pruebas nuevas, revisión de accesibilidad y de movimiento reducido, y comprobación a 360 px.

---

## 13. Pruebas

Modifica solo las pruebas del estudiante en `tests/adventure-rendering.test.mjs`. Al actualizar una expectativa, cambia solo la aserción que el cambio invalida, reemplázala por la equivalente del diseño nuevo y menciónala en el reporte de la fase.

**Se actualizan (fase 4):**

- "presentation locks pending path missions while prototype city and research stay accessible" y "the city and research station render after the actual mission requirement": dejan de buscar "Estación de investigación" en `/student/exploration`. En `/student/research` buscan "Iniciar investigación" en lugar del texto del flujo anterior.
- Las pruebas de `getRecommendedPoint` y `getPointDetails` que esperan el punto `research` en la ciudad pasan a esperar el siguiente punto según las reglas.
- Las que verifican el orden de puntos de la ciudad (`['beliefs', 'forest-fire', 'research', 'mara-test']`) retiran `research`.
- Las pruebas de la vista de Investigaciones que verifican su encabezado o su flujo anterior se actualizan. Las que verifican las tarjetas, el detalle, la moderación o las Leyendas se mantienen, salvo las aserciones sobre las reacciones anteriores, que pasan a las dos nuevas.
- **No cambies** las pruebas de Recursos ni la de accesos rápidos.

**Se actualizan (fase 3):**

- La que espera `aria-label="Secciones de mi perfil"` en `/student/profile/decisions` pasa a esperar "Mis planes" y "Lo que guardaste en el camino".

**Se mantienen sin cambios:** "all new student pages and related parent/counselor routes render", "student routes have no sidebar and modules have a return button and header help" (las rutas nuevas se agregan a su lista) y "the passport lives inside the profile…".

**Pruebas nuevas:**

- `/student/profile` contiene "Lo que he logrado", "Lo que Helena descubre de mí", "Hacia dónde voy", "Recorrido" y "Logros recientes", y no contiene "Ver mi progreso", "Mi punto de partida" ni "Ver mis favoritos".
- `/student/profile/helena` muestra una página sellada sin contenido del resultado, y con el test completado y sin revelar muestra "Romper el sello". Con `revealedPages: ['intereses']`, muestra "Descifrada" y "Ocupaciones afines".
- `getHelenaPageState` devuelve `sealed`, `ready` y `revealed` según las reglas de la sección 7.2.
- `getPlanCompleteness` devuelve 4 para una hoja con las cuatro secciones y 0 para una nueva. `getOrderedPlans` respeta `planOrder` y devuelve como máximo tres.
- `/student/research` sin guion contiene "Iniciar investigación" y no contiene "Aliados". Con `guideReadyAt`, contiene "Ver mi guion", "Aliados" y "Publicar mi entrevista", y no contiene "Iniciar investigación".
- En `/student/research`, las tarjetas de otros estudiantes no contienen "aprendieron algo" ni "reacciones".
- `/student/research/guion` contiene las tres preguntas sugeridas.
- Las relaciones de `catalogDetails.ts` son simétricas y todos los ids referidos existen.
- `/student/catalog/careers/psychology` contiene "Cuánto se gana", "Jóvenes", "Adultos" y "Dónde estudiarla". `/student/catalog/professions/{id}` no contiene "grado" ni "Formación que suele requerir".
- Ninguna de las rutas de este documento contiene `role="dialog"` al renderizarse sin interacción.

---

## 14. Criterios de aceptación

- [ ] Ninguna vista de este documento se ve como una interfaz web estándar: usan el escenario nocturno, los pergaminos, los sellos, las cartas y los rastros, con el ambiente de color de cada vista.
- [ ] No hay mensajes de Lumi ni de Helena en pantalla. Sus textos están en la ayuda de cada vista.
- [ ] No se agregó ningún hexadecimal fuera de los tokens existentes, y no se modificó ningún archivo prohibido.
- [ ] La ficha del viajero muestra el nivel, el recorrido, la afinidad, los logros en dos columnas y los tres capítulos con sus únicos botones.
- [ ] El libro de Helena muestra los tres estados. Romper un sello revela la página una sola vez, actualiza el contador y deja una novedad "Revisa tus planes".
- [ ] Los planes muestran hasta tres cartas con su completitud y su prioridad, que se puede cambiar. Los favoritos aparecen en la misma vista con el enlace al catálogo.
- [ ] La investigación pasa por sus tres estados. Los aliados y "Ver mi guion" aparecen solo con el guion listo. Publicar agrega el video al salón.
- [ ] "Aprendí algo" exige escribir qué se aprendió. Las entrevistas de otros no muestran conteos.
- [ ] El salón de Leyendas se distingue de las pestañas del salón.
- [ ] La estación de investigación ya no está en la ciudad, y Recursos quedó igual.
- [ ] Las tarjetas y el detalle de entrevista se conservan, con el estilo nuevo, más margen y las dos reacciones.
- [ ] Cada detalle del catálogo es una página con los datos de la sección 11, y las tarjetas de resumen solo muestran datos que están en el detalle.
- [ ] Con movimiento reducido no hay pulsos, brillos, niebla en movimiento ni animación de revelación.
- [ ] Nada se desborda horizontalmente a 360 px.

---

## 15. Pendientes

- **Formularios de las tarjetas de plan:** se diseñan en una especificación aparte. Hasta entonces, "Seguir con" y "Revisar mi plan" muestran el aviso de la sección 8.6.
- **Selección de insignias visibles** para los compañeros.
- **Instrumentos de inteligencias y habilidades sociales:** sus páginas usan datos de demostración.
- **Test de intereses RIASEC:** el libro usa el resultado del test actual. Cuando se cambie a O*NET, la página de intereses mostrará el código RIASEC y la afinidad dejará de ser de demostración.
- **Datos reales de ingresos, ocupaciones e instituciones** en `catalogDetails.ts`.
- **Nombre de Helena:** el contenido actual llama `Elena` al personaje que revela el resultado. Estas vistas usan "Helena". Hay que unificarlo en el contenido.


## Acuerdos de implementación

Los acuerdos de `plan.md` complementan esta versión: creación explícita de planes; persistencia de favoritos y hojas en `ov.student-exploration.v1`; demostración de intereses identificada al completar la primera interacción, sin falsificar el avance real ni journey.results; instituciones ficticias identificadas; alias de investigaciones compatible y comparación de fallos contra la línea base. Se permite ajustar OccupationExplorationModule para consumir el store del estudiante sin cambiar su API.
