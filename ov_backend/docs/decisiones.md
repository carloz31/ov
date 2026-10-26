# Decisiones de la spec en curso

## Ajuste diario-lumi (sin spec; pedido del usuario)

- El cuadro «Un espacio para ti y Lumi» se quita de la portada del diario y su contenido pasa a `sectionIntros.journal` (cuatro pasos dichos por Lumi, con los mismos textos): es la presentación de primera visita, la misma cola que las demás secciones. Excepción visual para ambos modos, anotada en `ov_frontend/AGENTS.md`.
- Sin el botón «Entendido, empezar a escribir» desaparece la entrada guiada «Al inicio del camino» (`journal-onboarding`) que abría; «Hoy» se ve desde la primera visita. `journalOnboardingSeen` se queda en `adventureStore` sin uso, para no cambiar el formato guardado.
- El «?» del topbar sigue abriendo la guía de uso (`guideSteps`), no la presentación: la separación propósito/uso es de HU-019 y la exige `tests/local/aventura`. La guía del diario ya empieza por la privacidad.
- En api, una vista dentro de `SeccionProtegida` (diario, señal, catálogo, planes, familia) con su sección cerrada no muestra la presentación ni la marca como vista (`seccionBloqueada` en `getNextOverlay`): antes se veía sobre la tarjeta de bloqueo y ya no aparecía al abrirse. En local nada cambia (`useSeccionesAcceso` no da `pasos`).
