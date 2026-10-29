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
                 journal, family-conversations, parent, counselor, plans, student-tracking
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
| Un tipo del contrato | `types/servidor.ts`, copiado tal cual del esquema Pydantic. Si el archivo no cabe en 400 líneas, un esquema va en su propio `types/servidor<Dominio>.ts`, que `servidor.ts` reexporta (hoy, `servidorInstrumentos.ts` con `app/schemas/instrumentos.py`, `servidorFichas.ts` con `app/schemas/fichas.py`, `servidorFamilia.ts` con `app/schemas/familia.py` y `conversaciones.py`, y `servidorInvestigaciones.ts` con `app/schemas/investigaciones.py`). |
| Convertir una respuesta en datos para la vista | `lib/servidor/adaptadores.ts` (casos, colección y testimonios: `lib/servidor/adaptadoresCasos.ts`; registros y referencias: `lib/servidor/adaptadoresRegistro.ts`; diario y check-in: `lib/servidor/adaptadoresDiario.ts`, F05; planes de carrera: `lib/servidor/adaptadoresPlanes.ts`, F07a, y los borradores de REALIDAD y PASOS con la precarga y los totales en vivo: `lib/servidor/adaptadoresPlanesEdicion.ts`, F07b; conversaciones en familia: `lib/servidor/adaptadoresConversaciones.ts`, F08; investigaciones y entrevistas: `lib/servidor/adaptadoresInvestigaciones.ts`, F09). Todos solo importan tipos y, para leer fechas, `lib/servidor/fechas.ts`. |
| Estado que viene del servidor | `store/servidor/`. El del portal del apoderado, en `store/servidor/apoderado.ts`; no reutiliza el almacén del estudiante. Sigue las cuatro «Reglas de los datos del servidor en el front» de `ov_backend/docs/sistema/integracion.md`: todo pasa por el almacén (nunca una consulta en el `useEffect` de un hook), las listas solo con lo de sus tarjetas y el detalle al abrirlo, una acción confirmada actualiza lo cargado sin volver a pedirlo y lo que puede cambiar otra cuenta (conversaciones y cartas con el apoderado, lo de la orientadora) se revalida al abrir su vista. |
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
- `lib/activities/logic.ts`, `lib/servidor/adaptadores.ts`, `lib/servidor/adaptadoresRegistro.ts`, `lib/servidor/adaptadoresDiario.ts`, `lib/servidor/adaptadoresPlanes.ts`, `lib/servidor/adaptadoresPlanesEdicion.ts`, `lib/servidor/adaptadoresConversaciones.ts`, `lib/servidor/adaptadoresInvestigaciones.ts` y `lib/explorationAssets.ts` solo importan tipos (los adaptadores, también `lib/servidor/fechas.ts`, que no importa nada): las pruebas los cargan aislados (`importarAislado` de `tests/soporte/servidor-ayudas.mjs` resuelve `./fechas`).
- **Fechas del servidor:** llegan en hora de Lima sin zona. Toda lectura de una fecha del servidor (mostrar, contar días, «es de hoy», ordenar) usa `fechaServidor` de `lib/servidor/fechas.ts`, nunca `new Date(cadena)` (detalle en `docs/origen-de-datos.md`, «Fechas del servidor»).

### Componentes

- Un componente exportado por archivo; ayudantes privados de hasta unas 40 líneas en el mismo archivo.
- Máximo 300 líneas por `.tsx` y 400 por `.ts` (sin contar `data/` ni `components/ui/`). Una vista de ruta, idealmente 150. El estado y los efectos de un componente grande van a un hook del dominio. Dividir un componente no cambia su marcado (mismos elementos, clases, `aria-*` y orden): las pruebas de renderizado comparan HTML.
- Antes de crear un componente, busca uno que ya lo haga. No copies un componente para variarlo: agrega una prop o extrae la parte común.
- Componentes en `PascalCase.tsx`; el resto en `camelCase.ts`; CSS en `kebab-case.css`. Sin barriles (`index.ts`): importa el archivo concreto. Usa `@/` para salir de la propia feature o capa.
- `scripts/estructura-excepciones.json` está vacío. No agregues excepciones; si una regla no se puede cumplir, detente y explica por qué.

## Origen de los datos

- `VITE_DATOS=local` (por defecto) está congelado desde F00: debe comportarse exactamente como antes y no recibe funciones nuevas. Lo que agrega un lote F existe solo en `api`; el hook del dominio expone una bandera con nombre del dominio (`puedeEditarRegistro`) y en local la vista se comporta como antes. `tests/local/` no se amplía; solo debe seguir pasando. En `VITE_DATOS=api`, `prototypeAllUnlocked`, `studentDemoEnabled` y `pendingContent` no afectan la disponibilidad.
- Si una tarea mueve un dato entre servidor, contenido, catálogo o demostración, actualiza `docs/origen-de-datos.md` en la misma tarea. Cuando un dato pase al servidor, cambian el hook del dominio y `store/servidor/`; las vistas no deberían cambiar.
- No cambies claves ni formatos de `localStorage`, `sessionStorage` o IndexedDB sin una migración que conserve lo guardado (claves en `docs/origen-de-datos.md`).
- Para la red basta `fetch`. El proxy de desarrollo `/api` apunta a `http://127.0.0.1:8000`.
- **Sesión (B17):** la sesión vive en `store/accesoStore.ts` (`ov.acceso.v1`, `localStorage`). La cuenta activa en api sale de ahí, nunca de una lista de cuentas. `cliente.ts` no guarda estado: `main.tsx` le entrega el token y qué hacer ante un 401 con `conectarAccesoApi()`. Las guardas por portal están en `routes/GuardaAcceso.tsx`. En modo local se ingresa con los usuarios de `data/demo/usuariosPrueba.ts` y nunca se llama al servidor.
- **El modo se decide al llamar, nunca al cargar un módulo.** `main.tsx` configura `modoApi` después de importar los módulos: una elección como `const useX = modoApi ? a : b` queda siempre en local. Un hook que depende del modo usa siempre los mismos hooks internos y ramifica adentro. Los hooks que usan los componentes del arnés de `tests/local` no pueden usar efectos ni contexto en local.
- **En api, los textos de una actividad salen del servidor (F00):** título, tipo, duración, descripción, nombre del bloque, `requerida` y el mensaje de bloqueo. Del JSON de contenido solo se usan los nodos y la posición del mapa (`x`, `y`, `icono`, `origen`). El texto de Lumi ante algo cerrado sale de `textosBloqueo`, seguido del mensaje del servidor.
- **Excepciones al modo local congelado**, aprobadas por el usuario: solo cambios visuales que no alteran textos, orden ni momento. Hoy son diecisiete: el panel lateral del mapa (ajuste del panel de F05: cabecera plana con nivel y rango que lleva a Mi perfil, el avance en una tarjeta con un anillo (porcentaje global) y el tramo actual en texto («Tramo N · X de Y misiones» y su nombre; en local, «X de Y misiones»), «Siguiente paso» como única tarjeta destacada con pie «+N misiones abiertas · Ver todas ›» y, sin requeridas, «Explora las actividades», «Tu señal de hoy» en tres estados con etiqueta del valor y «Cambiar», y seis accesos rápidos con «Mis planes» en lugar de «Mi perfil» y los cerrados atenuados), con una sola implementación en ambos modos; en local, el siguiente paso es la recomendada, ya no hay lista de disponibles y la etiqueta del valor (1–10) va por proporción; la portada del diario en tres zonas («Hoy» con la pregunta del día y «Escribir algo libre», el buzón, la tarjeta compacta de Lumi con la historia de Lumi y el cuaderno con filtros por tipo, buscador por título o pregunta, orden y 3 entradas), la ruta «Cartas de Lumi», los recuerdos como capítulos que se abren en el reproductor de actividades (el recién desbloqueado brilla hasta que se ve; nunca se abre solo), «cartas» en lugar de «conversaciones» y la carta del cierre de actividad como una fila, con una sola implementación en ambos modos porque bifurcar el diario duplicaría la pantalla entera (ajuste del diario de F05; en local, el buzón usa las cartas locales y «Cartas de Lumi» solo muestra las por responder); las insignias del pasaporte sin su código (la tarjeta muestra ícono y nombre; el diálogo, el grupo) y el historial de señales con «Volver al mapa» (al último mapa, `ui.lastMap`) en lugar de «Volver a mi diario», pedidos del usuario tras la prueba manual de F05; el aviso de guardado del diario como toast (`AvisoToast`, «Mi diario», título y descripción; se cierra solo) en lugar de la franja fija (pedido del usuario tras la prueba manual de F05); la mochila del ajuste mochila, con una sola implementación en ambos modos aunque cambia textos y orden: pestañas «Fichas» (por defecto) y «Voces de la ciudad», «Compartimentos» con «x de M», buscador por pestaña y filtro «Solo favoritos», solo las fichas obtenidas (agrupadas por tramo; en local, un solo grupo) con el cierre «Más adelante», las voces bloqueadas solo con su llamado disponible (en local, el punto del caso jugable) y el cierre «Más voces se suman a la ciudad», estados vacío y sin resultados; la Central de casos (ajustes post F04: ayuda de Lumi en el «?» del topbar, «Ver lo que dijo la comunidad» como botón, scroll de Revisar y cierre con badges y un solo botón), en ambos modos con una sola implementación porque la Central comparte componentes y bifurcarla duplicaría una pantalla que local no conservará; el botón «Anterior» del reproductor de actividades (F01, aprobado para ambos modos porque es navegación básica); el modal de ficha (`FichaModal`) como única presentación de una ficha en toda la plataforma, sin «Leí la ficha»: abrirlo la marca leída en local (F04d, ajuste mochila); el drawer de actividad sin «Más tarde» (F04: se cierra con la X o tocando fuera, en el camino y la Ciudad); el «?» de intriga en la fila de actividades nuevas de todos los cierres (F04b, `FinishExtrasSection`); los avisos del estudiante como toasts (`components/student/AvisoToast`, 6 s en lugar de 7); las tarjetas del libro de Helena sin el enlace a la guía («¿Qué significa cada letra?», «¿Qué es cada inteligencia?»): solo «Ver resultado completo», y la guía se abre desde la vista explicada (F03); el revelado común de esas tarjetas: el sello grande como único botón («Romper el sello»), con el texto de Helena, la línea «Adentro:» y «Toca el sello para romperlo», la entrada escalonada tras romperlo y los chips de alcance `ScopeChip` (F03) y, desde F01, la distribución de la pantalla de fin (medallas de insignia y nivel bajo el título, «Se abrió para ti» como filas con las secciones agrupadas, subtítulo sin el conteo de la mochila y columna adaptativa), que el usuario aprobó para ambos modos aunque cambia textos y orden; y el pasaporte y Mi perfil del ajuste pasaporte-perfil, con una sola implementación en ambos modos aunque cambian textos y orden (en local: los grupos de `getAchievementPresentations()` como páginas, `travelerLevels` para título y descripción, el `nextStep` del nivel o la `description` de la insignia como única condición, la vitrina en `localStorage` como antes, las secretas sin pista y la línea de ruta con un solo tramo, «Misiones de campo», de `getZoneProgress('missions')`); y la bienvenida del diario (ajuste diario-lumi): sin el cuadro «Un espacio para ti y Lumi» ni su botón «Entendido, empezar a escribir» (ni la entrada «Al inicio del camino» que abría), su contenido es la presentación de Lumi de la sección (`sectionIntros.journal`, cuatro pasos) y «Hoy» se ve desde la primera visita, con una sola implementación en ambos modos; `journalOnboardingSeen` queda en `adventureStore` sin uso, para no cambiar el formato guardado. En api, la presentación de una sección cerrada en el servidor (`SeccionProtegida`) espera a que se abra y no se marca como vista.
- **Apertura por tipo (F04):** una actividad se abre según su tipo, no según su bloque. En api, una BATALLA abre el reproductor de desafíos (camino o Ciudad) y un CASO, la Central de Casos, con el contenido que su JSON nombra (`desafio`, `caso`; ver `contenidos-actividades.md`). Desde F03, un REGISTRO del servidor se abre con `RegistroServidorPlayer` también en la Ciudad, y un encuentro con diálogos con `eco`, con `EncuentroServidorPlayer`.
- **Libro de Helena (F03):** en api, el estado de cada página sale del avance de instrumentos (`store/servidor/instrumentos.ts`), y revelar y reiniciar son acciones del servidor; el reinicio usado se deduce del historial. Lo bloqueado que espera un revelado (evaluador `instrumentos_prioritarios` sin cumplir en el bloqueo) enlaza al libro. La página I (partida y llegada) tiene dos estados, solo partida y partida + llegada, en la tarjeta y en su vista explicada; recibe zonas como código, sin puntajes, y sus textos de pantalla son del front (no van a `pendientes-interfaz.md`). Toda tarjeta lista para revelar (y la llegada lista) usa el mismo cuerpo, `RevealSeal`: el sello es el único botón y, mientras revela, no responde pero se ve igual (`aria-disabled`). Si un instrumento es «Para tu proyecto» u «Opcional» lo decidirá el backend (B18); hasta entonces `ScopeChip` refleja el valor del front.
- **Bloqueos (F04):** lo bloqueado de una sección se explica con el diálogo de Lumi; lo bloqueado de un contenido concreto (una ficha), con un pop up con su detalle (el `Dialog` de requisito de la mochila). Un testimonio bloqueado se lista solo con su llamado disponible; su tarjeta muestra la pista y el llamado, abre ese pop up y su enlace «Ir a la Central» lleva directo al drawer del llamado (ajuste mochila). Las fichas bloqueadas no se listan en la mochila; `?ficha=` de una bloqueada abre el pop up.
- **Pasaporte y perfil (ajuste pasaporte-perfil):** vocabulario fijo en pantalla: niveles = **títulos** («tu título actual», «siguiente título»); insignias = **sellos** («n de m sellos», «sellada el…»); grupo de insignias = **página**; las que el estudiante muestra a sus compañeros = **vitrina** (hasta 3); una insignia oculta = **secreta** (nunca «oculta»). En api, páginas, pistas, fechas, textos del sello y del nivel, condiciones (`/progreso/NIVEL` y `/progreso/INSIGNIA`, todas las reglas, con «o bien» entre alternativas y el resumen de la más avanzada) y vitrina salen del servidor; sin `texto`, una condición muestra el requisito de la insignia o el mensaje de bloqueo de la regla. Una secreta no obtenida lleva el código local `???-<grupo>-<posición>`. La vitrina se guarda con `POST /acciones/vitrina` y el botón muestra un cargador sin deshabilitarse; guardar no vuelve a pedir el siguiente título. La línea de ruta del perfil pone un punto al inicio de cada tramo de `avance.tramos` y uno final, «Fin del viaje»; el perfil no muestra la afinidad.
- **Presentaciones de primera visita (ajuste presentaciones-vistas):** en api, las ya cerradas salen del servidor (`store/servidor/`, sección `presentaciones`, con el ingreso) y se marcan con `marcarPresentacionVista`; `useNoveltyQueue` arma con ellas el `introsSeen` de la cola. Sin esos datos (cargando o con error), o con la sección de la vista cerrada, la cola no muestra nada en esa vista. Cerrar una presentación la oculta en esa visita; si el POST falla, vuelve a salir en la próxima. El `introsSeen` local no se lee, ni se escribe, ni se sube en api; en local sigue en `ov.student-ui.v1`. Los códigos son los ids de `studentViews`. La presentación (`sectionIntros`) y la ayuda del «?» (`guideSteps`) siguen separadas.
- **Diario y señal (F05):** el diario no tiene temas en ningún modo (filtros por tipo: libres, pregunta del día y cartas de Lumi); en api, la señal usa la escala 1–5 del servidor y es una por día, editable ese día («Cambiar» sobrescribe la del día), y los check-ins los pide el refresco solo con CHECK_IN abierta; el detalle está en `docs/origen-de-datos.md`.
- **Planes de carrera (F07a–F07b):** en api, Mis planes, el plan abierto (`profile/decisions/:carrera`), el bloque de plan del detalle de carrera y el capítulo III del perfil leen los planes del servidor (`features/plans/`, bandera `usaTarjetaV4` en `features/plans/lib/tarjeta.ts`); en local, `MisPlanesLocales`, `PlanCard` y `DecisionSheet` siguen como antes y la ruta del plan abierto vuelve a Mis planes. Un plan se crea solo desde una carrera favorita. Cada sección del plan abierto se lee primero y se edita con «Editar» / «Cancelar» / «Guardar sección»; «Cómo me siento» (medidores, `?seccion=MEDIDORES`) y «Lo hice» (paso hecho) guardan al instante; los títulos de sección y las etiquetas de estado son del front (el `nombre` del servidor solo al citar un desbloqueo). Sin planes cargados (PLANES cerrada o en espera), el bloque de plan del detalle de carrera no se muestra. La ruta del plan abierto cuenta como vista `profile-decisions` (cabecera «Mis planes» y su guía) y lleva sus propias migas. El detalle está en `docs/origen-de-datos.md`.
- **Familia y Conversaciones (F08):** en api, la sección Familia del estudiante y Conversaciones del apoderado son las mismas pantallas (`features/family-conversations/components/servidor/`, con `ModeloFamilia` de `useFamiliaEstudiante` o `useFamiliaApoderado`): el rol solo cambia estilo (variables de `familia.css`) y textos (`data/textosFamilia.ts`). Sin carta propia se muestra la carta pendiente, nunca la lista; la carta se edita hasta la entrega; con las dos respuestas el tema queda conversado (no hay check); el regalo nunca dice que es una carta antes de abrirlo. Las rutas `conversations/carta`, `/regalo` y `/tema/:conversacion` existen solo en api (`routes/SubrutasFamilia.tsx`); en local, `SegunModo` deja las vistas de siempre. El modal de ficha (`FichaModal`) sirve al apoderado con `puedeMarcarFavorito={false}` y su contenido externo. Mis actividades del apoderado en api es `ParentMisActividadesView` (con el diploma en `/parent/activities/diploma`). En api, el cierre de una actividad del apoderado muestra «Se abrió para usted» con los `nuevos_desbloqueos` que guarda `store/servidor/apoderado.ts` (`cierre`), y la X pide confirmación antes de salir (bandera `confirmarSalida`); la carta del apoderado se escribe para el hijo elegido en la lista (sin selector) y «Ver ideas» abre la guía para familias (`GuideDialogue` controlado). El diploma tiene estilos de impresión (A4 horizontal, una página, a color) y de celular en `mis-actividades.css`.
- **Inicio del apoderado (ajuste inicio-apoderado):** en api es `ParentHomeServer` (el hook `useParentOverview` expone `inicio`, nulo en local): «Mis hijos» con selector de chips solo con más de un hijo, la tarjeta del hijo elegido (título actual, avance y «Sus cuestionarios») y, debajo, «Tus actividades» (la ruta del apoderado, que no cambia con el hijo) y «Conversaciones con {hijo}». El hijo elegido es el mismo de Conversaciones (`hijoActivo`/`elegirHijo`) y se refleja en `?child=`; la vista explicada toma el hijo de la URL. Los cuestionarios y su estado se ven siempre; la clave y «Ver resultado» solo con el diploma (sin él, el candado en las filas con resultado), y de partida y llegada se usa el resultado de llegada si existe. Los resultados se piden por hijo (`store/servidor/apoderadoResultados.ts`, revalidados al montar; lo que llega de un hijo que dejó de ser el activo se descarta). La tarjeta de conversaciones muestra un estado por vez leído del servidor (bloqueada con su mensaje, carta, te toca, en curso, completas, error con «Reintentar» y esqueleto al cargar), sin respaldo de demostración. Criterios del portal: texto base de 16 px, botones de 48 px, una sola acción principal por tarjeta, estados dichos con palabras e íconos de lucide con texto. En local, `ParentChildrenSummary`, `ParentConversationNotice` y `ParentRouteSummary` siguen como antes.
- **Explorar opciones del apoderado y la orientadora (ajuste catalogo-apoderado):** solo en api, el catálogo del estudiante (`CatalogoPortal`, rutas `explorar/*` de `routes/SubrutasExplorar.tsx`) en modo lectura (`useModoCatalogo`, por el rol de la sesión): sin favoritos, planes, íconos por revelar, «Afines a mi resultado», lugar inesperado, entrevistas ni vistas registradas. La prop `variante="portal"` solo cambia estilo (`catalogo-portal.css`, que define las variables `--sx-*` porque fuera del estudiante no hay `.sx-root`), el kicker y la coletilla; la espera del detalle es `PantallaCargaPortal`, y «Costos y admisión» de la institución no menciona la tarjeta de presupuesto (usted: «Revíselos en su página oficial.»). En local, `/parent/careers` sigue con la guía y la orientadora no tiene la entrada.
- **Investigaciones (F09):** en api, Investigaciones (listado con De mi salón · Leyendas · Mis investigaciones, en curso y aliados), el asistente del guion (`investigations/guion?paso=1|2|3`), publicar y editar la ficha (`investigations/publicar?editar=`), el detalle de una entrevista (`investigations/:entrevista`) y Publicaciones de la orientadora (tabla y detalle) leen del servidor, tras la sección INVESTIGACIONES (`routes/SubrutasInvestigaciones.tsx`); en local siguen `ResearchRoute`, `CommunityView` y `PublicationsView`, y las subrutas vuelven a Investigaciones. El estado (sección `investigaciones` y `store/servidor/entrevistas.ts`) se revalida al montar y cada acción lo vence, también la en curso de un coautor. Todo botón que llama al servidor lleva cargador; las acciones avisan con un toast (`AvisoInvestigaciones`; en el portal, `AvisoPortal`). El «Entrevistas de tu salón» del detalle de ocupación lee `entrevistas?ocupacion=` y no se muestra con la sección cerrada.
- **Seguridad del token:** como el token está en `localStorage`, no se usa HTML crudo (`dangerouslySetInnerHTML`) ni se cargan scripts de terceros.

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
  servidor/     acceso/, actividades/, batallas/, casos/, catalogo/, diario/, familia/, investigaciones/, mapa/, instrumentos/, logros/, perfil/, planes/, registro/, testimonios/  (modo api, con fixtures)
  despliegue/
  fixtures/servidor/   generados por ov_backend; no se editan a mano; ruta/ (ruta-*) la usan acceso, mapa, actividades y logros (F00), registro (F01), batallas, casos y testimonios (F04), diario (F05), el pasaporte y la vitrina en logros y perfil (ajuste pasaporte-perfil), catalogo (F06), planes (F07a) familia y el portal del apoderado (F08) e investigaciones (F09)
  soporte/             ayudantes compartidos
```

- Las pruebas nuevas de integración van en `tests/servidor/<área>/` y usan `tests/fixtures/servidor/`.
- Las pruebas cargan archivos por su ruta: si mueves un archivo, actualiza esas rutas en la misma tarea. No agregues resolución de carpetas a los cargadores.
- Comandos: `npm test`, `npm run test:local`, `npm run test:servidor`, `npm run test:despliegue`. Una carpeta: `node --test "tests/servidor/instrumentos/**/*.test.mjs"` (con comillas, para que funcione en PowerShell).
- Ninguna tarea debe agregar fallas. Las pruebas de aventura usan el seguimiento por criterios y el alcance vigente de la demo.

| Si cambias… | Corre primero |
|---|---|
| `store/servidor/`, `lib/servidor/`, `services/api/`, `types/servidor.ts`, o regeneras fixtures | `npm run test:servidor` |
| `features/activities/`, `lib/activities/`, `data/activities/` | `tests/local/actividades`, `tests/servidor/actividades` y `tests/servidor/registro` |
| `features/adventure/` | `tests/local/aventura`, `tests/servidor/mapa` y `tests/servidor/logros` |
| `features/discovery/` | `tests/servidor/catalogo`, `tests/servidor/instrumentos`, `tests/servidor/investigaciones`, `tests/servidor/perfil`, `tests/servidor/logros` y `tests/servidor/planes` |
| `features/plans/` | `tests/servidor/planes`, `tests/servidor/catalogo`, `tests/servidor/perfil` y `tests/local/aventura` |
| `features/cases/` | `tests/local/casos` y `tests/servidor/casos` |
| `features/parent/`, `features/counselor/`, `features/student-tracking/`, `pages/parent/`, `pages/counselor/` | `tests/local/portales`, `tests/local/perfil` y `tests/servidor/familia` |
| `features/family-conversations/` | `tests/servidor/familia` y `tests/local/aventura` |
| `features/auth/`, `pages/auth/`, `store/accesoStore.ts`, `routes/GuardaAcceso.tsx`, `data/demo/usuariosPrueba.ts` | `tests/local/portales`, `tests/local/aventura` y `tests/servidor/acceso` |
| `lib/explorationAssets.ts` o recursos de `public/` | `npm run test:despliegue` |

## Reglas compartidas

Están en el `AGENTS.md` de la raíz del monorepo.
