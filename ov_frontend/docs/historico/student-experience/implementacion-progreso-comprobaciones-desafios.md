# Progreso, comprobaciones y desafíos — implementación

Solicitud del 6 de octubre de 2026. La especificación adjunta se conserva en `especificacion-progreso-comprobaciones-desafios.md` y prevalece para su alcance. El enlace al prototipo no pudo consultarse; se implementaron los tokens, textos y flujos del documento.

## Comportamiento

- Encabezado con degradado azul a dorado, cubierta del tramo pendiente, estrella de Lumi y brillo proporcional. `nuevoMomento` es opcional en `NodoBase`; la actividad de mitos lo utiliza al comenzar sus secciones. El 100 % también produce un destello. Incluye narración accesible del paso.
- Comprobaciones con selección previa y botón Comprobar, hasta dos intentos; las de dos opciones terminan en el primero. Los errores quedan bloqueados y se mantienen visibles. En múltiples se conservan las selecciones válidas y las explicaciones viven en cada opción. La etiqueta de las respuestas omitidas admite `tambienEra`, configurado como «un mito» en la pregunta existente. Los repasos empiezan vacíos y no agregan intentos. Se sigue leyendo `retroalimentacion` como respaldo para el contenido anterior; el nuevo campo `explicacion` tiene prioridad. No se cambia el evaluador compartido del apoderado.
- Cierre con medallón de Lumi, 16 partículas, tarjetas de recompensa escalonadas, acceso real a las fichas y pregunta del diario. Por solicitud directa del usuario del 6 de octubre de 2026, la salida es un único botón principal «Continuar» que regresa al mapa de la zona; se retiran «Lo que viene», las sugerencias para abrir otra actividad y el botón secundario de regreso. La victoria de desafíos y el cierre de sus prácticas usan la misma salida a Ciudad. Elimina el mensaje duplicado Obtuviste. El contador de dientes utiliza las piezas del catálogo y las que posee el estudiante; actualmente el catálogo solo define `pieza-plaza`. Este contador no altera la habilitación vigente de la ciudad, que depende del recorrido. Cuando se amplíe la llave, deben configurarse sus piezas y requisitos reales.
- El Rumor es un desafío de demostración en la ciudad y en Mis actividades. Usa diez preguntas basadas en la ficha de mitos, cinco vidas, tres destellos y cuatro opciones. La probabilidad exacta al azar es 1,287841796875 %. Entrega la ficha «Preguntas que disipan rumores» y, si la primera victoria conserva todos los destellos, I10 «Luz sin fisuras». Mochila, pasaporte, perfil y novedades presentan esos desbloqueos.
- El intento vive únicamente en memoria. La X pide confirmación durante la batalla; cerrar o recargar descarta el intento. Las derrotas agregan solo un resultado; la primera victoria completa la actividad y entrega la recompensa mediante el mecanismo existente. Tras vencer, cualquier repetición es práctica y no escribe resultados ni recompensas. No hay temporizador ni visor de fichas durante la batalla. Los reintentos barajan priorizando las preguntas que no salieron en el anterior.
- Por ajuste directo del usuario, el desafío comparte los estilos del encabezado de actividades: X a la izquierda, título y control de sonido a la derecha, sin pasos ni barra de avance. Ambos jugadores reutilizan el mismo control de sonido y su preferencia. La confirmación de salida usa el mismo panel oscuro de actividades, con el aviso propio del intento descartado; así mantiene legibles el mensaje y los dos botones también al renderizarse fuera del jugador.
- El botón inesperado aparece al final de carreras y ocupaciones. Calcula el destino al pulsarlo, prioriza familias sin carreras visitadas y excluye la página actual, favoritos y planes. Para ocupaciones se excluyen también las asociadas a carreras incluidas en planes. El regreso usa la última visita más antigua entre candidatos elegibles; el aviso de catálogo completo aparece arriba únicamente cuando todas sus páginas fueron visitadas. Si todas las alternativas están excluidas, el botón se deshabilita con una explicación.

## Modelo y persistencia

No se encontraron entidades genéricas Desafío, PreguntaDesafío ni ResultadoCaso reutilizables para este flujo. Se reutilizan Actividad, ProgresoActividad, recursos, recompensas y las claves locales existentes:

- `Challenge` deriva de Actividad con `tipo: 'desafio'`, requisitos tipados y banco propio. Se mantiene separado del catálogo compartido de actividades para no cambiar los flujos de otros roles. En este modelo la introducción se llama `presentacionEnemigo`, porque `Actividad.presentacion` ya significa narrativa/directa. Este nombre debe considerarse al actualizar el diagrama.
- `ChallengeQuestion` pertenece al banco de cada enemigo y usa `correcta` como referencia a exactamente una opción.
- `ChallengeResult` referencia actividad y estudiante; guarda fecha, victoria, aciertos, preguntas y vidas restantes. La primera victoria incorpora `evento: 'COMPLETA_ACTIVIDAD'` y el código de la insignia cuando corresponde. Se guarda en `JourneyState.challengeResults`, dentro de `ov.missions.v2`, y se vincula a ProgresoActividad mediante `actividadId`.
- `readResourceIds`, en la misma clave, distingue fichas guardadas de fichas leídas. Se marca al terminar su diapositiva o mediante «Leí la ficha» al final de su visor. Guardar por sí solo no habilita enemigos. En los registros anteriores se preservan las fichas ya obtenidas como leídas, porque no existía otra evidencia de lectura.
- Los campos adicionales se inicializan únicamente en el almacén del estudiante. `initialJourney` conserva su esquema anterior para los otros roles que lo reutilizan.
- `catalogVisits`, dentro de `ov.student-discovery.v1`, registra VISTA_CARRERA y VISTA_OCUPACION con referencia y fecha. Se conserva `viewedCareerIds` y su regla actual de insignia. Las visitas antiguas que solo tenían ID migran con fecha de referencia 1970 para tratarlas como anteriores a cualquier visita nueva; no representan una fecha real.
- `validateChallenge` verifica vidas, opciones, respuesta única, identificadores, banco mínimo y probabilidad menor a 10 %. Las configuraciones del prototipo pasan por esa validación al cargarse y al iniciar. `firstAttemptVictoryRate` calcula la métrica a partir del primer resultado cronológico de cada estudiante.

Este repositorio implementa persistencia del prototipo en localStorage. El guardado y la publicación en servidor, la validación en ese servidor y el consumo de la métrica por el panel de análisis necesitan integración de backend. No se modifica el panel del orientador, protegido por AGENTS.md. La recompensa y el enemigo son contenido de demostración y deben revisarse antes de usarlos como contenido definitivo.

## Accesibilidad y alcance

Estados con icono y etiqueta; foco en el titular de la retroalimentación; regiones `aria-live`; vida y progreso con roles y valores; destellos con etiqueta; controles de al menos 44 px. Las animaciones y transiciones de estos componentes se desactivan con movimiento reducido; las tarjetas permanecen visibles.

No se abrieron ni modificaron los directorios de apoderado/orientador ni su prueba prohibida. El componente compartido Sheet solo añade una etiqueta opcional para cerrar: el valor anterior sigue siendo el predeterminado. No se añadieron librerías.

## Verificación

Build y lint aprobados. Las cinco suites autorizadas suman **43 pruebas aprobadas, 0 fallidas**, incluidas 15 pruebas nuevas. Vite conserva su aviso de tamaño del bundle; no impide la compilación. `git diff --check` aprobado.

La suite específica cubre configuración, probabilidad, todos los requisitos, preguntas sin repetición, prioridad en reintentos, abandono, derrota, primera victoria, práctica, fallos de guardado, migración, recompensas y pasaporte, métrica, estados de comprobaciones y selección inesperada. Se ejecuta junto con mission-logic, mission-store, adventure-state y deployment-assets.

La suite global `npm test` no se ejecuta: adventure-rendering y student-profile cargan los portales protegidos, y el comando global incluye `tests/counselor-portal.test.mjs`. No se cambian ni se omiten sus aserciones para aparentar una ejecución completa.

En navegador se revisan el encabezado, el error/reintento de comprobación, foco en el mensaje, lectura/habilitación, bloqueo de fichas, confirmación de salida, golpe de luz, victoria, ficha de recompensa, novedad de insignia y navegación al atlas, además del botón inesperado. La revisión móvil a 360 × 800 no presenta desplazamiento horizontal. Movimiento reducido se verifica en las reglas CSS; no se cambian preferencias del sistema.
