# Decisiones de la spec en curso

<!-- Spec en curso: F04b (docs/specs/F04b.md). -->

- **Modelo (F04b).** Nuevas `pregunta_batalla` (pool de cada batalla: enunciado, opciones, índice de la correcta, explicación y ficha obligatoria) y `respuesta_batalla` (las respuestas de cada intento); `actividad.preguntas_por_intento` con CHECK solo en BATALLA. Las preguntas pasan al servidor para elegirlas al azar y guardar lo respondido; cada una sale de una ficha.
- **Fichas derivadas.** Las fichas de una batalla se derivan de sus preguntas, sin tabla aparte: `BatallaCuenta.fichas`, en el orden de su primera pregunta.
- **Azar por intento.** `GET /cuentas/{c}/batallas/{a}/preguntas` toma `preguntas_por_intento` al azar del pool y mezcla las opciones; cada opción conserva su índice, que es lo que se responde. El exportador fija la semilla para que el fixture sea estable.
- **Victoria en el front, aciertos en el servidor.** Vidas y destellos siguen en el desafío del front, que decide `victoria`; el servidor cuenta aciertos y preguntas desde `respuestas` (se retiran del cuerpo).
- **Pool del doble.** El cargador falla si el pool es menor que el doble de `preguntas_por_intento`. `t-batalla` sube a 14 preguntas (las 10 de `desafio-rumor` y 4 nuevas, 7 por ficha) con 7 por intento, el mínimo para que un intento con 5 vidas y 3 destellos siempre termine; bajar a 5 exigía tocar las vidas de `challenges.ts`, que comparte el modo local.
- **`t-ficha-2`.** Segunda ficha de prueba que también da `t-inicio`, para que la batalla tenga dos fichas disponibles antes de abrirse.
- **Migración 0020.** Las batallas ya cargadas quedan con 1 pregunta por intento hasta recargar los datos; el downgrade se detiene si hay preguntas de batalla, como las migraciones anteriores con datos que no caben.
