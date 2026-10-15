# Decisiones de la spec en curso

<!-- Spec en curso: B11 · Planes de carrera (`docs/specs/B11.md`). -->

## Modelo (fase 1)

- Modelo nuevo `app/models/planes.py` y migración `0017`: catálogo `seccion_tarjeta`, `referencia_rubro` y `referencia_camino`; nueve tablas de estado de la tarjeta; `cuenta.opcion_inicial_id`, `institucion.gestion` e `institucion_carrera.duracion_ciclos`. Lo pide la tarjeta v4 (`B11-respuesta.md` §2) y lo aprobó el usuario.
- `referencia_rubro` y `referencia_camino` como tablas aparte para no agregar columnas de un solo uso a `opcion_lista`, que es genérica.
- `institucion.gestion` (PUBLICA, PRIVADA, nula): la spec la usa para precargar la pensión y para el prompt, y el modelo no la tenía. Aprobada por el usuario en la fase 1.
- Las preguntas de conocimiento y el texto de su duda van como listas comunes (`PREGUNTAS_CONOCIMIENTO`, `DUDAS_CONOCIMIENTO`) con los códigos de `PreguntaConocimiento`: la app no lee `datos/` y así no hace falta otra tabla. El cargador exige que los códigos coincidan.
- `duda_tarjeta` usa un único `(tarjeta_id, pregunta)` en vez de un índice parcial: un CHECK obliga a que `pregunta` solo exista con origen PREGUNTA y los nulos no chocan, así que equivale al parcial en SQLite y PostgreSQL.
- `duda_tarjeta.cerrada_por_paso_id` cierra un ciclo con `paso_tarjeta.duda_id`: la clave lleva `use_alter` y la migración la crea al final.
- El reinicio de desarrollo también pone `cuenta.opcion_inicial_id` en nulo (es estado en una tabla de catálogo). La prueba de reinicio se adaptó: compara `cuenta` sin esa columna.
- La migración 0017 no baja si hay eventos, reglas o referencias de planes; la prueba de downgrade se adaptó a ese primer tope, como en lotes anteriores.

## Datos (fase 1)

- `ruta` agrega `t-privada` (UNIVERSIDAD, PRIVADA), con un nombre sin «universidad» para no alterar la búsqueda por nombre del catálogo; el listado completo de instituciones de `test_catalogo.py` se adaptó. `t-uni` y `t-ffaa` quedan como PUBLICA.
- `t-comparar` y `t-proyecto` entran en la fase 1 porque la regla de la sección PASOS depende de `t-comparar`; sus reglas con evaluador y sus referencias entran en la fase 4, con los evaluadores. Mientras tanto, se abren con T2.
- Las aserciones que enumeran los desbloqueos de `t-inicio`, los ítems cargados y los estados de actividades de T2 se adaptaron a las filas nuevas de la spec.
