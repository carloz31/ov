# Decisiones de la spec en curso

<!-- Spec en curso: B06. -->

- Modelo (aprobado en la spec): `REVELA_RESULTADO` lleva como referencia la aplicación, porque el resultado es por cuenta y aplicación. `TipoReferencia` suma RESULTADO y COINCIDENCIAS, con fuente `referencia.aplicacion_id` (CHECK `fuente_aplicacion`). No hay columna «revelado»: el resultado solo existe después de revelar.
- La migración 0009 rehace a mano los CHECK de `tipoeventouso` y `tiporeferencia` (autogenerate no los detecta) y alarga `referencia.tipo` a 13. La bajada se niega si ya hay referencias a aplicaciones o eventos de revelar.
- `t-contraste` es obligatoria en CIUDAD y tiene un solo ítem de texto con criterio CONTRASTE.
- Pruebas adaptadas por la semilla nueva (autorizado por la spec): conteos de `test_semilla_ruta`, ítems de `test_carga_registros`, estados de CIUDAD en contrato y fixtures, y el downgrade de `test_migraciones`, que ahora falla primero en 0009.
