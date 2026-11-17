# Ajuste · recorte-bloque0

## Contexto

Antes del primer registro (`b1-1`) el estudiante pasa por seis actividades casi solo de lectura (`b0-1` a `b0-6`). El texto de observaciones (`ajuste-recorte-bloque0.md`) recorta lectura sin tocar interacción, agrega negrita `**…**` a los textos de actividades y baja cuatro duraciones. Hay pruebas con usuarios el 18 y 19 de noviembre: no cambian reglas, motor, modelo ni consultas. No hay spec en curso: este plan se guarda como `ov_backend/docs/specs/ajuste-recorte-bloque0.md`. Rama: `ajuste/recorte-bloque0` (ya creada desde `main`, `1d74dd8`).

## Comprobaciones previas (hechas)

- Los seis `plataforma/b0_*.json` no cambiaron en `main` después de `1d74dd8`: se pueden pisar.
- Nodos retirados (`b0-1-08`, `-13`, `-16`, `b0-2-05`, `-13`, `b0-4-07`, `b0-5-12`, `b0-6-13`): fuera de los propios JSON no los cita ninguna prueba, texto ni documento (fixtures generados aparte, que no nombran nodos).
- `tests/servidor/actividades/servidor-anterior-preguntas.test.mjs` usa `b0-5-09` → `b0-5-10` leyendo el texto del JSON; en el JSON nuevo `b0-5-09` sigue justo antes de `b0-5-10`: debería pasar sin tocarla.
- Las demás pruebas que nombran `b0-*` (`servidor-camino-visible`, `servidor-mapa-espera-b0-1`, `servidor-escritura-local`) solo usan códigos y estados, no textos ni duraciones.
- Duraciones: solo las fija el fixture generado `tests/fixtures/servidor/contenido/contenido-actividades-inicial.json`. Ninguna prueba del back fija las de `b0-*` (`test_carga_contenido.py` solo compara las de CASOS).

## Qué cambia

### A. Contenido (front)
- Hoy: `ov_frontend/src/data/activities/contenidos/plataforma/b0_1.json` … `b0_6.json` con los textos de `1d74dd8`.
- Pasará a: los seis JSON adjuntos, copiados enteros (desde `Downloads/recorte-bloque0-json/`). Se comprueba contra la tabla A del texto de observaciones (nodos que salen, ids que quedan sin renumerar, duraciones 4/5/10/5/7/7).

### B. Negrita (front)
- Hoy: `conDichos` (`src/components/common/ConDichos.tsx`) devuelve el texto tal cual si no tiene `“`, o lo parte en `<em>` / `Fragment`.
- Pasará a:
  1. Si el texto termina en una corrida impar de `*`, se quita un `*` (máquina de escribir a medias: `'Soy *'`, `'Soy **Lumi*'`).
  2. Si no contiene `**`, sigue el camino de hoy sin cambios (mismo marcado: string o `em`/`Fragment`).
  3. Si contiene `**`, se parte por `**`; los trozos impares van en `<strong>` (un `**` sin cerrar deja en negrita lo que sigue) y cada trozo pasa por el tratamiento de dichos de hoy. Trozos vacíos se descartan.
  - Sigue siendo función. El `sr-only` de `DialogueBox` ya recibe `conDichos(text)`: sin asteriscos.
  - `useTypewriter` no cambia (contar los asteriscos como caracteres son dos ticks; ajustarlo exige mapear posiciones).
  - Se actualiza el comentario de la función.
- **Estilo:** `.sx-dialogue-text` y `.sx-content-reading` no fijan peso; el `strong` del preflight (`bolder`) debería dar 700 con el mismo color. Se comprueba en el navegador; solo si no se ve claramente más grueso se agrega `font-weight: 700` para `strong` en esas dos clases (`styles/student/student-base.css`).
- **Documento:** `ov_frontend/docs/contenidos-actividades.md`, viñeta «Negrita» tras «Dichos»: qué se marca (primera aparición por actividad de un personaje, objeto central de la historia o sección de la plataforma; no ideas ni frases), dónde se admite (`texto` de `dialogo`, incluidas reacciones y pistas, y de bloques `parrafo`, `destacado`, `comparacion`, `pasos`; nunca listas, tablas, títulos ni fuente) y que `conDichos` es el único lugar que la convierte.

### C. Duraciones (back)
- `ov_backend/datos/contenido.py`, `ACTIVIDADES`: `b0-1` 5→4, `b0-2` 6→5, `b0-5` 8→7, `b0-6` 9→7. `ruta` no cambia.
- Se regeneran los fixtures del front (`uv run python scripts/exportar_fixtures_front.py --destino ../ov_frontend/tests/fixtures/servidor`); se espera que solo cambie `contenido-actividades-inicial.json` (si cambia algo más, se avisa).

## Qué no cambia

Reglas, requisitos, desbloqueos, fichas (F01–F03), motor de actividades, `useTypewriter`, modelo, consultas, modo local (no carga `plataforma/`), `ContentBlocks` (listas, tablas, títulos y fuente no pasan por `conDichos` y siguen así), la cursiva de los dichos, los textos de `descripcion` del backend.

## Modelo de datos

Sin cambios.

## Otros usos de `conDichos` (ninguno recibe texto del estudiante)

| Lugar | Qué texto recibe |
|---|---|
| `DialogueBox`, `ContentBlocks`, `ChoiceNode`, `QuestionNode`, `CheckOption`, `FinishScreen` | Contenido JSON (diálogos, bloques, enunciados, opciones, explicaciones, `mensajeFin`) |
| `challenges/IntroDesafio`, `challenges/ChallengeStage` | Contenido de las batallas (`data/content/challenges.ts`) |
| `RegistroPersonaje`, `RegistroExplicacion`, `RegistroBloqueEleccion` | Consignas, preguntas y reacciones del registro (servidor) |
| `PantallaLumi` (`estado.texto`) | Repregunta del LLM o desenlace del servidor. El LLM no puede traer `**`: `app/services/registro/llm/filtro.py` (`FORMATO`) lo rechaza. «Tu respuesta» del estudiante se pinta aparte, sin `conDichos`. |
| `ItemRegistroLectura` (orientadora) | `pregunta_eleccion` / `pregunta_texto` del ítem (servidor), no la respuesta |
| `GuiaDimensiones` | Descripciones y ejemplos de dimensiones (front) |
| `ResourceText` (fichas), `ParentInlineText` (apoderado) | Ya parten por `**` antes de llamar; cada trozo llega sin `**`. `ResourceText` le pasa trozos con `sinEscapes` (`O\*NET` → `O*NET`). |
| `ParentQuestion`, `ParentContent`, `ParentActivitySession` | Contenido JSON del apoderado |

## Pruebas

En F1, **antes de tocar `conDichos`**, se capturan con el código de `main` los marcados de referencia (pruebas 3) y se copia la lógica actual de `conDichos` como referencia dentro de la prueba 1. Si alguna de estas pruebas falla o muestra una diferencia con `main`, me detengo y aviso antes de seguir.

1. **Equivalencia con hoy** (`tests/servidor/actividades/servidor-dichos-equivalencia.test.mjs`): recorre todas las cadenas de los 80 `plataforma/*.json` (recursivo, cualquier campo); para cada una sin `**`, `renderToStaticMarkup` de `conDichos` nueva = el de la copia de la lógica de hoy. Casos fijos: `'Fuente: O*NET Interest Profiler'`, `'O*NET “dice” algo'`.
2. **Máquina de escribir** (misma carpeta, `servidor-negrita-escritura.test.mjs`): para cada texto con `**` de `plataforma/` (se comprueba que son 18 textos con `**` y 21 pares en total: `b0-1-15`, `b0-3-01` y `b0-4-03` llevan dos), cada prefijo de 1 al largo completo: el marcado no contiene `*`, y quitadas las etiquetas (y decodificadas las entidades) queda el prefijo sin `*`.
3. **Otros usos** (`servidor-negrita-usos.test.mjs`): render de `ResourceText` con el contenido real de F19 «Cruzar tu perfil…» (copiado de `ov_backend/datos/contenido.py`; trae `**`, “…” y `O\*NET`) y de `ParentInlineText` con un texto con `**`, “…” y `O*NET`; ambos deben dar el marcado capturado en `main`.
4. **Contenido** (`servidor-negrita-contenido.test.mjs`): en `plataforma/`, `**` solo en el `texto` de un nodo `dialogo` (incluidas reacciones y pistas) o de un bloque `parrafo`, `destacado`, `comparacion` (lados) o `pasos` (cada paso); cuenta pares de `**` (número par de ocurrencias de `**`, no de `*`: los `O*NET` de las fuentes de `b2_5` y `b3_2` pasan); y `**` nunca dentro de un dicho “…” ni envolviéndolo (ningún tramo “…” contiene `**` y ningún tramo en negrita contiene `“`).
5. `tests/servidor/actividades/servidor-dichos.test.mjs`: los casos nuevos de la observación (`'Soy **Lumi**.'`, `'Soy **Lu'`, `'Soy *'`, `'Soy **Lumi*'`, `'**Mara** dice: “Léanla”.'`); los existentes sin tocar.
- `verificar_contenido_front.py` sin discrepancias; pruebas de `contenido` del back.
- **Recorridos:** el repo no tiene una suite e2e aparte (no hay Playwright). Al cierre se corren los recorridos que existen: `tests/integration/escenarios` del back y, del front, `tests/servidor/actividades` (`servidor-flujo`, `servidor-anterior-preguntas`, …) y `tests/local/actividades`.

## Fases

1. **F1 · Front: negrita y contenido.** `conDichos`, pruebas de dichos y de contenido, seis JSON, documento. Pruebas: `tests/local/actividades`, `tests/servidor/actividades`, `tests/servidor/registro`, luego `npm run test:servidor`. Commit `Ajuste recorte-bloque0 · F1: negrita en conDichos y recorte de b0-1 a b0-6`.
2. **F2 · Back: duraciones y fixtures.** `contenido.py`, fixtures regenerados, `verificar_contenido_front.py`. Pruebas: `tests/integration/datos` y `tests/integration/escenarios` del back, `npm run test:servidor`. Commit `Ajuste recorte-bloque0 · F2: duraciones de b0-1, b0-2, b0-5 y b0-6`.
3. **Cierre.** Suite completa (`uv run pytest -n auto -q`; `npm test`, `npm run build`, `npm run lint`, `npm run check:estructura`) más los recorridos; decisiones en `decisiones.md`; en el navegador, con el conjunto `contenido` y una cuenta nueva: las comprobaciones 1–8 de la observación, `b0-1` completa con «Mostrar todo» a mitad de un diálogo con negrita y con «Anterior» sobre un diálogo con negrita, la ficha F01 y una actividad del apoderado, que se vean igual que antes (si el entorno local no lo permite, se dice).

## Decisiones a anotar en `decisiones.md`

- `useTypewriter` no se cambia: los asteriscos cuentan como caracteres (dos ticks).
- Un `*` suelto al final de un texto se oculta (hoy ningún texto del contenido termina así); solo si cierra una corrida impar, para no romper `**…**` completos.
- Estilo de `strong`: lo que resulte de la comprobación (sin regla nueva si el tema ya da 700).

## Preguntas abiertas

Ninguna.
