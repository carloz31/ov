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
- En un registro del servidor no había pasos después de la última consigna; desde el ajuste coherencia-bloque1 sí los hay (ver abajo).
- Pruebas adaptadas, autorizadas por las observaciones: `tests/local/actividades/actividades-anterior.test.mjs` (pregunta, paso tras una pregunta, registro entregado y primer ítem de un cuestionario ahora tienen «Anterior») y `tests/servidor/planes/servidor-planes-vistas.test.mjs` (el aviso de misma familia ya no aparece).
- Se borran los estilos `.sx-p-aviso`, que solo usaba el aviso de misma familia.

## Ajuste coherencia-bloque1

Decididas por el usuario en el texto de observaciones:

- Los registros pueden llevar una pregunta con respuesta correcta antes de los ítems y pasos de cierre después del último ítem.
- Quién ve los registros se dice una sola vez, en una lámina de b1-1 (el primer registro); sale de todos los registros el diálogo de Lumi «Esto lo lee tu orientadora…».
- Ningún texto anuncia en qué actividad reaparece lo que el estudiante escribe.
- Nadia no entrega ni traza un mapa del viajero: el mapa de la isla ya lo lleva y salió de su taller.
- El artefacto de Iván no lleva al pergamino de un salto: acerca cada vez un poco más y toma su rumbo de lo que el viajero entiende de sí; cuando se queda quieto, algo o alguien lo ayuda a orientarse.
- Familia se nombra en los diálogos de b1-3 sin explicar el módulo ni la carta.
- Las opciones de una pregunta, en actividades y batallas, tienen un largo parecido y distractores verosímiles; la correcta no se reconoce por ser la más larga.
- Las actividades y la ficha de mitos enseñan a no cambiar un mito por su versión al revés.
- La historia de Lumi solo se insinúa: no cuenta de dónde viene (b1-1) y siempre mira el faro y se da la vuelta (b1-2).

Tomadas en el ajuste:

- `NODOS_PERMITIDOS.registro` admite `pregunta`. En un registro del servidor sus intentos van al navegador, como en un encuentro; `entregar` no los mira.
- En api, continuar la última consigna lleva a los pasos de cierre, si los hay, y el registro se entrega al continuar el último (`useActivityPlayer.move` llama a `registro.entregar()` en vez de `completar-actividad`, que rechaza los registros), con el cargador y el aviso de error del reproductor. Sin pasos de cierre (los de `ruta`), continuar la última consigna entrega como antes. Se entrega al final, y no al dejar el último ítem, para que quien sale durante los pasos de cierre vuelva al último ítem en lectura (registro con todo respondido y sin terminar) y siga desde ahí, como pide la tabla de cierre.
- Pruebas adaptadas, autorizadas por la tabla de cierre de las observaciones: en `tests/servidor/registro/servidor-registro-flujo.test.mjs`, «con todo respondido y sin terminar…» y «rehacer…» ahora recorren los pasos de cierre antes de entregar, y `recorrerApertura` resuelve la pregunta de b1-1. Del back, los mensajes de `R-CIUDAD` y `R-c*` en `test_casos_contenido.py` y la `descripcion` de `tests/llm/casos/b1-6.json`. En `tests/integration/datos/test_conversaciones_contenido.py` sale `b1-5-p05` de `CORRECTAS`: esa pregunta ya no existe con el banco nuevo.

Anotado para otros ajustes (de las observaciones, sin tocar):

- ma1, diálogo 01: «Leí tu punto de origen y me quedé pensando.» Nadia ya no lee un punto de origen: escuchó la historia.
- ma2: sus 10 preguntas tienen el problema del largo, y su título dice «profesiones».
- Las demás batallas (b3-5, b3-7, b3-9, b3-b, b4-4, ma7-b): revisar el mismo patrón.
- Revisión en navegador: en api, el panel de una actividad dice «Iniciar actividad» para un registro a medias o con todo respondido y sin entregar, aunque el servidor ya lo tenga EN_CURSO: el almacén de actividades no se refresca al responder ítems. Pasaba antes de este ajuste con cualquier registro a medias; no se cambia sin decisión del usuario.
- Banco de b1-5: con los textos tal cual, la correcta es la más larga en 3 de 18 (p10, p13 y p15; en p10 por un carácter), no en 2 como decía el texto de observaciones. No se tocaron los textos.
- Fuentes de las fichas: Habermas y Bluck (2000), Savickas (2005), Bandura (1977), Low y otros (2005), Oettingen (2014) y Gollwitzer (1999) se citaron sin verificarlas en línea; los datos nuevos de F05 vienen de notas de prensa que citan la fuente original.

## Merge de llm-sugerencias en main

- Al juntar llm-sugerencias (guion y pasos del plan a Claude Haiku) con cartas-diario (diario y cartas sin LLM), Gemini quedó sin ningún asistente. Decidido por el usuario: se retira en el mismo merge `gemini.py`, `evaluacion.py` (`EvaluadorFalso`), `app.state.evaluador_respuestas`, las variables `EVALUADOR` y `GEMINI_*`, sus parámetros (`MODELO_LLM_REGISTRO`, `TEMPERATURA_ASISTENTES`, `NIVEL_RAZONAMIENTO_ASISTENTES`, `PAUSA_CASOS_GEMINI_SEGUNDOS`, `TIEMPO_MAXIMO_EVALUACION_SEGUNDOS`) y la dependencia `google-genai`.
- Pruebas retiradas o adaptadas por ese retiro: salen `test_evaluador_gemini.py`, `test_arranque_registro.py` y `soporte_red.py`; `test_configuracion_registro.py` pasa a probar `ANTHROPIC_API_KEY`; las del exportador de fixtures ya no restauran `EVALUADOR`; la pregunta del día de `test_cartas_adaptadas.py` ya no reemplaza el evaluador.
- `test_semilla_ruta.py` toma `opcion_lista` = 123 de llm-sugerencias (DIFICULTADES sin SALUD) y `referencia` = 12 de cartas-diario.
- Las dos ramas traían una migración 0053. La de cartas-diario (`0053_cartas_diario`) queda; las de llm-sugerencias, que no tocan sus tablas, se renumeran encima: guion 0053 → 0054 y pasos 0054 → 0055.
