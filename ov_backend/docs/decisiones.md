# Decisiones de la spec en curso

- Modelo del testimonio: salen `enlace` y `anios_experiencia`; entran `video_id`, `inicio`, `fin` y `contexto` (migración 0045). El documento del ajuste pide el video por tramo y una línea de contexto en lugar de los años.
- La validación del video, del tramo y del contexto va en la carga (`datos/cargador.py`), sin restricciones CHECK: el documento la pide allí y los datos solo entran por la carga.
- `fin <= inicio` se rechaza solo cuando `fin` no es nulo: la mayoría de los testimonios no tiene fin (pedido del usuario).
- `types/servidor.ts` usa `video_id` y no `videoId`, aunque el documento lo escriba así: el contrato copia el esquema en `snake_case`. `videoId` solo se usa en la vista.
- Una voz cuya regla pide caso y actividad (`t-testimonio-2`) es de caso: nunca llegan los dos orígenes.
