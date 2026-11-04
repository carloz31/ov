# Decisiones de la spec en curso

## Ajuste carga-casos

Decisiones del usuario (documento del ajuste):

- **Los seis casos se abren con la Ciudad** (COMPLETA_ACTIVIDAD b1-3), con una regla por caso; las reglas propias se agregan después.
- **Testimonios de prueba `tc1-1`…`tc6-2`**, dos por caso; los reales se cargarán sobre esos mismos códigos en el ajuste de testimonios.
- **Duración de cada caso:** el límite inferior del rango del catálogo de casos.
- **El incendio forestal y sus ocupaciones fuera del catálogo salen de la plataforma:** sin ocupaciones ocultas; todo caso y testimonio nombra ocupaciones del catálogo. `ruta` pasa a jugar `hidden-plaza`.
- **Una sola petición al entrar al caso** trae las ocupaciones de su directorio (título y hoja de vida): `ocupaciones-caso`.
- **Las necesidades no se cargan en el servidor;** `scripts/verificar_contenido_front.py` mantiene sincronizados `CONFIGURACION_CASOS` y los JSON.
- **El modo local se mantiene congelado** con `forestFireCase.ts` y los slugs del catálogo del front.
- **Correcciones al aprobar el plan:** las pruebas y el exportador que resuelven casos de `ruta` usan necesidades de `hidden-plaza` (fallido 5, superado 7, máximo 8); `t-testimonio-1..4` pasan a necesidades de `hidden-plaza`; el script exige en `contenido` una actividad por caso; las 24 imágenes faltantes son aviso y pendiente; el material de referencia del formato se retiró en el cierre, después de pasar el formato a `docs/sistema/integracion.md`.

Decisiones de la implementación:

- **Modelo (aprobado por el documento del ajuste):** migración 0044 retira `actividad_dimension` (los casos ya no tienen tipos RIASEC; su lugar lo toma la `tematica` del JSON) y `ocupacion.en_catalogo` (solo se cargan las filas con `en_catalogo = 1` de la curaduría). Cambian los códigos de ocupación: una base cargada antes se recarga con `--vaciar`.
- **Código de ocupación = O*NET.** Se retiran `fijos.OCUPACIONES`, `codigo_ocupacion`, el prefijo `onet-` y el parámetro `ocultas`/`slugs` de `datos/catalogo.py`. Sin ocultas, las cinco del incendio y la demo (bombero, médico internista, acomodador, guardia, cocinero) dejan de existir.
- **La escala de `t-caso`/`t-caso-2` cambia en F1, no en F2:** sin el bombero (33-2011.00) las pruebas de casos de `ruta` no pueden quedar en verde con el incendio, así que el cambio a `hidden-plaza` (6 de 8) y las ocupaciones de `t-testimonio-1..4` (necesidades de `hidden-plaza`) se adelantan a la fase del modelo.
- **Pruebas adaptadas (autorizado):** las de dimensiones de casos se retiran o pasan a mirar la escala; las que resolvían `t-caso` usan necesidades de `hidden-plaza` (fallido 5, superado 7, máximo 8); las que nombraban slugs usan el O*NET. La de carga atómica con «referencia ausente» del catálogo pasa a quitar la ocupación de un testimonio (19-3091.00), porque la comprobación de slugs de `fijos.OCUPACIONES` ya no existe.
- **`ocupaciones-caso`:** esquema propio `OcupacionCaso` (no reutiliza `OcupacionDetalle`, que trae familias y carreras); el tope de 30 está en `MAXIMO_OCUPACIONES_CASO` (`app/core/parametros.py`); los códigos repetidos se piden una vez.
- **JSON de caso:** los seis llegaron en `ov_frontend/src/data/cases/`; se movieron a `src/data/cases/plataforma/`, donde los espera la spec.
- **Casos en `contenido` (F2):** `c1`…`c6` van al final de la ciudad con temática C (`TEMATICAS_ACTIVIDADES`, nuevo en `contenido`) y `CONFIGURACION_CASOS` propio; las reglas `R-c1`…`R-c6` repiten la condición de `R-CIUDAD` (COMPLETA_ACTIVIDAD b1-3). Salen `t-caso`, `t-caso-2`, `R-t-caso*` y `R-t-testimonio-*` de `contenido`.
- **Testimonios de prueba (F2):** la «primera necesidad del último problema que tenga otra ocupación» se lee como la primera necesidad, recorriendo los problemas desde el último, distinta de la del primer problema. N de «Voz de prueba N» y «Persona de prueba N» corre de 1 a 12; los enlaces alternan los dos de `ruta`.
- **`verificar_contenido_front.py` (F2):** las comprobaciones de casos corren en `contenido` y `ruta`; las de actividades (JSON, desafíos, ítems, ecos) siguen solo en `contenido`, como antes. Las imágenes se buscan en `public/` y `public/images/` (donde están las de la Central hoy).
- **JSON de actividad `c1`…`c6` (F2):** mismo esqueleto que `t_caso.json`, cada uno en la posición de mapa de uno de los seis casos de `cityCases` (`data/content/adventure.ts`), los lugares de la Central en la imagen de la ciudad.
- **Mensaje de bloqueo de los casos (F3):** como `R-c<n>` pide lo mismo que `R-CIUDAD`, mientras la ciudad está cerrada el motor responde con el mensaje del bloque («…para llegar a la ciudad.»); el de cada caso queda cargado para cuando tenga reglas propias. La prueba lo fija así.
- **Fixture `ruta-ocupaciones-caso` (F3):** el directorio de `hidden-plaza` en el orden de su JSON (`DIRECTORIO_T_CASO` del exportador).
- **Front, el caso por prop (F4):** la vista y sus componentes reciben el caso (`CasoJugable`) por prop, con el incendio (`CASO_LOCAL` de `forestFireCaseLogic.ts`) como valor por omisión; no por contexto, porque los hooks que usa el arnés de `tests/local` no pueden usar contexto en local. Las funciones de la lógica reciben el caso como último parámetro opcional, así `tests/local/casos` no cambia.
- **`casoDesdeJson` va en `features/cases/lib/`** (es lógica, no dato); el registro de los JSON, en `src/data/cases/casos.ts`. Cada profesional se identifica por su `onet`; el cargo es el título del servidor (en api, `getOccupation` no encuentra un O*NET y cae al nombre).
- **Respaldo de imágenes (F4):** el fondo de una fase usa dos capas de `background-image` (la de la fase y `exploration-case-background.png`); la imagen de la intro cambia a la de respaldo con `onError`.
- **Temática en el cierre (F4):** donde estaba «Tipo del caso: …» se muestra «Temática: <tematica>»; en local, sin temática, no se muestra nada (antes tampoco había tipos).
- **Ciudad en api (F4):** se quita solo el marcador de demostración del incendio (`forest-fire` sale de la plataforma). Los otros cinco de `cityCases` siguen, porque una prueba existente los exige; `c1` va en el lugar del incendio y `c2`…`c6` en posiciones provisionales (en `pendientes-interfaz.md`).
- **Slugs en api (F4):** colección, catálogo, investigaciones y testimonios usan los códigos del servidor; `travelerResources` (`paramedic`), `catalogDetails` y `research.ts` nombran slugs solo en el modo local. No hay nada que registrar en `pendientes-interfaz.md`.
- **Pruebas del front adaptadas (F4):** `tests/servidor/casos` (escala 6/8, sin `textoTiposCaso`, `CONFIGURACION_CASOS` contra los JSON, `ocupaciones-caso`), las que nombraban slugs u ocupaciones de fixtures `ruta-*` (mochila, testimonios, catálogo, resultados, investigaciones, mapa de batallas) y el conteo de `tests/local/actividades/contenidos.test.mjs` (seis JSON más).
