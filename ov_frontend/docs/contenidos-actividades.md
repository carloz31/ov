# Contenidos de actividades

Formato de los JSON de `src/data/activities/contenidos/`: `plataforma/<clave>.json` (contenido real), `ruta/<clave>.json` (ruta de prueba) y, en la raíz, los del modo local. El tipo de referencia es `Actividad` en `src/types/activities.ts`; la validación está en `src/lib/activities/validation.ts`. El backend solo conoce la clave (`actividad.contenido`) y no interpreta el contenido.

## Principio

Toda actividad, de cualquier rol, es el mismo objeto: metadatos, una lista ordenada de `nodos` y una `recompensa`. El **tipo** decide qué nodos se permiten y cuándo está completa; la **audiencia**, solo cómo se dibuja.

| Front (`tipo`) | Backend (`TipoActividad`) | Nodos permitidos |
|---|---|---|
| `encuentro` | INFORMATIVA | `dialogo`, `eleccion`, `diapositiva`, `pregunta` |
| `registro` | REGISTRO | `dialogo`, `eleccion`, `diapositiva`, `consigna` |
| `instrumento` | CUESTIONARIO | `dialogo`, `eleccion`, `item`, `resultado` |

- `audiencia`: `estudiante` (inmersivo, por defecto) o `apoderado` (sobrio). El apoderado solo admite `encuentro`.
- **Contenido solo de posición:** un JSON con `nodos: []` dibuja el punto en el mapa («Contenido pendiente» si está disponible), pero no se puede abrir. En el portal del apoderado, la actividad se lista sin poder iniciarse.
- **Cuestionario del servidor:** en un `instrumento`, un nodo `item` con `itemId: "plantilla"` se repite con los ítems del servidor (`GET /actividades/{a}/items`), en su orden y con su escala, entre los diálogos del contenido. Así se responden `t_partida`, `t_llegada`, `t_mision_intereses` y `t_mision_intereses_2`, sin nodo `resultado`: el resultado se revela en el libro de Helena (F03).
- **Registro del servidor (ajuste front de registros, lote 1):** en api, cada `consigna` de un registro lleva `"item": "<código del ítem>"` y, en `contenido` (`plataforma/`), solo `id`, `tipo`, `hablanteId` (quién da la consigna, con su avatar) y `expresion`: la consigna (diálogo, pregunta de elección, pregunta de texto y arranque), la elección, las opciones (con su origen, su pregunta y su arranque) y los ecos vienen del registro de la cuenta (`GET …/registro`). Todo ítem del servidor necesita su consigna, en el orden de los ítems, y toda consigna un ítem existente; si no, la actividad no se abre (`scripts/verificar_contenido_front.py`). No hay destinos al cerrar. Los JSON de `ruta/` pueden traer campos de antes, que el front ignora.
- **Flujo de un ítem (lote 1):** el estudiante elige, escribe y toca «Enviar» (apagado con el texto vacío, salvo que la opción marcada vaya sin LLM; sin mínimo de caracteres). Cada respuesta pasa por la pantalla de Lumi: «Tu respuesta» arriba y, debajo, tres puntos mientras responde el servidor, y luego la repregunta con su campo («Responder» y «Seguir sin responder»), el mensaje del servidor o una frase de confirmación; un ítem u opción sin LLM no espera. La repregunta solo existe en esa pantalla. Un ítem respondido se ve en lectura (nada se mueve sin «Modificar»), con un solo aviso: sin evaluar (con «Volver a enviar»), eco cambiado o la pista. «Modificar» abre la elección y la caja con la primera respuesta y la línea del seguimiento, con la pista arriba; «Cancelar» vuelve sin cambios. Abajo solo se navega. Completada, la actividad se rehace desde el inicio; a medias, se entra en `item_actual`; con todo respondido y sin terminar, en el último ítem. Tras el último, «Continuar» llama a `entregar`. Los textos de la pantalla están en `features/activities/lib/textosRegistro.ts`.
- **Podio y elección (F01; lote 1):** un ítem con elección ordenada de N fijo (mínima = máxima > 1) y sin «otra» se responde con un podio (`RankingPodium`); los demás con chips (`ChoiceReveal`): las exclusivas en una fila aparte, que quitan a las demás, y «+ Otra» con su campo (`OTRA` con una opción, `OTRA-1` con varias). Sin reacción del personaje. El selector de piezas, varias «Otra» y las formas de eco son del lote 2 del front.
- **Eco en un encuentro (F03):** en api, un nodo `dialogo` puede traer `"eco": "<código>"`. El encuentro pide sus referencias antes de abrirse y el diálogo dice su texto seguido de la cita; sin dato, solo su texto. Lo usa `t_lee_cuestionario` (RESPUESTA_CUESTIONARIO de la partida, disponible con `t-partida` completada, aunque no se haya revelado).
- **Eco de diálogo en lista y en registros (ajuste carga-actividades, ampliación de F03):** el `eco` de un `dialogo` acepta también una lista de códigos; el diálogo cita cada uno en orden tras su texto, en la misma burbuja, y omite los que no tienen dato (sin ninguno, solo el texto). Además de las de F03, un diálogo cita TEXTO como el texto escrito entre comillas y ELECCION como las opciones elegidas entre comillas, separadas por « · ». Un registro también puede traer diálogos con eco: pide sus referencias al abrirse y completa con ellas sus diálogos, sin otra petición. Lo prueba `t_eco` (`t-eco-recuerdo`).
- **Diapositivas en un registro (ajuste carga-actividades):** un registro puede abrir con diapositivas (el contenido de su ficha) antes de sus consignas. Lo prueba `t_valores`.
- **Batallas y casos (F04):** en api, una actividad `BATALLA` o `CASO` no lleva nodos: su JSON apunta al contenido del front con `"desafio": "<id de challenges.ts>"` o `"caso": "<id del caso>"` (`forest-fire`). Del desafío se usan la presentación, el personaje, la ilustración y la narrativa; las preguntas y sus fichas (F04b), y las vidas del enemigo y los destellos (F04c), vienen del servidor, que también decide la victoria, y «Repasar la ficha» ofrece las fichas de la batalla que la cuenta tiene y existen en el catálogo. Se abren según su tipo, no según su bloque: la batalla, con el reproductor de desafíos desde el camino o la Ciudad; el caso, en la Central de Casos (`/student/cases/<caso>`). El ícono de una batalla es la espada, sea cual sea `mapa.icono`. Hoy lo usan `t_batalla` y `t_caso`.
- **Recursos de una diapositiva (F04d):** `recursoIds` trae a lo más un recurso (lo valida `validateActivity`); se abre con el visor de la mochila, encima del reproductor.
- **Textos en api:** título, descripción, duración y bloque los da el servidor; los campos del JSON (`titulo`, `duracionEstimadaMin`, `bloque`…) quedan porque los exige el tipo `Actividad` y los usa el modo local.
- `presentacion` (solo instrumentos): `narrativa` dibuja todos los nodos; `directa`, solo `item` y `resultado`.
- `plantilla` (solo registros): `secuencial` (una consigna tras otra) o `matriz` (celdas `columna.fila`; sirve para línea de tiempo o FODA).
- `mapa` (opcional): `{ x, y, icono, origen? }` para dibujar la actividad como punto del mapa. Sin `mapa`, no se dibuja. En api, una BATALLA y un CASO llevan el ícono de su tipo (espada y antena) y no usan `icono`.
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
| `escenario` | Lugar de la isla (`muelle`, `bosque`, `cabana`, `nevado`, `ciudad`, `desierto`, `bosque_volcan`, `playa`, `acantilado`, `faro`): el fondo del reproductor es `/images/background/<escenario>.png`. Sin él, el fondo de la pantalla (`bosque.png` en el camino y el diario, `afueras-ciudad.png` en la Ciudad y las batallas). El apoderado no lo lleva (ajuste carga-actividades). |
| `recompensa` | `afinidad`, `piezaLlave`, `recursoIds`, `mensajeFin` (apoderado: solo `recursoIds` y `mensajeFin`). `recursoIds` es del modo local: en api las fichas las deciden las reglas FICHA del servidor, y los JSON de `plataforma/` no lo llevan. |
| `siguienteSugerida`, `promptDiario` | Botón al terminar; entrada de diario que se desbloquea (solo estudiante y solo en modo local: los JSON de `plataforma/` no lo llevan, porque en api las cartas salen del servidor). |

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
- **Anterior (F01, ambos modos):** vuelve al nodo previo en el orden del contenido (las elecciones solo agregan reacciones, no ramifican). No aparece en el primer paso, en una pregunta ni en el paso que la sigue, en un registro entregado ni en un cuestionario completado o en revisión. Un diálogo al que se vuelve se muestra completo. En un registro del servidor conserva lo escrito en el ítem en curso; la pantalla de Lumi y la edición de un ítem no tienen «Anterior». El par «Anterior» + botón principal va a la derecha en todos los pasos (en móvil, una fila 1fr / 2fr) y el foco de cada paso va al principal. En un registro local, los pasos posteriores a la última consigna (ya entregado) no tienen «Anterior».
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
