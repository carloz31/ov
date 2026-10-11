# Especificación: registros que usan respuestas previas y misiones adicionales

Oct 6, 2026 · @Carlos Sanchez

Esta especificación agrega cuatro piezas a la experiencia del estudiante para promover respuestas desarrolladas en los registros: un aviso de uso en los ítems que alimentan otras preguntas, preguntas personalizadas con las propias palabras del estudiante, una pregunta genérica que explica qué detalle faltó y misiones adicionales que aparecen en el mapa tras una respuesta desarrollada. El diseño de referencia está en la página Reflexión del prototipo [Progreso y retroalimentación](https://claude.ai/artifact/1vusmJWnPqmSMCffqVvJeE).

## Contexto y alcance

El objetivo es que el estudiante vea que darse el tiempo de responder con detalle tiene un efecto concreto en su recorrido. Quien desarrolla sus respuestas recibe preguntas sobre su propia vida y descubre misiones adicionales; quien responde con poco detalle recibe preguntas generales y un aviso que le dice qué detalle habría cambiado la pregunta. Nadie pierde contenido ni avance.

- **Aplica a:** las actividades de registro de los bloques con `Bloque.audiencia = ESTUDIANTE` y el mapa del Camino.
- **No cambia:** el flujo de preguntas de seguimiento, que ya está implementado y se reutiliza tal cual; las vistas del apoderado; el panel de la orientadora, que tendrá su propia especificación.
- **Estilo:** las vistas usan la tarjeta clara de registro actual (medallón de Lumi arriba, enunciado en negrita, ayuda en gris, área de texto, contador, aviso de visibilidad y botón azul #3F4BA8) y los nodos actuales del mapa.
- **Respuesta desarrollada:** en este documento, una respuesta de registro es **desarrollada** cuando su estado es `FINAL` y su última `EvaluacionRespuesta` tiene `clasificacion = ADECUADA`, ya sea en el primer intento o después de responder un seguimiento. Una respuesta es **poco desarrollada** en cualquier otro caso evaluado por el LLM. Las respuestas con `NO_EVALUADA` no cuentan como desarrolladas ni como poco desarrolladas.
- **Privacidad:** nunca se usan entradas del diario. Solo respuestas de registro, que la orientadora ya puede ver.
- **Textos:** los textos entre comillas son literales, en español y con trato de tú. Los marcados entre corchetes son marcadores.

## Aviso de uso en los ítems que alimentan otras preguntas

Cuando un ítem de registro se usa como origen de una pregunta personalizada posterior, el estudiante lo sabe antes de responder.

- **Cuándo aparece:** solo en los ítems que figuran como origen en la configuración de alguna pregunta personalizada (sección siguiente). Se calcula a partir de esa configuración; no requiere un campo propio.
- **Texto:** "Lumi recordará esto en «{actividad 1}» y en «{actividad 2}»." con los títulos de las actividades de destino, en negrita y en orden del recorrido. Con una sola: "Lumi recordará esto en «{actividad}»." Con más de dos: las dos primeras y "y en otras actividades". Si el proyecto vocacional usa el ítem como material de partida, se incluye como destino «Mi proyecto vocacional».
- **Ubicación y estilo:** debajo de la ayuda en gris y antes del área de texto. Recuadro ámbar suave (fondo #FFF8E6, borde 1 px #F1D48A, radio 10 px, texto #5A3B00 a 14 px) con una estrella de Lumi de 16 px a la izquierda.
- **Destinos no visibles todavía:** si una actividad de destino es una misión adicional no desbloqueada, no se nombra, para no revelarla.
- **Primera vez en el recorrido:** en el primer ítem con aviso, aparece una línea de Lumi debajo de su medallón: "Lo que escribas ahora te servirá más adelante en tu camino." Solo una vez por estudiante.

## Preguntas personalizadas

Una pregunta personalizada reformula el enunciado de un ítem para anclarlo a lo que el estudiante escribió antes, citando sus propias palabras. Solo se genera cuando la respuesta de origen es desarrollada.

### Configuración por ítem

| Campo | Descripción |
| --- | --- |
| `personalizable` | Activa la personalización del ítem |
| `itemsOrigen` | Uno o más `ItemRegistro` anteriores en el recorrido, en orden de preferencia |
| `enunciado` | La pregunta base del ítem. Es la pregunta genérica y la referencia para el LLM |
| `instruccionPersonalizacion` | Qué conexión debe hacer la pregunta con el origen. Ejemplo: "Pregunta qué parte de esa frase le pesa y qué parte no comparte" |

Los `CriterioCompletitud` del ítem no cambian: la pregunta personalizada se evalúa con los mismos criterios que la base.

### Generación

1. **Cuándo:** al entrar a la actividad que contiene el ítem, se generan en segundo plano las preguntas de todos sus ítems personalizables. Si el ítem es el primero de la actividad, se muestra un estado de carga breve en la tarjeta (el medallón de Lumi con una animación suave).
2. **Elección del origen:** se toma el primer ítem de `itemsOrigen` cuya respuesta sea desarrollada. Si ninguno lo es, se usa la pregunta genérica por falta de detalle (sección siguiente).
3. **Entrada al LLM:** el `enunciado`, la `instruccionPersonalizacion`, el título de la actividad de origen y el texto completo de la respuesta de origen (texto inicial más respuestas a seguimientos).
4. **Salida del LLM, en JSON:** `{ "pregunta": string, "cita": string }`.
5. **Reglas para el LLM:**
   - `cita` es un fragmento literal de la respuesta de origen, de 3 a 15 palabras, sin cambiar ni corregir nada.
   - `pregunta` contiene `cita` exactamente, entre comillas latinas «», y mantiene el propósito del `enunciado`.
   - No interpreta ni concluye nada sobre el estudiante, no da consejos, no sugiere qué responder y no juzga lo que escribió.
   - Trato de tú, una o dos oraciones, como máximo 45 palabras.
6. **Validación en el servidor:** se rechaza la salida si `cita` no aparece literalmente en la respuesta de origen (ignorando mayúsculas y espacios repetidos), si `pregunta` no contiene `cita` o si supera la longitud. Ante un rechazo se reintenta una vez; si vuelve a fallar, se usa la pregunta genérica de respaldo.
7. **Tiempo límite:** 6 segundos. Si no hay respuesta válida a tiempo, se usa la pregunta genérica de respaldo.

### Interfaz

Dentro de la tarjeta de registro, entre el medallón de Lumi y el enunciado:

- **Recuadro de recuerdo:** fondo #EEF1FB, borde 1 px #C9D1F2, radio 12 px. Una línea con ícono de reloj: "Lumi recuerda lo que escribiste en «{actividad de origen}»" (13 px, peso 600, #3F4BA8). Debajo, la cita en cursiva entre «». Debajo, el enlace "Ver tu respuesta completa", que abre un diálogo de solo lectura con la respuesta de origen completa.
- **Enunciado:** la pregunta generada, con el fragmento de la cita resaltado en #3F4BA8.
- La ayuda en gris, el contador, el aviso de visibilidad y los botones se mantienen como en cualquier registro. El seguimiento funciona igual que hoy.

### Registro

- Cada pregunta mostrada se guarda de forma inmutable, asociada a la respuesta del estudiante, con: `tipo` (PERSONALIZADA, GENERICA\_FALTA\_DETALLE o GENERICA\_RESPALDO), `texto` mostrado, `cita`, `respuestaOrigen`, `criteriosFaltantesOrigen`, `modelo`, `versionPrompt`, `latenciaMs`, `error` y `fechaHora`. Es análogo a `EvaluacionRespuesta`.
- La pregunta se genera una sola vez por ítem y estudiante. Al volver a la actividad o repasarla se muestra la misma, aunque la respuesta de origen se haya editado después.
- La evaluación de la respuesta recibe como enunciado el `texto` mostrado, no el `enunciado` base.

## Pregunta genérica por falta de detalle y por respaldo

Cuando no se puede personalizar, se muestra el `enunciado` base. Hay dos casos, y solo el primero se explica al estudiante.

### Por falta de detalle en el origen

Ocurre cuando ninguna respuesta de `itemsOrigen` es desarrollada. El estudiante ve qué detalle habría cambiado la pregunta, sin reproche y sin que se cite su respuesta.

- **Configuración:** cada `CriterioCompletitud` recibe un campo nuevo, `fraseAviso`, redactado por el equipo de contenido para completar la oración "no me contaste mucho sobre…". Ejemplo para el ítem de «Mis propios pregones»: "qué frase has escuchado" y "quién la dice".
- **Texto:** "En «{actividad de origen}» no me contaste mucho sobre {frases}, así que esta vez te pregunto de forma general." Las frases salen de `criteriosFaltantes` de la última `EvaluacionRespuesta` del origen preferido, en el orden del ítem. Dos o más se unen con "ni" ante la última ("qué frase has escuchado ni quién la dice"), con un máximo de dos. Si un criterio no tiene `fraseAviso`, se usa "lo que te pedía la pregunta".
- **Interfaz:** entre el medallón de Lumi y el enunciado, un recuadro neutro (fondo #F4F5F8, borde 1 px #E3E6EE, radio 12 px, texto #2B3044 a 15 px) con las frases en negrita. No se usa naranja ni íconos de advertencia, para que no se lea como un error.
- **El aviso no se repite:** si dos ítems de la misma actividad dependen del mismo origen poco desarrollado, el aviso aparece solo en el primero.
- **La respuesta de origen no se edita aquí:** no se ofrece completar la respuesta anterior.

### Por respaldo

Ocurre cuando el LLM falla, devuelve una salida inválida dos veces o supera el tiempo límite. Se muestra el `enunciado` base sin ningún aviso, y se registra como `GENERICA_RESPALDO`.

### Otros casos

- Si el ítem de origen no tiene respuesta (por ejemplo, porque pertenece a una misión adicional que el estudiante no hizo), se trata como respaldo: pregunta base sin aviso.
- Si la respuesta de origen está `NO_EVALUADA`, también se trata como respaldo, porque no se sabe qué detalle faltó.

## Misiones adicionales que aparecen en el mapa

Una misión adicional es una actividad opcional que no existe en el mapa hasta que el estudiante da una respuesta desarrollada en un ítem determinado. Al volver al mapa, aparece su nodo y se traza el sendero desde la actividad donde respondió.

### Configuración

| Campo | Descripción |
| --- | --- |
| `esAdicional` | Marca la actividad como misión adicional |
| `actividadOrigen` | Actividad desde la que se traza el sendero |
| `posicionMapa` | Coordenadas del nodo en el mapa, igual que las demás actividades |
| Reglas de desbloqueo | Una `ReglaDesbloqueo` con objetivo ACTIVIDAD y una condición `RESPUESTA_REFLEXIVA` sobre el ítem que la abre. Para dar una segunda oportunidad, se agregan reglas alternativas con el mismo objetivo sobre otros ítems del mismo bloque |

Las misiones adicionales solo contienen contenido complementario (registros, actividades informativas, desafíos o testimonios extra). Ningún contenido del proceso base puede quedar dentro de una misión adicional.

### Evento `RESPUESTA_REFLEXIVA`

Se registra una vez por respuesta, en el momento en que pasa a ser desarrollada: al primer envío si la evaluación es ADECUADA, o al responder un seguimiento cuya evaluación posterior es ADECUADA. Si el repositorio ya emite este evento para los logros ocultos, se ajusta a esta definición para que también cuenten las respuestas ampliadas tras un seguimiento.

### Efecto en el avance

Las misiones adicionales no forman parte del avance obligatorio:

- No cuentan en el denominador de `calcularAvance()` ni en la condición de completar las Misiones de Campo.
- No intervienen en la alerta `AVANCE_BAJO_PROMEDIO` ni en los requisitos de los niveles.
- Al completarse, sí cuentan en el gráfico radial por temática y pueden desbloquear fichas, desafíos o insignias con reglas propias, como cualquier actividad.

### Aparición en el mapa

- **Antes del desbloqueo**, el nodo y su sendero no se dibujan. No hay nodo bloqueado ni pista.
- **Al volver al mapa** con un `Desbloqueo` de misión adicional que tiene `visto = false`, se reproduce la secuencia. Si el nodo queda fuera de la vista, primero se desplaza el mapa para que se vean el nodo de origen y el nuevo.

| Momento | Qué ocurre |
| --- | --- |
| 0,5 s | El nodo aparece con un rebote (`pop`) y un anillo dorado que se expande (`ring`) |
| 0,9 s | Aparecen su etiqueta y la marca "Misión adicional" |
| 1,15 s a 2,55 s | Se traza el sendero discontinuo desde el nodo de `actividadOrigen` hasta el nuevo, revelado con una máscara que avanza sobre la línea |
| 2,7 s | Aparece la tarjeta de Lumi |

- Al terminar la secuencia se marca `visto = true`. Si el estudiante sale antes, se repite la próxima vez.
- Si hay varias misiones nuevas, las secuencias se reproducen una tras otra y Lumi aparece una sola vez al final.

### Estilo del nodo y del sendero

- **Nodo disponible:** el estilo de los nodos disponibles (62 px, fondo #3F4BA8, borde 3 px blanco, ícono según el tipo: pluma para registro, libro para informativa) más una insignia de estrella de 22 px en la esquina superior derecha (fondo #3A3220, borde 2 px #F2C66D, estrella #FFD666). Mientras esté pendiente, el nodo late con un halo dorado suave.
- **Etiqueta:** la etiqueta blanca de siempre y, debajo, la marca "Misión adicional" (fondo #FFF8E6, borde #F1D48A, texto #5A3B00, 11 px, peso 700).
- **Sendero pendiente:** línea discontinua #FFF4C8 de 4 px con un brillo dorado suave.
- **Completada:** el nodo y el sendero adoptan el estilo de las actividades completadas (verde, con check y línea continua). La insignia de estrella se mantiene.

### Aviso de Lumi

Por solicitud directa del usuario del 6 de octubre de 2026, se usa el mismo aviso compacto inferior de las insignias: avatar de Lumi, etiqueta "Nueva misión adicional", título de la misión, texto de origen, acción "Ver la misión" con estilo de enlace y X "Cerrar aviso". Se cierra automáticamente a los siete segundos y no mueve el foco. Los avisos de insignias se muestran después de este aviso, sin superponerse. Los diálogos de guía/señal y el detalle de un punto pausan su presentación, conservando el aviso pendiente.

- **Primera misión adicional del estudiante:** "Algunos senderos solo aparecen cuando te detienes a pensar. Lo que escribiste en «{actividadOrigen}» abrió una misión nueva."
- **Siguientes:** "Se abrió otra misión desde «{actividadOrigen}»."

Nunca se menciona el logro oculto ni qué regla abrió la misión.

### Detalle de la misión

Al tocar el nodo se abre la tarjeta de detalle habitual de las actividades, con la etiqueta "MISIÓN ADICIONAL · OPCIONAL", el título, la descripción, el tipo, la duración estimada y los botones "Emprender" y "Más tarde".

### Al completarla

Si la misión tiene un logro oculto asociado (insignia con `esOculta = true` y regla `COMPLETA_ACTIVIDAD`), se entrega en la pantalla de cierre como cualquier desbloqueo.

## Criterios de aceptación

Las animaciones del mapa se desactivan con `prefers-reduced-motion`: el nodo, el sendero y la tarjeta de Lumi se muestran directamente en su estado final.

- [ ] Un ítem configurado como origen muestra el aviso "Lumi recordará esto en…" con los títulos de sus destinos visibles, y no nombra misiones adicionales no desbloqueadas.
- [ ] La línea "Lo que escribas ahora te servirá más adelante en tu camino." aparece una sola vez por estudiante.
- [ ] Con una respuesta de origen desarrollada, el ítem muestra el recuadro de recuerdo con la cita literal y el enunciado con la cita resaltada.
- [ ] Una salida del LLM cuya cita no aparece literalmente en el origen se rechaza; tras un segundo rechazo o 6 segundos sin respuesta se muestra la pregunta base sin aviso.
- [ ] "Ver tu respuesta completa" abre la respuesta de origen en solo lectura.
- [ ] Con un origen poco desarrollado, se muestra el recuadro neutro con las frases de `fraseAviso` de los criterios faltantes y la pregunta base.
- [ ] Cada pregunta mostrada queda registrada con su tipo, texto, cita y origen, y se reutiliza al volver a la actividad o repasarla.
- [ ] La respuesta a una pregunta personalizada se evalúa con los criterios del ítem y con el texto que vio el estudiante.
- [ ] Ninguna entrada del diario se envía al LLM para personalizar.
- [ ] Una misión adicional no aparece en el mapa hasta que su regla se cumple.
- [ ] Una respuesta ampliada tras un seguimiento que termina en ADECUADA registra `RESPUESTA_REFLEXIVA` y puede abrir una misión adicional.
- [ ] Al volver al mapa con un desbloqueo no visto se reproduce la secuencia completa, en el orden y con los tiempos indicados, y luego `visto` pasa a `true`.
- [ ] La primera misión adicional del estudiante muestra el mensaje largo de Lumi; las siguientes, el corto.
- [ ] Las misiones adicionales no alteran el porcentaje de avance, la condición de Misiones de Campo completas, los niveles ni la alerta de avance bajo.
- [ ] Al completar una misión adicional, su nodo y su sendero pasan al estilo de completado y conservan la insignia de estrella.
- [ ] El flujo de seguimiento existente no cambia.
