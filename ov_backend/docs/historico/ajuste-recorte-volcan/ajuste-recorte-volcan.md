# Ajuste · recorte-volcan

## Contexto

El bloque B2 (bosque del volcán) se recorta de 50 a ~29 min requeridos: `b2-1` (habilidades sociales) y `b2-2` (inteligencias) pasan a opcionales y la ruta requerida queda `b2-3 → b2-4 → b2-5`. La llegada al bosque y la presentación de Rosa pasan a `b2-3`. Es contenido, reglas y propiedades: sin cambios de mecánica, de ítems de registro ni de modelo. Texto de observaciones: `ajuste-recorte-volcan.md` + `b2_3.json` nuevo (adjuntos). No hay spec en curso: se crea `ov_backend/docs/specs/ajuste-recorte-volcan.md`. Rama `ajuste/recorte-volcan` (ya creada desde `main`).

Comprobado contra `main`: todos los textos de la columna «Hoy» coinciden; ningún id viejo de nodo de `b2-3` (`b2-3-01`…`b2-3-08`) se usa fuera de su JSON; el nuevo `b2_3.json` solo difiere en lo que dice el texto (apertura, diálogo nuevo `b2-3-10`, renumeración, `orden`, `requisitos`, duración).

## Qué cambia (hoy → pasará a)

### Front · `ov_frontend/src/data/activities/contenidos/plataforma/`
- `b2_3.json`: se reemplaza por el adjunto (orden 3→1, requisitos `b2-2`→`b1-7`, 8→9 min, apertura de tres diálogos, cierre con el diálogo nuevo de Rosa).
- `b2_1.json`: `obligatoria` false, `orden` 4, `requisitos` `["b2-3"]`, subtítulo «El aviso de la brigada», `mapa.origen: "b2-3"`, textos de `b2-1-01`, `-03`, `-15`, `-18` según la tabla 1.2.
- `b2_2.json`: `obligatoria` false, `orden` 5, `requisitos` `["b2-3"]`, `mapa.origen: "b2-3"`, texto de `b2-2-13`.
- `b2_4.json`: `orden` 2. `b2_5.json`: `orden` 3 y textos de `b2-5-13a`, `-13ar`, `-16` según 1.5.
- **Mapa:** hoy `b2-1` (840, 470) cae prácticamente sobre la nueva línea `b1-7 (920,520) → b2-3 (720,380)` y `b2-2` (770, 440) queda a ~25 px de ella. Se reubican alrededor de `b2-3`: `b2-1` → (800, 330) y `b2-2` → (640, 335), lejos de las líneas `b1-7→b2-3`, `b2-3→b2-4` y `b2-4→b2-5`. Se confirma en el navegador. `puntosServidor.ts` ya dibuja la línea propia de una opcional con `origen` (no se toca código).
- `ov_frontend/docs/contenidos-actividades.md:109` ya dice quién guarda cada página; se revisa y, si hace falta, se anota que `b2-1` y `b2-2` son opcionales.

### Backend · `ov_backend/datos/contenido.py`
- `ACTIVIDADES`, bloque B2: orden `b2-3`, `b2-4`, `b2-5`, `b2-1`, `b2-2`; `b2-3` de 8 a 9 min.
- `PROPIEDADES`: `b2-1` y `b2-2` → `{'requerida': False, 'visibilidad': 'AL_DESBLOQUEAR'}`.
- `DESCRIPCIONES['b2-3']`: el texto nuevo de 2.3.
- Reglas:
  - `R-b2-3` (hoy COMPLETA_ACTIVIDAD b2-2): se elimina; la cubre `R-B2`.
  - `R-b2-1` (no existe): nueva, ACTIVIDAD b2-1, COMPLETA_ACTIVIDAD b2-3, «Se abre al ordenar lo que valoras con Rosa.»
  - `R-b2-2` (hoy b2-1): COMPLETA_ACTIVIDAD b2-3, mismo mensaje.
  - `R-F07` (hoy b2-1, «Pasa la prueba de la brigada.»): COMPLETA_ACTIVIDAD b2-5, «Haz la ronda de los seis refugios.»

## Qué no cambia
- `R-B2`, `R-b2-4`, `R-b2-5`, `R-B3`, `R-h-intereses-1`, `R-F10`, `R-conv-5`, `R-conv-6`, `R-d-sale-gusta`.
- **Reglas que siguen colgando de una opcional** (ahora solo le llegan a quien la haga, tal como dice el ajuste): `R-h-habilidades-1` y `R-F08` (b2-1); `R-h-inteligencias-1` y `R-F09` (b2-2). Ninguna conversación, carta del diario ni logro depende de `b2-1`/`b2-2`.
- Motor: `COMPLETA_BLOQUE` ya cuenta solo las requeridas (`app/services/actividades.py:47`). Ningún cambio de modelo, migración, esquema ni contrato. Tarjetas LLM de `b2-3` (`datos/tarjetas_registros/b2_3.py`) no mencionan la apertura: sin cambios. `b2_4.json` y `b2_5.json` no dan por hecho `b2-1`/`b2-2` (buscado). `h_habilidades_1` («¿Vienes de parte de Rosa?») y `h_inteligencias_1` («¿De parte de la brigada?») siguen valiendo porque se abren solo tras `b2-1`/`b2-2`.
- Modo local del front: congelado (solo cambian los JSON de contenido que comparte).

## Pruebas (adaptación autorizada por el ajuste, §4; se anota en `decisiones.md`)
- `tests/integration/datos/test_reglas_contenido.py:58`: primeras del camino `{'b0-1','b1-1','b2-3','b3-1'}`.
- `tests/integration/datos/test_carga_contenido.py`: `b2-1`, `b2-2` entran en `opcionales` (requerida False, AL_DESBLOQUEAR).
- `tests/integration/registros/test_registros_contenido.py:95` (`avanzar(... 'b2-1')`, ya no es requerida): `avanzar(... 'b2-3')` y completar `b2-1` antes de las `h-habilidades`.
- `REQUERIDAS` de `tests/soporte/soporte_contenido.py` se deriva de los datos: no se toca.
- Nueva prueba en `test_reglas_contenido.py` (o en `escenarios/contenido`): con `b2-3` completada quedan disponibles `b2-4`, `b2-1` y `b2-2`; con `b2-5` completada, sin `b2-1` ni `b2-2`, se completa B2, se abre B3 y se entrega F07.
- Fixtures del front: se regeneran (`exportar_fixtures_front.py`), porque el listado de actividades cambia de orden y propiedades.

## Fases
1. **F1 · Backend:** `contenido.py`, pruebas adaptadas y la nueva; `pruebas` corre `tests/integration/datos`, `tests/integration/registros` y `tests/integration/escenarios`. Commit `Ajuste recorte-volcan · F1: ruta requerida del volcán`.
2. **F2 · Front:** los cinco JSON, reubicación del mapa, fixtures regenerados; `pruebas` corre las carpetas de impacto y `npm run test:servidor`. Comprobaciones del §5 en el navegador. Commit `Ajuste recorte-volcan · F2: contenidos del volcán`.
3. **Cierre:** suite completa de ambos repos, `decisiones.md` (reubicación del mapa, pruebas adaptadas) y spec guardada. La spec queda en curso.

## Verificación
- Suites: `uv run pytest -n auto -q`; `npm test`, `npm run build`, `npm run lint`, `npm run check:estructura` (vía subagente `pruebas`).
- Navegador (§5), con una cuenta que acaba de cerrar `b1-7`: primer punto del volcán `b2-3`, opcionales ocultas; recorrido de `b2-3`; al terminarla aparecen `b2-1`/`b2-2` con «?» y línea desde `b2-3`; `b2-4` y `b2-5` sin opcionales entregan F10 y F07 y abren el puerto; `b2-1` después de la ronda entrega F08 y abre Dora; `b2-2` entrega F09 y abre Bruno.

## Preguntas abiertas
Ninguna: lo que el texto no define (coordenadas nuevas) se propone arriba.

## Ajuste · recorte-puerto

### Contexto

Recorte del bloque B3 (puerto) para la prueba con usuarios, como el del volcán: `b3-6` (elegir una institución), `b3-7` (batalla de las instituciones) y `b3-9` (batalla de los costos) pasan a opcionales y la ruta requerida queda `b3-1 → b3-2 → b3-3 → b3-4 → b3-5 → b3-8 → b3-10` (de 98 a ~70 min). Debe poder revertirse: no se borra ninguna actividad, ficha ni banco. Texto de observaciones: `ajuste-recorte-puerto.md`.

**Dónde vive:** la spec en curso es `ajuste-recorte-volcan.md`, que aún no está en `main`. El ajuste se agrega a ella como sección `## Ajuste · recorte-puerto` y se trabaja en una rama nueva `ajuste/recorte-puerto` **creada desde `ajuste/recorte-volcan`** (si naciera de `main` no tendría la spec ni el recorte del volcán, y las pruebas de conteo chocarían). Commits `Ajuste recorte-puerto · F3/F4`, siguiendo la numeración de fases de la spec.

Comprobado contra el código: todos los textos «Hoy» coinciden; `R-b3-8` y `R-b3-10` tienen las condiciones que dice el ajuste; «Cómo llegaría» está dentro de «Cómo lo haría realidad» (`SeccionRealidad.tsx`), que abre `R-PLAN-REALIDAD` con `b3-8`, así que la mención sí se mueve.

### Qué cambia (hoy → pasará a)

#### Backend · `ov_backend/datos/contenido.py`
- `ACTIVIDADES`, B3: orden `b3-1…b3-5`, `b3-8`, `b3-10`, `b3-6`, `b3-7`, `b3-9`, `b3-a`, `b3-b`.
- `PROPIEDADES`: `b3-6`, `b3-7`, `b3-9` → `{'requerida': False, 'visibilidad': 'AL_DESBLOQUEAR'}` (con comentario del ajuste).
- `R-b3-8`: SUPERA_BATALLA b3-7 → SUPERA_BATALLA b3-5, «Gana «Batalla: el mercado y las rutas».»
- `R-b3-10`: SUPERA_BATALLA b3-9 → COMPLETA_ACTIVIDAD b3-8, «Completa la misión «Cuánto cuesta estudiar».»
- `scripts/sembrar_panel_ejemplo.py`, caso 4 («con prisa»): hoy `avanzar(..., 'b3-7')` (ya no es requerida y fallaría) → `avanzar(..., 'b3-5')` y luego completar `b3-6` y `b3-7`, para dejar el mismo estado de antes.

#### Front · `ov_frontend/src/data/activities/contenidos/plataforma/`
- `b3_1.json` `b3-1-13`: sin la frase de «Cómo llegaría».
- `b3_6.json`, `b3_7.json`, `b3_9.json`: `obligatoria` false y `mapa.origen` (`b3-5`, `b3-6`, `b3-8`).
- `b3_8.json`: `requisitos` `["b3-5"]`; fila «Admisión» de `b3-8-11` («Inscripción al examen de admisión, …»); `b3-8-15` con el texto nuevo.
- `b3_10.json`: `requisitos` `["b3-8"]`.
- `b4_3.json`: `b4-3-07` («otra forma de ingresar») y la fila «No ingresar» de `b4-3-10` («otra forma de ingreso»).
- `orden` (1.6): `b3-8` 6, `b3-10` 7, `b3-6` 8, `b3-7` 9, `b3-9` 10; `b3-a` y `b3-b` como están. Solo ordena (los JSON de `plataforma/` no los lee el modo local; en api el orden viene del servidor).
- **Mapa:** `b3-6` (460, 550) se queda: la línea nueva `b3-5 (450,450) → b3-8 (260,500)` va hacia la izquierda y no pasa cerca. `b3-7` (370, 500) **se reubica a (380, 590)**: el camino nuevo pasaría a ~28 px de su marcador; queda a ~89 de `b3-6` y lejos de `b3-a`. `b3-9` (370, 400) se queda (a ~149 de `b3-8`, sin cruzar líneas). Se valida con las reglas de `servidor-posiciones-mapa.test.mjs` y en el navegador.

#### Front · `ov_frontend/src/data/content/challenges.ts`
- `desafio-feriante` y `desafio-prestamista`: `obligatoria` false y `recompensa.lugar` «el puerto» (lo que usan `desafio-cifra-rutas` y `desafio-eco`).
- `desafio-cifra`: hoy `lugar` «la feria del malecón» → «la caseta de Clotilde».

### Qué no cambia
- `R-b3-6`, `R-b3-7`, `R-b3-9`, `R-b3-a`, `R-b3-b`, `R-feria`, `R-F11`…`R-F17`, `R-PLAN-REALIDAD`, `R-tb3-*`, `R-conv-7/8`, `R-B4`, bancos y configuración de las tres batallas.
- **Lo que sigue colgando de las opcionales:** de `b3-6`, `R-b3-7`, `R-F14`, `R-F15` y `R-feria`; de `b3-8` (requerida), `R-b3-9`. Ninguna insignia, nivel, testimonio, conversación ni carta pide `b3-6`, `b3-7` o `b3-9`; las insignias de `contenido` no cuentan batallas.
- **Textos revisados sin cambio:** F11 dice «licenciada por la Sunedu» al definir cada ruta (no da por visto `b3-6`); «modalidad ordinaria» de `b3-8` y F16 es la de Beca 18, explicada ahí mismo; «tablón» de `b0-1` y `b5-5` es el del muelle, no el del puerto; `p5`, `p7` y los recursos del catálogo son del apoderado; las menciones de Clotilde en `b4-3` son de la caseta (`b3-8`, requerida). Ningún texto fuera de su desafío da por ganada la batalla de Clotilde.
- Motor: `COMPLETA_BLOQUE` cuenta solo requeridas. Sin cambios de modelo, esquema ni contrato. Modo local congelado.

### Pruebas (adaptación autorizada por el ajuste, §5; se anota en `decisiones.md`)
- `tests/integration/datos/test_carga_contenido.py`: `b3-6`, `b3-7`, `b3-9` entran en `opcionales`.
- Conteo de requeridas del camino 36 → 33: `test_recorrido_contenido.py` (back) y `servidor-posiciones-mapa.test.mjs` y `servidor-camino-visible.test.mjs` (front).
- `test_mensajes_reglas_contenido.py` debe pasar sin cambios con los mensajes nuevos.
- Nueva, en `test_recorrido_contenido.py`: al ganar `b3-5` se abren `b3-8`, `b3-6` y `b3-b`; al completar `b3-8`, `b3-10` y `b3-9`; al completar `b3-10`, B3 queda completo (evento `COMPLETA_BLOQUE`) y B4 abierto sin `b3-6`, `b3-7` ni `b3-9`. (B4 pide además los instrumentos revelados: se usa `revelar_para_b4`.)
- Fixtures del front regenerados.

### Fases
1. **F3 · Backend:** `contenido.py`, sembrado del panel, pruebas; `pruebas` corre `tests/integration/datos`, `registros`, `escenarios`, `panel` y `contrato`. Commit.
2. **F4 · Front:** JSON, `challenges.ts`, mapa, fixtures y pruebas de mapa; `pruebas` corre `npm run test:servidor` y `tests/local/actividades`. Commit.
3. **Cierre:** suite completa de ambos repos; `decisiones.md`; sección en la spec. Comprobaciones del §6 en el navegador con una base aparte (como en el volcán), si las pides.

### Verificación
- Suites completas y `verificar_contenido_front.py`.
- Navegador (§6): Doña Cifra no manda a la feria; tras `b3-5` aparecen `b3-8` disponible y `b3-6`/`b3-b` con «?»; `b3-8` sin opcionales nombra «Mis planes» y abre «Cómo lo haría realidad» con «Cómo llegaría»; `b3-9` con «?» y `b3-10` disponible; `b3-10` abre el acantilado; mensajes de bloqueo exactos; opcionales después de `b3-10` sin mandar a lugares ya pasados, con F14, F15 y la feria; `b3-1` y `b4-3` sin los textos viejos.

### Preguntas abiertas
Ninguna.
