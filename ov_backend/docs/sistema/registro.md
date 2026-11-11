# Registro

Actividades de registro: cada ítem tiene una consigna (diálogo, pregunta de elección, pregunta del texto y arranque), una elección opcional y, si tiene tarjeta, pasa por la capa del LLM v7 (Claude, abajo). Código: `app/services/registro/` y `app/api/registro.py`.

Estado actual (ajuste registros llm, lote 2): el modelo de datos y el contenido de los 19 registros de `contenido` están cargados, y la capa del LLM está lista, **sin conectar**. El flujo secuencial (servir el ítem, primera respuesta, repregunta, cierre, edición, eco cambiado) es del lote 3. Mientras tanto, la entrega es **provisional** (sin LLM) y el seguimiento, la edición y los borradores responden 501. El front actual no funciona contra estos contratos hasta su propio ajuste.

Lo que ve el estudiante (la escena, los personajes, el orden de los bloques) está en el JSON del front (`ov_frontend/docs/contenidos-actividades.md`). Las consignas y las opciones del ítem son las del backend; sus marcadores (`{carrera}`, `{valor 1}`…) los resuelve la cuenta (lote 3).

## Configuración

| Variable | Por defecto | Uso |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | La capa del LLM v7; opcional mientras no esté conectada. |
| `EVALUADOR` | `falso` | El evaluador de los asistentes con Gemini (diario, sugerencias de pasos, guion): `gemini` usa la API real; `falso`, el determinista. Ya no evalúa registros. |
| `GEMINI_API_KEY` | — | Obligatoria si `EVALUADOR=gemini`. |
| `GEMINI_MODELO` | `gemini-3.5-flash-lite` (`MODELO_LLM_REGISTRO`) | Modelo de los asistentes. |
| `GEMINI_TIMEOUT_SEGUNDOS` | `8` | Tiempo máximo por llamada de los asistentes. |

## Modelo

| Tabla | Qué guarda |
|---|---|
| `lista_opciones` | `codigo`, `nombre` y `comun`. Las comunes están en `datos/fijos.py`; las propias, en la ruta. |
| `opcion_lista` | Opciones de una lista: `codigo`, `texto` y `orden`. Ninguna lista usa un código que empiece por `OTRA`. |
| `item_registro` | `codigo`, `actividad_id`, `orden` (hasta `MAXIMO_ITEMS_REGISTRO` = 5 por actividad), `nombre`, `obligatorio` (sin mínimo de caracteres desde el lote 3). **Consigna:** `dialogo`, `pregunta_eleccion`, `pregunta_texto` (obligatoria) y `arranque`; cualquiera puede llevar marcadores. **Elección:** `fuente_opciones` (LISTA, REFERENCIA, PROPIAS o una lista armada de piezas: PIEZAS_PERFIL, PIEZAS_PERFIL_MENOS, PIEZAS_INICIO; nula sin elección), `lista_id`, `referencia_opciones_id` (PLANES, FAMILIAS_RECOMENDADAS, ELECCION o TESTIMONIOS, en vivo), `referencia_id` (F02: marca lo elegido la vez pasada), `eleccion_minima`, `eleccion_maxima`, `eleccion_ordenada` (podio), `permite_otra`, `etiqueta_otra` (si no es la de siempre), `opciones_propias` y `premarcar_si` (`{item, opcion, marca}`); CHECK `eleccion_valida`. **Ecos:** `ecos_mostrar` y `ecos_llm` (abajo). **Tarjeta:** `tarjeta`, la del LLM v7 (`tarjeta`, `bases`, `general_por_opcion`, `filtrar_etiqueta`); sin tarjeta, el ítem va **sin LLM**. Catálogo, en caché. |
| `respuesta_registro` | Un **intento** de un ítem por fila: `progreso_id`, `item_registro_id`, `intento` (1, 2…) y `vigente` (índice parcial único: un vigente por progreso e ítem). `opciones_elegidas` (`[{codigo, texto}]`, el texto tal como se mostró; en un podio, en su orden), `valores_contexto` (`{marcadores, ecos}` con que se respondió), `primera_respuesta`, `primera_tipo`, `primera_motivo`, `repregunta`, `segunda_respuesta`, `conjunto_tipo`, `conjunto_motivo`, `arranque`, `tipo_final` (los tipos del LLM, en minúscula, con CHECK), `estado`, `sensible`, `seguimiento_sin_evaluar`, `pista`, `linea_registro`, `texto_citable` (0 a 2 líneas) y `version_prompt`. |
| `texto_fijo` | Textos de la plataforma iguales en todas las actividades (`fijos.TEXTOS_FIJOS`): los mensajes de Lumi (`LUMI_SENSIBLE`, `LUMI_EMOCIONAL`, `LUMI_SIN_EVALUAR`) y los de las piezas. Catálogo, en caché. |

**Opciones propias** (`opciones_propias`): `codigo`, `texto`, `exclusiva` (va sola), `pregunta` y `arranque` (reemplazan los del ítem al marcarla), `tarjeta` (la propia, de `por_opcion` de la tarjeta) y `sin_llm` (la opción no se evalúa aunque el ítem tenga tarjeta; su texto puede quedar vacío). Se suman a la fuente o son la única (PROPIAS).

**«Otra»:** en un ítem de una opción, `OTRA`; en uno de varias, cada «Otra» lleva su número (`OTRA-1`… hasta el máximo), con su «¿Cuál?», y en un podio se ordena como cualquier otra opción.

**Marcadores** (`datos/cargador.py`, `MARCADORES`): `{carrera}`, `{plan_a}`, `{plan_b}`, `{primera}`, `{valor 1}`, `{habilidad}` y `{opción}` (este, solo en las bases de las tarjetas). El cargador rechaza cualquier otro `{…}` en la consigna, las opciones o la tarjeta; el «…» de los arranques no es un marcador.

**Ecos:** cada uno `{origen, codigo, nombre?, forma?}`: TEXTO o ELECCION de un ítem anterior de la misma actividad, o REFERENCIA de la actividad; `forma` dice qué parte se toma (`primera`, `carrera`, `cabecera`, `plan_a_b`, `proyecto`, `pasos`, `carrera_institucion`, `hoy`). Los que se muestran y los que van al LLM son dos listas.

**Intento vigente e histórico.** Guardar un intento nuevo (`acciones.guardar_intento`) pasa el vigente al histórico (`vigente = false`) tal como está e inserta el siguiente. Lo que se cita, se muestra o cuenta para el registro sale solo del vigente; el histórico queda para la vista de la orientadora. La edición (volver a iniciar el ítem) es del lote 3.

**Estados de un intento:** COMPLETADO (ítem u opción sin LLM: solo la elección y el texto), CERRADO, ABIERTO (terminó en `no_sabe`) y SIN_EVALUAR (falló la primera llamada). La 0050 no migró las respuestas anteriores: el upgrade se niega si hay respuestas de registro guardadas.

## Acciones (POST)

Todas exigen actividad disponible y cuenta de estudiante (apoderado u orientadora: 404). Aceptan `fecha_hora`.

| Ruta | Cuerpo | Efecto |
|---|---|---|
| `/acciones/registro/entregar` | `items: [{item, texto, opciones}]` | **PROVISIONAL (lote 3).** Valida la elección contra las opciones del ítem (lista, referencia en vivo, propias, «Otra»; de las piezas, solo el prefijo del código) y que ningún texto quede vacío (salvo con una opción `sin_llm`); guarda cada ítem como intento COMPLETADO, sin LLM; completa la actividad y emite REGISTRO_ADECUADO (una vez por cuenta y actividad). Faltan obligatorios: 409 con `items_faltantes`; elección inválida: 422; ya entregado: 409. Devuelve el registro (como el GET) más `eventos_registrados` y `nuevos_desbloqueos`. |
| `/acciones/registro/guardar-borrador`, `/responder-seguimiento`, `/continuar-sin-responder`, `/editar` | los de antes | 501, «Pendiente de reescritura (ajuste registros, lote 3)», tras el guardia de acceso. |

## Consultas (GET)

| Ruta | Devuelve |
|---|---|
| `/actividades/{a}/items-registro` | Ítems en orden, con su consigna (marcadores sin resolver), `obligatorio`, `con_llm` y `eleccion` (`null` o `fuente`, `lista`, `referencia`, `referencia_opciones`, `comun`, mínima, máxima, `ordenada`, `permite_otra`, `etiqueta_otra`, las opciones de la lista y las propias con `pregunta`, `arranque` y `sin_llm`, nunca su tarjeta). |
| `/cuentas/{c}/actividades/{a}/registro` | Posición, estado del progreso y, por ítem con intento vigente, su estado, `opciones_elegidas` y el texto. |

Apoderados y cuentas o actividades inexistentes: 404. Completar una actividad de registro exige un intento vigente en cada ítem obligatorio (`motor.md`).

## Contexto de un ítem (`contexto.py`, lote 2)

`resolver_contexto(sesion, cuenta, codigo_item)` devuelve, sin escribir nada, lo que se le ofrece a la cuenta en un ítem: las opciones (las de su fuente, las piezas armadas con lo suyo y las propias, cada una con su pregunta y su arranque), los valores de los marcadores, la consigna ya armada, los ecos que se muestran (estructurados) y los que van al LLM (líneas). Si falta el valor de un marcador (p. ej., no hay Plan B), levanta `MarcadorSinValor` con su nombre. `entrada_llm(contexto, elegidas, respuesta, anterior?, repregunta?)` arma la `Entrada` de `llm/` con la tarjeta de la opción marcada o la del ítem (`OpcionSinLLM` si va sin LLM), la pregunta mostrada, lo marcado en el formato del runner y las líneas de ecos; una prueba comprueba que coincide con la del runner en un caso de cada registro requerido. Lo usan el lote 3 (el ítem servido, la capa del LLM y el eco cambiado).

**Reglas de referencia** (§3), siempre sobre el intento vigente: una elección se muestra siempre; un texto, solo si es citable (`texto_citable`: vacío en un ítem sin LLM o `sin_evaluar`; con el seguimiento sin evaluar, solo la primera respuesta); lo escrito en «¿Cuál?» va como pieza si el ítem quedó `propio` o `general`, y siempre si va sin LLM; de un ítem `sensible` o `emocional` no va nada, ni la elección; los marcadores se resuelven siempre; en una pieza, lo escrito por el estudiante va entre comillas.

**Marcadores:** `{carrera}` y `{plan_a}` (la carrera del Plan A), `{plan_b}`, `{primera}` (el 1.º de b2-4-bien en minúscula; una «Otra», tal cual), `{valor 1}` (el 1.º de b2-3-valores) y `{habilidad}` (lo marcado en h1-reto); `{opción}` lo resuelve la tarjeta.

**Piezas del perfil** (b4-1-respalda; en b4-1-menos, con «Lo que te cuesta» primero): `INT-<letra>` (las tres del código RIASEC, con su frase y el nombre de la dimensión como origen que se muestra), `INTEL-<dim>` y `HAB-<dim>` (las más altas de inteligencias y de habilidades sociales, todas si hay empate; solo con el resultado revelado), `BIEN-1`, `VAL-1`, `LOGRO-HAB` (ninguna con `NINGUNO`), `GUSTO` (citable) y `CUESTA-<opción>` (sin NADA). **Piezas del inicio** (b5-3-cambio): `INI-OPCION`, `INI-RUTA`, `INI-DIA`, `INI-FRENO` y `INI-MITO` (un mito de la lista aunque su texto no sea citable; la «Otra», con la regla de arriba; con «Ninguno me suena», nada). Cada pieza lleva el origen que se muestra (§4) y el que va al LLM, el que validó el runner; el texto de una pieza de test es su frase corta (`PIEZA_FRASE_<dimensión>`). Al LLM, una pieza va con su origen entre paréntesis y lo escrito por el estudiante entre «» (perfil) o "" (inicio); la «Otra» del ítem va con su origen («otra cosa tuya», «otra cosa que cambió») y sin comillas. Grupos, orígenes y frases están en `texto_fijo` (`PIEZA_*`, de `fijos.TEXTOS_FIJOS`); los ítems de las piezas, en `parametros.ITEMS_PIEZAS`. La carga falla si falta uno o si no tiene la forma esperada.

**Ecos al LLM** (`ecos_llm` y su `forma`): b1-3-contraste, «Nombre: elección. «texto»» por ítem; `primera`, «Nombre: el 1.º»; un texto, «Nombre: texto»; `carrera`, «Tu Plan A: carrera»; `plan_a_b`, «Plan A: carrera · lo que te mueve: motivos · «relato»» y la del B; `carrera_institucion`, «Tu proyecto: carrera · institución». Los que se muestran llevan la cabecera del Plan A, los dos primeros planes, el proyecto con sus pasos pendientes y hechos, el primer check-in, la columna «Hoy» de b5-3 y las referencias de las opcionales.

## Asistentes con Gemini

El cliente Gemini de `gemini.py` (`EvaluadorGemini`) y el evaluador falso de `evaluacion.py` (`EvaluadorFalso`) ya no evalúan registros: sirven al diario, a las cartas, a las sugerencias de pasos y al guion (`app.state.evaluador_respuestas`), con `TEMPERATURA_ASISTENTES` y `NIVEL_RAZONAMIENTO_ASISTENTES`. `pregunta_valida` (un solo «?» al final, sin códigos ni `PALABRAS_EVALUATIVAS`) valida sus preguntas.

## Asistente del diario (B09)

El mismo evaluador (`app.state.evaluador_respuestas`, falso o Gemini, con su `timeout_segundos`) personaliza preguntas del diario con `personalizar_entrada`. Código: `app/services/diario/asistente.py`; el diario en sí está en `motor.md`, «Diario». También sugiere pasos para las dudas y complicaciones de los planes con `sugerir_pasos` (`planes.md`, «Sugerencias de pasos»).

- **Entrada al LLM** (RNF-13, RNF-20): solo la pregunta base y los datos que la pregunta declara como referencias, resueltos (`tipo`, `texto`, `opciones`). Nunca códigos de cuenta, nombres ni texto de entradas del diario.
- **Prompt v1** (`PROMPT_DIARIO_V1`, `VERSION_PROMPT_DIARIO`): una sola pregunta en tono de Lumi; cita los datos tal como vienen; no interpreta resultados, no evalúa, no sugiere carreras ni agrega datos ajenos. Salida `{"pregunta": ...}` validada con `pregunta_valida`.
- **Respaldo** (RNF-08): sin datos no se llama al LLM; ante error, tiempo agotado o salida inválida se guarda la base con origen FIJA. Nunca se muestra un error al usuario ni se guarda el mensaje de una excepción externa.
- **Transacciones:** se lee, se redacta fuera de transacción y se guarda con `UPDATE … WHERE texto IS NULL` (desbloqueadas) o con el único `(cuenta, fecha)` (pregunta del día); si otra solicitud ganó, vale la suya.
- **Cartas (ajuste registros):** una pregunta personalizada que se desbloquea (en `contenido` no queda ninguna desde el lote 2 de registros llm; se redefinen en su ajuste) se redacta con `PROMPT_CARTA_V1`: de 3 a 5 líneas, en tono de amiga, que termina en una pregunta que conecta dos cosas que el estudiante dijo; se valida que no esté vacía, que termine en «?» y que no pase de `MAXIMO_CARACTERES_CARTA`. Un TEXTO sensible no llega al contexto (SIN_DATO); uno ABIERTA llega como «Lo dejó abierto». Si la cuenta eligió la opción de `pregunta_diario.respaldo_si` (`{item, opcion}`; solo C2), se usa la base sin LLM.
- **Falso:** antepone el primer dato a la base (`Sobre «…»: <base>`), registra `contextos_diario` y `llamadas_diario`, y falla con `falla_diario = True`.


## Capa del LLM v7 (ajuste registros llm, lote 1)

Módulo sin base de datos ni endpoints, **todavía no conectado al flujo** (lote 3). Desde el lote 2, la tarjeta de cada ítem se carga en `item_registro.tarjeta` (y la de opción, en su opción propia). Código: `app/services/registro/llm/`. Tarjetas: `datos/tarjetas_registros/`. Lo usa hoy el runner de `tests/llm` (`evaluar_tarjetas.py`).

- **Tarjetas:** una por ítem o por opción (AUN_NO, NINGUNO, CUESTA, NADIE, TODO, IGUAL), con su texto, sus `bases` separadas, `filtrar_etiqueta` (solo b1-1-logro) y, en b1-3-contraste y b2-4-cruce, `general_por_opcion`. `HASHES` guarda el sha256 de cada texto. `tarjeta_para(ficha, opcion, etiquetas, marcadores)` elige la tarjeta, hereda `fuera_de_tema` de `general` y reemplaza `{carrera}`, `{plan_a}`, `{plan_b}` y `{opción}` en el texto y las bases.
- **Entrada** (ya resuelta por quien llama): tarjeta, pregunta mostrada, etiquetas marcadas (etiqueta, «¿Cuál?» o pieza con su origen; con `ordenada`, «1.º …»), líneas de ecos, respuesta y, en el seguimiento, la primera respuesta y la repregunta que vio. Largo máximo `MAXIMO_CARACTERES_TEXTO_LLM` (1000) en respuestas y etiquetas (`EntradaInvalida`); sin caracteres de control; las etiquetas del mensaje se neutralizan (`‹ ›`). Las etiquetas vacías se omiten. Nada que identifique al estudiante.
- **Llamada:** `ClienteClaude`, `claude-haiku-5-5` (`MODELO_LLM_REGISTRO_V7`), esfuerzo `low`, salida con esquema JSON `{motivo, tipo, sensible, repregunta, arranque}`, sin temperatura ni reintentos, `MAXIMO_TOKENS_SALIDA_LLM` (2048) y `TIEMPO_MAXIMO_LLM_SEGUNDOS` (12). Clave: `ANTHROPIC_API_KEY` en `.env` (opcional mientras no esté conectada). Prompt: `prompt_v7_haiku_arranque.py` (`VERSION_PROMPT_LLM`, `HASH_PROMPT`).
- **Fallo:** error, tiempo agotado, rechazo, tope de tokens, otra parada, JSON inválido o fuera del esquema → `sin_evaluar` con su causa; no se muestra ninguna base.
- **Coherencia y filtro:** sin repregunta en `propio`, `emocional` o `sensible`; vacía → base del tipo. Filtro: palabras prohibidas, etiqueta de la opción (no en `fuera_de_tema`), más de 30 palabras o de una pregunta, final en «?» o «.», caracteres, léxico es_ES (`lexico/`, con `spylls`; valen las palabras del estudiante y sus ecos), truncamientos, formato y enlaces, tras decodificar entidades HTML. Si cae: base del tipo en la primera y de `no_sabe` en el seguimiento. Agrega el «¿» que falta y la mayúscula inicial. El backend no impone bases por lo que diga la tarjeta.
- **Arranque y línea** (solo seguimiento, con cualquier tipo, también sensible): sin comillas ni dos puntos finales, hasta 12 palabras, sin «es», «es que», «fue», «sería», «cuando» ni «porque» al final, sin enlaces, etiquetas ni signos de pregunta y sin dos o más palabras de contenido de las respuestas que no estén en la repregunta ni en la opción; la línea es «Arranque: segunda respuesta tal cual» o, si no pasa, la segunda respuesta sola.
- **Estado final** (`estado_final`, pura): orden `propio` > `general` > `emocional` > `no_sabe` > `vacio` > `fuera_de_tema`; tipo final el mejor de los dos; `sensible` de cualquiera; abierto = `no_sabe`; adecuado = `propio`, `general`, `emocional`, sensible o abierto. Pista: la repregunta del seguimiento si respondió (o la que vio, si no generó ninguna o no respondió); ninguna con final `propio` o `emocional`, o sensible. `linea_registro`: la línea, siempre que respondió. Texto citable: la primera si fue `propio` o `general`, más la línea si el conjunto quedó `propio` o `general` y mejor que la primera (o solo la línea si la primera fue `no_sabe`, `vacio` o `fuera_de_tema`); nada con sensible. Si falla la primera llamada, el ítem queda `sin_evaluar`; si falla la del seguimiento, conserva el tipo de la primera, sin citar el seguimiento (`seguimiento_sin_evaluar`).
