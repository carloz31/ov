# Decisiones de la spec en curso

<!-- Spec en curso: F01 (docs/specs/F01.md). -->

- **Visibilidad fija por tipo:** todo registro lo ven el estudiante y su orientadora; el diario es privado. No hay campo de visibilidad en el ítem ni en el JSON: en api, la consigna de registro muestra siempre «Visible para ti y tu orientadora. Se guarda en tu cuenta.» (decisión del usuario; no es lote M).
- **Fixtures de seguimiento con `t-valores` de est-ana:** el exportador recorre `t-valores` (elección ordenada, `[vaga]`, una respuesta y una omisión) en lugar de un recorrido nuevo de est-luis en `t-expectativas`: est-luis no tiene token en el exportador y `t-valores` ya se respondía en el mismo punto. Los demás fixtures no cambian.
- **`item` sin validación propia:** `lib/activities/validation.ts` no valida campos de nodos; el cruce consigna ↔ ítem lo hace `registroServidor` al abrir (sin él, no hay actividad que abrir).
- **Prueba del exportador adaptada (autorizada por la spec):** `NOMBRES` de `test_exportar_fixtures_front.py` suma los seis fixtures de `t-valores` y se validan sus contratos.
- **`FollowUp` no se toca:** las pruebas locales leen su árbol superficial; extraer su hilo a otro componente cambiaría ese árbol. `RegistroSeguimiento` compone los mismos `TypedQuestion`, `InlineDialogue` y clases `sx-followup-*`.
