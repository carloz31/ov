# Decisiones de la spec en curso

- **Modelo (Ajuste colegio):** tabla `colegio` y `salon.colegio_id` obligatorio, porque el sistema debe separar datos por colegio y nada estaba por encima del salón. Aprobado por el usuario en el plan.
- **Migración 0047:** los salones existentes quedan en `col-piloto`; en una base sin salones no se inserta nada, para no chocar con la carga de datos.
- **`Salon.codigo` sigue único en toda la base:** es el identificador que expone la API; dos colegios pueden repetir `nombre`, no `codigo`.
- **La entrevista y la orientadora no guardan colegio:** se deriva de autor → salón → colegio y de `orientadora_salon`, para no duplicar un dato que puede contradecirse.
- **Pruebas adaptadas (autorizadas por el plan):** `test_clasificacion_tablas.py` clasifica `colegio` como catálogo y `test_politica_y_contrasenas.py` da un colegio a sus salones; solo por la tabla nueva.
- **Pruebas adaptadas (no listadas en el plan, misma causa):** los inventarios de tablas de `test_migraciones.py` (conteo y bajada a 0041), `test_restricciones_estado.py`, `test_integridad_catalogos.py` y `test_semilla_ruta.py` pasan a 94 tablas e incluyen `colegio`. Sin cambiar qué comprueban.
