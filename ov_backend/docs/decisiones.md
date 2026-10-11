# Decisiones de la spec en curso

<!-- Spec en curso: 2D (docs/specs/2D.md). -->

- Las guías vistas siguen en el navegador (`introsSeen` de `ov.student-ui.v1`); pasarlas al servidor queda para el lote 2A.
- La presentación de primera vez (propósito, `sectionIntros`) y la ayuda del botón (uso, `guideSteps`) usan textos separados. Las guías de Camino y del diario se recortaron a 4 pasos: el saludo de Lumi pasó a la presentación de Camino y se unieron los dos pasos sobre la amistad del diario.
- El pasaporte comparte la presentación de «Mi perfil». Las actividades (estudiante y apoderado) y los casos quedan fuera del alcance de la ayuda contextual: tienen narrativa propia.
- Se adapta la prueba de la cola de novedades de `adventure-rendering.test.mjs`, que exigía que las vistas de descubrimiento no tuvieran presentación (autorizado por la spec 2D).
- Se conserva `isDiscoveryView` (cambia lo dicho en la spec): las vistas de descubrimiento ganan solo la presentación; la llegada a la ciudad y la señal del día siguen esperando a los mapas, como antes.
- Por la misma razón se adaptan tres pruebas que suponían que `resources` y `profile-general` no tenían presentación: la del montaje de la cola en `adventure-rendering.test.mjs` (ahora comprueba que la presentación aparece una vez y queda en `introsSeen`) y dos de `servidor-avisos.test.mjs` (marcan la presentación de `profile-general` como vista en su preparación).
