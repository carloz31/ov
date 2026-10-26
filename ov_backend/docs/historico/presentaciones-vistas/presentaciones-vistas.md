# Presentaciones vistas en el servidor

## Contexto
Hoy el front decide si es la primera visita a una vista con `introsSeen`, guardado en `localStorage` (`ov.student-ui.v1`, `store/studentUiStore.ts`). Esa marca es por navegador y no por cuenta: un estudiante que cambia de equipo vuelve a ver todas las presentaciones, y en un equipo compartido el segundo estudiante no ve las que ya cerró el primero. `docs/origen-de-datos.md:136` ya anota que pasará al servidor.

Objetivo: en modo `api`, el servidor guarda por cuenta qué presentaciones de primera visita ya cerró el estudiante, y el front decide con ese dato. El modo `local` no cambia.

Decisiones del usuario:
- Se registran las **18 vistas** del front (`studentViews`), no solo las 5 secciones del backend.
- El texto de la presentación y el de la ayuda («?») siguen separados por ahora (`sectionIntros` y `guideSteps`, ambos en el front).
- La rama parte de `ajuste/diario-lumi`, porque usa su `seccionBloqueada`.

El plan aprobado se guarda como spec en `ov_backend/docs/specs/presentaciones-vistas.md`. Se trabaja en la rama `ajuste/presentaciones`, en un worktree propio. Hay un commit por fase y no se hace push.

## F1 · Backend: modelo, API y fixtures
Es un cambio de modelo completo y sigue el skill `cambio-modelo`.

**Modelo** (`app/models/contenido.py`, junto a `Seccion`):
- `Presentacion`, tabla `presentacion`: `id`, `codigo` único (el id de la vista del front: `journal`, `missions`, `resources`…) y `audiencia: Audiencia`. Es catálogo.
- `PresentacionVista`, tabla `presentacion_vista`:
  - Clave primaria `(cuenta_id, presentacion_id)`.
  - Columna `vista_en: datetime`.
  - Es estado de la cuenta. Va en `app/models/progreso.py`, junto a `InsigniaVitrina`.
- Migración `0030_presentaciones_vistas` autogenerada y revisada a mano. Debe quedar un solo head.

**Datos:** `datos/fijos.py` define `PRESENTACIONES` con los 18 códigos de `ov_frontend/src/lib/studentViews.ts` (audiencia `ESTUDIANTE`). Se cargan con un `_cargar_presentaciones` igual a `_cargar_secciones` (:485). `datos/ruta.py` no siembra estado.

**Listas de clasificación de tablas:**
- `presentacion_vista` se agrega a:
  - `TABLAS_DE_ESTADO` (`app/services/desarrollo.py:7`), para que el reinicio de desarrollo la vacíe.
  - `ESTADO` (`tests/unit/arquitectura/test_clasificacion_tablas.py:19`).
  - `TABLAS_ESTADO` (`tests/integration/migraciones/test_restricciones_estado.py:11`).
- `presentacion` se agrega a la lista de catálogo de ese mismo test de clasificación.

**API** (router nuevo `app/api/presentaciones.py`, incluido en `protegido` en `app/api/router.py:27`):
- `GET /cuentas/{cuenta}/presentaciones` devuelve `PresentacionesCuenta { vistas: list[str] }`, con los códigos ordenados.
- `POST /acciones/presentacion-vista`:
  - Cuerpo `PresentacionVistaEntrada(AccionCuenta) { cuenta, codigo, fecha_hora? }`.
  - Devuelve `PresentacionesCuenta`.
  - Pasa por `ejecutar_accion`, igual que `/acciones/vitrina` (`app/api/logros.py:16`).
- Esquemas nuevos en `app/schemas/presentaciones.py`, sobre `AccionCuenta` de `app/schemas/acciones.py:17`.
- Servicio nuevo en `app/services/presentaciones.py`:
  - Usa `buscar_por_codigo` y `exigir_estudiante` de `app/services/comun.py`.
  - Un código desconocido responde 422. Una presentación de otra audiencia también responde 422.
  - Es idempotente: si ya estaba vista, conserva la primera `vista_en` y responde igual.
  - No mira si la sección está bloqueada; eso lo decide el front antes de mostrar la presentación.
- El acceso usa la política por defecto (solo la cuenta propia). `test_cobertura_rutas.py` cubre la ruta nueva sola.

**Pruebas** (`tests/integration/presentaciones/test_presentaciones.py`):
- Al inicio la lista está vacía.
- Marcar una vista la agrega; marcarla dos veces no cambia la fecha.
- Un código inexistente da 422.
- Un apoderado o una orientadora reciben el error de `exigir_estudiante`.
- Otra cuenta recibe 404 (el guardia).
- El reinicio de desarrollo vacía la tabla.

**Fixtures:**
- En `scripts/exportar_fixtures_front.py`, dentro de `_recorrer`:
  - `presentaciones-inicial`: el GET justo al ingresar.
  - `presentacion-vista`: el POST de `missions`.
- Los dos nombres se agregan a `NOMBRES` (`tests/integration/contrato/test_exportar_fixtures_front.py:48`).
- Se regeneran con `uv run python scripts/exportar_fixtures_front.py --destino ../ov_frontend/tests/fixtures/servidor`.

**Documentos:**
- `docs/sistema/motor.md`: fila «Estado de la cuenta» (:11) y un párrafo junto a «Vitrina».
- `docs/sistema/integracion.md`: filas del contrato y el conteo y la lista de fixtures (:135).

**Pruebas a correr (subagente `pruebas`):** `migraciones`, `datos`, `presentaciones`, `contrato`, `desarrollo`, `unit/arquitectura`, `acceso` y `escenarios`.

## F2 · Front: leer y marcar en el servidor (solo api)
- `src/types/servidor.ts`: tipo `PresentacionesCuenta`, copiado del esquema.
- `src/services/api/presentaciones.ts`: `obtenerPresentaciones(cuenta)` y `enviarPresentacionVista(cuenta, codigo)`.
- `src/store/servidor/`:
  - Nueva sección `presentaciones` en `sesion.ts` (`DatosSecciones`, estado inicial) y en `secciones.ts` (`consultas` y `contadores`).
  - Se pide al ingresar junto con `resumen` y `secciones` (`refresco.ts:40-60`), porque la presentación decide qué se ve al entrar.
- `src/store/servidor/operaciones.ts`: `marcarPresentacionVista(codigo)` con el patrón de `guardarVitrina` (:191). Fija la cuenta y la sesión antes de enviar y, si responde `ok` y siguen vigentes, publica el parche de `presentaciones.datos`. No refresca.
- `src/features/adventure/hooks/useNoveltyQueue.ts`. Los mismos hooks en ambos modos, con la rama adentro:
  - En api, las vistas vistas salen de `presentaciones.datos.vistas`. Se arma `ui` con ese `introsSeen` para `getNextOverlay`, sin cambiar su lógica.
  - Si `presentaciones` no está `listo` (cargando o con error), la presentación espera. El front no inventa el estado.
  - Para eso, `seccionBloqueada` se generaliza a `introEnEspera` en `overlayContext.ts` (sección cerrada, o presentaciones sin cargar).
  - `closeGuide` en api:
    - Oculta la presentación al instante (estado de la visita, como `arrivalDismissed`) y llama a `marcarPresentacionVista(view)`.
    - Si falla, no se marca. Vuelve a salir en la próxima visita, sin aviso nuevo.
    - En local, se sigue usando `updateStudentUi`.
- `studentUiStore.ts` y el formato de `ov.student-ui.v1` no cambian. En api, el `introsSeen` local deja de leerse y de escribirse, y no se sube al servidor.
- `tests/soporte/servidor-ayudas.mjs`: `presentaciones` se agrega a `esConsultaDominio`, a `respuestaDominio` y a `escenarioRuta` (fixture `ruta/ruta-presentaciones-inicial`).
- **Pruebas en `tests/servidor`:**
  - Se adaptan las que hoy fijan `ui.introsSeen` en modo api para que usen el dato del servidor: `diario/servidor-diario-presentacion`, `actividades/servidor-recursos:124`, `logros/servidor-avisos:190,237,263` y `diario/servidor-senal:31`.
  - Se agregan pruebas nuevas:
    - Primera visita con la lista vacía.
    - Cerrar envía el POST y actualiza el almacén.
    - Con el POST fallido, la presentación no queda vista.
    - Mientras carga o con error, no se muestra.
    - Dos cuentas en el mismo navegador ven cada una sus presentaciones.
    - En local, nada cambia.
- `tests/local` no cambia.
- **Documentos:**
  - `docs/origen-de-datos.md`: fila de `ov.student-ui.v1` y la línea de presentaciones.
  - `ov_frontend/AGENTS.md`: «Origen de los datos», una viñeta corta.

## F3 · Cierre
- Se anota en `ov_backend/docs/decisiones.md`:
  - El modelo nuevo y por qué se usan 18 vistas.
  - La idempotencia.
  - Que el `localStorage` no se migra al servidor (los estudiantes verán las presentaciones una vez más).
  - El fallo del POST.
- Al cerrar la spec, lo vigente pasa a `AGENTS.md` o a `docs/sistema/`, y la spec y las decisiones se mueven a `docs/historico/presentaciones-vistas/`.

## Verificación
- **Backend:** `uv run alembic heads` debe mostrar un solo head y `uv run pytest -n auto -q` debe pasar entero.
- **Front:** `npm test`, `npm run lint`, `npm run build` y `npm run check:estructura`.
- **Prueba manual en api** (backend en 127.0.0.1:8000 con `VITE_DATOS=api`), en el navegador integrado:
  1. Ingresar como `est-ana` y comprobar que sale la presentación del mapa.
  2. Cerrarla, recargar y comprobar que no vuelve a salir.
  3. Entrar al diario y comprobar que sale la suya.
  4. En otra pestaña, o tras borrar el `localStorage`, ingresar de nuevo y comprobar que siguen vistas.
  5. Con el reinicio de desarrollo, comprobar que vuelven a salir.
