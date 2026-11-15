# Decisiones de la spec en curso

## Ajuste panel-entrevistas-configuracion

- **Salón = promoción + sección (modelo, 0058):** `salon` pierde `nombre` y suma `promocion` y `seccion`, únicas por colegio; el front lo nombra según el año en curso. La migración deduce la sección de la letra final del nombre o del código y falla con el código si no puede (solo en línea; en `--sql` falla el NOT NULL). Al bajar, el nombre vuelve como el código.
- **`SalonDatos` también en `EstudiantePanel.salon` y `FilaEstudiante.salon`**, que antes llevaban el nombre; `SalonPanel` desaparece y se usa `SalonDatos` en todas partes (diferencia 3 del plan, aprobada).
- **Pruebas adaptadas (autorizadas):** las que esperaban `nombre` o el código del salón en sesión, panel y publicaciones (`test_token_y_sesion`, `test_panel_perfil`, `test_panel_seguimiento`, `test_reacciones_orientadora`, `test_aislamiento_colegios`), las que construyen `Salon(nombre=…)` y `test_crear_cuentas` (el salón nuevo de prueba pasa de `5P` a `2026-C`, también en `scripts/cuentas_ejemplo.csv`).
- **crear_cuentas:** el salón nuevo debe tener la forma `AAAA-S`; otro formato, o una promoción y sección que el colegio ya tiene, es un error de fila detectado en `planificar`, antes de escribir (observación del usuario al plan).
- **Detalle de una Leyenda de otro salón:** «Promoción anterior · solo lectura» pasa a «{nombre del salón de sus autores} · solo lectura».
