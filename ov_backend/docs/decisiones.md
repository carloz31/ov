# Decisiones de la spec en curso

<!-- Spec en curso: B08. -->

- **Modelo (B08, aprobado):** `TipoActividad.BATALLA`, eventos `SUPERA_BATALLA` (actividad) y `VISTA_TESTIMONIO` (testimonio), tablas `actividad_dimension` (catálogo), `resultado_batalla` y `coleccion_ocupacion` (estado) y `testimonio.pista`. Migración `0013`.
- **Varios tipos RIASEC por caso:** tabla `actividad_dimension` en vez de `actividad.dimension_id`, a pedido del usuario. Que solo los CASO la usen no cabe en un CHECK: lo valida el cargador y una prueba de datos.
- **`t-ins-batalla` es provisional:** existe para probar que SUPERA_BATALLA abre el siguiente paso una sola vez; en B10 se reemplaza por la regla que abre `t-explorar`.
- **`t-batalla` es opcional** para no alterar el cierre de T1 ya probado; se abre al completar `t-inicio`, que da la ficha de repaso.
- **Pruebas adaptadas por el cambio de modelo:** conteos de tablas (53 → 56), clasificación catálogo/estado, filas sintéticas del reinicio y el downgrade (ahora se detiene en 0013 porque `ruta` tiene una batalla); en el escenario, `t-batalla`, `t-ins-batalla` y los testimonios bloqueados aparecen en las listas iniciales.
