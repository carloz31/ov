# Decisiones de la spec en curso

<!-- Spec en curso: F02. -->

- **Referencias: `actividad` de origen.** ELECCION y TEXTO llevan el código de la actividad del ítem fuente en todo estado (también SIN_DATO), para que el aviso «por desarrollar» la nombre. Se adaptaron las pruebas de referencias y el escenario que comparaban la respuesta completa (autorizado por la spec).
- **Fixture de la consulta con ítems por ampliar:** se toma `t-valores` cerrado (`registro-t-valores-por-ampliar`) en lugar de `t-expectativas`, para no alterar el recorrido de los fixtures que siguen; además cubre el podio en la consulta.
- **Consulta del registro en el mismo reproductor.** Un registro cerrado sin pregunta pendiente se abre solo con sus consignas, precargado con la consolidada; los textos cambiados viven en memoria (tras cerrar no hay borradores) y «Entregar cambios» envía solo los que difieren. Se retiró la prueba «un registro cerrado abre en el fin», reemplazada por las de la consulta (autorizado por la spec).
- **Salida compartida con el fin.** El botón «Volver al mapa» de `FinishScreen` pasó a `VolverAlMapa` (mismo marcado) para usarlo en la consulta; se adaptó la prueba de cierre que buscaba el botón en el árbol sin montar.
- **Entre consignas de la consulta, «Continuar»** (no se guarda nada en el servidor hasta «Entregar cambios»).
