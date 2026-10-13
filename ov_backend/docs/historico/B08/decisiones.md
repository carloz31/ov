# Decisiones de la spec en curso

<!-- Spec en curso: B08. -->

- **Modelo (B08, aprobado):** `TipoActividad.BATALLA`, eventos `SUPERA_BATALLA` (actividad) y `VISTA_TESTIMONIO` (testimonio), tablas `actividad_dimension` (catálogo), `resultado_batalla` y `coleccion_ocupacion` (estado) y `testimonio.pista`. Migración `0013`.
- **Varios tipos RIASEC por caso:** tabla `actividad_dimension` en vez de `actividad.dimension_id`, a pedido del usuario. Que solo los CASO la usen no cabe en un CHECK: lo valida el cargador y una prueba de datos.
- **`t-ins-batalla` es provisional:** existe para probar que SUPERA_BATALLA abre el siguiente paso una sola vez; en B10 se reemplaza por la regla que abre `t-explorar`.
- **`t-batalla` es opcional** para no alterar el cierre de T1 ya probado; se abre al completar `t-inicio`, que da la ficha de repaso.
- **Pruebas adaptadas por el cambio de modelo:** conteos de tablas (53 → 56), clasificación catálogo/estado, filas sintéticas del reinicio y el downgrade (ahora se detiene en 0013 porque `ruta` tiene una batalla); en el escenario, `t-batalla`, `t-ins-batalla` y los testimonios bloqueados aparecen en las listas iniciales.
- **Contrato y fixtures:** `test_consultas_dominio.py` y `test_exportar_fixtures_front.py` incluyen `t-batalla`, sus avisos y los testimonios de `ruta`; los JSON de fixtures se regeneran en la fase 5.
- **`resolver-caso` ahora completa solo al superar** (`puntaje ≥ puntaje_minimo`, confirmado por el usuario); fallar deja el caso EN_CURSO. Cada superación repetida vuelve a registrar COMPLETA_ACTIVIDAD, como cualquier actividad repetida; SUPERA_CASO, solo la primera.
- **Ocupaciones del caso:** se aceptan las que envía el front (bien asignadas), validando solo que existan (422). La colección se llena solo al superar, sin duplicar; la respuesta trae `ocupaciones_nuevas`.
- **HU-052 y HU-053** (presupuesto y pista por problema) son lógica del caso en el front; el backend no guarda estado de ellas.
