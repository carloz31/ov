# Ajuste planes-desbloqueo-completo

## Contexto

En el piloto los estudiantes no llegarán a b3-2, b3-8 ni b4-5, así que las secciones Conocimiento, Realidad y Pasos del plan nunca se abrirían. Las cuatro secciones deben abrirse junto con la sección PLANES (b0-4). La plataforma ya está desplegada con datos reales, así que, según la 7.6 de `despliegue/README.md`, el cambio va como **migración de datos** sobre las tablas de definición. Por decisión del usuario, no se tocan tablas de estado ni hay script de reevaluación: a quienes ya completaron b0-4 se les pedirá que completen otra misión.

## Hallazgos (puntos 1, 2, 5, 6 y 8)

**1. Reevaluación: se cumple.** `registrar_eventos` (`app/services/motor/reglas.py:141`) toma como candidatas todas las reglas que tienen una condición del **tipo** de algún evento nuevo, sin filtrar por actividad:
```python
candidatas = {regla.id: regla for tipo in tipos_nuevos
             for regla in datos.definiciones.reglas_evento.get(tipo, ())}
```
`reglas_evento` (`app/core/definiciones.py:70-76`) indexa por `condicion.tipo_evento` y nada más. Descarta las ya obtenidas y evalúa el resto. `contar_eventos` cuenta en todo el historial de la cuenta, así que el b0-4 completado antes del cambio cuenta. Conclusión: cualquier `COMPLETA_ACTIVIDAD` posterior abre las tres secciones.

**2. Caché: se cumple.** `actualizar.sh` (camino sin recarga): respaldo → `alembic upgrade head` (línea 106) → `systemctl restart ov-backend` (línea 112, comentada: «rehace la caché de definiciones»). El servicio es un solo proceso uvicorn con `--workers 2`; `restart` reinicia el maestro y los dos workers, y cada uno arma `CacheDefiniciones` en su `lifespan` (`app/main.py:27`). Durante los segundos entre la migración y el reinicio, el backend viejo sigue con las reglas viejas. No tiene efecto: un desbloqueo nunca se pierde, solo se crea más tarde.

**5. Cierre de b0-4: sí salen avisos seguidos.**
- La campana no cambia: `se_anuncia` solo anuncia INSIGNIA, FICHA, NIVEL y el bloque CIUDAD; SECCION_PLAN no.
- Toasts: b0-4 tiene pantalla de cierre, así que no hay toasts.
- En la pantalla de cierre, `resumirCierre` (`features/activities/lib/finishSummary.ts:85-86`) agrupa las SECCION en una fila, pero pone **una fila por cada SECCION_PLAN** («Nueva sección en tus planes: X»). Hoy, b0-4 muestra la fila de secciones (Mis planes, …) y una de plan. Con el cambio serían la fila de secciones y **cuatro filas** de plan. Lo mismo verán, en su siguiente misión, quienes ya completaron b0-4: tres filas.
- **Propuesta (requiere tu autorización, es un cambio de vista):** agrupar las SECCION_PLAN en una sola fila, como ya se hace con SECCION. Con una sección se conserva «Nueva sección en tus planes: X». Con varias: «Nuevas secciones en tus planes: Por qué la elijo, Qué tanto la conozco, Cómo lo haría realidad y Mis próximos pasos», con `enumerar` y los nombres que manda el servidor. Mismo ícono (`ClipboardList`). En local no llegan SECCION_PLAN, así que no cambia nada. Alternativa: omitir las filas de plan cuando en el mismo cierre se abre la SECCION PLANES.

**6. Textos encontrados (no se cambian sin tu confirmación):**
- `ov_frontend/src/data/content/guideTexts.ts:257`, `planesGuideSteps` (guía de Mis planes, solo api): «Cada tarjeta tiene cuatro secciones que se abren mientras avanzas en el camino: …». Queda falso. Propuesta: «Cada tarjeta tiene cuatro secciones: «Por qué la elijo», «Qué tanto la conozco», «Cómo lo haría realidad» y «Mis próximos pasos».».
- `guideTexts.ts:36`, `PLANES.adelanto` («Más adelante vas a poder guardar como plan…») habla de la sección y sigue siendo cierto.
- Los JSON de b0-4, b3-2, b3-8 y b4-5 no anuncian que abran secciones del plan. Las vistas del plan (`PlanAbierto.tsx`, `TarjetaPlan.tsx`) muestran el mensaje de bloqueo del servidor, sin texto propio. No hay más menciones.

**8. Rendimiento: sin consultas nuevas.** Las tres reglas ya eran candidatas en todo `COMPLETA_ACTIVIDAD` y siguen siéndolo, así que el número de candidatas no cambia. `contar_eventos` lee de `ContextoConsultas.contar`, con los eventos cargados una vez por cuenta y petición, no una consulta por regla. `GET /planes` lee los desbloqueos igual que antes. La prueba del punto 1 lo comprobará con el contador de consultas que ya usan las pruebas de presupuesto.

## Qué cambia

- `datos/contenido.py`: `R-PLAN-CONOCIMIENTO`, `R-PLAN-REALIDAD` y `R-PLAN-PASOS` pasan de `COMPLETA_ACTIVIDAD` b3-2, b3-8 y b4-5 a `COMPLETA_ACTIVIDAD b0-4`, con el mensaje «Completa la misión «¿Tienes una opción en mente?».». Es igual que `R-SEC-PLANES` y `R-PLAN-POR_QUE`. Así una carga desde cero queda igual que la base migrada.
- Migración `0061_planes_desbloqueo_completo.py`, solo datos, autocontenida (no importa `datos/`):
  - Códigos y mensajes escritos en el archivo; SQL con parámetros (`sa.text(...).bindparams`), porque los mensajes llevan «».
  - `upgrade`, por regla: `UPDATE condicion_desbloqueo SET id_referencia = :b04 WHERE regla_id = (regla) AND tipo_evento = 'COMPLETA_ACTIVIDAD' AND id_referencia = (id de su actividad vieja)` y `UPDATE regla_desbloqueo SET mensaje_bloqueo = :nuevo WHERE codigo = :regla`. Guarda: solo actúa si existen b0-4, b3-2, b3-8 y b4-5 (base `contenido`). En `ruta` o en una base vacía no hace nada. Es idempotente: la segunda vez la condición ya no tiene la referencia vieja.
  - `downgrade`: el inverso (de b0-4 a la actividad vieja de cada regla, y los mensajes viejos), con la misma guarda.
  - No toca `evento_uso`, `desbloqueo`, `notificacion` ni ninguna tabla de `TABLAS_DE_ESTADO`.
- Si autorizas el punto 5: `finishSummary.ts` (una fila agrupada) y su prueba en `tests/servidor/actividades`.
- Si autorizas el punto 6: `guideTexts.ts:257`.

## Qué no cambia

`datos/ruta.py` y sus pruebas (`test_planes.py`, `test_ruta_corta.py`), `R-SEC-PLANES`, `R-PLAN-POR_QUE`, el motor, los evaluadores, la campana, los toasts, la forma de las respuestas (no hay fixtures que regenerar) y el modo local.

## Pruebas nuevas (backend)

En `tests/integration/migraciones/test_migracion_planes_desbloqueo.py` (base `contenido` en 0060 con cuentas reales; si construirla en 0060 sale desproporcionado, carga `contenido` en head y aplica `downgrade` a 0060 antes, y se anota en `decisiones.md`):
1. **Reevaluación (punto 1):** cuenta con b0-4 completada en 0060, con CONOCIMIENTO, REALIDAD y PASOS `BLOQUEADA`. Se hace `upgrade` y se rehace la caché (aplicación nueva). La cuenta completa otra actividad y `GET /cuentas/{c}/planes` trae las cuatro secciones abiertas. Las consultas al completar son las mismas que sin el cambio (punto 8).
2. **Tablas de estado intactas:** los conteos de cada tabla de `TABLAS_DE_ESTADO` son iguales antes y después de `upgrade` (y de `downgrade`). Además: es idempotente, y `downgrade` deja las condiciones y los mensajes como en 0060.
3. **Cuenta sin b0-4:** después del `upgrade`, PLANES sigue bloqueada. Al completar b0-4 se abren PLANES y las cuatro secciones de la tarjeta.
4. **Cuenta con secciones ya abiertas por la regla vieja** (b3-2 completada antes): después del `upgrade` las conserva, y al completar otra actividad no se duplican desbloqueos (único por cuenta y regla) ni notificaciones.
5. **Planes intactos:** una cuenta con un plan y secciones guardadas antes del `upgrade` devuelve el mismo `GET /planes` después, salvo el `estado` de las secciones que se abren.
6. Con `ruta`, el `upgrade` no cambia nada.

Además, en `tests/integration/datos/`: con `contenido` cargado desde cero, las cuatro `R-PLAN-*` piden `COMPLETA_ACTIVIDAD b0-4`. **Punto 7:** ninguna prueba de `contenido` afirma hoy el desbloqueo progresivo (grep: solo `ruta` lo hace). Si alguna aparece al correr la suite, se actualiza; las de `ruta` no se tocan.

## Fases

1. **F1 · backend:** rama `ajuste/planes-desbloqueo-completo` desde `main` (hoy igual a `deploy`). Spec `ov_backend/docs/specs/ajuste-planes-desbloqueo-completo.md`, `contenido.py`, migración 0061 y pruebas. `pruebas` corre `tests/integration/datos`, `migraciones`, `planes` y `escenarios`; `alembic heads` debe dar uno solo. Commit.
2. **F2 · front** (solo lo que autorices de los puntos 5 y 6): `pruebas` corre `tests/local/actividades`, `tests/servidor/actividades`, `tests/servidor/registro` y `npm run test:servidor`. Commit.
3. **F3 · cierre:** suite completa de ambos lados (`pytest -n auto -q`; `npm test`, `build`, `lint` y `check:estructura`). `decisiones.md`, `docs/sistema/planes.md` (en `contenido`, las cuatro secciones se abren con b0-4, migración 0061) y, si cambió el front, `ov_frontend/AGENTS.md`. Commit. Sin push.

## Publicar y volver atrás (en la EC2, por SSH)

**Publicar:**
1. Integrar la rama a `main` y luego: `git checkout deploy && git merge main && git push`.
2. El workflow corre las pruebas y `actualizar.sh`, que respalda (`/home/ov/respaldos/ov-AAAAMMDD-HHMMSS.dump`; si falla, sale con código 5 y no migra), aplica la 0061 y reinicia los workers.
3. Comprobar: `cd /opt/ov/ov_backend && sudo -u ov .venv/bin/alembic current` debe dar `0061 (head)`. Con un estudiante de prueba (E99): completar b0-4, o cualquier misión si ya la tenía, y ver las cuatro secciones abiertas en Mis planes.

**Volver atrás** (en este orden, porque si se publica el revert sin bajar antes la base, `alembic upgrade head` falla: no encuentra la revisión 0061):
1. En la EC2: `cd /opt/ov/ov_backend && sudo -u ov .venv/bin/alembic downgrade 0060 && sudo systemctl restart ov-backend`. Las condiciones y los mensajes vuelven; los desbloqueos ya creados se quedan (son permanentes).
2. En local: `git revert` del merge en `deploy` y push. El despliegue respalda, encuentra la base en 0060 y reinicia.
3. Último recurso, si la base quedó mal: restaurar el respaldo previo con `pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" /home/ov/respaldos/<el de antes del despliegue>.dump`, con el backend detenido. Se pierde lo que se escribió después del respaldo.

## Respuestas del usuario a los puntos 5 y 6

- Punto 5: se agrupan las SECCION_PLAN del cierre en una sola fila.
- Punto 6: se cambia `planesGuideSteps` al texto propuesto.
