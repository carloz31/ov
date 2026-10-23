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
| `services/api/acciones.ts` | `ingresar`, `completarActividad`, `responderItems`, `resolverBatalla`, `resolverCaso`, `verTestimonio` | `POST /acciones/ingresar`, `/completar-actividad`, `/responder-items`, `/resolver-batalla`, `/resolver-caso`, `/ver-testimonio` |
| `services/api/batallas.ts` | `obtenerBatallas` | `GET /cuentas/{c}/batallas` |
| `services/api/casos.ts` | `obtenerCasos`, `obtenerColeccion` | `GET /cuentas/{c}/casos`, `/cuentas/{c}/coleccion` |
| `services/api/testimonios.ts` | `obtenerTestimonios` | `GET /cuentas/{c}/testimonios` |
| `services/api/instrumentos.ts` | `obtenerCatalogo`, `obtenerItems`, `obtenerRespuestas`, `obtenerAvance`, `obtenerResultado`, `obtenerHistorial`, `obtenerComparacion` | `GET /instrumentos`, `/actividades/{a}/items`, `/cuentas/{c}/actividades/{a}/respuestas`, `/cuentas/{c}/instrumentos`, `/cuentas/{c}/instrumentos/{i}/resultado?aplicacion=`, `/historial`, `/comparacion` |
| `services/api/secciones.ts` | `obtenerSecciones` | `GET /cuentas/{c}/secciones` |
| `services/api/registro.ts` | `obtenerItemsRegistro`, `obtenerRegistro`, `enviarBorrador`, `enviarEntrega`, `enviarRespuestaSeguimiento`, `enviarContinuarSinResponder`, `enviarEdicion` | `GET /actividades/{a}/items-registro`, `/cuentas/{c}/actividades/{a}/registro`; `POST /acciones/registro/guardar-borrador`, `/entregar`, `/responder-seguimiento`, `/continuar-sin-responder`, `/editar` |
| `services/api/referencias.ts` | `obtenerReferencias` | `GET /cuentas/{c}/actividades/{a}/referencias` |
| `services/api/familia.ts` | `obtenerFamilia`, `obtenerResultadosHijo` | `GET /cuentas/{c}/familia`, `/cuentas/{c}/familia/resultados` |
| `services/api/acciones.ts` (F03) | `revelarResultado`, `reiniciarInstrumento` | `POST /acciones/revelar-resultado`, `/acciones/reiniciar-instrumento` |
| `services/api/desarrollo.ts` | `reiniciar` | `POST /desarrollo/reiniciar` |

Con eso el servidor decide: disponibilidad y finalización de actividades, acceso a la Ciudad, secciones del perfil abiertas (diario, check-in, catálogo, planes, familia), respuestas de Mara, resultado RIASEC (dimensiones con su descripción, código de interés, coincidencias y carreras), fichas obtenidas, insignias, nivel y avisos de desbloqueo.

**Textos de cada actividad (F00).** En api, todo lo que muestran el drawer, la lista del panel, el letrero de tramo, el encabezado del reproductor y el cierre sale del servidor:
- el título;
- la descripción, que si llega nula no se muestra;
- el tipo y la duración, que forman la etiqueta «Test · 10 min» y no muestran tiempo si llega nulo;
- el nombre del bloque, que hace de región y de letrero;
- si es opcional;
- el mensaje de bloqueo (`bloqueo[0].mensaje` de la actividad o de su bloque).

Del JSON solo se usan los nodos y la posición. Lo que dice Lumi ante algo cerrado sale de `textosBloqueo` (`data/content/guideTexts.ts`), seguido del mensaje del servidor.

**Registros (F01).** En api, un registro del Camino se abre con `RegistroServidorPlayer`: lee los ítems (consigna, obligatoriedad y elección) y lo guardado (borradores, opciones elegidas, `posicion` y conversación). El borrador se guarda en el servidor solo al pulsar «Guardar y continuar» o «Entregar»; la entrega, las preguntas de seguimiento (responder o continuar sin responder) y `items_por_ampliar` vienen del servidor. Desde F02, un registro cerrado se consulta en el mismo reproductor (solo sus consignas, con la respuesta consolidada y la pista de los ítems por ampliar); se lee primero y «Modificar» abre el componente de siempre; cambiar el texto o la elección lo edita con `POST /acciones/registro/editar` (con `opciones` solo si la elección cambió) y el mismo seguimiento. Los cambios viven en memoria hasta «Entregar cambios»: tras cerrar no hay borradores. Las elecciones que retoman una anterior (lo elegido la vez pasada llega marcado) y los ecos leen `GET …/referencias` al abrir el registro (`store/servidor/referencias.ts`). La visibilidad es una regla fija por tipo: todo registro lo ven el estudiante y su orientadora («Visible para ti y tu orientadora. Se guarda en tu cuenta.»); el diario es privado. En local siguen `journeyStore` y `followUpStore`.

**Batallas, casos y testimonios (F04).** En api, cada intento de batalla y de caso se envía al servidor, que decide si se superó (el caso, con su `puntaje_minimo`), guarda la colección de íconos y abre los testimonios. Problemas, presupuesto, pistas y el cálculo del puntaje del caso siguen en el front, igual que la presentación del desafío (personaje, ilustración, narrativa) (`challenges.ts`, `forestFireCase.ts`). Desde F04b, las preguntas de cada intento de batalla las da el servidor (`GET /cuentas/{c}/batallas/{a}/preguntas`, sin caché), cada una con su ficha; las fichas de una batalla (drawer «Se alimenta de» y repaso) salen de `GET batallas`. Desde F04c, también las vidas del enemigo y los destellos; el servidor decide la victoria y su respuesta arma el cierre (el cálculo local solo anima). Desde F04d, la respuesta trae también `fichas_repaso` (las fichas de las preguntas falladas), que el cierre ofrece para repasar.

**Fichas y visor (F04d).** En api, las fichas de la mochila son las de `GET /cuentas/{c}/fichas` (título y estado del servidor), con el contenido del catálogo del front buscado por código; aparecen en cuanto se desbloquean. Toda ficha se presenta con el visor de la mochila (`VisorRecurso`): en la mochila, en el reproductor y el cierre de actividad (modo `mochila`) y en la intro y el cierre de la batalla (modo `repaso`), encima de la pantalla y sin navegar (`store/visorRecursoStore.ts`). Desde el drawer del mapa se abre en la mochila con `?ficha=`. Mientras haya una ficha (o su pop up de requisito) abierta, los avisos automáticos de Lumi, como el tutorial de la mochila, esperan a que se cierre y no se marcan como vistos si no llegaron a mostrarse. El puntaje del caso es `100 × satisfacción / satisfacción máxima` de su definición (un decimal); el presupuesto agotado envía 0. Las acciones con desbloqueos (registro, batalla, caso) refrescan con `accionConRefresco` (`store/servidor/refresco.ts`): toasts y revelado de opcionales, como completar. La práctica de una batalla sale de `GET batallas`; los intentos y el mejor puntaje del caso, de `GET casos`; los íconos obtenidos del catálogo, de `GET coleccion`, y los testimonios de la mochila, de `GET testimonios`. En local siguen `challengeResults`, `caseBestScores`, `solvedCaseIds` y los perfiles de exploración.

**Actividades del apoderado.** En api, bloque, lista, orden, títulos, descripción (el subtítulo de la tarjeta), disponibilidad, mensaje de bloqueo, completitud y progreso vienen de `GET /cuentas/{c}/actividades`, para el espacio `PORTAL_FAMILIA`. Los nodos siguen en los JSON del front, encontrados por `contenido`; una actividad invisible o sin contenido se descarta y no cuenta en el progreso, y un contenido sin nodos (`t_apo_carta` hasta F08) se lista pero no se inicia. Los requisitos del JSON solo deciden candados en local.

**Familia del apoderado (F00).** `GET /cuentas/{c}/familia` da el hijo vinculado (nombre y avance) y el avance propio hacia el diploma. Lo usan el resumen de «Mis hijos», «Mis actividades», el cierre de actividad, el detalle de cuestionario y el aviso de conversaciones. Se pide con la carga inicial del portal y otra vez al completar una actividad. Los resultados del hijo siguen pendientes de F08.

`store/servidor/apoderado.ts` mantiene una sesión independiente de la del estudiante. Al entrar toma la cuenta `APODERADO` de la sesión, registra `/acciones/ingresar` y consulta sus actividades y su familia. La cuenta elegida vive en memoria y se vuelve a elegir al recargar; no se crea otra clave del navegador. Al terminar, envía `/acciones/completar-actividad` y vuelve a consultar actividades antes de mostrar el cierre. Un error conserva el último paso para reintentar.

**Estado sincronizado (`store/servidor/`).** `sesion.ts`, `secciones.ts`, `avisos.ts`, `resultado.ts`, `consultas.ts`, `refresco.ts`, `operaciones.ts` y `cuenta.ts`. Cada dominio es una sección en memoria con `datos`, `estado` (`sin_cargar`, `cargando`, `listo`, `vencido`, `error`) y `error`. Se descartan respuestas de otra cuenta o sesión y no se duplican pedidos en curso. Las secciones del perfil (`secciones`) se piden al ingresar, junto con el resumen y las actividades, porque sus accesos se ven siempre en el panel. `porRevelar` guarda en memoria, sin tocar el navegador, las actividades que una acción desbloquea o vuelve visibles, para que el mapa las revele una por una. Qué se pide y cuándo: `ov_backend/docs/sistema/integracion.md`.

**Mapa en modo api.** La lista y el orden de los puntos salen de `actividades`, y el Camino reúne los bloques del espacio `MISIONES_CAMPO`. La posición, el ícono y el origen de la línea de una opcional (`mapa.origen`) salen del JSON de contenido. Las actividades consecutivas con el mismo contenido forman un punto.
- Un contenido sin `mapa` no se dibuja.
- Un contenido sin nodos dibuja el punto como «Contenido pendiente».
- Las opcionales con origen van fuera del camino, como las misiones adicionales.
- El modo local conserva su lista fija (`baseRoute`, `fieldMissions`).

**Resultados (libro de Helena).** En modo api, dimensiones, código, empate, perfil plano, coincidencias y carreras vienen del resultado remoto; no se calculan afinidades. F03: el estado de cada página (sellada, lista para revelar, descifrada) sale del avance de instrumentos (`store/servidor/instrumentos.ts`), el revelado y el reinicio son acciones del servidor, y partida y llegada muestran zonas y comparación sin puntajes. El reinicio usado se deduce del historial. Se completan con presentación del front:

- Descripción de cada dimensión: del servidor. Ejemplos por dimensión (`ejemplosDimension`), fragmentos del resumen (`fragmentosResumen`) y descripciones del modo local (`descripcionesLocales`): `features/discovery/data/dimensionExamples.ts`.
- Duración de una carrera: `data/catalog/careersAndInstitutions.ts` (`careerCatalog.duration`), cruzando por código; si no hay coincidencia, se omite.
- Tipo de resultado por página: `features/discovery/data/resultPages.ts`. Zonas en palabras: `lib/servidor/adaptadoresInstrumentos.ts`; el servidor manda el código (`FUERTE`, `EN_CAMINO`, `POR_TRABAJAR`) y `features/discovery/lib/partidaLlegada.ts` le da posición (Por trabajar → En camino → Fuerte), cuenta las que subieron y arma los dos estados de la página I (solo partida; partida y llegada). Con solo la partida, las respuestas ítem por ítem salen de `/items` y `/respuestas` de las actividades de `APL-PARTIDA` (del catálogo), pedidas en paralelo al abrir la vista explicada, con carga y error propios (`respuestasPartida` en `store/servidor/sesion.ts`). Los textos de la tarjeta, la vista explicada y la guía de zonas son del front; nunca se leen puntajes. Con la partida lista para revelar, el libro pide además el catálogo para contar sus dimensiones («tu zona en las N partes»); si no responde, el texto no las cuenta.
- Revelado (tarjeta lista para revelar, en las cuatro páginas): nombres cortos del resultado y líneas «Adentro:» en `features/discovery/data/revealTexts.ts` (el de habilidades sociales es provisional). El chip de alcance (`ScopeChip`) usa el valor fijo del front (`required` de cada página; partida y llegada, siempre «Para tu proyecto») hasta que el backend exponga si el instrumento es prioritario en el salón (lote B18).
- Familias: etiqueta local de `careerFamilies` por el mismo id; si no existe, el valor remoto.
- Inteligencias: siempre la demostración `demoIntelligences` (`features/discovery/lib/helenaPages.ts`, `DATO DE PRUEBA`), con aviso de que no es personal. El instrumento real llega en su iteración.

## 2. Contenido del front

El backend no interpreta el contenido narrativo.

| Qué | Dónde |
|---|---|
| Nodos de las actividades (JSON con metadatos de mapa), registro por clave y catálogo local | `data/activities/contenidos/<clave>.json`, `data/activities/contenidos.ts`, `data/activities/content.ts`. Formato: `docs/contenidos-actividades.md`. |
| Personajes, recursos e instrumentos del reproductor | `data/activities/catalogo.json`; brújula en `data/activities/standardActivities.ts` (`compassInstrument`) |
| Configuración del piloto de reflexión | `data/activities/reflectionConfig.ts` |
| Personajes y textos de guía | `data/content/characters.ts`, `data/content/guideTexts.ts`: `sectionIntros` (presentación de primera vez de cada sección del estudiante: su propósito, 1 o 2 pasos), `guideSteps` (ayuda del botón «Abrir guía»: cómo se usa, 1 a 4 pasos) y `parentGuides` (guía de cada pantalla principal del apoderado, con `GuideDialogue`). Varios textos son `DATO DE PRUEBA`. |
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
| Hijos y perfil del apoderado (en api solo el parentesco y los resultados; el nombre, el hijo y su avance vienen del servidor) | `features/parent/data/parentPortal.ts` |
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
| `ov.acceso.v1` | `store/accesoStore.ts` | sesión `{token, expira_en, cuenta}`. En modo local, `token` es nulo y la cuenta sale de los usuarios de prueba (`data/demo/usuariosPrueba.ts`). En api, la cuenta activa del estudiante y la del apoderado salen de aquí. Reemplazó en B17 a `ov.demo-access.v1` y `ov.cuenta-servidor.v1` (`sessionStorage`) sin migración: eran claves de sesión y basta volver a ingresar. |
| `ov.missions.v2` / `ov.missions.v2.api` | `store/journeyStore.ts` | progreso, intentos, entregas y borradores |
| `ov.mission-files` (IndexedDB) | `store/journeyStore.ts` | archivos adjuntos |
| `ov.student-adventure.v1` / `ov.student-adventure.v1.api` | `store/adventureStore.ts` | aventura, diario, casos, investigación, conversaciones |
| `ov.student-discovery.v1` | `store/discoveryStore.ts` | visitas, favoritos, publicaciones, páginas reveladas |
| `ov.student-exploration.v1` | `store/explorationStore.ts` | intereses y hojas de decisión |
| `ov.student-reflections.v1` | `store/reflectionStore.ts` | respuestas y evaluaciones del piloto |
| `ov.student-followups.v1` | `features/activities/store/followUpStore.ts` | preguntas de seguimiento |
| `ov.student-ui.v1` | `store/studentUiStore.ts` | guías vistas (`introsSeen`: presentación de primera vez por sección; pasará al servidor con 2A), desbloqueos vistos, preferencias |
| `ov.parent-missions.v1` | `store/parentJourneyStore.ts` | nodo, intentos y elecciones por cuenta del apoderado; en api, estado proyectado del servidor |
| `ov.staff.priorities.v1` (`sessionStorage`) | `features/counselor/store/prioritySettings.ts` | prioridades de la orientadora |
| `ov.staff.selected-salon.v1` (`sessionStorage`) | `features/counselor/hooks/useSelectedSalon.ts` | salón elegido |

En api, las claves `.api` guardan `por_cuenta[codigo]` y no se mezclan con el modo local ni entre cuentas. `ov.student-discovery.v1` guarda además `profileBadgesApi[cuenta]` y `revealedPagesApi[cuenta][calculado_en]`: elegir insignias o revelar una página de ejemplo (inteligencias) es una preferencia local; desde F03, partida, llegada e intereses se revelan en el servidor. El navegador conserva borradores, nodo actual, comprobaciones, adjuntos, respuestas de la brújula, favoritos y planes.

El apoderado conserva el formato de `ov.parent-missions.v1`: `accounts[apo-prototipo]` para local y `accounts[codigo]` (por ejemplo, `apo-rosa`) para api. `proyectarJourney` conserva nodo, intentos y elecciones al hidratar esa cuenta, pero fija su estado desde el servidor. La lista y el diploma en api usan la completitud remota. En api, el nombre del apoderado sale de la sesión, y el hijo y su avance, de `familia`. El parentesco y los resultados del hijo siguen siendo demostración; sus pendientes están en `docs/pendientes-interfaz.md`.

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
