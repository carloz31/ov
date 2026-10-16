# Decisiones de la spec en curso

<!-- Spec en curso: B12 · Familia: ruta del apoderado, conversaciones y cartas. -->

- **Fuera de B12: notificaciones asíncronas.** Quedan pendientes las notificaciones al apoderado que dependen de acciones del estudiante (HU-067, aviso cuando el hijo habilita una conversación) y el aviso inmediato al estudiante de su entrada de diario cuando es el apoderado quien marca la conversación (la entrada se crea, pero el estudiante solo la ve al consultar su diario).
- **Modelo (0018):** `conversacion` gana `orden` (único), `pregunta_estudiante`, `pregunta_apoderado` (nula = la del estudiante), `preguntas_guia` (JSON) y `mensaje_diferencias`, y pierde `tema` (nadie lo exponía; la migración lo pasa a `pregunta_estudiante`). `conversacion_vinculo` cambia `conversado`/`conversado_en` por las respuestas de cada rol con su fecha, `conversada_en` y `conversada_por`. `TipoObjetivo.CONVERSACION`, solo de audiencia ESTUDIANTE. Lo pide la spec B12.
- **Downgrade de 0018:** se detiene si hay reglas CONVERSACION o respuestas de conversación, como 0017 con los planes, para no perder datos.
- **Pregunta del diario tras conversar:** se llama `t-diario-tras-conversar` para que las preguntas existentes conserven su orden por código.
- **Pruebas adaptadas por los datos nuevos de `ruta`:** conteos de la semilla, `visible_apoderado` del RIASEC (ahora verdadero), listas de preguntas desbloqueables del diario (aparece la nueva, bloqueada), soporte que crea conversaciones y la prueba de 0002 (excluye las tablas de conversación, que cambian de columnas).
- **Dominio `conversaciones`:** cartas, respuestas, marca y consulta pasan de `services/comunidad.py` y `api/acciones.py` a `services/conversaciones.py` y `api/conversaciones.py`, con sus esquemas; las rutas no cambian.
- **Pruebas adaptadas (autorizadas por la spec):** la de acciones compartidas (`test_r33`) responde ambos antes de marcar y espera el evento solo en el estudiante; la de carta por cuenta abre antes la ruta del apoderado; la de sección del apoderado comprueba ahora que su carta exige CONVERSACIONES.
- **Texto vacío** en `responder-conversacion`: 422 (también solo espacios). La carta conserva su validación anterior.
- **Avance de una ruta:** requeridas completadas de los bloques de la audiencia de la cuenta (para el estudiante incluye la Ciudad). Se reutilizará en B14.
- **Diploma:** todos los bloques de la audiencia con COMPLETA_BLOQUE; su fecha es la del último. «Ruta completa» para ver resultados del hijo es tener el diploma.
- **Resultados del hijo:** `GET /cuentas/{c}/familia/resultados`, lista de `ResultadoPublico` (la forma del estudiante) por instrumento y aplicación; un visible sin resultado revelado no aparece.
