# Decisiones de la spec en curso

<!-- Spec en curso: ajuste del inicio del estudiante (F03, solo front). -->

- **Siguiente paso por prioridad (solo api):** `siguientePaso` (`features/adventure/lib/siguientePaso.ts`) elige una requerida `EN_CURSO`; si no hay, la primera `DISPONIBLE` y, si no, la primera `BLOQUEADA`, en el orden de la ruta del servidor (bloques por `numero`, actividades por `orden`): Camino y luego Ciudad. Si está en la otra zona, el botón lleva a su mapa con `?punto=`.
- **Requeridas fuera del mapa:** una requerida con `visible=false` o sin contenido en el front se omite, con `console.warn` en desarrollo (por diseño no debería existir).
- **Una sola señal:** en api, el panel, el panel plegado del móvil y el pulso del mapa (`recommendedId`) usan `siguientePaso`. El pulso solo marca un punto de la zona abierta. En local todo queda igual (modo congelado; `tests/local` sigue pidiendo «Actividades disponibles»).
- **Estados de la tarjeta:** disponible, «Siguiente paso» con título y la etiqueta del punto (tipo · duración del servidor); empezada, «Continúa»; bloqueada, la misma tarjeta con `LockKeyhole` y el mensaje de bloqueo, que al pulsarse abre el drawer con el requisito (y «Ir al libro de Helena» si aplica), sin Lumi. Sin datos del servidor, el texto vacío de siempre.
- **Textos de pantalla nuevos:** «Continúa»; «Completaste el camino» + «Aún quedan actividades por descubrir. Sigue explorando.»; «Recorriste todo el camino» + «Ir al libro de Helena» (a `/student/profile/helena`); «N actividades más disponibles · Ver todas ›» y, con N = 1, «1 actividad más disponible · Ver todas ›».
- **Enlace de «Completaste el camino»:** es la misma línea del conteo (siempre hay N > 0 en ese estado), que lleva a «Mis actividades»; no se repite un segundo enlace.
- **Conteo:** N son los puntos de `getListedActivities` del Camino y la Ciudad (los de «Mis actividades»): ya son solo actividades visibles, con contenido, en `DISPONIBLE` o `EN_CURSO`; se excluye el del botón. Las interacciones de Mara cuentan como un punto. La lista «Actividades disponibles» sale del inicio en api; la línea tiene altura mínima de 44 px.
- **Sorpresas nuevas no implementadas:** no existe un dato de «abierta»; queda en `pendientes-interfaz.md`.
- **`AccesoRapido` a su archivo:** sale de `AdventurePanel.tsx` para que el panel no pase de 300 líneas; mismo marcado.
