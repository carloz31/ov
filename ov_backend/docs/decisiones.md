# Decisiones de la spec en curso

<!-- Spec en curso: docs/specs/B04.md -->

- Modelo (0007): `intento` en `respuesta_registro` y `turno_seguimiento` (la única de turnos pasa a respuesta, intento, orden) porque la edición es un nuevo intento con su propio tope de seguimiento; `reflexiva_registrada` porque RESPUESTA_REFLEXIVA no lleva referencia y hay que emitirla una sola vez por respuesta.
- Sin `texto_editado`: al editar se sobrescribe `texto_inicial`, que pasa a ser el texto base del intento vigente; el historial queda en `evaluacion_respuesta.texto_evaluado` y en los turnos anteriores. `clasificacion_inicial` sigue siendo la de la primera entrega.
- `texto_consolidado` es la única respuesta final (citar, mostrar al estudiante y a la orientadora); al entregar y al editar vale el texto escrito.
- La migración inicializa `reflexiva_registrada` con la regla nueva (evaluación ADECUADA de número > 1 precedida de una POCO_DESARROLLADA), no con la de B03; su downgrade se niega si hay registros editados.
- Pruebas de migraciones adaptadas al modelo: la compilación para PostgreSQL cuenta 10 booleanos con `DEFAULT false` (antes 9) y la del downgrade fallido compara solo las columnas que existen en 0005, porque el modelo tiene columnas posteriores.
- RESPUESTA_REFLEXIVA (corrige B03): solo cuando una respuesta pasa de POCO_DESARROLLADA a ADECUADA al evaluar la respuesta a un turno, en cualquier intento y una vez por respuesta. Se emite en esa misma acción, aunque el registro siga abierto. Ninguna regla ni logro de `ruta` lo consume (también lo emite el diario); se adaptaron `test_entrega_registro.py`, `test_bloqueo_actividades.py` y `soporte_escenarios_ruta.py`, que esperaban tres al cerrar.
- `items_por_ampliar` pasa de lista de códigos a `{item, pista}`; la pista es la pregunta de la evaluación vigente. Aparece en el GET y en la respuesta de toda acción mientras el registro esté cerrado (progreso COMPLETADA y nada pendiente). Se adaptaron las pruebas de B03 que comparaban códigos.
- `texto_consolidado` solo sale en el GET (con el registro cerrado); las respuestas de las acciones siguen sin la consolidada, como en B03.
- REGISTRO_ADECUADO se emite al cerrar cualquier intento si ningún ítem queda POCO_DESARROLLADA y la cuenta no tiene ya ese evento para la actividad.
