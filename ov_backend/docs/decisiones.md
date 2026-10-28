# Decisiones de la spec en curso

- **Modelo (M):** `conversacion.algo_que_saben` (texto, nullable; migración 0036) para la caja «Algo que ya saben» de E7/A5; aprobado en el plan.
- **Conversada al responder el segundo:** se retiran `completar-conversacion` y `por_conversar`; `responder-conversacion` responde `RespuestaAgrupada` y COMPLETA_CONVERSACION va a las dos cuentas. `conversada_por` queda como quien respondió segundo; ninguna regla dependía de él (prueba en `escenarios/ruta`).
- **Lista completa:** las conversaciones se listan siempre, con estado `bloqueada` y `bloqueo_mensaje`; sin carta, el mensaje es el mismo para ambos roles y el front muestra la carta pendiente, no la lista.
- **Tramo de una conversación:** se deduce de la primera condición COMPLETA_ACTIVIDAD de su regla, como `FichaCuenta.tramo`; sin columna nueva.
- **Varios hijos:** parámetro `estudiante` opcional (GET y acciones del apoderado); sin él, el primer vínculo. `ruta` agrega `VIN-LUIS` (Rosa ↔ Luis) para el selector.
- **`t-apo-carta` se retira:** la carta no es una actividad; la reemplaza `t-apo-2`, una informativa de prueba que conserva la secuencia. Es `DATO DE PRUEBA`: la segunda actividad real del apoderado y sus fichas entran con el contenido definitivo.
- **Diploma:** se conservan `obtenido`/`obtenido_en` (fecha del último COMPLETA_BLOQUE de su ruta) y se agrega `codigo` (`EXP-AP-AAAA-NNNNN-D`, §8.3; prefijo y cifras en `parametros.py`).
- **Fichas bloqueadas con su actividad:** `FichaCuenta.actividad` también en las bloqueadas, para el chip «{k} fichas al completar».
