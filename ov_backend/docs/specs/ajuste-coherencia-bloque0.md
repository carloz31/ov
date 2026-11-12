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
