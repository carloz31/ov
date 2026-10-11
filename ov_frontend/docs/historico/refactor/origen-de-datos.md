# Origen de los datos

Inventario al cerrar X de actividades por dominio (8 de octubre de 2026), conforme a la iteración 1. Las rutas parten de `src/`. Conserva presentación y persistencia; describe las consultas por dominio y el mapa de §7.1–7.4. Para las reglas de capas y tamaño, consulta `AGENTS.md`.

Verificado el 9 de octubre en F5 del anexo de cierre, perfil y resultados:
descripciones de F2 y datos del resultado de F4 contrastados con una SQLite
plataforma desechable y con el modo local. Se mantienen las fuentes descritas
abajo: fragmentos y ejemplos son presentación del front; duración es catálogo;
resultados, disponibilidad y progreso API son del servidor. Favoritos y planes
siguen siendo locales en ambos modos. No cambian claves, formatos ni consultas.
Recorrido, límites y comparación de suites en
`docs/student-experience/informe-f5-cierre-perfil-resultados.md`.

## 1. Del servidor (`VITE_DATOS=api`)

Dieciséis peticiones a través de los módulos concretos de `store/servidor/`: `sesion.ts`, `secciones.ts`, `avisos.ts`, `resultado.ts`, `consultas.ts`, `refresco.ts` y `operaciones.ts`. `cuenta.ts` conserva la cuenta seleccionada y su almacenamiento. `services/api/cliente.ts` contiene el único `fetch` y exporta `obtener` (GET), `enviar` (POST), `actualizar` (PATCH) y `eliminar` (DELETE), que solo se importan dentro de `services/api/`. Los siete módulos de recursos arman URL y cuerpo sin guardar estado ni leer la cuenta activa. Las peticiones actuales usan GET y POST; una respuesta 204 devuelve datos `undefined` sin leer JSON.

| Módulo | Función | Petición | La usa |
|---|---|---|---|
| `services/api/cuentas.ts` | `listarCuentas()` | `GET /cuentas` | ingreso |
| | `obtenerResumen(cuenta)` | `GET /cuentas/{c}/resumen` | ingreso, panel y nivel |
| | `obtenerProgreso(cuenta, tipo, codigo)` | `GET /cuentas/{c}/progreso/{tipo}/{codigo}` | `consultarProgreso` |
| | `obtenerDesbloqueosNoVistos(cuenta)` | `GET /cuentas/{c}/desbloqueos?solo_no_vistos=true` | `consultarNoVistos` |
| | `marcarDesbloqueosVistos(cuenta)` | `POST /cuentas/{c}/desbloqueos/marcar-vistos` `{}` | `marcarVistos` |
| `services/api/actividades.ts` | `obtenerActividades(cuenta)` | `GET /cuentas/{c}/actividades` | ingreso, mapa y acciones |
| `services/api/fichas.ts` | `obtenerFichas(cuenta)` | `GET /cuentas/{c}/fichas` | apertura de mochila o recurso |
| `services/api/logros.ts` | `obtenerLogros(cuenta)` | `GET /cuentas/{c}/logros` | apertura de perfil, pasaporte o insignia |
| `services/api/acciones.ts` | `ingresar(cuenta)` | `POST /acciones/ingresar` `{cuenta}` | ingreso |
| | `completarActividad(cuenta, actividad)` | `POST /acciones/completar-actividad` `{cuenta, actividad}` | `completarActividad` |
| | `responderItems(cuenta, actividad, respuestas)` | `POST /acciones/responder-items` `{cuenta, actividad, respuestas}` | `responderItems` |
| `services/api/instrumentos.ts` | `obtenerItems(actividad)` | `GET /actividades/{a}/items` | `consultarItems` |
| | `obtenerRespuestas(cuenta, actividad)` | `GET /cuentas/{c}/actividades/{a}/respuestas` | `consultarRespuestas` |
| | `obtenerAvance(cuenta)` | `GET /cuentas/{c}/instrumentos` | `consultarAvanceInstrumentos` |
| | `obtenerResultado(cuenta, instrumento)` | `GET /cuentas/{c}/instrumentos/{i}/resultado` | `cargarResultadoRiasec` |
| `services/api/demo.ts` | `reiniciar()` | `POST /demo/reiniciar` `{}` | `reiniciarDatosDePrueba` |

Con eso el servidor decide disponibilidad y finalización de actividades, acceso a la Ciudad, respuestas de Mara, resultado RIASEC y carreras afines, fichas obtenidas, insignias, nivel y avisos de desbloqueo.

Desde F2 del anexo de cierre, perfil y resultados, `ResultadoPublico.dimensiones[].descripcion`
y `dimensiones_destacadas[].descripcion` vienen del servidor en la consulta de resultado.
El adaptador de Helena conserva el texto recibido; no lo genera a partir del nombre.
Las descripciones locales RIASEC y los ejemplos por código son contenido de presentación
en `features/discovery/data/dimensionExamples.ts`. Los ejemplos permanecen en el front
también en modo API; desde F4 aparecen en el perfil completo y su guía.

La corrección visual de F4, aprobada el 9 de octubre de 2026, añade
`fragmentosResumen` en `features/discovery/data/dimensionExamples.ts`: seis textos
fijos de presentación autorizados por el usuario. Solo componen la frase del detalle
en el orden de `codigo_interes`; no sustituyen las descripciones remotas de las filas
y la guía, ni las descripciones completas del resumen del libro. Si falta un fragmento,
se muestran las tres descripciones completas como lista.

`CarreraResultado.duracion` es un campo opcional del modelo de presentación de la
feature, no del contrato API. En ambos modos procede literalmente de
`data/catalog/careersAndInstitutions.ts`, `careerCatalog.duration`, cruzando
`CarreraResultado.codigo` con `careerCatalog.id`. Se conserva «aproximadamente»;
si no existe coincidencia, se omite. Esta autorización sustituye la omisión inicial
del anexo F4 sin mover el dato al servidor ni modificar persistencia.

F4 usa `features/discovery/data/resultPages.ts` como configuración de `instrumento`
y `tipoResultado` en ambos modos: el almacén todavía no carga `GET /instrumentos`.
Es el respaldo expresamente autorizado por el anexo; no añade peticiones ni simula
la disponibilidad de instrumentos. `useResultPage` elige las secciones por ese tipo.
En API, todas las dimensiones, código, empate, perfil plano, coincidencias y vías
de carreras proceden del resultado RIASEC remoto. Los adaptadores solo importan tipos;
el dominio enriquece las ocupaciones con el catálogo existente cuando corresponde.
El nombre de una familia se resuelve por su mismo identificador en `careerFamilies`,
conservando el valor remoto si no hay etiqueta local. No se calculan afinidades en API.

Inteligencias mantiene la demostración en ambos modos, con su aviso explícito de
demostración: el libro avisa que el ejemplo no es personal y el detalle conserva
el aviso de instrumento aún no disponible. `demoIntelligences` en `features/discovery/lib/helenaPages.ts`
contiene las siete dimensiones y porcentajes aprobados en F4, marcados DATO DE PRUEBA;
sus descripciones proceden de `descripcionesInteligenciasDemo` en `dimensionExamples.ts`.
Las destacadas locales incluyen todos los máximos empatados. La misma plantilla y hook
admiten un resultado real con `dimensiones_destacadas`, sin sustituirlo por ese cálculo local.
El ejemplo local de intereses agrega R=50, E=45 y C=35, marcados DATO DE PRUEBA, para
completar las seis filas; conserva S=78, I=72 y A=66 y las descripciones de sus áreas. Las afinidades
y relaciones con carreras locales reutilizan `isAffine` y el catálogo existentes.
Favoritos y planes siguen en los almacenes actuales del navegador; no cambia ninguna
clave ni formato de persistencia. La guía, filas expandidas y filtros son estado de la vista.

Cada dominio guarda `datos`, `estado` (`sin_cargar`, `cargando`, `listo`, `vencido`, `error`) y `error`, solo en memoria. El ingreso confirmado habilita las consultas: resumen, actividades y no vistos en paralelo; RIASEC después si Elena está disponible. Fichas y logros se piden al abrir sus vistas. Los recursos cerrados dejan de contar como consumidores aunque sigan montados. Una acción actualiza actividades y avisos; `FICHA` vence fichas, `INSIGNIA` vence logros y `NIVEL` vence logros y resumen. Las secciones visibles se recargan inmediatamente; las demás esperan su apertura. Los reintentos conservan los recibos de escritura y solo repiten consultas.

`ActividadCuenta` incluye tipo, orden, contenido, visibilidad y visible. Desde F3, la lista y el orden de puntos en modo API vienen de esa sección; posición, etiqueta e ícono vienen del JSON por clave. Las secuencias consecutivas se agrupan y el reproductor recibe el código del servidor. Solo el modo local conserva su lista fija. El progreso cuenta actividades SIEMPRE visibles con contenido y mapa, sin extras. En X se retiran el tipo global y los dos fixtures anteriores; `obtenerEstado` ya se retiró en F2. Los dieciséis fixtures vigentes se exportan por dominio y conservan su contenido. Testimonios, preguntas del diario y conversaciones siguen sin servicio ni vista API en el front; están registrados en `docs/pendientes-interfaz.md`.

Desde F4b, `resumenPagina` en `features/discovery/lib/resultPage.ts` compone el
resumen del libro por `tipoResultado` y estado, sin trasladar puntajes a las filas.
Los intereses respetan el orden de las áreas adaptadas de `codigo_interes` y
muestran las tres descripciones completas; inteligencias usa las destacadas y sus
descripciones existentes. Los conteos API son `coincidencias.length` y
`carreras_recomendadas.length` del resultado remoto, omitiendo cantidades vacías
sin sustituirlas por demostraciones. En local se cuentan las mismas afinidades y
relaciones de catálogo que usa el detalle (`ocupacionesResultado` y
`carrerasResultado`). Los totales de dimensiones salen del perfil completo.
El perfil plano anuncia solo ese perfil. Los textos de cierre son contenido de
presentación aprobado en `docs/student-experience/spec-f4b-libro-helena-resumen.md`.
`guia=1` abre la guía de la vista completa y sigue siendo estado de interfaz;
no añade consultas ni modifica almacenamiento, disponibilidad o resultados.

## 2. Contenido del front (se queda en el front)

Lo define la regla compartida: el backend no interpreta el contenido narrativo.

| Qué | Destino |
|---|---|
| Ejemplos por código de dimensión y descripciones RIASEC solo para modo local | `features/discovery/data/dimensionExamples.ts` (`ejemplosDimension`, `descripcionesLocales`) |
| Nodos de las actividades (13 JSON con metadatos de mapa), registro por clave y catálogo local | `data/activities/contenidos/<clave>.json`, `data/activities/contenidos.ts` y `data/activities/content.ts`; `standardActivities.ts` conserva únicamente el catálogo `compassInstrument` |
| Configuración del piloto de reflexión (escenarios, criterios, misiones adicionales) | `data/activities/reflectionConfig.ts` |
| Personajes, textos de guía | `data/content/characters.ts`, `data/content/guideTexts.ts` |
| Recuerdos de Lumi | `features/journal/data/lumiMemories.ts` |
| Desafíos (bancos de preguntas, recompensas) | `data/content/challenges.ts` |
| Geometría y puntos del mapa, títulos de viajero, íconos de insignias | `features/adventure/lib/geometry.ts`, `features/adventure/lib/caminoPoints.ts`, `features/adventure/lib/ciudadPoints.ts`, `features/adventure/lib/pointDetails.ts`, `features/adventure/lib/missionSync.ts` y `features/adventure/lib/mapPoints.ts`; `features/discovery/lib/passport.ts`; títulos locales en `store/adventureStore.ts` |
| Rol del apoderado (motivación) | `features/parent/data/parentMotivation.ts` |
| Opciones de rol | `features/auth/data/roleOptions.ts` |

## 3. Catálogo fijo (hoy en el front; podría venir del servidor)

No se mueve al servidor en este refactor. Se agrupa para que, cuando una iteración lo haga, se reemplace en un solo lugar:

| Qué | Destino | Iteración que lo toca (plan) |
|---|---|---|
| Ocupaciones (`occupationCatalog`, `additionalOccupationCatalog`) | `data/catalog/occupations.ts`, `data/catalog/additionalOccupations.ts` | 3 (catálogos) |
| Carreras e instituciones | `data/catalog/careersAndInstitutions.ts` | 3 |
| Preguntas del diario | `data/content/journalPrompts.ts` | 3 (diario) |
| Caso del incendio forestal | `data/content/forestFireCase.ts` | 4 (casos) |
| Entrevistas de leyenda, videos y detalles de entrevistas | `data/content/adventure.ts`, `data/content/research.ts` | 4 (entrevistas) |
| Temas de conversaciones en familia | `data/content/familyConversations.ts` | 4 (familia) |
| Niveles de viajero (`travelerLevels`) | sigue en `store/adventureStore.ts` (en `api` ya usa `nivel_actual`) | — |

## 4. Datos de demostración (`DATO DE PRUEBA`)

Cada uno de estos archivos empieza con `// DATO DE PRUEBA: <qué es y qué lo reemplazará>`. Las exportaciones de demostración que viven en un archivo de contenido llevan el comentario sobre la exportación.

| Qué | Destino |
|---|---|
| Perfiles de estudiantes, cuestionarios y planes ficticios (orientadora y apoderado) | `data/demo/studentProfiles.ts` |
| Salones, personas y etiquetas del portal de la orientadora | `features/counselor/data/counselorPortal.ts`, `features/counselor/data/exampleStudents.ts` |
| Hijos y perfil del apoderado | `features/parent/data/parentPortal.ts` |
| Comentarios y reacciones de entrevistas, aliados y nivel de investigación | `data/content/research.ts` (`interviewDetails`, `demoLevel`, `receivedReactions`, `getAllies`) |
| Alias de salón, avisos, videos y lecturas de recursos | `data/content/adventure.ts` (`classroomAliases`, `resourceDemoNotices`, `resourceDemoVideos`, `resourceReading`) |
| Entradas y check-ins del diario de ejemplo | `data/content/journalPrompts.ts` (`journalDemoEntries`, `readinessDemoCheckIns`) |
| Perfiles de ocupación de ejemplo | `data/catalog/occupations.ts` (`mockOccupationProfiles`) |
| Intereses e inteligencias de ejemplo del libro de Helena | `features/discovery/lib/helenaPages.ts` (`demoInterests`, `demoIntelligences`); descripciones de inteligencias en `features/discovery/data/dimensionExamples.ts` |
| Conversaciones familiares de ejemplo | `data/content/familyConversations.ts` (`familyConversationDemoData`) |

`interviewDetails` tiene una sola definición en `data/content/research.ts`. `features/counselor/data/interviewDetails.ts` lo importa y conserva `reactionOptions`. Los dos portales consumen los mismos detalles.

## 5. Estado local (navegador)

Se conservan las claves y los formatos existentes. Todas las claves de la tabla usan `localStorage`, salvo donde se indica `sessionStorage` o IndexedDB. Cualquier cambio futuro requiere una migración que conserve los datos.

| Clave | Almacén | Contenido |
|---|---|---|
| `ov.demo-access.v1` (`sessionStorage`) | `features/auth/lib/demoAccess.ts` | sesión de demostración |
| `ov.cuenta-servidor.v1` (`sessionStorage`) | `store/servidor/cuenta.ts` | usuario y cuenta activa en `api` |
| `ov.missions.v2` / `ov.missions.v2.api` | `store/journeyStore.ts` | progreso, intentos, entregas y borradores de actividades |
| `ov.mission-files` (IndexedDB) | `store/journeyStore.ts` | archivos adjuntos |
| `ov.student-adventure.v1` / `ov.student-adventure.v1.api` | `store/adventureStore.ts` | aventura, diario, casos, investigación, conversaciones |
| `ov.student-discovery.v1` | `store/discoveryStore.ts` | visitas, favoritos, publicaciones, páginas reveladas |
| `ov.student-exploration.v1` | `store/explorationStore.ts` | intereses y hojas de decisión |
| `ov.student-reflections.v1` | `store/reflectionStore.ts` | respuestas y evaluaciones del piloto |
| `ov.student-followups.v1` | `features/activities/store/followUpStore.ts` | preguntas de seguimiento |
| `ov.student-ui.v1` | `store/studentUiStore.ts` | guías vistas, desbloqueos vistos, preferencias de interfaz |
| `ov.parent-missions.v1` | `features/parent/store/parentJourneyStore.ts` | actividades del apoderado |
| `ov.staff.priorities.v1` (`sessionStorage`) | `features/counselor/store/prioritySettings.ts` | prioridades de la orientadora |
| `ov.staff.selected-salon.v1` (`sessionStorage`) | `features/counselor/hooks/useSelectedSalon.ts` | salón elegido |

En API, las claves de actividades y aventura terminan en `.api` y contienen `por_cuenta[codigo]`; no se mezclan con el estado local ni entre cuentas. Descubrimiento conserva `profileBadgesApi[cuenta]` para la selección de insignias y `revealedPagesApi[cuenta][calculado_en]` para páginas reveladas de Helena dentro de `ov.student-discovery.v1`. Revelar una página o elegir insignias es una preferencia local: no obtiene ni completa nada en el servidor.

El servidor manda sobre disponibilidad y finalización. El navegador conserva borradores, nodo actual, comprobaciones, adjuntos, respuestas de brújula y lo que aún no cubre la iteración 1. Un error remoto se muestra como error; no se sustituye por un estado inventado. `prototypeAllUnlocked`, `studentDemoEnabled` y `pendingContent` no afectan la disponibilidad en API. En modo local se conservan los cálculos y el recorrido de demostración.

## 6. Recorrido de los datos

`services/api/` → `store/servidor/` → hooks del dominio → vistas. `types/servidor.ts` copia el contrato Pydantic y `lib/servidor/adaptadores.ts` lo convierte a los modelos de la interfaz; solo importa tipos. Las consultas conservan cachés, revisiones, cancelaciones y comprobaciones de cuenta activa.

Los hooks deciden entre datos remotos y locales y devuelven datos preparados, acciones y banderas del dominio. Las vistas no importan `modoApi` ni `desarrollo`. Los puntos principales son:

| Dominio | Hooks y responsabilidad |
|---|---|
| Ingreso | `features/auth/hooks/useLogin.ts`: guardar usuario, preparar ingreso, iniciar acceso y navegar, en ese orden. |
| Aventura | `features/adventure/hooks/`: sesión, sincronización, nivel, acceso a Ciudad, detalles del mapa, cuenta y novedades. |
| Actividades | `features/activities/hooks/useActivityCompletion.ts`, `features/activities/hooks/useActivityPlayer.ts`, `features/activities/hooks/useInstrumentResponses.ts`, `features/activities/hooks/useActivityResources.ts`, `features/activities/hooks/useActivityFinish.ts` y `features/activities/hooks/useInstrumentResult.ts`: navegación, respuestas, fichas, guardado y resultados. |
| Mochila | `features/backpack/hooks/useBackpack.ts`: selección por URL, disponibilidad, requisitos, errores, reintentos y acciones. |
| Descubrimiento | `features/discovery/hooks/useCatalogAffinity.ts`, `features/discovery/hooks/useStudentProfile.ts`, `features/discovery/hooks/usePassport.ts`, `features/discovery/hooks/useBadgeDetail.ts`, `features/discovery/hooks/useHelenaPages.ts` y `features/discovery/hooks/useResultPage.ts`: afinidades, nivel, insignias, páginas reveladas y resultado completo por tipo. |

La única llamada a `await completarActividad(` está en `move`, dentro de `features/activities/hooks/useActivityCompletion.ts`, al alcanzar `$fin`. Guardar respuestas, consultar, revelar o revisar no completa una actividad. Las referencias de envío y montaje se comparten con respuestas y cierre para coordinar guardado y navegación.

Cuando una iteración migre un dato al servidor, se actualizan su hook, los servicios y el almacén remoto, y este inventario. Las iteraciones futuras citadas en el catálogo son una previsión del plan, no trabajo autorizado para adelantar.
