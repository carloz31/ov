# Decisiones de la spec en curso

## B13 · Investigaciones y entrevistas

- **Modelo nuevo** (aprobado en el plan): `investigacion`, `pregunta_guion`, `sugerencia_guion`, `pregunta_base_guion`, `tipo_reaccion`, `reaccion` y `reporte`; `entrevista` gana ficha, ocupación, estado, destacado y Leyenda. `Entrevista` y `EntrevistaAutor` pasan de `progreso.py` a `investigaciones.py`, porque son del mismo dominio.
- La migración 0038 vacía `entrevista` y `entrevista_autor`. Sus filas solo tenían resumen y ninguna pantalla las publicaba, así que no hay forma de completar las columnas obligatorias.
- Los eventos de investigación (INICIA_INVESTIGACION, TERMINA_GUION) apuntan a la ocupación y no a la investigación: cancelar borra la investigación, y su evento quedaría sin código legible.
- Las descripciones cortas de los tipos de reacción (`fijos.TIPOS_REACCION`) son provisionales: la spec no las da y las pide el pop up.
- `t-investigador` y `t-investigador-cierre` son opcionales. Agregarlas como requeridas en CIUDAD habría cambiado el avance y el cierre del bloque que ya prueba el escenario.
- La Leyenda cuenta favoritos (spec §9.1), no reacciones como decían `plan-iteraciones.md` y el glosario de `requisitos.md`. `MINIMO_REACCIONES_LEYENDA` pasa a ser `FAVORITOS_LEYENDA = 3` (parámetro).
- `publicar-entrevista` cambia de cuerpo: deja `autores` y pasa a la `cuenta` del actor con `coautores`. Por eso el guardia de acceso deja de leer `autores`, y se adaptan las pruebas de `actividades/` y `acceso/` que usaban el cuerpo anterior (autorizado por la spec, que define la publicación). `comunidad.py` se retira y su lógica pasa a `investigaciones/acciones.py`.
- Los filtros Favoritas, No vistas y Destacadas no aplican a la vista MIAS (spec §3.1); la búsqueda sí.
- La orientadora busca también por nombre de autor (spec §4.1). Su comparación usa minúsculas pero no quita tildes: los nombres no tienen columna `busqueda`.
- La orientadora ve el detalle de una Leyenda de otro salón (la tabla la lista con «Ver entrevista»), pero solo actúa sobre las de sus salones.
- Al borrar una reacción, la quite el estudiante o la orientadora, sus reportes pendientes quedan RESUELTOS: el contenido ya no existe.
- Nadie reporta su propia entrevista ni su propia reacción (409).
- Las reacciones del detalle van todas, sin paginar en el servidor; el «Mostrar más» de 10 en 10 lo hace el front.
