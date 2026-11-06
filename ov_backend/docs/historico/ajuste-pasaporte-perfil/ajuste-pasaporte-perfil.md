# Ajuste · pasaporte-perfil

Rama `ajuste/pasaporte-perfil` (creada desde `main`). No hay spec en curso: este plan, aprobado, se guarda como `ov_backend/docs/specs/ajuste-pasaporte-perfil.md`.

## Contexto

Rediseño del **Pasaporte vocacional** y de **Mi perfil** del estudiante según el texto de observaciones `ajuste-pasaporte-perfil.md` (bocetos «Pasaporte vocacional – rediseño»). Hoy esas pantallas mezclan datos del servidor con textos y agrupaciones fijas del front (grupos de `getAchievementPresentations()`, `travelerLevels[].description/nextStep`, vitrina en `localStorage`, requisito redactado en el front). El ajuste lleva al servidor grupos, pistas, fechas, descripciones de nivel, textos de condición, tramos y vitrina, y rehace la presentación. El texto de observaciones es la spec; aquí solo se fija cómo se implementa y qué cambia respecto de él.

**Correcciones del usuario al texto (prevalecen):**
1. **Modo local:** una sola implementación para ambos modos, como **excepción nº 16** al modo local congelado. En local las vistas nuevas se alimentan con sus datos actuales: grupos fijos de `getAchievementPresentations()` como «páginas», `travelerLevels` para título y descripción, las reglas locales como una sola condición (texto = `nextStep` del nivel o `description` de la insignia), vitrina en `localStorage` como hoy, y sin pista en las secretas («Lumi todavía no quiere contarte nada de este sello»). Se aceptan los cambios de textos y orden en local; se adaptan `tests/local/perfil` y los tests locales del pasaporte que rompan, sin casos nuevos. Se anota en `ov_frontend/AGENTS.md`.
2. **Vitrina por POST, no PUT:** `POST /acciones/vitrina` con `{cuenta, codigos}`, reemplazo completo; `[]` la vacía. El front usa `enviar` desde `services/api/logros.ts`. No se agrega método PUT a `cliente.ts`.

## Qué cambia (hoy → pasará a)

**Backend**
- `app/services/logros.py::logros_cuenta`: hoy lista insignias por código con `codigo/nombre/descripcion/requisito/estado` y niveles con `numero/titulo/estado`. Pasará a ordenar por `grupo.orden, orden, codigo` y añadir `grupo{codigo,nombre,orden}`, `orden`, `pista`, `obtenida_en` (la menor `desbloqueo.fecha_hora` entre las reglas de la insignia; una consulta agrupada, sin bucles), `vitrina: [codigo]` y `niveles[].descripcion`. La secreta no obtenida sigue enmascarada pero conserva `grupo`, `orden` y `pista` (`obtenida_en` null).
- `app/services/motor/reglas.py::evaluar_regla`: hoy `ProgresoCondicion` sin texto. Pasará a incluir `texto` (de `CondicionDesbloqueo.texto`). Como `ProgresoCondicion` también va en `bloqueo.condiciones_faltantes` y `nuevos_desbloqueos`, `texto` aparecerá en esas respuestas (nullable).
- `app/services/cuentas.py` (resumen) y `familia.py`: `NivelActual` gana `descripcion` (esquema compartido; el hijo del apoderado también la trae).
- `app/services/avance.py::avance_estudiante`: hoy devuelve `camino`, `tramo_actual`, `camino_completo`, `ciudad`. Pasará a añadir `tramos: [{codigo,nombre,numero,completadas,total,estado: COMPLETO|ACTUAL|PENDIENTE}]` (requeridas, total fijo) y `requeridas: {completadas,total}`, reutilizando el mismo bucle por bloque.
- Nuevo: `POST /acciones/vitrina` (`app/api/acciones.py` o el router de acciones vigente; servicio en `app/services/logros.py::guardar_vitrina`), en la transacción de `ejecutar_accion`, sin eventos. Responde `{vitrina: [codigo]}`. Rechaza más de 3 códigos, repetidos, inexistentes o no obtenidos (ver pregunta 1 sobre el código HTTP).

**Frontend** (una implementación, ambos modos)
- `lib/servidor/adaptadores.ts`: `insigniasServidor(logros)` deja de recibir presentaciones y agrupa por `grupo` del servidor (desaparece el grupo de respaldo); se eliminan `textoRequisitoInsignia` y `insigniasOcultasPendientes`; nuevo `condicionesObjetivo(progreso, respaldo)` → `{bloques: [[{texto, cumplida, actual, requerido, conteo}]], cumplidas, total}` (resumen = regla más avanzada; fila sin `texto` usa el respaldo: `requisito` de la insignia o `mensaje_bloqueo` de la regla). Ícono por código desde `achievementIcons` con genérico por defecto.
- Hooks (`features/discovery/hooks/`): `usePassport`, `useBadgeDetail`, `useStudentProfile` devuelven un mismo modelo en ambos modos (páginas, título actual y siguiente, condiciones, vitrina, tramos). Nuevo `useProgresoNivel(numero)` sobre `consultarProgreso('NIVEL', 'N…')`; en local, una condición con el `nextStep`.
- Vitrina: en api, se lee de `logros.vitrina` y se escribe con una operación nueva en `store/servidor/` que llama a `enviarVitrina` y actualiza `logros`; sin valor por defecto «tres primeras». `store/discoveryStore.ts`: `profileBadgesApi` deja de usarse en api (se conserva la clave y su validación para no romper lo guardado; se retira `/^I\d+$/` solo del camino api). En local, `getProfileBadges`/`toggleProfileBadge` siguen como hoy.
- Fecha del modal: `obtenida_en` en api (reemplaza `fechasInsignias` en el modal; los avisos no cambian).
- Vistas: `StudentPassportView.tsx` se parte en `PassportLevelCard.tsx`, `PassportGroup.tsx`, `PassportBadgeCard.tsx` y `ConditionList.tsx` (lista común del modal y de «Siguiente título»); `PassportBadgeDialog.tsx` con los tres estados de 1.5. `pages/student/StudentProfileView.tsx` compone `ProfileHeader`, `ProfileAchievements`, `ProfileHelena`, `ProfilePlans` (en `features/discovery/components/`) y `RouteLine.tsx` (nuevo, en `components/student/`, solo props). Textos y estructura: secciones 1–2 del texto.
- Línea de ruta en local: un solo tramo «Misiones de campo» con `completadas/total` de `getZoneProgress('missions')` (opción más simple; local no tiene tramos).
- Estilos en `features/discovery/styles/passport.css` y `styles/student/discovery.css`, tokens existentes.

## Qué no cambia

Motor de reglas, evaluadores y `objetivo_disponible`; `GET /progreso/...` (solo gana `texto` en cada condición); `afinidad` de `/logros` y del menú lateral; el menú lateral del mapa; `tramo_actual`, `camino`, `ciudad`, `camino_completo`; el libro de Helena y su revelado; planes y favoritos (siguen locales: el capítulo III solo cambia de presentación); `BadgeToast`, la cola de desbloqueos y `fechasInsignias` de los avisos; la pantalla de cierre de actividad; HU-077 (perfil de compañero).

## Modelo de datos (decisión de diseño a aprobar; sigue `/cambio-modelo`)

Una migración nueva:
- Tabla `grupo_insignia(id, codigo unique, nombre, orden)` (catálogo).
- `insignia`: `grupo_id` FK obligatorio (el texto dice `id_grupo`; se usa `grupo_id` por la convención `bloque_id`/`familia_id`), `orden` int, `pista` Text nullable.
- `nivel.descripcion` Text nullable.
- `condicion_desbloqueo.texto` String nullable.
- Tabla `insignia_vitrina(cuenta_id, insignia_id, orden)`, PK `(cuenta_id, insignia_id)`, único `(cuenta_id, orden)`, `CHECK orden BETWEEN 1 AND 3`. Es estado: va a `TABLAS_DE_ESTADO`.
- `obtenida_en`: `desbloqueo.fecha_hora` ya existe; no hace falta columna (decisión 7.3 del texto verificada).
- La migración rellena `grupo_id` de filas existentes creando un grupo por defecto antes de volverlo obligatorio.

## Datos (`datos/ruta.py`, `DATO DE PRUEBA`)

- `GRUPOS_INSIGNIA`: `G1` «La luz que despeja caminos» (1), `G2` «Huellas en la ciudad» (2). `INSIGNIAS` gana grupo, orden y pista: `t-ins-1`, `t-ins-oculta` → G1; `t-ins-familias`, `t-ins-letras`, `t-ins-instituciones` → G2; pistas en voz de Lumi para las cuatro ocultas.
- Condiciones de `REGLAS` ganan un 5.º elemento opcional `texto` (el cargador lo admite); texto en todas las de insignias y niveles.
- `NIVELES` gana descripción (textos de `travelerLevels` 1 y 2) y se agrega el nivel 3 «Cartógrafo de posibilidades» con `R-NIV-3`: `COMPLETA_BLOQUE T0` + `VISTA_CARRERA` `REFERENCIAS_DISTINTAS` ≥ 3 (la ruta corta ve una sola carrera, así que no lo alcanza: el nivel final de los escenarios sigue siendo 2).
- Se regeneran todos los fixtures `ruta-*` (cambian `logros`, `avance`, `resumen`, bloqueos y desbloqueos por `texto`). El exportador agrega `ruta-vitrina` (guardar una) y `ruta-progreso-nivel-3`.

## Pruebas

- Backend nuevas: `tests/integration/logros/` (grupos y orden, secreta con grupo y pista, `obtenida_en`, vitrina en `/logros`), `POST /acciones/vitrina` (reemplazo, vacío, >3, no obtenida, otra cuenta 404), `/avance` con `tramos` y `requeridas`, `texto` en `/progreso`. Presupuesto de consultas de `/logros` sin crecer.
- Backend adaptadas (autorizado por el texto): las que cuentan dos niveles o comparan la forma exacta de `/logros`, `/avance`, `/resumen` y `ProgresoCondicion`; anotadas en `decisiones.md`.
- Front: `tests/servidor/logros` y `tests/servidor/perfil` pasan a los fixtures `ruta-*` en lo que toca insignias (los de la raíz con `I1…I10` no traen `grupo`); se adaptan las que afirman lo que el texto elimina (ocultas fuera de la grilla, «N de 3 misiones», «Reintentar requisito», vitrina en `localStorage` en api, «tres primeras» por defecto). Casos nuevos solo en `tests/servidor/`. `tests/local/perfil` y los locales del pasaporte se adaptan por marcado y textos, sin casos nuevos.

## Fases

1. **Backend · modelo, datos y endpoints**: migración, modelos, cargador y `ruta.py`, esquemas, `logros`, `avance`, `texto` en condiciones, `POST /acciones/vitrina`, `docs/sistema/motor.md` e `integracion.md`, fixtures regenerados, tipos y adaptadores del front que el cambio de contrato obliga (sin vistas). Pruebas: logros, avance, motor, migraciones, datos, contrato, escenarios; `npm run test:servidor`.
2. **Frontend · pasaporte**: cabecera, tarjeta de título con condiciones y sendero, páginas, tarjeta descargada, modal en tres estados, vitrina contra el servidor; local alimentado como se dijo. Pruebas: `tests/servidor/{logros,perfil,instrumentos}`, `tests/local/perfil`, `npm run test:servidor`.
3. **Frontend · perfil**: cabecera con línea de ruta y vitrina centrada, capítulos I–III, pie. Mismas carpetas.
4. **Cierre**: suite completa de ambos repos (`pytest -n auto`, `npm test`, `build`, `lint`, `check:estructura`), `decisiones.md`, excepción nº 16 en `ov_frontend/AGENTS.md`, `docs/origen-de-datos.md` (avance, vitrina, títulos), `docs/pendientes-interfaz.md` (cerrar lo resuelto; «avance por temática» B09 sigue sin vista). La spec queda en curso.

Un commit por fase: `Ajuste pasaporte-perfil · F<n>: <qué>`. Sin push.

## Observaciones del usuario al aprobar

1. **Errores de la vitrina:** 422 para más de 3 códigos, repetidos o inexistentes; 409 si alguna no está obtenida (convención del repo). Se anota en `decisiones.md`.
2. **`obtenida_en`:** la menor `desbloqueo.fecha_hora` entre las reglas de la insignia. El presupuesto de consultas de `/logros` puede crecer en un número fijo (una para fechas, una para vitrina), nunca por insignia.
3. **Nivel 3:** los escenarios siguen terminando en nivel 2; `ruta-progreso-nivel-3` basta para probar la lista de dos condiciones y el sendero de tres títulos.
4. **Línea de ruta en local:** un solo tramo con `getZoneProgress('missions')`.
5. **`texto` en `condiciones_faltantes` y `nuevos_desbloqueos`:** aparece nullable; ninguna vista lo pinta ahí en este ajuste.
6. **Capítulo II del perfil:** incluye la tarjeta destacada cuando una página está `ready` y la barra pequeña «x de y misiones» en las selladas (2.3 del texto).
7. El usuario enviará fotos de los bocetos de las cinco pantallas como referencia visual.

## Fase 5 · Textos del boceto y vitrina fluida

Se agrega como fase nueva a la spec en curso `ov_backend/docs/specs/ajuste-pasaporte-perfil.md` (sección «Fase 5»), en la misma rama `ajuste/pasaporte-perfil`.

### Contexto

Tras probar F2–F3, el usuario pide:
1. Que el modal de una insignia obtenida se vea como el boceto: una frase destacada («Una nueva mirada viaja contigo.»), un párrafo con su historia y «Cómo la conseguiste: completaste la introducción de tu viaje.». Hoy sale «Completaste t-inicio.» y «Completa t-inicio.» porque el modelo solo tiene `descripcion` y `requisito`, y la semilla los redactó con códigos de actividad.
2. Que la cita de Lumi bajo la descripción del nivel («Lumi: «Los títulos no dicen cuánto vales…»») también venga del modelo.
3. **No** se agrega «N viajeros de tu salón ya la encontraron».
4. Que al añadir o quitar de la vitrina la página bajo el modal no tiemble y el botón muestre un cargador mientras llama al backend.

### Qué cambia (hoy → pasará a)

**Modelo (decisión de diseño a aprobar; sigue `/cambio-modelo`, migración `0029`)**
- `insignia.frase` (Text, nulo): la frase destacada del sello.
- `insignia.logro` (Text, nulo): cómo se consiguió, en pasado («completaste la introducción de tu viaje.»).
- `insignia.descripcion` se mantiene y pasa a ser el párrafo de la historia; `requisito` se mantiene (lo que pide, en imperativo, para la por descubrir).
- `nivel.cita_lumi` (Text, nulo): la cita de Lumi de cada nivel.

**Backend**
- `app/services/logros.py::logros_cuenta`: `InsigniaEstado` gana `frase` y `logro` (nulos si la oculta sigue enmascarada); `NivelEstado` gana `cita_lumi`.
- `NivelActual` (resumen y familia) gana `cita_lumi`, igual que `descripcion` en F1.
- Pruebas: `tests/integration/logros/test_pasaporte.py` (frase, logro y cita; ocultas sin frase ni logro); contrato, migraciones y semilla se adaptan por la forma nueva.

**Datos (`datos/ruta.py`, `DATO DE PRUEBA`)**
- Textos sin códigos de actividad en las cinco insignias. `t-ins-1` toma los del boceto: «La primera chispa», frase «Una nueva mirada viaja contigo.», historia «Antes de buscar un destino decidiste mirar. Ese primer paso, el de aceptar que todavía no sabes, es el que abre todos los demás.», logro «completaste la introducción de tu viaje.», requisito «Completa la introducción de tu viaje.». Las otras cuatro, adaptadas de las presentaciones del front (`achievements.ts`) cuando exista una parecida.
- Frase y logro van en un diccionario aparte (`TEXTOS_INSIGNIAS = {codigo: (frase, logro)}`) y la cita en `CITAS_LUMI = {numero: cita}`, como `PAGINAS_INSIGNIAS` y `PISTAS_INSIGNIAS`: no cambia la forma de `INSIGNIAS` ni de `NIVELES`.
- Citas de Lumi para los niveles 1 a 3; la del 2, la del boceto.
- Fixtures regenerados.

**Frontend**
- Tipos (`types/servidorLogros.ts`, `types/servidor.ts`), adaptador (`insigniasServidor`: `metaphor` ← `frase`, `vocationalMeaning` ← `descripcion`, nuevo `logro`) y `getTravelerLevel` (nuevo `citaLumi` desde `nivel_actual.cita_lumi`).
- `PassportBadgeDialog.tsx`, estado obtenida: «Lo que guarda este sello» con la frase en cursiva (`badge.metaphor`) y debajo el párrafo (`badge.vocationalMeaning`); «Cómo la conseguiste:» con `logro` (si no llega, el `requisito`). En local, las mismas piezas salen de `metaphor`, `vocationalMeaning` y `description` de las presentaciones locales. Esto corrige lo que 1.5 del texto había retirado (`metaphor` y `vocationalMeaning`), a pedido del usuario con el boceto.
- `PassportLevelCard.tsx`: bajo la descripción, «Lumi: «{cita}»» en cursiva cuando el nivel la trae (en local no hay cita: no se pinta).

**Vitrina fluida**
- Causa del temblor: al guardar, `guardarVitrina` publica un `logros` nuevo; `useProgresoNivel` depende del objeto `logros`, pone sus condiciones en `null` y vuelve a consultar, así que la lista del «Siguiente título» desaparece y reaparece bajo el modal (pasa también en el perfil). Además `useBadgeDetail` depende del objeto `badge`, que `insigniasServidor` recrea en cada render: en una insignia por descubrir puede volver a consultar el progreso en bucle.
- `useProgresoNivel`: depende de `numero` y de una clave estable de los estados de los niveles (no del objeto `logros`), y conserva las condiciones anteriores mientras llega la nueva respuesta del mismo nivel.
- `useBadgeDetail`: depende de `badge.code` y `badge.done`; `usePassport`, `useBadgeDetail` y `useStudentProfile` memorizan `insigniasServidor(logros)` con `useMemo`.
- Botón de vitrina: mientras guarda, `aria-busy` y `aria-disabled` (no `disabled`, para no pasar al gris), mantiene el estilo y el texto de su estado y muestra `LoaderCircle` girando (el patrón de `features/activities/components/nodes/ItemNode.tsx`: `animate-spin motion-reduce:animate-none`). Si falla, el pie muestra `mensajeErrorServidor` con `role="alert"` y el botón vuelve a su estado.

### Qué no cambia

El motor, `/progreso`, `/avance`, la vitrina en el servidor (`POST /acciones/vitrina`), los textos de condición, el modal secreto y el por descubrir, el perfil salvo dejar de parpadear, y el modo local salvo mostrar sus `metaphor`/`vocationalMeaning` en el modal obtenido (excepción nº 16).

### Pruebas

- Backend: `logros`, `migraciones`, `datos`, `contrato`, `cuentas`, `familia`, `escenarios`.
- Front: `tests/servidor/logros` (modal obtenido con frase, historia y logro; cita de Lumi; el botón con cargador y sin `disabled` mientras guarda; error que deja el botón como estaba; que guardar la vitrina no vuelva a consultar `/progreso/NIVEL` ni deje las condiciones en `null`; que una insignia por descubrir consulte su progreso una sola vez aunque se vuelva a renderizar), `tests/servidor/perfil`, `tests/local/aventura` (modal obtenido local), `npm run test:servidor`.
- Navegador: backend y front temporales como en F2 (puerto 8001, base en el scratchpad), añadir y quitar de la vitrina midiendo cambios de diseño (`PerformanceObserver` de `layout-shift`) y peticiones; se limpia al terminar.
- Cierre de fase: suite completa de ambos repos.

### Commit

`Ajuste pasaporte-perfil · F5: textos del boceto y vitrina fluida`, con `decisiones.md`, `motor.md`/`integracion.md` y `origen-de-datos.md` actualizados. Sin push.

## Anexo · Texto de observaciones

Texto original del usuario (`ajuste-pasaporte-perfil.md`). Las correcciones y observaciones de arriba prevalecen sobre él.


Texto de observaciones para `/ajuste pasaporte-perfil`. Rediseña dos pantallas del estudiante: el **Pasaporte vocacional** (`/student/profile?section=passport`) y **Mi perfil** (`/student/profile`). Los bocetos aprobados están en el lienzo de diseño «Pasaporte vocacional – rediseño» (cinco artboards: pasaporte, tres modales de insignia y perfil); este texto describe lo que muestran.

Solo modo `api`. El modo local sigue congelado: las vistas nuevas leen únicamente del servidor y lo que hoy hace el modo local no se toca.

### 0. Vocabulario fijo

- **Niveles = títulos** («tu título actual», «siguiente título», «alcanzado»). Nunca «sello» ni «próximo sello» para un nivel.
- **Insignias = sellos** («2 de 10 sellos», «sellada el 25 de octubre»).
- **Página** = grupo de insignias (Página I, II, III…).
- **Vitrina** = las insignias que el estudiante elige mostrar a sus compañeros (máximo 3). Reemplaza «Mostrar en mi perfil» y «Lo que muestras a tus compañeros».
- **Secreta** = insignia oculta (`es_oculta`). En pantalla nunca se dice «oculta».

### 1. Pasaporte vocacional

#### 1.1 Cabecera

- Volver «Mi perfil», título «Pasaporte vocacional», subtítulo «Cada sello cuenta una parte de tu viaje. Pulsa uno para leer la historia que guarda.»
- Dos píldoras a la derecha: «**N de M sellos**» (obtenidas / todas, incluidas las secretas) y «**Vitrina: n de 3**».
- Se elimina el párrafo «N insignias quedan por descubrir»: las secretas ahora aparecen en la grilla.

#### 1.2 Tarjeta de título (nivel)

Mantiene el `Parchment` oscuro con `id="nivel"`. Dos columnas que se apilan en pantallas angostas:

**Izquierda**
- Medallón «NIVEL 02» (como hoy).
- Eyebrow «Nivel {n} de {total} · tu título de viajero». `total` = `logros.niveles.length`, no «5» fijo.
- `h2` con el título del servidor y debajo la **descripción del nivel**, que pasa a venir del servidor (ver 3.2).

**Derecha: tarjeta «Siguiente título»** (fondo pergamino, borde dorado)
- Eyebrow «Siguiente título», nombre del siguiente nivel tomado de `logros.niveles` (no de `travelerTitles` del front).
- Resumen «**x de y condiciones cumplidas**».
- Lista de condiciones, la misma que usa el modal de insignia (ver 1.5): cada condición en una fila con marca (círculo relleno con check si está cumplida, círculo punteado si falta) y su texto; las condiciones de conteo llevan debajo una barra pequeña con «actual de requerido». La tarjeta crece con la lista; con 3–4 condiciones la fila de dos columnas simplemente queda más alta.
- En el último nivel la tarjeta dice «Llegaste al último título del viaje» sin lista.
- Fuente de datos: `GET /cuentas/{c}/progreso/NIVEL/N{n+1}` (ya existe, nadie lo llama). Se muestran todas las reglas y sus condiciones (ver 7.1). Si el nivel no tiene reglas, la tarjeta muestra solo el nombre.
- Desaparece `level.nextStep` (texto fijo del front) como fuente de este bloque.

**Sendero de títulos** (debajo, ancho completo): una fila con **todos** los niveles de `logros.niveles` (hoy el front ya lo arma; con la semilla `ruta` serán 2). Estados y rótulos: alcanzado («Alcanzado», círculo relleno con check), actual («Tu título actual», círculo relleno con halo dorado), siguiente («Siguiente», círculo punteado dorado), posteriores («Más adelante», punteado gris), último («Final del viaje»). Se cambia el rótulo «Sellado» si existiera.

#### 1.3 Páginas (grupos)

Cada grupo es un `Parchment` claro:
- Eyebrow «Página I/II/III…», `h2` con el nombre del grupo. **Sin descripción** del grupo.
- A la derecha, solo «**n de m sellos**».
- Grilla de 6 columnas (se reduce en pantallas angostas), tarjetas de ~150 px de alto.

Los grupos pasan a ser **datos del servidor** (ver 3.1): nombre y orden. Desaparecen los grupos fijos de `getAchievementPresentations()` y el grupo de respaldo «La luz que despeja caminos» de `insigniasServidor`. Las insignias se ordenan dentro del grupo por `orden` y luego por `codigo`.

#### 1.4 Tarjeta de insignia

Descargada, como la página de logros de Octalysis: **solo sello + nombre**. Sin condición, sin barra, sin chip de estado, sin fecha. El estado lo dice el sello:

| Estado | Sello | Nombre |
|---|---|---|
| Obtenida | círculo azul relleno con el ícono en blanco, borde blanco y anillo azul | nombre en negrita, tinta oscura |
| Por descubrir | círculo crema con borde punteado, ícono gris | nombre en gris |
| Secreta (no obtenida) | igual que por descubrir, con «?» en lugar de ícono | «???» |

- Una obtenida que está en la vitrina lleva un ojito pequeño en la esquina superior derecha (sin texto).
- Se retira el candado (`LockKeyhole`) de la tarjeta; el borde punteado ya dice que falta.
- Íconos: por código desde `achievementIcons` como hoy; si el código no tiene ícono, un ícono genérico por defecto.
- Las secretas **sí entran en la grilla**, en su propio grupo. En la grilla no se distinguen de las bloqueadas salvo por el «???».

#### 1.5 Modal de insignia (tres estados)

Mismo `Dialog` actual. Estructura común: sello grande arriba, eyebrow «Página X · {nombre del grupo}», título, chip de estado.

**Secreta (no obtenida)** — fondo oscuro, borde punteado dorado
- Título «???», chip «Insignia secreta».
- Caja «**Pista de Lumi**» con la pista del servidor en cursiva (campo nuevo `pista`, ver 3.1). Si no hay pista: «Lumi todavía no quiere contarte nada de este sello.»
- Caja «Qué significa» con el texto borroso y «Su nombre y su historia se revelan cuando la consigas.»
- Sin botón de destino, sin lista de condiciones.

**Por descubrir** — fondo pergamino, borde dorado
- Chip «Por descubrir».
- Caja «**Cómo se consigue · x de y cumplidas**» con la **lista de condiciones** (de `GET /progreso/INSIGNIA/{codigo}`, todas las `reglas` y sus `condiciones`, ver 7.1): fila por condición con marca cumplida/pendiente y su `texto` del servidor (7.2); barra «actual de requerido» solo en las de conteo.
- Debajo, botón «Ir a {destino}» si el código tiene destino en `badgeDestinations`; si no, no hay botón.
- Caja «Qué significa» borrosa, como hoy.
- Se eliminan el «2 de 3 misiones» pegado al texto del requisito y el botón «Reintentar requisito» (si falla la consulta, la caja muestra solo `requisito`).

**Obtenida** — fondo pergamino, borde azul
- Chip «Sellada el {fecha}» (campo nuevo `obtenida_en`, ver 3.1). Si no llega fecha, chip «Obtenida».
- Una sola caja «**Lo que guarda este sello**» con la `descripcion` del servidor como frase destacada (cursiva, grande). Se eliminan las secciones «Lo que lograste» y «Qué significa» por repetir el mismo texto; `metaphor` y `vocationalMeaning` del front dejan de mostrarse.
- Una línea «**Cómo la conseguiste:** {requisito}».
- Botón de alternancia de vitrina: «En tu vitrina» (relleno, con check) / «Añadir a tu vitrina» (contorno). Pie: «Tus compañeros ven hasta 3 sellos en tu perfil · n de 3 en uso.» Deshabilitado con el pie «Ya tienes 3 sellos en tu vitrina. Quita uno para elegir este.»

### 2. Mi perfil (ficha del viajero)

Mantiene cabecera + tres capítulos. Cambia qué cuenta cada pieza.

#### 2.1 Cabecera (`Parchment` oscuro)

**Izquierda**
- Avatar con iniciales y, montada en su borde inferior, una etiqueta «NIVEL {n}».
- Eyebrow «Ficha del viajero».
- `h1`: «{Nombre}, **{título actual}**» (el título en dorado, en la misma línea).
- Párrafo con la **descripción del nivel** del servidor (3.2). Se elimina el párrafo fijo «Todo lo que vas descubriendo…».
- **Línea de ruta** (reemplaza «Recorrido» y «Afinidad con la ciudad» de la cabecera y del capítulo I):
  - Encabezado: «Tu ruta» a la izquierda, «**X de Y misiones requeridas**» a la derecha (suma de requeridas completadas / total requeridas de todos los tramos).
  - Una línea horizontal con un **hito por tramo** (los tramos son los bloques del espacio MISIONES_CAMPO). Hito cumplido: círculo dorado con check; pendiente: círculo punteado gris; último hito: bandera. Un marcador azul con halo marca la posición dentro del tramo actual (proporcional a requeridas completadas / total del tramo).
  - Bajo cada hito, el **nombre del tramo**: dorado si está completo, blanco si es el actual, gris si falta. Nada más (sin «Tramo 2 de 4», sin conteos por tramo: eso ya lo muestra el menú lateral).
  - Fuente: `GET /cuentas/{c}/avance` ampliado con la lista de tramos (3.3). La afinidad de camino y ciudad **no se muestra en el perfil**: se queda en el menú lateral del mapa.

**Derecha: tarjeta «Tu vitrina»** (fondo noche, borde sutil)
- Eyebrow con ojo «Tu vitrina».
- Texto «Lo único que ven tus compañeros: tu título y hasta tres sellos.»
- Tres ranuras redondas **centradas** en el ancho de la tarjeta: sello azul con ícono si hay insignia, círculo punteado si la ranura está vacía. Se dejan de mostrar los nombres y el texto «Espacio libre».
- Botón de contorno dorado «Elegir qué muestro» → pasaporte.

#### 2.2 Capítulo I · Lo que he logrado

- Fila «Sellos del pasaporte» con «**n de m**» a la derecha y una tira de hasta 5 círculos: obtenidas en azul con ícono (ordenadas por `obtenida_en` descendente, las más recientes primero), luego pendientes punteadas; si sobran, el último círculo dice «+k».
- Tarjeta blanca con borde dorado «**Siguiente título**»: nombre del siguiente nivel, una fila de puntos (uno por condición: relleno cumplido / punteado pendiente) y una frase «x de y condiciones · te falta {texto de la primera condición pendiente}». Sin lista completa aquí; la lista vive en el pasaporte. Último nivel: «Llegaste al último título del viaje».
- Se eliminan la caja «Para el nivel 3», las barras «Recorrido» y «Afinidad con la ciudad» y el bloque «Logros recientes».
- Botón azul «Abrir mi pasaporte» → pasaporte.

#### 2.3 Capítulo II · Lo que Helena descubre de mí

- El `Parchment` conserva el borde dorado (sigue siendo el destacado).
- **Si alguna página está `ready`**, va arriba una tarjeta destacada (blanca, borde dorado): sello dorado con la lámpara, eyebrow «Helena terminó de leer», nombre de la página y enlace «Romper el sello →» hacia el libro de Helena. Si hay varias `ready`, se muestra la primera y las demás van en la lista.
- Lista con las páginas restantes: sello pequeño (azul relleno = `revealed`, noche con candado = `sealed`), nombre y, en lugar del texto «Sellada · x de y misiones», una **barra pequeña** con «x de y misiones» a su derecha. Las reveladas muestran «Descifrada» (y para partida/llegada «Descifrada · la llegada se escribe al final» mientras falte la llegada).
- Se retira el `<small>Demostración</small>` en modo `api`.
- Botón dorado «Abrir el libro de Helena».

#### 2.4 Capítulo III · Hacia dónde voy

Sigue leyendo las hojas locales (`DecisionSheet`) y el contexto de exploración hasta que llegue el lote F de planes (B11): este ajuste solo cambia la presentación.

- Tres filas A/B/C:
  - con plan: tarjeta blanca, letra en cuadro de color (`--sx-plan-a/b/c`), nombre de la carrera y barra «x % armado» (porcentaje de completitud que hoy se muestra como «n de 4»);
  - sin plan: borde punteado, letra punteada y texto por posición: B «Un segundo camino · Se abre al guardar otro interés», C «Un plan por si acaso». A vacío: «Tu primer camino · Empieza por un interés». Desaparece «Espacio libre».
- «Lo que guardaste en el camino»: tres **chips** en una fila (no tres bloques): corazón relleno dorado con «{n} carreras / ocupaciones / instituciones» cuando n > 0; corazón vacío y borde punteado cuando n = 0. Cada chip enlaza a la vista de favoritos correspondiente.
- Se elimina «Tienes N carreras favoritas que aún no son un plan.»
- Botón azul «Ver mis planes» (bloqueo por sección PLANES como hoy).

#### 2.5 Pie

«Tus compañeros solo ven tu título y los sellos de tu vitrina. Lo demás lo ven tú y tu orientadora.»

### 3. Backend

Todo lo siguiente es **cambio de modelo** (sigue `/cambio-modelo`). Se busca lo mínimo para que las dos pantallas lean solo del servidor.

#### 3.1 Insignias

- Tabla nueva `GrupoInsignia(id, codigo unique, nombre, orden)`.
- `Insignia` gana `id_grupo` (obligatorio), `orden` (entero), `pista` (Text, nullable; solo tiene sentido en `es_oculta`).
- `GET /cuentas/{c}/logros` → `InsigniaEstado` gana `grupo{codigo, nombre, orden}`, `orden`, `pista`, `obtenida_en` (fecha del evento de desbloqueo; null si no está obtenida). Una secreta no obtenida sigue enmascarada (`codigo="???"`, nombre «Logro oculto», `descripcion` y `requisito` null) **pero conserva `grupo`, `orden` y `pista`** para poder pintarla en su página. Para distinguir dos secretas del mismo grupo el front usa el índice dentro del grupo; no hace falta exponer el código.
- La respuesta incluye además `vitrina: [codigo]` (ver 3.4) y `total_insignias` no es necesario: el front cuenta.
- `CondicionDesbloqueo` gana `texto` y `ProgresoCondicion` lo devuelve (7.2). `GET /progreso/INSIGNIA/{codigo}` no cambia en lo demás (ya devuelve `actual`, `requerido`, `cumplida`); el front añade `mensaje_bloqueo` y `texto` a sus tipos.

#### 3.2 Niveles

- `Nivel` gana `descripcion` (Text): el texto de «en qué parte del camino estás» (hoy `travelerLevels[n].description` en el front).
- `GET /logros` → `niveles[]` gana `descripcion`; `GET /resumen` → `nivel_actual` gana `descripcion`.
- Progreso al siguiente nivel: se reutiliza `GET /progreso/NIVEL/N{n}` sin cambios.

#### 3.3 Avance

- `GET /cuentas/{c}/avance` gana `tramos: [{codigo, nombre, numero, completadas, total, estado: COMPLETO | ACTUAL | PENDIENTE}]` (requeridas solamente, total fijo desde las definiciones) y `requeridas: {completadas, total}` (suma de todos los tramos). `tramo_actual`, `camino`, `ciudad` y `camino_completo` no cambian.

#### 3.4 Vitrina

- Tabla nueva `InsigniaVitrina(id_cuenta, id_insignia, orden)`, máximo 3 por cuenta, solo insignias obtenidas.
- `PUT /cuentas/{c}/vitrina` con `{codigos: [..]}` (reemplaza la lista completa; 400 si hay más de 3 o alguna no obtenida). Devuelve la lista vigente.
- El front deja de guardar la vitrina en `localStorage` (`profileBadgesApi`, `profileBadges`, `profileBadgesConfigured` en `ov.student-discovery.v1`): en modo `api` lee `vitrina` de `/logros` y escribe con el endpoint. Se elimina el valor por defecto «las tres primeras obtenidas»: sin elección, la vitrina está vacía. La validación `/^I\d+$/` del store se retira para el modo `api` (los códigos de la semilla son `t-ins-*`). Las claves locales se conservan sin migración para el modo local congelado.
- HU-077 (ver el perfil de un compañero) queda fuera de este ajuste; el endpoint deja el dato listo.

#### 3.5 Datos (`datos/ruta.py`, `DATO DE PRUEBA`)

- Dos grupos: `G1` «La luz que despeja caminos» (orden 1) y `G2` «Huellas en la ciudad» (orden 2).
- `t-ins-1`, `t-ins-oculta` → G1; `t-ins-familias`, `t-ins-letras`, `t-ins-instituciones` → G2.
- `texto` en cada condición de las reglas existentes (p. ej. `R-t-ins-1`: «Completa la misión de inicio»; `R-NIV-2`: «Termina el bloque de inicio»).
- Pistas para las cuatro ocultas (una línea cada una, en voz de Lumi, p. ej. `t-ins-oculta`: «No todo brillo sobrevive a una batalla. El que no se apaga ni una vez, deja huella.»).
- `descripcion` para los niveles 1 y 2 (reusar los textos de `travelerLevels`).
- Agregar un nivel 3 con una regla de dos condiciones (p. ej. `COMPLETA_BLOQUE T0` y `VISTA_CARRERA ≥ 3`) para probar la lista de condiciones y el sendero con tres títulos.
- Regenerar los fixtures `ruta-logros-*`, `ruta-avance-*` y los que usen `/resumen`.

### 4. Frontend: qué cambia

- `features/discovery/components/StudentPassportView.tsx`: cabecera, tarjeta de título con lista de condiciones, páginas desde el servidor, tarjeta descargada. Probablemente se parte en `PassportLevelCard.tsx`, `PassportGroup.tsx` y `PassportBadgeCard.tsx` para respetar el tope de 300 líneas.
- `PassportBadgeDialog.tsx` + `useBadgeDetail.ts`: tres estados; lista de condiciones; vitrina contra el endpoint.
- `lib/servidor/adaptadores.ts`: `insigniasServidor` deja de agrupar por `getAchievementPresentations` y usa `grupo` del servidor; `textoRequisitoInsignia` pasa a `condicionesObjetivo(progreso)` que devuelve las reglas con sus condiciones (texto, cumplida, actual, requerido), sin redactar nada en el front.
- Hook nuevo `useProgresoNivel(numero)` sobre `consultarProgreso('NIVEL', ...)`.
- `pages/student/StudentProfileView.tsx` + `useStudentProfile.ts`: cabecera con línea de ruta (componente nuevo `RouteLine.tsx` en `components/student/`), vitrina centrada, capítulos I–III como en 2.2–2.4. El perfil debe leer `avance` del store igual que el panel (ya cargado por `refrescar()`); no hace falta hook nuevo si el store ya lo expone.
- `store/discoveryStore.ts`: vitrina fuera del estado persistido en modo `api`.
- `lib/passport.ts`: `travelerLevels[].description/nextStep` y `travelerTitles` dejan de usarse en modo `api` (se conservan para el modo local).
- Estilos en `features/discovery/styles/passport.css` y `styles/student/discovery.css`, con los tokens existentes (`--sx-gold`, `--sx-parchment`, `--sx-night`, `--sx-plan-*`). Nada de Tailwind nuevo.
- `docs/origen-de-datos.md`: actualizar «Avance…», «vitrina» y «títulos».
- `docs/pendientes-interfaz.md`: cerrar lo que este ajuste resuelve y dejar anotado que «avance por temática» (B09) sigue sin vista.

### 5. Qué no cambia

- El motor de reglas, los evaluadores y `objetivo_disponible`.
- El menú lateral del mapa (anillo de camino, afinidad de ciudad, «Tramo N · X de Y»).
- El libro de Helena y su revelado; el perfil solo cambia cómo lista las páginas.
- Planes y favoritos: siguen locales hasta el lote F de B11.
- Los avisos (`BadgeToast`, cola de desbloqueos) y la pantalla de cierre de actividad.
- El modo local y sus pruebas.

### 6. Fases propuestas

1. **Backend · modelo y datos**: grupos, `pista`, `orden`, `descripcion` de nivel, vitrina, tramos en `/avance`; semilla y fixtures. Pruebas de `/logros`, `/avance`, `/vitrina`.
2. **Frontend · pasaporte**: cabecera, tarjeta de título con condiciones, páginas, tarjetas, tres modales, vitrina contra el servidor.
3. **Frontend · perfil**: cabecera con línea de ruta y vitrina, capítulos I–III, pie.
4. **Cierre**: suite completa, `decisiones.md`, `docs/sistema/`, `origen-de-datos.md`, `pendientes-interfaz.md`.

### 7. Decisiones ya tomadas (sin preguntas abiertas)

1. **Reglas y condiciones.** Un objetivo puede tener varias reglas (alternativas: basta cumplir una, `objetivo_disponible` usa `any`) y cada regla varias condiciones (todas). En el modal de insignia y en la tarjeta de «Siguiente título» se muestran **todas las condiciones de todas las reglas**: con una sola regla, la lista completa; con más de una, cada regla como un bloque y la palabra «o bien» entre bloques. El resumen «x de y cumplidas» cuenta las condiciones de la regla más avanzada.
2. **Texto de cada condición desde el servidor.** `CondicionDesbloqueo` gana `texto` (String, nullable). `ProgresoCondicion` lo devuelve como `texto`. El front no redacta condiciones; si una llega sin `texto`, la fila muestra el `requisito` general del objetivo (y en niveles, `mensaje_bloqueo` de la regla). Se eliminan `textoRequisitoInsignia` y el caso especial de «N de 3 misiones» del adaptador. La semilla carga un `texto` para cada condición de las reglas de insignias y niveles.
3. **Fecha de obtención.** `obtenida_en` sale del registro de desbloqueo del objetivo INSIGNIA. Antes de implementarlo, verificar que ese registro tenga `creado_en`; si no lo tiene, agregarlo como parte del cambio de modelo y poblarlo al desbloquear.
