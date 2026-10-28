# Spec · ajuste inicio-apoderado

Texto de observaciones para `/ajuste inicio-apoderado`. Rediseño ligero del Inicio del apoderado (`ParentOverviewView`) en modo api, con varios hijos y conectado de verdad al backend.

Bocetos (lienzo «Inicio del apoderado · rediseño», exportados a PNG; ábrelos con Read antes de la fase de pantallas): `ov_backend/docs/specs/bocetos/ajuste-inicio-apoderado/`
- `A-inicio-sin-diploma.png`: varios hijos y el apoderado sin completar su ruta (candado en los resultados).
- `B-inicio-con-diploma.png`: otro hijo elegido (Luis), el apoderado con diploma: clave y «Ver resultado».
- `C-estados-tarjetas.png`: los estados de la tarjeta de conversaciones, el caso sin hijo vinculado y el skeleton de carga.
- `D-inicio-telefono.png`: la misma pantalla a 390 px (todo en una columna, selector a dos columnas, botones a todo el ancho).

Las vistas deben quedar lo más cercanas posible a los bocetos, con el tema `theme-staff` y los componentes actuales del portal (`StaffEntityHeader`, `StaffMetric`, `Card`, `Badge`, `Progress`, `ActivityStatus`/`QuestionnaireStatus`). Íconos de lucide, nunca emojis. Criterios para un público poco digital: texto base de 16 px, botones de 48 px de alto, una sola acción principal por tarjeta, los estados se dicen con palabras (no solo con color) y los íconos siempre van acompañados de texto. Los cuestionarios del boceto (Partida y llegada, Autoeficacia) son ilustrativos: se muestran los que entregue el servidor.

## Diagnóstico (verificado con `datos.cargar ruta`, cuenta `apo-rosa`)

1. **Los cuestionarios no llegan.** `GET /familia/resultados` responde «Completa tus actividades para ver los resultados de tu hijo», porque `services/familia.py::resultados_hijo` exige el diploma del apoderado. Además, solo devuelve los instrumentos que tienen resultado, así que no existe forma de mostrar «aún no lo completa».
2. **Conversaciones muestra un estado inventado.** Para el apoderado, la sección `CONVERSACIONES` se abre cuando completa su bloque `FAMILIA`, no cuando el hijo avanza. Cuando el servidor responde con ese bloqueo, `useParentOverview` cae a `conversationSummary(...)` con datos de demostración y el estado local (por ejemplo, «1 conversada, 4 pendientes» sobre 5 temas). Si no hay datos, muestra «se habilitarán a medida que Ana avance», que es falso.
3. **Solo un hijo.** `GET /familia` devuelve un único `estudiante` (`_hijo(...).limit(1)`), aunque `ruta.py` ya vincula a Rosa con Ana y con Luis y Conversaciones ya maneja varios hijos.
4. **Funciona bien:** el avance del hijo y el del apoderado (`avance_ruta`). `nivel_actual` llega del backend pero no se muestra.

## Decisiones

- **El Inicio es un resumen.** Lo que más pesa es la tarjeta del hijo (avance y cuestionarios). Actividades y Conversaciones quedan como dos tarjetas compactas que enlazan a su pestaña, sin repetir su detalle.
- **Varios hijos.** «Mis hijos» lleva un selector de chips (iniciales y nombre) solo si hay más de un hijo. Se muestra una tarjeta del hijo elegido a la vez. El hijo elegido es el mismo de la sección Conversaciones: se usan `hijoActivo()` y `elegirHijo()` de `store/servidor/apoderadoConversaciones.ts`, de modo que al entrar a Conversaciones sigue elegido, y viceversa. También se refleja en `?child=<codigo>`. La tarjeta «Conversaciones con {nombre}» es siempre del hijo elegido. «Tus actividades» es del apoderado y no cambia con el hijo, porque su ruta es una sola.
- **Candado de resultados (se mantiene la intención de B12).** La lista de cuestionarios y su estado (completado con fecha o pendiente) se ven siempre. La clave (R · C · E) y el botón «Ver resultado» aparecen solo con el diploma obtenido. Sin diploma, en lugar del botón va «🔒 Verás su resultado al completar tus actividades», solo en las filas que tienen algún resultado.
- **«Ver resultado» lleva directo a la vista explicada** (`ParentQuestionnaireDetailView`, `parentResultUrl(hijo, instrumento)`), sin vista resumida intermedia.
- **El título actual del hijo** (`nivel_actual.titulo`) va bajo su nombre: «Título actual · …». Si es nulo, no se muestra la línea.
- **La métrica «Su avance hacia el diploma» sale de la tarjeta del hijo** y pasa a la tarjeta «Tus actividades», porque cuenta las mismas actividades.
- **En modo api no hay respaldo a datos de demostración.** Si el servidor falla, la tarjeta lo dice y ofrece «Reintentar». El modo local queda congelado y conserva su rama actual (`ParentChildrenSummary` de demostración, `conversationSummary`).

## Backend (sin cambio de modelo; sí cambia el contrato)

1. `GET /cuentas/{c}/familia`
   - `estudiante: EstudianteVinculado | None` pasa a `estudiantes: list[EstudianteVinculado]`. Incluye todos los vínculos activos del apoderado, en el mismo orden que usa hoy `_hijo` (por `VinculoFamiliar.codigo`). Sin vínculos, la lista va vacía.
   - `EstudianteVinculado` suma `cuestionarios: list[CuestionarioHijo]`. Son los instrumentos con `SalonInstrumento.visible_apoderado` en el salón de ese hijo, ordenados como `resultados_hijo`. Se entregan siempre, tenga o no diploma el apoderado:
     ```
     CuestionarioHijo: instrumento (código), nombre,
       aplicaciones: list[{aplicacion (código), nombre, momento (UNICA|ENTRADA|SALIDA), completado_en: datetime | None}]
     ```
     `completado_en` es `calculado_en` del `ResultadoInstrumento` vigente (`anulado_en IS NULL`) del hijo en esa aplicación. Si no hay ninguno, va nulo. No lleva puntajes ni dimensiones: eso sigue en `/familia/resultados`.
2. `GET /cuentas/{c}/familia/resultados?estudiante=<codigo>`: el parámetro es opcional. Sin él, se usa el primer vínculo activo, igual que en Conversaciones. Si el código no es de un hijo suyo, responde 404. Se mantiene la exigencia del diploma.
3. Pruebas: varios hijos en `estudiantes`; un cuestionario sin resultado (`completado_en` nulo); un resultado anulado que no cuenta; un instrumento no visible al apoderado que no aparece; un instrumento de entrada y salida con una sola aplicación completada; `?estudiante=` con un hijo ajeno (404); y que los cuestionarios se entregan sin diploma mientras los resultados siguen bloqueados.
4. Datos: `ruta.py` ya tiene a Rosa con Ana y Luis, ambos de 5A. Si el plan lo ve simple, se marca también el instrumento de partida y llegada como visible al apoderado en 5A (`DATO DE PRUEBA`) para probar los dos chips. Si choca con la regla de que la COMPARACION es obligatoria, se deja como está y se anota.
5. Contrato completo: `types/servidor*.ts`, `services/api/familia.ts`, adaptadores, fixtures exportados y pruebas del front.

## Frontend (solo modo api)

**Inicio (`ParentOverviewView` / `useParentOverview`)**
- Saludo igual que hoy. Debajo, «Mis hijos» con el selector (si hay más de un hijo), la tarjeta del hijo elegido y, después, una grilla de dos columnas con «Tus actividades» y «Conversaciones con {nombre}». En móvil, la grilla pasa a una columna.
- **Tarjeta del hijo:** iniciales, nombre, título actual y la métrica «Avance de {nombre}» (porcentaje, barra y «N de M actividades»). Después, «Sus cuestionarios», con una fila por cuestionario:
  - Nombre y un chip por aplicación. UNICA: «✓ Completado · fecha» o «◷ Aún no lo completa». ENTRADA y SALIDA: «✓ Partida · fecha» o «◷ Partida pendiente», y «✓ Llegada · fecha» o «◷ Llegada pendiente».
  - Con diploma y resultado: bajo los chips, «Lo que más destaca: **Social · Artístico · Investigador**» (nombres completos de las dimensiones protagonistas, no las letras; o el texto de perfil plano que ya usa `ResultadosResumidos`) y el botón «Ver resultado» a la derecha.
  - Sin diploma y con algún resultado: «Verás su resultado cuando completes tus actividades», con ícono de candado, en lugar del botón.
  - Sin resultado: nada a la derecha.
  - Al final, la nota de resultados exploratorios, solo si hay al menos un botón «Ver resultado».
  - Sin cuestionarios visibles: «Por ahora no hay cuestionarios compartidos con las familias.»
- **Tus actividades:** con la ruta incompleta, el badge «Te falta N», «Siguiente: {título}», una barra con «N de M actividades · hacia tu diploma» y el botón primario «Continuar →» hacia la siguiente actividad (como hoy). Con la ruta completa, el chip «Ruta completada», «Completaste tus M actividades. Tu diploma ya está listo.» y el botón secundario «Ver mis actividades y diploma» hacia Mis actividades. En una pantalla hay como máximo un botón primario por tarjeta.
- **Conversaciones con {nombre}:** se lee con `useConversacionesApoderadoSeccion` del hijo elegido. Sus estados están en el boceto C:
  - Sección bloqueada: el mensaje de bloqueo que entrega el servidor (con candado) y «Ver conversaciones» (secundario).
  - `carta_pendiente`: «Antes de conversar, escríbele una carta a {nombre}.» y «Escribir mi carta» (primario, ruta de la carta).
  - En curso con alguna en `te_toca`: badge «{nombre} te espera en N», barra, «N de M conversaciones» y «Seguir conversando» (primario).
  - En curso sin ninguna en `te_toca`: barra, «N de M conversaciones · ahora le toca a {nombre}» y «Ver conversaciones» (secundario).
  - Completas (`completadas == total`): chip «6 de 6», «Conversaron sobre todo. Hay un regalo esperándolos.» y «Abrir el regalo» (primario).
  - Error: «No pudimos cargar las conversaciones. Revisa tu conexión e inténtalo de nuevo.» y «Reintentar».
  - Cargando: un skeleton del tamaño de la tarjeta.
- Sin hijo vinculado (`estudiantes` vacía): solo «Todavía no tienes un hijo vinculado. Pídele a la orientadora del colegio que te vincule.». No se muestran la tarjeta de conversaciones ni la del hijo; «Tus actividades» se mantiene.
- Se elimina en modo api la rama de demostración de `useParentOverview` (`conversationSummary`, `variosHijos` de `parentChildren`) y el texto «se habilitarán a medida que…». `ParentConversationNotice` y `ParentRouteSummary` se reemplazan o se adaptan en api. `ParentChildServerSummary` se rehace según el boceto.
- Loader: un skeleton de la tarjeta del hijo mientras carga `/familia`, y los resultados (para la clave) con su propio estado de carga dentro de las filas.

**Resto de consumidores de `familia.estudiante`** (pasan a `estudiantes` y al hijo elegido): `ParentQuestionnaireDetailView` (toma el hijo de `:childId`, pide `/familia/resultados?estudiante=`, y el enlace de vuelta va al Inicio con ese hijo), `useResultadosHijo` (recibe el código del hijo), `lib/familia.ts` (`nombreHijo`), `useParentActivities` y `store/servidor/apoderado.ts`. Hay que revisar con Grep que no quede ningún uso de `.estudiante` de `FamiliaApoderado`. Los componentes de `family-conversations` que solo usan `avatares.estudiante` no se tocan.

## Qué no cambia

- Las pestañas Mis actividades y Conversaciones, la carta, el regalo y el diploma.
- `avance_ruta`, la regla del diploma (`_diploma`) y la regla que abre la sección Conversaciones al apoderado.
- La vista explicada de resultados del apoderado, salvo que toma el hijo desde la URL.
- El modo local.

## Fases sugeridas

1. Backend: `estudiantes`, `cuestionarios`, `?estudiante=`, pruebas, datos y fixtures.
2. Front, contrato: tipos, servicio, adaptadores y consumidores de `estudiante` → `estudiantes`, más `ParentQuestionnaireDetailView`.
3. Front, Inicio según los bocetos A, B y C: selector compartido con Conversaciones, tarjeta del hijo, las dos tarjetas compactas, quitar la rama de demostración en api, y pruebas.
4. Cierre: suites completas, `decisiones.md` y `docs/sistema/` (familia).


## Ajuste · inicio-apoderado

### Contexto

Las observaciones del usuario (`ajuste-inicio-apoderado.md`, con los bocetos A–D) piden rehacer el Inicio del apoderado en modo api: varios hijos, los cuestionarios del hijo siempre visibles (los resultados siguen con candado hasta el diploma) y una tarjeta de Conversaciones que no invente estados. No hay spec en curso en `ov_backend/docs/specs/`, así que el ajuste tendrá la suya: `ov_backend/docs/specs/ajuste-inicio-apoderado.md`. Los bocetos (imágenes adjuntas) se guardan en `ov_backend/docs/specs/bocetos/ajuste-inicio-apoderado/` con los nombres A–D que da el texto.

Rama: la sesión exige trabajar en `claude/ajuste-pantalla-inicio-apoderado-6ja55n` (ya creada desde `main`); se usa esa en lugar de `ajuste/inicio-apoderado`.

### Qué cambia y por qué

**Backend**
- `app/services/familia.py::_hijo`: hoy devuelve el primer vínculo (`limit(1)`). Pasará a `_hijos` (todos los activos, por `VinculoFamiliar.codigo`) y a `_hijo(sesion, cuenta, estudiante=None)`: con código, el vínculo activo de ese estudiante o 404 «El estudiante no es su hijo» (mismo texto que `conversaciones._vinculo`); sin código, el primero.
- `consultar_familia`: hoy arma `estudiante` con un hijo. Pasará a `estudiantes: list[EstudianteVinculado]`, cada uno con `cuestionarios` (nuevo `_cuestionarios(sesion, hijos)`): instrumentos `visible_apoderado` del salón de cada hijo, por código de instrumento; aplicaciones por código, con `momento` y `completado_en` = `calculado_en` del resultado vigente (`anulado_en IS NULL`). Una sola consulta de `ResultadoInstrumento` para todos los hijos (`cuenta_id IN`, `aplicacion_id IN`); definiciones de la caché.
- `resultados_hijo(sesion, cuenta, estudiante=None)` y `app/api/familia.py`: hoy sin parámetro. Pasará a aceptar `?estudiante=` opcional. El diploma se sigue exigiendo antes (409); hijo ajeno → 404.
- `app/schemas/familia.py`: `AplicacionHijo {aplicacion, nombre, momento, completado_en}`, `CuestionarioHijo {instrumento, nombre, aplicaciones}`, `EstudianteVinculado.cuestionarios`, `FamiliaApoderado.estudiantes`.

**Frontend (solo api)**
- Contrato: `types/servidorFamilia.ts` (`estudiantes`, `CuestionarioHijo`, `AplicacionHijo`), `services/api/familia.ts` (`obtenerResultadosHijo(cuenta, estudiante)`), `store/servidor/apoderado.ts::consultarResultadosHijo(estudiante)`.
- `features/parent/lib/familia.ts`: `nombreHijo` hoy lee `familia.estudiante`; pasará a recibir el hijo elegido (`hijoElegido(familia, codigo)` = el de `hijoActivo()` o el primero). Más un selector puro `estadoCuestionario` (chips: UNICA «Completado · fecha» / «Aún no lo completa»; ENTRADA/SALIDA «Partida · fecha» / «Partida pendiente», «Llegada · fecha» / «Llegada pendiente»; y si tiene algún resultado).
- `useResultadosHijo(familia, codigoHijo)`: hoy pide sin hijo; pasará a pedir con el código y reiniciar al cambiar de hijo.
- `useParentOverview`: en api, el hijo elegido sale de `hijoActivo()`/`elegirHijo()` (`store/servidor/apoderadoConversaciones.ts`) y se refleja en `?child=` (si la URL trae un hijo válido, se elige al entrar). Se quita en api el respaldo a `conversationSummary`, `variosHijos` y `parentChildren`; el modo local conserva su rama tal cual.
- Vista (`ParentOverviewView`) en api, según bocetos A, B, C y D:
  - «Mis hijos» + selector de chips (iniciales y nombre; solo con >1 hijo; dos columnas en móvil) + tarjeta del hijo (`ParentChildServerSummary` rehecho: `StaffEntityHeader` con «Título actual: …» si hay nivel, `StaffMetric` «Avance de {nombre}», «Sus cuestionarios» con una fila por cuestionario: chips `Badge` con ícono + texto, «Lo que más destaca: **…**» o el texto de perfil plano, «Ver resultado» (`parentResultUrl`) o el candado «Verás su resultado cuando completes tus actividades»; nota exploratoria solo si hay algún «Ver resultado»; vacío: «Por ahora no hay cuestionarios compartidos con las familias.»). Los resultados (para la clave) se cargan dentro de las filas con su propio estado; error con «Reintentar».
  - Grilla de dos columnas (una en móvil): `ParentActivitiesCard` («Tus actividades»: «Te falta N», «Siguiente: …», barra «N de M actividades · hacia tu diploma», «Continuar →»; completa: «Ruta completada», texto del diploma y «Ver mis actividades y diploma» secundario; conserva `diplomaRef`/`?diploma=1`) y `ParentConversationsCard` («Conversaciones con {nombre}», los siete estados del boceto C; bloqueada = respuesta 409 con su mensaje; error de red = mensaje de error + «Reintentar»; cargando = skeleton).
  - Sin hijos: solo «Todavía no tienes un hijo vinculado. Pídele a la orientadora del colegio que te vincule.» y «Tus actividades».
  - Mientras carga `/familia`: skeleton de la tarjeta del hijo.
  - Botones de 48 px (`min-h-12`), texto base 16 px, íconos lucide con texto.
  - En local, `ParentChildrenSummary`, `ParentConversationNotice` y `ParentRouteSummary` siguen iguales; la vista elige por una bandera del hook (`usaInicioServidor`), no por `modoApi`.
- `ParentQuestionnaireDetailView`: hoy usa `familia.estudiante`; pasará a tomar el hijo de `:childId` entre `familia.estudiantes`, pedir `/familia/resultados?estudiante=` y volver al Inicio con ese hijo (`parentHomeUrl`).
- Otros consumidores (`useParentActivities`, `apoderado.ts`, pruebas): de `estudiante` a `estudiantes`. Grep final sin `.estudiante` de `FamiliaApoderado`.

### Qué no cambia

- `avance_ruta`, `_diploma`, la regla que abre CONVERSACIONES al apoderado y el bloqueo de `/familia/resultados` sin diploma.
- `/conversaciones` y su almacén (solo se reutilizan `hijoActivo`, `elegirHijo` y `useConversacionesApoderadoSeccion`); las pestañas Mis actividades y Conversaciones, carta, regalo y diploma; los componentes de `family-conversations`.
- La vista explicada de resultados (solo toma el hijo de la URL) y el modo local completo.

### Modelo de datos

Sin cambios (no hay tablas ni columnas nuevas; `Aplicacion.momento` y `ResultadoInstrumento.calculado_en/anulado_en` ya existen). Sí cambia el contrato de `/familia`.

### Backend · pruebas

En `tests/integration/familia/test_familia.py`: se adaptan (lo autoriza el cambio de contrato) `test_avance_y_nivel_del_hijo` y `test_sin_vinculo_activo_no_hay_estudiante` a `estudiantes`; `test_resultados_del_hijo_…` no cambia. Nuevas: varios hijos en `estudiantes` (Ana, Luis, en orden); cuestionario sin resultado (`completado_en` nulo); resultado anulado que no cuenta; instrumento no visible que no aparece; partida y llegada con solo la partida completada (la prueba crea su fila `SalonInstrumento` visible); `?estudiante=est-luis` y `?estudiante=` ajeno (404); cuestionarios entregados sin diploma mientras `/familia/resultados` sigue en 409. Prueba de presupuesto de consultas de `/familia` si ya existe una para el dominio (no crecer con hijos).

### Datos

- `datos/ruta.py`: sin cambios (solo el Test de intereses es visible al apoderado en 5A).
- Fixtures del front regenerados con `scripts/exportar_fixtures_front.py`; se agrega `apoderado-familia-resultados-luis` (con `?estudiante=est-luis`) si el recorrido lo permite sin alterar los demás.

### Fases

1. **F1 · Backend**: esquemas, servicio, API, datos, pruebas, fixtures exportados. Pruebas: `tests/integration/familia`, `tests/integration/datos`, `tests/integration/motor` (prioritarios), `tests/integration/escenarios`.
2. **F2 · Front, contrato**: tipos, servicio, almacén, `lib/familia.ts`, `useResultadosHijo`, consumidores de `estudiante`, `ParentQuestionnaireDetailView`; el Inicio sigue funcionando con el primer hijo. Pruebas: `npm run test:servidor`, `tests/local/portales`, `tests/local/perfil`.
3. **F3 · Front, Inicio**: selector compartido, tarjeta del hijo, dos tarjetas compactas, estados de conversaciones, skeletons, quitar la rama de demostración en api; pruebas de render en `tests/servidor/familia` (uno y dos hijos, con y sin diploma, cada estado del boceto C, sin hijos). Comparación visual contra los bocetos con Playwright a 1280 y 390 px.
4. **F4 · Cierre**: suites completas (back y front + build, lint, estructura), `decisiones.md`, `docs/sistema/integracion.md` (filas de `/familia` y `/familia/resultados`, fixtures), `ov_frontend/docs/origen-de-datos.md` si corresponde. La spec queda en curso.

Commits `Ajuste inicio-apoderado · F<n>: …`; push a la rama de la sesión al terminar.

### Observaciones del usuario al aprobar

0. **Datos:** no se agrega `TEST-PARTIDA-LLEGADA` a `SALON_INSTRUMENTOS` en `ruta.py`: ese cuestionario mide también la presión de la familia y no se comparte con los apoderados. Solo sigue visible el Test de intereses, así que `test_resultados_del_hijo_…` no se adapta. ENTRADA/SALIDA queda contemplado en el código y se prueba con una fila `SalonInstrumento` creada dentro de la prueba.
1. **Partida y llegada, si llegara a ser visible:** `/familia/resultados` devuelve un resultado por aplicación (partida y llegada) con el mismo instrumento. El Inicio muestra una sola fila por instrumento y, para ENTRADA/SALIDA, la clave y «Ver resultado» usan el resultado de llegada si existe y, si no, el de partida; la vista explicada aplica el mismo criterio. La comparación partida→llegada para el apoderado va a `ov_frontend/docs/pendientes-interfaz.md`.
2. **Rama:** se trabaja en la rama de la sesión y se hace push al terminar; al cerrar, la integración sigue el patrón `ajuste/<nombre>`.
3. **Bocetos:** antes de F1 se guardan los cuatro bocetos adjuntos en `ov_backend/docs/specs/bocetos/ajuste-inicio-apoderado/` con los nombres A–D; en F3 se comparan las capturas de 1280 y 390 px contra ellos.

### Verificación

- Back: `uv run pytest -n auto -q` y `uv run alembic heads` (uno).
- Front: `npm test`, `npm run build`, `npm run lint`, `npm run check:estructura`.
- Manual: backend con `datos.cargar ruta`, front con `VITE_DATOS=api`, ingresar como `apo-rosa`: dos chips, cambiar a Luis y entrar a Conversaciones (sigue Luis), cuestionarios con candado antes del diploma y «Ver resultado» después; capturas a 1280 y 390 px comparadas con los bocetos.
