# Decisiones de la spec en curso

## Ajuste inicio-apoderado

- Las aplicaciones de un cuestionario (en `cuestionarios` y en `/familia/resultados`) se ordenan por instrumento y, dentro de él, por momento (UNICA, ENTRADA, SALIDA): por código, la llegada (`APL-LLEGADA`) quedaba antes que la partida. El front toma el último resultado de un instrumento como el de llegada.
- `completado_en` es el `calculado_en` del resultado vigente, como pide la spec: la partida cuenta como completada al revelarla, no al responderla.
- En `/familia/resultados`, el diploma se exige antes de mirar el hijo: sin diploma, un hijo ajeno también responde 409 (se mantiene la exigencia tal como estaba).
- Bajo el nombre del hijo va «Título actual: …» (con dos puntos, como el boceto) en lugar de «Título actual · …» del texto.
- El esqueleto de la tarjeta del hijo solo se ve si `/familia` falta: la pantalla de carga del portal (`pantallaCarga`) ya espera a `/familia` antes de mostrar el Inicio.
- Los avisos «Te falta N» y «{hijo} te espera en N» usan el `Badge` `outline` con los colores de aviso de la ficha (amarillo suave, sin triángulo), como en el boceto; «Ruta completada» y «6 de 6» siguen con el `success`.
- `TEST-PARTIDA-LLEGADA` no se agrega a `SALON_INSTRUMENTOS` (decisión del usuario: mide también la presión de la familia y no se comparte con los apoderados); su caso se prueba con una fila `SalonInstrumento` creada en la prueba. La comparación partida → llegada para el apoderado quedó en `pendientes-interfaz.md`.
- Se agrega el fixture `familia-resultados-luis` (`?estudiante=est-luis`) para el contrato del segundo hijo.
- El modo local del Inicio no cambia: `ParentChildrenSummary`, `ParentConversationNotice` y `ParentRouteSummary` solo se usan en local; el hook expone `inicio` (nulo en local) en lugar de ramificar la vista por `modoApi`.

