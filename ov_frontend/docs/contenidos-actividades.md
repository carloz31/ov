# Contenidos de actividades

Formato de los JSON de `src/data/activities/contenidos/<clave>.json`. El tipo de referencia es `Actividad` en `src/types/activities.ts`; la validación está en `src/lib/activities/validation.ts`. El backend solo conoce la clave (`actividad.contenido`) y no interpreta el contenido.

## Principio

Toda actividad, de cualquier rol, es el mismo objeto: metadatos, una lista ordenada de `nodos` y una `recompensa`. El **tipo** decide qué nodos se permiten y cuándo está completa; la **audiencia**, solo cómo se dibuja.

| Front (`tipo`) | Backend (`TipoActividad`) | Nodos permitidos |
|---|---|---|
| `encuentro` | INFORMATIVA | `dialogo`, `eleccion`, `diapositiva`, `pregunta` |
| `registro` | REGISTRO | `dialogo`, `eleccion`, `consigna` |
| `instrumento` | CUESTIONARIO | `dialogo`, `eleccion`, `item`, `resultado` |

- `audiencia`: `estudiante` (inmersivo, por defecto) o `apoderado` (sobrio). El apoderado solo admite `encuentro`.
- **Contenido solo de posición:** un JSON con `nodos: []` dibuja el punto en el mapa («Contenido pendiente» si está disponible), pero no se puede abrir. En el portal del apoderado, la actividad se lista sin poder iniciarse.
- **Cuestionario del servidor:** en un `instrumento`, un nodo `item` con `itemId: "plantilla"` se repite con los ítems del servidor (`GET /actividades/{a}/items`), en su orden y con su escala, entre los diálogos del contenido. Así se responde `t_partida`, sin nodo `resultado`.
- **Registro del servidor (F01):** en api, cada `consigna` de un registro lleva `"item": "<código del ítem>"` (`t-exp-ruta`). La premisa, la obligatoriedad y la elección (lista, «otra», mínima, máxima y orden) salen del servidor; del nodo se usan `hablanteId`, `ayuda` y `placeholder`. Todo ítem del servidor necesita su consigna y toda consigna un ítem existente; si no, la actividad no se abre. El registro termina en su última consigna, cuyo botón dice «Entregar»: los nodos que sigan no se muestran. La visibilidad es fija para todo registro (estudiante y orientadora); `visibilidad` del nodo solo la usa el modo local.
- **Podio «top N» (F01):** en api, un ítem con elección ordenada de N fijo (mínima = máxima > 1), sin «otra» y sin referencia se responde con un podio (`RankingPodium`): tocar una ficha la coloca en el primer puesto libre, tocar un puesto la devuelve y arrastrar intercambia. Al completarlo aparece la explicación del primer lugar. Se guarda igual que cualquier elección ordenada (opciones en orden y texto). La consigna puede traer `podio: { etiquetaPrimero, pregunta, unidad: { singular, plural }, iconos }`: `pregunta` usa `{opcion}` para el nombre del primer lugar e `iconos` asigna a cada código de opción un nombre de `features/activities/data/iconosRegistro.ts`. Sin `podio`, se usan «Lo más importante», «¿Por qué «{opcion}» es lo más importante para ti?» y «opción/opciones». Hoy lo usa `t_valores`.
- **Elección guiada (F01):** en api, un ítem con elección sin orden de lista propia o común (no por referencia) se responde con tarjetas (`ChoiceReveal`): tocar alterna; con el máximo alcanzado las demás se atenúan y una más no reemplaza (con máxima 1 actúa como radio); las `exclusivas` quitan a las demás; «Otra» muestra su campo dentro de la tarjeta. Al haber una selección se revela la explicación. Se guarda igual que antes (opciones con el texto de «Otra» y texto). La consigna puede traer `eleccion: { etiquetaElegida, exclusivas, iconos, mensajes: { inicio, una, maximo, bloqueada, exclusiva }, pregunta, preguntas, preguntaExclusiva, errorSeleccion, errorOtra }`: `pregunta` usa `{opciones}` (lo elegido en minúsculas, unido con comas e «y») y `preguntas` da la pregunta propia de una opción elegida sola. Podio y elección comparten Lumi, consigna, explicación, validación y botón (`RegistroGuiado`, `RegistroExplicacion`). Hoy la usan Ruta y Apoyo de `t_expectativas`.
- **Textos en api:** título, descripción, duración y bloque los da el servidor; los campos del JSON (`titulo`, `duracionEstimadaMin`, `bloque`…) quedan porque los exige el tipo `Actividad` y los usa el modo local.
- `presentacion` (solo instrumentos): `narrativa` dibuja todos los nodos; `directa`, solo `item` y `resultado`.
- `plantilla` (solo registros): `secuencial` (una consigna tras otra) o `matriz` (celdas `columna.fila`; sirve para línea de tiempo o FODA).
- `mapa` (opcional): `{ x, y, icono, origen? }` para dibujar la actividad como punto del mapa. Sin `mapa`, no se dibuja.
  - `origen`: código de la actividad desde la que sale la línea propia de una opcional. En api, una opcional con `origen` se dibuja fuera del camino principal, como las misiones adicionales: con línea punteada mientras está pendiente y verde al completarse. Sin `origen`, queda en el camino.
  - `adicional`: con `origen`, marca una misión adicional (`t_adicional`); el nodo dice «Misión adicional». Sin él, el nodo de la opcional dice «Opcional».
  - `etiqueta`: solo la usan los contenidos de `plataforma`. En api, la etiqueta del punto se arma con el tipo y la duración del servidor.

## Metadatos

| Campo | Uso |
|---|---|
| `id`, `codigo`, `tipo`, `titulo`, `subtitulo` | Identidad. En modo api, el reproductor recibe el contenido con `id` igual al código de la actividad del backend. |
| `audiencia`, `bloque`, `orden`, `obligatoria`, `requisitos` | Ruta y desbloqueos en modo local. En api manda el backend. |
| `duracionEstimadaMin` | Se muestra en el detalle o la tarjeta. |
| `personajeIds` | Personajes de la escena; el apoderado solo usa `orientacion` (narrador sin avatar). |
| `objetivoAprendizaje` | Interno, en encuentros. |
| `recompensa` | `afinidad`, `piezaLlave`, `recursoIds`, `mensajeFin` (apoderado: solo `recursoIds` y `mensajeFin`). |
| `siguienteSugerida`, `promptDiario` | Botón al terminar; entrada de diario que se desbloquea (solo estudiante). |

## Nodos

| Nodo | Qué hace | Qué se guarda |
|---|---|---|
| `dialogo` | Caja de diálogo con hablante y `expresion`. | Nada |
| `eleccion` | Botones del jugador; luego `reaccion`. `enunciado` y `nota` opcionales. | `RespuestaEleccion` solo si `registrar: true` |
| `diapositiva` | Tarjeta con `etiqueta`, `titulo` y `bloques`; `recursoIds` como «Profundizar» o «Ver ficha». | Nada |
| `pregunta` | Reto de comprensión (`opcion_unica` u `opcion_multiple`) con retroalimentación, pistas y explicación. | `IntentoPregunta` por intento |
| `item` | Ítem de instrumento con el formato de su escala (`si_no`, `likert`, `opcion_unica`). | `RespuestaItem` (en api, `responder-items`) |
| `consigna` | Texto, archivo u opción; en registros, celdas de plantilla y preguntas de seguimiento. | `Entregable` |
| `resultado` | Revelación del perfil. | Resultado del instrumento |

Bloques de diapositiva: `parrafo`, `lista`, `destacado` (`dato`, `idea_clave`, `alerta`), `comparacion` (dos columnas con títulos libres), `pasos`, `reflexion` (pregunta sin campo), `fuente` (con enlace opcional) y `tabla` (`columnas`, `filas`, `nota`; cada fila con tantas celdas como columnas).

## Reglas de comportamiento

- **Pregunta:** seleccionar no registra un intento; se confirma con «Comprobar». Si acierta, muestra explicación y permite continuar. Si falla, permite un segundo intento (en preguntas de dos opciones, revela desde el primero); al agotar los intentos revela las respuestas correctas. Las opciones incorrectas quedan bloqueadas. En opción múltiple, solo es correcta si coincide exactamente el conjunto. No hay puntaje visible; el límite no depende de la cantidad de `pistas` del JSON.
- **Ítem:** no tiene respuesta correcta; la reacción repite lo respondido sin elogios ni juicios. Tocar una opción la marca y avanza tras un instante (sin doble respuesta); al volver con «Anterior», la guardada aparece marcada con «Siguiente», y tocarla avanza sin responder de nuevo. La primera pregunta no tiene «Anterior».
- **Retomar:** el progreso guarda el nodo actual (`nodoActualId`); al volver, sigue desde el siguiente pendiente.
- **Anterior (F01, ambos modos):** vuelve al nodo previo en el orden del contenido (las elecciones solo agregan reacciones, no ramifican). No aparece en el primer paso, en una pregunta ni en el paso que la sigue, en un registro entregado ni en un cuestionario completado o en revisión. Un diálogo al que se vuelve se muestra completo. En un registro del servidor guarda antes lo escrito como borrador sin validar. El par «Anterior» + botón principal va a la derecha en todos los pasos (en móvil, una fila 1fr / 2fr) y el foco de cada paso va al principal. En un registro local, los pasos posteriores a la última consigna (ya entregado) no tienen «Anterior».
- **Completitud de un encuentro:** se llega a `$fin` y todas las `pregunta` con `bloqueante: true` tienen un intento correcto o revelado.
- **Completitud de un registro:** todas las consignas obligatorias tienen entregable (en plantillas con `alternativa`, el archivo puede reemplazar celdas según `reemplazaSlots`).
- **Instrumento:** completo cuando todos sus `item` tienen respuesta.
- **Preguntas de seguimiento:** en consignas de texto con criterios y fuera de matrices, tanto la primera entrega como una edición guardan una versión antes de evaluar. El proveedor devuelve `ADECUADA`, `INSUFICIENTE` o `NO_EVALUADA`; la longitud del texto no determina la clasificación. Se permiten hasta dos preguntas, solo si cabe al menos un carácter de respuesta, y el usuario continúa explícitamente al terminar. Las respuestas se condensan en una versión nueva sin alterar la inicial; omitirlas conserva la inicial. Fallos y timeout conservan lo guardado, y abandonar la vista evita publicar preguntas tardías.
- **Editar después:** una celda editada crea un `Entregable` con versión nueva.

## Para producir contenido

Secuencia de un encuentro: gancho (diapositiva o elección personal) → concepto → reto → (concepto → reto) × N → práctica → resumen con ficha. Una pregunta cada una o dos diapositivas.

- Cada diapositiva enseña una sola idea y termina en un `destacado` o una `reflexion`.
- Cada `pregunta` tiene retroalimentación en todas las opciones, al menos una pista y una explicación que refuerza el contenido, no que repite la respuesta.
- Los casos usan nombres y situaciones cotidianas del contexto limeño.
- Las afirmaciones con dato llevan `fuente`; sin cifras que cambien con el tiempo, salvo de una fuente oficial con fecha.
- Apoderado: tono informativo y sin culpa, entre 10 y 15 minutos, frases cortas.

Para agregar un contenido: crea el JSON, regístralo en `src/data/activities/contenidos.ts` (una prueba exige que todo archivo de la carpeta esté registrado) y, si es una actividad del backend, usa su clave en `contenido` en `ov_backend/datos/`.
