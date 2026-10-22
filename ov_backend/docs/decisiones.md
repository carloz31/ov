# Decisiones de la spec en curso

<!-- Spec en curso: F03 · Instrumentos y libro de Helena. -->

- **Reinicio usado (HU-095):** el front lo deduce de `GET …/historial` (un resultado con `anulado_en` y `perfil_plano`, tope `MAXIMO_REINICIOS_PERFIL_PLANO` = 1, copiado en `adaptadoresInstrumentos.ts`); el backend no agrega campos. Si el servidor rechaza el reinicio, se muestra su mensaje.
- **Perfil plano en los fixtures:** lo recorre `est-luis` (5A) en `_recorrer_perfil_plano` del exportador, respondiendo todo con la opción 3; así `est-ana` conserva su recorrido. `test_exportar_fixtures_front.py` agrega los 18 nombres nuevos y valida sus esquemas.
- **`t-contraste` con perfil plano:** se acepta como está (`R-t-contraste` se cumple con cualquier revelado); `test_perfil_plano_disponible_sin_opciones_y_tras_reiniciar_sin_dato` comprueba además que se abre con perfil plano y sigue abierto tras el reinicio.
- **Estado del libro en el front:** `store/servidor/instrumentos.ts` guarda avance, resultados vigentes por aplicación, comparación (solo con partida y llegada reveladas) e historial RIASEC (solo con perfil plano), y también publica `resultadoRiasec`. `refrescar` ya no lo borra si el libro lo leyó: en `ruta` no hay `act-tip-final`, que era la condición heredada de `piloto`.
