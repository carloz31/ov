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
