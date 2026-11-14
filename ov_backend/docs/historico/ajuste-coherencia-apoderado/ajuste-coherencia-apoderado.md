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

## Ajuste · coherencia-lumi

### Contexto

En `contenido`, los recuerdos de Lumi son hoy los cinco de prueba de `ruta` (`t-lumi-1`…`t-lumi-5`, «Recuerdo de prueba 2»…), con umbrales de amistad `(1, 5, 12, 25, 45)`. El texto de observaciones (`ajuste-coherencia-lumi.md`) trae la historia real en cinco JSON (`lumi_1`…`lumi_5`, textos decididos, van tal cual), baja los umbrales a 1–5 y quita el género de Lumi en el diario. Por pedido del usuario se hace en la misma rama `ajuste/coherencia-apoderado`. Como hay una spec en curso (`ov_backend/docs/specs/ajuste-coherencia-apoderado.md`), este ajuste se agrega a ella como sección `## Ajuste · coherencia-lumi`, con fases F5–F7.

### Qué cambia y por qué

1. **Umbrales** (`ov_backend/app/core/parametros.py:109`): hoy `UMBRALES_AMISTAD = (1, 5, 12, 25, 45)` → `(1, 2, 3, 4, 5)`. Compartido por los dos conjuntos (`ruta` también pasa a 1–5). `TOPE_ENTRADAS_AMISTAD_DIA` sigue en 3.
2. **`ov_backend/datos/contenido.py`**:
   - `ACTIVIDADES` (l. 147): sale `*(a for a in ruta.ACTIVIDADES if a[0] in _DE_RUTA)` y `_DE_RUTA` (l. 55–56) → entran `lumi-1`…`lumi-5` en `LUMI`, `INFORMATIVA`, 3 min, con los títulos de la tabla.
   - `PROPIEDADES` (l. 192): sale el `**{… ruta.RECUERDOS_LUMI}` → `**{c: {'requerida': False} for c in RECUERDOS_LUMI}`, con `RECUERDOS_LUMI` local derivado del bloque `LUMI` (como en `ruta`).
   - `REGLAS` (l. 1330): sale la línea de `ruta.RECUERDOS_LUMI` → cinco `R-lumi-n` con `zip(RECUERDOS_LUMI, UMBRALES_AMISTAD, MENSAJES, strict=True)` y los cinco mensajes de la tabla 2.1. El comentario «PROVISIONAL» de esa línea queda solo para las insignias.
   - `PROVISIONALES` (l. 28): sale la fila de los recuerdos.
3. **Front, contenido**: los cinco JSON se copian tal cual a `ov_frontend/src/data/activities/contenidos/plataforma/lumi_1.json`…`lumi_5.json` y se registran en `src/data/activities/contenidos.ts` (import explícito + clave `lumi_n`). `useHistoriaLumi` ya toma el bloque `LUMI` del servidor; nada del diario en api supone `t-lumi-*` (solo `capitulosLumi.ts`, modo local, que no se toca). `bloque: 8` no lo lee el front en api.
4. **Front, sin género** (los cinco lugares de la tabla 4.2): `lib/servidor/adaptadoresDiario.ts` («Compañía de ruta»), `LumiBondPanel.tsx` y `LumiJournalPanel.tsx` («Quien te acompaña»), `JournalHome.tsx` y `data/content/guideTexts.ts` («…con Lumi…»). Además, el único otro texto con género que apareció: `features/journal/lib/lumiBond.ts:12`, nivel local «Compañeras de ruta» → «Compañía de ruta» (el texto pide corregir «igual» cualquier otro; es solo texto, sin cambiar umbrales locales). Es del modo local congelado: el usuario lo aprobó como excepción, para que Lumi no tenga género en ningún modo; se anota en `decisiones.md` y en la lista de excepciones de `ov_frontend/AGENTS.md`.

### Qué no cambia

- Conteo de la amistad, tope de 3 por día, que nunca baje; cómo se abre un recuerdo y «Volver al diario»; que ver un recuerdo no cuente.
- `ruta`: sus `t_lumi_*`, sus reglas y su texto (solo cambia su umbral por el parámetro compartido). Modo local: `capitulosLumi.ts` y `lumiMemoryThresholds` `[1, 5, 10, 15, 20]`.
- Cartas del diario, pregunta del día, conversaciones.

### Modelo de datos

Sin cambios.

### Pruebas

- **Backend, adaptadas** (autorizado por 2.2): `tests/integration/diario/test_recuerdos_lumi.py::test_el_conteo_tiene_el_tope_diario_de_la_amistad` pasa a probarlo con el 4.º umbral (`t-lumi-4`: 3 el primer día, 1 al día siguiente lo abre). Las demás que leen `UMBRALES_AMISTAD` se corren; si alguna supone un umbral alto, se ajusta y se anota.
- **Backend, nueva** (sección 3): en `tests/integration/escenarios/contenido/test_diario_contenido.py`, con `cliente_contenido`: completar b0-1 y b0-2; tres entradas el mismo día abren `lumi-1`, `lumi-2`, `lumi-3`, cada una en su acción (`nuevos_desbloqueos`) y la amistad en nivel 3; la cuarta no abre nada; al día siguiente dos entradas abren `lumi-4` y `lumi-5`, nivel 5 y `siguiente_en` `None`; completar los cinco no abre nada ni cambia el avance. Más un caso en `test_carga_contenido.py` o `test_reglas_contenido.py` si comprueban los recuerdos de `ruta`.
- **Fixtures del front**: `ruta` cambia (umbrales), así que se regeneran (`scripts/exportar_fixtures_front.py`). `tests/servidor/diario/servidor-historia-lumi.test.mjs` (l. 28–32, requisitos 1/5/12/25/45) se adapta a 1–5.
- **Front**: `tests/local/actividades/contenidos.test.mjs` cuenta los contenidos registrados; se adapta con los cinco nuevos. Si alguna prueba compara los textos con género, se adapta.

### Fases

- **F5 · Backend:** umbrales, `contenido.py`, prueba adaptada y prueba nueva; `verificar_contenido_front.py` (fallará hasta F6 por los JSON; se corre al cerrar F6). `tests/integration/diario`, `tests/integration/datos`, `tests/integration/escenarios`. Commit `Ajuste coherencia-lumi · F5: …`.
- **F6 · Front:** JSON y registro, textos sin género, fixtures regenerados y pruebas adaptadas. `verificar_contenido_front.py`, `npm run test:servidor`, `tests/local/actividades`, `tests/local/aventura`, `tests/servidor/diario`. Commit F6.
- **F7 · Cierre:** decisiones (sección 7) en `decisiones.md`; `contenidos-actividades.md` (continuidad: qué es Lumi; el criterio «Lumi… su historia solo se insinúa» no se reemplaza: se le agrega «En el camino, la historia de Lumi solo se insinúa; se cuenta en los cinco recuerdos del diario, que se abren por amistad»); `integracion.md`/`motor.md` si describen los umbrales; suites completas; navegador (sección 6). Commit F7. Sin push.

### Verificación

- `verificar_contenido_front.py` sin discrepancias; `uv run pytest -n auto -q`; `npm test`, `build`, `lint`, `check:estructura`.
- Navegador, conjunto `contenido` (recarga con `--vaciar` y reinicio del servidor, como en el ajuste anterior), cuenta `est-ana`: «La historia de Lumi» con cinco capítulos bloqueados y «Al llegar a 1 carta»…«5 cartas»; la primera carta abre «De dónde vengo» al volver al diario sin taparse con el cierre; recorrer los cinco ida y vuelta en 375 px; con tres cartas en un día se abren los tres primeros y la cuarta no abre «Hasta la mitad»; tarjeta de amistad con los umbrales nuevos y sin siguiente en el nivel 5 (el segundo día se simula con `fecha_hora`, que el servidor acepta en desarrollo); ningún texto del diario dice «compañera».

## Ajuste · lumi-mensajes

### Contexto

Texto de observaciones: `ajuste-explicaciones-lumi.md` (adjunto). Las presentaciones (`sectionIntros`), ayudas («?», `guideSteps` y guías api) y bloqueos (`textosBloqueo` + mensaje de la regla) de Lumi se escribieron antes de los lotes F y de los ajustes de coherencia: nombran pantallas viejas («el molino», «Información»), rompen la narrativa (Lumi se presenta dos veces, nombra a la orientadora) y los mensajes de bloqueo son frases de la historia que no dicen qué misión completar. Los textos ya están decididos y se copian tal cual. Además cambian tres comportamientos: el mapa espera a b0-1 (§1.1), las misiones adicionales tienen posición real (§14) y el camino aparece de a poco (§15). El portal del apoderado gana guías en api y deja de dibujar a Lumi (§13).

- **Spec:** hay una en curso (`ov_backend/docs/specs/ajuste-coherencia-apoderado.md`, que ya trae la sección `## Ajuste · coherencia-lumi`). El plan aprobado se agrega al final como `## Ajuste · lumi-mensajes`. Rama `ajuste/lumi-mensajes` (ya creada desde `main`, `cd1b29f1`).
- Id del ajuste: `lumi-mensajes`, de las palabras del usuario (el texto lo llama `explicaciones-lumi`).

### Ya hecho en `main` (no se toca)

- §13.6: `parentMotivation.ts` y «Sus actividades» ya tratan de usted (ajuste coherencia-apoderado).
- §13.7, parte del estudiante: `GuideDialogue` ya dice «Lumi · Quien te acompaña» y `aria-label` «Lumi, quien te guía» (coherencia-lumi). El texto pide `aria-label="Lumi"`: lo cambio a «Lumi» como dice el texto.

### Qué cambia (hoy → pasará a)

#### Front, textos (`src/data/content/guideTexts.ts`, copiados tal cual del texto)
- `sectionIntros.missions` (5 pasos §1.1), `guiaCaminoApi` (6 pasos §1.2), `cityArrivalSteps` (§2.1), `sectionIntros.central` / `guideSteps.central` (§2.2–2.3), `activities` (§3), `textosBloqueo` CHECK_IN/PLANES/FAMILIA (§4), `journal-signals` (§5), `sectionIntros.journal` pasa de 4 a 2 pasos y `guideSteps.journal` (§6.1–6.2), catálogo (4 vistas, §7), `profile-decisions` y `planesGuideSteps` (§8), `profile-helena` (§9), `guideSteps.conversations` 4 pasos (§10.1), `resources` pasos 2 y 4 (§11.1), `investigations` y `investigacionesGuideSteps` (§11.2), `passportGuideSteps` (§11.3), `parentGuides.overview/activities/careers/questionnaire` y nuevo `parentGuides.conversations` (§13).
- Salen las marcas `DATO DE PRUEBA` de los textos que quedan definitivos (todas las de `sectionIntros` y la de `parentGuides`), salvo las claves solo-local (`community`, `research`, `research-guide`), que no se tocan.
- `features/family-conversations/data/textosFamilia.ts`: `cartaLumi` y `cartaSubtitulo` (§10.2).
- `BuzonLumi.tsx` y `StudentLumiLettersView.tsx`: buzón vacío (§6.3).
- `AdventurePanel.tsx` l. 136: «Información» → «Catálogo» (§1.3). Es común a ambos modos.

#### Front, comportamiento del mapa (solo api)
- **§1.1 espera a b0-1.** Hoy `useNoveltyQueue` (l. 76) pone `introEnEspera` si la sección está cerrada o no hay presentaciones del servidor → se suma: vista `missions` en api con `b0-1` no completada. Hoy `MapScreenLayout` (l. 188) abre siempre `openGuide(pasosAyuda)` → el hook del mapa expone una bandera de dominio (`ayudaEsAviso`, true en api sin b0-1 completada; false en local) y, con ella, `MapControls` abre un aviso nuevo `features/adventure/components/AvisoAyudaMapa.tsx`: ícono `CircleHelp`, la línea «Empieza por la misión que brilla en el mapa.», botón ✕, se cierra al tocar fuera. Sin dependencia nueva (no hay popover en `components/ui/`; un `div` posicionado junto al botón con escucha de clic fuera y Escape).
- **§14 posiciones.** `contenidos/plataforma/ma1, ma2, ma3, ma4, ma5, ma7, ma7_b, ma8.json`: `mapa.x/y` de la tabla del texto. Hoy siete están en (0, 0) y `ma5` en (820, 240).
- **§15 camino de a poco.** Nueva función pura `puntosVisiblesCamino(puntos)` en `features/adventure/lib/puntosServidor.ts` (o archivo propio en `lib/` si pasa de 400 líneas): requeridas completadas, disponibles o empezadas, la primera requerida bloqueada en orden y las opcionales como hoy. Se aplica en `getCaminoPoints` (`caminoPoints.ts` l. 59) solo en api, antes de que `MapCanvas` pase los puntos a `MapPath`, `BlockSign` y los nodos, así líneas y letreros salen solo entre visibles. Ciudad, «Siguiente paso», «Mis actividades», avance por tramos y local no cambian.

#### Front, portal del apoderado (§13)
- `ParentMisActividadesView`, `ParentFamiliaView` (solo con la sección abierta) y `ParentExplorarView`: agregan el `GuideDialogue audience="parent"` flotante, como `ParentOverviewView`. `useFamiliaApoderado.abrirAyuda` deja de ser `null` y abre `parentGuides.conversations` en la vista del tema (`ResponderTema` ya pinta el «?»). Como el apoderado no tiene `openGuide`, se abre con el `GuideDialogue` controlado que ya usa «Ver ideas» de la carta.
- `GuideDialogue` con `audience="parent"`: el círculo muestra `Compass` (ya importado) en lugar del SVG del personaje, con `aria-label="Guía para familias"`. Común a ambos modos (el local `ParentActivitiesView`/`ParentCareerGuideView` también lo usa).

#### Backend (`ov_backend/datos/contenido.py`, `REGLAS`, conjunto `contenido`)
- Se reemplazan solo los mensajes de §12.1–12.4 (camino, ciudad, secciones y secciones del plan, conversaciones y testimonios `R-tb3-*`), con los títulos verificados contra `ACTIVIDADES` de esta rama (coinciden todos). Condiciones, `R-F*`, `R-FP*`, `R-d-*`, `R-p*`, `R-SEC-CONVERSACIONES`, `R-tc*`, insignias, niveles y `ruta` no cambian. Comentario junto a `R-B4` sobre su dependencia de los cuestionarios prioritarios.
- **Prueba nueva** `tests/integration/escenarios/contenido/test_mensajes_reglas_contenido.py` (§12.6): para las reglas del estudiante de tipo ACTIVIDAD, BLOQUE, SECCION, SECCION_PLAN, CONVERSACION y TESTIMONIO, toda condición COMPLETA_ACTIVIDAD / SUPERA_BATALLA / REGISTRO_ADECUADO con referencia tiene «{título}» en el mensaje; toda COMPLETA_BLOQUE tiene el nombre del tramo **o** el título de su última misión requerida entre «». Excluye `R-p*`, `R-SEC-CONVERSACIONES` y `R-lumi-*`.
  - Decisión (contradicción menor en el texto): `R-b5-1` tiene COMPLETA_BLOQUE B4 y su mensaje de §12.1 nombra la misión («Pongo a prueba mi orden») pero no el tramo. La prueba acepta tramo o última misión; el mensaje queda tal cual.

#### Observaciones del usuario al aprobar
1. **§15, enlaces a puntos ocultos:** si un `?punto=` (p. ej. `hrefActividad` del libro de Helena hacia b5-2) apunta a un punto oculto por el filtro, el mapa no falla ni lo muestra: enfoca la única requerida bloqueada visible (la siguiente del camino) y abre su detalle. Caso agregado a `servidor-camino-visible.test.mjs`.
2. **§15, orden:** «la primera requerida bloqueada» se toma en el orden del servidor (bloques y orden de actividades), sin contar opcionales ni puntos agrupados de una secuencia. Si «Siguiente paso» o el foco inicial apuntan a un punto, debe estar visible; si no, es un error a corregir, no a ocultar.
3. **§14:** si `b3-a`, `b3-b`, `h1`–`h3` o `investigador-cierre` incumplen la distancia mínima, aviso antes de moverlos.
4. **F5:** revisión en el navegador con §18 y §13.9, más dos capturas: el camino con todo completado (posiciones §14, sin cruces) y una cuenta nueva antes de b0-1 con el aviso sin Lumi abierto.

### Qué no cambia

Cuándo sale cada presentación (salvo el mapa), el brillo de la recomendada, íconos, condiciones de reglas, `PRESENTACIONES`, la Central (`ayudaCentral`), diálogos de actividades, cartas y recuerdos, las claves solo-local de `guideSteps`, `textosApoderado`, `BloqueoConversaciones`, la vista de la orientadora, el mapa de la ciudad (salvo `ma4`, `ma5`) y el modo local en comportamiento.

### Excepciones al modo local congelado (a aprobar)

Texto común, sin cambiar orden ni momento: los `guideSteps`/`sectionIntros` que usan ambos modos (el texto lo autoriza), «Catálogo» en el panel, `parentGuides.activities/careers` (las ven las vistas locales) y el ícono en lugar de la figura en `GuideDialogue` del apoderado. Se anotan en `ov_frontend/AGENTS.md` (excepciones) y `decisiones.md`.

### Modelo de datos

Sin cambios.

### Datos y fixtures

Cambian mensajes de `REGLAS` → se regeneran los fixtures del front (`uv run python scripts/exportar_fixtures_front.py --destino ../ov_frontend/tests/fixtures/servidor`). `ruta` no cambia. `scripts/verificar_contenido_front.py` sin discrepancias.

### Pruebas

- Se adaptan (autoriza §18) las que comparan estos textos o suponen el camino completo; ya ubicadas: `tests/local/aventura/adventure-rendering.test.mjs` (l. 3006, «Información»), `tests/servidor/diario/servidor-diario-vista.test.mjs`, `servidor-cartas-lumi`, `servidor-historia-lumi`, `servidor-carga`, `servidor-logros`, `servidor-batallas-cierre`, y en el back `test_casos_contenido.py` (mensaje «Calibra el artefacto»). Las demás que aparezcan al correr se adaptan solo si comparan un texto o el camino completo.
- Nuevas del front: `tests/servidor/mapa/servidor-camino-visible.test.mjs` (unitarias del filtro y el recorrido de las 38 requeridas, §15) y `tests/servidor/mapa/servidor-posiciones-adicionales.test.mjs` (§14: ningún punto con `mapa` en (0,0) o fuera del lienzo 1080×660 con margen 50; cada misión adicional (`adicional: true`) a 70–160 de su origen y a ≥60 de los demás; en el camino, su línea no cruza el camino ni otra línea adicional y no pasa a <35 de otro punto; ningún par del mismo mapa a <60).
  - Decisión: la regla 70–160 se exige solo a las misiones `adicional: true` (las de la tabla); `b3_a`, `b3_b`, `h1–h3` e `investigador_cierre` también tienen `origen` pero no son de este ajuste. Si incumplen «≥60 de otro punto», lo aviso antes de moverlas.
- Una prueba de la espera de b0-1 en la cola (`introEnEspera`) y de la bandera del aviso, en `tests/servidor/mapa/`.

### Fases

1. **F1 · Backend:** mensajes de `REGLAS`, prueba nueva, `test_casos_contenido.py`, fixtures regenerados, `verificar_contenido_front.py`. Corre `tests/integration/escenarios` y `npm run test:servidor`.
2. **F2 · Textos del estudiante:** `guideTexts.ts` (estudiante), `textosFamilia.ts`, buzón vacío, «Catálogo». Pruebas de impacto + `test:servidor`.
3. **F3 · Mapa:** espera de b0-1 y `AvisoAyudaMapa`, posiciones §14, filtro §15 y sus pruebas.
4. **F4 · Portal del apoderado:** `parentGuides`, guías en las tres vistas y en el tema, `GuideDialogue` sin figura.
5. **F5 · Cierre:** `decisiones.md` (§19 + las dos decisiones de arriba), `docs/sistema/integracion.md` y `ov_frontend/AGENTS.md` solo en lo que cambió, suites completas de ambos repos, build, lint y `check:estructura`. Revisión en el navegador obligatoria según §13.9 y §18, con las dos capturas de la observación 4.

Un commit por fase: `Ajuste lumi-mensajes · F<n>: <qué>`. Sin push.

### Verificación

- Por fase, el subagente `pruebas` con las carpetas de impacto; al final `uv run pytest -n auto -q`, `npm test`, `npm run build`, `npm run lint`, `npm run check:estructura`.
- Navegador (conjunto `contenido`, cuenta nueva): mapa sin diálogo antes de b0-1 y con aviso sin Lumi; presentación de 5 pasos al volver de b0-1, una sola vez; «Catálogo» en el panel; un punto nuevo por misión completada; bloqueos que nombran la misión exacta; portal del apoderado con guía en Inicio, Mis actividades, Conversaciones (abierta) y Explorar opciones, sin figura de Lumi.
