# Decisiones del refactor de estructura

## Actividades por dominio · F3 · Mapa desde las actividades (8 de octubre de 2026)

- Base F2: 406 pruebas, 391 correctas y 15 fallas previas. El servidor determina la lista, el orden, el título, el estado y la visibilidad de cada punto; el JSON determina su posición, etiqueta e ícono. Los identificadores históricos de presentación se conservan, sin decidir la lista. Las secuencias consecutivas comparten un marcador y representan la primera actividad sin completar, o la última al terminar. El progreso cuenta cada actividad SIEMPRE visible con contenido y mapa; los extras no cambian el denominador. Llave, casos y desafíos conservan su presentación.
- Excepción autorizada por el usuario: `enc-mitos` muestra «La plaza de los rumores» y `act-06` muestra «Mi mapa de ruta». Se cambian únicamente esos dos `title` en `data/content/adventure.ts`, también para modo local. Se registran la decisión compartida y la excepción expresa a §8 en el backend. Ningún otro texto, marcado, estilo o almacenamiento cambia.
- El reproductor de Camino resuelve el contenido mediante un hook; los encuentros de Mara y Elena usan igualmente la clave del servidor, conservando el reproductor actual. Los códigos de reproducción son los del servidor. Se conserva `configureStudentActivities` al resolver cada JSON para mantener los nodos y textos existentes de Huellas y Horizonte; después se asigna el código del servidor. Las revisiones de secuencias usan sus actividades individuales. Los contenidos ausentes se omiten y avisan una vez por actividad y sesión solo en desarrollo; los que carecen de mapa se omiten sin inventar coordenadas. Los dos contenidos de apoderado sin mapa no son actividades de estos mapas estudiantiles.
- Se agrega `servidor-mapa.test.mjs` con siete pruebas: igualdad de presentación de plataforma en inicio y Ciudad, los tres momentos de piloto, avisos por sesión y producción, orden/códigos nuevos/visibilidad/secuencias contenido sin posición y conservación de nodos/textos de reproducción. No se modifica ninguna prueba existente ni sus aserciones; las adaptaciones se limitan al código de aplicación.
- Validación: **413 pruebas, 398 correctas y las mismas 15 fallas previas**, cero omitidas y canceladas. Coinciden nombres, orden, motivos y detalles de las fallas de F2 al excluir duraciones y ubicaciones de pila. Las siete nuevas pasan. Build y lint pasan; estructura: **536 archivos, cero infracciones y excepciones**. Permanece el aviso previo de tamaño del bundle.
- Se actualiza el inventario. Continúan los pendientes de interfaz del piloto y los dominios sin vista, que se revisarán en F4. Sin dependencias nuevas ni push.

## Actividades por dominio · F2 · Consultas y secciones (8 de octubre de 2026)

- Base: **386 pruebas, 371 correctas y 15 fallas previas**. Se implementan exclusivamente §7.1–7.3; la construcción dinámica del mapa queda en F3. Se conservan marcado, textos, estilos, catálogo narrativo, almacenamiento y comportamiento local.
- Se copian `ResumenCuenta`, `ActividadCuenta`, `BloqueActividades` y `LogrosCuenta`, incluidos enumerados y campos anulables. Los servicios GET usan el cliente existente y codifican la cuenta. Por autorización explícita del usuario, `obtenerEstado` se retira en F2 y su caso de servicio se sustituye por `obtenerResumen`; se agregan los casos de actividades, fichas y logros. `EstadoCuenta`, los fixtures anteriores y el endpoint del backend permanecen hasta X. La especificación compartida corrige esa secuencia.
- El almacén anterior se retira y se divide en `sesion.ts`, `secciones.ts`, `avisos.ts` y `resultado.ts`; `consultas.ts` conserva consultas de detalle y `refresco.ts` coordina ingreso y acciones. Se importan módulos concretos, sin barriles ni ciclos; todos respetan el límite de 400 líneas. Los adaptadores siguen importando exclusivamente tipos: reciben el dominio correspondiente y la cuenta explícita para hidratación y resultados.
- Cada sección tiene datos, estado y error. Las consultas se habilitan tras confirmar el POST de ingreso. Resumen, actividades y no vistos se cargan en paralelo; RIASEC mantiene la condición vigente de Elena. Fichas y logros se cargan al abrir sus consumidores y comparten caché y promesa por cuenta, sesión y revisión. Un recurso cerrado deja de contar como consumidor aunque permanezca montado. La promesa se registra antes de publicar `cargando`, para evitar duplicados por una suscripción sincrónica.
- Las acciones actualizan actividades y no vistos. Los desbloqueos vencen únicamente los dominios indicados en §7.3; los visibles se recargan y los demás esperan. Se descartan respuestas de una sesión anterior y de consultas invalidadas. Un error conserva los datos anteriores y espera el reintento explícito; el aviso existente del shell muestra errores de secciones activas. Se mantienen los recibos confirmados, sin repetir POST al reintentar GET, y el reinicio vacía las secciones antes del nuevo ingreso.
- Adaptaciones autorizadas de §9.2: `servidor-adaptadores.test.mjs`, `servidor-avisos.test.mjs`, `servidor-flujo.test.mjs`, `servidor-logros.test.mjs`, `servidor-mara.test.mjs`, `servidor-resultados.test.mjs`, `servidor-servicios.test.mjs` y los ayudantes `soporte/servidor-ayudas.mjs` y `soporte/servidor-mara-ayudas.mjs`. Se usan los fixtures por dominio exportados en B3, conservando las modificaciones de escenario y los valores esperados. Las pruebas aisladas de avisos y Mara simulan un ingreso ya confirmado; las de pasaporte cargan logros explícitamente. No cambian los 18 JSON ni se necesita regenerarlos: el contrato del backend no cambia.
- En `adventure-rendering.test.mjs` solo se adapta el cargador de `immersivePlayerHarness` a la ruta concreta `store/servidor/secciones`, usando el mismo React simulado de los hooks de la vista. No se cambia ninguna de sus **1287 llamadas `assert.*`**, comprobado por AST. Es necesario porque la extracción añade hooks con efectos a un módulo que el cargador general trataba como biblioteca estática. Se conservan los nombres y motivos de sus 15 fallas previas, enumeradas en F0.
- `servidor-secciones.test.mjs` añade **17 casos**: ingreso confirmado y paralelo, carga perezosa, promesa compartida con reentrada, caché, invalidación montada y desmontada por los tres tipos, invalidación durante una consulta, errores sin bucles y reintentos, cambio de cuenta y nuevo ingreso de la misma cuenta, reinicio, recursos cerrados y aislamiento local. Los tres casos nuevos de servicios verifican transporte, codificación y errores.
- Validación: **406 pruebas, 391 correctas y las mismas 15 fallas**, cero omitidas y cero canceladas. Coinciden nombres, orden, mensajes y detalles de las fallas con F1, excluyendo duraciones y ubicaciones de pila. Las **111 pruebas `servidor-*`** pasan. Build y lint pasan; estructura: **532 archivos, cero infracciones y cero excepciones**. Se conserva el aviso previo del bundle mayor de 500 kB. No queda `/estado` en `src`.
- Se actualiza el inventario de datos. Siguen pendientes testimonios, preguntas del diario, conversaciones y los casos de piloto ya registrados en `docs/pendientes-interfaz.md`; no se agrega interfaz. Los campos nuevos de estructura y visibilidad quedan disponibles para F3. Sin dependencias nuevas, cambios de claves de almacenamiento ni push. Un commit F2 por repo tocado en `iteracion-1`; el backend solo recibe documentación y su validación se registra en las decisiones compartidas. Se detiene antes de F3.

## Actividades por dominio · F1 · Contenidos JSON (8 de octubre de 2026)

- Se mueven los seis JSON de actividades a `src/data/activities/contenidos/` y se crean los siete de §5.2 a partir de los seis objetos de `standardActivities.ts` y de `finalActivity`. `catalogo.json` permanece fuera de esa carpeta. `standardActivities.ts` conserva únicamente `compassInstrument`, sin cambiarlo.
- Antes de retirar las definiciones TypeScript se ejecuta la comprobación temporal `deepEqual` de los trece contenidos. Solo se añade `mapa` a los nueve del Camino, Mara y Elena, con posiciones, etiquetas e íconos actuales. Los dos contenidos de apoderado no reciben un punto de mapa.
- `contenidos.ts` usa trece imports explícitos, exporta el registro y `contenidoPorClave`; las claves desconocidas devuelven `undefined`, incluidas las heredadas de Object. No se usa `import.meta.glob`. El import de este módulo lleva `.ts` explícito para que los cargadores existentes no confundan `contenidos.ts` con la carpeta `contenidos/`; no se cambian los cargadores ni se agrega resolución de carpetas.
- `ContenidoActividad` extiende `Actividad` con `mapa?`. La traducción de nombres de ícono a Lucide está en `features/adventure/lib/iconosMapa.ts`, y el selector actual del Camino la reutiliza sin cambiar sus resultados.
- `content.ts` mantiene la lista y el orden anteriores a partir de las claves del registro. Al construir el catálogo local omite únicamente `mapa`; conserva `configureStudentActivities` y sus ajustes. La comparación temporal contra F0 confirma exactamente `activities` (13), `parentActivities` (2), `finalActivity`, `activityById`, `catalog` y `compassInstrument`. El resultado y el catálogo de instrumentos permanecen separados de la lista local de actividades, como antes.
- Adaptaciones autorizadas por §9.2.2 de la ampliación: solo las rutas de JSON movidos, sin cambiar ninguna aserción. Archivos y pruebas tocadas:
  - `tests/mission-logic.test.mjs`: las cuatro cargas globales de línea de tiempo, mitos, Mara y pregones apuntan a `contenidos/`; el catálogo sigue en su ruta anterior. Se conservan todas las pruebas del archivo.
  - `tests/student-progress-challenges.test.mjs`: `student checks resolve binary questions immediately and reveal other questions on attempt two`.
  - `tests/student-reflection-pilot.test.mjs`: `new sequential content preserves private synthesis, retires future entry, and leaves test and matrix cells intact`.
  La comparación del AST de las llamadas `assert.*`, normalizando finales de línea, confirma que las aserciones de los tres archivos permanecen idénticas a F0. No se adaptan fixtures, simulaciones HTTP ni conteos de peticiones: corresponden a F2.
- `tests/contenidos.test.mjs` agrega siete casos: registro bidireccional con archivos e imports, claves de plataforma, ausencia deliberada del piloto, metadatos del Camino, Ciudad y apoderados, catálogo local y equivalencia de contenidos entre modos sin peticiones HTTP.
- Validación: F0 tenía **379 pruebas, 364 correctas y 15 fallas**; F1 tiene **386 pruebas, 371 correctas y las mismas 15 fallas**, cero omitidas y cero canceladas, en 17,71 segundos. Coinciden los nombres, orden, mensajes y detalles de las fallas, excluyendo duraciones y ubicaciones de pila. Las siete nuevas pasan. `npm run build` y `npm run lint` pasan; estructura: **524 archivos, cero infracciones y cero excepciones**. Permanece el aviso previo de bundle mayor de 500 kB.
- Se actualizan README y el inventario de origen de datos con las rutas finales. No se modifican vistas, componentes, estilos, textos, almacenamiento, servicios, hooks ni disponibilidad en ninguno de los modos. No hay dependencias nuevas ni datos sin vista adicionales; siguen pendientes los ya registrados en `docs/pendientes-interfaz.md`.
- Los registros y las comprobaciones temporales permanecen fuera de ambos repos. Se registra la validación compartida en `ov_backend/docs/iteraciones/decisiones-iteracion-1.md`; el backend solo recibe documentación. Un commit F1 por repo en `iteracion-1`, sin push. Se detiene antes de F2.

## Actividades por dominio · F0 · Línea base (8 de octubre de 2026)

- Se lee completo el AGENTS.md del frontend y la especificación vigente de actividades por dominio. Rama: iteracion-1; punto de partida: 90d76f6, cierre de B3.
- npm test: **379 pruebas, 364 pasan, 15 fallan, cero omitidas y cero canceladas**, en 18,02 segundos. Los nombres y el orden de las fallas coinciden exactamente con B3; se enumeran abajo.
- npm run build y npm run lint pasan; se conserva el aviso previo de bundle mayor de 500 kB. npm run check:estructura: **515 archivos, cero infracciones y cero excepciones**.
- No se modifica código, pruebas, dependencias, vistas ni ov_backend. Su última suite, al cerrar B3, tuvo 1103 pruebas correctas, cuatro omitidas y cero fallas; no se repite en esta fase, que solo registra la línea base del front.
- Registros fuera de ambos repos, en el directorio de visualizaciones de esta conversación (f0-front-*.txt). Un commit F0 en el front, sin push. La solicitud autoriza continuar con F1 tras este cierre, y detenerse antes de F2.

Fallas previas (todas en tests/adventure-rendering.test.mjs):

- immersive submission preserves validation, drafts, versions and the keep action
- immersive questions preserve attempts, hints, revelation, retry and fresh revision behavior
- immersive finish shows saved sheets, narrative rewards and the prompted journal action
- follow-up service waits 700ms, respects both text thresholds and never asks a third turn
- first text submission saves version one before follow-up; edits and matrices use the normal form
- follow-up accepts two replies, caps the field at available space and saves one condensed version
- omitting all turns preserves version one, while a long reply ends follow-up after one turn
- no question, failure, timeout or fewer than 40 free characters advances silently with the original
- interrupted follow-up recovers only answered turns and loads the condensed form without duplicate versions
- follow-up requires 40 free characters and stops before a second question that cannot fit
- leaving during evaluation never stores a late question and recovery preserves the replied turn
- every supplied mission node renders, including matrices, slides, questions and instrument items
- phase 8 path sequence respects both completion records without changing catalog or real thresholds
- phase 8 direct links open blocked details instead of starting unavailable players
- discovery atlas covers existing IDs, symmetric relations and gated affinity

## R0 · Punto de partida y línea base (8 de octubre de 2026)

- Rama de trabajo: `refactor-estructura`, creada desde `iteracion-1`.
- Commit de partida: `3f58c1e26957c53ea5c3b418d25f397563724ad2`.
- `git diff --stat 1bbacce HEAD -- src tests` no devuelve cambios. El código y las pruebas coinciden con la base del mapa de archivos; el commit posterior solo afecta documentación.
- Etiqueta local `prototipo-v1` creada en el commit de partida. No se publica.
- La especificación entregada está en `docs/refactor/spec-refactor-estructura.md`; `docs/spec-refactor-estructura.md` no existe. Se usa la copia encontrada, sin moverla ni modificarla. Los cuatro archivos entregados en `docs/refactor/` estaban sin seguimiento y se conservan así.
- `npm ci` completado con el archivo de bloqueo existente, sin agregar dependencias. La primera ejecución en el entorno restringido se interrumpió al no avanzar; la repetición con acceso a red y caché terminó correctamente.
- `npm run build`: pasa (aviso existente por tamaño del bundle).
- `npm run lint`: pasa.
- `npm test`: **356 pruebas, 340 pasan, 16 fallan**, sin pruebas canceladas ni omitidas. Los nombres de las 16 fallas coinciden con §9.1 de la especificación; no se cambian código ni aserciones.
- No se modifica `ov_backend` ni se ejecutan sus pruebas: R0 solo afecta al frontend.
- Infracciones de estructura: pendientes de medir en R3b. El verificador aún no se ejecuta, según §10.

La solicitud autoriza ejecutar R0 y R1 en este mismo turno. Tras registrar y confirmar R0 se continúa con R1, y se detiene antes de R2.

## R1 · Limpieza y preparación del verificador (8 de octubre de 2026)

- Se retira `.env` del índice de Git y se agrega a `.gitignore`; el archivo local se conserva y `.env.example` sigue versionado.
- Se eliminan `.f6-cierre-vite.config.ts` y los tres archivos de plantilla de `src/assets/`: `hero.png`, `react.svg` y `vite.svg`.
- Se copia el Anexo B a `scripts/verificar-estructura.mjs` sin cambios (SHA-256 idéntico) y se agrega `check:estructura` a `package.json`. No se ejecuta ni se generan excepciones: corresponde desde R3b.
- `npm run build` y `npm run lint`: pasan. El build conserva los nombres y tamaños de los bundles de R0 y su aviso por tamaño.
- `npm test`: **356 pruebas, 340 pasan, 16 fallan**, sin canceladas ni omitidas. Comparados los registros de R0 y R1, coinciden los nombres y los errores completos de las 16 fallas, excluyendo únicamente sus duraciones. Los nombres también coinciden con §9.1.
- No se modifican pruebas ni código de la aplicación; solo se eliminan los assets indicados. No hay adaptaciones de §9.2 en estas fases.
- No se modifica `ov_backend`; no corresponde ejecutar sus pruebas.
- Los registros de verificación de R0 y R1 están en `logs/`, que ya estaba ignorado por Git.
- Pendiente: R2 (código sin ruta y adaptación A4) y fases posteriores. Las infracciones de estructura se medirán en R3b. El trabajo se detiene al terminar R1.

## R2 · Código sin ruta y adaptación A4 (8 de octubre de 2026)

- Se eliminan exactamente los 29 archivos de código enumerados en «Se elimina (decisión D1)» del mapa: 9.422 líneas. Los tres assets de esa lista ya se eliminaron en R1. El historial y la etiqueta local `prototipo-v1` conservan el prototipo.
- `OccupationExplorationPages.tsx` conserva únicamente `ExplorationCaseIntroPage` y `ForestFireCasePage`, sus imports necesarios y sus exports. Se comprobó que los cuerpos de ambas funciones permanecen idénticos.
- Se conserva `src/features/student-experience/reflection/additional.ts`, según A4.
- Adaptación A4, sin cambiar valores esperados ni aserciones del código vigente. Archivos y pruebas tocados:
  - `tests/adventure-rendering.test.mjs`: se eliminan «case drawers contain only the start action and no embedded questions», «map details use the shadcn drawer and expose a close button», «only field missions connect their map points with a route» e «investigation cards preserve visits, favorites and a single reaction without changing the published draft».
  - En ese mismo archivo se retira la carga global de `AdventureMap`; en «adventure keeps the original mission route and switches between path and city» se retiran las dos líneas sobre su fuente, y en «journal home supports topics and keeps readiness separate from entries» se retira el bloque sobre `PostActivityJournalSheet`.
  - `tests/forest-fire-case.test.mjs`: en «both map drawers expose the same status, score and action for every case state» se retira solo el bloque que renderizaba `CityMapView`. Se conservan los cuatro estados y todas las aserciones sobre `mapPoints`.
- `npm run build` y `npm run lint`: pasan. Se mantiene el aviso por tamaño del bundle; Vite regenera los assets tras retirar el código del prototipo.
- `npm test`: antes **356/340/16**; después **352/336/16** (total/correctas/fallas), sin canceladas ni omitidas. Los 16 nombres coinciden con R1 y §9.1; los errores también coinciden, excluyendo únicamente duraciones y números de línea desplazados por A4.
- Registros de validación: `logs/refactor-r2-build.log`, `logs/refactor-r2-lint.log` y `logs/refactor-r2-test.log` (ignorados por Git).
- No se modifica `ov_backend`; no corresponde ejecutar sus pruebas.
- Infracciones de estructura pendientes de medir en R3b; no se ejecuta todavía `check:estructura` ni se generan excepciones.
- Pendiente: R3a (capas compartidas) y fases posteriores. El trabajo se detiene al terminar R2.

## R3a · Capas compartidas (8 de octubre de 2026)

- Se mueven con `git mv` 87 archivos de `src/` a los destinos del mapa para configuración, tipos, datos, estado, lógica, hooks, contexto, componentes compartidos, cliente HTTP y estilos. Los cambios de mayúsculas (`Drawer`, `Select`, `utils`, `theme`) se realizan en dos pasos en Windows.
- Para cumplir la condición explícita de cierre «ningún import apunta a missions u occupation-exploration/lib», se incluyen en esta subfase los siete módulos restantes de esas carpetas: `JourneyContent`, `AdventureAchievements`, `TravelerResources`, `LumiSuggestions`, `ForestFireCaseLogic`, `ForestFireCaseOutcome` y `ForestFireSceneGeometry`. Sus destinos son los del mapa; R3b mueve el resto.
- Se trasladan los tipos de §6.3, con sus tipos dependientes, a `types/activities.ts`, `types/discovery.ts` y `types/profile.ts`. Los módulos de origen los importan y conservan sus exports de tipos. `lib/servidor/adaptadores.ts` solo importa tipos de `types/`.
- Se conserva una sola declaración de `interviewDetails` en `data/content/research.ts`; el módulo de la orientadora la importa y conserva su export, junto con `reactionOptions`. Se comprobó que ambas declaraciones originales eran idénticas.
- Se actualizan `components.json` y el import de `styles/theme.css` en `index.css`. No se modifican reglas CSS, contenido JSON, marcado, textos, claves de almacenamiento ni operaciones HTTP.
- Adaptación A1: se actualizan rutas, imports sustituidos y patrones de imports. Los ayudantes `file`, `caseFile`, la base del piloto y los argumentos de `immersivePlayerHarness` pasan a rutas explícitas, sin resolución de carpetas.
- Adaptación A2: los cargadores de `adventure-state.test.mjs` y `mission-store.test.mjs` resuelven `@/` como el cargador de `adventure-rendering`.
- Adaptación A5: `servidor-ayudas.mjs` y `servidor-mara-ayudas.mjs` se mueven a `tests/soporte/`, con sus imports actualizados.
- Archivos de pruebas adaptados (solo A1, A2 y A5): `adventure-rendering.test.mjs`, `adventure-state.test.mjs`, `deployment-assets.test.mjs`, `forest-fire-case.test.mjs`, `mission-logic.test.mjs`, `mission-store.test.mjs`, `parent-missions.test.mjs`, `servidor-adaptadores.test.mjs`, `servidor-avisos.test.mjs`, `servidor-flujo.test.mjs`, `servidor-local.test.mjs`, `servidor-logros.test.mjs`, `servidor-mara.test.mjs`, `servidor-resultados.test.mjs`, ambos ayudantes de `soporte/`, `staff-palette.test.mjs`, `student-profile.test.mjs`, `student-progress-challenges.test.mjs` y `student-reflection-pilot.test.mjs`. No se cambian aserciones de comportamiento.
- `npm run build` y `npm run lint`: pasan, sin nuevos avisos de lint. Se conserva el aviso de tamaño del bundle.
- `npm test`: antes **352/336/16**; después **352/337/15** (total/correctas/fallas). Según la excepción de §9.1, se registra que «real access conditions lock successive missions and expose the city gate without changing review mode» empieza a pasar: su falla anterior era `Cannot find module '../challenges/data'`, y al mover ese dato a la capa compartida su import pasa a `@/data/content/challenges`. No se cambia la prueba para corregir su comportamiento. Las otras 15 fallas conservan nombre y motivo; no hay nuevas fallas.
- Auditoría de los 305 archivos originales de `src/`: el código ejecutable y JSX, excluyendo imports y exports de módulos, coinciden; CSS y JSON coinciden. La única excepción de código es la extracción explícita de la copia duplicada de `interviewDetails`, comprobada por separado.
- Registros en `logs/refactor-r3a-*.log` y `logs/r3a-auditoria.json`, ignorados por Git. No quedan imports a las carpetas indicadas en la condición de R3a.
- No se modifica `ov_backend`; no corresponde ejecutar sus pruebas. Las infracciones de estructura se medirán en R3b.
- La solicitud «ejecuta R3» abarca R3a y R3b: se confirma R3a y se continúa con R3b, deteniéndose antes de R4.

## R3b · Features y páginas (8 de octubre de 2026)

- Se mueven con `git mv` los 185 archivos restantes del mapa a las features de dominio y `pages/`. Sumados a R3a, los 272 movimientos del Anexo C quedan completos. Se comprueba que todos los destinos existen y que no quedan archivos en las rutas antiguas (salvo renombres de mayúsculas en Windows).
- Se extraen `LoginRoute` y `RoleSelectionRoute` a `pages/auth/` y `SoloLocal` a `routes/SoloLocal.tsx`, con los imports necesarios. `roleHomePaths` acompaña a `RoleSelectionRoute`. Una comparación de las funciones confirma que sus cuerpos y el de `AppRoutes` permanecen idénticos.
- Se retiran las ocho carpetas antiguas de `features/` únicamente después de comprobar que están vacías. No se divide ningún otro componente ni se extrae lógica de datos: esos trabajos corresponden a R5 y R6.
- Adaptación A1: se actualizan rutas de archivos, imports sustituidos, patrones de imports y las rutas que delimitan los cargadores de pruebas. No se cambian valores esperados, textos, marcado ni aserciones de comportamiento.
- Archivos de pruebas adaptados: `adventure-rendering.test.mjs`, `counselor-portal.test.mjs`, `forest-fire-case.test.mjs`, `parent-missions.test.mjs`, `servidor-avisos.test.mjs`, `servidor-flujo.test.mjs`, `servidor-local.test.mjs`, `servidor-logros.test.mjs`, `servidor-mara.test.mjs`, `servidor-resultados.test.mjs`, `soporte/servidor-ayudas.mjs`, `soporte/servidor-mara-ayudas.mjs`, `student-profile.test.mjs`, `student-progress-challenges.test.mjs` y `student-reflection-pilot.test.mjs`. El acceso a los portales y a su suite está autorizado por §0 de la especificación.
- **Diferencia respecto de las 46 excepciones previstas:** el primer registro arroja **47: 22 E3, 2 E4, 20 E5 y 3 E7**. La adicional es `src/pages/auth/LoginRoute.tsx`, que conserva el import de `modoApi` que tenía dentro de `AppRoutes.tsx`; al quedar en `pages/`, el verificador le aplica E5. Esta diferencia se explicó antes de continuar. Se conserva el verificador del Anexo B sin cambios y se registra la infracción real, sin ocultarla ni adelantar R5.
- `npm run check:estructura`: pasa con las 47 excepciones registradas en `scripts/estructura-excepciones.json`, sobre 310 archivos. No hay infracciones de ubicación, nombres, imports, capas ni alias fuera de las categorías previstas.
- `npm run build` y `npm run lint`: pasan. Se conserva únicamente el aviso de tamaño del bundle en build.
- `npm test`: antes y después de R3b **352/337/15**, sin canceladas ni omitidas. Las 15 fallas conservan nombre y motivo. Respecto de R2, sigue pasando la prueba de acceso real descrita en R3a, conforme al registro exigido por §9.1; no aparecen fallas nuevas.
- Auditoría de los 307 archivos anteriores a R3b: código ejecutable, JSX, CSS y JSON conservados, excluyendo imports y exports de módulos; la extracción de `AppRoutes` se comprueba por separado. No quedan referencias a las carpetas antiguas en `src/` ni en el contenido de `tests/`.
- Registros en `logs/refactor-r3b-*.log` y `logs/r3b-auditoria.json`, ignorados por Git. Los cuatro documentos entregados continúan sin seguimiento, sin modificaciones.
- No se modifica `ov_backend`; no corresponde ejecutar sus pruebas. No se agregan dependencias ni se hace push.
- Pendiente: R4 (servicios del backend, que resolverá las dos E4); R5 debe incluir también el modo de datos de `LoginRoute` al reducir E5; R6 resolverá tamaño y dependencias entre componentes. El trabajo se detiene antes de R4.

## R4 · Servicios del backend (8 de octubre de 2026)

- Se extraen las 13 peticiones de §5.1 a `services/api/cuentas.ts` (5), `acciones.ts` (3), `instrumentos.ts` (4) y `demo.ts` (1). Las funciones reciben sus argumentos, construyen la URL y el cuerpo y devuelven `Promise<RespuestaServidor<T>>`, sin estado ni acceso a la cuenta activa o al modo de datos.
- `store/servidor/operaciones.ts` y `estadoServidor.ts` usan imports de espacio de nombres de esos servicios. El ayudante privado `consultarCuenta` recibe una función de consulta para conservar sus comprobaciones de modo, cuenta y sesión sin construir URLs. Se mantienen revisiones, cachés, orden de llamadas, avisos y mensajes de error.
- `services/api/cliente.ts`, `store/servidor/cuenta.ts` y `types/servidor.ts` permanecen sin cambios. `fetch` sigue únicamente en el cliente; ningún almacén importa `pedir` ni construye rutas HTTP.
- Se añade únicamente `tests/servidor-servicios.test.mjs`, con 13 pruebas, una por función. Comprueban URL completa con base configurada, codificación de caracteres reservados, GET sin opciones, POST con método, cabecera y cuerpo JSON exactos, respuesta correcta, errores 409/503 y desconexión sin reintentos. Se usan los fixtures existentes y se marcan los datos adicionales como `DATO DE PRUEBA`. No se modifican pruebas existentes ni sus aserciones.
- Se retiran solo las dos excepciones E4 resueltas, sin regenerar la lista. `npm run check:estructura`: pasa sobre 314 archivos con **45 excepciones: 22 E3, 20 E5 y 3 E7**. Se conserva la diferencia de E5 de `LoginRoute` registrada en R3b, pendiente de R5.
- `node --test tests/servidor-*.test.mjs`: **77 pruebas, 77 pasan**, sin canceladas ni omitidas.
- `npm run build` y `npm run lint`: pasan. El build mantiene el aviso por tamaño del bundle; no hay errores de compilación ni de lint.
- `npm test`: antes **352/337/15**; después **365/350/15** (total/correctas/fallas), sin canceladas ni omitidas. Las 13 nuevas pasan. Las 15 fallas de R3b conservan nombres y errores completos, excluyendo únicamente duraciones. No se corrigen fallas previas ni aparecen nuevas.
- Registros de validación: `logs/refactor-r4-build.log`, `refactor-r4-lint.log`, `refactor-r4-test.log`, `refactor-r4-estructura.log` y `refactor-r4-servidor.log`, todos dentro de `logs/`, ignorado por Git.
- No se modifica `ov_backend` ni el contrato; no corresponde ejecutar sus pruebas. No se agregan dependencias ni se hace push. Los cuatro documentos entregados continúan sin seguimiento y sin modificaciones.
- Pendiente: R5 (origen de datos fuera de las vistas) y fases posteriores. El trabajo se detiene al terminar R4.

## R5 · Adventure y autenticación (8 de octubre de 2026)

- Se extraen sesión y sincronización local a `useServerSession`; nivel y presentación del viajero a `useTravelerLevel`; requisitos y apertura de Ciudad a `useCityRequirement` y `useCityAccess`; consultas y acciones del mapa a `useMapScreen`; cuenta y reinicio a `useStudentAccount`; menú y cola de novedades a `useNovelties` y `useNoveltyQueue`. Se conservan efectos, dependencias, cancelaciones, revisiones y orden de llamadas.
- Se incluye `auth/hooks/useLogin` en este primer commit, según el plan aprobado, para resolver la E5 adicional de R3b. Mantiene el orden de guardar usuario, preparar ingreso, iniciar acceso y navegar. La vista recibe `active` y `enter`.
- Las vistas reciben datos, acciones y banderas del dominio; no importan el modo de datos. Se conservan componentes, marcado, clases, textos, estilos y exports. No se adelantan las divisiones de R6.
- Adaptación A3 en `tests/adventure-rendering.test.mjs`: los dos cargadores que simulaban directamente React y el router de las vistas cargan ahora los hooks trasladados con esos mismos mocks. Se actualiza el especificador del mock de `checkIn` para la nueva ubicación. No cambian pruebas, valores esperados ni aserciones.
- `npm run build` y `npm run lint`: pasan, con el aviso existente de tamaño del bundle. `npm test`: **365/350/15**, mismos nombres y motivos de las 15 fallas de R4, sin canceladas ni omitidas; todas las pruebas `servidor-*` pasan dentro de la suite completa.
- `npm run check:estructura`: pasa sobre 323 archivos con **35 excepciones: 21 E3, 11 E5 y 3 E7**. Se retiran nueve E5 (ocho de Adventure y una de autenticación) y la E3 de `MapScreenLayout`, que queda por debajo de 300 líneas. No se regenera la lista ni se modifica el verificador.
- Registros en `logs/refactor-r5-adventure-*.log`, ignorados por Git. No hay dependencias nuevas, cambios en backend ni push. Continúan Activities, Backpack y Discovery dentro de R5.

## R5 · Activities (8 de octubre de 2026)

- `useActivityCompletion` recibe actividad, modo directo, edición, instrumento y cierre; devuelve el modelo de navegación y sus acciones. `useInstrumentResponses` recibe las mismas referencias de envío y montaje, los setters y la función de avance, conservando bloqueo de envíos, confirmaciones parciales, revisión y recuperación de respuestas.
- Una comparación de los cuerpos completos de `move`, `advance` e `itemResponse`, mediante el AST de TypeScript sin comentarios ni diferencias de formato, confirma que son idénticos a los anteriores. Sigue existiendo una sola llamada a `await completarActividad(` en todo `src/`, dentro del movimiento al llegar a `$fin`.
- `useActivityResources`, `useActivityFinish` y `useInstrumentResult` preparan disponibilidad y acciones de fichas, recibo de cierre y resultados. Las cuatro vistas dejan de importar `modoApi`; sus componentes, marcado, textos, estilos y exports se conservan. Los cinco hooks quedan por debajo de 400 líneas.
- Adaptación A3: `tests/servidor-flujo.test.mjs` cuenta la llamada de finalización en `useActivityCompletion.ts`, con la misma aserción. El cargador específico de recursos de `tests/adventure-rendering.test.mjs` aplica su fixture de catálogo al hook trasladado. Ninguna aserción ni valor esperado cambia.
- Build y lint pasan. Suite completa **365/350/15**, con los mismos nombres y motivos de R4 y sin canceladas ni omitidas; las 77 pruebas `servidor-*` siguen en verde.
- Estructura: pasa sobre 328 archivos, **30 excepciones: 20 E3, 7 E5 y 3 E7**. Se retiran cuatro E5 y la E3 de `StudentActivityPlayer`, que queda por debajo de 300 líneas al extraer su lógica. No se regenera la lista ni se divide el marcado.
- Registros en `logs/refactor-r5-activities-*.log`, ignorados por Git. Continúan Backpack y Discovery; backend, dependencias y documentos entregados permanecen sin cambios.

## R5 · Backpack (8 de octubre de 2026)

- `features/backpack/hooks/useBackpack.ts` concentra selección inicial por URL, filtros, recursos disponibles, favoritos, visitas, lectura de fichas y consulta de requisitos con sus cancelaciones y reintentos. La vista recibe esos datos y acciones, incluida `mostrarRequisito`, sin importar `modoApi`.
- Se mantienen los tres componentes de la vista y sus exports, el marcado, navegación, textos, estilos y consultas. No se adelanta su división de R6. No se modifican pruebas en este commit.
- Build y lint pasan. Suite completa **365/350/15**, mismas fallas y motivos de R4, sin canceladas ni omitidas; todas las pruebas `servidor-*` pasan.
- Estructura: pasa sobre 329 archivos con **29 excepciones: 20 E3, 6 E5 y 3 E7**. Se retira la E5 de la mochila y se actualiza únicamente el detalle de su E3 al reducirse las líneas; no hay excepciones nuevas ni regeneración de la lista.
- Registros en `logs/refactor-r5-backpack-*.log`, ignorados por Git. Queda Discovery para completar R5; backend, dependencias y documentos entregados permanecen sin cambios.

## R5 · Discovery y cierre de fase (8 de octubre de 2026)

- Se extraen `useCatalogAffinity` (compartido por catálogo y detalle de ocupación), `useStudentProfile`, `usePassport`, `useBadgeDetail` y `useHelenaPages`. Preparan afinidades y su orden, perfil, nivel, insignias, requisitos, fechas, páginas reveladas y acciones. Conservan las claves por cuenta y fecha de cálculo del resultado, las comprobaciones de disponibilidad y las cancelaciones de consultas.
- Las vistas reciben modelos, acciones y banderas del dominio (`mostrarRequisito`, `revelacionBloqueada`, `mostrarPuntajes`, etc.); no reciben `modoApi` ni una bandera genérica equivalente. Se conservan los dos diseños existentes de perfil, cierre y resultados mediante sus modelos opcionales de ficha, registro y resultado. No se modifican pruebas en este commit.
- Build y lint pasan, con el aviso existente de tamaño del bundle. Suite completa **365/350/15**, sin canceladas ni omitidas. La comparación con R4 confirma los mismos nombres, motivos, detalles y valores de las 15 fallas; se excluyen únicamente duraciones y ubicaciones de pila desplazadas por las extracciones. La ejecución separada de `node --test tests/servidor-*.test.mjs` confirma **77/77**.
- Estructura: pasa sobre 334 archivos con **22 excepciones: 19 E3 y 3 E7; ninguna E5**. Se retiran las seis E5 restantes y la E3 de `HelenaBookView`, que queda por debajo de 300 líneas al extraer su lógica.
- Auditoría de las 20 vistas modificadas respecto de R4: se mantienen la secuencia de elementos JSX, atributos literales, textos JSX y exports. Los 23 hooks existentes y nuevos están por debajo de 400 líneas. Sigue habiendo una sola llamada a `await completarActividad(`. Ninguna vista importa `modoApi` o `desarrollo`.
- Resultado global de R5: 20 hooks nuevos; resueltas las 20 E5, incluida autenticación. También se resuelven, como consecuencia directa de las extracciones, las E3 de `MapScreenLayout`, `StudentActivityPlayer` y `HelenaBookView`. Solo se reducen excepciones y se actualiza el tamaño restante de la mochila; no se regenera la lista ni se modifica el verificador.
- Adaptaciones de pruebas de toda R5: únicamente A3 en `tests/adventure-rendering.test.mjs` y `tests/servidor-flujo.test.mjs`, descritas en los apartados anteriores. No se añaden ni eliminan pruebas ni se cambian aserciones de comportamiento.
- Registros finales en `logs/refactor-r5-discovery-*.log`, `logs/refactor-r5-servidor.log` y `logs/refactor-r5-auditoria.log`, ignorados por Git. `services/`, `store/`, `types/`, `config/`, estilos, manifiestos y archivo de bloqueo permanecen sin cambios respecto de R4. No hay dependencias nuevas, cambios en backend ni push.
- Los cuatro documentos entregados continúan intactos y sin seguimiento. R5 termina con un commit por dominio en el orden Adventure (incluye autenticación), Activities, Backpack y Discovery. Pendiente: R6, que resolverá tamaño y dependencias entre componentes; R7 actualizará la documentación general. El trabajo se detiene antes de R6.

## R6 · Estudiante (8 de octubre de 2026)

- Se continúa desde `39657d5` en `refactor-estructura`. El alcance autorizado es únicamente el estudiante, con un commit `Refactor · R6: estudiante`. La aclaración del usuario autoriza conectar la vista de conversaciones del apoderado a la lógica común de §8.3, conservando su presentación y dejando pendiente su división.
- Casos: estado, efectos, enfoque y transiciones pasan a `useForestFireCase`; se separan `StepActions`, `ClueList`, `SatisfactionBar`, `PhaseResultScreen`, `FinalReportScreen` y `ForestFireWorkspace`. Las pantallas profesionales adicionales, el directorio y las hojas de vida quedan en archivos propios; sus estados y gestos se trasladan a hooks del dominio. Se conservan los pasos, presupuesto, puntuaciones, arrastre y cierre del intento.
- Diario: `useJournalPage` conserva parámetros de URL, memoria solicitada, edición, etiquetas, guardado, avisos y eliminación. Inicio, editor, detalle, introducción, tarjeta, etiquetas y pestaña quedan en componentes propios; `useJournalHome` mantiene el filtro por tema y los cálculos del inicio. Se separan también el retrato y la pregunta de Lumi sin cambiar sus diseños.
- Actividades: `useActivityPlayer` coordina el estado, efectos y navegación, y `useActivityCompletion` conserva íntegro el cuerpo de `move`, incluida la única llamada a `await completarActividad(` al alcanzar `$fin`. Ambos comparten las mismas referencias y setters con `useInstrumentResponses`; se conservan las confirmaciones de guardado, reintentos, revisión y protección tras desmontar. `NodeRenderer` contiene el renderizado trasladado. `useChallengePlayer` y `ChallengeStage` separan estado y presentación del desafío.
- Mochila: se reutiliza `useBackpack` y se separan `BackpackHeader`, `BackpackCard` y `ResourceContent`. El texto narrativo que usan actividades y mochila pasa a `components/student/ResourceText.tsx`, sin dependencias de dominio; así la extracción no introduce una E7. Los filtros, disponibilidad, requisitos, favoritos y acciones mantienen su comportamiento.
- Descubrimiento: `useStudentResearch` y `useResearchGuide` concentran el estado, efectos y acciones de investigación y su guion; se separan encabezado, pasos, selector de ocupación y confirmación de reemplazo. `HelenaBookPages` reutiliza `useHelenaPages`. Las rutas de perfil, investigación y casos, el panel plegado del mapa y los demás componentes exportados del estudiante que compartían archivo quedan separados, conservando sus nombres. Los ayudantes privados restantes no superan unas 40 líneas por archivo.
- Conversaciones: `features/family-conversations/lib/conversations.ts` unifica `updateConversation`, `getTopicStatus`, el progreso del regalo y los datos de su recurso, conservando `audience`. Ambas vistas lo consumen. La vista inmersiva tiene componentes de tarjeta, participantes, detalle, respuesta y regalo en `components/immersive/`; `useFamilyConversations` y `useConversationTopic` conservan su estado y acciones. La vista del apoderado cambia únicamente sus imports y las llamadas a esa lógica común.
- Mapa: las declaraciones se distribuyen entre `caminoPoints.ts`, `ciudadPoints.ts`, `pointDetails.ts` y `missionSync.ts`; `mapPoints.ts` conserva tipos y selectores compartidos. Los consumidores importan el archivo concreto, sin barriles ni renombres de símbolos. `useMapInteraction` conserva estado, URL, enfoque y controles del mapa. Camino y Ciudad inyectan las piezas de diario y casos al cajón; Camino inyecta además `AdditionalReveal`. Desaparecen las tres E7 previstas.
- CSS: el archivo global del estudiante se divide por los cuatro comentarios de sección en `student-base.css`, `student-logbook.css`, `student-targets.css` y `student-progress.css`. `StudentShell` y `StudentThemeScope` los importan en ese orden. La concatenación conserva exactamente el contenido original, incluidos los finales de línea; no se reescribe ninguna regla.
- Se añaden las marcas `DATO DE PRUEBA` de §5.4 correspondientes al estudiante en investigación, recursos, diario, perfiles de ocupación, Helena y conversaciones familiares. Solo cambian comentarios, sin alterar datos. Las marcas exclusivas de apoderado y orientadora quedan pendientes.
- Adaptación A3, sin cambiar aserciones: `adventure-rendering.test.mjs`, `forest-fire-case.test.mjs`, `servidor-flujo.test.mjs`, `servidor-local.test.mjs`, `servidor-mara.test.mjs`, `soporte/servidor-ayudas.mjs`, `student-progress-challenges.test.mjs` y `student-reflection-pilot.test.mjs`. El ayudante `soporte/refactor-map.mjs` carga las funciones desde sus módulos finales; los cargadores de bloques trasladados conservan el entorno simulado y los árboles inspeccionados. La lectura de reglas CSS apunta a `student-base.css`. La auditoría confirma las **1.813 aserciones idénticas** de esos ocho archivos; no se añaden ni eliminan pruebas.
- Build y lint pasan, con el aviso previo de tamaño del bundle. La suite completa conserva **365/350/15**, sin canceladas ni omitidas; las 15 fallas mantienen nombres, motivos, detalles y valores, excluyendo duraciones y ubicaciones de pila. La ejecución separada de `servidor-*` conserva **77/77**. Las comprobaciones se repiten sobre el commit terminado.
- Auditoría adicional: HTML idéntico en **30 combinaciones de ruta y modo**, incluido el apoderado; inventario completo de elementos DOM, atributos literales y textos JSX idéntico; **22 cuerpos o prefijos de navegación, selectores, estado, efectos y acciones idénticos**. Los componentes del estudiante cumplen 300 líneas y los hooks y módulos de lógica, 400. Ninguna vista importa `modoApi` o `desarrollo`; sigue existiendo una sola llamada de finalización.
- Estructura: pasa sobre **408 archivos**, con **10 excepciones E3** pendientes de los otros portales. Se eliminan manualmente las nueve E3 del estudiante y las tres E7; se actualiza la E3 de conversaciones compartidas de 643 a **612 líneas**. No se regenera la lista, no se modifica el verificador y no se admiten infracciones nuevas. La lista vacía corresponde al cierre de toda R6, no a esta ejecución parcial.
- Candidatos conservados según §8.3: `JourneyContent/ContentBlocks` (ahora sus piezas están bajo `activities/components/journey/`) y `ParentContent/ContentBlocks` siguen siendo presentaciones distintas; no se fusionan en este refactor.
- Registros en `logs/refactor-r6-*.log`, ignorados por Git. No se modifican backend, contratos, operaciones HTTP, claves o formatos de almacenamiento, dependencias ni archivos de entorno. No se hace push. Los cuatro documentos entregados permanecen intactos y sin seguimiento. El trabajo se detiene antes de R6 del apoderado, R6 de la orientadora y R7.

## R6 · Apoderado (8 de octubre de 2026)

- `useParentActivitySession` conserva la sesión, avance, retroceso, práctica, celebración y referencias de enfoque y recursos; `useParentQuestion` conserva intentos, comprobación, reintento y enfoque. Se separan sesión, pregunta, diapositiva, cierre, botón anterior y actividad no disponible, con los mismos componentes y textos del reproductor.
- `useParentOverview` concentra selección del hijo por URL, progreso, conversaciones y enfoque temporal del diploma, conservando efectos y limpiezas. Inicio compone `ParentChildrenSummary`, `ParentConversationNotice` y `ParentRouteSummary`. El contenido de lectura y su formato en línea se separan de `ParentContent` sin fusionarlo con los otros diseños narrativos.
- Las conversaciones personales se dividen en tarjeta, participantes, detalle, respuesta y regalo, conservando `audience` y la lógica común de `conversations.ts`. `usePersonalFamilyConversations` y `usePersonalConversationTopic` trasladan su estado y acciones sin modificar la vista inmersiva. Se marca como `DATO DE PRUEBA` el contenido demostrativo del apoderado, sin cambiar valores.
- No se necesita adaptar ninguna prueba. Build y lint pasan; suite completa **365/350/15**, mismas fallas y motivos, sin omitidas ni canceladas; suites `servidor-*` **77/77**. Auditoría: **42 combinaciones de ruta y modo con HTML idéntico**, inventario DOM y textos JSX idénticos y cinco prefijos de estado, efectos y transiciones idénticos. CSS y los cuatro documentos entregados permanecen intactos.
- Se retiran manualmente tres E3 (reproductor, inicio y conversaciones). Estructura pasa con **7 excepciones E3**, reservadas a orientadora y componentes compartidos de seguimiento. Todos los archivos nuevos respetan sus límites. Validaciones repetidas sobre el commit terminado; registros `logs/refactor-r6-parent-*.log`, ignorados por Git. Sin backend, dependencias ni push; continúa R6 de orientadora, antes de R7.

## R6 · Orientadora y cierre de fase (8 de octubre de 2026)

- `StudentDetailView` conserva encabezado y navegación; resumen, progreso, instrumentos, intereses, registros, diario, familia y datos quedan en `features/counselor/components/student-detail/`, con sus piezas auxiliares en archivos propios. Se separan los diálogos de observación. `useStudentDetail`, `useStudentProgress` y `useStudentRecords` trasladan estado y transiciones; `activityTypeLabel` e `institutionTypeLabel` pasan a `lib/labels.ts`, conservando nombres y cuerpos.
- El inicio usa `useCounselorDashboard`, métricas y secciones propias de alertas, cuestionarios, registros, seguridad, carreras e instituciones. `Section` y `ConfigurePriorities` quedan separados. `usePriorities` conserva borrador, confirmaciones, guardado y limpieza del aviso; herramientas, registros, controles y confirmación tienen componentes propios. `usePublications` prepara filtros y datos de entrevistas; tabla, tarjetas, estado y enlace se separan sin alterar moderación ni reportes.
- `ResourceDetail` e `InterviewDetail` quedan en archivos independientes. Se separan todas las piezas de `ProfileSections`, `ProfileShared`, `Questionnaires`, `ClassroomShared`, `CounselorShared` y `StaffPatterns`. Los consumidores importan el archivo concreto; las vistas del apoderado solo ajustan sus imports compartidos. `QuestionnaireDetailView` pasa a `pages/counselor/`; `useTrackingProfile`, `useProfileRecords` y `useQuestionnaireDetail` conservan efectos de enfoque, URL y filtros del seguimiento compartido. También se separan las alertas del perfil y del listado, el campo de configuración y la respuesta del registro familiar. Los ayudantes privados restantes cumplen el límite aproximado de 40 líneas.
- Se añaden las marcas `DATO DE PRUEBA` pendientes a perfiles demostrativos, datos de orientadora y estudiantes de ejemplo, sin cambiar valores. Las duplicaciones narrativas indicadas en el registro del estudiante siguen pendientes de una decisión posterior; no se fusionan diseños.
- Única adaptación A3 de este commit: las tres cargas de `QuestionnaireBars` en `tests/adventure-rendering.test.mjs` apuntan a su nuevo archivo. La auditoría confirma las **1.287 aserciones idénticas** del archivo; no se añaden ni eliminan pruebas ni se cambian valores esperados.
- Build y lint pasan, con el aviso previo de tamaño del bundle. Suite completa **365/350/15**, mismas fallas, nombres, motivos, detalles y valores; sin omitidas ni canceladas. Las suites `servidor-*` mantienen **77/77**. Auditoría: **86 combinaciones de ruta y modo con HTML idéntico**, incluidos perfiles reales del catálogo demostrativo, cuestionarios, publicaciones y apoderado; inventario DOM, atributos literales y textos JSX idénticos; **11 cuerpos o prefijos de estado, efectos, transiciones y etiquetas idénticos**. CSS concatenado, una única llamada a `await completarActividad(` y los cuatro documentos entregados intactos.
- Se eliminan manualmente las siete E3 restantes. `scripts/estructura-excepciones.json` queda en **`[]`**; estructura pasa sobre **515 archivos, sin infracciones**. No se regenera la lista ni se modifica el verificador. Todos los componentes revisados respetan 300 líneas y los módulos de lógica, 400; un componente exportado por archivo.
- Se repiten build, lint, suite completa, servidor, estructura y auditoría sobre el commit terminado. Registros `logs/refactor-r6-counselor-*.log`, ignorados por Git. R6 queda completa con un commit por portal: estudiante, apoderado y orientadora. Sin dependencias nuevas, cambios en backend, almacenamiento, peticiones HTTP, estilos, contratos ni push. Los cuatro documentos entregados siguen intactos y sin seguimiento. Se detiene antes de R7; no se reemplazan `AGENTS.md` ni `README.md`.

## R7 · Documentación y cierre del refactor (8 de octubre de 2026)

- Se sustituye `AGENTS.md` por la plantilla del Anexo A. Sus dos referencias a `docs/spec-refactor-estructura.md` se ajustan a la ubicación real, `docs/refactor/spec-refactor-estructura.md`; el resto coincide con la entrega. Quedan documentadas las capas, dependencias, límites, ausencia de barriles, decisiones de datos en hooks y obligación de mantener vacío el registro de excepciones.
- `README.md` incorpora el árbol de §3 y la tabla de §3.3, enlaza el inventario de datos y actualiza las rutas del servidor y del cierre de actividades. La única llamada a `await completarActividad(` permanece en `features/activities/hooks/useActivityCompletion.ts`, al alcanzar `$fin`; el reproductor coordina su uso mediante los hooks extraídos. La sección de CSS indica los cuatro archivos finales y se conservan los cierres históricos de la iteración.
- `docs/refactor/origen-de-datos.md` registra las 13 peticiones por router, el contenido narrativo, los catálogos fijos, los datos de demostración y los almacenes del navegador con sus rutas finales. Se especifican las claves, los formatos por cuenta, la revelación por fecha de resultado y las preferencias locales; se aclara que prioridades y salón usan `sessionStorage`. Se describen el recorrido servicio → almacén → hook → vista y los puntos de sustitución para futuras iteraciones, sin adelantar su implementación.
- Conforme a R7 se retiran las copias de entrega `docs/refactor/AGENTS.md` y `docs/refactor/verificar-estructura.mjs`. La spec y el mapa se conservan byte por byte y sin seguimiento. El verificador instalado en `scripts/` no cambia.
- En `ov_backend/AGENTS.md` cambian únicamente las dos reglas del contrato que mencionaban las rutas anteriores del frontend. La sección compartida queda idéntica en ambos repos; todo el contenido exclusivo del backend se conserva byte por byte. La decisión compartida se registra en `ov_backend/docs/iteraciones/decisiones-iteracion-1.md`, con un commit independiente en `iteracion-1`.
- Build y lint pasan, con el aviso previo de tamaño del bundle. Suite completa **365/350/15**, sin canceladas ni omitidas: las mismas 15 fallas conservan nombres, motivos, detalles y valores. Las suites `servidor-*` mantienen **77/77**. Estructura pasa sobre **515 archivos, sin infracciones**, con `scripts/estructura-excepciones.json` en **`[]`**. No se adapta ninguna prueba ni se modifica código, CSS, contratos, peticiones, almacenamiento, dependencias o configuración de entorno.
- Auditoría documental: plantilla aplicada, reglas compartidas idénticas, contenido exclusivo del backend intacto, spec y mapa intactos, copias retiradas, rutas documentadas existentes y 13 funciones HTTP inventariadas. No quedan referencias a las carpetas retiradas en `src/`, `tests/`, `AGENTS.md` ni `README.md`, salvo las carpetas de documentación permitidas por R7. Registros `logs/refactor-r7-*.log`, ignorados por Git.
- Backend: `uv run --no-sync --offline python -m pytest -q`, con `EVALUADOR=falso`, `SEMILLA=demo`, caché y temporales fuera de su repo: **1.023 correctas, 4 omitidas, cero fallas**, en 772 segundos; dos advertencias de dependencias. Se comprueba con `-rs` que las cuatro omitidas son los escenarios opcionales de PostgreSQL por falta de `TEST_POSTGRES_URL`. No se instala ninguna dependencia ni se accede a Gemini.
- R7 queda completa con un commit documental por repo. `refactor-estructura` queda lista para revisión e integración por el usuario; no se integra ni se hace push. No se inicia ninguna fase adicional. La spec y el mapa permanecen sin seguimiento, como en las fases anteriores.


## Actividades por dominio · F4 · 2026-10-08

Recorrido manual de §12 sobre dos SQLite desechables independientes, creadas
con Alembic y `datos.cargar`, evaluador falso y frontend en modo API. No se
modifican archivos de entorno ni la base del usuario. El registro de acceso
del servidor confirma al ingresar únicamente cuentas, ingreso, resumen,
actividades y no vistos; fichas y logros esperan su vista. Perfil y pasaporte
comparten la carga de logros; mochila pide fichas una vez.

Con `piloto`: cinco actividades y Ciudad cerrada al inicio. Bienvenida y
los 24 nodos de enc-mitos se completan desde el navegador: progreso 20 % y
40 %, Ciudad disponible y Mara 1/14. Elena y la actividad sin contenido
están ausentes; esta última emite un aviso por sesión en desarrollo.
Mochila presenta las cuatro fichas obtenidas. Las catorce interacciones de
Mara se aceleran mediante responder-items y completar-actividad sobre la
base temporal: Elena aparece disponible. No se atribuye esa preparación a
un recorrido de catorce reproductores en la interfaz.

Con `plataforma`: nueve actividades, Ciudad cerrada y solo bienvenida
disponible. Tras dos finalizaciones por API sigue cerrada; al completar
las nueve se abre. Mapa y panel reflejan completadas, nivel 3 y siguiente
paso Mara. Mochila muestra cuatro fichas; perfil y pasaporte, I1–I3 y
Cartógrafo de posibilidades. Después de responder y completar las catorce
interacciones por API, Elena pasa de bloqueada a disponible. No hay avisos
de contenido faltante en esta sesión. Menú, panel y presentación conservan
su estructura y textos, salvo las dos excepciones autorizadas en F3.

La revisión detectó una proyección incorrecta: `AL_DESBLOQUEAR` activaba el
indicador local `additional` y mostraba «Misión adicional» en Elena. Se
retira esa proyección en `puntosServidor.ts` y se refuerza el caso existente
de piloto de `servidor-mapa.test.mjs`; no cambian sus expectativas anteriores
ni el número de pruebas. La visibilidad remota no activa la animación local.

`docs/pendientes-interfaz.md` registra los pendientes de §8: texto de la
llave anticipada, ausencia de animación, testimonios, preguntas del diario,
conversaciones y señal de hoy local. Conserva también el contenido ausente
del piloto. No se implementa interfaz para resolverlos. Evidencias y logs
quedan fuera de Git, en visualizaciones de esta conversación.

Front: **413 pruebas, 398 aprobadas y las mismas 15 fallas previas**, con
nombres y detalles idénticos a F3 excluyendo tiempos y ubicaciones de pila.
Build y lint pasan; estructura: **536 archivos, cero infracciones y
excepciones**. Persiste el aviso previo de tamaño del bundle.

Backend: **1103 aprobadas, 4 omitidas y 2 advertencias previas**, evaluador
falso, suite completa en **778,98 segundos**. F4 queda cerrada; se continúa
con X por autorización del usuario. Sin dependencias, Gemini ni push.

## Actividades por dominio · X · 2026-10-08

Se retiran `EstadoCuenta` y los dos fixtures `estado-*.json` según §10.
`obtenerEstado` ya se retiró en F2. No cambia ninguna prueba del frontend:
las suites usan las consultas por dominio desde F2. La regeneración del
exportador produce dieciséis JSON idénticos a los vigentes. Se mantienen
los tipos base de actividades usados por los contratos y adaptadores.

AGENTS incorpora las dos ubicaciones y las dos reglas compartidas de §13;
la sección compartida es idéntica en ambos repos. El inventario refleja el
retiro. No cambian vistas, estilos, textos, almacenamiento ni dependencias.
Los pendientes de interfaz de F4 continúan sin implementación.

Validación X: build y lint correctos (aviso previo del bundle); **413 pruebas,
398 aprobadas y las mismas 15 fallas previas**, con nombres y detalles
idénticos a F4 excluyendo tiempos y ubicaciones de pila, cero omitidas o
canceladas. Estructura: **536 archivos, cero infracciones y excepciones**.
Los dieciséis fixtures son idénticos byte por byte al contenido Git de F4.
La auditoría no encuentra símbolos ni ruta global retirados en src, tests
o scripts. El mapa funciona contra el backend que ya no ofrece esa ruta.

Validación final de X: backend **1091 aprobadas, 4 omitidas, cero fallas y
2 advertencias previas**, con evaluador falso, en **1308,99 segundos**.
Se ejecuta la suite completa `uv run --no-sync --offline python -m pytest -q`
con caché desactivada y temporales externos. Se conservan las cuatro omisiones
de PostgreSQL sin TEST_POSTGRES_URL y los avisos de Starlette/httpx y GenAI.
Pasan todos los escenarios, invariantes y límites SQL. La caída de doce
casos corresponde exclusivamente a las equivalencias temporales retiradas.

Frontend final: **413 pruebas, 398 aprobadas y las mismas 15 fallas previas**,
comparadas también después de actualizar pendientes; cero omitidas o
canceladas. Build, lint y estructura pasan: **536 archivos, cero infracciones
y excepciones**. La auditoría de símbolos/ruta retirada está vacía en ambos
repos y la sección compartida de AGENTS es idéntica. Los dieciséis fixtures
conservan exactamente los bytes del contenido Git anterior.

Un commit X por repo en `iteracion-1`, sin push. F3, F4 y X quedan cerradas.
Los servidores y pestañas temporales se cierran; bases, capturas y logs
permanecen fuera de los repos. No se agregan dependencias ni se llama a Gemini.
Los pendientes de interfaz registrados siguen sujetos a decisión del usuario.
