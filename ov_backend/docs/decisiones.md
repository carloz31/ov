# Decisiones de la spec en curso

<!-- Spec en curso: B03 (docs/specs/B03.md). -->

- **Modelo (0006):** se quita `item_registro.nucleo`; el seguimiento va por orden de ítem y ya no hay ítem núcleo (lo pidió el usuario al revisar el plan). Se quitó también del glosario y de «Pregunta de seguimiento» en `requisitos.md`.
- **Modelo (0006):** el origen `RESPALDO_LONGITUD` pasa a `EXTENSION_MINIMA`, con el vocabulario de RNF-15. Cubre toda evaluación resuelta en código, sin LLM: ítems sin criterios, mínimo como criterio y respaldo con error (solo este lleva `error`).
- `evaluacion_respuesta.requiere_atencion` queda sin uso (siempre `false`), sin migración.
- Pruebas adaptadas: `test_carga_registros.py` ya no comprueba `nucleo`.
