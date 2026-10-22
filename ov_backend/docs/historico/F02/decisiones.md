# Decisiones de la spec en curso

<!-- Spec en curso: F02. -->

- **Referencias: `actividad` de origen.** ELECCION y TEXTO llevan el código de la actividad del ítem fuente en todo estado (también SIN_DATO), para que el aviso «por desarrollar» la nombre. Se adaptaron las pruebas de referencias y el escenario que comparaban la respuesta completa (autorizado por la spec).
- **Fixture de la consulta con ítems por ampliar:** se toma `t-valores` cerrado (`registro-t-valores-por-ampliar`) en lugar de `t-expectativas`, para no alterar el recorrido de los fixtures que siguen; además cubre el podio en la consulta.
- **Consulta del registro en el mismo reproductor.** Un registro cerrado sin pregunta pendiente se abre solo con sus consignas, precargado con la consolidada; los textos cambiados viven en memoria (tras cerrar no hay borradores) y «Entregar cambios» envía solo los que difieren. Se retiró la prueba «un registro cerrado abre en el fin», reemplazada por las de la consulta (autorizado por la spec).
- **Salida compartida con el fin.** El botón «Volver al mapa» de `FinishScreen` pasó a `VolverAlMapa` (mismo marcado) para usarlo en la consulta; se adaptó la prueba de cierre que buscaba el botón en el árbol sin montar.
- **Entre consignas de la consulta, «Continuar»** (no se guarda nada en el servidor hasta «Entregar cambios»).

## Ajuste posterior: elección que retoma una anterior (lote M)

- **Modelo: elección con lista y referencia (migración 0022).** `item_registro` permite `lista_id` y `referencia_id` a la vez; toda elección tiene lista y la referencia solo marca lo elegido la vez pasada. Se retira la elección «solo por referencia» y la regla «referencia sin otra». Por qué: el estudiante debe poder mantener o cambiar su elección anterior con la lista original completa (incluida «Aún no lo sé»).
- **Validación del cargador:** la referencia de un ítem debe ser una ELECCION de su actividad sobre la misma lista, y su máximo y su «otra» deben admitir todo lo que pudo elegirse en la fuente, para que lo anterior llegue marcado.
- **`t-eco-ruta`** pasa a «Tu ruta, hoy», de 1 a 2 rutas con «otra», y su consigna y criterio sirven si mantiene o cambia.
- **Pruebas adaptadas:** `test_eleccion_referencia.py`, la carga de registros, el contrato del exportador y el escenario reflejan la regla nueva (autorizado por el usuario).

## Ajuste posterior: consulta en modo lectura y elección editable (lote M)

- **Modelo: `evaluacion_respuesta.opciones_evaluadas` (migración 0023).** La elección que vio cada evaluación, como `texto_evaluado` con el texto; las anteriores quedan con `[]`. Por qué: editar ya puede cambiar la elección y `respuesta_registro` solo guarda la vigente; sin esto se perdería qué elección justificó cada texto (lo leerá la orientadora, B14). El downgrade se detiene si hay historial.
- **La elección se edita (cambia la decisión de B05).** `ItemEdicion` acepta `opciones`; se valida contra la lista como al entregar y, si cambia, el texto debe cambiar (422 «Si cambias tu elección, reescribe tu respuesta»). Sin `opciones`, se conserva.
- **Consulta en modo lectura.** Elección marcada y texto como cita con «Modificar»; los cambios viven en memoria y se entregan juntos. La comparación de elecciones sin orden ignora el orden.
- **Burbuja de Lumi en la consulta.** El eco y la pista van en una sola burbuja (primero el recuerdo, luego «Aquí podrías contar un poco más: {pista}»); sin ninguno, solo el avatar.

## Ajuste posterior: primera respuesta de un ítem en blanco

- **Editar da su primera respuesta a un ítem no obligatorio que quedó en blanco, sin cambio de modelo.** Se crea la fila de `respuesta_registro` (o se completa el borrador vacío) en el intento de la edición; su primera evaluación es su `clasificacion_inicial`, la elección se valida con la mínima y pasa por el seguimiento como cualquier edición. En la consulta, todo ítem tiene «Modificar»; el que quedó en blanco se lee vacío.
