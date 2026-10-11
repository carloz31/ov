# Especificación: interfaz inmersiva del estudiante

Repositorio: `carloz31/ov_frontend` · Versión 1 · 3 de octubre de 2026

Este documento describe cómo transformar las vistas del estudiante en una experiencia inmersiva, inspirada en el prototipo anterior `carloz31/journey-island`. La lógica, los datos y las rutas actuales se conservan. Solo cambia la forma en que se presentan.

Implementa el trabajo por fases (sección 14). Al cerrar cada fase, ejecuta `npm run build`, `npm run lint` y `npm test`.

---

## 1. Objetivo

Hoy las vistas del estudiante se ven como una plataforma convencional: sidebar fijo, barra superior con breadcrumb y un reproductor de actividades en tarjeta clara. El objetivo es que el estudiante sienta que recorre un mundo junto a Lumi:

- El mapa ocupa toda la pantalla, con un panel flotante y plegable a la izquierda.
- Las ayudas son diálogos de Lumi sobre un fondo desenfocado, con texto que se va escribiendo.
- Las actividades se viven a pantalla completa, con fondos que cambian de ambiente (noche con luz cálida o amanecer) y diálogos al estilo de novela visual.
- Los módulos (diario, familia, recursos, catálogo, perfil, etc.) se abren desde el panel en pantalla completa, con un botón para volver al mapa.

---

## 2. Reglas obligatorias

### 2.1. Áreas que no se tocan

- **No abras, leas ni modifiques** `src/features/parent-portal/**`, `src/features/counselor-portal/**` ni `tests/counselor-portal.test.mjs`.
- En `src/routes/AppRoutes.tsx`, modifica **solo** el bloque `<Route path="/student">` y los imports exclusivos del estudiante:
  - **Puedes agregar** imports de `@/features/student-experience/**`.
  - **Puedes retirar** imports que solo usaba el bloque `/student` y que quedan sin uso, como `OccupationExplorationShell`, o `FieldMissionsPage` y `ExplorationHomePage` dentro del import de `OccupationExplorationPages`. Retira solo esos nombres y conserva el resto de la línea.
  - **No toques** los imports que usan `/parent` o `/counselor`, aunque también los use el estudiante. Por ejemplo, `FamilyConversationsView` se queda porque lo usa la ruta del apoderado.
  - No cambies el orden ni el formato de los demás imports, ni las rutas de `/parent` y `/counselor`.
- **No modifiques** archivos que comparten o podrían compartir otros roles:
  - `src/components/**` (incluye `layout/`, `ui/`, `AdventureMap.tsx`, `MapPointDrawer.tsx`, `GuideDialogue.tsx`, `PageHeader.tsx`, `MetricCard.tsx`).
  - `src/features/family-conversations/**`.
  - `src/styles/Theme.css` e `src/index.css`.
- Los primitivos de `src/components/ui/` (Button, Dialog, Drawer, Sheet, DropdownMenu, Tooltip, Progress, Collapsible, Avatar, Badge) **se pueden importar, pero nunca modificar**.
- El estudiante no comparte componentes compuestos con el apoderado ni con la orientadora. Todo componente nuevo vive en `src/features/student-experience/` y solo lo usan rutas `/student`.
- Si una tarea parece requerir un cambio en un archivo prohibido, **detente y repórtalo** en lugar de hacerlo.

### 2.2. Datos y lógica que se conservan sin cambios

No modifiques estos archivos ni las estructuras que definen:

- `src/features/missions/model.ts`, `logic.ts`, `store.ts`, `content.ts`, `standardActivities.ts` y `data/*.json`.
- `src/features/occupation-exploration/lib/**`, `types/**` y `data/**`.
- Las claves `ov.student-adventure.v1` y `ov.missions.v2` de localStorage, la base IndexedDB `ov.mission-files` y la constante `prototypeAllUnlocked`.

Cada escritura de estado del nuevo código debe usar `updateJourney` o `updateAdventure` **con las mismas transformaciones que usa hoy el código existente**. Donde este documento dice "copiar la lógica de X", copia la función o el bloque tal cual y cambia solo el marcado.

Se permiten **dos claves nuevas** de localStorage, aisladas en la carpeta nueva:

- `ov.student-ui.v1`: estado de presentación (sección 4.4). No contiene datos del proceso vocacional.
- `ov.student-followups.v1`: preguntas de seguimiento de Lumi (sección 9.7).

**Excepción: sincronización de misiones completadas.** Hoy, completar una actividad v2 solo actualiza `journey.progress`. Los niveles, las insignias I1 a I3 y el desbloqueo real de la ciudad y de la familia leen otro dato, `adventure.completedMissionIds`, que solo escribía el componente antiguo `FieldActivities` (ya sin uso) mediante `completeMission(id)`. El nuevo código del estudiante debe volver a llamar a esa función existente, como se indica en la sección 4.3. No se modifica `AdventureStore.ts` ni ningún otro archivo de lógica: solo se usa la escritura que ya existe.

Además, el seguimiento guarda la respuesta condensada como una nueva versión del `Entregable` existente, con la misma estructura y el mismo bloque de código que ya usa `SubmissionForm` para crear versiones. No agrega campos ni tipos al modelo.

### 2.3. Lo que no se incorpora del prototipo anterior

- Puntos (ni en el reproductor, ni en el panel, ni en el cierre).
- Ranking o lista de compañeros con su progreso.
- Mensajes de la orientadora.
- Subida de archivos: no se renderizan entregables de tipo `archivo` ni el botón de la plantilla alternativa (`plantilla.alternativa`). En los datos actuales solo aparece como alternativa opcional (`g-archivo`), así que su ausencia no impide completar ninguna actividad.
- Marcador de la meta del orientador.
- Botón para retroceder en el reproductor. El reproductor actual no lo tiene y los instrumentos lo prohíben (`docs/mission-spec.md`, §2).

### 2.4. Estilo

- **Colores:** solo las variables de `Theme.css`, directamente o mediante `color-mix()`, y los tokens locales de la sección 4.6. Ningún archivo nuevo usa valores hexadecimales literales fuera de esa sección. Los únicos hexadecimales de la sección 4.6 (`--sx-path` y `--sx-module-bg`) son colores que ya usa la interfaz actual y se conservan para no alterar su aspecto.
- **Fuente:** Inter (`var(--font-sans)`), la de la plataforma.
- **Sin dependencias nuevas.** El repositorio no tiene framer-motion, así que las animaciones se hacen con CSS (transiciones y `@keyframes`).
- **Escritorio primero**, a partir de 1280 px. En celular basta con que todo funcione sin desplazamiento horizontal desde 360 px (RNF-05). El pulido para celular queda para después.
- **Textos:** en minúscula inicial (sentence case), sin etiquetas en mayúsculas sostenidas ni flechas escritas como texto (`▸`, `→`). Para la dirección se usan íconos de lucide (`ArrowRight`, `ChevronRight`).
- Respeta `prefers-reduced-motion` en todas las animaciones (sección 12).

---

## 3. Qué cambia

| Hoy | Después |
| --- | --- |
| `OccupationExplorationShell` con `AppShell` (sidebar fijo y barra con breadcrumb) | `StudentShell` sin sidebar: el mapa a pantalla completa y los módulos con su propia cabecera |
| Navegación en el sidebar | Accesos rápidos en el panel flotante del mapa |
| Mapa con discos 3D, progreso arriba a la derecha y sin zoom | Puntos circulares con estados, trazado por tramos, letreros de bloque, zoom y progreso dentro del panel |
| Selector Camino/Ciudad arriba a la izquierda | Selector arriba al centro |
| Guía como burbuja abajo a la derecha que abre un modal | Botón de ayuda arriba a la derecha y diálogos de Lumi por pasos, con fondo desenfocado |
| Drawer de punto (`MapPointDrawer`) | Drawer propio del estudiante, con el diseño del prototipo anterior |
| `JourneyPlayer` en tarjeta clara | `StudentActivityPlayer` a pantalla completa, con ambientes y diálogos de novela visual |
| Check-in solo dentro del diario | También al ingresar, si no hay check-in del día, y como tarjeta en el panel |
| Sin preguntas de seguimiento | Lumi formula preguntas de seguimiento en los registros, que el estudiante puede responder u omitir |
| Logros visibles solo en el pasaporte | Aviso aparte al obtener un logro y lista de novedades en la campana |

---

## 4. Arquitectura

### 4.1. Carpeta y archivos

```
src/features/student-experience/
  StudentShell.tsx                 Shell de /student: decide entre mapa y módulo, y gestiona overlays globales
  student-experience.css           Estilos inmersivos, todos con el prefijo .sx-
  ui-state.ts                      Estado de presentación (ov.student-ui.v1)
  characters.ts                    Emoji y nombre de cada personaje
  guide-texts.ts                   Textos de Lumi por vista
  views.ts                         Tipo StudentView y getStudentView(pathname)
  map/
    CaminoScreen.tsx               Zona Camino
    CiudadScreen.tsx               Zona Ciudad
    MapScreenLayout.tsx            Composición común: barra, lienzo, panel, controles, drawer
    MapCanvas.tsx                  Lienzo con arrastre y zoom
    MapNode.tsx                    Punto de actividad
    MapPath.tsx                    Trazado del camino
    BlockSign.tsx                  Letrero de bloque
    ZoneSwitch.tsx                 Selector Camino/Ciudad
    MapControls.tsx                Novedades, ayuda y sonido
    ZoomControls.tsx               Alejar, nivel, acercar y centrar
    AdventurePanel.tsx             Panel lateral plegable
    ActivityDrawer.tsx             Drawer de actividad
    ZoneTransition.tsx             Transición entre zonas
    CityLocked.tsx                 Ciudad todavía cerrada
    mapPoints.ts                   Cálculo de puntos, estados y progreso
  overlays/
    useTypewriter.ts               Efecto de escritura
    LumiOverlay.tsx                Diálogo por pasos sobre fondo desenfocado
    CheckInDialog.tsx              Check-in de seguridad
    checkIn.ts                     Lectura y escritura del check-in (copia de la lógica del diario)
    NoveltiesMenu.tsx              Lista de novedades (campana)
    BadgeToast.tsx                 Aviso de logro
    unlocks.ts                     Cálculo de novedades y logros
    OverlayQueue.tsx               Cola para que no se apilen overlays
  player/
    StudentActivityPlayer.tsx      Reproductor (lógica copiada de JourneyPlayer)
    PlayerTopBar.tsx               Barra superior con salida
    PlayerAmbient.tsx              Fondo con ambiente
    DialogueBox.tsx                Caja de diálogo de novela visual
    InlineDialogue.tsx             Comentario breve de un personaje dentro de un panel
    CharacterAvatar.tsx            Avatar circular con emoji
    ContentBlocks.tsx              Bloques de diapositiva (copia restilizada)
    ResourceSheet.tsx              Panel lateral de fichas y recursos
    FinishScreen.tsx               Cierre de la actividad
    nodes/
      ChoiceNode.tsx               eleccion
      SlideNode.tsx                diapositiva
      QuestionNode.tsx             pregunta (copia de Question)
      ItemNode.tsx                 item (narrativo y directo)
      SubmissionNode.tsx           consigna (copia de SubmissionForm, sin archivo)
      MatrixNode.tsx               plantilla matriz (copia de JourneyMatrix, sin alternativa)
      ResultNode.tsx               resultado (copia de ResultReveal)
    followup/
      FollowUp.tsx                 Interfaz de las preguntas de seguimiento
      followUpService.ts           Evaluador (simulado en el prototipo)
      followUpStore.ts             Persistencia (ov.student-followups.v1)
      responseCondenser.ts         Arma la respuesta única (plantilla ahora, IA después)
  modules/
    StudentModuleLayout.tsx        Cabecera y contenedor de los módulos
    StudentUserMenu.tsx            Menú del avatar
    StudentFamilyConversationsView.tsx   Copia de FamilyConversationsView solo para el estudiante
```

Los archivos que dejan de usarse en las rutas del estudiante (`OccupationExplorationShell.tsx`, `FieldMissionsView.tsx`, `CityMapView.tsx`, `missions/JourneyPlayer.tsx`) **no se borran ni se modifican**. Algunas pruebas leen su código fuente, y no sabemos si otros módulos los importan.

### 4.2. Rutas

Las URL no cambian. En `AppRoutes.tsx`, dentro de `<Route path="/student">`, reemplaza `OccupationExplorationShell` por `StudentShell`, y las páginas de mapa por las pantallas nuevas:

```tsx
<Route element={<OccupationExplorationModule />} path="/student">
  <Route element={<StudentShell />}>
    <Route element={<Navigate replace to={appPaths.student.missions} />} index />
    <Route element={<CiudadScreen />} path="exploration" />
    <Route element={<CaminoScreen />} path="missions" />
    <Route element={<ResearchMissionsView />} path="research" />
    <Route element={<JournalView />} path="journal" />
    <Route element={<JournalSignalsView />} path="journal/signal" />
    <Route element={<CommunityView />} path="community" />
    <Route element={<AdventureResourcesView />} path="resources" />
    <Route element={<Navigate replace to={appPaths.student.passport} />} path="achievements" />
    <Route element={<StudentFamilyConversationsView />} path="conversations" />
    {/* Catálogo, testimonios y perfil: igual que hoy */}
  </Route>
  {/* Rutas de casos: igual que hoy, fuera del shell */}
</Route>
```

`OccupationExplorationModule` (que provee el contexto y registra las visitas) se conserva como padre.

### 4.3. Responsabilidades de StudentShell

1. Obtiene la vista actual con `getStudentView(location.pathname)`, la misma lógica de `getViewFromPath` del shell actual, copiada en `views.ts`.
2. Si la vista es `missions` o `central`, renderiza el `Outlet` sin envoltorio: cada pantalla de mapa compone su propio layout. Si no, lo envuelve en `StudentModuleLayout`.
3. Pasa al `Outlet` el contexto de `useOccupationExplorationContext()`, como hoy.
4. Muestra el aviso de error de almacenamiento con el mismo texto actual cuando `useAdventureStorageError()` es verdadero.
5. Monta `OverlayQueue`, que muestra un overlay a la vez en este orden de prioridad: llegada a la ciudad, presentación de la sección, check-in del día y avisos de logro. Mientras haya `?actividad=` en la URL, el reproductor está abierto y la cola no muestra nada. Retoma al cerrarlo.
6. Guarda en `ui-state` la última zona visitada (`lastMap`), que usa el botón "Volver al mapa".
7. Sincroniza las misiones completadas (sección 2.2). Un efecto observa `journey.progress` y `adventure.completedMissionIds`. Recorre `fieldMissions` en orden y, para cada misión cuya actividad v2 (según `specActivityByMission`) está `completada` y cuyo id no está en `completedMissionIds`, llama a `completeMission(mission.id)`. El recorrido en orden respeta la validación de secuencia que ya hace `completeMission` cuando `prototypeAllUnlocked` es falso. Como el efecto también corre al montar, corrige los datos de quienes ya completaron misiones antes de este cambio. La lógica para decidir qué misiones sincronizar vive en una función pura, `getMissionsToSync(adventure, journey)`, en `map/mapPoints.ts`.

### 4.4. Estado de presentación (`ui-state.ts`)

```ts
type StudentUiState = {
  version: 1
  panelCollapsed: boolean            // panel lateral plegado
  lastMap: 'missions' | 'central'    // última zona visitada
  soundOn: boolean                   // preferencia; todavía no hay sonidos
  introsSeen: Partial<Record<StudentView, true>>   // presentaciones de sección ya vistas
  cityArrivalSeen: boolean           // ya se mostró la llegada a la ciudad
  checkInPromptDismissedOn?: string  // fecha local (YYYY-MM-DD) en que eligió "Ahora no"
  seenUnlockIds: string[]            // novedades ya vistas en la campana
  announcedBadgeCodes: string[]      // logros ya anunciados con el aviso
  initialized: boolean               // para sembrar seenUnlockIds y announcedBadgeCodes la primera vez
}
```

Implementa el store con el mismo patrón de `missions/store.ts` (`useSyncExternalStore`, `try/catch` al escribir y escucha del evento `storage`). Si los datos guardados no son válidos, vuelve al estado inicial. Un fallo al escribir no muestra error: la interfaz sigue funcionando con el estado en memoria.

El estado inicial es `panelCollapsed: false`, `lastMap: 'missions'`, `soundOn: true` e `initialized: false`. La primera vez que se monta el shell, `seenUnlockIds` y `announcedBadgeCodes` se siembran con todo lo que ya está desbloqueado, para que los datos de demostración no generen avisos en cadena.

### 4.5. Personajes (`characters.ts`)

Mientras no haya ilustraciones, cada personaje se representa con un emoji dentro de un círculo. Los nombres salen de `catalog.personajes`, salvo `companero`, que siempre se llama Lumi (igual que hoy en `JourneyContent.Character`).

```ts
const characterEmoji: Record<string, string> = {
  companero: '🌟', // Lumi
  mara: '👩🏽‍🌾',
  elena: '👩🏽',
  aurelio: '👴🏽',
}
const fallbackEmoji = '🙂'
```

`CharacterAvatar` recibe `id`, `size` (`sm` 40 px, `md` 72 px, `lg` 112 px) y `expression`, que por ahora se ignora. Expone una sola función `getCharacterVisual(id)`, para que más adelante se pueda cambiar a `avatarUrl` sin tocar el resto del código.

Estilo del círculo: fondo `color-mix(in srgb, var(--sx-lumi) 25%, transparent)`, `backdrop-filter: blur(8px)`, anillo de 3 px `color-mix(in srgb, var(--sx-lumi) 60%, transparent)` y sombra grande. El nombre va debajo, en 12 px, peso 700 y color `var(--sx-lumi)`.

### 4.6. Tokens visuales (`student-experience.css`)

Todo el CSS nuevo vive bajo `.sx-root`, que se aplica en `StudentShell`, para que no afecte a otras partes de la plataforma.

```css
.sx-root {
  --sx-lumi: var(--warning);           /* luz de Lumi y acción recomendada */
  --sx-lumi-soft: var(--warning-soft);
  --sx-zone-camino: var(--primary);
  --sx-zone-ciudad: var(--accent);
  --sx-glass: rgb(255 255 255 / 0.86);
  --sx-glass-border: color-mix(in srgb, var(--border) 65%, transparent);
  --sx-glass-dark: color-mix(in srgb, var(--foreground) 64%, transparent);
  --sx-glass-dark-border: rgb(255 255 255 / 0.14);
  --sx-night: color-mix(in srgb, var(--foreground) 88%, black);
  /* Valores que ya usa la interfaz actual del estudiante; se conservan para no cambiar su aspecto */
  --sx-path: #fff8dc;              /* trazo del camino, hoy en AdventureMap.tsx */
  --sx-module-bg: #f6f5eb;         /* fondo de los módulos con guía, hoy en OccupationExplorationShell.tsx */
}
.sx-glass {
  background: var(--sx-glass);
  border: 1px solid var(--sx-glass-border);
  backdrop-filter: blur(16px);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}
.sx-glass-dark {
  background: var(--sx-glass-dark);
  border: 1px solid var(--sx-glass-dark-border);
  backdrop-filter: blur(16px);
  border-radius: var(--radius-xl);
  color: rgb(255 255 255 / 0.92);
}
```

Reglas de color:

- **Acciones principales:** `--primary`.
- **Lo que Lumi recomienda** (siguiente paso, punto resaltado, barras de progreso del reproductor): `--sx-lumi`.
- **Puntos del camino:** `--sx-zone-camino`. **Puntos de la ciudad:** `--sx-zone-ciudad`.
- **Retroalimentación:** `--success` y `--success-soft` para lo correcto o completado, y `--destructive` mezclado al 25 % para lo incorrecto.

---

## 5. Pantalla del mapa (Camino y Ciudad)

### 5.1. Composición

El mapa ocupa todo el espacio bajo la barra superior. El panel se superpone al mapa, que sigue ocupando el ancho completo por debajo.

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ◉ Orientación / Explora                                       (AL) Alex ▾ │  barra, 48 px
├──────────────────┬────────────────────────────────────────────────────────┤
│ Panel, 288 px  ◀ │              [ Camino | Ciudad ]           [🔔][?][🔊] │
│ Alex             │                                                        │
│ Niv. 1 · …       │      (Tramo 1)                                         │
│ ◯ 38 %           │         ●━━━━━━●- - - - ◉ - - - - ○ - - - ○              │
│ Siguiente paso   │                                                        │
│ Tu señal de hoy  │                imagen del mapa + puntos                │
│ Accesos rápidos  │                                                        │
│ Disponibles      │ [Arrastra el mapa para explorar]          [− ═══ + ⌖] │
└──────────────────┴────────────────────────────────────────────────────────┘
```

`CaminoScreen` y `CiudadScreen` calculan sus puntos con `mapPoints.ts` y renderizan `MapScreenLayout`. Cuando la URL tiene `?actividad=<id>` (y `revision=1` o `modo=directa`, si corresponde), renderizan `StudentActivityPlayer` en lugar del mapa, con las mismas condiciones que hoy usan `FieldMissionsView` y `CityMapView`.

Cada pantalla incluye un `<h1 className="sr-only">` con el mismo texto actual: "Aventura · Camino" y "Aventura · Ciudad".

### 5.2. Barra superior

Altura de 48 px, fondo `bg-card/95` con `backdrop-blur` y borde inferior.

- **Izquierda:** círculo de 32 px en `--primary` con el ícono `Compass` en blanco y, al lado, dos líneas: "Orientación" en 10 px y `--muted-foreground`, y "Explora" en 14 px y peso 700.
- **Derecha:** `StudentUserMenu`. Muestra un avatar de 32 px con las iniciales "AL", el nombre "Alex" y debajo `Niv. {n} · {label}` según `getTravelerLevel(adventure)`. Al tocarlo se abre un `DropdownMenu` con "Mi perfil" (`appPaths.student.profile`) y "Cerrar sesión" (`appPaths.home`).

### 5.3. Lienzo (`MapCanvas`)

Parte de una copia de `AdventureMap.tsx` y conserva:

- El sistema de coordenadas: `logicalCanvasSize` de 1080 × 660, `canvasSize` de 2700 × 1519 y la función `mapPosition`.
- El arrastre con puntero, `clampTransform` y el centrado inicial con `ResizeObserver`.
- La imagen de fondo por zona (`/images/adventure/journey-map.jpeg` y `/images/adventure/city-map.jpeg`), con opacidad de 0.85 y una viñeta suave en lugar del degradado actual.

Agrega:

- **Zoom** entre `minScale` (0.55) y 1.4. Los botones multiplican o dividen la escala por 1.15 alrededor del centro visible. La rueda del ratón hace zoom hacia el cursor (factor 0.9 o 1.1), con un listener `wheel` registrado con `{ passive: false }` sobre el viewport. El arrastre y el zoom siempre pasan por `clampTransform`.
- **Centro visible:** al centrar o enfocar un punto, el área visible excluye el panel si está abierto (288 px más 16 px de margen).
- **`focusPoint(id)`:** desplaza el lienzo con una transición de 400 ms (sin transición si se reduce el movimiento) hasta que el punto quede en el centro del área visible.
- La pista "Arrastra el mapa para explorar" abajo a la izquierda, desplazada a la derecha del panel cuando está abierto.

### 5.4. Puntos (`MapNode`)

Cada punto es un `<button>` posicionado en coordenadas del lienzo. Conserva el `aria-label` actual: `${title}${locked ? ', bloqueado' : completed ? ', completado' : ''}`.

Los tamaños están en píxeles del lienzo, que se escala entre 0.55 y 1.4:

- Círculo de 104 px en el camino y de 92 px en la ciudad, con un ícono de lucide de 40 px.
- Debajo, una etiqueta en `.sx-glass` de 200 px de ancho máximo, con el título en 20 px y peso 700, repartido en dos líneas equilibradas (puedes copiar `splitTitleLines` de journey-island), y el subtítulo en 15 px y `--muted-foreground`.

| Estado | Relleno | Anillo | Ícono | Insignia arriba a la derecha |
| --- | --- | --- | --- | --- |
| Disponible | `--card` | 4 px del color de la zona | Color de la zona | — |
| Completado | `--success-soft` | 4 px `--success` | `--success` | Check blanco sobre `--success` |
| Bloqueado | `--muted` | 2 px `--border` | `--muted-foreground` al 40 % | Candado blanco sobre `--muted-foreground` |
| Recomendado | Como disponible | Anillo exterior de 3 px `--sx-lumi`, separado 10 px | Igual | — |
| Seleccionado | Igual | Anillo exterior de 3 px `--ring` | Igual | — |

- El punto **recomendado** es el siguiente paso del panel (sección 5.8). Su anillo exterior pulsa con una opacidad entre 0.25 y 0.6 cada 2.2 s, y queda fijo al 0.5 si se reduce el movimiento.
- El ícono del tipo de actividad se mantiene también en los completados, a diferencia de hoy, que lo reemplaza por el check.
- Al pasar el cursor, el punto se eleva 4 px. Al tocarlo, se selecciona y se abre el drawer. Los puntos bloqueados también abren el drawer, que explica el requisito.

### 5.5. Trazado (`MapPath`) y letreros (`BlockSign`)

El trazado solo existe en el camino. Se dibuja en SVG por segmentos, entre puntos consecutivos de la lista: las misiones y, al final, la llave de la ciudad.

| Segmento | Trazo |
| --- | --- |
| Completado → completado | Sólido, 8 px, `--success`, opacidad 0.85 |
| Completado → disponible (frontera) | Discontinuo `18 22`, 8 px, `--sx-lumi` |
| Cualquier otro | Discontinuo `18 22`, 7 px, `--sx-path` (el color actual), opacidad 0.75, con la sombra actual |

**Letreros de bloque.** Cada misión del camino tiene un `bloque` (`activityById(specId)?.bloque`). Se dibuja un letrero junto a la primera misión de cada bloque, 90 px a la izquierda y 110 px arriba de su centro, en coordenadas del lienzo.

- El letrero muestra el ícono `Signpost` y el texto `Tramo {n}`, sobre fondo `--sx-lumi-soft` con borde de 2 px `--sx-lumi` y texto `--accent-foreground`.
- Si todas las misiones del bloque están completadas, el ícono cambia a `Check`.
- En los datos actuales, todas las misiones pertenecen al bloque 1, así que se verá un solo letrero.

### 5.6. Selector de zona (`ZoneSwitch`)

Se ubica arriba al centro del mapa, en `.sx-glass` con bordes redondeados. Tiene dos botones con ícono y texto: `MapPinned` "Camino" y `Building2` "Ciudad".

- Conserva `aria-label="Cambiar zona de la aventura"` en el `<nav>` y `aria-current="page"` en la zona activa.
- La zona activa se marca con fondo `color-mix(in srgb, <color de la zona> 14%, white)` y texto del color de la zona.
- Navega con `appPaths.student.missions` y `appPaths.student.exploration`, como `AdventureModeSwitch`.
- **Ciudad cerrada** (`!canAccessCity(adventure)`): el botón muestra `LockKeyhole`, lleva `aria-disabled` y un `Tooltip` con el texto "Completa el camino para abrir la ciudad". Al tocarlo, se enfoca y abre el punto "La llave de la ciudad" del camino. Con `prototypeAllUnlocked = true`, este estado no aparece en el prototipo.

### 5.7. Controles del mapa

**Arriba a la derecha**, tres botones de 40 px en `.sx-glass`, separados 8 px:

- **Novedades:** ícono `Bell`, `aria-label="Novedades"` y un contador de novedades sin ver en `--destructive` (sección 10). Abre `NoveltiesMenu`.
- **Ayuda:** ícono `CircleHelp` y `aria-label="Abrir guía"`. Abre `LumiOverlay` con el recorrido de la zona (sección 7.4).
- **Sonido:** ícono `Volume2` o `VolumeX` según `ui.soundOn`, con `aria-pressed` y `aria-label` "Silenciar" o "Activar sonido". Por ahora no reproduce nada.

**Abajo a la derecha**, `ZoomControls` en `.sx-glass`: botón `Minus` (`aria-label="Alejar mapa"`), un `<input type="range">` de 96 px con `accent-color: var(--primary)` y la escala normalizada entre 0 y 100, botón `Plus` (`aria-label="Acercar mapa"`), un separador vertical y botón `Locate` (`aria-label="Centrar mapa"`).

### 5.8. Panel lateral (`AdventurePanel`)

Mide 288 px de ancho y ocupa todo el alto bajo la barra. Usa `.sx-glass`, sin borde izquierdo y con las esquinas derechas redondeadas. Tiene desplazamiento interno.

- **Plegado:** una pestaña de 24 × 48 px, centrada verticalmente en su borde derecho, con `ChevronLeft` o `ChevronRight` y `aria-label` "Plegar panel" o "Desplegar panel". La animación es `transform: translateX` en 300 ms, con `cubic-bezier(0.32, 0.72, 0, 1)`. El estado se guarda en `ui.panelCollapsed`.
- Las secciones se separan con un borde superior de 1 px `--border` y 12 px de espacio.

**1. Encabezado.** Avatar de 40 px con "AL" sobre `--primary-soft` y anillo `--primary`. A su lado, el saludo "¡Qué bueno verte!" en 12 px y `--muted-foreground`, y debajo "Alex" en 14 px y peso 700. En otra línea, `Niv. {n} · {label}`.

**2. Progreso.** Anillo de 96 px (puedes copiar `CircularMapProgress` y escalarlo) con el porcentaje al centro y la etiqueta debajo:

- En el camino, "Nivel de recorrido", con el mismo cálculo actual: misiones completadas sobre `fieldMissions.length`.
- En la ciudad, "Satisfacción de las personas", con el mismo cálculo de `CityMapView`.
- Las pruebas buscan estas dos etiquetas.

**3. Siguiente paso.** Ícono `Target` en un círculo `--sx-lumi-soft`, el título "Siguiente paso", el nombre del punto recomendado con su subtítulo y el botón "Ver misión", que llama a `focusPoint(id)` y abre el drawer.

- **Punto recomendado en el camino:** la primera misión, en orden, con estado `available`. Si todas están completadas, la llave de la ciudad.
- **Punto recomendado en la ciudad:** el primer punto disponible, no completado y con acción habilitada.
- **Aviso tras varios días sin ingresar** (HU-012): toma `adventure.visits`, que guarda fechas `YYYY-MM-DD`, y busca la visita anterior más reciente distinta de hoy. Si pasaron 3 días o más, muestra arriba del punto un `InlineDialogue` de Lumi con el texto "¡Qué bueno verte de nuevo! Te espera {título del punto}.". Si la ciudad sigue cerrada, agrega "La ciudad sigue esperándote al final del camino.". El aviso nunca reprocha.

**4. Tu señal de hoy.** Ícono `Compass` y el título "Tu señal de hoy".

- Si ya hay check-in del día (sección 8), muestra su valor en 32 px y peso 700, seguido de "de 10", con los botones "Cambiar" (abre `CheckInDialog` con ese valor) y "Ver evolución" (`appPaths.student.signals`).
- Si no lo hay, muestra la pregunta "¿Qué tan seguro te sientes hoy de tu próximo paso?" y el botón "Registrar mi señal", que abre `CheckInDialog`. También incluye "Ver evolución".

**5. Accesos rápidos.** Usa los mismos íconos y textos del sidebar actual:

| Acceso | Ícono | Destino |
| --- | --- | --- |
| Mi diario | `BookOpen` | `appPaths.student.journal` |
| En familia | `HeartHandshake` | `appPaths.student.conversations`. Si `!canAccessFamilyConversations(adventure)`, muestra un candado y el texto secundario "Se abre al llegar a la ciudad" |
| Recursos y novedades | `Backpack` | `appPaths.student.resources` |
| Catálogo | `LibraryBig` | `Collapsible` con Profesiones, Carreras e Instituciones educativas |
| Héroes de la ciudad | `MessageSquareQuote` | `appPaths.student.testimonials` |
| Mi perfil | `FolderHeart` | `Collapsible` con Información general y Mi decisión |

No agregues un acceso "Mi pasaporte": el pasaporte vive dentro del perfil, y una prueba lo verifica.

**6. Actividades disponibles.** Lista los puntos de la zona activa con estado `available`. Cada fila muestra el título, el subtítulo y un punto pulsante en el color de la zona, y al tocarla enfoca el punto y abre su drawer. Se pagina de 5 en 5, con botones `ChevronLeft` y `ChevronRight` y el texto `{desde}–{hasta} de {total}`. Si no hay ninguna, muestra "No hay actividades por realizar en esta zona por ahora.".

### 5.9. Cálculo de puntos (`mapPoints.ts`)

```ts
type StudentMapPoint = {
  id: string
  title: string
  subtitle: string
  x: number; y: number                       // coordenadas lógicas actuales
  icon: LucideIcon
  status: 'locked' | 'available' | 'completed'
  zone: 'camino' | 'ciudad'
  specActivityId?: string                     // id de la actividad v2
  bloque?: number
  actionEnabled: boolean                      // false en los casos todavía no jugables
}
```

- **`getCaminoPoints(adventure, journey)`:** copia de `FieldMissionsView` el mapa `specActivityByMission`, `missionComplete`, el cálculo de `status` (con `prototypeAllUnlocked`), `getActivityType`, `getMissionMeta` y `getMissionIcon` (devuelve el componente del ícono). Agrega al final el punto `city` ("La llave de la ciudad", x 950, y 480), con el subtítulo actual según `unlocked`.
- **`getCiudadPoints(adventure, journey)`:** copia de `CityMapView` los casos (`cityCases`, con los subtítulos "La comunidad te agradece" o "Un llamado de auxilio"), la estación de investigación (x 980, y 140) y el molino (`mara-test`, x 875, y 530, con el subtítulo según `testCompleted`). `actionEnabled` es falso en los casos distintos de `forest-fire`.
- **`getZoneProgress(zone, adventure, journey)`:** devuelve `{ label, value }` con los cálculos de la sección 5.8.
- **`getRecommendedPoint(points)`:** aplica las reglas del siguiente paso.

Los subtítulos conservan exactamente el formato actual (por ejemplo, "Informativa · 4 min", "Test · 6 min" y "Test · Interacción 1 de 14"), porque las pruebas lo verifican.

### 5.10. Transición entre zonas y llegada a la ciudad

**Transición (`ZoneTransition`).** Al montar una pantalla de mapa cuyo `zone` es distinto de `ui.lastMap`, se muestra una capa fija a pantalla completa:

- El fondo es un degradado del color de la zona mezclado al 20 % con `--background`.
- Al centro, el avatar de Lumi en tamaño `lg`, el nombre del lugar en 28 px y peso 700 ("El camino" o "La ciudad") y un subtítulo en `--muted-foreground` ("Tu ruta paso a paso" o "Tú eliges el orden").
- Aparece en 200 ms, se mantiene 500 ms y desaparece en 300 ms. Después se actualiza `ui.lastMap`.
- Si se reduce el movimiento, se omite.

**Llegada a la ciudad (V2.2).** Si `isCityUnlocked(adventure)` es verdadero (la condición real, no la del modo de revisión) y `ui.cityArrivalSeen` es falso, `OverlayQueue` muestra un `LumiOverlay` con estos pasos:

1. "¡Lo lograste! Las puertas de la ciudad se abrieron para ti."
2. "Aquí no hay un orden fijo. Puedes atender los llamados de sus habitantes, investigar una carrera de cerca o visitar el molino."
3. "Y desde ahora también puedes conversar con tu familia en «En familia»."

El último botón dice "Entrar a la ciudad", navega a `appPaths.student.exploration` y marca `cityArrivalSeen`.

### 5.11. Ciudad cerrada (`CityLocked`)

Si `!canAccessCity(adventure)`, `CiudadScreen` muestra la imagen de la ciudad con `filter: blur(6px) saturate(0.6)` y una capa de bruma de `--background` al 45 %. El panel sigue visible.

Al centro va una tarjeta `.sx-glass` de 560 px como máximo, con el contenido de `CityGate` en minúscula inicial: el ícono `KeyRound`, la línea "Capítulo 2 · La ciudad", el título "Una llave, mil posibilidades", el texto actual, la barra de progreso y el botón "Continuar mi recorrido".

---

## 6. Drawer de actividad (`ActivityDrawer`)

Parte de una copia de `MapPointDrawer`: el `Drawer` de `components/ui/drawer` con `direction="right"`, `DrawerClose asChild`, `aria-label="Cerrar ficha"` y `overflow-x-hidden`. Toma el diseño del drawer del prototipo anterior:

- Ancho de 400 px en escritorio y `calc(100vw - 1rem)` en celular, a toda la altura, con las esquinas izquierdas redondeadas y fondo `--sx-glass`. El overlay del drawer es `--foreground` al 10 %.
- **Cabecera de 176 px.** En los casos, la imagen actual con un degradado inferior. En los demás puntos, un degradado de 135° entre `color-mix(<color de la zona> 15%, white)` y `--sx-lumi-soft`, con el ícono del punto de 56 px dentro de un círculo blanco de 96 px con anillo del color de la zona. Abajo a la izquierda, una etiqueta `.sx-glass` con la región actual (por ejemplo, "El campamento", "Llamado de la ciudad" o "Meta del recorrido"). Arriba a la derecha, el botón de cierre de 32 px.
- **Cuerpo:** una fila con la insignia de estado y la meta (ícono `Clock` y la duración o el tipo), el título en 22 px y peso 700, la descripción en 14 px con interlineado de 1.7 y la línea de tipo con el ícono `Sparkles` en `--sx-lumi`.
- Si el punto está bloqueado, una caja `--muted` con `LockKeyhole` y el texto actual `Requisito: completa la actividad “{título}”.`.
- Debajo, la `JournalEntryCard` actual, en los mismos casos en que hoy se muestra.
- **Pie:** el botón principal a todo el ancho, en tamaño `lg`.

Insignias de estado: "Disponible" (fondo del color de la zona al 15 % y texto del color), "En progreso" (`--sx-lumi-soft` y `--accent-foreground`), "Completada" (`--success-soft` y `--success`) y "Bloqueada" (`--muted` y `--muted-foreground`). El estado "En progreso" corresponde a `journey.progress[specId]?.estado === 'en_curso'`.

Textos del botón principal, iguales a los actuales salvo "Continuar actividad", que es nuevo:

| Punto | Condición | Botón | Acción |
| --- | --- | --- | --- |
| Misión del camino | Bloqueada | "Actividad bloqueada" (deshabilitado) | — |
| Misión del camino | En progreso | "Continuar actividad" | `?actividad={specId}` |
| Misión del camino | Disponible | "Iniciar actividad" | `?actividad={specId}` |
| Misión del camino | Completada e informativa | "Volver a realizar esta misión" | `?actividad={specId}&revision=1` |
| Misión del camino | Completada, de registro o test | "Ver o modificar mis respuestas" | `?actividad={specId}&revision=1` |
| La llave de la ciudad | — | "Ir a la ciudad" | `appPaths.student.exploration` |
| Estación de investigación | — | "Iniciar" | `appPaths.student.research` |
| Molino | No completado o completado | "Iniciar test" o "Ver resumen" | `?actividad=act-tip-01` |
| Caso | — | "Iniciar" (deshabilitado si no es jugable) | `appPaths.student.case(id)` |

Cada botón lleva el ícono `Play` antes del texto. Antes de navegar, se cierra el drawer.

---

## 7. Lumi: diálogos y ayudas

### 7.1. Efecto de escritura (`useTypewriter`)

```ts
function useTypewriter(text: string, options?: { charsPerTick?: number; tickMs?: number; enabled?: boolean }):
  { visible: string; done: boolean; complete: () => void }
```

Avanza 2 caracteres cada 24 ms, igual que el `GuideDialogue` actual. Con `prefers-reduced-motion: reduce`, o con `enabled: false`, devuelve el texto completo de inmediato. El texto se reinicia cuando cambia `text`.

**Regla para todo texto que se escribe:** el texto visible lleva `aria-hidden="true"` y, al lado, va un `<span className="sr-only">{text}</span>` con el texto completo. Así funciona con lectores de pantalla y con el renderizado estático de las pruebas, que no ejecuta los temporizadores.

### 7.2. `LumiOverlay`

```ts
type LumiOverlayProps = {
  open: boolean
  steps: string[]
  onClose: () => void
  finalLabel?: string        // por defecto "Entendido"
  onFinish?: () => void      // se llama al pulsar el botón del último paso
}
```

- Capa fija `inset-0 z-50` con fondo `color-mix(in srgb, var(--foreground) 30%, transparent)` y `backdrop-filter: blur(6px)`.
- Abajo y al centro, a 48 px del borde, una caja de 576 px como máximo, en `.sx-glass` con borde de 2 px `color-mix(in srgb, var(--primary) 30%, transparent)` y 24 px de relleno.
- El avatar de Lumi, en tamaño `lg`, va encima de la esquina superior izquierda de la caja, montado 24 px sobre ella, con el nombre debajo.
- Arriba de la caja, los indicadores de paso: barras de 4 px de alto, en `--primary` hasta el paso actual y en `--muted` después.
- El texto del paso se escribe con `useTypewriter`, en 15 px con interlineado de 1.7 y un alto mínimo de 72 px.
- **Navegación:** "Anterior" a la izquierda (fantasma, deshabilitado en el primer paso) y, a la derecha, el botón principal. Mientras se escribe, ese botón dice "Mostrar todo" y completa el texto. Después dice "Siguiente" con `ChevronRight`, o `finalLabel` en el último paso. Tocar la caja mientras se escribe también completa el texto.
- **Cierre:** botón `X` arriba a la derecha (`aria-label="Cerrar guía"`), tecla Escape o clic en el fondo. Se cierra con una sola acción (RNF-06).
- **Accesibilidad:** `role="dialog"`, `aria-modal="true"` y `aria-label="Orientación de Lumi"`. Al abrir, el foco va al botón principal; al cerrar, vuelve al elemento que lo abrió.
- Entra con un desvanecimiento de 200 ms y la caja sube 16 px.
- **Solo se abre desde un efecto o una acción del usuario**, nunca en el primer render. Así el renderizado estático no incluye `role="dialog"`.

### 7.3. Cuándo se abre

1. **Ayuda (V1.5):** con el botón "Abrir guía" del mapa o de la cabecera de un módulo. Muestra los pasos de la vista actual.
2. **Presentación de una sección (V1.4):** la primera vez que el estudiante entra a una vista, si `ui.introsSeen[view]` no es verdadero, `OverlayQueue` abre esos mismos pasos. Al cerrarse, se marca como vista. En los mapas, la presentación es el recorrido de la zona.
3. **Llegada a la ciudad:** sección 5.10.

### 7.4. Textos (`guide-texts.ts`)

```ts
const guideSteps: Record<StudentView, string[]>
```

Las vistas de módulo usan un solo paso, con el texto que hoy tienen:

- Los textos de `getGuideText` de `OccupationExplorationShell` se copian sin cambios.
- `research` usa el texto del `GuideDialogue` de `ResearchMissionsView`.
- `conversations` usa el texto de la lista de `FamilyConversationsView`. El texto del detalle se muestra en la vista copiada (sección 11.2).

Los mapas usan estos recorridos nuevos:

`missions`:

1. "¡Hola! Soy Lumi. Yo también llegué a este mundo sin saber muy bien hacia dónde ir. Dicen que este camino despeja las dudas de quienes lo recorren."
2. "Cada punto del mapa es una misión. La que brilla es la que te recomiendo ahora. Las que tienen candado se abrirán a medida que avances."
3. "A la izquierda está tu panel: tu siguiente paso, cómo te sientes hoy y los accesos a tu diario, tu familia y todo lo que vas reuniendo. Puedes plegarlo cuando quieras."
4. "Al final del camino está la ciudad, donde podrás elegir tus actividades y ayudar a sus habitantes. Arriba puedes cambiar entre el camino y la ciudad."
5. "Si en algún momento no sabes qué hacer, toca el botón de ayuda y vendré."

`central`:

1. "Bienvenido a la ciudad. Aquí tú decides el orden: cada llamado de sus habitantes es una oportunidad para descubrir cómo se complementan distintas profesiones."
2. "También puedes visitar la estación de investigación para conocer una carrera de cerca, o pasar por el molino a conversar con Mara."
3. "Cada vez que ayudas, la satisfacción de las personas crece. La ves en tu panel."

---

## 8. Check-in de seguridad al ingresar

**Lógica (`checkIn.ts`).** Copia de `DailyJournalCard` en `JournalView.tsx` la función `localDateKey`, la búsqueda del check-in de hoy (`localDateKey(createdAt) === hoy` y `linkedActivityId === 'daily-check-in'`) y la función `answer(value)`, que reemplaza el check-in del día si ya existe. Usa la escala actual de 1 a 10 y el tipo `ReadinessCheckIn`. Exporta `getTodayCheckIn(state)` y `saveTodayCheckIn(value)`.

**Cuándo aparece.** Al montar `StudentShell`, y al volver a la pestaña si cambió el día, se encola si:

- no hay check-in de hoy,
- `ui.checkInPromptDismissedOn` es distinto de hoy, y
- no hay un reproductor abierto.

**`CheckInDialog`.** Usa el `Dialog` de `components/ui`, con un ancho máximo de 480 px.

- Arriba va el avatar de Lumi en tamaño `md`. El título es "Registra tu señal de hoy" y la descripción, "¿Qué tan seguro te sientes de tu próximo paso? Puedes cambiar esta respuesta durante el día.", ambos tomados del diálogo actual.
- Para que el registro sea rápido, en lugar del slider hay una fila de 10 botones circulares de 40 px, del 1 al 10, con `aria-pressed`. El elegido se marca con fondo `--primary` y texto blanco. Debajo de los extremos van "1 · Nada seguro" y "10 · Muy seguro".
- Los botones son "Guardar señal" (principal, deshabilitado hasta elegir un valor) y "Ahora no" (fantasma). "Ahora no" guarda la fecha de hoy en `ui.checkInPromptDismissedOn`.
- Al pie va la línea actual: "Tu orientadora ve esta señal y su tendencia, nunca el texto de tu diario."
- Desde el panel, el mismo diálogo se abre con el valor actual preseleccionado.

---

## 9. Reproductor inmersivo (`StudentActivityPlayer`)

### 9.1. Qué se conserva

Recibe las mismas props que `JourneyPlayer` (`activity`, `direct`, `edit`, `onClose`, `onNext`) y copia de él, sin cambios, toda la lógica:

- `visibleNodes`, `nextPendingNode` y el estado inicial de `nodeId`.
- Los efectos que inician el progreso, desplazan la vista al cambiar de nodo y guardan las fichas de las diapositivas.
- `move`, `advance` e `itemResponse`.
- `existingItemAnswer`, `itemOptions`, `nextActivity` y `progress`.
- El manejo de `reactions`.

Conserva también lo que verifican las pruebas:

- La clase raíz `fixed inset-0 z-40`, más `sx-root sx-player location-{activity.id}`.
- `aria-label="Salir de la actividad"` en el botón de salida.
- El título de la actividad visible en la barra.
- Los textos "No hay respuestas correctas o incorrectas" en los ítems, "Entendido" en las diapositivas y, en la matriz, las etiquetas de las columnas y el contador `{n} de {total} entregas necesarias guardadas`.
- En modo directo, que no aparezcan los diálogos de Mara ni el texto "¿Qué le dirías?".

### 9.2. Ambiente (`PlayerAmbient`)

Tiene dos ambientes, que dependen de lo que se muestra:

| Ambiente | Cuándo |
| --- | --- |
| `night`: noche con luz cálida | `dialogo`, reacciones, `eleccion`, `item`, `pregunta`, `diapositiva` y `resultado` |
| `sunrise`: amanecer | `consigna`, matriz y pantalla de cierre |

Se implementa con dos capas absolutas superpuestas que cruzan su opacidad en 1200 ms, porque los degradados no se pueden animar directamente. Con movimiento reducido, el cambio es inmediato.

```css
.sx-ambient__night {
  background: radial-gradient(ellipse at 50% 45%,
    color-mix(in srgb, var(--sx-lumi) 35%, transparent) 0%,
    var(--sx-night) 55%,
    color-mix(in srgb, var(--foreground) 70%, black) 100%);
}
.sx-ambient__sunrise {
  background: radial-gradient(ellipse at 50% 32%,
    var(--sx-lumi-soft) 0%,
    color-mix(in srgb, var(--accent) 45%, white) 38%,
    color-mix(in srgb, var(--primary) 28%, white) 100%);
}
```

Más adelante habrá imágenes por momento. Deja `PlayerAmbient` preparado para recibir una prop `imageUrl` opcional, que se mostraría como capa con `background-size: cover` bajo un velo del ambiente, aunque por ahora no se use.

### 9.3. Barra superior y salida

`PlayerTopBar` mide 56 px de alto, con fondo `color-mix(in srgb, var(--foreground) 35%, transparent)`, `backdrop-filter: blur(12px)` y texto blanco.

- **Izquierda:** botón `X` (`aria-label="Salir de la actividad"`) y dos líneas: el contexto (`activity.ubicacion` o el tipo) en 12 px y blanco al 70 %, y el título (o "Actividad completada" en el cierre) en 14 px y peso 600, recortado si no cabe.
- **Centro izquierda:** "Paso {i+1} de {total}" en 12 px y blanco al 80 %, sobre una barra de 128 × 6 px con el fondo en blanco al 20 % y el relleno en `--sx-lumi`.
- **Derecha:** botón de sonido, el mismo de la sección 5.7. No hay puntos, campana ni avatar.

Al tocar `X` se abre un `Dialog` en `.sx-glass-dark` con el ícono `ShieldCheck` en `--success-soft`, el título "¿Quieres volver al mapa?" y la descripción "Tu avance ya está guardado. Podrás retomar la actividad desde este punto.". Los botones son "Seguir en la actividad" (contorno) y "Volver al mapa" (principal, llama a `onClose`). Son los textos actuales.

### 9.4. Caja de diálogo (`DialogueBox`)

```ts
type DialogueBoxProps = {
  speakerId: string
  text: string
  label?: string                // por ejemplo, "Para conocerte mejor:"
  hint?: string                 // texto auxiliar a la izquierda del pie
  continueLabel?: string        // por defecto "Continuar"
  onContinue?: () => void       // sin él, la caja no muestra botón
  typewriter?: boolean          // por defecto true
}
```

- Se ancla abajo, con 16 px de margen y 1024 px de ancho máximo, centrada.
- El avatar del hablante, en tamaño `lg`, sobresale 56 px por encima del borde superior y queda a 32 px del borde izquierdo, con el nombre debajo.
- La caja usa `.sx-glass-dark`, con bordes de 20 px, un alto mínimo de 148 px y relleno de 24 px arriba, 32 px a los lados y 16 px abajo.
- El texto tiene un relleno izquierdo de 144 px para no quedar bajo el avatar, en 16 px con interlineado de 1.7. Si hay `label`, va encima en 12 px, peso 600 y `--sx-lumi`.
- **Pie:** el `hint` a la izquierda, en 12 px y blanco al 60 %. A la derecha, el botón principal: "Mostrar todo" mientras se escribe y `continueLabel` con `ArrowRight` al terminar.
- Tocar la caja completa el texto. Con la tecla Enter, si el foco no está en un campo de texto, primero se completa el texto y después se continúa.

`InlineDialogue` es una versión compacta para usar dentro de paneles: avatar `sm`, nombre y texto en una burbuja, sin botón propio. Usa `.sx-glass-dark` sobre el ambiente nocturno y `.sx-glass` sobre el amanecer.

### 9.5. Presentación de cada nodo

Hay dos composiciones:

- **Escena:** la caja de diálogo abajo y, en el espacio de arriba, un panel central de 640 px como máximo, centrado verticalmente, con las opciones o la retroalimentación.
- **Tarjeta:** una tarjeta centrada con desplazamiento interno (`max-height: calc(100svh - 56px - 48px)` y la clase actual `case-scrollbar`).

| Nodo | Composición | Detalle |
| --- | --- | --- |
| `dialogo` | Escena, sin panel | `DialogueBox` con `hablanteId`, `texto`, el pie "Una conversación, un paso más." y `onContinue={advance}` |
| Reacción | Escena, sin panel | `DialogueBox` de la reacción, con el pie "Escucha, a tu ritmo." y `onContinue` que avanza a la siguiente reacción |
| `eleccion` | Escena | Panel `.sx-glass-dark` con el texto "Tu voz también cuenta" en 12 px y `--sx-lumi`, la pregunta "¿Qué le dirías?" en 22 px y las opciones como botones de ancho completo con `ArrowRight`. Al elegir, se ejecuta el mismo `move` que hoy. La caja muestra el texto completo del nodo anterior, sin efecto de escritura, si ese nodo fue un `dialogo`; si no, no se muestra |
| `item` (narrativo) | Escena | `DialogueBox` con el hablante, `label = etiqueta ?? 'Para conocerte mejor:'`, `text = item.texto` y sin `onContinue`. El panel muestra las opciones de `itemOptions`, siempre visibles para que se pueda responder sin esperar al texto, con la opción guardada marcada; debajo, la nota "No hay respuestas correctas o incorrectas. Elige lo que se parezca a ti." y, si ya hay respuesta, "Mantener mi respuesta y continuar" |
| `item` (directo) | Tarjeta `.sx-glass-dark`, 720 px | Sin personajes: etiqueta, texto del ítem, opciones y la misma nota |
| `pregunta` | Escena | `DialogueBox` con el hablante y `text = enunciado`, sin `onContinue`. El panel muestra las opciones como tarjetas en una cuadrícula de 2 columnas si hay más de dos y todas tienen menos de 60 caracteres, o en una columna si no. Ver "Pregunta" debajo |
| `diapositiva` | Tarjeta `.sx-glass-dark`, 896 px | Ver "Diapositiva" debajo |
| `consigna` (secuencial) | Tarjeta `.sx-glass` sobre el amanecer, 672 px | Ver "Consigna" debajo |
| Matriz | Tarjeta `.sx-glass`, 1152 px | Ver "Matriz" debajo |
| `resultado` | Tarjeta `.sx-glass-dark`, 720 px | Copia de `ResultReveal`, con `CharacterAvatar` de Elena en lugar de `Character` |
| Cierre | Tarjeta `.sx-glass`, 672 px | Sección 9.8 |

**Opciones** (en elección, ítem y pregunta): botones de 52 px de alto mínimo y bordes de 14 px, con fondo blanco al 8 % y borde blanco al 16 %. Al pasar el cursor, el fondo sube a blanco al 14 %. El seleccionado lleva un borde de 2 px `--sx-lumi` y fondo `--sx-lumi` al 18 %. El foco visible es un contorno de 3 px `--sx-lumi`. Los estados de pregunta (`is-correct`, `is-incorrect`, `is-revealed`) usan `--success` y `--destructive` mezclados al 25 %, con el marcador ✓ o ×.

**Pregunta.** Copia el componente `Question` completo, con el registro de intentos, `evaluateQuestion`, las pistas, la opción múltiple con el botón "Confirmar selección" y la prop `fresh`. Solo cambia el marcado:

- Tras responder, el panel de opciones se reemplaza por uno de retroalimentación: un panel `.sx-glass-dark` con borde superior de 4 px (`--success` si acertó, `--destructive` si no). Muestra la retroalimentación de las opciones elegidas y, si `feedback.canContinue`, la explicación en peso 500.
- Si hay `feedback.hint`, se muestra como `InlineDialogue` del hablante de la pista.
- **"Ver ficha"** (botón de contorno con `BookOpen`) aparece si la respuesta es incorrecta y la actividad tiene fichas relacionadas. Las fichas relacionadas son las de `recursoIds` de todas las diapositivas de la misma actividad que en `catalog.recursos` son de tipo `ficha`. Abre `ResourceSheet` con ellas, sin salir de la actividad.
- El botón principal es "Volver a intentarlo" o "Continuar el camino", con la misma lógica actual.

**Diapositiva.**

- **Encabezado:** a la izquierda, la línea "Una pista para tu camino" en 12 px, peso 600 y `--sx-lumi`. A la derecha, si hay `presentadorId`, el avatar del presentador en tamaño `sm` con su nombre.
- Título en 26 px y peso 700, y luego `ContentBlocks` (una copia de la versión de `JourneyContent`, con los estilos de abajo). Si hay `mediaUrl`, la imagen va con bordes de 12 px y ancho máximo del 100 %.
- **Pie fijo dentro de la tarjeta:** a la izquierda, "Profundizar" (contorno claro, abre `ResourceSheet` con los `recursoIds` del nodo) o, si no hay recursos, el texto "Detente el tiempo que necesites.". A la derecha, "Entendido" (principal, llama a `advance`).
- **Bloques sobre fondo oscuro:**
  - `parrafo`: blanco al 88 %.
  - `destacado`: fondo con el color mezclado al 22 % y borde izquierdo de 3 px del color: `--primary` en `dato`, `--sx-lumi` en `idea_clave` y `--destructive` en `alerta`.
  - `comparacion`: dos columnas, la izquierda en blanco al 6 % y la derecha en `--primary` al 22 %.
  - `pasos`: números en círculos de 28 px con `--sx-lumi`.
  - `reflexion`: cita en cursiva con borde izquierdo `--sx-lumi`.
  - `fuente`: 12 px y blanco al 60 %, con enlace subrayado.

**Consigna.** Copia `SubmissionForm`, conservando su validación, los borradores (`drafts`), las versiones, el aviso de visibilidad, los mensajes de error y los textos de los botones. Los cambios son estos:

- No se renderiza el tipo `archivo`. Si un nodo `consigna` de tipo `archivo` aparece fuera de una matriz y es opcional, se omite con `advance()`. Si es obligatorio, se muestra el texto "Esta entrega no está disponible en la plataforma." sin bloquear la salida. En los datos actuales esto no ocurre.
- Si hay `hablanteId`, el avatar del hablante en tamaño `sm` va arriba con su nombre.
- La premisa va en 20 px y peso 700, y la ayuda en 14 px y `--muted-foreground`. El campo de texto mide al menos 220 px de alto, con fondo `--card`, borde `--input` y foco `--ring`.
- El tipo `opcion` se muestra como tarjetas seleccionables, con radio o casilla según `multiple`.
- Se mantiene "Dejar para después" cuando la consigna no es obligatoria.
- Tras guardar, se evalúa si corresponde una pregunta de seguimiento (sección 9.7) antes de llamar a `advance`.

**Matriz.** Copia `JourneyMatrix` con sus pestañas, columnas, celdas, consignas fuera de la matriz, el contador y el `Dialog` de edición de celda. Este último usa el formulario de `SubmissionNode`.

- Se elimina todo lo relacionado con `alternativa`: el botón, el texto de archivo guardado, las descargas y el cálculo de `replaced`. Así, las obligatorias son todas las consignas con `obligatoria: true`, que en los datos actuales son 7.
- El título interno pasa a minúscula inicial: "Tu futuro se dibuja con lápiz".
- El botón final dice "Guardar mi mapa y seguir", con el ícono `ArrowRight` en lugar de la flecha escrita.
- Las celdas no tienen preguntas de seguimiento.

### 9.6. Panel lateral de fichas (`ResourceSheet`)

Usa el `Sheet` de `components/ui`, a la derecha, con 440 px de ancho en escritorio y fondo `--card`. Recibe una lista de `recursoIds`.

- Cada recurso se muestra como una sección plegable, abierta si es el único, con el título y el ícono según su tipo.
- El contenido es `ResourceText` (copia) para `contenido`. Si es un video de YouTube (usa la expresión de `extractYouTubeId` de journey-island), se incrusta un `iframe` de proporción 16:9. En otro caso, el enlace "Abrir recurso" con `ExternalLink`. Debajo, la fuente.
- El botón "Guardar en Recursos" pasa a "En tu mochila" cuando ya está guardado, con la misma lógica de `ResourceCards`. Si un recurso no tiene `url` ni `contenido`, se muestra "Este material estará disponible cuando lo prepare orientación.".
- Cerrar el panel no afecta a la actividad.

### 9.7. Preguntas de seguimiento de Lumi

El seguimiento termina en **una sola respuesta**: el texto original más cada pregunta de Lumi y cada respuesta del estudiante, condensados en un mismo texto. Esa es la respuesta que queda como entrega del nodo y la que lee cualquier otra parte de la plataforma.

**Cuándo aplica:** en una `consigna` de tipo `texto` fuera de una matriz, solo en su primer envío (cuando no había un `Entregable` previo para ese nodo) y nunca con `edit = true`.

**Flujo completo:**

1. El estudiante envía su texto. Se valida y se guarda como `Entregable` versión 1, con la lógica normal de `SubmissionForm`. Así el avance queda registrado aunque salga durante el seguimiento.
2. Se pide una pregunta al servicio. Si no hay pregunta, se llama a `advance()` y la versión 1 queda como respuesta final.
3. Si hay pregunta, el estudiante la responde u omite. Hay como máximo dos turnos.
4. Al terminar el seguimiento, si respondió al menos un turno, se condensa todo en un texto y se guarda como **una nueva versión** del mismo `Entregable` (versión 2), con la misma estructura de siempre. Después se llama a `advance()`.
5. Si omitió todos los turnos, no se crea una versión nueva: la respuesta final es la versión 1.

Cada consigna queda, como máximo, con dos versiones: la original y la condensada. La original se conserva como historial, igual que ocurre hoy con cualquier edición.

**Formato del texto condensado.** Texto plano, con una línea en blanco entre bloques. Solo se incluyen los turnos respondidos:

```
autodeterminación

Pregunta de Lumi: ¿Por qué sientes que es autodeterminación?
Respuesta: Porque quiero ser yo quien decida qué estudiar.

Pregunta de Lumi: ¿Hay algo más que te gustaría agregar antes de seguir?
Respuesta: Que mi familia me apoye aunque no sea lo que esperan.
```

Las etiquetas `Pregunta de Lumi:` y `Respuesta:` son fijas, para que más adelante se pueda separar cada parte con seguridad.

**Condensador (`responseCondenser.ts`).** El texto se arma detrás de una interfaz, para reemplazarlo después por una condensación con IA que redacte una respuesta única:

```ts
type CondenseInput = {
  textoInicial: string
  turnos: FollowUpTurn[]          // solo se usan los respondidos
  premisa: string
  maxCaracteres?: number
}
interface ResponseCondenser {
  condense(input: CondenseInput): Promise<string>
}
```

La implementación actual es `templateCondenser`, que produce exactamente el formato de arriba. La función que arma el texto es pura y se prueba por separado (sección 13).

**Límite de caracteres.** La versión condensada tiene que pasar `validateSubmission` con el `maxCaracteres` del nodo (800 en las consignas actuales). Si no, el estudiante no podría volver a guardarla al editarla. Para que siempre quepa:

- Antes de cada pregunta, se calcula el espacio disponible: `maxCaracteres` menos el largo del texto condensado hasta ese momento y menos el largo de la nueva pregunta con sus etiquetas y separadores.
- El campo de la respuesta permite como máximo ese espacio, sin pasar de 400 caracteres, y muestra un contador ("Te quedan {n} caracteres").
- Si el espacio disponible es menor que 40 caracteres, no se hace la pregunta.
- Antes de guardar, el texto condensado se valida con `validateSubmission`. Si fallara, se conserva la versión 1 y los turnos quedan solo en el store del seguimiento.

**Servicio de preguntas (`followUpService.ts`):**

```ts
type FollowUpTurn = {
  orden: 1 | 2
  pregunta: string
  respuesta?: string
  omitida: boolean
  creadaEn: string
  respondidaEn?: string
}
type FollowUpInput = {
  activityId: string
  nodeId: string
  premisa: string
  ayuda?: string
  texto: string                    // texto condensado hasta este momento
  minCaracteres?: number
  turnosPrevios: FollowUpTurn[]
}
interface FollowUpService {
  evaluate(input: FollowUpInput): Promise<{ pregunta?: string }>
}
```

Implementación simulada para el prototipo (`mockFollowUpService`), con una espera de 700 ms para que se vea el estado de espera:

- **Primer turno:** si el texto original tiene menos de `Math.max(80, (minCaracteres ?? 0) * 2)` caracteres, devuelve "¿Podrías contarme un poco más? Por ejemplo, un momento concreto o la razón detrás de lo que escribiste.". Si no, no devuelve pregunta.
- **Segundo turno:** solo si la respuesta del primero tiene menos de 40 caracteres, devuelve "¿Hay algo más que te gustaría agregar antes de seguir?".
- Si la evaluación tarda más de 10 s o falla, se continúa sin pregunta y sin mostrar error (RNF-08).

Ambos servicios, el de preguntas y el condensador, quedan detrás de interfaces para cambiarlos por el LLM sin tocar la interfaz de usuario.

**Persistencia (`followUpStore.ts`).** Clave `ov.student-followups.v1`, con el mismo patrón de store que `missions/store.ts`:

```ts
type FollowUpRecord = {
  textoInicial: string             // lo que escribió antes de cualquier pregunta
  versionInicial: number           // versión del Entregable original
  turnos: FollowUpTurn[]
  versionCondensada?: number       // versión del Entregable condensado, si se creó
  condensadaEn?: string
}
type FollowUpState = { version: 1; records: Record<string /* "{activityId}/{nodeId}" */, FollowUpRecord> }
```

**Guardado de la versión condensada.** Copia el bloque que arma el `Entregable` en `SubmissionForm` (`crypto.randomUUID()`, `version: (existing?.version ?? 0) + 1`, `enviadoEn`, y el `updateJourney` con `applyCompletion`). Cambia solo el contenido, que pasa a ser el texto condensado. Tras guardarla, registra `versionCondensada` y `condensadaEn` en el store del seguimiento.

**Recuperación si sale a mitad del seguimiento.** Al abrir una consigna, si su registro tiene turnos respondidos y no tiene `versionCondensada`, se crea la versión condensada en ese momento, sin preguntar nada más, y se muestra el formulario normal con la respuesta ya condensada. Los turnos sin responder se descartan.

**Interfaz (`FollowUp.tsx`)**, dentro de la misma tarjeta de la consigna. La conversación se va apilando como un intercambio, en el mismo orden en que quedará guardada:

1. **Espera:** el texto enviado aparece en una cita de solo lectura con el título "Tu respuesta". Debajo, un `InlineDialogue` de Lumi con "Estoy leyendo tu respuesta…" y tres puntos animados.
2. **Pregunta:** un `InlineDialogue` de Lumi con la pregunta, escrita con `useTypewriter`. Debajo, un campo de 140 px de alto mínimo con el texto de ejemplo "Escribe aquí si quieres ampliar tu respuesta", el contador de caracteres y los botones "Responder" (principal, deshabilitado si el campo está vacío) y "Omitir" (fantasma).
3. Al responder, la respuesta se agrega a la pila como burbuja del estudiante (alineada a la derecha, en `--primary-soft`), y se vuelve a pedir una pregunta si quedan turnos.
4. Al terminar, Lumi cierra con un `InlineDialogue` breve, "Lo guardé todo junto, como una sola respuesta.", y el botón "Continuar" llama a `advance()`. Si omitió todo, el cierre dice "Tu respuesta quedó guardada tal como la escribiste.".

Ni el texto original ni las respuestas anteriores se editan durante el seguimiento: cada respuesta amplía lo anterior.

**Edición posterior.** Con "Ver o modificar mis respuestas", el campo carga la última versión, es decir, el texto condensado con sus etiquetas, y se edita como un texto normal. Guardar crea una versión nueva, como hoy, y no vuelve a activar el seguimiento.

### 9.8. Cierre de la actividad (`FinishScreen`)

Se muestra cuando `node` es `undefined`, sobre el ambiente `sunrise`, en una tarjeta `.sx-glass` de 672 px centrada.

- Arriba, el avatar de Lumi en tamaño `lg` con un halo de `--sx-lumi-soft`.
- El título en 26 px, con el texto actual: "Este hallazgo viaja contigo." si la actividad está completada, o "Tu avance queda guardado." si no. Debajo, `activity.recompensa?.mensajeFin`.
- **"Lo que llevas contigo"**, solo si hay algo: la pieza de llave (`KeyRound` y su nombre en `catalog.piezasLlave`) y las fichas guardadas en esta actividad (`BookOpen`, el título y la etiqueta "En tu mochila"). Son las fichas de las diapositivas de la actividad, más `recompensa.recursoIds`, que estén en `journey.resources`.
- **Diario:** si hay `promptDiario`, una tarjeta con la pregunta en cita y el botón "Escribir en mi diario". Navega a `appPaths.student.journal` con los parámetros `activity`, `title` y `prompt`, igual que `openJournal` en `FieldMissionsView`.
- **"Lo que viene":** los botones actuales ("Seguir hacia {ubicacion o título}" si hay `nextActivity` y "Revisar mis propias creencias" si `siguienteSugerida === 'act-07'`) y el botón "Volver al mapa" (contorno, llama a `onClose`). Se conserva la nota de `act-tip-01`.
- Los logros obtenidos **no** se muestran aquí. Se avisan aparte al volver al mapa (sección 10.2).

---

## 10. Novedades y logros

### 10.1. Novedades (`unlocks.ts` y `NoveltiesMenu`)

```ts
type UnlockItem = { id: string; kind: 'badge' | 'ficha' | 'heroe' | 'ciudad' | 'familia'; title: string; href: string }
function getUnlocks(adventure: AdventureState, journey: JourneyState): UnlockItem[]
```

| Tipo | Fuente | Identificador | Destino |
| --- | --- | --- | --- |
| Insignia | `getAchievementGroups(adventure)`, ítems con `done` | `badge:{code}` | `appPaths.student.passport` |
| Ficha | `journey.resources` y su título en `catalog.recursos` | `ficha:{id}` | `appPaths.student.resources` |
| Héroe | La misma fórmula de `TestimonialsPage` | `heroe:{id}` | `appPaths.student.testimonials` |
| Ciudad | `isCityUnlocked(adventure)` | `ciudad` | `appPaths.student.exploration` |
| Familia | `isFamilyUnlocked(adventure)` | `familia` | `appPaths.student.conversations` |

`NoveltiesMenu` es un `DropdownMenu` anclado a la campana, de 320 px de ancho y 420 px de alto máximo con desplazamiento. Muestra primero las novedades sin ver, cada una con su ícono, título y un punto `--sx-lumi` si no se ha visto. Al cerrar el menú, todas pasan a `ui.seenUnlockIds`. Si no hay ninguna, muestra "Aún no hay novedades. Cada misión que completes puede traer una.". La campana también aparece en la cabecera de los módulos.

### 10.2. Aviso de logro (`BadgeToast`)

Cuando una insignia pasa a `done` y su código no está en `ui.announcedBadgeCodes`, se encola un aviso. No se muestra con el reproductor abierto: aparece al volver al mapa o al módulo.

- Va abajo al centro, a 24 px del borde, en `.sx-glass` de 400 px.
- Lleva el avatar de Lumi en tamaño `sm`, el texto "Nueva insignia" en 12 px y `--sx-lumi`, el título de la insignia en 16 px y peso 700, y su `message` en 14 px.
- Tiene dos acciones: "Ver en mi pasaporte" (`appPaths.student.passport`) y `X` (`aria-label="Cerrar aviso"`).
- Usa `role="status"` y `aria-live="polite"`. Se oculta solo a los 7 s y no bloquea la interacción.
- Si hay varios, se muestran uno tras otro.

---

## 11. Pantallas de módulos

### 11.1. `StudentModuleLayout`

Se usa en todas las rutas de `/student` salvo los mapas. Ocupa toda la pantalla, sin sidebar.

- **Cabecera** de 56 px, fondo `bg-card/95` con `backdrop-blur` y borde inferior:
  - A la izquierda, el botón "Volver al mapa" con `ArrowLeft`, que navega a la zona de `ui.lastMap`. Luego un separador vertical y el título del módulo (los mismos textos de `getViewLabel` del shell actual).
  - En Perfil y Catálogo, unas pestañas tipo píldora con las subsecciones (Información general y Mi decisión; Profesiones, Carreras e Instituciones educativas). Antes de agregarlas, comprueba si la vista ya muestra sus propias pestañas: si las muestra, no las dupliques.
  - A la derecha, la campana (`NoveltiesMenu`), el botón de ayuda (`aria-label="Abrir guía"`, abre `LumiOverlay` con los pasos de la vista) y `StudentUserMenu`.
- **Contenido:** el `Outlet`, en un contenedor con `overflow-y-auto` y alto mínimo completo. Si la vista tenía texto de guía, conserva el fondo actual con `background: var(--sx-module-bg)`.
- Ya no hay burbuja de guía abajo a la derecha.

### 11.2. Ajustes en vistas existentes

- **`ResearchMissionsView.tsx`** (archivo solo del estudiante): elimina el `<GuideDialogue … />` y su import. Su texto pasa a `guide-texts.ts`. No cambies nada más.
- **`StudentFamilyConversationsView.tsx`:** copia `FamilyConversationsView.tsx` en `modules/`, fija `audience` en `'student'` y elimina las ramas del apoderado. Quita el `GuideDialogue` de la lista, cuyo texto pasa a `guide-texts.ts`. En el detalle, reemplaza su `GuideDialogue` por un botón de ayuda que abre `LumiOverlay` con el texto actual. Conserva la importación de `FamilyConversationData.ts` y de los tipos, que son datos. **El archivo original no se modifica**, porque lo sigue usando el apoderado.
- Las demás vistas (diario, señales, comunidad, recursos, catálogo, héroes y perfil) no se modifican. Solo cambia el contenedor que las rodea.

---

## 12. Adaptación a pantallas y accesibilidad

### 12.1. Escritorio primero

El diseño se revisa a 1280 × 800 y 1440 × 900. Por debajo de 768 px, como mínimo:

- El panel lateral pasa a ser una hoja inferior (`Sheet` con `side="bottom"`, 85 % del alto como máximo), que se abre con un botón `.sx-glass` abajo a la izquierda (`PanelLeftOpen`, `aria-label="Abrir panel"`). Arranca cerrado.
- El drawer de actividad ocupa todo el ancho.
- El selector de zona baja a 72 px del borde superior, para no chocar con los controles.
- En la caja de diálogo, el avatar pasa a tamaño `md` y el relleno izquierdo del texto a 96 px.
- Nada provoca desplazamiento horizontal desde 360 px.

### 12.2. Accesibilidad

- Todo elemento interactivo es un `button` o un `a`, con foco visible: un contorno de 3 px `--ring` en pantallas claras y `--sx-lumi` en oscuras.
- **Contraste:** el texto sobre `.sx-glass-dark` no baja de blanco al 72 %, y el texto pequeño (12 px o menos) no baja de blanco al 80 %.
- Overlays y diálogos cumplen la sección 7.2: foco gestionado, Escape y un `aria-label` claro.
- **Movimiento reducido** (`@media (prefers-reduced-motion: reduce)`): sin pulsos, sin transición de zona, sin efecto de escritura, sin cruce de ambientes y con desplazamientos del mapa inmediatos.

---

## 13. Pruebas

Modifica solo las pruebas del estudiante en `tests/adventure-rendering.test.mjs`. No cambies las que se refieren a `/parent` o `/counselor`.

**Cuándo se actualizan.** Cada fase termina con todas las pruebas en verde. Por eso, una expectativa del estudiante que contradice el cambio de una fase se actualiza **en esa misma fase**, junto con el cambio que la invalida:

- **Fase 1:** "every student route keeps the guide as a compact bottom-right bubble", porque los módulos pasan a tener su cabecera con ayuda y ya no muestran la burbuja.
- **Fase 2:** "guide stays collapsed until its help button is activated" y la aserción de que no hay controles de zoom en "adventure keeps the original mission route…", porque el mapa nuevo trae el botón de ayuda arriba y el zoom.
- **Fase 7:** las pruebas nuevas de la lista de abajo. Si alguna se puede escribir antes, junto con su componente, mejor.

Al actualizar una expectativa, cambia solo la aserción que el cambio invalida y reemplázala por la equivalente del diseño nuevo. No elimines ni debilites aserciones que no tienen que ver con el cambio, y menciona en el reporte de la fase cada aserción modificada, con su motivo.

**Se mantienen y deben seguir pasando sin cambios:**

- "all new student pages and related parent/counselor routes render".
- "review mode renders every mission, city and research destination unlocked initially".
- "the city and research station render after the actual mission requirement".
- "the passport lives inside the profile…": no agregues un acceso "Mi pasaporte".
- "only field missions connect…", "map details use the shadcn drawer…" y "case drawers contain only the start action…": leen los archivos antiguos, que no cambian.
- "family answer remains hidden…": ahora renderiza la vista copiada y debe cumplirse igual.
- "every supplied mission node renders…" y "direct instrument route…": validan el reproductor nuevo (sección 9.1).

**Se reemplazan:**

- "guide stays collapsed until its help button is activated" pasa a verificar que `/student/missions` contiene `aria-label="Abrir guía"` y no contiene `role="dialog"`.
- "every student route keeps the guide as a compact bottom-right bubble" pasa a verificar que cada ruta de módulo de esa lista contiene "Volver al mapa" y `aria-label="Abrir guía"`, y que ninguna ruta del estudiante renderiza el sidebar de `components/ui/Sidebar` (busca su atributo `data-slot` o el marcador que use ese componente).
- En "adventure keeps the original mission route…", elimina la aserción de que no hay controles de zoom y verifica que estén `aria-label="Acercar mapa"`, `aria-label="Alejar mapa"` y `aria-label="Centrar mapa"`. El resto de las aserciones se mantiene.

**Pruebas nuevas:**

- `MapCanvas` con `variant="route"` dibuja trazos con `stroke-dasharray="18 22"`, y con `variant="open"` no dibuja ninguno.
- El código de `ActivityDrawer.tsx` importa `@/components/ui/drawer` y contiene `<DrawerClose asChild>`, `aria-label="Cerrar ficha"` y `overflow-x-hidden`.
- `/student/missions` contiene "Siguiente paso", "Tu señal de hoy" y "Accesos rápidos", y `/student/exploration` contiene "Satisfacción de las personas".
- Para cada actividad del contenido, el reproductor no contiene "pts", "puntos" ni `type="file"`.
- `/student/missions` renderiza un letrero "Tramo 1".
- `getMissionsToSync` devuelve, en orden, las misiones cuya actividad v2 está completada y que faltan en `completedMissionIds`, y devuelve una lista vacía cuando ya están todas.
- `followUpService` simulado devuelve pregunta para un texto corto y no la devuelve para uno largo.
- `templateCondenser` arma el formato exacto de la sección 9.7: el texto original, una línea en blanco y cada turno respondido como `Pregunta de Lumi:` y `Respuesta:`. Los turnos omitidos no aparecen, y el resultado nunca supera `maxCaracteres`.

---

## 14. Fases de implementación

Cada fase termina con `npm run build`, `npm run lint` y `npm test` en verde. Las pruebas del estudiante que una fase invalida se actualizan en esa misma fase (sección 13).

1. **Base.** Carpeta, `ui-state.ts`, `characters.ts`, `views.ts`, tokens CSS, `StudentShell`, `StudentModuleLayout`, `StudentUserMenu`, rutas, la copia de conversaciones y el ajuste de investigación. Al terminar, todas las rutas del estudiante funcionan sin sidebar y los módulos tienen su cabecera con "Volver al mapa". Mientras tanto, los mapas pueden seguir mostrando las vistas antiguas.
2. **Mapa.** `mapPoints.ts`, `MapCanvas`, `MapNode`, `MapPath`, `BlockSign`, `ZoneSwitch`, `MapControls`, `ZoomControls`, `AdventurePanel`, `ActivityDrawer`, `CityLocked` y `ZoneTransition`. En esta fase el reproductor abierto desde el mapa puede seguir siendo `JourneyPlayer`.
3. **Lumi.** `useTypewriter`, `LumiOverlay`, `guide-texts.ts`, `OverlayQueue`, las presentaciones de sección, la ayuda, la llegada a la ciudad y el check-in (`checkIn.ts` y `CheckInDialog`), incluida su tarjeta en el panel.
4. **Reproductor.** `StudentActivityPlayer` con todos sus nodos, `PlayerAmbient`, `PlayerTopBar`, `DialogueBox`, `InlineDialogue`, `ResourceSheet` y `FinishScreen`. Las pantallas de mapa pasan a usarlo.
5. **Seguimiento.** `followUpService`, `followUpStore` y `FollowUp`.
6. **Avisos.** `unlocks.ts`, `NoveltiesMenu` y `BadgeToast`.
7. **Cierre.** Pruebas de la sección 13, revisión de accesibilidad y de movimiento reducido, y comprobación a 360 px.

---

## 15. Criterios de aceptación

- [ ] Ninguna ruta del estudiante muestra el sidebar.
- [ ] No se modificó ningún archivo de las áreas prohibidas (sección 2.1). `git diff --stat` solo muestra la carpeta nueva, el bloque de rutas `/student`, `ResearchMissionsView.tsx` y las pruebas del estudiante.
- [ ] Los datos guardados antes del cambio siguen funcionando: el progreso, las respuestas, los borradores, el diario y los check-ins aparecen igual.
- [ ] Completar una misión v2 actualiza el nivel, las insignias I1 a I3 y, al terminar el camino, el desbloqueo real de la ciudad y de la familia.
- [ ] El camino y la ciudad muestran el panel, el selector al centro, los controles, el zoom y los puntos con sus cinco estados. El punto recomendado brilla.
- [ ] El panel se pliega y recuerda su estado. "Ver misión" enfoca el punto y abre su drawer.
- [ ] El drawer muestra la acción correcta para cada estado (tabla de la sección 6).
- [ ] La primera visita a cada sección abre a Lumi una sola vez, y la ayuda la vuelve a abrir cuando se pide. El texto se escribe y se puede completar de un toque.
- [ ] Si no hay check-in hoy, se pide al ingresar, una sola vez por día si se elige "Ahora no". El panel muestra la señal del día y el acceso a su evolución.
- [ ] El reproductor cambia entre los ambientes de noche y amanecer, usa la caja de diálogo en diálogos, ítems y preguntas, y no muestra puntos, subida de archivos ni botón de retroceso.
- [ ] Una respuesta incorrecta en una compuerta muestra su retroalimentación, la pista y "Ver ficha" cuando hay fichas, que se abren en un panel lateral sin salir de la actividad.
- [ ] Un registro breve recibe una pregunta de seguimiento, que se puede responder u omitir. Hay como máximo dos por consigna.
- [ ] Al terminar el seguimiento con al menos un turno respondido, la entrega del nodo es una sola respuesta condensada (versión 2) que pasa `validateSubmission`. Si se omitió todo, la entrega sigue siendo la versión 1.
- [ ] Si el estudiante sale a mitad del seguimiento, al volver encuentra su respuesta ya condensada con los turnos que alcanzó a responder.
- [ ] Al completar algo que otorga una insignia, el aviso aparece al volver al mapa, no dentro de la actividad.
- [ ] Con movimiento reducido no hay animaciones de pulso, escritura ni transición.
- [ ] Nada se desborda horizontalmente a 360 px.

---

## 16. Fuera de alcance y pendientes

- **Fuera de alcance:** el rediseño interno de cada módulo (la mochila de recursos, el diario, el perfil y los demás se trabajarán después, uno por uno), las imágenes por momento, los sonidos, la evaluación real con el LLM, la pausa ante respuestas demasiado rápidas y las ilustraciones de los personajes.
- **Pendiente de datos:** los nombres de los bloques. Hoy el letrero dice `Tramo {n}` porque las actividades solo tienen el número de bloque.
- **Pendiente de decidir:** si la orientadora debe ver los turnos por separado. Hoy ve lo que muestre su portal a partir de la última versión del `Entregable`, que es el texto condensado. Esta especificación no toca su portal.
- **Para después:** reemplazar `templateCondenser` por una condensación con IA que redacte una respuesta única a partir del texto inicial y los turnos. El store del seguimiento conserva `textoInicial` y los turnos para poder hacerlo.

---

## Anexo A. Referencias visuales

Si tienes las capturas del prototipo anterior, guárdalas en `docs/student-experience/referencias/` con estos nombres y úsalas como guía:

- `01-mapa-panel.webp`: el mapa a pantalla completa con el panel flotante a la izquierda (saludo, anillo de progreso, siguiente meta, accesos rápidos y actividades disponibles), los botones de ícono arriba a la derecha y el zoom abajo a la derecha.
- `02-ayuda-lumi.webp`: el fondo desenfocado, el personaje en un círculo sobre la caja, los indicadores de paso, el texto que se escribe y los botones Anterior y Siguiente.
- `03-drawer.webp`: el drawer derecho con la cabecera ilustrada, la etiqueta de región, la insignia de estado, la duración, el título, la descripción y el botón a todo el ancho.
- `04-dialogo-rpg.webp`: el fondo oscuro de ambiente, la barra superior translúcida con el paso y la barra de progreso, y la caja de diálogo abajo con el avatar sobresaliendo.
- `05-video.webp`: el contenido en tarjeta oscura con el diálogo del personaje en línea arriba.
- `06-compuerta.webp`: las opciones en tarjeta oscura con el estado incorrecto marcado.
- `07-registro-amanecer.webp`: el fondo cálido de amanecer, la tarjeta clara, el campo de texto amplio y las preguntas sugeridas debajo.

Las capturas muestran puntos, el progreso del orientador y la subida de archivos. Esos elementos **no** se implementan (sección 2.3).
