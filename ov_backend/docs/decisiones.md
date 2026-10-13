# Decisiones de la spec en curso

<!-- Spec en curso: B01 (docs/specs/B01.md). -->

- **Modelo (aprobado en la spec):** `Seccion` (con audiencia), `Ficha.audiencia`, `TipoObjetivo.SECCION`, `ReglaDesbloqueo.mensaje_bloqueo` NOT NULL, `Actividad.requerida/duracion_estimada_min/descripcion`, `Rol.ORIENTADORA`, `Salon`, `OrientadoraSalon.es_principal`, `Cuenta.salon_id/correo/contrasena_hash/activa`, `VinculoFamiliar.parentesco/es_activo`. Se retira `TipoObjetivo.CONVERSACIONES` e `id_objetivo` pasa a NOT NULL. Migración `0004`.
- **Migración 0004 con datos:** las reglas existentes toman `nombre` como `mensaje_bloqueo`; las de CONVERSACIONES pasan a una sección CONVERSACIONES del apoderado creada al vuelo, para no perderlas. El downgrade falla si hay orientadoras o reglas SECCION.
- **Fases unidas:** las fases 1–3 de la spec (modelo, consultas y guardias) van en un solo commit, porque las mismas expectativas de las pruebas cambian por las tres y adaptarlas tres veces no aporta.
- **Mensaje del 409:** es el `mensaje_bloqueo` de la primera regla (por código) del objetivo; una actividad con su bloque bloqueado usa el del bloque. Sin reglas que mostrar (otra audiencia), se mantiene el mensaje genérico.
- **`bloqueo` en listados:** lista de motivos (una por regla alternativa) con solo las condiciones no cumplidas; `null` si está disponible.
- **Orientadora:** ningún objetivo le corresponde; sus listas salen vacías y completar actividades responde 409, como el apoderado con actividades del estudiante.
- **Conversaciones:** `completar-conversacion` exige la sección CONVERSACIONES del apoderado del vínculo, marque quien marque. Se retira `GET /cuentas/{c}/conversaciones`; su estado está en `/secciones/CONVERSACIONES`.
- **Lectura del diario:** `GET /diario/preguntas` responde 409 con DIARIO bloqueada; el apoderado sigue recibiendo `[]`.
- **Siguiente actividad (HU-011) en las pruebas:** el ayudante `siguiente` de `test_ruta_corta.py` salta las opcionales.
- **Pruebas adaptadas (autorizado por la spec):** las que escriben diario, check-in o carta abren antes la sección con el recorrido; las de CONVERSACIONES pasan a secciones de prueba; conteos de tablas, cuentas y reglas; contrato con los campos nuevos y `/secciones`; las de apoderado aceptan su ficha `t-ficha-apo` y su sección; `test_carta_se_actualiza_sin_repetir_evento` cuenta solo ESCRIBE_CARTA; la prueba de 0003 migra hasta 0003 y el downgrade fallido pasa a ser el de 0004.
