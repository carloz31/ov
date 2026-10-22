# Decisiones de la spec en curso

<!-- Spec en curso: F04c (docs/specs/F04c.md). -->

- **Modelo (F04c).** `actividad.vidas_enemigo` y `actividad.destellos`, con CHECK solo en BATALLA (≥ 1). Son configuración de la batalla en el servidor; del desafío del front quedan el personaje, la ilustración y la narrativa. `CONFIGURACION_BATALLAS` (vidas, destellos, preguntas por intento) reemplaza `PREGUNTAS_POR_INTENTO` en `ruta`; `t-batalla` tiene 5 vidas y 3 destellos.
- **El servidor decide la victoria.** `resolver-batalla` recibe solo las respuestas, en orden; cada acierto quita una vida y cada error, un destello. El intento debe terminar justo en la última respuesta (422 si no termina o si sobran). Responde `victoria`, `practica`, `aciertos`, `preguntas` y `destellos_restantes`; VENCE_DESAFIO_INTACTO es vencer con todos los destellos.
- **El cierre sale de la respuesta.** En el front, el cálculo local solo anima la batalla; el tipo de cierre y los chips salen de la respuesta del servidor. Mientras se envía, «Guardando tu intento…»; si falla, el error estándar con «Reintentar», que reenvía las mismas respuestas sin repetir la batalla.
- **Carga de la configuración.** Mientras no llegan vidas y destellos, la intro muestra «Preparando la batalla…» en lugar de las reglas y «Enfrentar»; si la lectura falla, el aviso de error estándar del reproductor.
- **Validaciones del cargador.** `preguntas_por_intento ≥ vidas + destellos − 1` (para que todo intento pueda terminar) y el pool, al menos el doble; una batalla sin configuración no se carga.
- **Intro aparte.** `ChallengeStage` estaba en el límite de 300 líneas: la intro pasa a `IntroDesafio.tsx`, con el mismo marcado. Como no tiene hooks, `ChallengeStage` la llama como función para que su marcado quede en línea y el arnés de `tests/local` lo siga viendo sin cambiar esas pruebas.
- **Respuestas en lote.** Las respuestas de un intento se insertan en una sola escritura, para no exceder el presupuesto de consultas.
- **Migración 0021.** Las batallas ya cargadas quedan con 1 vida y 1 destello hasta recargar los datos; el downgrade se detiene si hay batallas configuradas.
