# Decisiones de la spec en curso

<!-- Spec en curso: B02. -->

- Migración `0005`: `ItemRegistro` pasa a pertenecer a una actividad (`actividad_id`, `orden`) y se retira `actividad_item_registro`; si un ítem estaba en varias, conserva la de menor id. Un ítem sin actividad impide migrar, porque no habría dónde ponerlo.
- La longitud mínima no es un tipo de criterio (lo pidió el usuario): es `ItemRegistro.min_caracteres`, ahora nulo. Si es nulo, el respaldo por longitud usa `MIN_CARACTERES_RESPALDO` (40, provisional).
- Los criterios anteriores a `0005` toman el tipo EJEMPLO y la repregunta genérica de su ítem, porque no había otra fuente.
- `VAGA` → `POCO_DESARROLLADA` también en el esquema de salida del LLM, en el prompt (`v3`) y en la acción simple `/acciones/responder-registro`, para tener un solo nombre. La marca `[vaga]` del evaluador falso no cambia.
- Las listas comunes (`RUTAS_DESPUES_COLEGIO`, `DIFICULTADES`) y las repreguntas por tipo en `fijos.py` son textos provisionales, aprobados así por el usuario, hasta la carga real.
- El downgrade de `0005` se niega si hay eventos o condiciones `REGISTRO_ADECUADO` o ítems con elección, para no perder datos. Por eso la prueba de downgrade con `ruta` falla ahora en `0005`; se adaptó.
- `t-valores` no tiene regla: está disponible al abrirse T1.
- `soporte_estado_desarrollo` usa un ítem sembrado de la ruta en vez de crear uno suelto, porque ahora todo ítem necesita actividad.
- `t-valores` es opcional (`requerida: False`): si fuera requerida, T1 dejaría de cerrarse al completar `t-expectativas` y cambiaría lo que ya prueba la ruta (B00–B01).
