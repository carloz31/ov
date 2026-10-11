# Nuevo estilo de orientadora y apoderado

Implementación de la solicitud directa del usuario del 6 de octubre de 2026 y de la [especificación adjunta](especificacion-nuevo-estilo-portales.md).

## Alcance aplicado

- Tema `theme-staff`: fondo gris, tarjetas blancas, barra lateral oscura con estrella dorada, navegación segmentada y colores de lectura con contraste AA.
- Componentes comunes `StaffEntityHeader`, `StaffMetric` y `StaffAlertCard`: cabeceras de estudiante, hijo, actividad y resultados; métricas principales y secundarias; alertas descriptivas con el despliegue existente.
- Orientadora: inicio, perfiles actuales y heredados, cuestionarios y registros del estudiante y de la familia. Las tablas, filtros y acciones existentes conservan sus datos y comportamiento.
- Apoderado: atributo `data-audience="parent"`, texto base de 17 px, textos secundarios de al menos 15 px y controles de al menos 44 px. El inicio reúne los resultados dentro de la tarjeta del hijo y presenta después el aviso y su ruta de actividades.
- Los iconos automáticos de estados y los cambios de los componentes compartidos se limitan al contexto staff. El tema del estudiante y el ingreso mantienen su presentación.

## Vistas y componentes con presentación propia

Estas vistas reciben los nuevos tokens y los estilos de sus primitivas, pero mantienen su composición especializada:

- `StudentsView`: tabla de estudiantes y filtros; no se sustituye por tarjetas de entidad.
- `PrioritiesView` y `PublicationsView`: configuración, listas y vistas previas de recursos. Las vistas heredadas `CounselorSettingsView` y `ReviewInboxView` también mantienen sus formularios y tablas.
- `StudentDetailView`: tablas, gráficos y acciones de los perfiles heredados; su cabecera y navegación sí adoptan los patrones comunes.
- Secciones del perfil: opciones, planes, intereses, seguridad y diario; conservan sus tablas y gráficos. `QuestionnaireBars`, tarjetas de dimensiones y comparaciones mantienen su representación de resultados.
- `ParentActivityView`, su reproductor y recursos: conservan la cabecera azul, progreso degradado, retroalimentación y tablas; adoptan los tokens de fondo, borde y texto.
- Conversaciones familiares y exploración de opciones: conservan su composición y flujos, con las primitivas y tokens staff donde corresponde.

## Comprobaciones

- TypeScript y compilación de producción.
- Pruebas de contraste, perfiles, permisos de resultados familiares, avances y reproductor del apoderado.
- Revisión local en escritorio y a 390 px: perfil de orientadora, inicio y actividades del apoderado, reproductor y menú móvil. Sin desbordamiento horizontal en los encabezados revisados.
- Se mantiene la exclusión de `tests/counselor-portal.test.mjs`.

Las 78 pruebas seleccionadas de paleta, perfiles, familia, apoderado y renderizado relacionado pasaron. La ejecución general permitida terminó con 263 pruebas aprobadas y 16 fallos en las pruebas del estudiante (acceso a misiones, seguimiento de respuestas y exploración); no se declara esa suite completamente aprobada.

La referencia externa de Claude no estuvo disponible; se siguió la especificación Markdown adjunta. No se agregaron datos ni operaciones de negocio.
