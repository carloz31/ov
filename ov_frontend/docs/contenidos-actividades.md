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
- `presentacion` (solo instrumentos): `narrativa` dibuja todos los nodos; `directa`, solo `item` y `resultado`.
- `plantilla` (solo registros): `secuencial` (una consigna tras otra) o `matriz` (celdas `columna.fila`; sirve para línea de tiempo o FODA).
- `mapa` (opcional): `{ x, y, etiqueta, icono }` para dibujar la actividad como punto del mapa. Sin `mapa`, no se dibuja.

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
- **Ítem:** no tiene respuesta correcta; la reacción repite lo respondido sin elogios ni juicios. No se vuelve atrás durante la interacción.
- **Retomar:** el progreso guarda el nodo actual (`nodoActualId`); al volver, sigue desde el siguiente pendiente.
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
