# Decisiones de la spec en curso

<!-- Spec en curso: B07. -->

- **Modelo (F1):** se agregan `tematica`, `actividad_tematica` y `dimension.tematica_id` (migración 0010), según el plan aprobado. Son tablas de catálogo y no se vacían en el reinicio.
- **Cuestionario provisional:** los 19 enunciados (4-4-4-4-3) y la escala `ESC-ACUERDO4` (1–4) van en `fijos.py` como provisionales hasta la carga real. El usuario eligió esta opción porque los textos reales no estaban en el repo.
- **Bloques de `ruta`:** T2 lleva el número 3 y CIUDAD pasa al 4, para que los bloques se listen en el orden del recorrido (T0, T1, T2, CIUDAD).
- **Regla de T2:** `R-T2` exige COMPLETA_BLOQUE T1 y REVELA_RESULTADO. En F1 y F2, ese REVELA_RESULTADO es el de `APL-PARTIDA`. En F3 pasa a ser cualquiera y se suma el evaluador, para que revelar un prioritario también reevalúe T2.
- **Downgrade:** en la prueba de downgrade fallido, la 0010 baja sin problema antes de que la 0009 se detenga. La prueba excluye las tablas posteriores a 0009.
- **Pruebas adaptadas** (autorizado por la spec), porque T0 ahora incluye `t-partida` y aparece T2:
  - conteos de tablas y filas de la semilla;
  - clasificación de tablas;
  - índices y órdenes de bloques en el contrato;
  - recorridos explícitos de T0 (secciones, bloqueo, escenario);
  - `RECORRIDO` y `completar` de `soporte_ruta.py`;
  - el exportador de fixtures, que ahora completa `t-partida`;
  - en las pruebas de instrumentos que suponían un solo instrumento, se filtra `TEST-RIASEC`.
