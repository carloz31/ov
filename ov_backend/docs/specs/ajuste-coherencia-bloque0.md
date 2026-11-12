# Ajuste coherencia-bloque0

## Contexto
El usuario reescribió el contenido de b0-1…b0-6 y de las fichas F01–F03 (textos cerrados, no se tocan) y pidió tres cambios de front surgidos de la revisión: tablas de fichas sin la fila «---», sin aviso de misma familia para el estudiante, y «Anterior» en todos los pasos. No hay spec en curso: se crea `ov_backend/docs/specs/ajuste-coherencia-bloque0.md` con este plan. Rama `ajuste/coherencia-bloque0` (ya creada desde `main`, `a39e47f`).

## Qué cambia (hoy → pasará a)

**Contenido (front)**
- `ov_frontend/src/data/activities/contenidos/plataforma/b0_1.json` … `b0_6.json`: hoy los textos anteriores → se reemplazan, completos, por los seis JSON adjuntos (copia de archivo, sin editar). Nada en front, back ni pruebas usa los ids de nodo `b0-*-NN` (comprobado con grep).
- b0-3 trae `diapositiva` y `eleccion` dentro del `instrumento`: `cuestionarioServidor` (`src/lib/servidor/contenidos.ts`) solo expande el `item` plantilla y conserva el resto, y `NodeRenderer` pinta la diapositiva como en un encuentro. No requiere código; se comprueba en navegador.
- b0-5 trae `opcion_multiple`: ya soportado por `QuestionNode` y `lib/checks.ts`.

**Backend (`ov_backend/datos/contenido.py`)**
- `DESCRIPCIONES` b0-1, b0-2, b0-3: textos de §2.1.
- `ACTIVIDADES`: duración b0-2 5→6, b0-6 8→9.
- `FICHAS` F01: título «Vocación, carrera y ocupación»; celda «Carrera (o profesión)»; párrafo con «carreras… una carrera»; se quita «El programa de orientación vocacional del MINEDU lo dice así: » y queda «La vocación no es un aspecto innato…».
- `FICHAS` F02 y F03: contenido completo de §2.4 y §2.5 (título, descripción y tema iguales).
- Insignia `t-ins-1`: hoy `INSIGNIAS = ruta.INSIGNIAS` y `TEXTOS_INSIGNIAS = ruta.TEXTOS_INSIGNIAS` → se sobrescribe solo en `contenido.py` (requisito «Da el primer paso de tu viaje.», cómo se consiguió «diste el primer paso de tu viaje.»), como ya se hace con `R-t-ins-1`. `ruta.py` no se toca.
- Sin cambio de modelo, endpoints ni esquemas. No se regeneran fixtures (son del conjunto `ruta`); se confirma corriendo `test_exportar_fixtures_front`.

**Front**
- §3.1 `src/components/student/ResourceText.tsx`: hoy descarta filas con `!row.includes('|---')` → descarta toda fila que cumpla `/^[\s|:-]+$/` y contenga «-». Prueba nueva en `tests/servidor/` (área de fichas/mochila donde ya se renderiza `ResourceText`, o `tests/servidor/actividades/`) con `| --- | --- |` y `|---|:---:|`.
- §3.2 `src/features/plans/components/MisPlanes.tsx`: se quita el bloque `avisos.map(...)` (y los imports que queden sin uso). `avisos` sigue llegando por `GET /planes` y por el adaptador. Se adapta la aserción de `tests/servidor/planes/servidor-planes-vistas.test.mjs:65` a «no aparece» (autorizado por §3.2). Se actualizan `docs/origen-de-datos.md` (el aviso de misma familia no se muestra al estudiante), `ov_backend/docs/sistema/planes.md` (sale el pendiente «Es a propósito», l.162) y la entrada correspondiente de `ov_frontend/docs/pendientes-interfaz.md` (l.147–150).
- §3.3 «Anterior» en `src/features/activities/hooks/useActivityPlayer.ts`, constante `anterior`: se quitan las condiciones `node?.tipo !== 'pregunta'`, `previo.tipo !== 'pregunta'`, la del primer ítem del cuestionario y la de «pasos posteriores a la última consigna». Se conservan: `!matrix`, registro local completado/editado, cuestionario local completado, pantalla de Lumi (`registro.vista(node) !== 'lumi'`) y el cierre (sin nodo).
  - `NodeRenderer` pasa `onAnterior` a `QuestionNode`; `QuestionNode` lo pinta con `PasoAnterior` en `.sx-player-actions` (mismo patrón que `ChoiceNode`/`ItemNode`), antes y después de responder.
  - Pregunta ya resuelta al volver: fuera de rehacer ya sale resuelta porque relee `state.attempts`. Al rehacer (`fresh`) los intentos viven solo en el componente y se perderían al desmontar: el reproductor guarda en un `useRef` los intentos de revisión por nodo y `QuestionNode` los recibe como iniciales y los informa al responder (props `intentosRevision` / `onIntentosRevision`). Así se ve resuelta, con su explicación y «Continuar el camino», sin nuevos intentos.
  - Registro tras la última consigna: «Anterior» vuelve al último ítem, que `vista()` ya muestra en lectura (respondido).
  - Pruebas: se adaptan las de `tests/local/actividades/actividades-anterior.test.mjs` que afirman lo contrario (l.33 en lo de la pregunta, l.68, l.156, l.228) al nuevo comportamiento (excepción al modo local aprobada en §3.3) y se agregan casos en `tests/servidor/actividades/` o `tests/servidor/registro/`: «Anterior» en pregunta antes y después de responder, pregunta resuelta al volver sin intento nuevo, primer ítem → diálogo de entrada, paso tras la última consigna → último ítem en lectura. La de la pantalla de Lumi (`servidor-registro-flujo.test.mjs:77`) sigue igual.
  - Se anota la nueva excepción del modo local en `ov_frontend/AGENTS.md` (amplía la de «Anterior» de F01).

## Qué no cambia
Conjunto `ruta` y sus pruebas; reglas de desbloqueo y requisitos; el cuestionario de partida (ítems, escala, cálculo) y el libro de Helena; lógica de planes, opción inicial y señal; backend de `avisos`; actividades y fichas de otros bloques; reproductores de batallas, Central y apoderado; `ParentQuestion`.

## Fases
1. **F1 · Contenido:** copiar los seis JSON; cambios de `contenido.py`. Pruebas: `scripts/verificar_contenido_front.py`, `tests/integration/escenarios` y lo que toque `contenido` / fichas / logros en el back; `tests/local/actividades`, `tests/servidor/actividades`, `tests/servidor/registro` en el front. Commit.
2. **F2 · Front:** ResourceText + prueba; MisPlanes + prueba y documentos; «Anterior» + pruebas. Carpetas de impacto y `npm run test:servidor`. Commit.
3. **F3 · Cierre:** suites completas (back `uv run pytest -n auto -q`; front `npm test`, `build`, `lint`, `check:estructura`); comprobaciones en navegador del §5 (b0-3 lámina, b0-5 múltiple, F01–F03 tablas sin desborde, «Anterior» en b0-1, b0-3, b0-5 (la pregunta de varias respuestas se ve resuelta al volver) y b1-1 ida y vuelta, Mis planes sin aviso); `decisiones.md` con las decisiones del §6 y las de este ajuste. Commit. La spec queda en curso.

## Preguntas abiertas
Ninguna.

## Ajuste · coherencia-bloque1

### Contexto
El usuario reescribió el contenido del bloque 1 (b1-1…b1-7, salvo b1-5), las fichas F04–F06 y el banco de la batalla b1-5 (textos cerrados: se copian tal cual). Spec en curso: `ov_backend/docs/specs/ajuste-coherencia-bloque0.md` → este plan se agrega como sección `## Ajuste · coherencia-bloque1` al final. Rama `ajuste/coherencia-bloque1` (ya creada desde `main`, `a139d71`).

**Contradicción a resolver en código (no en contenido):** las observaciones dicen que `useActivityPlayer.ts` «ya contempla pasos posteriores a la última consigna», pero en api no es así: `useRegistroServidor.continuar` (`src/features/activities/hooks/useRegistroServidor.ts:188-204`) llama a `entregar` y cierra al continuar la última consigna; los pasos de cierre nunca se verían. `decisiones.md` del bloque 0 lo dejó anotado («en un registro del servidor no hay pasos después de la última consigna»). Además, `NODOS_PERMITIDOS.registro` (`src/types/activities.ts:222`) no admite `pregunta`. Las dos cosas se ajustan abajo (§Front).

### Qué cambia (hoy → pasará a)

**Contenido front**
- `src/data/activities/contenidos/plataforma/b1_1.json`, `b1_2`, `b1_3`, `b1_4`, `b1_6`, `b1_7`: se reemplazan, completos, por los de `Downloads/` (copia de archivo).
- `src/data/activities/catalogo.json`: `descripcion` de `cartografa`, `ivan` y `guardian` (§3.1).

**Backend (`ov_backend/datos/contenido.py`, solo conjunto `contenido`)**
- `ACTIVIDADES`: b1-2 título «Mirar hacia adelante» y 5→6; b1-4 12→14; b1-6 título «El mito que traje de casa».
- `DESCRIPCIONES` b1-2, b1-3, b1-4 (§2.2).
- `ITEMS_REGISTRO`: comentario `# b1-6 El mito que traje de casa`; nombre `b1-6-mito` → «El mito y cómo te llegó».
- Reglas: mensajes de `R-b1-2`, `R-F04`, `R-CIUDAD`, `R-c1`…`R-c6`, `R-b1-7`, `R-ma2`, `R-SEC-CHECK_IN` (§2.4); condiciones iguales.
- `FICHAS` F04 (contenido), F05 y F06 (descripción y contenido), textos de §2.5–2.7.
- `PREGUNTAS_BATALLA`: las 14 `b1-5-p01…p14` se reemplazan por las 18 de §2.8 (tal cual). `CONFIGURACION_BATALLAS`, `batallas.py`, `challenges.ts` y `ma2-*` no cambian.
- Sin cambio de modelo, endpoints ni esquemas.

**Front: registros del servidor con pregunta y pasos de cierre**
- `src/types/activities.ts`: `NODOS_PERMITIDOS.registro` agrega `'pregunta'`. `QuestionNode` ya se pinta en cualquier actividad (`NodeRenderer.tsx:142`); en un registro del servidor los intentos van al navegador como en un encuentro, y `entregar` no los mira.
- `useRegistroServidor.ts`: hoy `continuar` en la última consigna entrega → pasará a: si hay un nodo después, `avanzar(siguiente)`; si no, entrega (registros sin cierre, como los de `ruta`, siguen igual). La entrega se separa en `entregar(): Promise<string | undefined>` (devuelve el mensaje de error) y se expone.
- `useActivityPlayer.ts`, `move`: con `modoApi && registroServidor && !next` (Continuar en el último paso de cierre, o «Reintentar» del aviso de error) llama a `registro.entregar()` en vez de `completarActividad` (que el servidor rechaza para registros, 409), con el cargador y el aviso de error del reproductor (`guardando` / `errorServidor`, `StudentActivityPlayer.tsx:94-118`).
- Resultado, según la tabla de las observaciones: entregar el último ítem → pasos de cierre → al continuar el último, `entregar` y pantalla de cierre. Si sale durante los pasos de cierre, el registro queda con todo respondido y sin terminar: al volver se abre en el último ítem (`useActivityPlayer.ts:55`, sin cambio) y desde ahí sigue por los pasos de cierre. «Anterior» desde el primer paso de cierre ya vuelve al último ítem en lectura (lógica del bloque 0, sin cambio). Rehacer un completado recorre todo y vuelve a entregar al final.

**Fixtures y pruebas**
- Regenerar fixtures (`uv run python scripts/exportar_fixtures_front.py --destino ../ov_frontend/tests/fixtures/servidor`): `contenido-entregar-b1-1` trae el título nuevo de b1-2.
- `tests/integration/escenarios/contenido/test_casos_contenido.py:51-53`: mensajes nuevos de `R-CIUDAD` y `R-c*`.
- `tests/llm/casos/b1-6.json`: `descripcion` empieza con «El mito que traje de casa».
- Cualquier otra prueba del back que falle por títulos, fichas o tamaño del banco: se actualiza el valor (autorizado por §4).
- Front `tests/servidor/registro/servidor-registro-flujo.test.mjs`: `recorrerApertura` también resuelve un `QuestionNode` (b1-1 ahora trae `b1-1-06`). Se adaptan los dos casos que hoy esperan la entrega al continuar el último ítem (l.176 y l.194): ahora recorren los pasos de cierre y entregan al final del último (autorizado por la tabla de cierre de §1). Casos nuevos: «Anterior» desde el primer paso de cierre vuelve al último ítem en lectura; un error de `entregar` en el último paso muestra el aviso y «Reintentar» vuelve a entregar.
- `tests/servidor/actividades/servidor-mecanica-contenido.test.mjs`: se agrega que `NODOS_PERMITIDOS.registro` incluye `pregunta` y que b1-1, b1-3, b1-6 y b1-7 pasan `validateActivity`.

**Documentos**
- `ov_frontend/docs/contenidos-actividades.md` (l.12, 19, 66): registro admite `pregunta`; tras el último ítem, los pasos de cierre y luego `entregar`.
- `ov_frontend/docs/origen-de-datos.md` l.46: «Continuar» tras el último paso entrega.
- `ov_backend/docs/decisiones.md`: decisiones de §7 de las observaciones + las de este ajuste (se reemplaza la viñeta del bloque 0 que decía que no hay pasos después de la última consigna). Las de §8 («anotado para otros ajustes») van en decisiones como pendientes.

### Qué no cambia
Conjunto `ruta` y sus pruebas; condiciones de reglas y lo que abre cada actividad; ítems, tarjetas y huellas de los registros; `b1_5.json`, configuración y textos del desafío b1-5; `ma2` y demás batallas; actividades y fichas de otros bloques; `ma1` (su «punto de origen» queda anotado, no se toca); modo local (no carga `plataforma/`); `completarActividad` para encuentros e instrumentos; `ResourceText.tsx` (se comprueba en navegador).

### Fases
1. **F1 · Contenido y backend:** copiar los seis JSON y `catalogo.json`; cambios de `contenido.py`; pruebas del back que leen textos; regenerar fixtures. Pruebas: `scripts/verificar_contenido_front.py`, `tests/integration/escenarios`, lo de contenido/batallas/fichas del back; `npm run test:servidor`. Commit `Ajuste coherencia-bloque1 · F1: …`.
2. **F2 · Registros con pregunta y pasos de cierre:** `NODOS_PERMITIDOS`, `useRegistroServidor`, `useActivityPlayer`, pruebas y documentos del front. Pruebas: `tests/local/actividades`, `tests/servidor/actividades`, `tests/servidor/registro`, `npm run test:servidor`. Commit.
3. **F3 · Cierre:** suites completas (back `uv run pytest -n auto -q`; front `npm test`, `build`, `lint`, `check:estructura`); comprobaciones en navegador de §6 con el conjunto `contenido`; `decisiones.md`. Commit. La spec queda en curso.

### Verificación
Las de §6 de las observaciones, en el navegador del panel con back (`contenido`) y front en `VITE_DATOS=api`: preguntas dentro de b1-1/b1-3/b1-7, pasos de cierre y pantalla final, reingreso a b1-1 sin terminar, «Anterior» ida y vuelta en b1-1 y b1-4, tablas de b1-4 en 375 px, fichas F04–F06, batalla b1-5 dos veces, títulos nuevos en mapa y cabecera, aperturas tras b1-3 y b1-7.

### Indicaciones del usuario al aprobar
1. **Registro respondido y sin entregar** (sale durante los pasos de cierre): comprobar en el navegador que el mapa lo muestra en curso, que al volver entra al último ítem y llega al cierre sin reescribir nada y que no se pierden respuestas. Si algo trata ese estado como error o como registro vacío, avisar antes de cambiarlo.
2. **F05 en `ResourceText.tsx`**: si la tabla dentro de un mito, entre dos listas, o el título en negrita antes de cada lista no se ven bien, está autorizado corregir `ResourceText.tsx` (con prueba) en vez de cambiar la ficha.

### Preguntas abiertas
Ninguna.

## Ajuste · coherencia-bloque2

### Contexto
El usuario reescribió el contenido de las cinco actividades del bloque 2 (b2-1…b2-5) y las fichas F07–F10 (textos cerrados: se copian tal cual, sin resumir ni «mejorar»). Spec en curso: `ov_backend/docs/specs/ajuste-coherencia-bloque0.md` → este plan se agrega como sección `## Ajuste · coherencia-bloque2` al final. Rama `ajuste/coherencia-bloque2` (ya creada desde `main`, `49df1d2`).

La mecánica que necesitan los registros nuevos (una `pregunta` dentro del registro y pasos después del último ítem) ya existe desde el ajuste coherencia-bloque1: este ajuste no toca código, solo contenido.

Comprobado en la exploración:
- Los JSON nuevos solo usan nodos, bloques y campos que ya están en `src/types/activities.ts` (`etiqueta`, `presentadorId`, `tabla.nota`, `lista.titulo`, `fuente.url`, `destacado`).
- Todas las expresiones usadas existen en `catalogo.json`: `nico` (contento, dudoso), `rosa` y `guardian` (neutral), `companero` (pensativo, animado).
- Los ítems de b2-3 y b2-4 quedan idénticos salvo `hablanteId` de las tres consignas de b2-4 (`companero` → `nico`); `RegistroItemServidor.tsx` ya pinta `node.hablanteId`.
- Ninguna prueba del back ni del front, ni los fixtures de `tests/fixtures/servidor/`, contienen los textos que cambian.

### Qué cambia (hoy → pasará a)

**Contenido front**
- `src/data/activities/contenidos/plataforma/b2_1.json` … `b2_5.json`: se reemplazan, completos, por los de `Downloads/` (copia de archivo). Nodos 17→18, 12→14, 6→9, 8→13, 15→16; salen `_nota` de b2_3/b2_4; cambian `objetivoAprendizaje`, `subtitulo` de b2-3 y los `mensajeFin`.
- `src/data/activities/catalogo.json`: `descripcion` de `nico` (§3.1).
- `h_habilidades_4.json` (diálogo de cierre de Dora): «siete habilidades» → «cinco habilidades». `h_intereses_6.json` (cierre de Sol): «buscar más por tu cuenta» → «buscar más ocupaciones por tu cuenta». Solo esa frase.

**Backend (`ov_backend/datos/contenido.py`, solo conjunto `contenido`)**
- `DESCRIPCIONES` de b2-3 y b2-4 (§2.1).
- `FICHAS` F07 (contenido), F08, F09, F10 (descripción y contenido), §2.2–2.5. Para no alterar un carácter, los cuatro contenidos se toman con un script desde los bloques ```markdown del documento de observaciones y se escriben como literal de una línea (mismo formato que hoy: `\n`, `\\*`). Título y tema iguales.
- Sin cambio de modelo, endpoints, esquemas, reglas ni `ACTIVIDADES`.

**Fixtures y pruebas**
- No hay pruebas que adaptar (§4). Se regenera igualmente el exportador de fixtures para confirmar que no cambia nada; si cambia algo, se versiona.

**Documentos**
- `ov_backend/docs/decisiones.md`: sección `## Ajuste coherencia-bloque2` con las decisiones de §7 de las observaciones y lo de §8 como «anotado para otros ajustes».

### Qué no cambia
Conjunto `ruta` y sus pruebas; condiciones y mensajes de las reglas y lo que abre cada actividad; ítems, tarjetas del LLM y huellas de los registros; instrumentos y páginas del libro de Helena; visitas de la ciudad salvo las dos frases; `h1`–`h3`; catálogo y sus filtros (quitar el código RIASEC de carreras es otro cambio); actividades y fichas de otros bloques; código del reproductor y `ResourceText.tsx` (se comprueba en navegador; si algo se ve mal, aviso antes de tocarlo).

### Fases
1. **F1 · Contenido y backend:** copiar los cinco JSON, `catalogo.json`, las dos frases de la ciudad; `DESCRIPCIONES` y `FICHAS` en `contenido.py`; exportar fixtures. Pruebas: `scripts/verificar_contenido_front.py`, `tests/integration/datos`, `tests/integration/escenarios`, `tests/integration/fichas`; front `tests/servidor/actividades` y `npm run test:servidor`. Commit `Ajuste coherencia-bloque2 · F1: contenido del bloque 2 y fichas F07–F10`.
2. **F2 · Cierre:** suites completas (back `uv run pytest -n auto -q`; front `npm test`, `build`, `lint`, `check:estructura`); comprobaciones de §6 en el navegador con el conjunto `contenido` y `VITE_DATOS=api`; `decisiones.md`. Commit. La spec queda en curso.

### Verificación
Las de §6 de las observaciones en el navegador del panel: b2-1 (elección, cinco preguntas, tres láminas, tabla de `b2-1-13` en 375 px), b2-2 (pizarra con tabla y lista con título), b2-3/b2-4 (pregunta dentro del registro y pasos de cierre antes de la pantalla final; Nico en las consignas; tabla con primera cabecera vacía), b2-5 (elecciones, pregunta de varias respuestas, tabla de cuatro columnas en 375 px), reingreso a b2-3/b2-4 entregados, «Anterior» ida y vuelta en b2-1 y b2-4, aperturas tras b2-1/b2-2/b2-5, fichas F07–F10 y cierres de Dora (visita 4) y Sol (visita 6).

### Preguntas abiertas
Ninguna.

### Indicaciones del usuario al aprobar
1. Después de escribir las cuatro fichas en `contenido.py`, comprobar que el contenido cargado de F07, F08, F09 y F10 sea idéntico, carácter por carácter, al bloque markdown del documento de observaciones (el apóstrofo de «students'» en F08, los «O\*NET» de F07 y F10 y los enlaces). Si alguna difiere, corregirla antes del commit.

## Ajuste · coherencia-bloque3

### Contexto
El usuario reescribió el contenido del bloque 3 (el puerto): b3-1, b3-2, b3-3, b3-4, b3-6, b3-8, b3-10 y b3-a, las fichas F11–F17 y los bancos de las cuatro batallas (b3-5, b3-7, b3-9, b3-b). Los textos ya están cerrados y se copian tal cual. Además, el código RIASEC deja de mostrarse y de filtrarse en las carreras (solo front). Spec en curso: `ov_backend/docs/specs/ajuste-coherencia-bloque0.md` → este plan se agrega como sección `## Ajuste · coherencia-bloque3` al final. Rama `ajuste/coherencia-bloque3`, que se rehace desde `main` (`64d2952`, ya con el bloque 2; la rama está vacía, sin commits).

### Qué cambia (hoy → pasará a)

**Contenido front (`ov_frontend/src/data/activities/contenidos/plataforma/`)**
- `b3_1`, `b3_2`, `b3_3`, `b3_4`, `b3_6`, `b3_8`, `b3_10`, `b3_a`: se reemplazan, completos, por los de `Downloads/` (copia de archivo). Hoy 11/11/14/4/14/13/14/3 nodos → 13/12/16/10/15/15/17/4. Las referencias de eco `b3-2-ref-codigo` y `b3-8-ref-costos` se conservan. b3_a pasa a `requisitos` `["b3-3"]`, `mapa.origen` `"b3-3"` y 4 min (ya calza con `R-b3-a` y con `ACTIVIDADES` del back, que ya dicen b3-3 y 4).
- `b3_7.json` `ubicacion` → «Puerto, feria del malecón»; `b3_9.json` → «Puerto, caseta junto al muelle»; `b3_b.json` → «Puerto, plaza del mercado» y `duracionEstimadaMin` 8 → 5 (el back ya dice 5). `b3_5.json` no cambia.
- `src/data/activities/catalogo.json`: `descripcion` de `practico` y `alejandra` (§3.1).
- `src/data/content/challenges.ts`, `desafio-cifra`: `presentacionEnemigo` (la segunda frase) y `recompensa.mensajeFin` (§3.3).

**Backend (`ov_backend/datos/contenido.py`, solo conjunto `contenido`)**
- `DESCRIPCIONES` de b3-4, b3-5 y b3-10 (§2.1).
- `FICHAS`: F11 y F14, descripción y contenido; F12, F13, F15, F16 y F17, contenido. Se copian con un script desde los bloques markdown de las observaciones y se comprueba que el texto cargado es idéntico carácter por carácter (como en el bloque 2).
- `PREGUNTAS_BATALLA`: las de `b3-5`, `b3-7`, `b3-9` (14 → 18 cada una) y `b3-b` (10 → 12) se reemplazan por las de `bancos_bloque3.py`, tal cual. `bancos_bloque3.py` no se agrega al repo.
- No cambian `ACTIVIDADES` (títulos y duraciones ya calzan), reglas, `CONFIGURACION_BATALLAS`, ítems ni tarjetas. Sin cambio de modelo, endpoints ni esquemas.

**Front: el RIASEC sale de las carreras (§3.4; el backend no se toca)**
- `features/discovery/lib/filtrosCatalogo.ts`, `PARAMETROS.careers`: hoy admite `riasec` y `afines` → pasará a `['buscar', 'tipo', 'area', 'familia', 'favoritos']`. Con eso `leerFiltros` ignora esas claves en la URL de carreras y `useCatalogoServidor` (`filtrosApi`) no las envía. Profesiones sin cambio.
- `components/FiltrosCatalogo.tsx`: carreras pasan a `[Tipo, Campo]`; la fila «Intereses» (letras, «Afines a mi resultado» y, en modo lectura, «Filtre por el tipo de interés…») queda solo en ocupaciones. La ayuda de modo lectura queda «Filtre por el tipo de interés de la ocupación».
- `components/TarjetaCatalogo.tsx`: sale `<SellosRiasec>` de la tarjeta de carrera; la de ocupación lo conserva.
- `components/DetalleCarreraServidor.tsx`: sale `<SellosRiasec letras={carrera.riasec} conNombres />` de la cabecera.
- Plan, «Por qué la elijo» (decidido por el usuario al planear): sale el bloque «Cómo encaja contigo» (`features/plans/components/SeccionPorQue.tsx`, prop `encaje`), `encajeRiasec` de `lib/servidor/adaptadoresPlanes.ts` y su cálculo en `features/plans/hooks/usePlanAbierto.ts` (y la carga del resultado RIASEC si solo la usaba eso). Estilos `.sx-p-encaje` si quedan sin uso.
- Agregado por el usuario al aprobar: `features/discovery/components/CatalogNavigation.tsx`, el rótulo de la pestaña «Profesiones» pasa a «Ocupaciones» (como `AtlasNavigation.tsx`, los favoritos y los textos del bloque 3), y en `FiltrosCatalogo.tsx` la ayuda del modo lectura queda «Filtre por el tipo de interés de la ocupación». Solo textos visibles: ids, rutas y nombres internos (`professions`) no cambian. Si una prueba del front compara «Profesiones» como rótulo, se actualiza. Si aparece «Profesiones» o «profesión» en otro texto visible del catálogo, se avisa antes de cambiarlo.
- No cambian: `SellosRiasec`, `DetalleOcupacionServidor`, `OcupacionesDeLaFamilia`, el filtro y «Afines» de ocupaciones, los tipos del servidor (`carrera.riasec` sigue llegando), el modo local y los datos de demostración de la orientadora (`CareerRow`, local).

**Pruebas y fixtures**
- Back `tests/integration/datos/test_conversaciones_contenido.py`: salen `b3-5-p06` y `b3-5-p08` de `CORRECTAS` (el banco de b3-5 se reemplazó entero, como b1-5 en el bloque 1; autorizado por §4).
- Cualquier otra prueba del back que falle por textos, fichas o tamaño de los bancos del bloque 3: se actualiza el valor (§4).
- Front: `tests/servidor/catalogo/servidor-catalogo-{vistas,portal,almacen}.test.mjs` se adaptan a carreras sin sellos ni fila «Intereses» y a que `riasec`/`afines` se ignoran en carreras; se agrega un caso que lo comprueba. `tests/servidor/planes/servidor-planes-{contrato,tarjeta}.test.mjs`: salen los casos de `encajeRiasec` y del texto «Cómo encaja contigo»; se comprueba que «Por qué la elijo» ya no lo muestra.
- Regenerar fixtures si `exportar_fixtures_front.py` exporta alguna descripción cambiada.

**Documentos**
- `ov_backend/docs/decisiones.md`: sección «Ajuste coherencia-bloque3» con lo de §7 (decididas por el usuario), lo tomado en el ajuste y lo de §8 como «Anotado para otros ajustes».
- `ov_frontend/AGENTS.md` / `docs/` solo si describen los filtros de carreras por intereses o «Cómo encaja contigo».

### Qué no cambia
Conjunto `ruta` y sus pruebas; condiciones y mensajes de las reglas y lo que abre cada actividad; ítems de los registros, tarjetas del LLM y huellas; `CONFIGURACION_BATALLAS`; testimonios; backend del catálogo (datos, modelos, filtros y el RIASEC de las carreras); sellos y filtro por letras de ocupaciones; nombres de las secciones del plan; `ma7`, `ma7-b`, `feria` e `investigador`; otros bloques y sus fichas; `b3_5.json`; los demás desafíos del puerto; `SlideNode.tsx` y `ResourceText.tsx` (se comprueban en navegador; si la tabla con primera cabecera vacía no se ve bien, aviso antes de tocarlos).

### Fases
1. **F1 · Contenido y backend:** copiar los ocho JSON, los campos de b3_7/b3_9/b3_b, `catalogo.json` y `challenges.ts`; cambios de `contenido.py` (script para fichas y bancos, con comprobación de igualdad); prueba de `CORRECTAS`; fixtures. Pruebas: `scripts/verificar_contenido_front.py`, `tests/integration/datos`, `tests/integration/escenarios`, lo de batallas/fichas del back; `npm run test:servidor`. Commit `Ajuste coherencia-bloque3 · F1: contenido del bloque 3, fichas F11–F17 y bancos de sus batallas`.
2. **F2 · RIASEC fuera de las carreras:** filtros, tarjeta, detalle, plan y pruebas del front. Pruebas: `tests/servidor/catalogo`, `tests/servidor/planes`, `tests/servidor/perfil`, `npm run test:servidor`. Commit.
3. **F3 · Cierre:** suites completas (back `uv run pytest -n auto -q`; front `npm test`, `build`, `lint`, `check:estructura`); comprobaciones en navegador de §6 con el conjunto `contenido`; `decisiones.md`. Commit. La spec queda en curso.

### Verificación
Las de §6 de las observaciones, en el navegador del panel con back (`contenido`) y front en `VITE_DATOS=api`: b3-1 (elección, cuatro preguntas, láminas, tabla de b3-1-10 a 375 px), b3-2 con y sin resultado de intereses, b3-3, b3-4 (pregunta dentro del registro, eco del valor de b2-3, dos pasos de cierre, reingreso), b3-6 (seis opciones, tabla con cabecera vacía), b3-8 (eco y pregunta de cinco opciones), b3-10 (dos elecciones, láminas de Alejandra), b3-a abierta con caso resuelto y b3-3, las cuatro batallas con los bancos nuevos y la presentación nueva de Doña Cifra, «Anterior» ida y vuelta en b3-1, b3-4 y b3-10, aperturas tras b3-6 y b3-10, fichas F11–F17, y el catálogo: carreras sin sellos ni «Intereses», detalle de carrera sin letras, ocupaciones intactas, lo mismo en modo lectura del apoderado; el plan sin «Cómo encaja contigo».

### Preguntas abiertas
Ninguna.
