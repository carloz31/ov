# Decisiones de la spec en curso

<!-- Spec en curso: docs/F03-vista-comparacion.md (ajuste posterior a F03). -->

- **Respuestas de solo partida.** No vienen en `/resultado` ni en `/comparacion`; el front lee las actividades de `APL-PARTIDA` del catálogo y pide en paralelo sus `/items` y `/respuestas` (etiqueta en `opcion.etiqueta`), con carga y error propios de la sección de ítems. Los ítems se agrupan por la dimensión de `/items`, en el orden del backend. Sin cambios en el backend.
- **Fixtures.** El exportador responde partida y llegada por dimensión (`OPCIONES_PARTIDA`, `OPCIONES_LLEGADA`): A sin cambios en ningún ítem (conserva la cita de `AUTO-01`), B y C suben, D baja y E cambia un ítem sin cambiar de zona. Nuevo fixture `respuestas-t-partida`. Se adaptaron las aserciones de zonas de `test_exportar_fixtures_front.py` y las tres pruebas de F03 del libro que esperaban la presentación anterior.
- **Zona en palabras.** «Zona fuerte» pasa a «Fuerte» (§2 de la spec).
