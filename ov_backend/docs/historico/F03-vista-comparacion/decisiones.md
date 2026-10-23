# Decisiones de la spec en curso

<!-- Spec en curso: docs/F03-vista-comparacion.md (ajuste posterior a F03). -->

- **Respuestas de solo partida.** No vienen en `/resultado` ni en `/comparacion`; el front lee las actividades de `APL-PARTIDA` del catálogo y pide en paralelo sus `/items` y `/respuestas` (etiqueta en `opcion.etiqueta`), con carga y error propios de la sección de ítems. Los ítems se agrupan por la dimensión de `/items`, en el orden del backend. Sin cambios en el backend.
- **Fixtures.** El exportador responde partida y llegada por dimensión (`OPCIONES_PARTIDA`, `OPCIONES_LLEGADA`): A sin cambios en ningún ítem (conserva la cita de `AUTO-01`), B y C suben, D baja y E cambia un ítem sin cambiar de zona. Nuevo fixture `respuestas-t-partida`. Se adaptaron las aserciones de zonas de `test_exportar_fixtures_front.py` y las tres pruebas de F03 del libro que esperaban la presentación anterior.
- **Zona en palabras.** «Zona fuerte» pasa a «Fuerte» (§2 de la spec).
- **Tarjeta con la llegada lista para revelar.** El bloque punteado «Tu punto de llegada se revela al final…» se oculta mientras se muestra el sello «Revela tu punto de llegada», que lo reemplaza.
- **`DimensionSummaryRow`.** Vuelve a su versión anterior a F03; la página I ya no lo usa (usa `PartidaLlegadaSummary` con `ZoneChips`).
- **«¿Qué significa cada zona?».** Guía con el mismo comportamiento que la de intereses (`ZoneGuide`, `?guia=1` desde la tarjeta), con los textos aprobados por el usuario para Por trabajar, En camino y Fuerte y el cierre «Las zonas no son notas…», sin números, promedios ni umbrales.
- **Ninguna dimensión sube.** El panel y la tarjeta muestran «Tus zonas se mantuvieron o ahora las ves distinto. Mira abajo qué cambió en tus respuestas.» en lugar de «Avanzaste de zona en 0 de 5 partes»; no aparece el chip «0 avanzaron» ni el párrafo «Lo que más cambió fue…» (aprobado por el usuario).
- **Sin cambio entre los ítems.** Si ningún ítem de una parte cambió, se muestra «En esta parte respondiste lo mismo al inicio y al cierre.» y, debajo, los ítems plegados en el mismo `details`, con la cabecera de la rejilla.
- **Pendientes.** Se retiraron de `pendientes-interfaz.md` las zonas en palabras, «Ver comparación», «N respuestas se mantuvieron» y los textos de cabecera de la página I y su vista explicada; el resto de la entrada F03 sigue pendiente.
