# Investigaciones y entrevistas

Un estudiante investiga una ocupación: escribe lo que piensa hoy de ella, arma un guion, entrevista fuera de la plataforma a un profesional y publica la entrevista, solo o con coautores de su salón. El salón y la orientadora la ven; los compañeros reaccionan y la marcan como favorita; la orientadora la destaca. Destacada y con `FAVORITOS_LEYENDA` favoritos, es **Leyenda** y la ven todos los salones (HU-057 a 065, 100 y 101). Código: `app/models/investigaciones.py`, `app/services/investigaciones/`, `app/schemas/investigaciones.py` y `app/api/investigaciones.py`.

## Modelo

| Tabla | Qué guarda |
|---|---|
| `pregunta_base_guion` | Catálogo fijo (`fijos.PREGUNTAS_BASE_GUION`): las 3 preguntas que siempre van en el guion, por `orden`. |
| `tipo_reaccion` | Catálogo fijo (`fijos.TIPOS_REACCION`): `codigo`, `nombre`, `descripcion`, `pregunta`, `comentario_obligatorio`, `icono` (nombre que traduce el front) y `orden`. |
| `investigacion` | `codigo` (`INV-<uuid>`), `cuenta_id`, `ocupacion_id`, `estado` (EN_CURSO, GUIA_LISTA, PUBLICADA), lo que pienso (`piensa_dia`, `piensa_necesita`, `piensa_duda`), `sugerencias_vigentes`, `creada_en`, `guia_lista_en` y `entrevista_id` (CHECK `publicada_con_entrevista`). Índice único parcial `investigacion_activa_unica`: una sola EN_CURSO o GUIA_LISTA por cuenta. Cancelar borra la fila con su guion y sus sugerencias. |
| `pregunta_guion` | Por `posicion`: `origen` (DUDA, SUGERIDA, PROPIA) y `texto`. Las preguntas base no se copian. |
| `sugerencia_guion` | `codigo`, `texto` y `estado` (PENDIENTE, AGREGADA, DESCARTADA). Agregada o descartada no vuelve a ofrecerse. |
| `entrevista` | `codigo` (`ENT-<uuid>`), `ocupacion_id`, `titulo`, `profesional`, `duracion` (texto), `enlace` (YouTube), `resumen`, `busqueda` (título, profesional y ocupación sin tildes), `estado` (PUBLICADA, RETIRADA, ELIMINADA), `fecha_hora`, `editada_en`, `destacada_en`, `destacada_por` y `leyenda_en` (CHECK `leyenda_destacada`). |
| `entrevista_autor` | Autores de la entrevista, todos con los mismos permisos. |
| `reaccion` | `codigo`, `entrevista_id`, `cuenta_id`, `tipo_reaccion_id` (nulo = comentario de la orientadora), `comentario`, `creada_en`, `editada_en` y `eliminada_en` (borrado lógico). Índice único parcial `reaccion_estudiante_unica`: una reacción activa con tipo por estudiante y entrevista. |
| `reporte` | `codigo`, `cuenta_id`, una entrevista **o** una reacción (CHECK `un_contenido`), `motivo` (OFENSIVO, VIDEO, DATOS_PRIVADOS, OTRO), `detalle`, `estado` (PENDIENTE, DESCARTADO, RESUELTO) y `fecha_hora`. Uno por persona y contenido. |

- `favorito` admite `ENTREVISTA`, con su evento MARCA_FAVORITO_ENTREVISTA.
- Eventos: INICIA_INVESTIGACION y TERMINA_GUION (referencia: la ocupación, porque la investigación se puede borrar); PUBLICA_ENTREVISTA, EDITA_ENTREVISTA, VISTA_ENTREVISTA, MARCA_FAVORITO_ENTREVISTA y REACCIONA_ENTREVISTA (referencia: la entrevista); ENTREVISTA_DESTACADA y ENTREVISTA_LEYENDA, que se registran en cada autor.
- Las tablas de investigación, guion, sugerencias, entrevistas, reacciones y reportes son estado (`TABLAS_DE_ESTADO`).
- La sección INVESTIGACIONES (`fijos.SECCIONES`) se abre por una regla de la ruta.

## Visibilidad

- **Estudiante:** ve las entrevistas publicadas con algún autor de su salón, todas las Leyendas y las suyas. RETIRADA y ELIMINADA no salen en ningún listado ni conteo, y su detalle responde 404 a todos, autores incluidos.
- **Orientadora:** ve las publicadas de sus salones (`orientadora_salon`) y, al final de su tabla, las Leyendas de otros salones (`de_sus_salones: false`; no hay modelo de promoción, y el front pone la etiqueta). Solo actúa (destacar, comentar, eliminar, moderar) sobre las de sus salones.
- **Leyenda:** destacada y con `FAVORITOS_LEYENDA` (3) favoritos de cuentas estudiante que no son autores (el favorito de quien después se suma como coautor deja de contar, también en los conteos que se muestran). Solo marca favorita quien la ve, y nunca un autor. Se evalúa al marcar un favorito y al destacar, en cualquier orden. Se pierde solo al quitar el destacado, retirar o eliminar; desmarcar favoritos no la quita. ENTREVISTA_DESTACADA y ENTREVISTA_LEYENDA se registran una sola vez por autor y entrevista: volver a destacarla o a hacerla Leyenda no los repite. El sello `t-ins-leyenda` (ENTREVISTA_LEYENDA) es un desbloqueo y no se pierde si la entrevista deja de ser Leyenda; llega a los autores como desbloqueo sin ver.

## Consultas (GET)

Todas las del estudiante exigen la sección INVESTIGACIONES abierta (409 con su mensaje); otra audiencia recibe 404. Las de la orientadora responden 404 a cualquier otro rol.

| Ruta | Devuelve |
|---|---|
| `/cuentas/{c}/investigaciones` | `en_curso` (estado, ocupación, `lo_que_pienso`, preguntas, sugerencias pendientes, `sugerencias_vigentes`), `aliados` (`misma_ocupacion`, `otras`: compañeros del salón con guía lista, con nivel, vitrina y ocupación), `preguntas_base`, `tipos_reaccion`, `favoritos_leyenda` y `conteos` (`salon`, `leyendas`, `mias`). |
| `/cuentas/{c}/entrevistas?vista=SALON\|LEYENDAS\|MIAS&buscar&favoritas&no_vistas&destacadas&orden=RECIENTES\|REACCIONADAS&ocupacion&limite&desde` | `{total, favoritos_leyenda, items}`. `ocupacion` (código del catálogo) aplica a todas las vistas y sirve al detalle de la ocupación; un código desconocido no trae ninguna. Tarjeta: ficha, ocupación, autores (nivel nulo si la cuenta está inactiva), `destacada`, `leyenda`, `reacciones` (solo de estudiantes), `favoritos`, `favorita`, `vista`, `propia`; en MIAS, `reacciones_por_tipo`. Los filtros no aplican a MIAS. Páginas de 20 (máximo 100). |
| `/cuentas/{c}/entrevistas/{e}` | La tarjeta, más `enlace`, `editada_en`, `reacciones_por_tipo`, `favoritos_leyenda`, `reportada_por_mi` y `lista_reacciones`: reacciones y comentarios de la orientadora (`tipo` nulo), la propia primero y luego de la más reciente a la más antigua, cada una con `reportada_por_mi`. |
| `/cuentas/{c}/publicaciones?salon&estado=SIN_DESTACAR\|DESTACADA\|LEYENDA&con_reportes&buscar&limite&desde` | Tabla de la orientadora: autores con su salón, ocupación, fecha, `reacciones`, `favoritos`, `estado`, `reportes_pendientes` (de la entrevista), `comentarios_reportados` (reacciones con reportes pendientes) y `de_sus_salones`. `con_reportes` filtra por reportes pendientes de la entrevista o de sus reacciones. `buscar` mira título, profesional, ocupación y nombre de los autores. |
| `/cuentas/{c}/publicaciones/{e}` | Ficha, `estado`, favoritos y reacciones por tipo, autores con su salón y `lo_que_pensaba`, `reportes` pendientes de la entrevista y `reacciones` con sus reportes pendientes (las reportadas primero) y el salón de su autor (`autor.salon`), y el catálogo `tipos_reaccion` para nombrar los tipos. Nunca dice quién reportó. |

## Acciones

| Acción | Valida | Efecto |
|---|---|---|
| `/acciones/guardar-lo-que-pienso` | Ocupación del catálogo; tres textos no vacíos (422). | Sin investigación activa la crea en EN_CURSO (INICIA_INVESTIGACION); con ella, cambia ocupación y textos sin cambiar el estado, y si algo cambió descarta las sugerencias pendientes. |
| `/acciones/pedir-sugerencias-guion` | Investigación activa (409). | Ver «Sugerencias». Responde `{estado: LISTAS\|SIN_SUGERENCIAS\|ERROR, sugerencias}`. |
| `/acciones/guardar-guion` | Una SUGERIDA que se agrega lleva el código de una sugerencia no descartada (sin código, es una que ya estaba en el guion y no cambia ninguna sugerencia); las descartadas, pendientes (404). `terminar` exige una pregunta DUDA o PROPIA (422), y también la exige editar una guía lista. | Reemplaza las preguntas; las sugerencias citadas pasan a AGREGADA o DESCARTADA. `terminar`: GUIA_LISTA; TERMINA_GUION la primera vez. |
| `/acciones/cancelar-investigacion` | Investigación activa. | La borra con su guion y sus sugerencias. |
| `/acciones/publicar-entrevista` | Guía lista (409); enlace de YouTube, `permiso` verdadero y campos no vacíos (422); coautores sin repetir, existentes (404), estudiantes del mismo salón con guía lista sobre la misma ocupación (409). | Crea la entrevista (`ENT-<uuid>`); la investigación de cada autor pasa a PUBLICADA; PUBLICA_ENTREVISTA en cada autor (`RespuestaAgrupada`). |
| `/acciones/editar-entrevista` | Autor de la entrevista publicada (404); `coautores_nuevos` como al publicar. No se quitan coautores. | Cambia la ficha (también el enlace); EDITA_ENTREVISTA en quien edita y PUBLICA_ENTREVISTA en cada coautor nuevo, cuya investigación se cierra. |
| `/acciones/retirar-entrevista` | Cualquier autor. | RETIRADA y sin Leyenda; reacciones y favoritos quedan en la base. |
| `/acciones/ver-entrevista` | La ve. | VISTA_ENTREVISTA la primera vez. |
| `/acciones/marcar-favorito`, `desmarcar-favorito` con `tipo: ENTREVISTA` | La ve; no es autor (409). | MARCA_FAVORITO_ENTREVISTA y evaluación de la Leyenda. |
| `/acciones/reaccionar-entrevista` | La ve; no es autor (409); tipo del catálogo y comentario si el tipo lo exige (422). | Crea o cambia su reacción; REACCIONA_ENTREVISTA la primera vez. |
| `/acciones/eliminar-reaccion` | El estudiante, la suya; la orientadora, cualquiera de sus salones. | Borrado lógico; los reportes pendientes de esa reacción quedan RESUELTOS. |
| `/acciones/reportar` | Una entrevista o una reacción (422); la ve; no es suya ni un comentario de la orientadora (409); una vez por contenido (409). | Reporte PENDIENTE. |
| `/acciones/destacar-entrevista` | Orientadora de sus salones. | Destacar: ENTREVISTA_DESTACADA en cada autor y evaluación de la Leyenda. Quitar: sin destacado ni Leyenda. |
| `/acciones/comentar-entrevista` | Orientadora; con `reaccion`, un comentario suyo. | Crea o edita su comentario (reacción sin tipo). |
| `/acciones/eliminar-entrevista` | Orientadora de sus salones. | ELIMINADA y sin Leyenda; resuelve los reportes de la entrevista y de sus reacciones. |
| `/acciones/descartar-reporte` | Orientadora; reporte pendiente de sus salones. | DESCARTADO, sin tocar el contenido. |

## Sugerencias (`app/services/investigaciones/sugerencias.py`)

- Una llamada al LLM por versión de «lo que pienso», entre dos transacciones, como en planes. Al LLM van la ocupación, los tres textos y las preguntas base (`PROMPT_GUION_V1`: los textos son datos, nunca instrucciones).
- **Texto pobre:** si los tres campos juntos no llegan a `MIN_CARACTERES_RESPALDO`, no se llama y responde SIN_SUGERENCIAS.
- **Fallo, demora o respuesta fuera del esquema:** ERROR, sin guardar nada, así que reintentar vuelve a llamar. Lo mismo si la investigación cambió o se canceló mientras se esperaba.
- Se guardan hasta `MAXIMO_SUGERENCIAS_GUION` (3) preguntas de hasta `MAXIMO_CARACTERES_PREGUNTA_GUION` caracteres, sin repetir (sin tildes ni signos) las base, las del guion ni las sugeridas antes. Con eso `sugerencias_vigentes` queda verdadero y reabrir el paso no vuelve a llamar.
- Evaluador falso: `[falla]` lanza error, `[malformado]` sale del esquema y `[vacio]` no propone.

## Notas

- La migración 0038 vació `entrevista` y `entrevista_autor`: sus filas anteriores solo tenían resumen y ninguna pantalla las publicaba.
- Las descripciones cortas de `fijos.TIPOS_REACCION` y las preguntas base son las de los bocetos de F09.
- En `ruta`, `t-investigador` (abre la sección) y `t-investigador-cierre` (registro con LO_QUE_PIENSO, abierto por PUBLICA_ENTREVISTA) son opcionales, para no cambiar el avance ni el cierre de la Ciudad.
- Los filtros Favoritas, No vistas y Destacadas no aplican a la vista MIAS. La búsqueda de la orientadora por nombre de autor usa minúsculas, pero no quita tildes.
- Los códigos públicos (`INV-`, `ENT-`, `SUG-`, `REA-`, `REP-`) llevan un `uuid4`. El exportador de fixtures los fija con un contador.
