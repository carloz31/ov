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
