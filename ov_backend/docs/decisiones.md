# Decisiones de la spec en curso

## Ajuste carga-casos

- **Modelo (aprobado por el documento del ajuste):** migración 0044 retira `actividad_dimension` (los casos ya no tienen tipos RIASEC; su lugar lo toma la `tematica` del JSON) y `ocupacion.en_catalogo` (solo se cargan las filas con `en_catalogo = 1` de la curaduría). Cambian los códigos de ocupación: una base cargada antes se recarga con `--vaciar`.
- **Código de ocupación = O*NET.** Se retiran `fijos.OCUPACIONES`, `codigo_ocupacion`, el prefijo `onet-` y el parámetro `ocultas`/`slugs` de `datos/catalogo.py`. Sin ocultas, las cinco del incendio y la demo (bombero, médico internista, acomodador, guardia, cocinero) dejan de existir.
- **La escala de `t-caso`/`t-caso-2` cambia en F1, no en F2:** sin el bombero (33-2011.00) las pruebas de casos de `ruta` no pueden quedar en verde con el incendio, así que el cambio a `hidden-plaza` (6 de 8) y las ocupaciones de `t-testimonio-1..4` (necesidades de `hidden-plaza`) se adelantan a la fase del modelo.
- **Pruebas adaptadas (autorizado):** las de dimensiones de casos se retiran o pasan a mirar la escala; las que resolvían `t-caso` usan necesidades de `hidden-plaza` (fallido 5, superado 7, máximo 8); las que nombraban slugs usan el O*NET. La de carga atómica con «referencia ausente» del catálogo pasa a quitar la ocupación de un testimonio (19-3091.00), porque la comprobación de slugs de `fijos.OCUPACIONES` ya no existe.
- **`ocupaciones-caso`:** esquema propio `OcupacionCaso` (no reutiliza `OcupacionDetalle`, que trae familias y carreras); el tope de 30 está en `MAXIMO_OCUPACIONES_CASO` (`app/core/parametros.py`); los códigos repetidos se piden una vez.
- **JSON de caso:** los seis llegaron en `ov_frontend/src/data/cases/`; se movieron a `src/data/cases/plataforma/`, donde los espera la spec.
