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
- Pedido por el usuario tras la revisión en navegador: el panel decía «Iniciar actividad» de un registro a medias o con todo respondido y sin entregar, porque responder un ítem no tocaba las actividades cargadas (pasaba antes de este ajuste). Ahora `store/servidor/registro.ts` aplica a las actividades ya cargadas el `registro.estado` de cada paso confirmado (responder, seguimiento, reenviar), sin volver a pedirlas, como `actualizarFicha`.
- Pruebas adaptadas, autorizadas por la tabla de cierre de las observaciones: en `tests/servidor/registro/servidor-registro-flujo.test.mjs`, «con todo respondido y sin terminar…» y «rehacer…» ahora recorren los pasos de cierre antes de entregar, y `recorrerApertura` resuelve la pregunta de b1-1. Del back, los mensajes de `R-CIUDAD` y `R-c*` en `test_casos_contenido.py` y la `descripcion` de `tests/llm/casos/b1-6.json`. En `tests/integration/datos/test_conversaciones_contenido.py` sale `b1-5-p05` de `CORRECTAS`: esa pregunta ya no existe con el banco nuevo.

Anotado para otros ajustes (de las observaciones, sin tocar):

- ma1, diálogo 01: «Leí tu punto de origen y me quedé pensando.» Nadia ya no lee un punto de origen: escuchó la historia.
- ma2: sus 10 preguntas tienen el problema del largo, y su título dice «profesiones».
- Las demás batallas (b3-5, b3-7, b3-9, b3-b, b4-4, ma7-b): revisar el mismo patrón.
- Banco de b1-5: con los textos tal cual, la correcta es la más larga en 3 de 18 (p10, p13 y p15; en p10 por un carácter), no en 2 como decía el texto de observaciones. No se tocaron los textos.
- Fuentes de las fichas: Habermas y Bluck (2000), Savickas (2005), Bandura (1977), Low y otros (2005), Oettingen (2014) y Gollwitzer (1999) se citaron sin verificarlas en línea; los datos nuevos de F05 vienen de notas de prensa que citan la fuente original.

## Ajuste coherencia-bloque2

Decididas por el usuario en el texto de observaciones:

- b2-1 y la ficha F08 trabajan las cinco habilidades sociales que mide la página del libro (asertividad, empatía, expresión de sentimientos, resolución de problemas y liderazgo). Convivencia y comunicación quedan en una nota de la ficha.
- El tema de los cuestionarios entra en b2-1 por la historia de Rosa y una sola pregunta; el detalle queda en F07.
- La propuesta de Gardner no se presenta como un hecho: se dice que él propuso mirar la inteligencia de esa forma, sin nota sobre la discusión entre investigadores.
- Salen las personas famosas de la lámina de inteligencias y de F09; la ficha lleva tareas donde se usa cada inteligencia.
- En b2-3 sale la comparación que ponía «interés y propósito» por encima de «salario, estatus o presión»: no hay valores mejores que otros.
- En b2-4 los ítems los pide Nico, y la lámina trabaja «lo que te sale» y «lo que te gusta» sin los términos «aptitud» y «capacidad». A Nico le cuesta una parte de lo que quiere, no la carrera entera.
- En los registros, el personaje de la escena cuenta algo propio que muestra cómo se responde cada ítem, y es quien los pide.
- En las informativas, las láminas van después de que el estudiante resuelve algo y las presenta el personaje de la escena o nadie; Lumi no explica la teoría.
- Quien guarda las preguntas de cada página lo dice Rosa: Dora en b2-1, Bruno en b2-2 y Sol en b2-5. Ningún texto anuncia h1, h2 ni h3.
- El guardián de b2-5 calza con b1-7: la aguja se detiene y vuelve a moverse cuando el viajero dice qué entendió de sí en el bosque; no dice «tramo», no adelanta lo que viene y no nombra a la orientadora.
- Ningún texto dice que una carrera tiene un código RIASEC ni que se buscan carreras por letras; las ocupaciones sí tienen código y el filtro por letras se nombra solo para ellas.
- Salen del bloque «brújula» (b2-3), «bitácora», «tarjeta» para una lámina, los diálogos de Lumi «Esto lo lee tu orientadora…» y los adjetivos con género dirigidos al estudiante.

Tomadas en el ajuste:

- Sin cambios de código: la pregunta dentro de un registro y los pasos de cierre ya existían desde coherencia-bloque1, y los JSON nuevos solo usan nodos, bloques y expresiones ya admitidos.
- Los contenidos de F07–F10 se copiaron con un script desde los bloques markdown de las observaciones y se comprobó que el texto cargado es idéntico carácter por carácter (pedido por el usuario al aprobar).
- Ninguna prueba ni fixture contenía los textos cambiados; no se adaptó ninguna prueba.
- Revisión en navegador (base aparte con `contenido`): b2-1 a b2-5 completos, «Anterior» ida y vuelta en b2-1 y b2-4, preguntas con pista, registros con pregunta y pasos de cierre, salida y reingreso de b2-4 durante el cierre (vuelve al último ítem en lectura), tablas a 375 px, F07–F10 y lo que abre cada cierre. Las frases nuevas de Dora (visita 4) y Sol (visita 6) se comprobaron en el JSON, no en pantalla.

Vistos en la revisión, sin tocar (el ajuste no cambia código):

- `ResourceText.tsx` no quita el escape de «O\*NET»: la barra se ve en F07 y F10 (y ya se veía en F07 y F12 en `main`).
- `b2-4-cruce` no tiene `dialogo`, así que esa consigna no muestra a Nico (`RegistroPersonaje` no pinta nada sin texto); las otras dos sí.
- Un registro ya entregado se abre desde el inicio para rehacerlo («Ver o modificar mis respuestas»), como dice `useActivityPlayer`; solo uno respondido y sin entregar se abre en el último ítem. Las observaciones esperaban el último ítem también para los entregados.
- En la lámina `b2-5-08`, a unos 1024 px, la primera columna corta palabras («Investigad|or», «Emprende|dor»). A 375 px se ve bien.

Anotado para otros ajustes (de las observaciones, sin tocar):

- Código RIASEC por carrera: revisar la lámina de b4-1, las preguntas de la batalla b4-4 con la regla «si solo calza con el código…», F19, h3 («las cinco familias que salieron de tus intereses») y las conversaciones familiares.
- h1 (Mi reto): su diálogo 02 dice «Esto lo lee tu orientadora…», y su cierre, «plan de práctica» y «bitácora». Se ve con h2 y h3.
- b2-6 figura en los documentos de diseño como opcional y no existe en el repo.
- Fuentes: el dato del MTPE (F08 y `b2-1-14`) viene de una nota de Andina, ambigua en el «más del 80 %»; confirmarlo en el informe de la Encuesta de Demanda Ocupacional 2022. Caballo (2007) y Lent, Brown y Hackett (1994) sin verificar en línea; Durlak y otros (2011) y Su, Rounds y Armstrong (2009) verificadas por su resumen. No se comprobó que el Anexo 4.1 liste siete habilidades. La columna «Tareas donde se usa» de F09 es criterio de orientador.

## Merge de llm-sugerencias en main

- Al juntar llm-sugerencias (guion y pasos del plan a Claude Haiku) con cartas-diario (diario y cartas sin LLM), Gemini quedó sin ningún asistente. Decidido por el usuario: se retira en el mismo merge `gemini.py`, `evaluacion.py` (`EvaluadorFalso`), `app.state.evaluador_respuestas`, las variables `EVALUADOR` y `GEMINI_*`, sus parámetros (`MODELO_LLM_REGISTRO`, `TEMPERATURA_ASISTENTES`, `NIVEL_RAZONAMIENTO_ASISTENTES`, `PAUSA_CASOS_GEMINI_SEGUNDOS`, `TIEMPO_MAXIMO_EVALUACION_SEGUNDOS`) y la dependencia `google-genai`.
- Pruebas retiradas o adaptadas por ese retiro: salen `test_evaluador_gemini.py`, `test_arranque_registro.py` y `soporte_red.py`; `test_configuracion_registro.py` pasa a probar `ANTHROPIC_API_KEY`; las del exportador de fixtures ya no restauran `EVALUADOR`; la pregunta del día de `test_cartas_adaptadas.py` ya no reemplaza el evaluador.
- `test_semilla_ruta.py` toma `opcion_lista` = 123 de llm-sugerencias (DIFICULTADES sin SALUD) y `referencia` = 12 de cartas-diario.
- Las dos ramas traían una migración 0053. La de cartas-diario (`0053_cartas_diario`) queda; las de llm-sugerencias, que no tocan sus tablas, se renumeran encima: guion 0053 → 0054 y pasos 0054 → 0055.
