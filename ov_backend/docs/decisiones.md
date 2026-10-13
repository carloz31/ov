# Decisiones de la spec en curso

<!-- Spec en curso: B06. -->

- Modelo (aprobado en la spec): `REVELA_RESULTADO` lleva como referencia la aplicación, porque el resultado es por cuenta y aplicación. `TipoReferencia` suma RESULTADO y COINCIDENCIAS, con fuente `referencia.aplicacion_id` (CHECK `fuente_aplicacion`). No hay columna «revelado»: el resultado solo existe después de revelar.
- La migración 0009 rehace a mano los CHECK de `tipoeventouso` y `tiporeferencia` (autogenerate no los detecta) y alarga `referencia.tipo` a 13. La bajada se niega si ya hay referencias a aplicaciones o eventos de revelar.
- `t-contraste` es obligatoria en CIUDAD y tiene un solo ítem de texto con criterio CONTRASTE.
- Pruebas adaptadas por la semilla nueva (autorizado por la spec): conteos de `test_semilla_ruta`, ítems de `test_carga_registros`, estados de CIUDAD en contrato y fixtures, y el downgrade de `test_migraciones`, que ahora falla primero en 0009.
- El avance de una aplicación queda COMPLETADO con todas sus actividades completadas, haya o no resultado; `hay_resultado_vigente` distingue lo revelado. Así el front sabe cuándo ofrecer revelar sin un campo nuevo.
- Las respuestas de un cuestionario siguen editables hasta revelar: se fijan con el resultado vigente, como antes.
- Revelar responde 409 con `items_faltantes` = las actividades de la aplicación sin completar (se reutiliza el campo de error existente).
- Pruebas adaptadas a revelar explícito (autorizado por la spec): `ciclo` revela, y las que leían `resultados_generados` o esperaban el resultado al completar revelan ahora.
