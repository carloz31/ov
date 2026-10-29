# Decisiones de la spec en curso

## F09 · Investigaciones y entrevistas (front)

- Las descripciones de los tipos de reacción y las preguntas base 2 y 3 de `fijos.py` pasan a los textos de los bocetos 07 y 10 (eran provisionales en B13). Solo cambian datos fijos; una base cargada se actualiza recargando `fijos`.
- `guardar-guion` acepta una pregunta SUGERIDA sin código de sugerencia: la consulta del guion no devuelve el código, así que el front no podía volver a guardar un guion con sugeridas ya agregadas (422). Sin código no cambia ninguna sugerencia; el código sigue prohibido en los demás orígenes. Sin cambio de modelo.
- Pruebas adaptadas por la spec (que crea los contenidos `t_investigador*` y protege Investigaciones con su sección): `tests/local/actividades/contenidos.test.mjs` cuenta 41 contenidos, y en `tests/servidor/diario/servidor-diario-presentacion.test.mjs` la presentación de Investigaciones espera a que la sección se abra, como la de Familia.
- `PublicacionDetalle` trae `tipos_reaccion` (el mismo catálogo de `/investigaciones`): la orientadora no consulta esa ruta y sin él su detalle solo podría mostrar códigos (`APRENDI`). Sin cambio de modelo; ajuste declarado como los dos de la spec.
