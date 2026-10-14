# Decisiones de la spec en curso

<!-- Spec en curso: B09 (docs/specs/B09.md). -->

- **Modelo (aprobado en el plan):** `pregunta_diario` gana `nombre`, `personalizada`, `uso` y `dimension_id`; nuevas `recomendacion` y `contador_diario`; `entrada_diario` cambia `pregunta_id` por `recomendacion_id` y gana `numero`, `numero_libre`, `titulo` y `actualizada_en`; `TipoReferencia.FAVORITOS`. Migración 0016: las preguntas existentes quedan DESBLOQUEABLE con el código como nombre provisional, y cada pregunta ya desbloqueada o respondida pasa a ser una recomendación FIJA.
- **Fases 1 y 2 en un commit:** al quitar `pregunta_id`, el servicio del diario no podía quedar con el modelo viejo; el primer commit trae modelo, datos y las acciones y consultas de entradas.
- **La recomendación desbloqueada se crea en el motor** (`registrar_eventos`), así toda vía que desbloquee una pregunta (acción, registro o `/eventos`) la deja en el diario. Por eso `/eventos` crudo también escribe `recomendacion` (prueba R36 adaptada).
- **`entradas_desbloqueadas` solo aparece si hay alguna**, para no cambiar las respuestas de las demás acciones; las respuestas que heredan de `RespuestaAccion` la copian con `campos()`.
- **El objetivo legible de una PREGUNTA_DIARIO usa su `nombre`**, no la pregunta completa.
- **`afinidad` en logros se omite para roles no estudiantes** (`response_model_exclude_unset`), para no cambiar su respuesta.
- **Misión adicional** = actividad no requerida que se abre con REGISTRO_ADECUADO; así se excluye del total de la afinidad.
- **Una DIARIA personalizada entra al sorteo solo si todas sus referencias tienen dato.** Si con las exclusiones no queda ninguna, se vuelve a sortear sin la de «no repetir»; si tampoco hay, 409.
- **Lectura de entradas, amistad y preguntas exige la sección DIARIO** (como la lectura de preguntas); editar y borrar no.
- **El asistente del diario reutiliza el evaluador del registro** (`personalizar_entrada` en el falso y en Gemini) y su `timeout_segundos`.
- **`/tematicas` y la afinidad quedaron en el commit de F1** (el código entró junto con el router); F3 agrega sus pruebas, las del asistente y la pregunta del día.
