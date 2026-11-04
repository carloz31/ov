# Ajuste · carga-casos

## Contexto

La Central de casos solo juega el incendio forestal (`forestFireCase.ts`, slugs de ocupación, tipos RIASEC). Se cargan los seis casos reales en `contenido` con el formato nuevo (JSON del front + ficha del servidor), el código de ocupación pasa a ser el O*NET y la vista se generaliza para leer cualquier caso. El documento del usuario (`ajuste-carga-casos.md`) es la fuente principal y decide casi todo; este plan lo aterriza en archivos reales. No había spec en curso: el plan aprobado se guarda en `ov_backend/docs/specs/ajuste-carga-casos.md`. Rama: `ajuste/carga-casos` (creada desde `main`).

**Comprobado sobre los seis JSON:** totales 8/10/8/8/8/10 (iguales a la tabla del documento); todos los `onet` de `profesionales` están en el catálogo (`en_catalogo = 1`); `presupuesto` ≥ total en todos. Están en `ov_frontend/src/data/cases/` (no en `plataforma/`): se mueven con `git mv` a `src/data/cases/plataforma/`. El material de referencia del formato se trata según las correcciones del final.

## Qué cambia (hoy → pasará a)

### F1 · Modelo y contrato (sigue `/cambio-modelo`; aprobado por el documento)
- **Dimensiones de casos.** Hoy `ActividadDimension` (`app/models/contenido.py:79`) guarda R/S de `t-caso`; `datos/cargador.py::_unir_dimensiones` la carga desde `DIMENSIONES_ACTIVIDADES` y `app/services/casos.py::listar_casos_cuenta` arma `CasoCuenta.dimensiones`. → Se retiran tabla, modelo (y su entrada en `app/models/__init__.py` y `app/core/definiciones.py`), `_unir_dimensiones`, `DIMENSIONES_ACTIVIDADES` (ruta y contenido) y el campo del esquema.
- **Ocupaciones ocultas.** Hoy `fijos.cargar` pasa `{onet: slug}` de `fijos.OCUPACIONES` (36 pares) a `catalogo.cargar`, que con `leer_catalogo(ocultas=…)` carga además las 5 con `en_catalogo = 0`; `codigo_ocupacion()` da el slug o `onet-xx-xxxx-xx`. → `catalogo.cargar(sesion, dimensiones, carpeta)` sin `slugs`; `leer_catalogo`/`_leer_curaduria` sin `ocultas` (solo filas con `en_catalogo = 1`); `codigo = codigo_onet`; se retiran `OCUPACIONES`, `codigo_ocupacion` y la columna `ocupacion.en_catalogo` con sus filtros en `app/services/catalogo.py` (8 sitios) y `app/services/instrumentos/consultas.py:262`. `OcupacionArchivo.en_catalogo` de `datos/catalogo.py` se retira también (y lo que lo use: `sin_familia`).
- **Migración 0044** autogenerada y revisada: `drop_table('actividad_dimension')` y `drop_column('ocupacion', 'en_catalogo')` (batch); el downgrade las recrea.
- **Slugs → O*NET** en `ruta.TESTIMONIOS` (`paramedic` → `29-2043.00`, `translator` → `27-3091.00`), `scripts/exportar_fixtures_front.py`, `scripts/verificar_leyenda.py`, soportes y las pruebas del backend que nombran slugs (casos, catálogo, contrato, datos, escenarios/ruta, favoritos, investigaciones, migraciones, motor, referencias, testimonios). Solo cambia el código; los nombres de fixtures se conservan.
- **Endpoint nuevo** `GET /cuentas/{c}/catalogo/ocupaciones-caso?codigos=a,b,…` en `app/api/catalogo.py`, declarado antes de `/ocupaciones/{codigo}`. Servicio `ocupaciones_caso` en `app/services/catalogo.py`: `exigir_catalogo`, 422 si `codigos` falta/vacío, > 30 o alguno no existe; responde en el orden pedido `list[OcupacionCaso{codigo, titulo, descripcion, conocimientos, aptitudes}]` (esquema en `app/schemas/catalogo.py`). Sin evento de vista.
- Prueba nueva: `GET /catalogo/ocupaciones/33-2011.00`-style con punto (con un código del catálogo, p. ej. `19-3033.00`) responde 200.
- Pruebas adaptadas (autorizado): `test_casos.py`, `test_carga_casos.py`, `test_semilla_ruta.py`, `test_restricciones_estado.py`, `test_clasificacion_tablas.py` en lo que nombra dimensiones; las de slug, solo el código.

### F2 · Datos
- **`ruta.py`:** `t-caso` y `t-caso-2` → `CONFIGURACION_CASOS = (8, (2, 1, 2, 2, 1))` (los de `hidden-plaza`) y mínimo 6. Comentario de sincronía apunta a `plataforma/hidden-plaza.json`. `t_caso.json` y `t_caso_2.json` → `"caso": "hidden-plaza"`.
- **`contenido.py`:** fuera `t-caso`/`t-caso-2` de `_DE_RUTA`, `PROPIEDADES`, `DESCRIPCIONES`, `CONFIGURACION_CASOS = ruta…` y las reglas `R-t-caso*`, `R-t-testimonio-*`. Entran `c1`…`c6` al final del bloque CIUDAD en `ACTIVIDADES` (título, mínimo y duración de la tabla), `PROPIEDADES` `requerida: False`, `DESCRIPCIONES`, `TEMATICAS_ACTIVIDADES` (nuevo en contenido: las seis con `C`) y `CONFIGURACION_CASOS` propio:
  c1 (8, 2·1·2·2·1) · c2 (10, 2·2·2·2·1·1) · c3 (8, 2·1·2·1·2) · c4 (8, 1·2·2·2·1) · c5 (8, 2·1·2·2·1) · c6 (10, 2·2·2·2·2).
- **Reglas:** `R-c1`…`R-c6` (ACTIVIDAD, COMPLETA_ACTIVIDAD b1-3, «Baja del nevado con Iván para llegar a la Central de casos.»). `R-tc<n>-<k>` (TESTIMONIO, SUPERA_CASO `c<n>`, «Resuelve «<título>» en la Central para conocer esta voz.»).
- **Testimonios de prueba** en `contenido.TESTIMONIOS` (marcados `PENDIENTE: contenido real en el ajuste de testimonios`), con la regla de ocupación del documento:
  c1 19-3091.00 / 25-4012.00 · c2 15-1211.00 / 21-1012.00 · c3 19-1013.00 / 11-2021.00 · c4 13-1121.00 / 27-3031.00 · c5 27-2022.00 / 15-2031.00 · c6 19-2043.00 / 17-2081.00.
- **`PROVISIONALES`:** se quita la fila de casos; la de testimonios describe los doce de prueba.
- **JSON de actividad** `plataforma/c1.json`…`c6.json` (esqueleto de `t_caso.json`, sin `_dato_de_prueba`, `"escenario": "ciudad"`), registrados en `src/data/activities/contenidos.ts`.
- **`scripts/verificar_contenido_front.py`:** recorre `ruta` y `contenido`; añade las comprobaciones de 2.4 (caso con JSON, reglas del formato, `onet` cargado, máximo = total, conteos = `CONFIGURACION_CASOS`, mínimo ≤ máximo, ocupación de testimonio ∈ necesidades del caso que lo regala vía su regla SUPERA_CASO); imágenes faltantes en `public/` como aviso.
- `pendientes-interfaz.md`: `b3-10` (T05) y `ma2-p06`/`ma2-p07` (T02, T08).

### F3 · Pruebas del backend y fixtures
- `tests/integration/datos/`: carga de c1–c6 (mín/máx, temática C, sin dimensiones), ruta con escala 6/8; ocupaciones (`codigo == codigo_onet`, sin `onet-` ni slugs, `33-2011.00` ausente).
- `tests/integration/escenarios/contenido/`: recorrido (casos bloqueados antes de b1-3, disponibles después; c1 con 6 abre `tc1-1`/`tc1-2`, suma a la colección y no abre otros; con 5 no); `ocupaciones-caso` (orden y los tres 422); ninguna regla de `contenido` nombra `t-caso`/`t-testimonio-*`.
- Regenerar fixtures (`exportar_fixtures_front.py`), con `ruta-ocupaciones-caso` nuevo.

### F4 · Front (modo api; local congelado)
- **Registro.** `src/data/cases/casos.ts`: import explícito de los seis JSON (clave `id`). `src/types/cases.ts` gana `CasoJson`; `src/data/cases/casoDesdeJson.ts` adapta a `ForestFirePhase`/`ForestFireProblem`/`ForestFireProfessional` (id = `occupationId` = O*NET; `name`/`description`/`skills` se completan con las ocupaciones del servidor) y a un objeto `CasoJugable {id, tematica, intro, presupuesto, fases, profesionales}`. El modo local arma su `CasoJugable` desde `forestFireCase.ts` con `FOREST_FIRE_*`.
- **La vista recibe el caso.** Contexto `CasoContext` (en `features/cases/`) consumido por `useForestFireCase`, `ForestFireCaseView`, `ProfessionalDirectory`, `useProfessionalDirectory`, `PhaseResultScreen`, `FinalReportScreen`, `ForestFireWorkspace`, `ForestFireProfessionalPanel`, `SatisfactionBar`, `ForestFireCaseHeader`. `forestFireCaseLogic.ts`: las funciones reciben el caso (fases, profesionales, presupuesto) en vez de leer módulos; máximo y umbral del servidor en api; «Usaste los N puntos» y «N de M» del header salen del presupuesto. `explorationStore` y `useExtraProfessionalQuestion` (local) siguen con el incendio.
- **Página.** `ForestFireCasePage` y `ExplorationCaseIntroPage`: en api buscan el caso en el registro y su actividad (`actividadDeCaso`); en local siguen exigiendo `forest-fire`. `pointDetails.ts`/`ciudadPoints.ts`: la rama api trata como caso cualquier id del registro (hoy compara con `'forest-fire'`).
- **Ocupaciones del caso.** `services/api/catalogo.ts::obtenerOcupacionesCaso`, `store/servidor/catalogo.ts::consultarOcupacionesCaso`; una petición al entrar, con `PantallaCarga` (cargando/error/reintentar) hasta tenerla. Directorio, workspace, resultado y vista usan el título del servidor en api (no `getOccupation`). `useHojaDeVida` en api lee de esa respuesta (sin pedir el detalle).
- **Intro.** `ExplorationCaseIntroView` recibe narrativa, imagen y alerta del caso y el título de la actividad; ícono genérico de la Central (p. ej. `Building2`) en vez de `Flame`; topbar «Central de casos · <título>». En local se le pasa lo de hoy.
- **Temática.** Fuera `textoTiposCaso` y `CasoCuenta.dimensiones` (`types/servidor.ts`); se muestra «Temática: <tematica>».
- **Imágenes** faltantes → `exploration-case-background.png` (respaldo con `onError`/comprobación); se anotan en `pendientes-interfaz.md`.
- **Revisión de slugs en api** (`catalogSelectors`, `catalogDetails`, `travelerResources`, `research.ts`): lo que dependa de un slug se anota en `pendientes-interfaz.md`, sin mapeos.
- **Pruebas:** `tests/servidor/casos` adaptada (sin `textoTiposCaso`, con `tematica`, escala 6/8, `CONFIGURACION_CASOS` contra los JSON de `plataforma/`, hoja de vida con `ocupaciones-caso`); nuevas de `casoDesdeJson` sobre cada JSON; las de slugs en fixtures `ruta-*`. `tests/local/casos` sin cambios.

### F5 · Cierre
Suites completas (back y front, build, lint, check:estructura), `verificar_contenido_front.py` sin errores; documentos (`motor.md`, `instrumentos.md`, `integracion.md`, `ov_frontend/AGENTS.md`); `decisiones.md` con las decisiones del documento y las de este plan. La spec queda en curso.

## Qué no cambia
- `actividad_tematica`, `resolver-caso` (el front sigue calculando y enviando las bien asignadas), el motor de reglas, el resto del catálogo (búsqueda, familias, carreras), `forestFireCase.ts`, `occupations.ts` y todo el modo local.
- Las necesidades no se cargan en el servidor.

## Decisiones propias (lo que el documento no define)
- Los JSON se mueven de `src/data/cases/` a `src/data/cases/plataforma/`. La carpeta de fuentes se trata según las correcciones de abajo.
- `OcupacionCaso` es un esquema nuevo (no se reutiliza `OcupacionDetalle`, que trae familias y carreras).
- La rama api de `pointDetails`/`ciudadPoints` reconoce los casos por el registro, porque si no los seis casos no tendrían punto en la Ciudad.
- `casoDesdeJson` produce las estructuras `ForestFire*` actuales; no se renombran componentes.

## Correcciones del usuario al aprobar

- **Pruebas y exportador que resuelven casos de `ruta`** (`test_casos.py`, `test_exportar_fixtures_front.py`, `test_ruta_corta.py`, `scripts/exportar_fixtures_front.py`): no basta con cambiar el slug; `33-2011.00` ya no existe y la escala es 6/8. Usan ocupaciones que `hidden-plaza` necesita y puntajes de esa escala: intento fallido con 5, superado con 7, 422 con más de 8. Las aserciones de títulos y colección se ajustan a esas ocupaciones (autorizado).
- **`ruta.TESTIMONIOS`:** `t-testimonio-1..4` pasan a ocupaciones que `hidden-plaza` necesita (dato de prueba), para cumplir «la ocupación del testimonio es una necesidad del caso que lo regala» en ambos conjuntos: t-1 `19-3091.00`, t-2 `17-2051.00` (los regala `t-caso`), t-3 `19-3041.00`, t-4 `19-3051.00` (los regala `t-caso-2`).
- **`verificar_contenido_front.py`:** además, en `contenido` cada caso lo juega exactamente una actividad.
- **Imágenes:** las 24 de los casos aún no existen; van como aviso y a `pendientes-interfaz.md`.
- **Material de referencia del formato** (el contexto del ajuste y el incendio convertido como ejemplo): se queda durante el ajuste y no se borra en las primeras fases. En el cierre, el formato del JSON de caso (esquema de campos y «Lo que no va en el JSON») pasa a `docs/sistema/integracion.md` («Casos de la Central»), el material se retira del repo y la spec y los documentos dejan de nombrarlo.

## Verificación
Por fase, el subagente `pruebas` con las carpetas de impacto más `tests/integration/escenarios` (back) o `npm run test:servidor` (front); `uv run alembic heads` con un solo head; `uv run python scripts/verificar_contenido_front.py`. Al final, suites completas de ambos y una prueba manual opcional en api abriendo `c1`.

---

## Anexo · documento del ajuste (tal como lo entregó el usuario)

## Ajuste · carga-casos

Carga de los seis casos reales de la Central en el conjunto `contenido`, con el formato nuevo de caso (un JSON del front por caso y su ficha en el servidor), y dos testimonios de prueba por caso. Sale de `main` (spec propia: `docs/specs/` está vacío).

Fuentes: el contexto del ajuste (formato del JSON, ficha del servidor y cambios de modelo; el formato vigente está en `docs/sistema/integracion.md`, «Casos de la Central»), `catalogo_casos_OV.md` (los seis casos, sus umbrales y notas de implementación) y los seis JSON (`hidden-plaza`, `scholarship-mystery`, `harvest-race`, `thousand-voices-festival`, `impossible-teams-tournament`, `silent-lagoon`), que el usuario deja en `ov_frontend/src/data/cases/plataforma/` antes de empezar. El incendio convertido fue solo el ejemplo del formato: no entra al repo. **Donde este documento y esas fuentes choquen, gana este documento.** Los JSON de caso no se corrigen: si uno no cumple una regla, se detiene la fase y se informa.

### Criterio general

- **El incendio forestal sale de la plataforma.** Ni `ruta` ni `contenido` lo juegan; `forestFireCase.ts` queda solo para el modo local (ver abajo).
- **`ruta` sigue siendo el banco de pruebas**, ahora con un caso real: `t-caso` y `t-caso-2` juegan `hidden-plaza` (el JSON de `plataforma/`). Sus pruebas se adaptan solo en lo que este ajuste autoriza: el caso que juegan y su escala (6 de 8 en vez de 10 de 14), los códigos de ocupación O*NET, los tipos RIASEC retirados y la `tematica`.
- **`contenido` deja de tomar los casos y testimonios de `ruta`**: los seis casos y sus doce testimonios de prueba son propios. Se quita la fila de casos de `PROVISIONALES` y la de testimonios pasa a describir los doce de prueba (los reemplaza el ajuste de testimonios).
- **El servidor no sabe qué ocupación resuelve cada problema** (sigue como hoy): el front calcula el puntaje y envía las bien asignadas a `resolver-caso`. Las necesidades no se cargan en el servidor: `scripts/verificar_contenido_front.py` comprueba que `CONFIGURACION_CASOS` y los JSON coincidan.
- **Modo local congelado.** Local sigue jugando `forestFireCase.ts` con sus slugs y su catálogo del front (`occupations.ts`); los slugs solo desaparecen del servidor, de los fixtures y del modo api.

### Fase 1 · Modelo y contrato (sigue `/cambio-modelo`)

#### 1.1 Sin tipos RIASEC en los casos

- Se retiran la tabla `actividad_dimension` (modelo `ActividadDimension`, migración), `DIMENSIONES_ACTIVIDADES` de `ruta.py` y `contenido.py`, su carga y validación en `datos/cargador.py` (y su entrada en la lista de tuplas), y `dimensiones` de `CasoCuenta` (`app/schemas/casos.py`, `app/services/casos.py`).
- `actividad_tematica` (temáticas A–E) no cambia.
- Pruebas que se adaptan (autorizado): `tests/integration/casos/test_casos.py`, `tests/integration/datos/test_carga_casos.py`, `test_semilla_ruta.py`, `tests/integration/migraciones/test_restricciones_estado.py` y `tests/unit/arquitectura/test_clasificacion_tablas.py`, solo en lo que nombra las dimensiones de los casos.

#### 1.2 Solo ocupaciones del catálogo, con su código O*NET

- **Sin ocupaciones ocultas.** Hoy `catalogo.cargar` recibe de `fijos.OCUPACIONES` (36 pares slug → O*NET) una lista de ocupaciones que se cargan aunque tengan `en_catalogo = 0` en `ocupaciones_curadas.csv`, porque las nombraban el incendio o los datos de demo: Bomberos (33-2011.00), Médicos de Medicina Interna (29-1216.00), Acomodadores (39-3031.00), Guardias de Seguridad (33-9032.00) y Cocineros de Restaurante (35-2014.00). Esas cinco dejan de cargarse. Se retiran `fijos.OCUPACIONES`, el parámetro `ocultas`/`slugs` de `catalogo.cargar` y `leer_catalogo`, y la columna `ocupacion.en_catalogo` con sus filtros en `app/services` (pasa a ser siempre verdadera). La columna `en_catalogo` del CSV se sigue leyendo: solo entran las filas con 1.
- **Regla:** toda ocupación que nombra un caso o un testimonio debe estar en el catálogo. Si un JSON nombra una que no está, la carga del conjunto (o el script) falla con su código, y se informa; no se agrega al catálogo.
- **El código es el O*NET.** `codigo_ocupacion` se retira: `codigo` pasa a ser el O*NET tal cual (`33-2011.00`), igual a `codigo_onet`. Se retira el prefijo `onet-`.
- Todo lo que nombra ocupaciones por slug pasa al O*NET: `TESTIMONIOS` de `ruta.py` (`paramedic` → `29-2043.00`, `translator` → `27-3091.00`; los dos están en el catálogo), escenarios y pruebas del backend (13 archivos), `scripts/exportar_fixtures_front.py` (p. ej. `entrevistas-ocupacion=electrician`) y los fixtures `ruta-*` regenerados. Los nombres de archivo de los fixtures se conservan (`catalogo-ocupacion-psychologist` sigue llamándose así).
- Una ruta con punto (`/catalogo/ocupaciones/33-2011.00`) funciona sin cambios; se agrega una prueba que lo confirma.

#### 1.3 Las ocupaciones del caso, de una vez

Hoy el directorio muestra el cargo con `getOccupation(slug)` del catálogo del front (o el `name` de `forestFireCase.ts`), y la hoja de vida pide el detalle de la ocupación al abrirla. El JSON nuevo solo trae `onet` y `persona`. Nuevo endpoint:

- `GET /cuentas/{c}/catalogo/ocupaciones-caso?codigos=a,b,…` → `list[{codigo, titulo, descripcion, conocimientos, aptitudes}]`, en el orden pedido: el título es el cargo del directorio y el resto, la hoja de vida. Misma guardia que el detalle (`exigir_catalogo`). 422 si falta `codigos`, si trae más de 30 o si alguno no existe. Sin evento de vista (abrir un caso no cuenta como explorar el catálogo).
- El front lo pide una vez al entrar al caso, con todos los `onet` de `profesionales`, y el caso no se muestra sin esa respuesta (pantalla de carga y su error, como el resto). La hoja de vida deja de pedir el detalle en api.

### Fase 2 · Datos

#### 2.1 Fichas de los seis casos (`contenido.py`)

Actividades CASO del bloque `CIUDAD`, al final del bloque y en este orden. Código = `c1`…`c6`, contenido `c1`…`c6` (convención del repo). Todas `requerida: False` (toda la Ciudad es opcional) y `visibilidad: SIEMPRE`. Temática C (Conocimiento de las opciones) en las seis.

| Código | Caso (`caso`) | Título | Descripción | Duración | Mínimo / máximo |
|---|---|---|---|---|---|
| c1 | `hidden-plaza` | La plaza que esconde otra historia | Un proyecto de plaza se detiene al descubrir restos antiguos bajo el terreno. | 15 | 6 / 8 |
| c2 | `scholarship-mystery` | Las becas que nadie puede explicar | Un programa de becas presenta solicitudes perdidas, puntajes difíciles de explicar y documentos expuestos. | 18 | 8 / 10 |
| c3 | `harvest-race` | La cosecha contra el reloj | Una cosecha abundante de mangos pierde a su principal comprador y amenaza con desperdiciarse. | 15 | 6 / 8 |
| c4 | `thousand-voices-festival` | El festival de las mil voces | Un festival juvenil gratuito debe coordinar doce agrupaciones, resolver fallas técnicas y desmentir rumores. | 15 | 6 / 8 |
| c5 | `impossible-teams-tournament` | El torneo de los equipos imposibles | Los Juegos Juveniles presentan criterios de selección injustos, barreras de acceso, problemas de salud y choques de horarios. | 15 | 6 / 8 |
| c6 | `silent-lagoon` | La laguna que amaneció en silencio | Aparecen peces muertos y agua verdosa en una laguna; circulan acusaciones sin pruebas. | 18 | 8 / 10 |

- La duración es el límite inferior del rango del catálogo.
- `CONFIGURACION_CASOS` propio de `contenido`: (máximo, necesidades por problema en orden de fase y problema) leído de cada JSON. El máximo debe ser el de la tabla; si un JSON da otro total, se detiene y se informa. En `ruta`, `t-caso` y `t-caso-2` toman los de `hidden-plaza`, con mínimo 6.
- Seis JSON de actividad en `ov_frontend/src/data/activities/contenidos/plataforma/` (`c1.json`…`c6.json`): tipo CASO, sin nodos, `"caso": "<id>"`, `"escenario": "ciudad"`, con el mismo esqueleto que `t_caso.json` (sin `_dato_de_prueba`). `t_caso.json` y `t_caso_2.json` de `ruta/` pasan a `"caso": "hidden-plaza"`.
- En `contenido`, cada caso lo juega exactamente una actividad (la página del caso se abre por el id del caso). En `ruta`, `t-caso` y `t-caso-2` comparten `hidden-plaza`, como hoy comparten el incendio.

#### 2.2 Qué abre cada caso

Por ahora, los seis con la Ciudad: una regla por caso con COMPLETA_ACTIVIDAD b1-3 (la misma condición que abre el bloque CIUDAD), mensaje «Baja del nevado con Iván para llegar a la Central de casos.». Más adelante se agregarán reglas propias; tenerlas desde ya como regla por caso evita reescribir la carga.

Se retiran de `contenido` `R-t-caso` y `R-t-caso-2`; ninguna regla de `contenido` nombra `t-caso` ni `t-testimonio-*` (la fase 3 lo prueba).

#### 2.3 Testimonios de prueba

Doce, dos por caso, en `TESTIMONIOS` de `contenido.py`, marcados `PENDIENTE: contenido real en el ajuste de testimonios`. Códigos provisionales `tc1-1`, `tc1-2` … `tc6-2`: el ajuste de testimonios carga los datos reales sobre esos mismos códigos.

- Ocupación: la primera necesidad del primer problema del caso y la primera necesidad del último problema que tenga otra ocupación (las dos distintas).
- Título «Voz de prueba N», descripción «Texto de prueba.», enlace de YouTube de prueba (los de `ruta`), persona «Persona de prueba N», 5 años, cita «Cita de prueba.», pista «Una voz que llega al resolver «<título del caso>».».
- Regla TESTIMONIO por cada uno: SUPERA_CASO de su caso; mensaje «Resuelve «<título del caso>» en la Central para conocer esta voz.».
- Pendiente en `pendientes-interfaz.md`: `b3-10` (su `mensajeFin` anuncia la voz T05) y `ma2-p06`/`ma2-p07` (nombran T02 y T08) apuntan a testimonios que aún no existen; se resuelven en el ajuste de testimonios.

#### 2.4 Validación (`scripts/verificar_contenido_front.py`)

Se amplía para ambos conjuntos (hoy solo comprueba `contenido`):

- cada actividad CASO tiene un `caso` con su JSON en `src/data/cases/plataforma/`;
- las reglas del formato: `onet` únicos en `profesionales`; cada `onet` de `necesidades` está en `profesionales` y no se repite dentro del problema; `id` de fases, mensajes y problemas únicos en el caso; ningún texto vacío; `posicion` 0–100; `presupuesto` ≥ total de necesidades; imágenes sin parámetros (`?v=`);
- cada `onet` es una ocupación cargada (del catálogo);
- el total de necesidades es el `puntaje_maximo` de cada actividad que juega el caso, los conteos por problema coinciden con `CONFIGURACION_CASOS`, y `puntaje_minimo` ≤ máximo;
- la ocupación de cada testimonio es una necesidad del caso que lo regala;
- imágenes que no existen en `ov_frontend/public/`: **aviso**, no error (las de los seis casos aún no se entregan); el front usa una imagen de respaldo.

### Fase 3 · Pruebas del backend

En `tests/integration/datos/` y `tests/integration/escenarios/contenido/` (plantilla `contenido` ya existente):

1. `contenido` carga los seis casos con su mínimo, máximo, temática C y sin dimensiones; `ruta` carga `t-caso` y `t-caso-2` con la escala de `hidden-plaza` y sin dimensiones.
2. Ocupaciones: ningún `codigo` empieza con `onet-` ni es un slug; `codigo == codigo_onet` en todas; no se carga ninguna fila con `en_catalogo = 0` (p. ej. 33-2011.00).
3. Recorrido: los seis casos bloqueados antes de b1-3 y disponibles después. Superar c1 con su mínimo abre `tc1-1` y `tc1-2`, agrega las ocupaciones a la colección y no abre los testimonios de otro caso; un punto menos no los abre.
4. `GET …/ocupaciones-caso`: trae título y hoja de vida en el orden pedido y responde 422 en los tres casos.
5. Reglas: ninguna regla de `contenido` nombra `t-caso` o `t-testimonio-*`.

Regenerar fixtures con `exportar_fixtures_front.py` (cambian los códigos de ocupación, la escala de los casos de `ruta` y `CasoCuenta`) y agregar `ruta-ocupaciones-caso`.

### Fase 4 · Front (modo api)

1. **Casos como JSON.** `src/data/cases/plataforma/*.json`, registrados con import explícito en `src/data/cases/casos.ts` (clave = `id`). Tipo `CasoJson` según el formato del contexto y un adaptador `casoDesdeJson` a las estructuras internas actuales (`ForestFirePhase`, `ForestFireProblem`…), para que los componentes cambien lo mínimo.
2. **La vista lee el caso.** `ForestFireCaseView` y sus componentes (`ProfessionalDirectory`, `PhaseResultScreen`, `FinalReportScreen`, `ForestFireWorkspace`, `ForestFireProfessionalPanel`) reciben el caso por contexto o prop en vez de importar `forestFirePhases` y `forestFireProfessionals`. `forestFireCaseLogic.ts` recibe el caso: presupuesto del JSON (también el texto «Usaste los N puntos»), máximo y umbral del servidor en api; las constantes `FOREST_FIRE_*` quedan solo para local. `ForestFireCasePage` deja de redirigir todo lo que no sea `forest-fire`: busca el caso en el registro y la actividad que lo juega.
3. **Ocupaciones del caso.** Al entrar, una sola petición a `GET …/ocupaciones-caso` con los `onet` del directorio; con esa respuesta se arman el directorio (cargo = título de la ocupación) y la hoja de vida (`useHojaDeVida` deja de pedir el detalle en api). Mientras carga, la pantalla de carga; si falla, su error.
4. **Intro.** `ExplorationCaseIntroView` toma narrativa, imagen y alerta del JSON y el título del servidor (actividad); el ícono de llama pasa a uno genérico de la Central. Topbar: «Central de casos · <título del servidor>».
5. **Temática.** `textoTiposCaso` se retira; donde se mostraba «Tipo del caso: …» se muestra la `tematica` del JSON. `CasoCuenta` pierde `dimensiones` en `types/servidor.ts`.
6. **Sin nube de palabras ni pregunta extra** en api: `SHOW_EXTRA_PROFESSIONAL` ya es `false`; sus pantallas quedan solo para local.
7. **Imágenes.** Si un fondo o la imagen de la intro no existe, se usa `exploration-case-background.png`; las faltantes se anotan en `pendientes-interfaz.md`.
8. **Ids de ocupación en api.** Lo que en api compara o arma rutas con códigos de ocupación (colección, catálogo, investigaciones) ya usa lo que da el servidor; se revisa que nada en api dependa de un slug (`catalogSelectors`, `catalogDetails`, `travelerResources`, `research.ts`) y, si algo depende, se registra en `pendientes-interfaz.md` en vez de inventar un mapeo.

Pruebas del front que se adaptan (autorizado): `tests/servidor/casos` (sin `textoTiposCaso`, con `tematica` y la escala de `hidden-plaza`; la comprobación de `CONFIGURACION_CASOS` pasa a leer los JSON de `plataforma/`) y las que nombran ocupaciones por slug en fixtures `ruta-*`. Nuevas: el adaptador `casoDesdeJson` sobre cada JSON de `plataforma/` (sin errores y con el total de necesidades del catálogo). `tests/local/casos` no cambia.

### Fase 5 · Cierre

- Suites completas de ambos repos; `verificar_contenido_front.py` sin errores en `ruta` y `contenido` (avisos de imágenes permitidos).
- Documentos: `motor.md` (catálogo sin `actividad_dimension`; código de ocupación = O*NET), `instrumentos.md` (columna `codigo` de `ocupacion`, sin `en_catalogo` ni ocultas), `integracion.md` (`CasoCuenta`, endpoint `ocupaciones-caso`, los casos de `contenido` y el formato del JSON de caso, la lista de lo provisional, `ruta` jugando `hidden-plaza`), `AGENTS.md` del front (dónde va un caso: `src/data/cases/`).
- `decisiones.md`: una viñeta por cada decisión de abajo.

### Decisiones del usuario

- Los seis casos se abren con la Ciudad (COMPLETA_ACTIVIDAD b1-3); las reglas propias de cada caso se agregan después.
- Testimonios de prueba con códigos provisionales `tc1-1`…`tc6-2`; los reales se cargan sobre esos códigos.
- Duración: el límite inferior del rango del catálogo.
- El incendio forestal y sus ocupaciones fuera del catálogo salen de la plataforma: sin ocupaciones ocultas; todo caso y testimonio nombra ocupaciones del catálogo. `ruta` pasa a jugar `hidden-plaza`.
- Una sola petición al entrar al caso trae las ocupaciones de su directorio (título y hoja de vida).
- Las necesidades no se cargan en el servidor; el script de coherencia mantiene sincronizados `CONFIGURACION_CASOS` y los JSON.
- El modo local se mantiene congelado con `forestFireCase.ts` y los slugs del catálogo del front.

### Preguntas abiertas

Ninguna. Documento listo para `/ajuste carga-casos`.
