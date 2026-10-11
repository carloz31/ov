La interfaz del estudiante ahora se rige por `docs/student-experience/especificacion-interfaz-inmersiva-estudiante.md`.

## Actualización: progreso y retroalimentación de padres — 6 de octubre de 2026

El reproductor de padres incorpora la presentación y la evaluación de hasta dos intentos acordadas. Inicio y cierre comparten `parentRoute` para el diploma, y el repaso funciona en memoria. Los registros históricos se conservan; el estudiante mantiene su evaluación anterior. Los acuerdos, las ocho transiciones y los resultados de verificación están en [progreso y retroalimentación del apoderado](parent-experience/progreso-retroalimentacion.md).

## Actualización: actividades comunes — 5 de octubre de 2026

La entrega descrita en `especificacion-actividades-comunes.md` actualiza el modelo y complementa el registro histórico de implementación de este documento. ACT-07 ya tiene contenido real y se incorpora al Camino después de mitos. La reflexión escrita e22 del encuentro se reemplaza por una pregunta de aplicación.

El portal del apoderado usa el mismo modelo `Actividad`, evaluación y criterio de completitud, con un reproductor sobrio independiente. Su progreso y fichas se guardan por cuenta en `ov.parent-missions.v1`. Las actividades antiguas y los compromisos guardados se conservan como datos históricos; no conceden el diploma nuevo ni personalizan la carta predeterminada.

Los acuerdos, la migración del Camino y los límites de esta entrega están registrados en `student-experience/plan.md`.

# Actividades dentro de Aventura

Las rutas `/student/missions` y `/student/exploration` forman una sola sección llamada **Aventura**. El usuario cambia entre **Camino** y **Ciudad** mediante un selector sobre el mapa. Se conserva el mapa original de cada zona y no se modifica el funcionamiento de los casos.

El contenido usa el modelo v2 y los cuatro JSON proporcionados. Se conserva en `src/features/missions/data`; `docs/mission-spec.md` conserva la especificación recibida.

## Alcance

- El camino conserva sus siete nodos, trazado, estados y progreso. Sus fichas identifican actividades informativas, de registro y tests.
- `Más allá de los mitos` abre el encuentro informativo del archivo recibido.
- `Un camino propio` abre el registro visual de línea de tiempo del archivo recibido.
- La ciudad conserva sus casos y la estación de investigación. Se agregó el molino como nodo independiente, identificado como **Test · Interacción 1 de 14**.
- Las actividades v2 reutilizan la misma barra superior, modo de salida, fondo, tipografía, panel de ruta y estructura de tarjeta que las actividades anteriores. Al abrirse ocupan toda la pantalla y cubren la navegación general.
- Las fichas de actividades completadas muestran el estado **Completada**, la pregunta final y un enlace a una entrada nueva del diario con título, actividad y pregunta precargados.
- Motor de los siete nodos, presentación narrativa/directa, reacciones y bloques de diapositivas.
- Retos con selección exacta, pistas progresivas, explicación y registro de todos los intentos. Sin puntaje visible.
- Registro de línea de tiempo con pestañas móviles, siete entregas obligatorias, archivo alternativo más identidad, borradores y versiones conservadas.
- Recursos guardados disponibles en `/student/resources`; versiones y retos compartidos visibles en `/counselor/adventure`. Los registros `solo_estudiante` se excluyen de orientación.
- Los archivos se guardan como blobs en IndexedDB antes de registrar la entrega; se pueden descargar desde el mapa y orientación.
- Las demás actividades del camino mantienen su contenido y almacenamiento anteriores, porque no se recibió contenido v2 para sustituirlas.

## Límites del contenido de muestra

ACT-05 no fue entregada. Mara tiene requisitos vacíos, como en su JSON. El encuentro de mitos y el mapa se abren desde sus nodos del camino; el test se abre desde el nodo nuevo de la ciudad.

Solo está disponible TIP-01. TIP-02 a TIP-14, los códigos oficiales y la clave siguen pendientes. Elena tiene un nodo de resultado listo, pero no puede abrirse hasta completar las 14 interacciones y disponer de una clave sin marcadores provisionales. No se generan perfiles con la clave de ejemplo. La revisión del mapa está disponible desde la central; ACT-18 podrá reutilizar esa misma actividad cuando se incorpore su contenido.

Los PNG de los personajes no fueron incluidos. El componente acepta sus URLs y expresiones; utiliza retratos vectoriales de respaldo cuando faltan. Los recursos sin URL/contenido se indican como pendientes y no se presentan como reproducibles. Se conservaron las afirmaciones y fuentes del encuentro tal como fueron entregadas; su validación por orientación sigue pendiente según la especificación.

## Persistencia del prototipo

`ov.missions.v2` contiene progreso, respuestas, intentos, entregas, resultados, recompensas y borradores. `ov.mission-files` almacena los archivos en IndexedDB. Es un estudiante local (`est-prototipo`), sin servidor, autenticación ni sincronización entre dispositivos. Los permisos de visibilidad son filtros de presentación del prototipo, no autorización de backend.

Las escrituras fallidas muestran un aviso y no avanzan el nodo ni conceden una recompensa. Las recompensas se aplican una sola vez por actividad. Las entregas nuevas conservan las versiones anteriores. No se migra ni se sobreescribe `ov.student-adventure.v1`; los niveles y logros antiguos mantienen su criterio anterior.

## Verificación

`npm.cmd run build`, `npm.cmd run lint` y `npm.cmd test`. Las pruebas cubren lógica pedagógica, mínimo de caracteres, archivo alternativo, límites de archivos, versiones, idempotencia, reanudación, fallos de almacenamiento, bloqueo del perfil y renderizado de rutas y nodos.

El adaptador de renderizado de pruebas admite ahora JSON. Se actualizó la expectativa del antiguo mapa al nuevo recorrido. También se corrigió una expectativa anterior que buscaba eventos en la pestaña inicial de publicaciones: los eventos permanecen en su pestaña propia.

La herramienta de navegador informó que no había un navegador conectado. Queda pendiente la comprobación visual interactiva en escritorio/móvil y una carga/descarga real de archivo en navegador.
