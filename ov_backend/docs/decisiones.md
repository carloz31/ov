# Decisiones de la spec en curso

## Ajuste diario-lumi (sin spec; pedido del usuario)

- El cuadro «Un espacio para ti y Lumi» se quita de la portada del diario y su contenido pasa a `sectionIntros.journal` (cuatro pasos dichos por Lumi, con los mismos textos): es la presentación de primera visita, la misma cola que las demás secciones. Excepción visual para ambos modos, anotada en `ov_frontend/AGENTS.md`.
- Sin el botón «Entendido, empezar a escribir» desaparece la entrada guiada «Al inicio del camino» (`journal-onboarding`) que abría; «Hoy» se ve desde la primera visita. `journalOnboardingSeen` se queda en `adventureStore` sin uso, para no cambiar el formato guardado.
- El «?» del topbar sigue abriendo la guía de uso (`guideSteps`), no la presentación: la separación propósito/uso es de HU-019 y la exige `tests/local/aventura`. La guía del diario ya empieza por la privacidad.
- En api, una vista dentro de `SeccionProtegida` (diario, señal, catálogo, planes, familia) con su sección cerrada no muestra la presentación ni la marca como vista (`seccionBloqueada` en `getNextOverlay`): antes se veía sobre la tarjeta de bloqueo y ya no aparecía al abrirse. En local nada cambia (`useSeccionesAcceso` no da `pasos`).

## Ajuste presentaciones-vistas (spec `presentaciones-vistas.md`)

- Modelo nuevo (aprobado en el plan): catálogo `presentacion` (`codigo`, `audiencia`) con las 18 vistas del estudiante de `studentViews`, y estado `presentacion_vista` (`cuenta_id`, `presentacion_id`, `vista_en`). Las 18 vistas, y no las 5 secciones, porque cada vista tiene su presentación; el código es el id del front, sin tabla de traducción.
- `0030` no siembra el catálogo: como el resto de `fijos`, lo llena el conjunto al recargarse (`datos.cargar ruta --vaciar`). Bajarla se detiene si hay presentaciones vistas (como 0028).
- `POST /acciones/presentacion-vista` es idempotente y conserva la primera `vista_en`; no mira la sección (lo decide el front), ni registra eventos.
- Pruebas adaptadas con el cambio de modelo: conteos de tablas (82 → 84), filas sembradas de `presentacion` (18), la presentación vista como estado en el reinicio y en el downgrade (que ahora se detiene en 0030).
