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
