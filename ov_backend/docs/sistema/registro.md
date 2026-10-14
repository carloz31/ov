# Registro con preguntas de seguimiento

Actividades de registro cuyas respuestas evalúa un LLM (Gemini) para pedir, como máximo, dos preguntas de seguimiento por intento. Tras cerrar, el estudiante consulta la respuesta consolidada y lo que puede ampliar, y edita (HU-008). Código: `app/services/registro/` y `app/api/registro.py`. Parámetros: `VERSION_PROMPT_REGISTRO`, `MAXIMO_SEGUIMIENTOS_POR_REGISTRO` (2), `MODELO_LLM_REGISTRO`, temperatura, tiempo máximo y validaciones de la pregunta y la consolidada en `app/core/parametros.py`.

Estado actual: el backend implementa todo lo de este documento y `ruta` tiene los registros `t-expectativas`, `t-valores` y `t-eco` (este, con elección por referencia; `referencias.md`); el front responde los registros con su lógica local y solo informa la finalización. La integración llega con la iteración 2.

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
| `item_registro` | `codigo`, `actividad_id` y `orden` (un ítem pertenece a una sola actividad; hasta `MAXIMO_ITEMS_REGISTRO` = 3 por actividad, que valida el cargador), `nombre`, `consigna`, `obligatorio`, `repregunta_generica` y `min_caracteres` (longitud mínima del ítem; si es nula, el respaldo usa `MIN_CARACTERES_RESPALDO`). Elección: `lista_id` o `referencia_id` (elección por referencia, `referencias.md`), `eleccion_minima`, `eleccion_maxima`, `eleccion_ordenada` y `permite_otra` (nunca con referencia); sin lista ni referencia no hay elección (CHECK). Catálogo, en caché. |
| `criterio_completitud` | Criterios del ítem con `codigo` (C1, C2…), `tipo` (EJEMPLO, RAZON, ACCION o CONTRASTE), `descripcion`, `repregunta` (la del tipo en `fijos.REPREGUNTAS_CRITERIO`, salvo que el criterio traiga la suya) y `orden`. La longitud no es un tipo de criterio. |
| `respuesta_registro` | Por progreso e ítem: `intento` (1 = entrega; 2 en adelante = ediciones), `texto_inicial` (texto base del intento vigente: el entregado o el último editado), `opciones_elegidas` (arreglo JSON de `{codigo, texto?}`, en el orden elegido), `texto_consolidado` (la única respuesta final: el texto escrito al entregar o editar; la consolidada tras cada respuesta a un turno), `estado` (BORRADOR, PENDIENTE_SEGUIMIENTO o FINAL), `clasificacion_inicial` (la de la primera entrega; inmutable), `ampliada`, `reflexiva_registrada` (ya dio su RESPUESTA_REFLEXIVA). |
| `turno_seguimiento` | Hasta dos por registro y por intento (única: respuesta, `intento`, `orden`): pregunta, `criterios_objetivo`, respuesta o borrador, `respondido_en`. Los de intentos anteriores se conservan. |
| `evaluacion_respuesta` | Cada evaluación, sin modificarse nunca: origen (LLM o EXTENSION_MINIMA: toda evaluación resuelta en código, sin LLM), clasificación, criterios faltantes, pregunta, `requiere_atencion` (sin uso desde B03), modelo, versión del prompt, latencia, error y `texto_evaluado`. |

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

**Intentos.** La entrega es el intento 1; cada edición abre el siguiente (el máximo `intento` de las respuestas más uno) solo para los ítems cuyo texto cambió. `texto_inicial` pasa a ser el texto editado, `clasificacion_inicial` no cambia y los turnos de intentos anteriores se conservan, pero ya no se muestran. El historial de textos queda en `evaluacion_respuesta.texto_evaluado`.

## Acciones (POST)

Todas exigen actividad disponible y cuenta de estudiante (apoderado u orientadora: 404). Aceptan `fecha_hora`.

| Ruta | Cuerpo | Efecto |
|---|---|---|
| `/acciones/registro/guardar-borrador` | `item`, `texto`, `opciones`, `posicion?` | Sin evaluar. Antes de entregar, guarda `texto_inicial` y `opciones` (sin exigir la mínima). Después, solo el borrador de la pregunta pendiente (con `opciones`, 422); en otro caso, 409. Con `posicion`, la guarda en el progreso para retomar. |
| `/acciones/registro/entregar` | — | Evalúa todo el registro. Si falta texto en un obligatorio, 409 con `items_faltantes`; si no se alcanza la elección mínima, 422; si ya está entregado, 409. |
| `/acciones/registro/responder-seguimiento` | `item`, `texto` | Responde la pregunta pendiente de ese ítem; la reevalúa y consolida. |
| `/acciones/registro/continuar-sin-responder` | `item` | El turno queda sin respuesta (la marca de la omisión) y el intento se cierra. |
| `/acciones/registro/editar` | `items: [{item, texto}]` | Reentrega los ítems cuyo texto cambió (los idénticos a su `texto_consolidado` se ignoran): una evaluación como la de la entrega y luego el seguimiento del intento. Solo texto: la elección no se edita. Exige el registro cerrado y sin pregunta pendiente (409). Lista vacía, ítem repetido, ajeno o no entregado, texto vacío o ningún cambio: 422. Sin límite de ediciones. |

Las cuatro últimas devuelven el registro (como el GET: `posicion`, `estado` del progreso y `respuestas` con estado, opciones y conversación) más `eventos_registrados` y `nuevos_desbloqueos`; la que cierra agrega `items_por_ampliar` (`{item, pista}`, ver «Consultas»). Ninguna respuesta de una acción incluye la clasificación, los criterios, la consolidada ni `requiere_atencion`. REGISTRO_ADECUADO sí aparece en `eventos_registrados`, como todo evento: es una señal del registro completo, no la clasificación de un ítem.

**Elección** (`eleccion.py`, sin base de datos): `opciones` es una lista de `{codigo, texto?}`. Las opciones válidas son las de la lista o, en la elección por referencia, las que esa referencia ELECCION devuelve a la cuenta (incluida la OTRA de la fuente, que se elige sin texto); sin dato, ninguna. Responde 422 si el ítem no tiene lista y llegan opciones, si una opción es ajena o se repite, si llega `OTRA` sin `permite_otra` o sin texto, si una opción que no es `OTRA` trae texto, si se supera la máxima o, solo al entregar, si no se alcanza la mínima. La elección no ordenada se guarda en el orden de la lista; la ordenada, en el orden elegido.

## Seguimiento

- Como máximo `MAXIMO_SEGUIMIENTOS_POR_REGISTRO` (2) preguntas por intento.
- Solo preguntan los ítems respondidos en ese intento (en una edición, los editados). La pregunta va al primero, por orden, cuya clasificación vigente (la de su última evaluación) es POCO_DESARROLLADA. Tras cada respuesta, si ese ítem sigue así, se le vuelve a preguntar; si no, pasa al siguiente por orden.
- **RESPUESTA_REFLEXIVA:** cuando una respuesta pasa de POCO_DESARROLLADA a ADECUADA al evaluar la respuesta a un turno, en esa misma acción y una sola vez por respuesta (`reflexiva_registrada`), en cualquier intento. No la da ser adecuada al inicio, ampliar sin quedar adecuada ni editar a adecuada sin seguimiento.
- Sin a quién preguntar, o con las dos preguntas hechas, el intento **se cierra**:
  - todas las respuestas en FINAL;
  - solo en el intento 1, progreso COMPLETADA con COMPLETA_ACTIVIDAD y COMPLETA_BLOQUE si corresponde (`completar_progreso`);
  - REGISTRO_ADECUADO (referencia: la actividad) si ningún ítem quedó POCO_DESARROLLADA (NO_EVALUADA no lo impide), una sola vez por cuenta y actividad. Los eventos no se deshacen: editar a poco desarrollada no vuelve a bloquear la misión adicional.
- `texto_consolidado` es la única respuesta final (la que se cita y se muestra): al entregar o editar, el texto escrito; tras cada respuesta a un turno, la consolidada.

## Evaluación

**Entrega:** una sola llamada al LLM con todos los ítems **con criterios**. Por cada ítem envía consigna, criterios (código, tipo, descripción y repregunta base), los textos de las opciones elegidas y el texto. Devuelve, por ítem, `{clasificacion, criterios_faltantes, pregunta}`. Los ítems sin criterios no van al LLM: si tienen `min_caracteres` y no lo alcanzan, quedan POCO_DESARROLLADA con `repregunta_generica`; si no, ADECUADA. En los ítems con criterios, `min_caracteres` solo sirve de respaldo.

**Seguimiento:** una llamada sobre el ítem, con consigna, criterios, faltantes previos, opciones, texto inicial con sus turnos y las demás respuestas de la actividad. Devuelve `{clasificacion, criterios_faltantes, pregunta, consolidada}`. Si la pregunta era la genérica, no hay llamada: queda NO_EVALUADA y la consolidada es la concatenación. En un ítem que solo tiene mínimo, se mide el largo de la concatenación.

**Validaciones** (`evaluacion.py`):
- **Esquema:** los ítems deben ser los enviados, los códigos deben existir y no repetirse, los faltantes deben ser un subconjunto de los previos, ADECUADA sin faltantes y POCO_DESARROLLADA con faltantes. Si no se cumple, se trata como fallo.
- **Pregunta:** un solo «?», al final, como mucho `MAXIMO_CARACTERES_PREGUNTA`, sin códigos `C\d+` ni `PALABRAS_EVALUATIVAS` (se compara en minúsculas y sin tildes). Si no se cumple, se usa la repregunta base del primer criterio faltante, por orden de criterio.
- **Consolidada:** no vacía y como mucho `FACTOR_MAXIMO_CONSOLIDADA` veces el largo de lo escrito. Si no se cumple, se usa la concatenación del texto inicial y los turnos respondidos, separados por línea en blanco.

**Respaldo**, si la llamada falla, tarda demasiado o devuelve algo inválido (se guarda con `error`):
- en la entrega, ítem por ítem: un texto con menos de `min_caracteres` (o `MIN_CARACTERES_RESPALDO`) queda POCO_DESARROLLADA con `repregunta_generica`; uno que lo alcanza, NO_EVALUADA;
- en el seguimiento: NO_EVALUADA y la consolidada es la concatenación.

El estudiante nunca queda bloqueado por un fallo de la API.

Toda evaluación se guarda en `evaluacion_respuesta` (`numero` 1 al entregar y luego una por respuesta). El origen es LLM, o EXTENSION_MINIMA cuando se resolvió en código: ítems sin criterios, mínimo como criterio, genérica respondida o respaldo (solo este lleva `error`). `requiere_atencion` queda sin uso (siempre `false`).

**Evaluadores** (`evaluacion.py`, protocolo `EvaluadorRespuestas` con `evaluar_entrega` y `evaluar_seguimiento`, sin SQLAlchemy ni FastAPI):

- `EvaluadorGemini` (`gemini.py`): salida JSON estructurada, temperatura 0.2, un intento y tiempo máximo configurado. Usa el razonamiento mínimo del modelo: `gemini-3.8-flash` no admite apagarlo, así que va en `low`. La clave debe ser de un proyecto con nivel de pago.
- `EvaluadorFalso`: determinista, por marcas en el texto más reciente de cada ítem:
  - sin marca, ADECUADA;
  - `[vaga]`;
  - `[falta:C2]` o `[falta:RAZON]` (por código o por tipo de criterio);
  - `[falla]` (falla toda la llamada);
  - `[pregunta-invalida]`;
  - `[consolidada-invalida]`.

  Cuenta `llamadas_entrega` y `llamadas_seguimiento`. Lo usan todas las pruebas.

Nunca se envían nombres, códigos de cuenta ni otros datos que identifiquen al estudiante (RNF-13).

**Prompts:** las instrucciones de entrega y de seguimiento vigentes están en `app/services/registro/prompt.py`. Cambiarlas exige subir `VERSION_PROMPT_REGISTRO`.

## Transacciones

La llamada al LLM nunca ocurre dentro de una transacción ni con una conexión tomada:

1. Transacción corta: validar y leer el registro; anotar `estado` y `actualizada_en` de cada respuesta.
2. Sin transacción: llamar al evaluador (o aplicar el respaldo).
3. Transacción corta: releer; si alguna respuesta cambió, 409 sin escribir. Si no, guardar respuestas, evaluaciones y turnos, y abrir la siguiente pregunta o cerrar.

## Consultas (GET)

| Ruta | Devuelve |
|---|---|
| `/actividades/{a}/items-registro` | Ítems en orden, con consigna, `min_caracteres` (puede ser nulo), obligatoriedad y `eleccion` (`null` o lista, `referencia`, `comun`, mínima, máxima, `ordenada`, `permite_otra` y opciones; con elección por referencia, `lista` es nula y `opciones` va vacía: se leen según `referencias.md`). Sin criterios. |
| `/cuentas/{c}/actividades/{a}/registro` | Posición, estado del progreso y, por ítem, estado, `opciones_elegidas` y conversación del intento vigente (incluidos los borradores). Con el registro cerrado (progreso COMPLETADA y nada pendiente), además `texto_consolidado` por ítem e `items_por_ampliar`: los ítems con POCO_DESARROLLADA vigente, cada uno con `pista`, la pregunta de su evaluación vigente (la omitida, la siguiente que devolvió `evaluar_seguimiento` al agotar las preguntas o la de la edición; inválida, la base o la genérica). |

Apoderados y cuentas o actividades inexistentes: 404. Completar una actividad de registro exige todos sus ítems obligatorios en FINAL (`motor.md`).

## Asistente del diario (B09)

El mismo evaluador (`app.state.evaluador_respuestas`, falso o Gemini, con su `timeout_segundos`) personaliza preguntas del diario con `personalizar_entrada`. Código: `app/services/diario/asistente.py`; el diario en sí está en `motor.md`, «Diario».

- **Entrada al LLM** (RNF-13, RNF-20): solo la pregunta base y los datos que la pregunta declara como referencias, resueltos (`tipo`, `texto`, `opciones`). Nunca códigos de cuenta, nombres ni texto de entradas del diario.
- **Prompt v1** (`PROMPT_DIARIO_V1`, `VERSION_PROMPT_DIARIO`): una sola pregunta en tono de Lumi; cita los datos tal como vienen; no interpreta resultados, no evalúa, no sugiere carreras ni agrega datos ajenos. Salida `{"pregunta": ...}` validada con `pregunta_valida`.
- **Respaldo** (RNF-08): sin datos no se llama al LLM; ante error, tiempo agotado o salida inválida se guarda la base con origen FIJA. Nunca se muestra un error al usuario ni se guarda el mensaje de una excepción externa.
- **Transacciones:** se lee, se redacta fuera de transacción y se guarda con `UPDATE … WHERE texto IS NULL` (desbloqueadas) o con el único `(cuenta, fecha)` (pregunta del día); si otra solicitud ganó, vale la suya.
- **Falso:** antepone el primer dato a la base (`Sobre «…»: <base>`), registra `contextos_diario` y `llamadas_diario`, y falla con `falla_diario = True`.

