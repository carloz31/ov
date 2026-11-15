# Ajuste panel-entrevistas-configuracion

## Contexto

Este ajuste viene de las observaciones `ajuste-panel-entrevistas-configuracion.md`. Hace cuatro cosas: el salón pasa a ser promoción más sección; la configuración pasa a ser una sola por colegio y la edita la orientadora; las entrevistas se ocultan en vez de eliminarse; y se siembran entrevistas de muestra.

`docs/specs/` está vacío, así que el ajuste tiene su propia spec, `ov_backend/docs/specs/ajuste-panel-entrevistas-configuracion.md`. La rama es `ajuste/panel-entrevistas-configuracion` (ya creada). Cambia el modelo: se sigue `/cambio-modelo`, con una migración y un commit por fase que toque el modelo.

## Diferencias con el texto de observaciones (se reportan; no se corrigen en silencio)

1. **Hay un `scripts/sembrar_entrevistas_ejemplo.py`:**
   - Escribe `ENT-EJEMPLO-n` directo, sin eventos ni `destacada_por`, con autores `est-ana`…, y `cargar` no lo llama.
   - El texto dice que ningún script crea entrevistas; es cierto solo para `contenido.py` y `sembrar_panel_ejemplo.py`.
   - Propuesta: no se toca. Solo se adapta si deja de funcionar con el modelo nuevo.
2. **Nombre del sello:** en `contenido` es `ins-leyenda` (`contenido.py:1226`); `t-ins-leyenda` es el de `ruta`. La regla («no se pierde») vale para ambos.
3. **Salones de autor:** además de `SalonSesion` y `SalonPanel`, hay dos campos `salon: str` que hoy llevan el **nombre**: `EstudiantePanel.salon` (`schemas/panel.py:113`) y `FilaEstudiante.salon` (`schemas/panel_estudiante.py:30`). Sin `nombre` en la base no se pueden llenar, así que pasan también a `SalonDatos`.
4. **Estado de la entrevista:**
   - Hoy todo guardia de la orientadora (`entrevista_de_sus_salones`, `consultas.py:60`) da 404 a lo que no es PUBLICADA.
   - Para el 409 de una OCULTA, el guardia admitirá PUBLICADA y OCULTA, y cada acción decidirá.
   - La prueba `test_reacciones_orientadora.py:130-136` (destacar una ELIMINADA → 404) pasa a esperar 409. Está autorizada como prueba de `eliminar-entrevista`.
5. **Cambia lo que ve el 5B en `ruta`:** hoy solo el 5A tiene RIASEC prioritario y visible. Con RIASEC `obligatorio` y SIEMPRE, el 5B también lo necesita para T2 y sus apoderados lo ven. Es lo que el texto decide; lo nombro para que no sorprenda.
6. Pruebas que fijan las tablas que salen y no están en la lista autorizada, pero son de la misma clase («fijan el modelo que cambia»). Se adaptan y se anotan en `decisiones.md`:
   - `tests/integration/datos/test_semilla_ruta.py:36` (una fila por tabla de configuración);
   - `tests/unit/arquitectura/test_clasificacion_tablas.py:8`;
   - `tests/integration/migraciones/test_restricciones_estado.py:26`.

## Observaciones del usuario al plan (aprobadas)

- Las diferencias 1–6 se aceptan y se anotan en `decisiones.md`.
- **Sin parámetro `colegio`:**
  - El GET y el POST usan el colegio de los salones de la orientadora. Si son de más de un colegio, responden 422 «Sus salones pertenecen a más de un colegio» (caso no soportado).
  - Ninguna respuesta incluye el colegio.
  - `configurar-colegio` queda como `{cuenta, visibles, destacados}`.
- **crear_cuentas:** un salón nuevo cuya promoción y sección ya existen en el colegio (`2026-A` frente a 5A) es un error de fila con mensaje claro. Se detecta en `planificar`, antes de escribir, y no se deja a la restricción única. Tiene su propia prueba.
- **Front de la configuración:** al guardar se vencen solo la llave `configuracion` y los perfiles o respuestas cargados. El seguimiento no se vence, porque ya no depende de la configuración.
- **Entrevista oculta abierta por un estudiante** (desde una notificación o por URL):
  - Ya funciona como con ELIMINADA y RETIRADA. El detalle recibe 404 y `DetalleEntrevista.tsx:39` muestra el mensaje de `noDisponible` (`lib/servidor/adaptadoresInvestigaciones.ts:167`), no una pantalla de error.
  - Si la ocultan mientras está abierta, la siguiente acción da 404, muestra el aviso «Esta entrevista ya no está disponible.» y vuelve a «Mis investigaciones» (`useEntrevistaDetalle.ts:58`).
  - Único cambio: el texto de `noDisponible` pasa de «…se retiró o se eliminó.» a «Esta entrevista ya no está disponible.», porque ya no se elimina.

## Respuestas a «Para decidir en el plan» (§8)

1. **Vistas de estudiante o apoderado con nombre de salón:**
   - En modo api, ninguna. `HijoSesion.salon` es un código y ninguna vista lo pinta; `ParentChildrenSummary` y `StudentProfileView` son del modo local.
   - Solo cambian vistas de la orientadora: `CabeceraPanel`, `FiltrosEstudiantes`, `ListaEstudiantes`, `PanelVerEstudiantes`, `CabeceraPerfil`, `TablaPublicaciones`, `FichaPublicacion`, `ReaccionesModeradas`, `DetallePublicacion` y `PublicacionServidorView`.
2. **Códigos de salón:** 5A y 5B dan la sección A y B, tanto por nombre como por código. No hay otros en los datos; la migración falla con el código si encuentra uno que no se deduce.
3. **`ContextoConsultas`** (`app/core/contexto.py`): se agrega `configuracion_colegio(colegio_id)`, perezoso y en caché por petición. Hace una consulta por tabla (visibles y destacados) solo la primera vez que alguien la pide.
   - Panel: el colegio sale de `Alcance.salones` (ya son objetos `Salon`), sin consulta extra.
   - Apoderado: el `colegio_id` sale con un join en la consulta que ya trae los hijos.
   - `instrumentos_prioritarios` y `etiqueta_cuestionario` ya no leen configuración: solo leen la caché.
   - Se miden el antes y el después de `test_panel_presupuestos.py` y `test_presupuesto_familia.py` y se informan al cerrar la F2.
4. **Familias y autores de las entrevistas de muestra:**
   - est-panel-5, 7 y 8 terminan la siembra con la sección INVESTIGACIONES abierta y una investigación GUIA_LISTA en la familia 524. Las entrevistas 1–5 se crean con acciones reales.
   - Solo hay una investigación activa por cuenta (`investigacion_activa_unica`). Por eso, quien publica dos veces arma antes otra investigación con `guardar_lo_que_pienso` y `guardar_guion(terminar)`.
   - Familias: 524 Ing. Eléctrica (#2, coautoría), 313 Psicología (#1), 351 Derecho (#3), 531 Ing. Civil (#4), 341 Economía (#5) y 511 Ing. de Sistemas (#6).
   - La #6 es de un salón sin orientadora, cuyo estudiante no tiene la sección abierta. Se escribe directo, con favoritos de estudiantes del 5A que no son autores.

## 1. Salón = promoción + sección (F1)

**Modelo.** `Salon` (`app/models/cuentas.py:17`) pierde `nombre` y suma `promocion: int` y `seccion: str`, con `UniqueConstraint(colegio_id, promocion, seccion)`.

**Migración 0058:**
- agrega las columnas como nulas;
- llena `promocion = 2026` y la sección con la letra final del nombre o, si no, del código; si no puede, levanta un error con el código del salón;
- las deja `NOT NULL`, crea la restricción única y quita `nombre`.

**Backend.**
- Esquema común `SalonDatos {codigo, promocion, seccion}` en `app/schemas/` (cuentas o sesión). `SalonSesion = SalonDatos + es_principal`, y `SalonPanel` se reemplaza por `SalonDatos`.
- Pasan de nombre a `SalonDatos`:
  - `EstudiantePanel.salon` y `FilaEstudiante.salon`;
  - `AutorPublicacion.salon` y `AutorModerado.salon` (de código a `SalonDatos | None`).
- Se ajustan los lectores de `nombre`:
  - `acceso.py:139`;
  - `panel/lista.py:87` y `:117`;
  - `panel/estudiantes.py:94`;
  - `panel/seguimiento.py:215`;
  - `panel/perfil.py:77`;
  - `investigaciones/orientadora.py:118-122` (`_autores_con_salon` trae `promocion` y `seccion`).
- Datos y scripts:
  - `datos/ruta.py:22` `SALONES` pasa a `(código, promoción, sección, colegio)`, y `cargador.crear_salones` (`:93`) se ajusta.
  - `scripts/crear_cuentas.py` (`planificar`, `aplicar`): un salón nuevo debe tener la forma `^\d{4}-[A-Z]$` (`2026-C`); si no, da error de fila. El código es el texto de la columna.

**Front.**
- `src/lib/nombreSalon.ts`: `nombreSalon(salon, anio = new Date().getFullYear())`, con la regla del texto.
- Tipos y adaptadores:
  - `types/servidor.ts`, `servidorPanel.ts`, `servidorPanelEstudiante.ts` y `servidorInvestigaciones.ts` usan `SalonDatos`;
  - se ajustan los adaptadores de `lib/servidor/`.
- Vistas de §8.1:
  - el hook `usePublicacionesServidor` deja de traducir con la sesión y usa `nombreSalon(autor.salon)`;
  - sale «Promoción anterior» de `TablaPublicaciones:52`;
  - en `DetallePublicacion:92` queda `nombreSalon(...) · solo lectura`, porque el «solo lectura» del detalle se conserva.
- El modo local no cambia.

**Pruebas.**
- Se adaptan las autorizadas: `test_carga_salones`, `test_crear_cuentas`, `test_aislamiento_colegios` y `test_politica_y_contrasenas`.
- Nuevas en el back:
  - la migración deduce promoción y sección;
  - la restricción única;
  - `crear_cuentas` acepta `2026-C`, rechaza `5C` y rechaza `2026-A` (duplica a 5A), cada uno como error de fila antes de escribir.
- Nuevas en el front: `nombreSalon` para los grados 5, 4 y 3, una promoción egresada, una de segundo, y la misma promoción en 2026 y en 2027.
- Se regeneran los fixtures.

## 2. Configuración del colegio (F2 backend, F3 front)

**Modelo (decisión de diseño a aprobar), migración 0059.**
- `instrumento.obligatorio` (bool, por defecto false).
- `instrumento.visibilidad_apoderado`: enum nuevo `VisibilidadApoderado` (SIEMPRE, NUNCA, SEGUN_COLEGIO), no nativo con CHECK, como los demás. Valores en `fijos.py`: RIASEC obligatorio y SIEMPRE; PARTIDA-LLEGADA obligatorio y NUNCA; INTELIGENCIAS y HABILIDADES opcionales y SEGUN_COLEGIO.
- Tablas nuevas `colegio_instrumento_visible (colegio_id, instrumento_id)` y `colegio_actividad_destacada (colegio_id, actividad_id)`, con PK compuesta. Quedan **fuera de `MODELOS_FIJOS`** (`app/core/definiciones.py:14`) y se clasifican como estado en la prueba de arquitectura: las escribe la orientadora.
- Salen `salon_instrumento` y `salon_actividad_prioritaria`. La migración copia al colegio:
  - los destacados de cualquier salón;
  - la visibilidad de un instrumento SEGUN_COLEGIO marcada en algún salón.

**Lectores: hoy → pasará a.**
- `motor/evaluadores.py:135` `instrumentos_prioritarios`:
  - hoy: la partida más los `es_prioritario` del salón;
  - pasará a: las aplicaciones de los instrumentos `obligatorio` (de un COMPARACION, solo la ENTRADA), leídas solo de la caché.
  - `test_prioritarios_motor` se adapta. El mensaje de R-B4 (`contenido.py:1380`) sigue valiendo.
- `panel/comun.py:257` `etiqueta_cuestionario`:
  - pasa a REQUISITO si es `obligatorio`, CAMINO si alguna actividad es requerida del camino, y OPCIONAL en los demás casos;
  - deja de recibir `salones`;
  - sale REQUISITO_ALGUNOS de `schemas/panel.py:49`, `panel_estudiante.py:200` y, en el front, de `types` y de `adaptadoresPanel.ts:61`.
- `familia.py:115` `_aplicaciones_visibles`:
  - pasa a SIEMPRE ∪ (SEGUN_COLEGIO con fila del colegio del hijo);
  - sale la exclusión de COMPARACION escrita en el código.
- `panel/respuestas_resumen.py:20` `destacados_del_salon` → `destacados_del_colegio(colegio_id)`, con el mismo respaldo; también en `perfil_respuestas.py:109`.
- `datos/cargador.py:635` `_cargar_salones` → `_cargar_colegio_config`:
  - valida que la actividad sea REGISTRO y que el instrumento sea SEGUN_COLEGIO;
  - la carga de `fijos` valida que un SEGUN_COLEGIO no sea obligatorio.
- `crear_cuentas.py`: salen `SALON_MODELO` y `_configuracion_modelo`.

**Datos.**
- `ruta`: `COLEGIO_ACTIVIDADES_DESTACADAS = (('col-piloto','t-expectativas'),)` y `COLEGIO_INSTRUMENTOS_VISIBLES = ()`.
- `contenido`: `(('col-piloto','b1-3'),)` y `()`. Sale la entrada PROVISIONAL de B14 (`contenido.py:23-27`, `:44`).

**Endpoints.** Nuevo servicio `app/services/panel/configuracion.py`; rutas en el router del panel y en el de acciones.
- `GET /cuentas/{c}/panel/configuracion` (sin parámetros; varios colegios → 422), respuesta `ConfiguracionColegio`:
  - `cuestionarios[]`: `codigo`, `nombre`, `descripcion`, `obligatorio`, `visibilidad_apoderado` y `visible`;
  - `registros[]`: por bloque en el orden del camino, con la Ciudad al final; cada bloque con `codigo`, `nombre` y `registros[]` (`codigo`, `titulo`, `requerida`, `destacado`);
  - para otro rol, 404;
  - número fijo de consultas: alcance, 2 de configuración y las definiciones en caché.
- `POST /acciones/configurar-colegio {cuenta, visibles, destacados}`:
  - reemplaza todo con un `delete` y un `insert` por tabla;
  - 422 por un código desconocido, un instrumento que no es SEGUN_COLEGIO o una actividad que no es REGISTRO;
  - 404 para otro rol; 422 si sus salones son de más de un colegio;
  - no registra eventos.
  - **Colegio en la API:** no hay parámetro ni campo de colegio (observación del usuario).

**Pruebas nuevas (F2):** las de §6 «Configuración». Entre ellas:
- el guardado se ve desde otra sesión y otro motor sin `recargar` la caché;
- el presupuesto del GET.

**Front (F3):**
- `services/api/panel.ts`: `obtenerConfiguracion` y `configurarColegio`. Los tipos van en `servidorPanel.ts`.
- `store/servidor/panel.ts`: una llave `configuracion` con `useCarga`. Al guardar, se vencen solo esa llave y los perfiles o respuestas cargados (`descartarPerfil`).
- Vista nueva `pages/counselor/ConfiguracionServidorView.tsx` con los componentes del texto (§2.5), en `features/counselor/components/configuracion/`. Reutiliza `Badge`, `Switch`, `Checkbox`, `Card`, el diálogo de confirmación y los avisos que ya usa el panel.
- `AppRoutes.tsx:261,276`: `<SegunModo api={<ConfiguracionServidorView/>} local={<PrioritiesView/>}/>`.
- El menú de `CounselorPortalModule.tsx:18,56` pasa a «Configuración».

## 3. Ocultar y volver a mostrar (F4)

**Modelo.** `EstadoEntrevista.ELIMINADA` → `OCULTA` (`enums.py:311`), migración 0060. Cambia el CHECK y actualiza las filas.

**Backend** (`investigaciones/orientadora.py`):
- `ocultar_entrevista`:
  - deja OCULTA y pone `destacada_en`, `destacada_por` y `leyenda_en` en nulo;
  - llama a `resolver_reportes` como hoy;
  - no registra eventos.
- `mostrar_entrevista`: PUBLICADA; si no estaba oculta, 409.
- `entrevista_de_sus_salones` admite OCULTA. `destacar`, `comentar` y `descartar_reporte` (y `eliminar_reaccion` de la orientadora) responden 409 si está oculta.
- Rutas: `POST /acciones/ocultar-entrevista` y `/acciones/mostrar-entrevista`, con `EntradaEntrevista`. Sale `eliminar-entrevista`.
- `listar_publicaciones`:
  - acepta `estado=OCULTA`;
  - sin estado, trae PUBLICADA y OCULTA (de sus salones; las Leyendas de otros salones nunca están ocultas);
  - SIN_DESTACAR, DESTACADA y LEYENDA filtran a PUBLICADA;
  - `_estado` devuelve OCULTA.
- `detalle_publicacion` muestra la oculta a la orientadora.
- Las consultas de estudiantes ya filtran `PUBLICADA`: no cambian.

**Front.**
- `ESTADOS` de `TablaPublicaciones` suma «Ocultas»; `EstadoPublicacionBadges` suma «Oculta».
- `DetallePublicacion`:
  - «Ocultar entrevista» con la confirmación del texto;
  - si está oculta: el aviso, «Volver a mostrar» y los botones de destacar y comentar desactivados;
  - el texto de ayuda nuevo.
- `usePublicacionDetalle`: `ocultar` (se queda en el detalle, no vuelve a la lista) y `mostrar`.
- `services/api/investigaciones.ts`: `ocultarEntrevista` y `mostrarEntrevista`.

**Pruebas.** Las de §6 «Ocultar». Se adaptan `test_reacciones_orientadora.py:121-136` y el caso «eliminar» de `test_leyenda.py:169`.

## 4. Entrevistas de muestra (F5)

- `contenido.py`: `ENTREVISTAS_EJEMPLO` (`DATO DE PRUEBA`), con título, profesional, dedicación, duración, enlace de YouTube de prueba, resumen, familia, autores, estado, reacciones, favoritos, comentarios y reportes.
- `scripts/sembrar_panel_ejemplo.py`, al final de la siembra:
  - crea el salón `2024-A` (2024, A, col-piloto) y su estudiante `est-panel-9`, sin credenciales ni orientadora; ninguno se toca si ya existe;
  - siembra las entrevistas 1–5 con el `Cliente` y acciones reales: `guardar_lo_que_pienso` y `guardar_guion` para el segundo guion, `publicar-entrevista`, `reaccionar`, `marcar-favorito`, `reportar`, `comentar` y `destacar` (como ori-carmen) y `ocultar`;
  - escribe la #6 directo: Investigacion PUBLICADA, Entrevista con `destacada_por` y `leyenda_en`, favoritos, y eventos PUBLICA_ENTREVISTA, ENTREVISTA_DESTACADA y ENTREVISTA_LEYENDA con su desbloqueo del sello y su notificación, usando las funciones del motor;
  - si un autor ya existía, no se siembran sus entrevistas.
- No entra en `ruta`.
- Prueba: con `contenido` y ejemplos, la tabla de ori-carmen trae 6 entrevistas en su estado y `Ocultas` trae solo la #5.

## Qué no cambia

- El modo local (`PrioritiesView`, `usePriorities`) y `CounselorSettingsView`.
- RETIRADA y «Eliminar comentario», que sigue siendo definitivo.
- Las columnas y los filtros de la tabla, salvo el de estado.
- El motor fuera de `instrumentos_prioritarios`: reglas, condiciones y sellos.
- `codigo` del salón (5A y 5B) y todos los fixtures que lo usan como identificador.
- Las consultas de estudiantes, que ya filtran PUBLICADA.

## Fases (una por commit, cada una con pruebas en verde)

| Fase | Qué | Pruebas (subagente `pruebas`) |
|---|---|---|
| F1 | Salón promoción + sección (modelo, back, front, fixtures) | migraciones, datos, cuentas, panel, investigaciones, escenarios; front `test:servidor` |
| F2 | Configuración del colegio, backend (modelo, lectores, endpoints, adaptar REQUISITO_ALGUNOS en el front, fixtures) | migraciones, datos, motor, panel, familia, cuentas, escenarios, presupuestos (antes y después) |
| F3 | Vista de configuración en el front | front: pruebas de la vista, `test:servidor` |
| F4 | Ocultar y mostrar entrevista (modelo, back, front) | investigaciones, migraciones, escenarios; front |
| F5 | Entrevistas de muestra, `docs/sistema/` (panel, investigaciones, motor, integracion) y `decisiones.md` | carga con ejemplos; suite completa de ambos lados |

Cada fase que toca el modelo termina con `uv run alembic heads` y un solo head.

## Verificación final

- `uv run pytest -n auto -q`.
- `npm test`, `npm run build`, `npm run lint` y `npm run check:estructura`.
- Carga de `contenido` con ejemplos; revisión de la tabla de ori-carmen.
