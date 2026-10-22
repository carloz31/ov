# Decisiones de la spec en curso

<!-- Spec en curso: F01 (docs/specs/F01.md). -->

- **Visibilidad fija por tipo:** todo registro lo ven el estudiante y su orientadora; el diario es privado. No hay campo de visibilidad en el ítem ni en el JSON: en api, la consigna de registro muestra siempre «Visible para ti y tu orientadora. Se guarda en tu cuenta.» (decisión del usuario; no es lote M).
- **Fixtures de seguimiento con `t-valores` de est-ana:** el exportador recorre `t-valores` (elección ordenada, `[vaga]`, una respuesta y una omisión) en lugar de un recorrido nuevo de est-luis en `t-expectativas`: est-luis no tiene token en el exportador y `t-valores` ya se respondía en el mismo punto. Los demás fixtures no cambian.
- **`item` sin validación propia:** `lib/activities/validation.ts` no valida campos de nodos; el cruce consigna ↔ ítem lo hace `registroServidor` al abrir (sin él, no hay actividad que abrir).
- **Prueba del exportador adaptada (autorizada por la spec):** `NOMBRES` de `test_exportar_fixtures_front.py` suma los seis fixtures de `t-valores` y se validan sus contratos.
- **`FollowUp` no se toca:** las pruebas locales leen su árbol superficial; extraer su hilo a otro componente cambiaría ese árbol. `RegistroSeguimiento` compone los mismos `TypedQuestion`, `InlineDialogue` y clases `sx-followup-*`.
- **Prueba del mapa adaptada:** «un contenido sin nodos ubica el punto…» usaba `t-expectativas`, que ahora tiene nodos (lo pide la spec); pasa a `t-lee-cuestionario`, que sigue sin nodos, y comprueba que `t-expectativas` ya se abre.
- **En api, el registro termina en su última consigna:** «Entregar» está en ella y, tras el seguimiento, «Continuar» lleva al fin; los nodos que siguieran a la última consigna no se muestran. Por eso `t_expectativas.json` no tiene diálogo de cierre (el plan lo mencionaba).
- **Solo el Camino abre registros del servidor en F01:** los registros de la Ciudad (`t-contraste`) y `t-eco` no tienen contenido hasta su lote; `CiudadScreen` no cambia.
