# Ajuste · coherencia-apoderado


## Contexto

Las ocho actividades del apoderado (`p1`–`p8`) y sus fichas (`FP01`–`FP08`) se reescribieron con el usuario. El texto de observaciones (`ajuste-coherencia-apoderado.md`) decide los textos (van tal cual), los títulos, duraciones y descripciones, quita el paso «Volver a intentarlo» de las preguntas del apoderado y corrige dos textos del portal. No hay spec en curso en `ov_backend/docs/specs/`: el ajuste tiene su propia spec `ov_backend/docs/specs/ajuste-coherencia-apoderado.md`. Rama `ajuste/coherencia-apoderado` (ya creada desde `main`, `7c3eb56d`, que contiene `5f49fc3`).

Nota: `ov_backend/docs/decisiones.md` ya trae dos viñetas (casos c1–c6 y vista de partida y llegada) del commit `cambios_interfaz`, sin spec en curso. No las toco; agrego las de este ajuste debajo.

## Qué cambia y por qué

1. **JSON** `ov_frontend/src/data/activities/contenidos/plataforma/p1.json`…`p8.json`: hoy el contenido anterior (p4 con Acurio, etc.) → pasan a ser los ocho archivos adjuntos, copiados byte a byte.
2. **Backend** `ov_backend/datos/contenido.py`, solo conjunto `contenido`:
   - `ACTIVIDADES` (l. 130–137): títulos de p4, p6, p7, p8 y duraciones 12/12/12/12/14/12/12/10, según la tabla 2.1.
   - `DESCRIPCIONES` (l. 266–272): p1–p7 con los textos de 2.2; p8 igual.
   - `FICHAS` (l. 365–372): las ocho tuplas reemplazadas por las de `fichas_apoderado.py` (copiadas tal cual por script, no a mano).
3. **Reproductor** (`features/parent/hooks/useParentQuestion.ts`, `features/parent/components/ParentQuestion.tsx`): hoy, tras un error, las opciones se bloquean y el botón pasa a «Volver a intentarlo» (`retry`, `retrying`) → pasará a quedar directamente en el estado de reintento:
   - `check()`: si el resultado no es final, quita de `selected` las equivocadas (`result.wrongIds`); en `opcion_unica` queda vacío, en `opcion_multiple` se conservan las correctas.
   - Selección inicial al retomar con un último intento no final: sin las equivocadas.
   - Opciones: deshabilitadas solo si `feedback?.canContinue` o si son equivocadas ya probadas (siguen con ✕ y «Su respuesta»).
   - Botón: «Continuar» si es final; si no, «Comprobar respuesta» (sin intentos) o «Comprobar de nuevo» (con intentos), deshabilitado sin selección.
   - Se quitan `retrying`, `retry` y el foco a las opciones; el foco tras comprobar sigue yendo al título de la retroalimentación. El `fieldset` conserva su marcado (`tabIndex`), sin el `ref`.
   - `evaluateParentQuestion` no cambia (sigue: dos intentos, revela al segundo error).
4. **Retomar con nodos nuevos** (`features/parent/lib/missionLogic.ts`): hoy, si `nodoActualId` guardado no existe en el contenido, `nextParentPendingNode` muestra `nodos[0]` pero `advanceParentActivity` exige `nodoActualId === nodeId` y el apoderado queda trabado → pasará a reiniciar la actividad: un ayudante puro `progresoObsoleto(activity, state)` (en curso, `nodoActualId` distinto de `$fin` y ausente del contenido) que `startParentActivity` trata como sin progreso (vuelve a `nodos[0]` y descarta los intentos guardados de esa actividad), y que `useParentActivitySession` usa en la condición que ya llama a `startParentActivity`. Sin migración.
5. **Fichas** (`components/student/ResourceText.tsx`): hoy un bloque de lista numerada con subítems sangrados (`   - Universidad…` en FP05, «Antes de pagar la primera cuota») no es «todo numerado» y se pinta como párrafo crudo → pasará a pintarse como `<ol>` con un `<ul>` anidado en el ítem anterior. Es el único formato nuevo de las fichas; tablas (también con primera cabecera vacía), citas y negritas ya se pintan. Solo cambia el estilo de lectura, no el texto.
6. **Textos del portal** (4.1 y 4.2): `ParentActivityFinish.tsx` (l. 118, 131) y `ParentRouteSummary.tsx` (l. 34) → «Diploma de compromiso»; `ParentChildrenSummary.tsx` (l. 86) y `pages/parent/ParentQuestionnaireDetailView.tsx` (l. 118) → trato de usted.

## Qué no cambia

- Conjunto `ruta`, sus JSON (`t_apo_*`) y pruebas; `docs/historico/`.
- Reglas `R-p*`, `R-FP*`, `R-SEC-CONVERSACIONES`, `CONVERSACIONES`, orden, bloque y obligatoriedad.
- `textosFamilia.ts` y la pantalla de la carta; nada del estudiante (ni `QuestionNode`). El testimonio de Acurio en las voces del estudiante.
- `evaluateParentQuestion` y el límite de dos intentos.
- Contenido local del apoderado (`pad-*`).

## Modelo de datos

Sin cambios.

## Datos y fixtures

`datos/contenido.py` no está en los fixtures del front (los fixtures salen del conjunto `ruta`); se comprueba con `scripts/verificar_contenido_front.py`. Si el exportador incluyera `contenido`, se regeneran.

## Modo local

Los componentes del reproductor y `ParentChildrenSummary`/`ParentRouteSummary` son comunes o solo de local; el texto de observaciones pide cambiarlos y adapta `tests/local/portales/parent-missions.test.mjs`. Lo anoto como excepción aprobada al modo local congelado (una sola implementación), en `decisiones.md` y en la lista de excepciones de `ov_frontend/AGENTS.md`.

## Pruebas que se adaptan (autorizadas por la sección 3 y 5 del texto)

- `tests/local/portales/parent-missions.test.mjs` l. 369: en lugar de «Volver a intentarlo», que tras el error las opciones no equivocadas están habilitadas, ninguna marcada y el botón dice «Comprobar de nuevo»; prueba nueva para `opcion_multiple` (conserva la correcta marcada) y para retomar con un `nodoActualId` inexistente.
- `tests/local/aventura/adventure-rendering.test.mjs` l. 2490 (trato de usted) y l. 2511 («Diploma de compromiso»).
- Cualquier otra que compare títulos, duraciones o textos de p1–p8/FP01–FP08 (sobre todo `servidor-apoderado.test.mjs`), con los valores nuevos.
- Prueba de `ResourceText` con lista numerada anidada, donde ya se prueban fichas.

## Fases

- **F1 · Backend:** `contenido.py` (títulos, duraciones, descripciones, ocho fichas, por script que lee `fichas_apoderado.py`). `tests/integration/datos`, `tests/integration/escenarios`. Commit `Ajuste coherencia-apoderado · F1: títulos, duraciones, descripciones y fichas FP01 a FP08`.
- **F2 · Contenido del front:** copiar los ocho JSON; `ResourceText` con listas anidadas; `progresoObsoleto`. `verificar_contenido_front.py`, `tests/local/actividades`, `tests/servidor/actividades`, `tests/servidor/registro`, `tests/local/portales`, `tests/servidor/familia`. Commit F2.
- **F3 · Reproductor y textos:** reintento sin botón extra; diploma y trato de usted; pruebas adaptadas. `tests/local/portales`, `tests/local/perfil`, `tests/servidor/familia`, `tests/local/aventura`, `npm run test:servidor`. Commit F3.
- **F4 · Cierre:** búsquedas («Acurio», «Conozco mi rol», «el MINEDU dice» ausentes en p1–p8, FP01–FP08 y textos del apoderado); decisiones (sección 7 del texto y las de este plan) en `decisiones.md`; `contenidos-actividades.md` (regla de la pregunta del apoderado: sin paso de reintento, listas anidadas en fichas) y `ov_frontend/AGENTS.md` (excepción local); suites completas de ambos repos; revisión en el navegador según la sección 6 (cuenta de apoderado nueva, conjunto `contenido`, 375 px para tablas y comparaciones). Commit F4. Sin push; la spec queda en curso.

## Verificación

- `uv run python scripts/verificar_contenido_front.py` sin discrepancias; `uv run pytest -n auto -q`; `npm test`, `npm run build`, `npm run lint`, `npm run check:estructura` (por el subagente `pruebas`).
- Navegador: Mis actividades con títulos/duraciones/descripciones nuevos; recorrer p1–p8 (etiquetas, tablas y comparaciones en pantalla angosta, reacciones, «Anterior»); reintento en `p1-05` (única) y `p1-08` (múltiple), hasta agotar intentos; repaso de una completada; las ocho fichas (FP04 y FP05 con título nuevo, la lista anidada de FP05); dos o tres fichas del estudiante con listas numeradas se ven igual que antes (`ResourceText` es común); cierre con «Diploma de compromiso»; Inicio con trato de usted; al completar p8 se abre Conversaciones.
