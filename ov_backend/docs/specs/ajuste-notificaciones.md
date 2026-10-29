# Ajuste · notificaciones

## Contexto

Hoy no hay notificaciones: hay un **lote de avisos** sobre `desbloqueo.visto` (el front pide `GET /desbloqueos?solo_no_vistos=true`, muestra toasts y al final marca todo con `POST /desbloqueos/marcar-vistos`). La campana en api solo dice «Ver N avisos pendientes», lo cerrado con pantalla de cierre se anuncia dos veces (cierre + toast) y no existe nada entre cuentas. El ajuste crea una tabla `notificacion` como única verdad de «visto», con cinco tipos, y una campana que es historial. Las observaciones del usuario (`ajuste-notificaciones.md`) ya deciden criterio, tipos, modelo, endpoints y fases; este plan solo fija dónde se hace y lo que el texto no define.

No hay spec en curso → spec nueva `ov_backend/docs/specs/ajuste-notificaciones.md` (este plan). Las decisiones del ajuste van como viñetas en `ov_backend/docs/decisiones.md`.

Rama: `ajuste/notificaciones`, desde `main`. Sin push salvo que se pida.

## Qué cambia (hoy → pasará a)

- `app/services/motor/reglas.py::registrar_eventos`: hoy inserta desbloqueos con `visto=False` → además crea, en la misma transacción y en lote, una `notificacion` DESBLOQUEO por cada nuevo desbloqueo de INSIGNIA, FICHA, NIVEL o BLOQUE `CIUDAD` (el filtro de `avisosServidor` pasa al backend). La audiencia ya la filtra `objetivo_corresponde_a_cuenta` antes de crear el desbloqueo.
- `app/services/comun.py::responder_con_eventos` / `responder_varias_cuentas`: hoy devuelven `nuevos_desbloqueos` → además `nuevas_notificaciones` (las creadas en la acción para cada cuenta). Se leen de la sesión (`sesion.info['notificaciones_nuevas']` por cuenta, que llena `notificaciones.crear`), para incluir las de conversaciones y las del motor sin consultar de nuevo.
- `app/services/conversaciones.py::responder_conversacion`: hoy solo guarda → crea RESPUESTA_CONVERSACION para el otro del vínculo (`_otro`).
- `app/services/investigaciones/acciones.py::registrar_en_autores`: hoy registra el evento una vez por autor → donde registra (evento nuevo), crea también ENTREVISTA_DESTACADA o ENTREVISTA_LEYENDA para ese autor. Cubre destacar (`orientadora.destacar_entrevista`) y Leyenda (`evaluar_leyenda`, que también llama favoritos). Así no se repite al quitar y volver a destacar.
- `investigaciones/acciones.py::reaccionar`: cuando `primera`, crea REACCION_ENTREVISTA para cada autor (`detalle` = nombre del tipo de reacción). Quien reacciona nunca es autor (ya se rechaza).
- `app/api/cuentas.py`: se retiran `POST /desbloqueos/marcar-vistos` (y `marcar_desbloqueos_vistos`, `DesbloqueosMarcados`) y el parámetro `solo_no_vistos`. `DesbloqueoLegible.visto` sale de la respuesta (la columna queda sin uso).
- Front: el lote de avisos (`store/servidor/avisos.ts`, `operaciones.marcarVistos`, `ServerNoveltiesMenu`) se reemplaza por `store/servidor/notificaciones.ts` + toasts con visto individual + campana con lista y modal.

## Qué no cambia

El motor (reglas, evaluadores, disponibilidad), la tabla `desbloqueo` (la columna `visto` queda), `GET /desbloqueos` sin filtro, `porRevelar` y el revelado del mapa, las presentaciones y diálogos de Lumi, las pantallas de cierre (solo marcan vistas), el modo local (rama local de `NoveltiesMenu`, `useNovelties().ordered`, `markUnlocksSeen`), los eventos de investigaciones (REACCIONA_ENTREVISTA, ENTREVISTA_DESTACADA/LEYENDA siguen igual), los comentarios de la orientadora, `datos/fijos.py` y `datos/ruta.py`.

## Modelo de datos (aprobado por las observaciones; se sigue `/cambio-modelo`)

- `app/models/enums.py`: `TipoNotificacion` (DESBLOQUEO, RESPUESTA_CONVERSACION, ENTREVISTA_DESTACADA, ENTREVISTA_LEYENDA, REACCION_ENTREVISTA).
- `app/models/motor.py`: `Notificacion` (`notificacion`): `id`, `codigo` único (`NOT-<uuid hex>`), `cuenta_id` FK, `tipo`, `referencia` str, `nombre` str, `detalle` str nullable, `creada_en`, `vista_en` nullable; índice `(cuenta_id, vista_en)`.
- Migración `0039_notificaciones` autogenerada y revisada; un solo head.
- `TABLAS_DE_ESTADO` (`app/services/desarrollo.py`) suma `notificacion`.
- **Lo que el texto no define, opción más simple:**
  - DESBLOQUEO: `referencia` = código del objetivo, `nombre` = nombre del objetivo, `detalle` = tipo de objetivo (`INSIGNIA`/`FICHA`/`NIVEL`/`BLOQUE`), que el front necesita para ícono y destino.
  - RESPUESTA_CONVERSACION: `referencia` = código de la conversación, `nombre` = su título; para el apoderado, `detalle` = código del hijo, que el ítem expone como `estudiante` (y `detalle` sale nulo). Para el hijo, `detalle` nulo.
  - ENTREVISTA_*: `referencia` = código de la entrevista, `nombre` = su título.

## Backend

- `app/services/notificaciones.py`: `crear(sesion, cuenta, tipo, referencia, nombre, detalle=None)` (más `crear_varias` en lote para el motor), `listar(sesion, cuenta, limite, desde)` y `marcar_vistas(sesion, cuenta, codigos)`. Fecha de creación = la fecha de la acción.
- `app/schemas/notificaciones.py`: `NotificacionPublica {codigo, tipo, referencia, nombre, detalle, creada_en, vista, estudiante?}`, `PaginaNotificaciones {total, no_vistas, items}`, `MarcarVistasEntrada {codigos: list[str] = []}`, `NotificacionesMarcadas {marcadas}`.
- `app/api/notificaciones.py` (registrado en `router.py`, guardia por defecto):
  - `GET /cuentas/{c}/notificaciones?limite=20&desde=0` (tope 50), de la más reciente a la más antigua (`creada_en desc, id desc`).
  - `POST /cuentas/{c}/notificaciones/marcar-vistas` → `{marcadas}`; lista vacía = todas; idempotente; ajenos/inexistentes ignorados; sin eventos.
- `RespuestaAccion.nuevas_notificaciones: list[NotificacionPublica] = []` (incluido en `campos()`); `RespuestaAgrupada` lo lleva por cuenta.
- La orientadora no recibe notificaciones (nunca es autora ni del vínculo; DESBLOQUEO solo si desbloquea INSIGNIA/FICHA/NIVEL/CIUDAD, que no le corresponden).
- Pruebas nuevas en `tests/integration/notificaciones/`: DESBLOQUEO por objetivo (se crea para insignia/ficha/nivel/ciudad y no para actividad/sección/testimonio/pregunta), apoderado (ficha), RESPUESTA_CONVERSACION en ambos sentidos (y no para quien responde; `estudiante` para el apoderado), ENTREVISTA_DESTACADA (no al quitar ni al re-destacar), ENTREVISTA_LEYENDA, REACCION_ENTREVISTA (solo la primera reacción; detalle), paginado y tope, marcado parcial/total/ajeno, `nuevas_notificaciones` con y sin desbloqueo; acceso (404 sobre otra cuenta; entra solo en `test_cobertura_rutas`).
- Pruebas que se retiran o adaptan (autorizado): las de `marcar-vistos` y `solo_no_vistos`, y las de contrato/fixtures que fijan `visto` en `DesbloqueoLegible` o la forma de `RespuestaAccion`.
- Docs: `motor.md` (sección «Notificaciones», reemplaza «Sin avisos» de Conversaciones; documenta qué significan `referencia`, `nombre` y `detalle` en cada tipo) e `integracion.md` (endpoints, `nuevas_notificaciones`, retiro de marcar-vistos).

## Datos

Sin cambios en `fijos.py` ni `ruta.py`. Se regeneran los fixtures del front (cambian `RespuestaAccion` y `DesbloqueoLegible`; se agrega el de notificaciones si el exportador lo pide para pruebas).

## Frontend (solo api; local congelado)

- `types/servidor.ts`: `NotificacionPublica`, `PaginaNotificaciones`, `nuevas_notificaciones` en `RespuestaAccion`; se quita `DesbloqueosMarcados` y `visto` de `DesbloqueoLegible`.
- `services/api/notificaciones.ts`: `obtenerNotificaciones(cuenta, desde)`, `marcarNotificacionesVistas(cuenta, codigos)`; en `services/api/cuentas.ts` se retiran `obtenerDesbloqueosNoVistos` y `marcarDesbloqueosVistos`.
- `store/servidor/notificaciones.ts` (reemplaza `avisos.ts`): almacén propio con `useSyncExternalStore`, por cuenta de sesión (`consultarCuentaSesion`), para que sirva al estudiante y al apoderado sin mezclar almacenes: `lista`, `total`, `noVistas`, `colaToast`, `cargando`, `error`, `masPaginas`; `cargarNotificaciones()`, `cargarMas()`, `incorporarNotificaciones(items, {conCierre})`, `marcarVistas(codigos)` (optimista; si falla, el código queda en `pendientesMarcar` y se reintenta en el siguiente marcado o en «Marcar todas»), `marcarTodas()`, `limpiar` en `prepararIngreso`. Las funciones de `porRevelar` (`encolarPorRevelar`, `quitarPorRevelar`, el revelado de `incorporarDesbloqueos`) pasan a `store/servidor/revelado.ts` sin cambio de comportamiento.
- `store/servidor/sesion.ts`: se retiran `noVistos`, `desbloqueosAccion`, `avisosMostrados`, `errorAvisos`, `procesandoAvisos`, `marcadoAvisos` y `fechasInsignias` (este último no lo lee ninguna vista; el pasaporte ya usa `obtenida_en` de logros). Se quitan `consultarNoVistos` del refresco y `operaciones.marcarVistos`.
- Flujo: `ingresar()` y el refresco de ingreso piden notificaciones; las acciones incorporan `nuevas_notificaciones`: `accionConRefresco` las mete en `colaToast` salvo con `conCierre` (lo pasan `resolverBatalla` y `resolverCaso`); `completarActividad` (estudiante) y `store/servidor/apoderado.ts` (actividad del apoderado) las incorporan sin cola. Los cierres (`useActivityFinish`, `CierreBatalla`, `FinalReportScreen` vía `useForestFireCase`, `useParentActivitySession`) reciben esos códigos y llaman `marcarVistas` al montarse.
- Toast: `useNoveltyQueue` toma `colaToast[0]` con la misma regla (mapa o Central, sin overlay ni actividad); `UnlockToast` sigue igual; cerrar/pulsar/vencer → `marcarVistas([codigo])` y sale de la cola. Se retira el aviso de error del lote en `OverlayQueue` y `openServerNotices`.
- Al volver a la vista principal: el mapa del estudiante (`missions`) y el Inicio del apoderado vuelven a pedir la primera página al montarse (sin polling).
- `lib/servidor/adaptadores.ts`: `notificacionLegible(n, portal) → {icono, titulo, descripcion, href, asincrona}` reemplaza `avisosServidor` (que se retira con `AvisoServidor`; los toasts usan el mismo objeto). Destinos: insignia → pasaporte; ficha → `/student/resources?ficha=<codigo>` (apoderado → `/parent/activities`); nivel → pasaporte#nivel; ciudad → Ciudad; conversación → `paths…conversation(codigo)` (apoderado con `?child=<estudiante>`); entrevista → `paths.student.interview(codigo)`. Títulos y descripciones de logros, los de hoy; asíncronas: «Te respondieron en Conversaciones», «Tu entrevista fue destacada», «Tu entrevista es Leyenda», «Reaccionaron a tu entrevista» con descripción del `nombre` (y `detalle` en la reacción).
- Campana del estudiante (api): `NoveltiesMenu` delega en `NotificacionesMenu` (reemplaza `ServerNoveltiesMenu`, mismo marcado y clases que la lista local: `sx-novelty`, ícono, `<strong>`, `<small>`, punto de sin ver): contador `no_vistas`, últimas 5 con no vistas primero y asíncronas no vistas al tope con clase `sx-novelty-asincrona` (acento propio en `styles/student/`), «Ver todas» abre `NotificacionesModal` (Dialog existente, «Mostrar más», «Marcar todas como vistas»). Pulsar → marca vista y navega. Vacío: «No tienes novedades pendientes».
- Apoderado: `AppShell`/`AppTopBar` reciben una prop `notificaciones?: ReactNode` (no importan store): `ParentPortalModule` pasa el menú en estilo portal (claro) en api; la orientadora pasa `false` en api y la campana no se dibuja. En local (sin prop) la campana inerte queda como hoy.
- Pruebas del front: se retiran o adaptan `tests/servidor/logros/servidor-avisos.test.mjs` y las referencias al lote en mapa/actividades/casos/apoderado (autorizado); nuevas en `tests/servidor/logros/servidor-notificaciones.test.mjs`: adaptador por tipo, cola de toasts con visto individual, cierre sin toast, campana (orden, recorte a 5, acento) y modal con «Mostrar más».
- `docs/origen-de-datos.md` y `ov_frontend/AGENTS.md`: notificaciones en api.

## Fases

1. **B1 · modelo y servicio:** enum, tabla, migración, `TABLAS_DE_ESTADO`, `services/notificaciones.py`, DESBLOQUEO desde `registrar_eventos`, `nuevas_notificaciones` en `RespuestaAccion`/`RespuestaAgrupada`; pruebas del motor. Commit `Ajuste notificaciones · F1: …`.
2. **B2 · entre cuentas y consultas:** conversaciones e investigaciones; GET y marcar-vistas; retiro de marcar-vistos y `solo_no_vistos`; fixtures; `motor.md` e `integracion.md`.
3. **F1 · store, toasts y cierres:** `notificaciones.ts`, `revelado.ts`, cola con visto individual, marcado desde cierres, retiro del lote de avisos.
4. **F2 · campana y modal:** `NotificacionesMenu`, `NotificacionesModal`, apoderado en `AppTopBar`, orientadora sin campana.
5. **Cierre:** suites completas de ambos repos (`pruebas`), `decisiones.md`, resumen. La spec queda en curso.

## Verificación

- Back: `pruebas` con `tests/integration/notificaciones`, `motor`, `actividades`, `conversaciones`, `investigaciones`, `cuentas`, `acceso`, `contrato`, `migraciones`, `datos`, `escenarios` por fase; al cierre `uv run pytest -n auto -q` y `uv run alembic heads` (uno).
- Front: `npm run test:servidor` y las carpetas de impacto por fase; al cierre `npm test`, `npm run build`, `npm run lint`, `npm run check:estructura`.
