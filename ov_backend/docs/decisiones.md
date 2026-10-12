# Decisiones de la spec en curso

<!-- Spec en curso: B00 (docs/specs/B00.md). -->

- `datos/fijos.py` lleva los 60 enunciados RIASEC, ocupaciones y carreras sin `DATO DE PRUEBA` (son los de §4.3.7 y del catálogo del front); `nurse` conserva su comentario sin la marca. Aprobado en el plan.
- `fijos.cargar` devuelve aplicaciones e ítems por código; la ruta une ítems y aplicaciones con actividades mediante tuplas (`ITEMS_ACTIVIDADES`, `APLICACIONES_ACTIVIDADES`).
- El contenido de cada actividad de `ruta` es su código con guiones bajos (`t-inicio` → `t_inicio`): ninguna existe en el front hasta su lote F.
- `soporte_plataforma.py` pasa a `soporte_ruta.py`: `avanzar_camino` → `avanzar` (recorrido `t-inicio`, `t-cierre-inicio`, `t-expectativas`, que abre la Ciudad); `MARA` → `INTERESES` (una actividad con los 60 ítems). `ciclo` pierde `hasta`.
- Se adaptan las pruebas de `tests/integration/datos` a `ruta` (conteos, códigos y monkeypatch sobre `fijos`/`ruta`). `test_semilla_plataforma.py` pasa a `test_semilla_ruta.py`.
- Se retira `test_carga_piloto.py`: la recarga con `--vaciar` por la CLI ya la cubre `test_cli_sin_esquema_y_carga_tras_migracion`.
- La variante «repetido» del catálogo corrupto une `t-caso` a `APL-RIASEC` para repetir un ítem, porque `ruta` tiene una sola actividad de cuestionario.
- Las actividades de prueba que agregan `instrumento_minimo` y `preparar_casos` van al bloque `T0` (el único abierto al inicio, como antes `CAMINO`). Como impiden cerrar T0, `test_r40` avanza solo hasta `t-cierre-inicio`, y `test_r13` crea `instrumento_minimo` después de abrir la Ciudad para enviar un ítem ajeno a la actividad (con una sola actividad de 60 ítems, `RIASEC-06` ya no es ajeno).
- `test_r17` se adapta: con una sola actividad, la edición antes del resultado ocurre con la actividad `EN_CURSO`, no `COMPLETADA`.
- Las insignias I6 e I8 no existen en `ruta`: las pruebas de conversación y coautoría crean su propia insignia por evento (`insignia_por_evento`). `test_r36` comprueba la concesión con VENCE_DESAFIO_INTACTO (`t-ins-oculta`).
- `test_evaluador_camino.py` arma su propio bloque `CAMINO` porque `misiones_camino_sin_inicio` lo busca por código; el evaluador se conserva sin uso en `ruta`. Aprobado en el plan.
- `test_r04` abre la Ciudad con COMPLETA_ACTIVIDAD `t-expectativas` (regla de `ruta`) en vez de COMPLETA_BLOQUE `CAMINO`.
- `test_actividades_apoderado.py` deja de parametrizar `piloto`: con un solo conjunto, se prueba solo `ruta`.
- `soporte_escenarios_plataforma.py` pasa a `soporte_escenarios_ruta.py`, con un verificador nuevo `p03_cierre_de_t0`; `test_postgres.py` lo usa también.
