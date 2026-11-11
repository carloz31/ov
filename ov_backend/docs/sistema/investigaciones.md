# Investigaciones y entrevistas

Un estudiante investiga una **familia de carreras** (código de 3 cifras): escribe lo que piensa hoy de ese trabajo, arma un guion, entrevista fuera de la plataforma a alguien que trabaja en ella y publica la entrevista, solo o con coautores de su salón. El salón y la orientadora la ven; los compañeros reaccionan y la marcan como favorita; la orientadora la destaca. Destacada y con `FAVORITOS_LEYENDA` favoritos, es **Leyenda** y la ven todos los salones de su colegio (HU-057 a 065, 100 y 101). Código: `app/models/investigaciones.py`, `app/services/investigaciones/`, `app/schemas/investigaciones.py` y `app/api/investigaciones.py`.

## Modelo

| Tabla | Qué guarda |
|---|---|
| `pregunta_base_guion` | Catálogo fijo (`fijos.PREGUNTAS_BASE_GUION`): las 4 preguntas que siempre van en el guion, por `orden`. |
| `tipo_reaccion` | Catálogo fijo (`fijos.TIPOS_REACCION`): `codigo`, `nombre`, `descripcion`, `pregunta`, `comentario_obligatorio`, `icono` (nombre que traduce el front) y `orden`. |
| `investigacion` | `codigo` (`INV-<uuid>`), `cuenta_id`, `familia_id`, `estado` (EN_CURSO, GUIA_LISTA, PUBLICADA), lo que pienso (`piensa_dia`, `piensa_necesita`, `piensa_duda`), `sugerencias_vigentes`, `creada_en`, `guia_lista_en` y `entrevista_id` (CHECK `publicada_con_entrevista`). Índice único parcial `investigacion_activa_unica`: una sola EN_CURSO o GUIA_LISTA por cuenta. Cancelar borra la fila con su guion y sus sugerencias. |
| `pregunta_guion` | Por `posicion`: `origen` (SUGERIDA, PROPIA) y `texto`. Las preguntas base no se copian. La duda de «lo que pienso» no entra directo al guion: solo es contexto del LLM (migración 0053, que pasó las DUDA a PROPIA). |
| `sugerencia_guion` | `codigo`, `texto`, `estado` (PENDIENTE, AGREGADA, DESCARTADA), `campo` (DIA, NECESITA, DUDA: de qué texto de «lo que pienso» sale) y `motivo` (del LLM; no se expone). Agregada o descartada no vuelve a ofrecerse. |
| `entrevista` | `codigo` (`ENT-<uuid>`), `familia_id`, `titulo`, `profesional`, `dedicacion` (a qué se dedica la persona entrevistada), `duracion` (texto), `enlace` (YouTube), `resumen`, `busqueda` (título, profesional, dedicación y familia sin tildes), `estado` (PUBLICADA, RETIRADA, ELIMINADA), `fecha_hora`, `editada_en`, `destacada_en`, `destacada_por` y `leyenda_en` (CHECK `leyenda_destacada`). |
| `entrevista_autor` | Autores de la entrevista, todos con los mismos permisos. |
| `reaccion` | `codigo`, `entrevista_id`, `cuenta_id`, `tipo_reaccion_id` (nulo = comentario de la orientadora), `comentario`, `creada_en`, `editada_en` y `eliminada_en` (borrado lógico). Índice único parcial `reaccion_estudiante_unica`: una reacción activa con tipo por estudiante y entrevista. |
| `reporte` | `codigo`, `cuenta_id`, una entrevista **o** una reacción (CHECK `un_contenido`), `motivo` (OFENSIVO, VIDEO, DATOS_PRIVADOS, OTRO), `detalle`, `estado` (PENDIENTE, DESCARTADO, RESUELTO) y `fecha_hora`. Uno por persona y contenido. |

- `favorito` admite `ENTREVISTA`, con su evento MARCA_FAVORITO_ENTREVISTA.
- Eventos: INICIA_INVESTIGACION y TERMINA_GUION (referencia: la familia, porque la investigación se puede borrar); PUBLICA_ENTREVISTA, EDITA_ENTREVISTA, VISTA_ENTREVISTA, MARCA_FAVORITO_ENTREVISTA y REACCIONA_ENTREVISTA (referencia: la entrevista); ENTREVISTA_DESTACADA y ENTREVISTA_LEYENDA, que se registran en cada autor.
- Las tablas de investigación, guion, sugerencias, entrevistas, reacciones y reportes son estado (`TABLAS_DE_ESTADO`).
- La sección INVESTIGACIONES (`fijos.SECCIONES`) se abre por una regla de la ruta.

## Visibilidad

- **Colegio:** nada de otro colegio es visible. La entrevista no guarda colegio: es el de sus autores (autor → salón → colegio, `leyenda_de_su_colegio`). Quien no ve una entrevista recibe 404 al abrirla, marcarla, reaccionar o reportarla, y por eso sus reacciones, comentarios y favoritos son siempre de su colegio; `lista_reacciones` no filtra por salón, así que en una Leyenda muestra los de todos los salones del colegio. Un cambio de colegio de un salón con entrevistas tendría que decidir qué pasa con lo ya registrado (hoy no hay ruta para hacerlo).
- **Estudiante:** ve las entrevistas publicadas con algún autor de su salón, las Leyendas de su colegio y las suyas. RETIRADA y ELIMINADA no salen en ningún listado ni conteo, y su detalle responde 404 a todos, autores incluidos.
- **Orientadora:** ve las publicadas de sus salones (`orientadora_salon`) y, al final de su tabla, las Leyendas de otros salones de los colegios de esos salones (`de_sus_salones: false`; no hay modelo de promoción, y el front pone la etiqueta). Solo actúa (destacar, comentar, eliminar, moderar) sobre las de sus salones.
- **Leyenda:** destacada y con `FAVORITOS_LEYENDA` (3) favoritos de cuentas estudiante. Solo marca favorita quien la ve, y nunca un autor. Se evalúa al marcar un favorito y al destacar, en cualquier orden. Se pierde solo al quitar el destacado, retirar o eliminar; desmarcar favoritos no la quita. ENTREVISTA_DESTACADA y ENTREVISTA_LEYENDA se registran una sola vez por autor y entrevista: volver a destacarla o a hacerla Leyenda no los repite. El sello `t-ins-leyenda` (ENTREVISTA_LEYENDA) es un desbloqueo y no se pierde si la entrevista deja de ser Leyenda; llega a la campana de cada autor como notificación DESBLOQUEO sin ver. El destacado, la Leyenda y la primera reacción de cada cuenta notifican también a cada autor (ENTREVISTA_DESTACADA, ENTREVISTA_LEYENDA y REACCION_ENTREVISTA, una sola vez como sus eventos; ver «Notificaciones» en `motor.md`).

## Consultas (GET)

Todas las del estudiante exigen la sección INVESTIGACIONES abierta (409 con su mensaje); otra audiencia recibe 404. Las de la orientadora responden 404 a cualquier otro rol.

| Ruta | Devuelve |
|---|---|
| `/cuentas/{c}/investigaciones` | `en_curso` (estado, familia, `lo_que_pienso`, preguntas, sugerencias pendientes con su `campo`, `sugerencias_vigentes`), `aliados` (`misma_familia`, `otras`: compañeros del salón con guía lista, con nivel, vitrina y familia), `preguntas_base`, `tipos_reaccion`, `favoritos_leyenda` y `conteos` (`salon`, `leyendas`, `mias`). |
| `/cuentas/{c}/entrevistas?vista=SALON\|LEYENDAS\|MIAS\|SALON_Y_LEYENDAS&buscar&favoritas&no_vistas&destacadas&orden=RECIENTES\|REACCIONADAS&familia&limite&desde` | `{total, favoritos_leyenda, items}`. `SALON_Y_LEYENDAS` junta las dos sin repetir y sirve al detalle de una carrera. `familia` (código de 3 cifras) aplica a todas las vistas; un código desconocido no trae ninguna. Tarjeta: ficha (con `dedicacion`), `familia` (`codigo`, `nombre`, `area_codigo`), autores (nivel nulo si la cuenta está inactiva), `destacada`, `leyenda`, `reacciones` (solo de estudiantes), `favoritos`, `favorita`, `vista`, `propia`; en MIAS, `reacciones_por_tipo`. Los filtros no aplican a MIAS. Páginas de 20 (máximo 100). |
| `/cuentas/{c}/entrevistas/{e}` | La tarjeta, más `enlace`, `editada_en`, `reacciones_por_tipo`, `favoritos_leyenda`, `reportada_por_mi` y `lista_reacciones`: reacciones y comentarios de la orientadora (`tipo` nulo), la propia primero y luego de la más reciente a la más antigua, cada una con `reportada_por_mi`. |
| `/cuentas/{c}/publicaciones?salon&estado=SIN_DESTACAR\|DESTACADA\|LEYENDA&con_reportes&buscar&limite&desde` | Tabla de la orientadora: autores con su salón, familia, dedicación, fecha, `reacciones`, `favoritos`, `estado`, `reportes_pendientes` (de la entrevista), `comentarios_reportados` (reacciones con reportes pendientes) y `de_sus_salones`. `con_reportes` filtra por reportes pendientes de la entrevista o de sus reacciones. `buscar` mira título, profesional, dedicación, familia y nombre de los autores. |
| `/cuentas/{c}/publicaciones/{e}` | Ficha, `estado`, favoritos y reacciones por tipo, autores con su salón y `lo_que_pensaba`, `reportes` pendientes de la entrevista y `reacciones` con sus reportes pendientes (las reportadas primero) y el salón de su autor (`autor.salon`), y el catálogo `tipos_reaccion` para nombrar los tipos. Nunca dice quién reportó. |

## Acciones

| Acción | Valida | Efecto |
|---|---|---|
| `/acciones/guardar-lo-que-pienso` | Familia del catálogo (`familia`, su código); tres textos no vacíos (422). | Sin investigación activa la crea en EN_CURSO (INICIA_INVESTIGACION); con ella, cambia familia y textos sin cambiar el estado, y si algo cambió descarta las sugerencias pendientes. |
| `/acciones/pedir-sugerencias-guion` | Investigación activa (409). | Ver «Sugerencias». Responde `{estado: LISTAS\|SIN_SUGERENCIAS\|ERROR, sugerencias}`. |
| `/acciones/guardar-guion` | Una SUGERIDA que se agrega lleva el código de una sugerencia no descartada (sin código, es una que ya estaba en el guion y no cambia ninguna sugerencia); las descartadas, pendientes (404). `terminar` exige una pregunta PROPIA (422; una sugerida aceptada no cuenta), y también la exige editar una guía lista. | Reemplaza las preguntas; las sugerencias citadas pasan a AGREGADA o DESCARTADA. `terminar`: GUIA_LISTA; TERMINA_GUION la primera vez. |
| `/acciones/cancelar-investigacion` | Investigación activa. | La borra con su guion y sus sugerencias. |
| `/acciones/publicar-entrevista` | Guía lista (409); enlace de YouTube, `permiso` verdadero y campos no vacíos (422); coautores sin repetir, existentes y de su colegio (404, sin revelar el nombre), estudiantes del mismo salón con guía lista sobre la misma familia (409). | Crea la entrevista (`ENT-<uuid>`); la investigación de cada autor pasa a PUBLICADA; PUBLICA_ENTREVISTA en cada autor (`RespuestaAgrupada`). |
| `/acciones/editar-entrevista` | Autor de la entrevista publicada (404). Solo la ficha: los autores son los de la publicación y no cambian (un campo de más, como `coautores_nuevos`, responde 422). | Cambia la ficha (también el enlace); EDITA_ENTREVISTA en quien edita. |
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

- Una llamada a Claude Haiku (`app.state.cliente_llm`, `claude-haiku-5-5`, esfuerzo `low`, el cliente del registro) por versión de «lo que pienso», entre dos transacciones, como en planes. Prompt de sistema `guion-v4-haiku` (`prompt_guion_v4_haiku.py`, con `VERSION` y `HASH`; pide hasta `MAXIMO_CARACTERES_PROMPT_GUION`, 160). Mensaje con etiquetas (`armar_mensaje`): `<familia>`, `<base>` (las preguntas base del catálogo, una por línea), `<dia>`, `<necesita>` y `<duda>`; los textos son datos, nunca instrucciones.
- Salida con esquema JSON (`salida_json`, `output_config.format`): `{dia|necesita|duda: {motivo, pregunta: texto | null}}`, sin propiedades adicionales. A lo más una sugerencia por campo; el modelo puede no proponer para alguno.
- **Texto pobre:** si los tres campos juntos no llegan a `MIN_CARACTERES_RESPALDO`, no se llama y responde SIN_SUGERENCIAS.
- **Fallo, tiempo agotado (el del cliente), parada distinta de `end_turn` o salida fuera del esquema:** ERROR, sin guardar nada, así que reintentar vuelve a llamar. Lo mismo si la investigación cambió o se canceló mientras se esperaba. Nunca se guarda ni se propaga el mensaje de una excepción externa.
- **Filtro, por campo** (`filtrar_preguntas`): con texto, termina en «?», un solo «¿», no supera `MAXIMO_CARACTERES_PREGUNTA_GUION` (200) y no repite, en `clave_pregunta` (sin tildes ni signos), ninguna base, pregunta del guion, sugerencia anterior ni otra de la misma respuesta. La que no pasa se descarta; las demás se guardan con su `campo` y su `motivo`, y `sugerencias_vigentes` queda verdadero: reabrir el paso no vuelve a llamar. Sin ninguna útil, SIN_SUGERENCIAS.
- Una sugerencia que repite una base con otras palabras es un defecto conocido y aceptado: el filtro solo la descarta si coincide en `clave_pregunta`.
- Pruebas: `ClientePrueba` (`tests/soporte/soporte_llm.py`) responde, sin cola, una pregunta por campo con texto; `salida_guion(...)` arma una salida a medida.

## Notas

- La migración 0038 vació `entrevista` y `entrevista_autor`: sus filas anteriores solo tenían resumen y ninguna pantalla las publicaba.
- La migración 0046 pasó de ocupación a familia y vació investigaciones, entrevistas, reacciones, reportes, favoritos de entrevista y sus eventos y notificaciones, por decisión del usuario; los desbloqueos ya obtenidos se conservan.
- `scripts/sembrar_entrevistas_ejemplo.py` agrega entrevistas de ejemplo (`DATO DE PRUEBA`) a una base ya cargada; no es parte de ningún conjunto.
- Las descripciones cortas de `fijos.TIPOS_REACCION` y las preguntas base son las de los bocetos de F09.
- En `ruta`, `t-investigador` (abre la sección) y `t-investigador-cierre` (registro con LO_QUE_PIENSO, abierto por PUBLICA_ENTREVISTA) son opcionales, para no cambiar el avance ni el cierre de la Ciudad.
- Los filtros Favoritas, No vistas y Destacadas no aplican a la vista MIAS. La búsqueda de la orientadora por nombre de autor usa minúsculas, pero no quita tildes.
- Los códigos públicos (`INV-`, `ENT-`, `SUG-`, `REA-`, `REP-`) llevan un `uuid4`. El exportador de fixtures los fija con un contador.
