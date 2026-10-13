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
- **Resultado de COMPARACION (F2):**
  - `DimensionResultado` admite `puntaje`, `puntaje_maximo` y `porcentaje` en `null` y suma `zona` y `tematica`, que en los demás tipos van en `null`.
  - `/comparacion` reemplaza su respuesta por ítem: queda por dimensión, con ítems que traen la etiqueta elegida en cada momento y `cambio`, y sin números, según lo indicó el usuario.
  - La comparación exige las dos aplicaciones **reveladas**, no solo completas.
- **Pruebas r27 y r28 adaptadas:** el instrumento mínimo de COMPARACION no tiene dimensiones, así que no se revela, y su comparación responde 409. La comparación completa se prueba con `TEST-PARTIDA-LLEGADA` en `test_partida_llegada.py`.
- **Modelo (F3):** se agregan `salon_actividad_prioritaria` y `salon_instrumento` (con `es_prioritario` y `visible_apoderado`), migración 0011, según el plan aprobado. Son catálogo y quedan en la caché de definiciones.
- **Evaluador `instrumentos_prioritarios`:** exige la partida revelada y los prioritarios del salón revelados en todas sus aplicaciones. Ignora un COMPARACION marcado como prioritario, según lo indicó el usuario, y la carga lo rechaza.
- **Evaluador en la carga:** el evaluador de cada regla de `ruta` va en `EVALUADORES_REGLAS = {regla: evaluador}`, para no cambiar la forma de las tuplas de `REGLAS`, que leen otras pruebas.
- **Pruebas adaptadas (F3):**
  - conteos de tablas y de `BOOLEAN DEFAULT false`;
  - las tablas posteriores a 0009 en la prueba de downgrade;
  - `test_partida_llegada`, que ahora revela el RIASEC prioritario del 5A antes de abrir T2.
- **Modelo (F4):** se agregan `TipoReferencia.RESPUESTA_CUESTIONARIO`, `referencia.item_instrumento_id` y el CHECK `fuente_cuestionario`, y se amplía `fuente_aplicacion` (migración 0012, escrita a mano porque el autogenerado no ve los CHECK). Lo exige `t-lee-cuestionario`, aprobado en la spec.
- **Disponibilidad de RESPUESTA_CUESTIONARIO:** la cita aparece cuando la actividad fuente está COMPLETADA (en COMPARACION, las respuestas quedan fijas desde ahí) y muestra la etiqueta, sin número.
- **Downgrade:** como `ruta` tiene una RESPUESTA_CUESTIONARIO, ahora es la 0012 la que detiene el downgrade, sin bajar nada. La prueba se adaptó.
