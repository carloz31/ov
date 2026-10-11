# Origen de los datos

De dónde sale cada dato del front. Las rutas parten de `src/`. Si una tarea mueve un dato de un grupo a otro, actualiza este documento en la misma tarea.

## 1. Del servidor (`VITE_DATOS=api`)

`services/api/cliente.ts` tiene el único `fetch` y exporta `obtener` (GET), `enviar` (POST), `actualizar` (PATCH) y `eliminar` (DELETE). Los módulos de recursos solo arman URL y cuerpo: no guardan estado ni leen la cuenta activa. Una respuesta 204 devuelve `undefined`.

| Módulo | Función | Petición |
|---|---|---|
| `services/api/cuentas.ts` | `listarCuentas` | `GET /cuentas` |
| | `obtenerResumen` | `GET /cuentas/{c}/resumen` |
| | `obtenerProgreso` | `GET /cuentas/{c}/progreso/{tipo}/{codigo}` |
| | `obtenerDesbloqueosNoVistos` | `GET /cuentas/{c}/desbloqueos?solo_no_vistos=true` |
| | `marcarDesbloqueosVistos` | `POST /cuentas/{c}/desbloqueos/marcar-vistos` |
| `services/api/actividades.ts` | `obtenerActividades` | `GET /cuentas/{c}/actividades` |
| `services/api/fichas.ts` | `obtenerFichas` | `GET /cuentas/{c}/fichas` |
| `services/api/logros.ts` | `obtenerLogros` | `GET /cuentas/{c}/logros` |
| `services/api/acciones.ts` | `ingresar`, `completarActividad`, `responderItems` | `POST /acciones/ingresar`, `/completar-actividad`, `/responder-items` |
| `services/api/instrumentos.ts` | `obtenerItems`, `obtenerRespuestas`, `obtenerAvance`, `obtenerResultado` | `GET /actividades/{a}/items`, `/cuentas/{c}/actividades/{a}/respuestas`, `/cuentas/{c}/instrumentos`, `/cuentas/{c}/instrumentos/{i}/resultado` |
| `services/api/desarrollo.ts` | `reiniciar` | `POST /desarrollo/reiniciar` |

Con eso el servidor decide: disponibilidad y finalización de actividades, acceso a la Ciudad, respuestas de Mara, resultado RIASEC (dimensiones con su descripción, código de interés, coincidencias y carreras), fichas obtenidas, insignias, nivel y avisos de desbloqueo.

**Actividades del apoderado.** En api, bloque, lista, orden, títulos, disponibilidad, completitud y progreso vienen de `GET /cuentas/{c}/actividades`, para el espacio `PORTAL_FAMILIA`. Los nodos siguen en los JSON del front, encontrados por `contenido`; una actividad invisible o sin contenido se descarta y no cuenta en el progreso. Los requisitos del JSON solo deciden candados en local.

`store/servidor/apoderado.ts` mantiene una sesión independiente de la del estudiante. Al entrar pide `/cuentas`, elige la cuenta `APODERADO` que coincide con el usuario ingresado (o la primera por código), registra `/acciones/ingresar` y consulta sus actividades. La cuenta elegida vive en memoria y se vuelve a elegir al recargar; no se crea otra clave del navegador. Al terminar, envía `/acciones/completar-actividad` y vuelve a consultar actividades antes de mostrar el cierre. Un error conserva el último paso para reintentar.

**Estado sincronizado (`store/servidor/`).** `sesion.ts`, `secciones.ts`, `avisos.ts`, `resultado.ts`, `consultas.ts`, `refresco.ts`, `operaciones.ts` y `cuenta.ts`. Cada dominio es una sección en memoria con `datos`, `estado` (`sin_cargar`, `cargando`, `listo`, `vencido`, `error`) y `error`. Se descartan respuestas de otra cuenta o sesión y no se duplican pedidos en curso. Qué se pide y cuándo: `ov_backend/docs/sistema/integracion.md`.

**Mapa en modo api.** La lista y el orden de los puntos salen de `actividades`; la posición, la etiqueta y el ícono, del campo `mapa` del JSON de contenido. Las actividades consecutivas con el mismo contenido forman un punto. Un contenido sin `mapa` no se dibuja y se anota en `pendientes-interfaz.md`. El modo local conserva su lista fija (`baseRoute`, `fieldMissions`).

**Resultados (libro de Helena).** En modo api, dimensiones, código, empate, perfil plano, coincidencias y carreras vienen del resultado remoto; no se calculan afinidades. Se completan con presentación del front:

- Descripción de cada dimensión: del servidor. Ejemplos por dimensión (`ejemplosDimension`), fragmentos del resumen (`fragmentosResumen`) y descripciones del modo local (`descripcionesLocales`): `features/discovery/data/dimensionExamples.ts`.
- Duración de una carrera: `data/catalog/careersAndInstitutions.ts` (`careerCatalog.duration`), cruzando por código; si no hay coincidencia, se omite.
- Tipo de resultado por página: `features/discovery/data/resultPages.ts` (el almacén todavía no carga `GET /instrumentos`).
- Familias: etiqueta local de `careerFamilies` por el mismo id; si no existe, el valor remoto.
- Inteligencias: siempre la demostración `demoIntelligences` (`features/discovery/lib/helenaPages.ts`, `DATO DE PRUEBA`), con aviso de que no es personal. El instrumento real llega en su iteración.

## 2. Contenido del front

El backend no interpreta el contenido narrativo.

| Qué | Dónde |
|---|---|
| Nodos de las actividades (JSON con metadatos de mapa), registro por clave y catálogo local | `data/activities/contenidos/<clave>.json`, `data/activities/contenidos.ts`, `data/activities/content.ts`. Formato: `docs/contenidos-actividades.md`. |
| Personajes, recursos e instrumentos del reproductor | `data/activities/catalogo.json`; brújula en `data/activities/standardActivities.ts` (`compassInstrument`) |
| Configuración del piloto de reflexión | `data/activities/reflectionConfig.ts` |
| Personajes y textos de guía | `data/content/characters.ts`, `data/content/guideTexts.ts` |
| Recuerdos de Lumi | `features/journal/data/lumiMemories.ts` |
| Desafíos | `data/content/challenges.ts` |
| Geometría y puntos del mapa | `features/adventure/lib/` (`geometry`, `caminoPoints`, `ciudadPoints`, `pointDetails`, `missionSync`, `mapPoints`) |
| Títulos de viajero e íconos de insignias | `features/discovery/lib/passport.ts`; títulos locales en `store/adventureStore.ts` |
| Rol del apoderado y opciones de rol | `features/parent/data/parentMotivation.ts`, `features/auth/data/roleOptions.ts` |

## 3. Catálogo fijo (en el front; podría venir del servidor)

| Qué | Dónde | Iteración que lo toca |
|---|---|---|
| Ocupaciones | `data/catalog/occupations.ts`, `data/catalog/additionalOccupations.ts` | 3 |
| Carreras e instituciones | `data/catalog/careersAndInstitutions.ts` | 3 |
| Preguntas del diario | `data/content/journalPrompts.ts` | 3 |
| Caso del incendio forestal | `data/content/forestFireCase.ts` | 4 |
| Entrevistas de leyenda, videos y detalles | `data/content/adventure.ts`, `data/content/research.ts` | 4 |
| Temas de conversaciones en familia | `data/content/familyConversations.ts` | 4 |
| Niveles de viajero (modo local) | `store/adventureStore.ts` (en api se usa `nivel_actual`) | — |

## 4. Datos de demostración (`DATO DE PRUEBA`)

| Qué | Dónde |
|---|---|
| Perfiles, cuestionarios y planes ficticios (orientadora y apoderado) | `data/demo/studentProfiles.ts` |
| Salones y personas de la orientadora | `features/counselor/data/counselorPortal.ts`, `features/counselor/data/exampleStudents.ts` |
| Hijos y perfil del apoderado | `features/parent/data/parentPortal.ts` |
| Comentarios, reacciones, aliados y nivel de investigación | `data/content/research.ts` (`interviewDetails` es la única definición; la orientadora la importa) |
| Alias de salón, avisos, videos y lecturas de recursos | `data/content/adventure.ts` |
| Entradas y check-ins de ejemplo | `data/content/journalPrompts.ts` |
| Perfiles de ocupación de ejemplo | `data/catalog/occupations.ts` (`mockOccupationProfiles`) |
| Intereses e inteligencias de ejemplo del libro de Helena | `features/discovery/lib/helenaPages.ts`; descripciones en `features/discovery/data/dimensionExamples.ts` |
| Conversaciones familiares de ejemplo | `data/content/familyConversations.ts` |

## 5. Estado local (navegador)

Todas en `localStorage`, salvo donde se indica. No se cambian sin una migración que conserve lo guardado.

| Clave | Almacén | Contenido |
|---|---|---|
| `ov.demo-access.v1` (`sessionStorage`) | `features/auth/lib/demoAccess.ts` | sesión de demostración |
| `ov.cuenta-servidor.v1` (`sessionStorage`) | `store/servidor/cuenta.ts` | usuario ingresado compartido y cuenta activa del estudiante en api; la cuenta del apoderado solo vive en memoria |
| `ov.missions.v2` / `ov.missions.v2.api` | `store/journeyStore.ts` | progreso, intentos, entregas y borradores |
| `ov.mission-files` (IndexedDB) | `store/journeyStore.ts` | archivos adjuntos |
| `ov.student-adventure.v1` / `ov.student-adventure.v1.api` | `store/adventureStore.ts` | aventura, diario, casos, investigación, conversaciones |
| `ov.student-discovery.v1` | `store/discoveryStore.ts` | visitas, favoritos, publicaciones, páginas reveladas |
| `ov.student-exploration.v1` | `store/explorationStore.ts` | intereses y hojas de decisión |
| `ov.student-reflections.v1` | `store/reflectionStore.ts` | respuestas y evaluaciones del piloto |
| `ov.student-followups.v1` | `features/activities/store/followUpStore.ts` | preguntas de seguimiento |
| `ov.student-ui.v1` | `store/studentUiStore.ts` | guías vistas, desbloqueos vistos, preferencias |
| `ov.parent-missions.v1` | `store/parentJourneyStore.ts` | nodo, intentos y elecciones por cuenta del apoderado; en api, estado proyectado del servidor |
| `ov.staff.priorities.v1` (`sessionStorage`) | `features/counselor/store/prioritySettings.ts` | prioridades de la orientadora |
| `ov.staff.selected-salon.v1` (`sessionStorage`) | `features/counselor/hooks/useSelectedSalon.ts` | salón elegido |

En api, las claves `.api` guardan `por_cuenta[codigo]` y no se mezclan con el modo local ni entre cuentas. `ov.student-discovery.v1` guarda además `profileBadgesApi[cuenta]` y `revealedPagesApi[cuenta][calculado_en]`: revelar una página o elegir insignias es una preferencia local, no completa nada en el servidor. El navegador conserva borradores, nodo actual, comprobaciones, adjuntos, respuestas de la brújula, favoritos y planes.

El apoderado conserva el formato de `ov.parent-missions.v1`: `accounts[apo-prototipo]` para local y `accounts[codigo]` (por ejemplo, `apo-rosa`) para api. `proyectarJourney` conserva nodo, intentos y elecciones al hidratar esa cuenta, pero fija su estado desde el servidor. La lista y el diploma en api usan la completitud remota. Hijos, resultados del hijo y nombre del apoderado siguen siendo demostración; sus pendientes están en `docs/pendientes-interfaz.md`.

## 6. Recorrido de los datos

`services/api/` → `store/servidor/` → hooks del dominio → vistas. `types/servidor.ts` copia el contrato y `lib/servidor/adaptadores.ts` lo convierte a los modelos de la interfaz (solo importa tipos). Los hooks deciden entre dato remoto y local; las vistas no importan `modoApi` ni `desarrollo`.

| Dominio | Hooks |
|---|---|
| Ingreso | `features/auth/hooks/useLogin.ts` |
| Aventura | `features/adventure/hooks/` (sesión, sincronización, nivel, Ciudad, detalles del mapa, cuenta, novedades) |
| Actividades | `features/activities/hooks/` (`useActivityCompletion`, `useActivityPlayer`, `useInstrumentResponses`, `useActivityResources`, `useActivityFinish`, `useInstrumentResult`) |
| Apoderado | `features/parent/hooks/useParentActivities.ts` elige la fuente; `useParentActivitySession`, `useParentQuestion` y `useParentOverview` consumen la cuenta, ruta y progreso seleccionados |
| Mochila | `features/backpack/hooks/useBackpack.ts` |
| Descubrimiento | `features/discovery/hooks/` (`useCatalogAffinity`, `useStudentProfile`, `usePassport`, `useBadgeDetail`, `useHelenaPages`, `useResultPage`) |

El estudiante completa desde `move`, en `useActivityCompletion.ts`, al alcanzar `$fin`. El apoderado completa desde `useParentActivitySession` mediante `completarActividadApoderado`, antes de abandonar el último nodo. Ambos esperan la confirmación y el refresco del servidor en api; en local conservan su completitud local.
