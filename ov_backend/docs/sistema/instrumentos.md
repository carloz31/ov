# Instrumentos, resultados y recomendación

Cuestionarios repartidos en actividades, cálculo de resultados y recomendación de ocupaciones y carreras. Código: `app/services/instrumentos/` (`calculo.py` es puro, sin base), `app/services/actividades.py` (responder, completar, reiniciar). Parámetros: `app/core/parametros.py`. Datos: `datos/fijos.py` (temáticas, RIASEC, ocupaciones, carreras y el cuestionario de partida y llegada), `datos/ocupaciones.py` y, para unir ítems y actividades, `datos/ruta.py`.

## Modelo

| Tabla | Qué guarda |
|---|---|
| `instrumento` | `tipo_resultado`: COINCIDENCIAS (RIASEC), DESTACADAS (inteligencias, habilidades sociales) o COMPARACION (autopercepción). |
| `dimension` | Dimensiones con `orden`, `descripcion` (la que ve el estudiante) y, en el cuestionario de partida y llegada, su `tematica_id`. |
| `tematica`, `actividad_tematica` | Las cinco temáticas (A–E) del cuestionario de partida y llegada, y las actividades asociadas a cada una. |
| `escala_respuesta`, `opcion_escala` | Opciones con `orden`, `etiqueta` y `puntaje`. |
| `item_instrumento` | `numero`, `enunciado`, dimensión, escala e `inverso`. |
| `actividad_item` | Qué ítems presenta cada actividad y en qué orden. |
| `aplicacion`, `aplicacion_actividad` | Una aplicación del instrumento (`momento` UNICA, ENTRADA o SALIDA) y sus actividades. |
| `ocupacion`, `puntaje_ocupacion` | Catálogo O*NET (código, título, `codigo` del front y seis puntajes RIASEC, que solo usa el test). Detalle: `descripcion`, `lugares_trabajo`, `habilidades` y `conocimientos` (listas JSON), `codigo_riasec` y `busqueda`. |
| `high_point` | De 1 a 3 letras RIASEC por ocupación (`posicion` 1–3), cargadas, no calculadas desde los puntajes. La posición 1 es su tipo principal. |
| `carrera`, `tipo_carrera` | Carrera con familia, `descripcion`, `duracion`, `codigo_riasec` y `busqueda`; de 0 a 3 letras RIASEC cargadas por carrera, con la misma estructura que `high_point`. |
| `carrera_ocupacion` | Ocupaciones a las que conduce cada carrera. |
| `ubicacion`, `institucion`, `institucion_carrera` | Instituciones (`tipo` UNIVERSIDAD, INSTITUTO o FFAA_POLICIA, ubicación, página web) y las carreras que ofrecen. |
| `ingreso_carrera`, `rango_ingreso` | Ingreso mensual promedio de una carrera (fuente y año) y su distribución por tramos (`maximo` nulo = tramo abierto). |
| `respuesta_item` | Respuesta por progreso de actividad e ítem (única). |
| `resultado_instrumento`, `resultado_dimension`, `coincidencia` | Resultado calculado, con `anulado_en` y `perfil_plano`. A lo sumo uno vigente por cuenta y aplicación; los anulados quedan como historial. |

Dentro de una aplicación, cada ítem del instrumento se presenta en exactamente una actividad; la carga lo valida (`validar_distribucion_items`).

**Catálogo O*NET.** `datos/ocupaciones.py` lee `datos/archivos/Career_Interest_RIASEC_Clean.xlsx` (columnas `code, title, R, I, A, S, E, C`) solo al cargar la base. Encabezado distinto, valores no numéricos o códigos repetidos detienen la carga. La aplicación nunca lee el Excel.

**Letras RIASEC del catálogo.** Al cargar, se valida que las posiciones de `high_point` y `tipo_carrera` sean consecutivas desde 1, sin letras repetidas. `codigo_riasec` se calcula con las letras en orden de posición («RIS»). `busqueda` es el nombre o título en minúsculas y sin tildes (`sin_tildes`, en `app/models/base.py`), y el modelo la calcula al insertar.

**Escala RIASEC.** `ESC-LIKERT5`: la opción 1–5 que marca el estudiante vale 0–4 (transformación O*NET, aplicada solo al sembrar). El cálculo usa siempre los puntajes guardados en `opcion_escala`.

## Responder ítems — `POST /acciones/responder-items`

- Cuerpo: `cuenta`, `actividad`, `respuestas: [{item, opcion}]` (opción por su `orden`).
- Lote no vacío, sin ítems repetidos, opciones enteras de la escala del ítem: si no, 422. Un ítem que la actividad no presenta: 409. Actividad no disponible: 409 con su progreso. Apoderado: 404.
- Se valida todo el lote antes de escribir. La primera respuesta crea el progreso en EN_CURSO; reemplazar una respuesta conserva su fila y `creada_en`.
- Las respuestas quedan **fijas** (409) si alguna aplicación de la actividad tiene resultado vigente (es decir, desde que se revela); en COMPARACION, cuando la actividad está COMPLETADA. Antes de revelar se pueden cambiar.
- No registra eventos.

## Completar y revelar — `POST /acciones/revelar-resultado`

`completar-actividad` exige todos los ítems de la actividad respondidos (si no, 409 con `items_faltantes`) y **no calcula**. El resultado se calcula al revelarlo (HU-027): hasta entonces nadie lo ve.

- Cuerpo: `cuenta`, `instrumento`, `aplicacion` (obligatoria si hay más de una: si falta, 422) y `fecha_hora` opcional.
- 404 si la cuenta no es de estudiante o no existe el instrumento o la aplicación. 409 si el instrumento no tiene dimensiones, si falta completar alguna actividad de la aplicación (con `items_faltantes` = esas actividades) o si ya hay resultado vigente («Resultado ya revelado»).
- En una transacción: calcula y guarda el resultado y registra REVELA_RESULTADO con la aplicación como referencia. Si el cálculo falla, se revierte todo.
- Respuesta: `cuenta`, `instrumento`, `aplicacion`, `perfil_plano`, `eventos_registrados` y `nuevos_desbloqueos`.
- Cada instrumento cierra con un registro de contraste que se abre con REVELA_RESULTADO y cita el resultado (referencias RESULTADO y COINCIDENCIAS, `referencias.md`).
- Repetir una actividad con respuestas fijas registra COMPLETA_ACTIVIDAD y no recalcula.

**Cálculo** (`calculo.py`):

- Puntaje del ítem: el de la opción; si es inverso, `máximo + mínimo − puntaje` de su escala.
- Dimensión: suma de sus ítems; máximo = suma de los máximos; porcentaje = `100 × puntaje / máximo`, redondeado a 2 decimales.
- Entradas inválidas (puntaje fuera de escala, vectores incompletos, máximo no positivo): `ValueError`, nunca un valor inventado.

**Coincidencias (COINCIDENCIAS):**

1. Vector del estudiante en el orden de `dimension.orden` (R, I, A, S, E, C).
2. Si los seis puntajes son iguales: `perfil_plano`, sin coincidencias.
3. Si no, Pearson (`statistics.correlation`) con cada ocupación. Se descartan las negativas. BEST_FIT si r ≥ 0.729; GREAT_FIT si 0.608 ≤ r < 0.729; GOOD_FIT si 0 ≤ r < 0.608.
4. Se guardan las 10 primeras por r descendente, con `codigo_onet` ascendente como desempate. La correlación se guarda sin redondear y se expone con 6 decimales.

**Derivados al consultar** (no se guardan):

- Código de interés: las 3 dimensiones de mayor puntaje, con el orden de las dimensiones como desempate. `hay_empate` si la tercera y la cuarta empatan.
- Carreras recomendadas: las vinculadas a alguna de las 10 ocupaciones, ordenadas por su mejor posición (y código); cada una con `via`, las ocupaciones que la vinculan.
- Dimensiones destacadas (DESTACADAS): las de mayor proporción exacta `puntaje / máximo` (no el porcentaje redondeado); si empatan, todas, en el orden del instrumento.

**Partida y llegada (COMPARACION):**
- Cada aplicación (ENTRADA = partida, SALIDA = llegada) se revela por separado y guarda sus dimensiones, sin perfil plano. El reinicio responde 409.
- **Zona** de una dimensión: el promedio de sus ítems (puntaje ÷ número de ítems, con los inversos aplicados). Es FUERTE si es ≥ `UMBRAL_ZONA_FUERTE` (3,5), EN_CAMINO si es ≥ `UMBRAL_ZONA_EN_CAMINO` (2,5) y POR_TRABAJAR en otro caso.
- El estudiante recibe solo zonas y textos, nunca puntajes. El detalle numérico es de la orientadora y llega con su vista de resultados (B14).
- La partida es obligatoria y la marca de prioritario no aplica a este tipo (`motor.md`).

## Reiniciar — `POST /acciones/reiniciar-instrumento`

Volver a hacer el test cuando el resultado no distingue ningún tipo (HU-095). Recibe `cuenta`, `instrumento` y `aplicacion` (obligatoria si hay más de una: si falta, 422).

- Solo procede con un resultado vigente con `perfil_plano` (si no, 409) y si la cuenta no agotó `MAXIMO_REINICIOS_PERFIL_PLANO` en esa aplicación, contado con sus resultados anulados con perfil plano (si no, 409 «Ya usaste el reinicio de este cuestionario»).
- En una transacción: anula el resultado vigente, borra las respuestas del instrumento en los progresos de la aplicación, pasa esos progresos a EN_CURSO y registra REINICIA_INSTRUMENTO. No revoca desbloqueos ni borra eventos ni resultados anteriores. Para tener un resultado nuevo hay que completar y revelar otra vez.

## Consultas (GET)

| Ruta | Devuelve |
|---|---|
| `/instrumentos` | Instrumentos con dimensiones (con descripción), escalas, aplicaciones y actividades. |
| `/actividades/{a}/items` | Ítems de la actividad en orden, con las opciones de su escala. No exige cuenta ni disponibilidad. |
| `/cuentas/{c}/actividades/{a}/respuestas` | Respuestas actuales de la cuenta en esa actividad. |
| `/cuentas/{c}/instrumentos` | Por instrumento y aplicación: NO_INICIADO, EN_PROGRESO o COMPLETADO (todas sus actividades completadas, se haya revelado o no); actividades e ítems respondidos sobre el total; `hay_resultado_vigente` (revelado). COMPLETADO sin resultado vigente es «listo para revelar». |
| `/cuentas/{c}/instrumentos/{i}/resultado?aplicacion=` | Resultado vigente (vistas resumida y explicada, HU-022 y HU-023): dimensiones (con `descripcion`; en COMPARACION, con `zona` y `tematica` y los números en `null`), y según el tipo, `codigo_interes`, `coincidencias`, `carreras_recomendadas` o `dimensiones_destacadas`. Sin vigente (no revelado o reiniciado): 409 con el avance. |
| `/cuentas/{c}/instrumentos/{i}/historial` | Todos los resultados, incluidos los anulados, del más reciente al más antiguo. |
| `/cuentas/{c}/instrumentos/{i}/comparacion` | HU-094. `{instrumento, partida, llegada, dimensiones}`. Cada dimensión, en orden, trae `codigo`, `nombre`, `descripcion`, `tematica`, `zona_partida`, `zona_llegada`, `actividades_completadas` (cuántas actividades de su temática tiene COMPLETADA la cuenta) e `items`. Cada ítem trae `item`, `enunciado`, `partida` y `llegada` (la etiqueta elegida) y `cambio` (bool; un cambio hacia una opción menor no se distingue). Sin números. La aplicación ENTRADA y la SALIDA se eligen por `momento`, nunca por código. Instrumento de otro tipo: 404. Sin las dos reveladas: 409 con el avance de ambas. |

Las consultas con cuenta responden 404 a un apoderado. El resultado se arma con lo guardado, sin recalcular.

## Catálogo — `GET /cuentas/{c}/catalogo/...`

Código: `app/services/catalogo.py`. Se lee de la base, no de la caché, con `selectinload` y un número fijo de consultas por petición. Todas las rutas, incluidas `ver-carrera`, `ver-ocupacion` y `ver-institucion`, exigen la sección CATALOGO: si está cerrada responden 409 con su mensaje, y una cuenta de otra audiencia recibe 404.

| Ruta | Respuesta |
|---|---|
| `carreras?buscar=&familia=&riasec=` | `[{codigo, nombre, familia{codigo, nombre}, riasec[0–3]}]`, por código |
| `carreras/{codigo}` | Lo anterior más `descripcion`, `duracion`, `ocupaciones[]`, `instituciones[]` e `ingreso{promedio_mensual, fuente, anio, rangos[]}` (o `null`) |
| `ocupaciones?buscar=&riasec=` | `[{codigo, codigo_onet, titulo, riasec[1–3]}]`, solo las ocupaciones con `codigo` |
| `ocupaciones/{codigo}` | Lo anterior más `descripcion`, `lugares_trabajo`, `conocimientos`, `habilidades` y `carreras[]` |
| `instituciones?buscar=&tipo=&ubicacion=` | `[{codigo, nombre, tipo, ubicacion{codigo, nombre}}]` |
| `instituciones/{codigo}` | Lo anterior más `descripcion`, `pagina_web` y `carreras[]` |

- `buscar`: subcadena sobre `busqueda`, sin mayúsculas ni tildes; `%`, `_` y `\` se buscan literalmente.
- `riasec`: de 1 a 3 letras distintas (acepta minúsculas). Coincide si `codigo_riasec` las contiene seguidas y en ese orden: `RI` encuentra RI, RIS y ARI, pero no IR ni RSI. Una letra inválida, repetida o más de 3 → 422, y lo que no tiene código no coincide nunca.
- `familia` y `ubicacion` filtran por código; un `tipo` fuera de `TipoInstitucion` → 422. Un código inexistente en el detalle → 404.

## Invariantes

1. A lo sumo un resultado vigente por cuenta y aplicación, y solo con todas sus actividades COMPLETADA y revelado.
2. Mientras hay resultado vigente, sus respuestas no cambian.
3. Reiniciar solo anula; nunca borra resultados, eventos ni desbloqueos.
4. Las respuestas de una cuenta nunca afectan a otra.
5. Toda coincidencia guardada tiene r ≥ 0 y el ajuste que corresponde a los umbrales.
