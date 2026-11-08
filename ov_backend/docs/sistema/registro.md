# Registro con preguntas de seguimiento

Actividades de registro cuyas respuestas evalúa un LLM (Gemini) para pedir, como máximo, dos preguntas de seguimiento por intento (una por ítem, salvo excepción). Tras cerrar, el estudiante consulta la respuesta consolidada y lo que puede ampliar, y edita (HU-008). Código: `app/services/registro/` y `app/api/registro.py`. Parámetros: `VERSION_PROMPT_REGISTRO` (v5), `MAXIMO_SEGUIMIENTOS_POR_REGISTRO` (2, defecto de `actividad.maximo_seguimientos`), `MAXIMO_REPREGUNTAS_POR_ITEM` (1), `MAXIMO_ABIERTOS_ADECUADO` (1), `MODELO_LLM_REGISTRO`, temperatura, tiempo máximo y validaciones de la pregunta y la consolidada en `app/core/parametros.py`.

Estado actual: el backend implementa todo lo de este documento y `ruta` tiene los registros `t-expectativas`, `t-valores`, `t-eco` (este, con una elección que retoma la de `t-expectativas`; `referencias.md`) y `t-referencia` (elección desde PLANES con opciones propias, premarcado, seguimiento por ítem y abierto); en api, el front responde los registros del Camino con el servidor desde F01 (elección, borradores, entrega y seguimiento; `ov_frontend/docs/origen-de-datos.md`). Desde F02, también la consulta y la edición del registro entregado y la zona de eco.

La `consigna` de un ítem es el texto que lee el LLM (y el respaldo de los JSON de `ruta`); lo que ve el estudiante (lo que dice el personaje, la pregunta de cada control, la frase de entrada y el orden de los bloques) está en el JSON del front (`ov_frontend/docs/contenidos-actividades.md`, «Vista del ítem de registro»).

## Configuración

| Variable | Por defecto | Uso |
|---|---|---|
| `EVALUADOR` | `falso` | `gemini` usa la API real; `falso`, el evaluador determinista. |
| `GEMINI_API_KEY` | — | Obligatoria si `EVALUADOR=gemini`; sin ella la aplicación no arranca. |
| `GEMINI_MODELO` | `gemini-3.8-flash` (`MODELO_LLM_REGISTRO`) | Modelo. |
| `GEMINI_TIMEOUT_SEGUNDOS` | `8` | Tiempo máximo por evaluación. |

## Modelo

| Tabla | Qué guarda |
|---|---|
| `lista_opciones` | `codigo`, `nombre` y `comun`. Las comunes están en `datos/fijos.py` y se comparan entre actividades; las propias, en la ruta. |
| `opcion_lista` | Opciones de una lista: `codigo`, `texto` y `orden`. `OTRA` es un código reservado que ninguna lista usa. |
| `item_registro` | (Ajuste registros) `fuente_opciones` (LISTA, REFERENCIA o PROPIAS; nula sin elección), `referencia_opciones_id` (la referencia de la actividad que da las opciones en vivo: PLANES, FAMILIAS_RECOMENDADAS, ELECCION o TESTIMONIOS), `opciones_propias` (JSON, abajo), `premarcar_si` (`{item, opcion, marca}`: si en un ítem anterior se eligió `opcion`, llega marcada `marca`) y `seguimiento` (JSON, abajo). `codigo`, `actividad_id` y `orden` (un ítem pertenece a una sola actividad; hasta `MAXIMO_ITEMS_REGISTRO` = 5 por actividad, que valida el cargador), `nombre` (lo lee el estudiante: el front lo muestra al nombrar lo que quedó por ampliar, p. ej. «Tus valores»), `consigna`, `obligatorio`, `repregunta_generica` y `min_caracteres` (longitud mínima del ítem; si es nula, el respaldo usa `MIN_CARACTERES_RESPALDO`). Elección: `lista_id`, `eleccion_minima`, `eleccion_maxima`, `eleccion_ordenada`, `permite_otra` y, opcional, `referencia_id` (la ELECCION que marca lo elegido la vez pasada, F02; `referencias.md`); sin fuente no hay elección ni referencia, y la fuente exige su lista o su referencia (CHECK `eleccion_valida`). Catálogo, en caché. |
| `criterio_completitud` | Criterios del ítem con `codigo` (C1, C2…), `tipo` (EJEMPLO, RAZON, ACCION o CONTRASTE), `descripcion`, `repregunta` (la del tipo en `fijos.REPREGUNTAS_CRITERIO`, salvo que el criterio traiga la suya) y `orden`. La longitud no es un tipo de criterio. |
| `respuesta_registro` | (Ajuste registros) `sensible` (la evaluación vigente lo marcó) y `requiere_atencion` (alguna vez fue sensible; no se borra al editar). Por progreso e ítem: `intento` (1 = entrega; 2 en adelante = ediciones), `texto_inicial` (texto base del intento vigente: el entregado o el último editado), `opciones_elegidas` (arreglo JSON de `{codigo, texto?}`, en el orden elegido), `texto_consolidado` (la única respuesta final: el texto escrito al entregar o editar; la consolidada tras cada respuesta a un turno), `estado` (BORRADOR, PENDIENTE_SEGUIMIENTO o FINAL), `clasificacion_inicial` (la de la primera entrega; inmutable), `ampliada`, `reflexiva_registrada` (ya dio su RESPUESTA_REFLEXIVA). |
| `turno_seguimiento` | Hasta dos por registro y por intento (única: respuesta, `intento`, `orden`): pregunta, `criterios_objetivo`, respuesta o borrador, `respondido_en`. Los de intentos anteriores se conservan. |
| `evaluacion_respuesta` | Cada evaluación, sin modificarse nunca: origen (LLM o EXTENSION_MINIMA: toda evaluación resuelta en código, sin LLM), clasificación (ADECUADA, POCO_DESARROLLADA, NO_EVALUADA o ABIERTA), criterios faltantes (todos los del ítem si no cumple), pregunta, `falta` (lo que le faltó, para la pista), `sensible` y `requiere_atencion` (igual a `sensible`), modelo, versión del prompt, latencia, error, `texto_evaluado` y `opciones_evaluadas` (la elección que vio, F02; `[]` en las anteriores a 0023). |

| `texto_fijo` | (Ajuste registros) Textos de la plataforma iguales en todas las actividades, de `fijos.TEXTOS_FIJOS`: `LUMI_SENSIBLE`. Catálogo, en caché. |
| `actividad.maximo_seguimientos` | (Ajuste registros) Repreguntas por intento del registro; 2 por defecto. |

**Opciones propias** (`opciones_propias`): `codigo`, `texto`, `exclusiva` (va sola), `pregunta_propia` (reemplaza la consigna del texto), `criterio` (**omitido**: hereda el del ítem; **null**: la opción cumple sin seguimiento ni llamada; **informado**, un tipo: reemplaza al del ítem), `que_busca` (obligatorio con criterio informado), `texto_base` (obligatorio con criterio informado, y con `pregunta_propia` y criterio heredado), `cumple` y `no_cumple`. Se suman a la lista o a la referencia, o son la única fuente (PROPIAS).

**Seguimiento** (`seguimiento`, solo en ítems con criterio): `que_busca` y `texto_base` (obligatorios), `cumple`, `no_cumple`, `evitar`, `admite_abierto`, `max_repreguntas` (1 o 2) y `ecos_llm` (`[tipo, código]`: REFERENCIA de la actividad, o TEXTO/ELECCION de un ítem anterior de la misma actividad). En `ruta`, los ítems sin `seguimiento` usan la repregunta del tipo de su primer criterio como texto base.

Las listas comunes y las repreguntas por tipo de `datos/fijos.py` son textos provisionales hasta la carga real. La migración `0005` llevó cada ítem a su actividad (si estaba en varias, conserva la de menor id), dio a los criterios anteriores el tipo EJEMPLO y la repregunta genérica de su ítem, y renombró VAGA a POCO_DESARROLLADA; su downgrade se niega si hay eventos o condiciones REGISTRO_ADECUADO o ítems con elección. La `0006` quitó `nucleo` de `item_registro` y renombró el origen RESPALDO_LONGITUD a EXTENSION_MINIMA. La `0007` agregó `intento` a respuestas y turnos y `reflexiva_registrada` (en `true` si la respuesta pasó de POCO_DESARROLLADA a ADECUADA al responder un turno); su downgrade se niega si hay registros editados.

## Estados de una respuesta

```
(sin respuesta) --guardar borrador--> BORRADOR
BORRADOR (todos los ítems) --entregar--> FINAL, salvo el ítem que recibe la pregunta: PENDIENTE_SEGUIMIENTO
PENDIENTE_SEGUIMIENTO --guardar borrador--> igual (borrador de la respuesta al turno)
PENDIENTE_SEGUIMIENTO --responder seguimiento--> FINAL (y se abre la siguiente pregunta o se cierra el registro)
PENDIENTE_SEGUIMIENTO --continuar sin responder--> FINAL (se cierra el registro)
FINAL --siguiente pregunta, mientras el registro sigue abierto--> PENDIENTE_SEGUIMIENTO
FINAL (registro cerrado) --editar con texto distinto--> FINAL en un nuevo intento, salvo el que recibe la pregunta
```

**Intentos.** La entrega es el intento 1; cada edición abre el siguiente (el máximo `intento` de las respuestas más uno) solo para los ítems cuyo texto cambió. `texto_inicial` pasa a ser el texto editado, `clasificacion_inicial` no cambia y los turnos de intentos anteriores se conservan, pero ya no se muestran. Desde F02, la edición puede cambiar también la elección (`opciones_elegidas` pasa a ser la nueva). El historial queda en `evaluacion_respuesta`: los textos en `texto_evaluado` y las elecciones en `opciones_evaluadas`.

## Acciones (POST)

Todas exigen actividad disponible y cuenta de estudiante (apoderado u orientadora: 404). Aceptan `fecha_hora`.

| Ruta | Cuerpo | Efecto |
|---|---|---|
| `/acciones/registro/guardar-borrador` | `item`, `texto`, `opciones`, `posicion?` | Sin evaluar. Antes de entregar, guarda `texto_inicial` y `opciones` (sin exigir la mínima). Después, solo el borrador de la pregunta pendiente (con `opciones`, 422); en otro caso, 409. Con `posicion`, la guarda en el progreso para retomar. |
| `/acciones/registro/entregar` | — | Evalúa todo el registro. Si falta texto en un obligatorio, 409 con `items_faltantes`; si no se alcanza la elección mínima, 422; si ya está entregado, 409. |
| `/acciones/registro/responder-seguimiento` | `item`, `texto` | Responde la pregunta pendiente de ese ítem; la reevalúa y consolida. |
| `/acciones/registro/continuar-sin-responder` | `item` | El turno queda sin respuesta (la marca de la omisión) y el intento se cierra. |
| `/acciones/registro/editar` | `items: [{item, texto, opciones?}]` | Reentrega los ítems cuyo texto cambió (los idénticos a su `texto_consolidado` se ignoran): una evaluación como la de la entrega, con la elección vigente, y luego el seguimiento del intento. Con `opciones` (F02), la elección cambia: se valida contra la lista como al entregar (mínima incluida) y, si cambia, el texto debe cambiar con ella (si no, 422 «Si cambias tu elección, reescribe tu respuesta»). Sin `opciones`, la elección se conserva. Un ítem no obligatorio que quedó en blanco (sin respuesta o con un borrador vacío) recibe aquí su primera respuesta: se crea o completa, su elección se valida con la mínima, su primera evaluación es su `clasificacion_inicial` y pasa por el seguimiento del intento (F02). Exige el registro cerrado y sin pregunta pendiente (409). Lista vacía, ítem repetido o ajeno, texto vacío o ningún cambio: 422. Sin límite de ediciones. |

Las cuatro últimas devuelven el registro (como el GET: `posicion`, `estado` del progreso y `respuestas` con estado, opciones y conversación) más `eventos_registrados` y `nuevos_desbloqueos`; la que cierra agrega `items_por_ampliar` (`{item, pista}`, ver «Consultas»). Ninguna respuesta de una acción incluye la clasificación, los criterios, la consolidada ni `requiere_atencion`. REGISTRO_ADECUADO sí aparece en `eventos_registrados`, como todo evento: es una señal del registro completo, no la clasificación de un ítem.

**Elección** (`eleccion.py`, sin base de datos): `opciones` es una lista de `{codigo, texto?}`. Las opciones válidas son las de la fuente (la lista o la referencia resuelta en vivo para la cuenta) más las propias, también en la elección que retoma una anterior (F02). Una opción de referencia se guarda con su texto de ese momento (el que traiga la petición se ignora); una exclusiva va sola (422). Responde 422 si el ítem no tiene lista y llegan opciones, si una opción es ajena o se repite, si llega `OTRA` sin `permite_otra` o sin texto, si una opción que no es `OTRA` trae texto, si se supera la máxima o, solo al entregar, si no se alcanza la mínima. La elección no ordenada se guarda en el orden de la lista; la ordenada, en el orden elegido.

## Seguimiento

- Como máximo `MAXIMO_SEGUIMIENTOS_POR_REGISTRO` (2) preguntas por intento.
- Solo preguntan los ítems respondidos en ese intento (en una edición, los editados). La pregunta va al primero, por orden, cuya clasificación vigente (la de su última evaluación) es POCO_DESARROLLADA y que no agotó sus repreguntas: una por intento, salvo que `seguimiento.max_repreguntas` diga 2. El presupuesto del intento es `actividad.maximo_seguimientos` (2; `b5-3` = 1).
- **ABIERTA** (duda sincera): la propone el evaluador (`abierto`) y el backend la acepta solo al evaluar la respuesta a una repregunta, en un ítem con `admite_abierto`; si no, queda POCO_DESARROLLADA. Un ítem ABIERTA no recibe más repreguntas, no se cita (`referencias.md`) y se lista aparte al cerrar.
- **Sensible**: si el evaluador marca `sensible`, gana sobre todo lo demás: la respuesta queda ADECUADA con `sensible` y `requiere_atencion`, sin repregunta y, desde el ajuste pruebas llm, **sin más turnos en ese intento** para ningún ítem (`avanzar` cierra; los demás quedan con su clasificación y, como pista, su `falta` o su `nombre`), no se cita ni entra en el contexto de cartas, y su conversación termina con el aviso fijo `LUMI_SENSIBLE` (`{tipo: 'aviso', texto}`), que el front muestra con solo «Continuar». Solo existe en ítems con criterio (los únicos que se citan o reutilizan); una opción con `criterio: null` y el diario no pasan por detección. Al editar se reclasifica; `requiere_atencion` se conserva.
- **RESPUESTA_REFLEXIVA:** cuando una respuesta pasa de POCO_DESARROLLADA a ADECUADA al evaluar la respuesta a un turno, en esa misma acción y una sola vez por respuesta (`reflexiva_registrada`), en cualquier intento. No la da ser adecuada al inicio, ampliar sin quedar adecuada ni editar a adecuada sin seguimiento.
- Sin a quién preguntar, o con las dos preguntas hechas, el intento **se cierra**:
  - todas las respuestas en FINAL;
  - solo en el intento 1, progreso COMPLETADA con COMPLETA_ACTIVIDAD y COMPLETA_BLOQUE si corresponde (`completar_progreso`);
  - REGISTRO_ADECUADO (referencia: la actividad) si ningún ítem quedó POCO_DESARROLLADA y a lo mucho uno quedó ABIERTA (NO_EVALUADA no lo impide; un sensible cuenta como desarrollado), una sola vez por cuenta y actividad. Los eventos no se deshacen: editar a poco desarrollada no vuelve a bloquear la misión adicional.
- `texto_consolidado` es la única respuesta final (la que se cita y se muestra): al entregar o editar, el texto escrito; tras cada respuesta a un turno, la consolidada.

## Evaluación

**Entrega:** una sola llamada al LLM con todos los ítems **con criterios**. Por cada ítem envía consigna, criterios, la guía de seguimiento (`que_busca`, `texto_base`, `cumple`, `no_cumple`, `evitar`; la de la opción propia elegida si la tiene), los textos de las opciones elegidas, sus `ecos` (solo lo de `ecos_llm`, nunca las demás respuestas) y el texto. Devuelve, por ítem, `{cumple, abierto, emocional, sensible, falta, repregunta}`; el código decide: sensible → ADECUADA marcada; cumple → ADECUADA; si no, POCO_DESARROLLADA con la repregunta (si es nula o inválida, el `texto_base`). En la entrega el `abierto` del modelo se ignora. **Respuesta emocional:** `emocional: true` sin cumplir ni sensible deja la POCO_DESARROLLADA sin pregunta: no se le abre turno y el presupuesto pasa al siguiente ítem; no cuenta como desarrollada (impide REGISTRO_ADECUADO) y su pista es el texto fijo `PISTA_SIN_REPREGUNTA`. En el seguimiento no cambia nada (ya no hay otro turno en ese ítem) salvo con `max_repreguntas: 2`, donde tampoco se abre el segundo. Los ítems sin criterios (o con una opción propia de `criterio: null`) no van al LLM: si tienen `min_caracteres` y no lo alcanzan, quedan POCO_DESARROLLADA con `repregunta_generica`; si no, ADECUADA. En los ítems con criterios, `min_caracteres` solo sirve de respaldo.

**Seguimiento:** una llamada sobre el ítem, con consigna, criterios, guía, opciones, ecos y texto inicial con sus turnos. Devuelve `{cumple, abierto, emocional, sensible, falta, repregunta, consolidada}`. Si la pregunta era la genérica, no hay llamada: queda NO_EVALUADA y la consolidada es la concatenación. En un ítem que solo tiene mínimo, se mide el largo de la concatenación.

**Validaciones** (`evaluacion.py`):
- **Esquema:** el JSON estricto del contrato y, en la entrega, exactamente los ítems enviados. Si no se cumple, se trata como fallo.
- **Pregunta:** un solo «?», al final, como mucho `MAXIMO_CARACTERES_PREGUNTA`, sin códigos `C\d+` ni `PALABRAS_EVALUATIVAS` (se compara en minúsculas y sin tildes). Si no se cumple, se usa el `texto_base`.
- **Consolidada:** no vacía y como mucho `FACTOR_MAXIMO_CONSOLIDADA` veces el largo de lo escrito más `MARGEN_CONSOLIDADA` (60) caracteres, para que una respuesta corta admita conectores. Si no se cumple, se usa la concatenación del texto inicial y los turnos respondidos, separados por línea en blanco.

**Respaldo**, si la llamada falla, tarda demasiado o devuelve algo inválido (se guarda con `error`):
- en la entrega, ítem por ítem: un texto con menos de `min_caracteres` (o `MIN_CARACTERES_RESPALDO`) queda POCO_DESARROLLADA con el `texto_base`; uno que lo alcanza, NO_EVALUADA; sin detección de sensible;
- en el seguimiento: NO_EVALUADA y la consolidada es la concatenación.

El estudiante nunca queda bloqueado por un fallo de la API.

Toda evaluación se guarda en `evaluacion_respuesta` (`numero` 1 al entregar y luego una por respuesta). El origen es LLM, o EXTENSION_MINIMA cuando se resolvió en código: ítems sin criterios, opción con `criterio: null`, mínimo como criterio, genérica respondida o respaldo (solo este lleva `error`).

**Evaluadores** (`evaluacion.py`, protocolo `EvaluadorRespuestas` con `evaluar_entrega` y `evaluar_seguimiento`, sin SQLAlchemy ni FastAPI):

- `EvaluadorGemini` (`gemini.py`): salida JSON estructurada, temperatura `TEMPERATURA_REGISTRO` (1.0, recomendada por Google para Gemini 3) en entrega y seguimiento y `TEMPERATURA_ASISTENTES` (0.2) en el diario, las cartas, las sugerencias de pasos y el guion, un intento y tiempo máximo configurado. Usa el razonamiento mínimo del modelo: `gemini-3.8-flash` no admite apagarlo, así que va en `low`. La clave debe ser de un proyecto con nivel de pago.
- `EvaluadorFalso`: determinista, por marcas en el texto más reciente de cada ítem:
  - sin marca, cumple;
  - `[vaga]`: no cumple;
  - `[falta:C2]` o `[falta:RAZON]`: no cumple y la repregunta sale de ese criterio;
  - `[abierto]`: no cumple y propone abierto;
  - `[emocional]`: no cumple, con `falta` y `repregunta: null` (respuesta emocional);
  - `[sensible]`: marca sensible (con cualquier otra marca);
  - `[falla]` (falla toda la llamada) y `[json-invalido]` (sale del esquema);
  - `[pregunta-invalida]`;
  - `[consolidada-invalida]`.

  Cuenta `llamadas_entrega` y `llamadas_seguimiento`. Lo usan todas las pruebas.

Nunca se envían nombres, códigos de cuenta ni otros datos que identifiquen al estudiante (RNF-13). De otras actividades solo va lo declarado en `ecos_llm`. El `nombre` de un eco es el del ítem (propio o fuente de la referencia: «Tu hito a un año»); una referencia sin ítem fuente usa `NOMBRES_ECO_REFERENCIA` (`acciones.py`, «Tu Plan A») y, si su tipo no está ahí, el tipo.

**Mensaje:** `mensaje_evaluador(contexto)` (`gemini.py`) arma el JSON que recibe el modelo. En un ítem con guía, los criterios van sin su `repregunta` genérica (`REPREGUNTAS_CRITERIO`): el modelo la copiaba en vez de retomar las palabras del estudiante. Sin guía (`ruta`) va completa. El evaluador falso y `texto_base()` siguen usando esa repregunta.

**Prompts:** las instrucciones vigentes son `PROMPT_ENTREGA` y `PROMPT_SEGUIMIENTO` de `app/services/registro/prompt.py` (v6.4). Cambiarlas exige subir `VERSION_PROMPT_REGISTRO`. La v6.4: la repregunta pide lo que busca el ítem, anclada en lo que escribió y sin ser vaga, y si el ítem pide imaginar algo que viene invita a imaginar la escena en vez de «¿recuerdas…?»; `emocional` es true si la respuesta es sobre todo un sentimiento o no quiere hablar de algo doloroso (repregunta null; un sentimiento solo no cumple); también es `sensible` que en su casa lo insulten, humillen o hagan sentir que no vale, aunque no diga quién, y no lo es que lo comparen o presionen o las peleas por la carrera. Además: `falta` empieza por «Te faltó» y no es pedido; la repregunta retoma sus palabras («Dices que…», sin «pero» después) sin calificar la respuesta («suena a una cualidad»), mide como mucho 35 palabras y 200 caracteres, no copia la consigna ni el `texto_base`, no pregunta por lo de otros ítems y en ACCION pregunta qué hizo si la consigna mira al pasado; `sensible` solo con violencia, maltrato, abuso, riesgo o crisis familiar grave, nunca por desacuerdos con la familia, presión, tristeza, duelo (aunque no quiera hablar de él) o dificultades económicas; en la entrega `abierto` es siempre false; fuera de `ecos`, no usa lo que escribió en otros ítems aunque lo vea.

**Validación con Gemini real:** `tests/llm/` (fuera de pytest; ver su `README.md`). Se corre a mano al cambiar el prompt, la temperatura, el modelo o los campos de seguimiento de un ítem; sus CSV y `resumen.md` se versionan. Una corrida se acepta con la clasificación igual a lo esperado en todas las corridas, sin falsos `sensible` y sin `R1`, `R4`, `R6`, `R8`, `R9` ni `filtro_backend`.

## Transacciones

La llamada al LLM nunca ocurre dentro de una transacción ni con una conexión tomada:

1. Transacción corta: validar y leer el registro; anotar `estado` y `actualizada_en` de cada respuesta.
2. Sin transacción: llamar al evaluador (o aplicar el respaldo).
3. Transacción corta: releer; si alguna respuesta cambió, 409 sin escribir. Si no, guardar respuestas, evaluaciones y turnos, y abrir la siguiente pregunta o cerrar.

## Consultas (GET)

| Ruta | Devuelve |
|---|---|
| `/actividades/{a}/items-registro` | Ítems en orden, con consigna, `min_caracteres` (puede ser nulo), obligatoriedad y `eleccion` (`null` o `fuente`, `lista`, `referencia`, `referencia_opciones`, `comun`, mínima, máxima, `ordenada`, `permite_otra`, opciones de la lista, `opciones_propias` con `codigo`, `texto`, `exclusiva`, `pregunta_propia` y `sin_seguimiento`, y `premarcar_si`; las opciones de una referencia se leen con las referencias de la cuenta). Sin criterios ni campos de seguimiento. |
| `/cuentas/{c}/actividades/{a}/registro` | Posición, estado del progreso y, por ítem, estado, `opciones_elegidas` y conversación del intento vigente (incluidos los borradores). Con el registro cerrado (progreso COMPLETADA y nada pendiente), además `texto_consolidado` por ítem e `items_por_ampliar`: los ítems con POCO_DESARROLLADA vigente, cada uno con `pista` (la repregunta de su evaluación vigente; sin repregunta, el texto fijo `PISTA_SIN_REPREGUNTA`; en un intento con un ítem sensible, su `falta` o su `nombre`, porque la pregunta guardada puede citar lo sensible) y `falta` (el front muestra `falta` o, si no hay, el `nombre`), e `items_abiertos` (los ABIERTA). La conversación de una respuesta sensible termina con el aviso `LUMI_SENSIBLE`. |

Apoderados y cuentas o actividades inexistentes: 404. Completar una actividad de registro exige todos sus ítems obligatorios en FINAL (`motor.md`).

## Asistente del diario (B09)

El mismo evaluador (`app.state.evaluador_respuestas`, falso o Gemini, con su `timeout_segundos`) personaliza preguntas del diario con `personalizar_entrada`. Código: `app/services/diario/asistente.py`; el diario en sí está en `motor.md`, «Diario». También sugiere pasos para las dudas y complicaciones de los planes con `sugerir_pasos` (`planes.md`, «Sugerencias de pasos»).

- **Entrada al LLM** (RNF-13, RNF-20): solo la pregunta base y los datos que la pregunta declara como referencias, resueltos (`tipo`, `texto`, `opciones`). Nunca códigos de cuenta, nombres ni texto de entradas del diario.
- **Prompt v1** (`PROMPT_DIARIO_V1`, `VERSION_PROMPT_DIARIO`): una sola pregunta en tono de Lumi; cita los datos tal como vienen; no interpreta resultados, no evalúa, no sugiere carreras ni agrega datos ajenos. Salida `{"pregunta": ...}` validada con `pregunta_valida`.
- **Respaldo** (RNF-08): sin datos no se llama al LLM; ante error, tiempo agotado o salida inválida se guarda la base con origen FIJA. Nunca se muestra un error al usuario ni se guarda el mensaje de una excepción externa.
- **Transacciones:** se lee, se redacta fuera de transacción y se guarda con `UPDATE … WHERE texto IS NULL` (desbloqueadas) o con el único `(cuenta, fecha)` (pregunta del día); si otra solicitud ganó, vale la suya.
- **Cartas (ajuste registros):** una pregunta personalizada que se desbloquea (las cartas C1–C6 de `contenido`) se redacta con `PROMPT_CARTA_V1`: de 3 a 5 líneas, en tono de amiga, que termina en una pregunta que conecta dos cosas que el estudiante dijo; se valida que no esté vacía, que termine en «?» y que no pase de `MAXIMO_CARACTERES_CARTA`. Un TEXTO sensible no llega al contexto (SIN_DATO); uno ABIERTA llega como «Lo dejó abierto». Si la cuenta eligió la opción de `pregunta_diario.respaldo_si` (`{item, opcion}`; solo C2), se usa la base sin LLM.
- **Falso:** antepone el primer dato a la base (`Sobre «…»: <base>`), registra `contextos_diario` y `llamadas_diario`, y falla con `falla_diario = True`.

