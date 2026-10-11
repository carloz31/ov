La interfaz del estudiante ahora se rige por `docs/student-experience/especificacion-interfaz-inmersiva-estudiante.md`.

# Aventura del estudiante

Implementación de interfaz y mecánicas basada en `prototipo_modulo_estudiantes.md`.

Durante la revisión del prototipo, `prototypeAllUnlocked` mantiene todas las secciones y puntos disponibles desde el primer ingreso. El progreso y los estados de completado se siguen registrando de forma independiente, de modo que abrir una sección no la marca como terminada. Este interruptor está en `AdventureStore.ts` y debe desactivarse cuando se validen los recorridos bloqueados.

## Recorrido

- `/student/missions`: siete misiones secuenciales (introducción, cinco reflexiones y un cuestionario de dos bloques), mapa arrastrable, llave final y compañero con diálogo progresivo.
- `/student/exploration`: mapa abierto disponible solo al completar todas las misiones. Conserva la experiencia completa de incendio forestal; los otros cinco casos funcionan como ejemplos de futuras actividades y sus drawers se limitan a presentar el caso y la acción de inicio. Las rutas directas de casos también comprueban el desbloqueo.
- `/student/research`: carrera, hasta dos invitaciones opcionales, preguntas y cierre diferido con video y reflexión. Entrada desde el mapa de la ciudad.
- `/student/journal`: espacio privado con onboarding, línea de tiempo, organización por tema, búsqueda, escritura libre, etiquetas, relectura, edición y eliminación. La tarjeta inicial combina un prompt diario con etiquetas sugeridas no removibles y una señal diaria de seguridad vocacional en escala de 1 a 10, registrada mediante un diálogo con slider. La respuesta del día puede corregirse sin crear duplicados.
- `/student/journal/signal`: historial personal de señales en un gráfico de línea. Incluye once señales de demostración distribuidas entre julio y septiembre, con entradas privadas asociadas a varias fechas. Al seleccionar un punto se muestran debajo las entradas escritas ese día. Las actividades disparadoras también abren una Sheet opcional que separa visual y técnicamente el texto privado del check-in.
- `/student/community`: publicaciones con alias, reportes y Crew voluntario de tres integrantes como máximo (incluido el estudiante). Las invitaciones pendientes reservan cupo; no hay emparejamiento automático y ninguna entrada del diario aparece en esta sección.
- `/student/resources`: tablón de la orientadora con datos de muestra para eventos, noticias, artículos y publicaciones; confirmación de asistencia, videos, tres reacciones y destacado según reacciones de la semana; lecturas y cartas guardadas en «Mis recursos».
- `/student/testimonials`: héroes desbloqueados al 50% y 100% de casos resueltos.
- `/student/profile?section=passport`: pasaporte dentro del perfil, con cinco niveles narrativos e insignias agrupadas. Cada insignia abre el relato de cómo se consigue y qué representa en la orientación vocacional; escribir en el diario no concede insignias, puntos ni rachas.
- `/student/conversations` y `/parent/conversations`: cinco temas de demostración disponibles en conjunto tras el cierre del recorrido secuencial. Incluyen preguntas compartidas y preguntas distintas pero relacionadas para cada rol, además de datos de muestra que permiten revisar los estados «Te toca responder», «Esperando respuesta», «Listos para conversar» y «Conversados». Las respuestas se revelan solo cuando ambos participan; el cierre es independiente, admite una reflexión privada opcional y alimenta el progreso hacia una carta-regalo. No hay rachas ni fechas límite.
- En modo de revisión, la tarjeta conserva el progreso real de la familia y ofrece «Visualizar regalo» antes de completar los cinco temas. La carta se abre en un diálogo y puede guardarse en «Mis recursos». Fuera del prototipo conserva el desbloqueo previsto al completar todos los temas.
- `/counselor/adventure`: moderación, revisión de ítems sensibles, tendencia de check-ins de seguridad vocacional y publicación de noticias, artículos, publicaciones y eventos. El texto del diario no forma parte de esta vista.

Los catálogos y las fichas de decisión no cambian. Los textos nuevos, cuestionarios breves y casos resumidos son contenido demostrativo; no son instrumentos diagnósticos validados. Los requisitos intermedios definitivos siguen pendientes del documento de Desired Actions. No se incorpora chat ni gate de profundidad.

## Estructura

### Reproductor de Misiones de Campo

Al abrir una misión, el mapa y la navegación general quedan cubiertos por un reproductor inmersivo. La vista reutiliza la barra superior de los casos, con progreso continuo y una confirmación de salida que explica si el paso y las respuestas ya fueron guardados. Lumi ocupa el centro de la experiencia y presenta un solo paso a la vez en formato de conversación RPG.

Las misiones se definen de forma declarativa en `data/FieldMissionActivityData.ts`. El reproductor soporta seis piezas combinables: `dialogue`, `resource`, `challenge`, `question`, `text` y `deliverable`. Esto permite construir recorridos sin crear un componente distinto por misión. Cada definición también declara uno de dos comportamientos:

- `finish-only`: solo exige llegar al final y registra el avance de la misión.
- `saves-responses`: conserva respuestas, borradores o metadatos del entregable mientras el estudiante avanza.

Los ejemplos actuales cubren una presentación con lectura y reto de alternativa correcta (`El inicio del viaje`), reflexiones escritas, un cuestionario camuflado como diálogo (`Mi brújula personal`) y un entregable que admite texto o selección de PDF/imagen (`Un camino propio`). En el prototipo, el archivo no se sube: se guarda únicamente su nombre, tipo y tamaño. La carga real requiere almacenamiento privado de backend.

`src/components/AdventureMap.tsx`, `MapPointDrawer.tsx` y `GuideDialogue.tsx` son transversales. Ambos mapas ocupan todo el espacio disponible bajo el top bar y junto al sidebar, y permiten recorrer el lienzo mediante arrastre con mouse o tacto. El avance específico de cada mapa se muestra como un anillo circular responsive alrededor del porcentaje. No se muestran controles de zoom, centrado ni una leyenda descriptiva adicional sobre el mapa.

Cada punto abre primero un Drawer de shadcn desde la derecha, con un ancho acotado y sin desbordamiento horizontal. Contiene el botón de cierre, estado, duración o tipo, descripción y un único botón para iniciar. Las Misiones de Campo usan una ilustración por tipo y conservan la ruta punteada entre destinos. Central de Casos recupera las imágenes existentes para las fichas de casos y presenta sus puntos sin líneas de conexión. La estación de investigación y la llave de la ciudad también muestran una ficha antes de navegar.

El guía permanece cerrado y se abre desde una burbuja circular de 48 px fija abajo a la derecha en todas las rutas del estudiante. Está aislada de las reglas de ancho del contenido para evitar que se transforme en un botón horizontal. Al abrirse usa un modal con fondo desenfocado, efecto de escritura, cierre por botón, fondo o tecla Escape y soporte de movimiento reducido.

Las vistas, datos, tipos y reglas viven en `src/features/occupation-exploration`. Las conversaciones compartidas por estudiante y familia viven en `src/features/family-conversations`. El acompañamiento de orientadora está en su feature existente. La estética se limita a las nuevas vistas mediante `adventure.css`.

## Persistencia y límites del prototipo

El proyecto no tiene backend ni autenticación. El estado se conserva en `localStorage`, clave `ov.student-adventure.v1`, y se sincroniza entre pestañas del mismo navegador. Hay un único estudiante de demostración (alias Alex) y una familia vinculada de demostración; no se establecen vínculos reales con las fichas de hijos del portal existente. No se envían invitaciones o publicaciones a personas reales. «Probar invitación» permite representar la aceptación o rechazo del invitado y comprobar el flujo de Crew.

Las selecciones de las pausas informativas permanecen solo en memoria. Los cuestionarios, respuestas de actividades, investigaciones, diario, check-ins, reportes, Crew, recursos, asistencia y conversaciones se conservan localmente. Si falla la escritura, el módulo de estudiante muestra una advertencia y mantiene el estado de sesión.

Las entradas del diario no tienen controles para compartir y no se renderizan en comunidad, familia ni orientación. Los check-ins se almacenan en una colección separada y la orientadora solo recibe esa tendencia. **El prototipo todavía no constituye un control de acceso de servidor**: todo el estado está en el navegador. Antes de usar datos reales se necesitan identidad, almacenamiento privado y separación equivalente en el backend. Los videos se enlazan por HTTPS; no se suben archivos ni se envían mensajes externos.

Los ítems sensibles guardan por separado respuesta abierta opcional y opción. Se marcan como pendientes de revisión, sin inferir discrepancias mediante palabras clave ni etiquetas personales. La orientadora registra manualmente `consistent` o `discrepancy`; estos indicadores nunca se renderizan en el portal de estudiante. Una comparación automática queda pendiente de una rúbrica definida.

## Verificación

`npm test`: pruebas de requisitos, secuencia, persistencia, recuperación, rachas, URLs y renderizado estático de rutas, visibilidad familiar y publicaciones.

`npm run build` y `npm run lint`: TypeScript, empaquetado y reglas del proyecto.

Revisión manual sugerida: completar la introducción y una reflexión, recargar un cuestionario a medio hacer, probar una invitación, reportar un texto y resolverlo como orientadora, completar `role` en familia, responder desde ambos portales y completar las misiones para entrar en la ciudad. Comprobar el mapa a 375 px y escritorio, arrastre, Tab y diálogo con movimiento reducido. La revisión visual interactiva no pudo ejecutarse en la sesión de implementación porque no había navegador disponible.
