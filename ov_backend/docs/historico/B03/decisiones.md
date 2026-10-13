# Decisiones de la spec en curso

<!-- Spec en curso: B03 (docs/specs/B03.md). -->

- **Modelo (0006):** se quita `item_registro.nucleo`; el seguimiento va por orden de ítem y ya no hay ítem núcleo (lo pidió el usuario al revisar el plan). Se quitó también del glosario y de «Pregunta de seguimiento» en `requisitos.md`.
- **Modelo (0006):** el origen `RESPALDO_LONGITUD` pasa a `EXTENSION_MINIMA`, con el vocabulario de RNF-15. Cubre toda evaluación resuelta en código, sin LLM: ítems sin criterios, mínimo como criterio y respaldo con error (solo este lleva `error`).
- `evaluacion_respuesta.requiere_atencion` queda sin uso (siempre `false`), sin migración.
- Pruebas adaptadas: `test_carga_registros.py` ya no comprueba `nucleo`.
- F2 y F3 van en un solo commit: el protocolo nuevo del evaluador (`evaluar_entrega`/`evaluar_seguimiento`) rompe las acciones anteriores, y un commit solo con F2 no quedaba en verde.
- Se retiran `POST /acciones/registro/enviar`, la edición de una respuesta en FINAL y el `orden` de `responder-seguimiento`. HU-008 (consultar la consolidada, ver qué se puede ampliar y editar) queda para B04.
- `entregar` sin texto en un obligatorio responde 409 con `items_faltantes`; entregar dos veces, 409. Después de entregar, `guardar-borrador` solo admite el borrador de la pregunta pendiente.
- Las respuestas de `entregar`, `responder-seguimiento` y `continuar-sin-responder` son el registro completo (como el GET) más eventos y desbloqueos; `items_por_ampliar` aparece solo en la respuesta que cierra.
- Un ítem en FINAL puede volver a PENDIENTE_SEGUIMIENTO solo mientras el registro sigue abierto (la segunda pregunta pasa al siguiente ítem por orden).
- Clasificación vigente de un ítem = la de su última `evaluacion_respuesta`. La genérica respondida registra una evaluación EXTENSION_MINIMA NO_EVALUADA sin `error` (o, en un ítem que solo tiene mínimo, según el largo de la concatenación).
- En los ítems con criterios, `min_caracteres` solo es el respaldo cuando falla el LLM; en los ítems sin criterios es el único criterio y se evalúa en código.
- RESPUESTA_REFLEXIVA se registra al cerrar, una por respuesta adecuada al inicio o `ampliada`; REGISTRO_ADECUADO se registra al cerrar si ningún ítem quedó POCO_DESARROLLADA (NO_EVALUADA no lo impide). REGISTRO_ADECUADO aparece en `eventos_registrados` como todo evento: es una señal del registro completo, no la clasificación de un ítem.
- `REGISTRO_ADECUADO` se agregó a `MODELOS_REFERENCIA` (referencia: actividad), porque hasta ahora no se emitía.
- `[falla]` en cualquier ítem hace fallar toda la llamada de entrega del evaluador falso, porque es una sola llamada.
- «La orientadora actúa solo sobre su salón» no aplica en B03: ninguna acción de registro es de la orientadora (recibe 404, igual que el apoderado).
- Pruebas adaptadas:
  - `test_eleccion_registro.py`: la validación se hace al guardar y el mínimo al entregar; se quitó el caso de edición en FINAL;
  - `test_borradores_registro.py`;
  - el tramo HU-006 de `test_ruta_corta.py`;
  - `soporte_ruta.completar`/`responder_registro` (borradores y entregar; si ya está cerrado, repite con completar-actividad);
  - los eventos al cerrar T1 en `test_bloqueo_actividades.py` y en `soporte_escenarios_ruta.py`;
  - los conteos de `test_semilla_ruta.py`;
  - los estados de `test_consultas_dominio.py`;
  - los avisos del exportador;
  - el downgrade de `test_migraciones.py`, que ahora falla primero por la condición REGISTRO_ADECUADO;
  - se reescribieron las pruebas unitarias del evaluador y de Gemini.
