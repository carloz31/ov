# Decisiones de la spec en curso

## Ajuste coherencia-bloque0

Decididas por el usuario en el texto de observaciones:

- Las actividades presentan el tema dentro de la historia: primero el estudiante resuelve algo y después llega la lámina, corta. El detalle queda en la ficha.
- Lumi no tiene género en ningún texto, y no habla como profesor.
- La orientadora no se nombra en boca de los personajes: quién ve cada cosa se dice en una lámina o en la explicación de una pregunta.
- Se habla de carreras y ocupaciones, como en el catálogo.
- El libro de Helena tiene páginas con sello, no capítulos.
- «Opción inicial» no se le nombra al estudiante: solo se le dice que, si guarda pronto su plan, al final verá con qué idea empezó.
- La señal se llama «Tu señal de hoy», no «check-in».
- El aviso de misma familia no se muestra al estudiante: dos planes cercanos son normales. `GET /planes` sigue entregando `avisos` para la orientadora; sale el pendiente «Es a propósito».
- «Anterior» está en todos los pasos, salvo la pantalla de Lumi de un registro y el cierre. El cambio alcanza al modo local (excepción aprobada).

Tomadas en el ajuste:

- `NODOS_PERMITIDOS.instrumento` admite `diapositiva`, porque b0-3 lleva una lámina dentro del cuestionario y la validación de contenidos la rechazaba. `cuestionarioServidor` y el reproductor ya la pintan sin más cambios.
- Los textos de `t-ins-1` se sobrescriben en `contenido.py` a partir de `ruta.INSIGNIAS` y `ruta.TEXTOS_INSIGNIAS`, cambiando solo el requisito y el «cómo se consiguió», para no tocar `ruta` ni sus pruebas.
- Al rehacer una actividad, los intentos de una pregunta no se guardan: el reproductor los recuerda por nodo en esa visita (`intentosRevision`) para que la pregunta se vea resuelta al volver con «Anterior». Fuera de rehacer, ya se releen de los intentos del navegador.
- En un registro del servidor no hay pasos después de la última consigna (continuarla entrega y cierra); «Anterior» tras la última consigna solo aplica en los registros locales.
- Pruebas adaptadas, autorizadas por las observaciones: `tests/local/actividades/actividades-anterior.test.mjs` (pregunta, paso tras una pregunta, registro entregado y primer ítem de un cuestionario ahora tienen «Anterior») y `tests/servidor/planes/servidor-planes-vistas.test.mjs` (el aviso de misma familia ya no aparece).
- Se borran los estilos `.sx-p-aviso`, que solo usaba el aviso de misma familia.

## Merge de llm-sugerencias en main

- Al juntar llm-sugerencias (guion y pasos del plan a Claude Haiku) con cartas-diario (diario y cartas sin LLM), Gemini quedó sin ningún asistente. Decidido por el usuario: se retira en el mismo merge `gemini.py`, `evaluacion.py` (`EvaluadorFalso`), `app.state.evaluador_respuestas`, las variables `EVALUADOR` y `GEMINI_*`, sus parámetros (`MODELO_LLM_REGISTRO`, `TEMPERATURA_ASISTENTES`, `NIVEL_RAZONAMIENTO_ASISTENTES`, `PAUSA_CASOS_GEMINI_SEGUNDOS`, `TIEMPO_MAXIMO_EVALUACION_SEGUNDOS`) y la dependencia `google-genai`.
- Pruebas retiradas o adaptadas por ese retiro: salen `test_evaluador_gemini.py`, `test_arranque_registro.py` y `soporte_red.py`; `test_configuracion_registro.py` pasa a probar `ANTHROPIC_API_KEY`; las del exportador de fixtures ya no restauran `EVALUADOR`; la pregunta del día de `test_cartas_adaptadas.py` ya no reemplaza el evaluador.
- `test_semilla_ruta.py` toma `opcion_lista` = 123 de llm-sugerencias (DIFICULTADES sin SALUD) y `referencia` = 12 de cartas-diario.
- Las dos ramas traían una migración 0053. La de cartas-diario (`0053_cartas_diario`) queda; las de llm-sugerencias, que no tocan sus tablas, se renumeran encima: guion 0053 → 0054 y pasos 0054 → 0055.
