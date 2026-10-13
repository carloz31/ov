# Referencias

Una referencia es un dato de la cuenta que una actividad o una pregunta de diario lee de la plataforma para citarlo, mostrarlo como contexto u ofrecerlo como opciones (HU-009). Solo se resuelven tipos de un catálogo cerrado, y siempre con datos de la propia cuenta (RNF-20). Código: `app/models/referencias.py`, `app/services/referencias.py` y `app/api/referencias.py`.

## Modelo

| Tabla | Qué guarda |
|---|---|
| `referencia` | `codigo`, `tipo` (`TipoReferencia`), dueño: `actividad_id` **o** `pregunta_diario_id` (CHECK: exactamente uno), y fuente: `item_registro_id`, obligatoria en ELECCION y TEXTO (CHECK). Catálogo, en la caché de definiciones (`referencias_por_actividad`). |
| `item_registro.referencia_id` | Elección por referencia: las opciones del ítem son las que esa referencia ELECCION devuelve a la cuenta (`registro.md`). |

`referencia.item_registro_id` e `item_registro.referencia_id` forman un ciclo de claves foráneas. La de `item_registro` lleva `use_alter` y se crea aparte. El vaciado de `datos.cargar` quita primero la elección por referencia de los ítems, porque los CHECK impiden dejar nula cualquiera de las dos claves, y luego borra en orden.

**Catálogo de tipos** (el enumerado es el catálogo; cada lote agrega los suyos):

| Tipo | Fuente | Desde |
|---|---|---|
| ELECCION | Las opciones elegidas en un ítem de registro con lista | B05 |
| TEXTO | La respuesta consolidada de un ítem de registro | B05 |

## Carga (`datos/ruta.py`)

`REFERENCIAS`: `(código, (tipo de dueño, dueño), tipo, ítem fuente)`. En `ITEMS_REGISTRO`, la elección por referencia es `('ref', referencia, mínima, máxima, ordenada)`. El cargador inserta ítems y referencias en el orden en que se leen entre sí, y rechaza con `ValueError`:
- un tipo fuera del catálogo;
- un dueño inexistente;
- una fuente inexistente o de la propia actividad dueña;
- una ELECCION cuya fuente no tiene lista;
- una elección por referencia que no apunta a una ELECCION de su propia actividad;
- una mínima o máxima mayor que la de la fuente;
- un ciclo entre ítems y referencias.
