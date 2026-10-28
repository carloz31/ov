# Decisiones de la spec en curso

- Ajuste posterior a F08: `conversacion.tema` (columna nueva, migración 0037) es el chip de la tarjeta y reemplaza a `tramo`, que se calculaba con el bloque de la primera actividad de su regla. En la respuesta, el título pasa a `titulo` y `tema` es la columna. Lo pidió el usuario: el chip debe ser un dato de la conversación y no depender de la regla.
