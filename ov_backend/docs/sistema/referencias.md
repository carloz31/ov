# Referencias

Una referencia es un dato de la cuenta que una actividad o una pregunta de diario lee de la plataforma para citarlo, mostrarlo como contexto u ofrecerlo como opciones (HU-009). Solo se resuelven tipos de un catálogo cerrado, y siempre con datos de la propia cuenta (RNF-20). Código: `app/models/referencias.py`, `app/services/referencias.py` y `app/api/referencias.py`.

## Modelo

| Tabla | Qué guarda |
|---|---|
| `referencia` | `codigo`, `tipo` (`TipoReferencia`), dueño: `actividad_id` **o** `pregunta_diario_id` (CHECK: exactamente uno), y fuente: `item_registro_id`, obligatoria en ELECCION y TEXTO (CHECK `fuente_registro`), o `aplicacion_id`, obligatoria en RESULTADO, COINCIDENCIAS y RESPUESTA_CUESTIONARIO y nula en los demás (CHECK `fuente_aplicacion`), más `item_instrumento_id`, obligatorio solo en RESPUESTA_CUESTIONARIO (CHECK `fuente_cuestionario`). FAVORITOS no tiene fuente (CHECK `favoritos_sin_fuente`), ni PLANES, PLAN, PASOS_PLAN_A, OPCION_INICIAL y LO_QUE_PIENSO (CHECK `planes_sin_fuente`). Catálogo, en la caché de definiciones (`referencias_por_actividad` y `referencias_por_pregunta`). |
| `item_registro.referencia_id` | Elección que retoma una anterior (F02): el ítem elige de su lista y esta referencia ELECCION, sobre la misma lista, solo marca lo elegido la vez pasada (`registro.md`). |

`referencia.item_registro_id` e `item_registro.referencia_id` forman un ciclo de claves foráneas. La de `item_registro` lleva `use_alter` y se crea aparte. El vaciado de `datos.cargar` quita primero la referencia de los ítems (conservan su lista) y luego borra en orden.

**Catálogo de tipos** (el enumerado es el catálogo; cada lote agrega los suyos):

| Tipo | Fuente | Desde |
|---|---|---|
| ELECCION | Las opciones elegidas en un ítem de registro con lista | B05 |
| TEXTO | El texto citable de un ítem de registro (lote 2 de registros llm) | B05 |
| RESULTADO | El resultado revelado de una aplicación: código de interés o dimensiones destacadas | B06 |
| COINCIDENCIAS | Las ocupaciones afines del resultado revelado de una aplicación | B06 |
| RESPUESTA_CUESTIONARIO | La opción elegida en un ítem de instrumento dentro de una aplicación (p. ej., el punto de partida) | B07 |
| FAVORITOS | Las carreras, ocupaciones e instituciones marcadas como favoritas (sin fuente) | B09 |
| PLANES | Los planes de carrera por prioridad (sin fuente) | B11 |
| PLAN | El plan A: su carrera, su relato y sus motivos (sin fuente) | B11 |
| PASOS_PLAN_A | Los pasos del plan A (sin fuente) | B11 |
| OPCION_INICIAL | La carrera de la opción inicial (sin fuente) | B11 |
| LO_QUE_PIENSO | Lo que el estudiante pensaba de la familia de carreras antes de su primera entrevista publicada (sin fuente) | B13 |
| FAMILIAS_RECOMENDADAS | Las cinco familias del resultado de intereses revelado (sin fuente) | Ajuste registros |
| TESTIMONIOS | Los testimonios desbloqueados por la cuenta, solo con su título (sin fuente) | Ajuste registros |
| DATOS_CARRERA_PLAN_A | Duración, tipo y referencia de ingresos de la familia de la carrera del plan A (sin fuente) | Ajuste registros |
| CHECK_IN_PRIMERO | El primer check-in de la cuenta (sin fuente) | Ajuste registros llm (lote 2) |

Ningún tipo lee el diario (`entrada_diario`): el diario va en una sola dirección (`motor.md`, «Diario»).

## Resolución (`app/services/referencias.py`)

`resolver(sesion, cuenta, referencias)` lee, en una consulta, el intento vigente de los ítems fuente de esa cuenta, y en lecturas agrupadas, los resultados vigentes de las aplicaciones fuente con `representar_resultado`, y en una más, las respuestas de cuestionario citadas. Devuelve por referencia un `estado` y, solo si está DISPONIBLE, `texto` u `opciones`. Nunca devuelve la clasificación.

| Tipo | DISPONIBLE | POR_DESARROLLAR | SIN_DATO |
|---|---|---|---|
| ELECCION | Con intento vigente del ítem fuente, sea cual sea su estado. `opciones`: `[{codigo, texto}]` en el orden guardado, con el texto tal como se mostró (en una «Otra», lo escrito). | — | Sin intento vigente, o el ítem quedó **sensible** o con tipo final `emocional` (§3.4 del lote 2: no se referencia nada de él). |
| TEXTO | El intento vigente tiene `texto_citable` (lo que calcula la capa del LLM: la primera respuesta si quedó `propio` o `general`, más la línea del seguimiento si mejoró) y no es sensible ni `emocional`. `texto`: sus líneas unidas con un espacio. | — | Sin intento vigente, sin texto citable (un ítem u opción sin LLM, un ítem `sin_evaluar` o la entrega provisional) o sensible o `emocional`. |
| RESULTADO | Con resultado vigente (revelado) de la aplicación fuente. `opciones`: `[{codigo, texto}]` de las dimensiones del código de interés (COINCIDENCIAS) o de las destacadas (DESTACADAS), con el nombre de la dimensión. Con perfil plano, `[]`. | — | Sin revelar, o tras reiniciar. |
| COINCIDENCIAS | Igual que RESULTADO. `opciones`: las ocupaciones por posición, con `codigo` (o `codigo_onet` si no tiene) y su título. Con perfil plano, `[]`. | — | Igual que RESULTADO. |
| RESPUESTA_CUESTIONARIO | La actividad de la aplicación fuente que presenta el ítem está COMPLETADA (la respuesta ya no cambia). `texto`: la etiqueta de la opción, sin puntaje. | — | Sin respuesta o con la actividad sin completar. |
| FAVORITOS | Con al menos un favorito. `opciones`: `[{codigo, texto}]` del más reciente al más antiguo; carreras e instituciones por `codigo` y `nombre`, ocupaciones por `codigo_onet` y `titulo`. | — | Sin favoritos. |
| PLANES | Con al menos un plan. `opciones`: `[{codigo, texto}]` de las carreras por prioridad; `planes` (lote 2 de registros llm): cada uno con `prioridad`, `codigo`, `carrera`, `institucion`, `camino`, `idea_origen`, `motivos` y `relato`. | — | Sin planes. |
| PLAN | Con al menos un plan. `texto`: la carrera del plan A; `cita`: su relato (nulo si no lo escribió); `opciones`: sus motivos por posición, con el código de VALORES o `OTRA` y el texto escrito. `planes`: solo el A, con el detalle de PLANES. | — | Sin planes. |
| PASOS_PLAN_A | El plan A tiene pasos. `opciones`: `[{codigo, texto}]` por posición, con el código del tipo de paso y su `estado` (PENDIENTE o HECHO). | — | Sin planes o sin pasos. |
| OPCION_INICIAL | La cuenta tiene opción inicial. `texto`: el nombre de la carrera. | — | Sin opción inicial. |
| FAMILIAS_RECOMENDADAS | Con resultado de intereses revelado. `opciones`: las familias por posición, `{codigo, nombre}`. | — | Sin resultado o con perfil plano. |
| TESTIMONIOS | Con al menos un testimonio disponible. `opciones`: `{codigo, titulo}` por código. | — | Ninguno desbloqueado. |
| DATOS_CARRERA_PLAN_A | Con plan A. `texto`: la carrera; `opciones`: `INGRESO_FAMILIA` («S/ … al mes: referencia de carreras de esta familia», el promedio de jóvenes de su familia y tipo, sin ubicación), `DURACION` y `TIPO` (Universitaria, Técnica o Pública); un campo sin dato se omite. | — | Sin planes. |
| CHECK_IN_PRIMERO | La cuenta hizo al menos un check-in. `texto`: «N de 5», el nivel del primero (sin etiqueta: queda para el front). | — | Sin check-in (no es requisito). |
| LO_QUE_PIENSO | La cuenta publicó al menos una entrevista. `texto`: el título de la ocupación de la primera; `opciones`: `DIA`, `NECESITA` y `DUDA` con lo que escribió antes (aunque la entrevista se haya retirado). | — | Sin entrevistas publicadas. |

**Reglas:**
- Siempre se lee el intento vigente; el histórico no se cita. Si el intento nuevo de un ítem sensible queda `propio` o `general` sin marca, vuelve a citarse.
- POR_DESARROLLAR y ABIERTA ya no se producen (lote 2 de registros llm); el enumerado se conserva porque lo lee el diario.
- Las piezas, los ecos y los marcadores de los registros (§3 y §4 del lote 2) los arma `app/services/registro/contexto.py` con estas mismas reglas (`registro.md`).
- Al LLM solo van las referencias e ítems que el ítem declara en `ecos_llm` (`registro.md`); nunca las demás.
- Las referencias de objetos que cambian (PLANES, TESTIMONIOS, FAMILIAS_RECOMENDADAS) se resuelven en vivo; lo guardado en una respuesta conserva el texto de la opción elegida en su momento.
- **Opciones desde una referencia (ajuste registros):** un ítem con `fuente_opciones = REFERENCIA` toma sus opciones de una referencia de su actividad (PLANES, FAMILIAS_RECOMENDADAS, ELECCION o TESTIMONIOS) y puede retomar sobre la misma referencia (`b5-1-decision`: marca el plan A actual).
- **Elección que retoma una anterior (F02):** las opciones válidas son las de la lista del ítem, como en cualquier elección; la referencia no las cambia. El front marca de entrada lo elegido la vez pasada (la ELECCION resuelta, con el texto de su OTRA) y el estudiante lo mantiene o lo cambia. Se guarda y se evalúa como cualquier elección: la OTRA lleva el texto escrito en este ítem. Ningún texto de la fuente va al evaluador.

## Consulta (GET)

| Ruta | Devuelve |
|---|---|
| `/cuentas/{c}/actividades/{a}/referencias` | `{"referencias": [{codigo, tipo, estado, actividad?, texto?, opciones?, cita?}]}`, ordenadas por código; `cita` solo en PLAN. `actividad` (F02) solo en ELECCION y TEXTO, en todo estado: el código de la actividad del ítem fuente, para que el front nombre de dónde sale la cita. No exige que la actividad esté disponible. Cuenta que no es de estudiante, actividad inexistente o de otra audiencia: 404. |

**Aislamiento:** la consulta solo lee datos de `{c}`. Todavía no hay autenticación (llega en B17). Cuando exista, deberá exigir que `{c}` sea la cuenta autenticada, con su prueba.

## Carga (`datos/ruta.py`)

`REFERENCIAS`: `(código, (tipo de dueño, dueño), tipo, fuente)`; la fuente es un ítem de registro en ELECCION y TEXTO, un código de aplicación en RESULTADO y COINCIDENCIAS, `(aplicación, ítem)` en RESPUESTA_CUESTIONARIO y `None` en FAVORITOS. Una pregunta de diario solo es dueña si es personalizada. En `ITEMS_REGISTRO`, la elección que retoma una anterior agrega la referencia como sexto campo: `(lista, mínima, máxima, ordenada, otra, referencia)`. El cargador inserta ítems y referencias en el orden en que se leen entre sí, y rechaza con `ValueError`:
- un tipo fuera del catálogo;
- un dueño inexistente, o una pregunta de diario no personalizada;
- una fuente en FAVORITOS, PLANES, PLAN, PASOS_PLAN_A, OPCION_INICIAL, LO_QUE_PIENSO, FAMILIAS_RECOMENDADAS, TESTIMONIOS, DATOS_CARRERA_PLAN_A o CHECK_IN_PRIMERO;
- una fuente inexistente o de la propia actividad dueña;
- en RESULTADO o COINCIDENCIAS, una aplicación de un instrumento de COMPARACION;
- en RESPUESTA_CUESTIONARIO, un ítem que la aplicación no presenta;
- una ELECCION cuya fuente no tiene elección;
- un ítem que elige de una referencia que no es de su actividad o que no da opciones;
- una elección que retoma una referencia que no es una ELECCION de su propia actividad, que lee otra lista o cuyo máximo u «otra» no admiten lo que pudo elegirse en la fuente;
- una mínima o máxima mayor que la de la fuente;
- un ciclo entre ítems y referencias.
