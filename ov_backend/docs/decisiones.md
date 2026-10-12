# Decisiones de la spec en curso

<!-- Spec en curso: B00 (docs/specs/B00.md). -->

- `datos/fijos.py` lleva los 60 enunciados RIASEC, ocupaciones y carreras sin `DATO DE PRUEBA` (son los de §4.3.7 y del catálogo del front); `nurse` conserva su comentario sin la marca. Aprobado en el plan.
- `fijos.cargar` devuelve aplicaciones e ítems por código; la ruta une ítems y aplicaciones con actividades mediante tuplas (`ITEMS_ACTIVIDADES`, `APLICACIONES_ACTIVIDADES`).
- El contenido de cada actividad de `ruta` es su código con guiones bajos (`t-inicio` → `t_inicio`): ninguna existe en el front hasta su lote F.
- `soporte_plataforma.py` pasa a `soporte_ruta.py`: `avanzar_camino` → `avanzar` (recorrido `t-inicio`, `t-cierre-inicio`, `t-expectativas`, que abre la Ciudad); `MARA` → `INTERESES` (una actividad con los 60 ítems). `ciclo` pierde `hasta`.
- Se adaptan las pruebas de `tests/integration/datos` a `ruta` (conteos, códigos y monkeypatch sobre `fijos`/`ruta`). `test_semilla_plataforma.py` pasa a `test_semilla_ruta.py`.
- Se retira `test_carga_piloto.py`: la recarga con `--vaciar` por la CLI ya la cubre `test_cli_sin_esquema_y_carga_tras_migracion`.
- La variante «repetido» del catálogo corrupto une `t-caso` a `APL-RIASEC` para repetir un ítem, porque `ruta` tiene una sola actividad de cuestionario.
