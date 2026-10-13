# Referencias

Una referencia es un dato de la cuenta que una actividad o una pregunta de diario lee de la plataforma para citarlo, mostrarlo como contexto u ofrecerlo como opciones (HU-009). Solo se resuelven tipos de un catálogo cerrado, y siempre con datos de la propia cuenta (RNF-20). Código: `app/models/referencias.py`, `app/services/referencias.py` y `app/api/referencias.py`.

## Modelo

| Tabla | Qué guarda |
|---|---|
| `referencia` | `codigo`, `tipo` (`TipoReferencia`), dueño: `actividad_id` **o** `pregunta_diario_id` (CHECK: exactamente uno), y fuente: `item_registro_id`, obligatoria en ELECCION y TEXTO (CHECK `fuente_registro`), o `aplicacion_id`, obligatoria en RESULTADO y COINCIDENCIAS y nula en los demás (CHECK `fuente_aplicacion`). Catálogo, en la caché de definiciones (`referencias_por_actividad`). |
| `item_registro.referencia_id` | Elección por referencia: las opciones del ítem son las que esa referencia ELECCION devuelve a la cuenta (`registro.md`). |

`referencia.item_registro_id` e `item_registro.referencia_id` forman un ciclo de claves foráneas. La de `item_registro` lleva `use_alter` y se crea aparte. El vaciado de `datos.cargar` quita primero la elección por referencia de los ítems, porque los CHECK impiden dejar nula cualquiera de las dos claves, y luego borra en orden.

**Catálogo de tipos** (el enumerado es el catálogo; cada lote agrega los suyos):

| Tipo | Fuente | Desde |
|---|---|---|
| ELECCION | Las opciones elegidas en un ítem de registro con lista | B05 |
| TEXTO | La respuesta consolidada de un ítem de registro | B05 |
| RESULTADO | El resultado revelado de una aplicación: código de interés o dimensiones destacadas | B06 |
| COINCIDENCIAS | Las ocupaciones afines del resultado revelado de una aplicación | B06 |

## Resolución (`app/services/referencias.py`)

`resolver(sesion, cuenta, referencias)` lee, en dos consultas, las respuestas de los ítems fuente de esa cuenta y la clasificación de su última evaluación. Devuelve por referencia un `estado` y, solo si está DISPONIBLE, `texto` u `opciones`. Nunca devuelve la clasificación.

| Tipo | DISPONIBLE | POR_DESARROLLAR | SIN_DATO |
|---|---|---|---|
| ELECCION | Desde la primera entrega del ítem fuente (`clasificacion_inicial` no nula), sea cual sea su estado o su clasificación. `opciones`: `[{codigo, texto}]` en el orden guardado; el texto es el de la lista o, en OTRA, el escrito. | — | Sin respuesta, en borrador o sin entregar. |
| TEXTO | Si la última evaluación no es POCO_DESARROLLADA (incluye NO_EVALUADA por un fallo). `texto`: `texto_consolidado`. | Si la última evaluación es POCO_DESARROLLADA, también mientras espera una respuesta de seguimiento. | Sin respuesta, en borrador o nunca evaluada (p. ej., un ítem opcional entregado sin texto). |

**Reglas:**
- La elección no se edita (`registro.md`). Lo que puede quedar poco desarrollado es la justificación, no la decisión; por eso ELECCION no depende de la clasificación.
- Durante una edición, la pregunta de seguimiento queda solo en el ítem preguntado, que sale POR_DESARROLLAR. Los demás ítems editados ya se citan con su texto nuevo, y los no editados conservan su consolidada.
- Los textos de una referencia TEXTO nunca van al evaluador: son respuestas de otra actividad (RNF-13).
- **Elección por referencia:** al guardar, entregar, editar o responder un seguimiento, las opciones válidas son las de la referencia resuelta para la cuenta. Se guarda `{codigo}`. El evaluador recibe el texto de cada opción elegida como «opción elegida» del propio ítem, que RNF-13 permite enviar. Si se elige la OTRA de la fuente, va al evaluador el texto que el estudiante escribió en el ítem fuente, también como opción elegida y no como cita. Ningún otro texto de la fuente va al evaluador.

## Consulta (GET)

| Ruta | Devuelve |
|---|---|
| `/cuentas/{c}/actividades/{a}/referencias` | `{"referencias": [{codigo, tipo, estado, texto?, opciones?}]}`, ordenadas por código. No exige que la actividad esté disponible. Cuenta que no es de estudiante, actividad inexistente o de otra audiencia: 404. |

**Aislamiento:** la consulta solo lee datos de `{c}`. Todavía no hay autenticación (llega en B17). Cuando exista, deberá exigir que `{c}` sea la cuenta autenticada, con su prueba.

## Carga (`datos/ruta.py`)

`REFERENCIAS`: `(código, (tipo de dueño, dueño), tipo, fuente)`; la fuente es un ítem de registro en ELECCION y TEXTO, y un código de aplicación en RESULTADO y COINCIDENCIAS. En `ITEMS_REGISTRO`, la elección por referencia es `('ref', referencia, mínima, máxima, ordenada)`. El cargador inserta ítems y referencias en el orden en que se leen entre sí, y rechaza con `ValueError`:
- un tipo fuera del catálogo;
- un dueño inexistente;
- una fuente inexistente o de la propia actividad dueña;
- una aplicación de un instrumento de COMPARACION, que no genera resultado;
- una ELECCION cuya fuente no tiene lista;
- una elección por referencia que no apunta a una ELECCION de su propia actividad;
- una mínima o máxima mayor que la de la fuente;
- un ciclo entre ítems y referencias.
