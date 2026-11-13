# Ajuste coherencia-misiones-helena

## Contexto

Reescritura, ya decidida por el usuario, de los diálogos de las quince misiones de Helena en la ciudad (intereses con Sol `h-intereses-1..6`, habilidades con Dora `h-habilidades-1..4`, inteligencias con Bruno `h-inteligencias-1..5`): títulos sin «Misión de Helena:», etiquetas de cuestionario corregidas en habilidades e inteligencias, descripciones, un mensaje de regla, tres personajes y las posiciones en el mapa de la ciudad. Los textos van **tal cual** del texto de observaciones y de los quince JSON adjuntos. Se trabaja en la rama actual `ajuste/coherencia-bloque5`, como pide el texto. La spec de bloque 5 ya está cerrada, así que este ajuste tiene su propia spec `ov_backend/docs/specs/ajuste-coherencia-misiones-helena.md` (el plan + el texto de observaciones como anexo).

## Qué cambia (hoy → pasará a)

### Front
- `ov_frontend/src/data/activities/contenidos/plataforma/h_intereses_1..6.json`, `h_habilidades_1..4.json`, `h_inteligencias_1..5.json`: se reemplazan completos por los adjuntos (copia de `C:\Users\mauri\Downloads\`). Hoy llevan «Misión de Helena:» en el título y las etiquetas «¿Te describe?» / «¿Con qué frecuencia te pasa?».
- `h1.json`, `h2.json`, `h3.json`: solo `mapa.x`/`mapa.y` (330,480 → 700,432; 450,300 → 470,285; 640,500 → 670,500).
- `ov_frontend/src/data/activities/catalogo.json`: `descripcion` de `bibliotecaria`, `dora` y `maestro` (§3).

### Backend (solo `ov_backend/datos/contenido.py`)
- `ACTIVIDADES` (l. 79–93): los quince títulos sin «Misión de Helena: » y con mayúscula inicial; duraciones iguales.
- `DESCRIPCIONES` (l. 214–228): las quince de §2.2.
- `REGLAS` (l. 1208–1212): `R-h-intereses-2..6` «Primero el estante anterior de Sol.» → «Primero la visita anterior a Sol.»; condiciones iguales.
- Se aplica con un script de un solo uso en el scratchpad (reemplazos exactos con conteo comprobado), como en el ajuste anterior.

### Docs
- `ov_backend/docs/decisiones.md`: las decisiones de §8.
- `ov_frontend/docs/contenidos-actividades.md`: en «Continuidad de la historia», lo vigente de Sol, Dora y Bruno (molde presentación–frases–cierre, visitas de Sol, nadie anuncia el registro siguiente); en «Pendientes», «No estoy seguro» con género (del instrumento) y los diálogos de h1, h2 y h3.

## Lo que ya comprobé
- Las escalas que dicen los personajes coinciden con `datos/fijos.py`: intereses `OPCIONES_LIKERT` (de «Me disgusta mucho» a «Me gusta mucho»), habilidades «Casi nunca»/«Casi siempre», inteligencias «Falso»/«No estoy seguro»/«Verdadero».
- «Misión de Helena» solo aparece en `contenido.py` y en los quince JSON: ningún código del front ni fixture arma o espera ese título.
- Ningún id de nodo viejo (`hin1-04`, `hh1-04`, `hi1-04`…) se usa fuera de los JSON.

## Qué no cambia
- Instrumentos (frases, rangos por actividad, escalas, cálculo, página del libro), `INSTRUMENTOS_ACTIVIDAD`/aplicaciones, condiciones de reglas y lo que abre cada actividad, los demás mensajes de reglas de Dora, Bruno y `R-h-intereses-1`.
- `h1`, `h2`, `h3` salvo sus coordenadas. Pantalla del cuestionario, aviso de velocidad, libro de Helena. Conjunto `ruta`.

## Modelo de datos
Sin cambios.

## Fases
1. **F1 · contenido:** los quince JSON, coordenadas de h1–h3, catálogo, `contenido.py`. Pruebas de impacto (`tests/integration/datos`, `tests/integration/escenarios`; front `tests/local/actividades`, `tests/servidor/actividades`, `tests/servidor/registro`, `tests/servidor/instrumentos`, `tests/servidor/mapa`), `verificar_contenido_front.py`, re-exportar fixtures. Si una prueba compara títulos, descripciones, coordenadas o nodos de estas actividades, se actualiza con los valores del texto (autorizado en §5). Commit `Ajuste coherencia-misiones-helena · F1: …`.
2. **F2 · revisión y cierre:** suites completas de ambos repos; navegador con `contenido` en servidores aparte (8010/5180) sobre base temporal, como en el ajuste anterior: cada cuestionario de la primera a la última parte (presentación, frases sin diálogos entre medio, cierre, elección con dos reacciones), etiqueta y opciones, títulos en mapa/panel/detalle, bloqueo de una parte de Sol, sello del libro al cerrar la última, mapa de la ciudad (grupos sin montarse, también con el zoom mínimo; h1–h3 junto a su grupo), reingreso y avatares. Si un grupo se monta, se mueve entero manteniendo la forma y se avisa con las coordenadas finales. Decisiones y docs. Commit `Ajuste coherencia-misiones-helena · F2: …`.

La spec queda en curso; cerrarla es decisión del usuario.

## Verificación
- `verificar_contenido_front.py` sin discrepancias; búsqueda de «Misión de Helena» sin resultados en títulos.
- Suites completas en verde con el subagente `pruebas`.
- Recorrido en el navegador de §7 del texto.

## Preguntas abiertas
Ninguna.

---

# Anexo · texto de observaciones


Para sumar al ajuste en curso, **en la rama actual** (`ajuste/coherencia-bloque5`). Revisado contra `main` del repo `carloz31/ov`, commit `5f49fc3` (13 nov 2026). No toca ningún archivo del bloque 5; comparte con él `ov_backend/datos/contenido.py` y `catalogo.json`, en entradas distintas.

## Qué es

Reescritura de los diálogos de las quince misiones de Helena (las partes de los tres cuestionarios de la ciudad): intereses con Sol (`h-intereses-1` a `6`), habilidades con Dora (`h-habilidades-1` a `4`) e inteligencias con el maestro Bruno (`h-inteligencias-1` a `5`). Cambian además sus títulos, la etiqueta del cuestionario en dos de ellos y su posición en el mapa de la ciudad. Los textos ya están decididos por el usuario: **no se reescriben, no se resumen y no se «mejoran»**. El ajuste los coloca en su lugar y comprueba en el front que se vean bien.

Esta carpeta trae, junto a este documento, quince JSON finales: `h_intereses_1.json` a `h_intereses_6.json`, `h_habilidades_1.json` a `h_habilidades_4.json` y `h_inteligencias_1.json` a `h_inteligencias_5.json`.

Todo lo del backend va **solo en el conjunto `contenido`** (`ov_backend/datos/contenido.py`). El conjunto `ruta` y sus pruebas no se tocan. Los cuestionarios (frases, escalas, cálculo, página del libro) no cambian.

## 1. JSON de las actividades

**Hoy:** `ov_frontend/src/data/activities/contenidos/plataforma/h_intereses_N.json`, `h_habilidades_N.json` y `h_inteligencias_N.json`.
**Pasará a:** cada uno se reemplaza, completo, por el archivo del mismo nombre de esta carpeta.

Todas siguen el mismo molde: una presentación del personaje, las frases de esa parte y un cierre. **No hay diálogos entre las frases.**

| Actividad | Nodos (hoy → queda) | Nodo del cuestionario (hoy → queda) |
|---|---|---|
| h-intereses-1 | 5 → 7 | `hin1-04` → `hin1-06` |
| h-intereses-2 a 5 | 3 → 3 | `hinN-02` (igual) |
| h-intereses-6 | 4 → 4 | `hin6-02` (igual) |
| h-habilidades-1 | 5 → 7 | `hh1-04` → `hh1-06` |
| h-habilidades-2 y 3 | 3 → 3 | `hhN-02` (igual) |
| h-habilidades-4 | 4 → 4 | `hh4-02` (igual) |
| h-inteligencias-1 | 5 → 7 | `hi1-04` → `hi1-06` |
| h-inteligencias-2 a 4 | 3 → 3 | `hiN-02` (igual) |
| h-inteligencias-5 | 4 → 4 | `hi5-02` (igual) |

Lo que cambia en la cabecera de cada JSON:

- **`titulo`:** sale «Misión de Helena:». Quedan «Mis intereses, N de 6», «Mi comportamiento con los demás, N de 4» y «Explorando mis inteligencias, N de 5».
- **`mapa.x` y `mapa.y`:** las nuevas posiciones de §4.
- **`recompensa.mensajeFin`:** el avance en frases («Diez de sesenta frases de Sol.») y, en la última parte, «La página de … está lista en el libro de Helena. Rompe su sello cuando quieras.»
- Lo demás (subtítulo, ubicación, duración, requisitos, `personajeIds`, `presentacion`, `mapa.icono`) no cambia.

Lo que cambia en el nodo del cuestionario:

| Cuestionario | `etiqueta` hoy | `etiqueta` queda | Opciones del instrumento |
|---|---|---|---|
| `TEST-RIASEC` (intereses) | «¿Cuánto te gustaría hacer esto?» | No cambia | De «Me disgusta mucho» a «Me gusta mucho» |
| `TEST-HABILIDADES` | «¿Te describe?» | «¿Te pasa casi siempre o casi nunca?» | «Casi nunca» / «Casi siempre» |
| `TEST-INTELIGENCIAS` | «¿Con qué frecuencia te pasa?» | «¿Es verdad en tu caso?» | «Falso» / «No estoy seguro» / «Verdadero» |

Las dos etiquetas de hoy no coincidían con las opciones. `instrumentoId`, `itemId` y `hablanteId` no cambian. Las escalas que dicen los personajes en la primera visita son las del instrumento: si alguna no coincide con lo que se ve, avisar antes de cambiar el texto.

Además:

- Los identificadores de nodo cambian en la primera parte de cada cuestionario (se suman dos diálogos). Comprobar con una búsqueda que ninguno (`hin1-04`, `hh1-04`, `hi1-04` y los demás) se use en el backend, en las pruebas ni en otros archivos del front.
- Ningún diálogo dice de qué tratan las frases de esa parte: en cada parte vienen mezcladas todas las dimensiones.

## 2. Datos del backend (`ov_backend/datos/contenido.py`)

### 2.1 Títulos (`ACTIVIDADES`)

| Actividad | Hoy | Queda |
|---|---|---|
| h-intereses-1 a 6 | «Misión de Helena: mis intereses, N de 6» | «Mis intereses, N de 6» |
| h-habilidades-1 a 4 | «Misión de Helena: mi comportamiento con los demás, N de 4» | «Mi comportamiento con los demás, N de 4» |
| h-inteligencias-1 a 5 | «Misión de Helena: explorando mis inteligencias, N de 5» | «Explorando mis inteligencias, N de 5» |

Las duraciones no cambian.

### 2.2 Descripciones cortas (`DESCRIPCIONES`)

| Actividad | Queda |
|---|---|
| h-intereses-1 | «Sol, la bibliotecaria, guarda las sesenta frases de intereses. Primera visita: diez frases.» |
| h-intereses-2 | «Segunda visita a Sol: diez frases más.» |
| h-intereses-3 | «Tercera visita a Sol: diez frases más.» |
| h-intereses-4 | «Cuarta visita a Sol: diez frases más.» |
| h-intereses-5 | «Quinta visita a Sol: diez frases más.» |
| h-intereses-6 | «Última visita a Sol: al terminar, tu página de intereses queda lista.» |
| h-habilidades-1 | «Dora, la tabernera, guarda las veinticuatro frases sobre cómo te portas con la gente. Primera visita: seis frases.» |
| h-habilidades-2 | «Segunda visita a Dora: seis frases más.» |
| h-habilidades-3 | «Tercera visita a Dora: seis frases más.» |
| h-habilidades-4 | «Última visita a Dora: al terminar, tu página de habilidades queda lista.» |
| h-inteligencias-1 | «El maestro Bruno guarda las treinta y cinco frases sobre tus inteligencias. Primera clase: siete frases.» |
| h-inteligencias-2 | «Segunda clase con el maestro Bruno: siete frases más.» |
| h-inteligencias-3 | «Tercera clase con el maestro Bruno: siete frases más.» |
| h-inteligencias-4 | «Cuarta clase con el maestro Bruno: siete frases más.» |
| h-inteligencias-5 | «Última clase con el maestro Bruno: al terminar, tu página de inteligencias queda lista.» |

Reemplazan las quince de hoy.

### 2.3 Mensajes de reglas (`REGLAS`)

| Regla | Hoy | Queda |
|---|---|---|
| `R-h-intereses-2` a `R-h-intereses-6` | «Primero el estante anterior de Sol.» | «Primero la visita anterior a Sol.» |

Solo cambia el mensaje. Las demás reglas de las misiones (`R-h-intereses-1`, las de Dora y las de Bruno) no cambian, ni en su condición ni en su mensaje.

## 3. Personajes (`ov_frontend/src/data/activities/catalogo.json`)

Solo cambia `descripcion`:

| Personaje | Queda |
|---|---|
| `bibliotecaria` | «Bibliotecaria de la ciudad. Entró un día de lluvia y siguió volviendo. Guarda las sesenta frases de intereses y las reparte en seis visitas. Callada, de oído fino y humor seco. Insiste en responder solo si te gustaría, sin pensar en si sabrías, en lo que paga ni en lo que dirían en casa.» |
| `dora` | «Tabernera de la ciudad. Por su puerta pasa todo el mundo; por eso Helena le confió las frases sobre cómo uno se porta con los demás. Conversadora y directa: opina de todo, menos de lo que le responden. Aprendió a decir que no detrás del mostrador.» |
| `maestro` | «Profesor de la escuela de la ciudad. De chico dibujaba en los márgenes mientras los demás sumaban. Guarda las frases de inteligencias: ha visto a muchos alumnos ser inteligentes de una forma que el examen no mide. Paciente y algo distraído: se pierde en su propia ciudad y recuerda el nombre de cada alumno.» |

## 4. Posiciones en el mapa de la ciudad

Hoy las partes de un mismo cuestionario están en fila o dispersas (las de Dora, en dos zonas distintas del mapa). Quedan agrupadas: cada cuestionario es un grupo de círculos juntos. Coordenadas del lienzo lógico (1080 × 660), en `mapa.x` y `mapa.y`.

**Ya vienen en los quince JSON:**

| Grupo | Parte 1 | Parte 2 | Parte 3 | Parte 4 | Parte 5 | Parte 6 |
|---|---|---|---|---|---|---|
| Dora (habilidades) | 690, 330 | 740, 330 | 740, 380 | 690, 380 | | |
| Bruno (inteligencias) | 447, 381 | 403, 381 | 389, 338 | 425, 312 | 461, 338 | |
| Sol (intereses) | 590, 495 | 555, 475 | 555, 435 | 590, 415 | 625, 435 | 625, 475 |

**Se editan en su archivo de hoy** (solo `mapa.x` y `mapa.y`; el resto de estos tres JSON no se toca en este ajuste):

| Archivo | Hoy | Queda |
|---|---|---|
| `h1.json` (registro con Dora, cuelga de `h-habilidades-4`) | 330, 480 | 700, 432 |
| `h2.json` (registro con Bruno, cuelga de `h-inteligencias-5`) | 450, 300 | 470, 285 |
| `h3.json` (registro con Sol, cuelga de `h-intereses-6`) | 640, 500 | 670, 500 |

- Las posiciones se calcularon sin ver la imagen de fondo de la ciudad: dejan entre 40 y 50 unidades entre círculos vecinos y evitan los demás puntos (`c1` a `c6`, `feria`, `investigador`, `b1-3`, `ma5`). **Revisar en el navegador** que ningún círculo ni su etiqueta se monte sobre otro y que cada grupo quede en una zona razonable del dibujo. Si alguno se monta o queda sobre algo que no corresponde, mover el grupo entero manteniendo la forma y avisar con las coordenadas finales.
- Si hay pruebas o fixtures que comparen coordenadas del mapa de estas actividades, se actualizan.

## 5. Pruebas que leen textos que cambian

- Si alguna prueba o fixture compara los títulos, las descripciones, el mensaje de las reglas, la etiqueta del cuestionario o la cantidad de nodos de estas quince actividades, se actualiza con los valores de este documento. No se cambia el comportamiento que prueban.
- Si algún texto de la plataforma arma o espera el título con «Misión de Helena» (el mapa, el panel, el libro, las notificaciones, fixtures), avisar antes de cambiarlo.
- Si `scripts/exportar_fixtures_front.py` exporta títulos o descripciones que cambiaron, se vuelve a exportar después de cambiar el backend.

## 6. Qué no cambia

- Los tres instrumentos: frases, orden, rangos por actividad (`h-intereses-1` = frases 1 a 10, etc.), escalas, cálculo y resultados.
- Las condiciones de las reglas y lo que abre cada actividad.
- Los registros `h1`, `h2` y `h3`, salvo sus coordenadas (§4). Sus diálogos se revisan en otro ajuste.
- La pantalla del cuestionario, el aviso por respuestas rápidas y el libro de Helena.
- El conjunto `ruta` y sus pruebas.

## 7. Comprobaciones

- `scripts/verificar_contenido_front.py` sin discrepancias.
- Suites completas del backend y del front.
- Buscar «Misión de Helena» en el front y en `contenido.py`: no queda en los títulos de estas quince.
- **En el navegador, con el conjunto `contenido`** (el usuario pidió comprobar en el front que quedaron bien implementadas):
  - **Cada cuestionario, de la primera a la última parte:** la presentación, las frases y el cierre. En la primera parte, la elección con sus dos reacciones. En ninguna hay diálogos entre las frases.
  - **La etiqueta y las opciones coinciden** en los tres: intereses (cinco opciones), habilidades («Casi nunca» / «Casi siempre») e inteligencias («Falso» / «No estoy seguro» / «Verdadero»). La escala que dice el personaje en la primera parte es la que se ve.
  - **Títulos:** en el mapa, en el panel y en el detalle aparecen sin «Misión de Helena:».
  - **Bloqueos:** con una parte de Sol bloqueada, el mensaje dice «Primero la visita anterior a Sol.»
  - **Última parte de cada uno:** al cerrarla, la página correspondiente del libro muestra su sello.
  - **Mapa de la ciudad:** los tres grupos se ven como círculos juntos, sin montarse entre sí ni con los casos, la feria o el investigador, también con el zoom mínimo. `h1`, `h2` y `h3` aparecen junto a su grupo, con su línea hacia la última parte.
  - **Reingreso:** volver a entrar a una parte ya completada.
  - **Personajes:** Sol, Dora y Bruno aparecen con su avatar.

## 8. Decisiones ya tomadas (para `decisiones.md`)

- Los títulos de las misiones de Helena no empiezan con «Misión de Helena:».
- Ya no hay diálogos alrededor de cada frase del cuestionario: cada parte tiene una presentación, las frases y un cierre.
- En la primera parte el personaje se presenta, cuenta algo breve de sí y explica cómo se responde, con la escala real. En las siguientes saluda al ver que el viajero volvió, cuenta algo breve y distinto cada vez, invita a responder y se despide.
- El puente hacia las frases invita a responder; no dice de qué tratan, porque en cada parte vienen mezcladas todas las dimensiones.
- Los cierres no cuentan frases en boca del personaje: el avance va en el mensaje final de la actividad.
- En la última parte, el personaje dice en una frase qué hace Helena con las respuestas y Lumi nota el sello. Nadie anuncia el registro que viene después.
- Sol (callada, humor seco), Dora (conversadora, directa) y Bruno (paciente, algo distraído) tienen cada uno su forma de hablar y su historia.
- Las partes de Sol son «visitas», no «estantes».
- Se corrigen las etiquetas de los cuestionarios de habilidades e inteligencias, que no coincidían con sus opciones.
- En el mapa de la ciudad, las partes de un mismo cuestionario van juntas.

## 9. Anotado para otros ajustes

- **La opción «No estoy seguro»** de las escalas de intereses e inteligencias tiene género. Es del instrumento; no se toca aquí.
- **`h1`, `h2` y `h3`:** sus diálogos siguen con «Esto lo lee tu orientadora…», «bitácora» e «informe de viaje». Se revisan con los registros opcionales.

---

## Ajuste · coherencia-registros-h y coherencia-registros-ma


## Contexto

La spec en curso es `ov_backend/docs/specs/ajuste-coherencia-misiones-helena.md` (F1 commiteada en `fd649f7b`). Llegan dos textos más, decididos por el usuario, para sumar en la misma rama `ajuste/coherencia-bloque5`: la escena de los registros opcionales `h1` (Dora), `h2` (Bruno) y `h3` (Sol), y la de `ma4` (Dora) y `ma3` (guardián). Siguen el mismo molde: tres diálogos del personaje, el ítem, un cierre; Lumi ya no habla. Los textos van **tal cual**. Además, el usuario eligió **separar los grupos del mapa de la ciudad** (las etiquetas se tapaban dentro de cada grupo). Según el skill, con una spec en curso estos ajustes entran como fases nuevas: se agregan al final de esa spec como secciones `## Ajuste · coherencia-registros-h` y `## Ajuste · coherencia-registros-ma`, con su texto de observaciones como anexo.

## Qué cambia (hoy → pasará a)

### F2 · registros h1, h2, h3 (`ajuste-coherencia-registros-h`)
- Front: `plataforma/h1.json`, `h2.json`, `h3.json` se reemplazan por los adjuntos (hoy 3 nodos con Lumi, `_nota`, «Mi reto», «Mis familias», duraciones 8/8/10 → 5 nodos, títulos nuevos, 4 min). Sus `mapa.x/y` se dejan como las de los adjuntos y se reemplazan en F4 por las finales.
- Backend `datos/contenido.py`: `ACTIVIDADES` h1 «Mi reto» → «Una habilidad para practicar», h3 «Mis familias» → «La familia de carreras que me llama»; `DESCRIPCIONES` de h1, h2, h3 (§2.2); comentarios `# h1 Mi reto…` y `# h3 Mis familias` (l. 664 y 691) con el título nuevo.
- Ya comprobado: ningún id de nodo viejo (`h1-01`…) se usa fuera de los JSON.

### F3 · registros ma4 y ma3 (`ajuste-coherencia-registros-ma`)
- Front: `plataforma/ma4.json` y `ma3.json` se reemplazan por los adjuntos (`ma3 (1).json` se copia como `ma3.json`). Títulos alineados con el backend, subtítulo, ubicación, 4 min, 5 nodos; `mapa` igual.
- Backend: `DESCRIPCIONES` de ma4 y ma3 (§2). Títulos, reglas, ítems y referencias no cambian.

### F4 · posiciones del mapa de la ciudad (decisión del usuario: separar los grupos)
- Medido en el navegador: cada punto ocupa ~61 de ancho y de −15 a +38 bajo el centro (+53 en Dora, etiqueta de tres líneas) en el lienzo lógico 1080×660, a cualquier zoom.
- Se abre cada forma lo justo (Dora ~1,5×, Bruno ~1,8×, Sol ~1,9×, misma forma) y se ubica cada grupo con h1, h2 y h3 a su lado, sin tocar `c1`–`c6`, `feria`, `investigador`, `investigador-cierre`, `b1-3`, `ma5`. Primero se calcula con ese modelo (script en el scratchpad) y después se comprueba en el navegador midiendo los rectángulos de círculos y etiquetas (sin solapes al zoom mínimo, 50 %, 100 % y máximo) y mirando que cada grupo caiga en una zona razonable del dibujo.
- Se editan solo `mapa.x/y` de los quince `h_*.json` y de `h1`–`h3`. Las coordenadas finales van a `decisiones.md` y al resumen.

### Docs
- `decisiones.md`: las decisiones de §8 (misiones), §6 (registros-h), §5 (registros-ma) y las coordenadas finales.
- `ov_frontend/docs/contenidos-actividades.md`: en «Pendientes», quitar h1, h2, h3 y ma3 de «Textos que no siguen los criterios» y la frase de h3 sobre el informe de viaje; sumar «No estoy seguro» con género y «ma4.json se revisa en otro ajuste» si sigue aplicando (no: ma4 entra aquí, se omite). En «Continuidad», lo vigente de Sol, Dora, Bruno y del guardián en ma3.

## Qué no cambia
Ítems (`h1-reto`, `h2-reconozco`, `h3-curiosidad`, `ma4-modelo`, `ma3-hoy`) y sus tarjetas, reglas (`R-h1..3`, `R-ma3`, `R-ma4`), referencias, títulos del backend de h2, ma3 y ma4, duraciones del backend, el conjunto `ruta`. Modelo de datos sin cambios.

## Fases y pruebas
- F2 y F3: copiar JSON, script de reemplazos exactos en `contenido.py`, `verificar_contenido_front.py`, re-exportar fixtures, pruebas de impacto (`tests/integration/datos`, `escenarios`, `registros`; front `tests/servidor/registro`, `actividades`, `mapa`, `tests/local/actividades`) y un commit por fase (`Ajuste coherencia-registros-h · F2: …`, `Ajuste coherencia-registros-ma · F3: …`).
- F4: coordenadas, comprobación en el navegador y commit (`Ajuste coherencia-misiones-helena · F4: …`).
- F5 · cierre: suites completas de ambos repos; navegador con `contenido` (servidores aparte 8010/5180, base temporal): h1, h2, h3 con la página revelada, junto a su grupo, de inicio a fin y de fin a inicio, h1 cada habilidad, h2 las tres respuestas, h3 una familia y «Ninguna me llama», reingreso, `ma4` abierta con h1 adecuado (nombra la habilidad elegida; una persona y «No se me ocurre nadie»), `ma3` colgada de b1-7 (día a los 23 y dentro de un año; «Sí, algo» y «Todavía nada»); búsquedas de «orientadora», «bitácora», «informe», «siete días», «línea de tiempo», «plazo» en los cinco JSON. Decisiones y docs. Apagar los servidores y borrar `.claude/launch.json`, `vite.revision.config.ts` y la base temporal. Commit.

La spec queda en curso; cerrarla es decisión del usuario.

## Preguntas abiertas
Ninguna.

---

### Anexo · texto de observaciones de coherencia-registros-h


Para sumar al ajuste en curso, **en la rama actual** (`ajuste/coherencia-bloque5`), después de `ajuste-coherencia-misiones-helena.md`. Revisado contra `main` del repo `carloz31/ov`, commit `5f49fc3` (13 nov 2026).

## Qué es

Reescritura de la escena de los tres registros opcionales que siguen a los cuestionarios de la ciudad: `h1` (con Dora), `h2` (con el maestro Bruno) y `h3` (con Sol). Cambian dos títulos. Los textos ya están decididos por el usuario: **no se reescriben, no se resumen y no se «mejoran»**.

Esta carpeta trae, junto a este documento, tres JSON finales: `h1.json`, `h2.json` y `h3.json`.

Todo lo del backend va **solo en el conjunto `contenido`** (`ov_backend/datos/contenido.py`).

## 1. JSON de las actividades

**Hoy:** `ov_frontend/src/data/activities/contenidos/plataforma/h1.json`, `h2.json` y `h3.json`.
**Pasará a:** cada uno se reemplaza, completo, por el archivo del mismo nombre de esta carpeta.

| Actividad | Nodos (hoy → queda) | `titulo` | `subtitulo` | `duracionEstimadaMin` |
|---|---|---|---|---|
| h1 | 3 → 5 | «Mi reto» → «Una habilidad para practicar» | «De vuelta en la taberna» (igual) | 8 → 4 |
| h2 | 3 → 5 | «¿Me reconozco?» (igual) | «La pregunta del maestro» (igual) | 8 → 4 |
| h3 | 3 → 5 | «Mis familias» → «La familia de carreras que me llama» | «El contraste de Sol» → «De vuelta en la biblioteca» | 10 → 4 |

Lo que conviene saber:

- Los tres tienen la misma forma: tres diálogos del personaje, el ítem y un diálogo de cierre después del ítem. **Lumi ya no habla en ninguno** (sigue en `personajeIds`).
- Los ítems (`h1-reto`, `h2-reconozco`, `h3-curiosidad`) no cambian: ni consigna, ni opciones, ni las frases que los presentan. Los sigue pidiendo el mismo personaje.
- Sale el campo `_nota` de los tres.
- **`mapa.x` y `mapa.y` ya traen las posiciones nuevas** del ajuste de las misiones de Helena (h1: 700, 432; h2: 470, 285; h3: 670, 500). Si en el navegador se movieron los grupos, usar las coordenadas finales que quedaron ahí.
- Los identificadores de nodo que no son ítems cambian. Comprobar con una búsqueda que ninguno se use fuera de estos archivos.
- `requisitos`, `ubicacion`, `personajeIds`, `plantilla` y `mapa.origen` no cambian.

## 2. Datos del backend (`ov_backend/datos/contenido.py`)

### 2.1 Títulos (`ACTIVIDADES`)

| Actividad | Hoy | Queda |
|---|---|---|
| h1 | «Mi reto» | «Una habilidad para practicar» |
| h3 | «Mis familias» | «La familia de carreras que me llama» |

El de h2 y las duraciones (4 minutos) no cambian. Si los comentarios del archivo nombran el título viejo (`# h1 Mi reto…`, `# h3 Mis familias…`), se actualizan.

### 2.2 Descripciones cortas (`DESCRIPCIONES`)

| Actividad | Hoy | Queda |
|---|---|---|
| h1 | «Elige una habilidad social para practicar y cuenta en qué situación tuya te serviría.» | «Dora cuenta qué habilidad eligió practicar ella. Elige la tuya y cuenta en qué situación te serviría.» |
| h2 | «Si te reconoces en tu resultado de inteligencias, y qué dirías tú de cómo aprendes.» | «El maestro Bruno cuenta si se reconoció en su página. Di si te reconoces en la tuya, y cuándo se nota.» |
| h3 | «De las cinco familias que salieron de tus intereses, la que te da más curiosidad y por qué.» | «Sol cuenta qué familia le dio curiosidad a ella. De las cinco que salieron de tus intereses, elige la tuya y di qué te llama.» |

Las reglas (`R-h1`, `R-h2`, `R-h3`, `R-ma4`), los ítems y `REFERENCIAS` no cambian.

## 3. Pruebas que leen textos que cambian

- Si alguna prueba o fixture compara los títulos de h1 o h3, las descripciones o la cantidad de nodos de estos tres, se actualiza con los valores de este documento.
- Si `scripts/exportar_fixtures_front.py` exporta títulos o descripciones que cambiaron, se vuelve a exportar.

## 4. Qué no cambia

- Los ítems, sus opciones y sus frases; las reglas y lo que abre cada actividad (`ma4` sigue abriéndose con el registro de h1).
- `ma4.json`: su diálogo se revisa en otro ajuste.
- El conjunto `ruta` y sus pruebas.

## 5. Comprobaciones

- `scripts/verificar_contenido_front.py` sin discrepancias y suites completas.
- Buscar «orientadora», «bitácora» e «informe» en `h1.json`, `h2.json` y `h3.json`: no aparecen.
- En el navegador, con el conjunto `contenido`:
  - Con la página revelada, cada registro aparece junto a su grupo en el mapa, con su título nuevo.
  - Recorrer los tres de inicio a fin y de fin a inicio: los tres diálogos, el ítem (que muestra el resultado del test) y el diálogo de cierre.
  - En h1, elegir cada habilidad y ver que la pregunta cambia. En h2, las tres respuestas. En h3, una familia y «Ninguna me llama».
  - Volver a entrar a uno ya entregado.
  - Con el registro de h1 adecuado, se abre `ma4`.

## 6. Decisiones ya tomadas (para `decisiones.md`)

- h1, h2 y h3 siguen el mismo molde corto: el personaje ve que el viajero volvió con la página abierta, cuenta qué respondió cuando le tocó, va el ítem y cierra. Sin pregunta ni lámina.
- Lo que cuenta cada uno muestra cómo se responde y cubre la respuesta menos obvia: Dora eligió practicar escuchar sin interrumpir (no hace falta elegir la habilidad más baja); Bruno se reconoció en parte (no aparecía que piensa dibujando); a Sol le dio curiosidad una familia que no era la primera.
- Nadie pregunta qué salió en la página ni juzga el resultado.
- Sale de h1 «lo que importa es qué haces con la que salió más baja», que contradecía al ítem, y el dato sobre Rosa.
- Sale de h3 la comparación con «lo que tú ya pensabas»: el registro ya no compara con ninguna opción.
- h1 pasa a llamarse «Una habilidad para practicar» y h3, «La familia de carreras que me llama».
- Salen «Esto lo lee tu orientadora…», «bitácora», «informe de viaje», «plan de práctica» y las promesas de que algo «vuelve».

---

### Anexo · texto de observaciones de coherencia-registros-ma


Para sumar al ajuste en curso, **en la rama actual** (`ajuste/coherencia-bloque5`), después de `ajuste-coherencia-registros-h.md`. Revisado contra `main` del repo `carloz31/ov`, commit `5f49fc3` (13 nov 2026).

## Qué es

Reescritura de la escena de dos registros opcionales: `ma4` (con Dora, cuelga de `h1`) y `ma3` (con el guardián, cuelga de `b1-7`). Sus JSON todavía describían el registro anterior. Los textos ya están decididos por el usuario: **no se reescriben, no se resumen y no se «mejoran»**.

Esta carpeta trae, junto a este documento, dos JSON finales: `ma4.json` y `ma3.json`.

Todo lo del backend va **solo en el conjunto `contenido`** (`ov_backend/datos/contenido.py`).

## 1. JSON de las actividades

**Hoy:** `ov_frontend/src/data/activities/contenidos/plataforma/ma4.json` y `ma3.json`.
**Pasará a:** cada uno se reemplaza, completo, por el archivo del mismo nombre de esta carpeta.

| Campo | ma4 hoy | ma4 queda | ma3 hoy | ma3 queda |
|---|---|---|---|---|
| Nodos | 3 | 5 | 3 | 5 |
| `titulo` | «El reto de la semana» | «Alguien que ya lo hace» (como el backend) | «De la meta a los pasos» | «Lo que ya tengo de ese día» (como el backend) |
| `subtitulo` | «Dora apunta en su libreta» | «A quién mirar» | «El guardián vuelve a hablar» | «Una pregunta más del guardián» |
| `ubicacion` | «Dora apunta en su libreta» | «Ciudad, taberna de Dora» | «El guardián vuelve a hablar» | «Desierto, las piedras del límite» |
| `duracionEstimadaMin` | 6 | 4 | 6 | 4 |

Lo que conviene saber:

- Los dos tienen la misma forma que `h1`, `h2` y `h3`: tres diálogos del personaje, el ítem y un diálogo de cierre después del ítem. **Lumi ya no habla** (sigue en `personajeIds`).
- Los ítems (`ma4-modelo`, `ma3-hoy`) no cambian: ni consigna, ni opciones, ni referencias. Los sigue pidiendo el mismo personaje.
- Sale el campo `_nota` de los dos.
- `requisitos`, `mapa` (con `origen` y `adicional`), `personajeIds`, `plantilla`, `escenario`, `bloque` y `orden` no cambian.
- Los identificadores de nodo que no son ítems cambian. Comprobar con una búsqueda que ninguno se use fuera de estos archivos.

## 2. Datos del backend (`ov_backend/datos/contenido.py`)

| Dónde | Hoy | Queda |
|---|---|---|
| `DESCRIPCIONES`, ma4 | «Alguien que conoces a quien le sale bien la habilidad que elegiste, y qué hace.» | «Dora cuenta a quién mira ella para aprender. Piensa en alguien a quien le sale bien la habilidad que elegiste, y qué hace.» |
| `DESCRIPCIONES`, ma3 | «De ese día que imaginaste, lo que ya haces hoy o lo primero que te gustaría probar.» | «El guardián cuenta lo que descubrió una viajera. De ese día que imaginaste, di qué ya haces hoy o qué te gustaría probar primero.» |

Los títulos del backend («Alguien que ya lo hace», «Lo que ya tengo de ese día»), las duraciones, las reglas (`R-ma4`, `R-ma3`), los ítems y `REFERENCIAS` no cambian.

## 3. Pruebas y lo que no cambia

- Si alguna prueba o fixture compara las descripciones o la cantidad de nodos de estos dos, se actualiza con los valores de este documento.
- No cambian los ítems, las reglas ni lo que abre cada actividad. El conjunto `ruta` y sus pruebas no se tocan.

## 4. Comprobaciones

- `scripts/verificar_contenido_front.py` sin discrepancias y suites completas.
- Buscar «orientadora», «siete días», «línea de tiempo» y «plazo» en `ma4.json` y `ma3.json`: no aparecen.
- En el navegador, con el conjunto `contenido`:
  - Con el registro de `h1` adecuado, `ma4` aparece colgada de `h1` con su título. Con el de `b1-7` adecuado, `ma3` aparece colgada de `b1-7`.
  - Recorrer los dos de inicio a fin y de fin a inicio: los tres diálogos, el ítem y el diálogo de cierre.
  - En `ma4`, el ítem nombra la habilidad elegida en `h1`; probar una persona de la lista y «No se me ocurre nadie». En `ma3`, el ítem muestra el día a los 23 y lo de dentro de un año; probar «Sí, algo» y «Todavía nada».
  - Volver a entrar a uno ya entregado.

## 5. Decisiones ya tomadas (para `decisiones.md`)

- `ma4` y `ma3` siguen el molde corto de `h1` a `h3`: el personaje cuenta algo que muestra cómo se responde, va el ítem y cierra.
- `ma4`: Dora cuenta a quién mira para aprender a escuchar sin interrumpir (a Sol, que espera antes de contestar). Continúa lo que eligió en `h1`. Sale el reto de siete días.
- `ma3`: el guardián no cuenta nada de sí; como en b1-7, habla de una viajera que pasó. El caso muestra el «aunque sea en pequeño» del ítem, y el cierre vale también para quien marca «Todavía nada». Salen «línea de tiempo», «partir el primer hito» y «acción, plazo, recurso».
- Los títulos de los JSON se alinean con los del backend.
- Sale «Esto lo lee tu orientadora…» de los dos.

---

## Ajuste · coherencia-ma5


## Contexto

Reescritura, decidida por el usuario, de la informativa opcional `ma5` (Iván, cuelga de `h3`) y de su ficha F23. Textos **tal cual** del texto de observaciones y del `ma5.json` adjunto. Se suma a la spec en curso `ov_backend/docs/specs/ajuste-coherencia-misiones-helena.md` como sección `## Ajuste · coherencia-ma5` (con el texto como anexo), en la rama `ajuste/coherencia-bloque5`. El usuario decidió **no** incluir ahora `ajuste-coherencia-ma1-ma7.md` (está en Descargas, sin pasar): ma5 no depende de él.

## Qué cambia (hoy → pasará a)

### F6 · ma5 y F23
- Front: `ov_frontend/src/data/activities/contenidos/plataforma/ma5.json` se reemplaza por el adjunto (hoy 7 nodos, dos láminas al inicio, subtítulo «El taller de Iván, después de hora», 8 min → 11 nodos: tres preguntas de Lumi y una lámina sin presentador con tabla, dos destacados y fuente con `url`; «El papel de la pared»; 6 min).
- Backend `ov_backend/datos/contenido.py`, con un script de reemplazos exactos en el scratchpad que toma el contenido de F23 del texto de observaciones (entre las líneas de guiones):
  - `ACTIVIDADES` l. 126: duración de ma5 8 → 6.
  - `DESCRIPCIONES` l. 261: ma5 → «Un viajero dejó en el taller de Iván una lista de profesiones del futuro. Ábrela con él antes de creerle.»
  - `REGLAS` l. 1256: `R-F23` «Visita a Iván después de hora.» → «Revisa con Iván la lista de profesiones del futuro.» (condición igual).
  - `FICHAS` F23: resumen nuevo y contenido completo nuevo; título, tema «Mis opciones» y audiencia iguales.
- Ya comprobado: el panel del catálogo se llama «Cómo se llega aquí» y hay otro «También puedes llegar desde» (`features/discovery/components/LlegarAOcupacion.tsx`, l. 30 y 59), como citan la lámina y la ficha. Ningún id de nodo `ma5-0x` se usa fuera del JSON. `ResourceText.tsx` ya pinta tablas, listas numeradas con negrita, citas y enlaces.

### Docs
- `decisiones.md`: las de §5.
- `contenidos-actividades.md`: en «Pendientes», «Datos que envejecen»: el informe 2025 del WEF y el GEM 2025/2026 en F23; «Por confirmar en la fuente»: las cifras del GEM leídas en notas de prensa. En «Continuidad»: emprender sale de la historia de Iván en b1-3 (bomba, molino, faroles); Dora tiene la taberna.

## Qué no cambia
Título de ma5, `R-ma5`, requisitos, `mapa`, cantidad de fichas y reglas, el conjunto `ruta`. Ninguna pantalla nueva de «carreras del futuro».

## Pruebas y verificación
- `verificar_contenido_front.py`, re-exportar fixtures, pruebas de impacto (`tests/integration/datos`, `escenarios`, `fichas`; front `tests/local/actividades`, `tests/servidor/actividades`, `tests/servidor/registro`) y commit `Ajuste coherencia-ma5 · F6: …`. Si alguna prueba compara descripción, duración, nodos de ma5, el mensaje de `R-F23` o el texto de F23, se actualiza (autorizado en §3).
- Búsquedas: en `ma5.json` «después de hora», «registro», «único», «apuesta»; en F23 «44 %», «módulo», «sobrevive»: ninguna aparece.
- F7 · cierre: suites completas; navegador con `contenido` (servidores aparte 8010/5180 sobre base temporal; avanzar hasta h3 adecuado): ma5 colgada de h3, las tres preguntas (con un error para ver retroalimentación y explicación), la lámina con su tabla y dos destacados también a 375 px, «Anterior» de inicio a fin y de fin a inicio, F23 en la mochila al cerrar (tres tablas sin fila de guiones, lista numerada, cita, enlaces), y el panel «Cómo se llega aquí» / «También puedes llegar desde» en una ocupación del catálogo. Decisiones y docs; borrar lo provisional. Commit.

La spec queda en curso.

## Preguntas abiertas
Ninguna.

---

### Anexo · texto de observaciones de coherencia-ma5


Para sumar al ajuste en curso, **en la rama actual** (`ajuste/coherencia-bloque5`), después de `ajuste-coherencia-ma1-ma7.md`. Revisado contra `main` del repo `carloz31/ov`, commit `5f49fc3` (13 nov 2026).

## Qué es

Reescritura de la informativa opcional `ma5` (con Iván, cuelga de `h3`) y de su ficha F23. Los textos ya están decididos por el usuario: **no se reescriben, no se resumen y no se «mejoran»**.

Esta carpeta trae, junto a este documento, el JSON final `ma5.json`. La ficha F23 va completa en la sección 2.3.

Todo lo del backend va **solo en el conjunto `contenido`** (`ov_backend/datos/contenido.py`).

## 1. JSON de la actividad

**Hoy:** `ov_frontend/src/data/activities/contenidos/plataforma/ma5.json`.
**Pasará a:** se reemplaza, completo, por `ma5.json` de esta carpeta.

| Actividad | Nodos (hoy → queda) | Lo que conviene saber |
|---|---|---|
| ma5 Ocupaciones nuevas y emprender | 7 → 11 | **Tres preguntas de opción única, que hace Lumi, y una sola lámina después de las preguntas** (`ma5-09`), sin presentador: lleva `etiqueta`, una tabla de tres columnas y tres filas, dos destacados (`dato` e `idea_clave`) y la fuente con `url`. Salen las dos láminas del inicio. Cambian `subtitulo` («El taller de Iván, después de hora» → «El papel de la pared»), `duracionEstimadaMin` (8 → 6) y `objetivoAprendizaje` |

Además:

- En las tres preguntas, las opciones tienen un largo parecido y la correcta varía de posición (segunda, primera, tercera). Los textos van tal cual.
- La lámina nombra pantallas de la plataforma: el catálogo de ocupaciones y, dentro de una ocupación, el panel «Cómo se llega aquí» (`LlegarAOcupacion.tsx`). Si alguno no coincide con lo que se ve, avisar antes de cambiar el texto.
- **La plataforma no tiene una pantalla de «carreras del futuro»:** la lista vive en la ficha F23, y la lámina manda a la ficha. No se agrega ninguna pantalla.
- Los identificadores de nodo cambian. Comprobar con una búsqueda que ninguno se use fuera de este archivo.
- `titulo`, `ubicacion`, `requisitos`, `mapa`, `personajeIds`, `escenario`, `bloque` y `orden` no cambian.

## 2. Datos del backend (`ov_backend/datos/contenido.py`)

### 2.1 Actividad (`ACTIVIDADES` y `DESCRIPCIONES`)

| Campo | Hoy | Queda |
|---|---|---|
| Duración de ma5 | 8 | 6 |
| Descripción de ma5 | «Iván, después de hora: hacia dónde se mueve el trabajo y qué es emprender de verdad.» | «Un viajero dejó en el taller de Iván una lista de profesiones del futuro. Ábrela con él antes de creerle.» |

El título y la regla `R-ma5` no cambian.

### 2.2 Regla de la ficha

| Regla | Mensaje de hoy | Queda |
|---|---|---|
| `R-F23` | «Visita a Iván después de hora.» | «Revisa con Iván la lista de profesiones del futuro.» |

La condición no cambia.

### 2.3 Ficha F23 (`FICHAS`)

El título («Carreras del futuro y emprender»), el tema («Mis opciones») y el destinatario no cambian.

**Resumen, hoy:** «Qué ocupaciones crecen, cómo leer una lista de «carreras del futuro» y qué significa emprender en el Perú.»
**Queda:** «Qué ocupaciones crecen, cómo leer una lista de «carreras del futuro» y qué mirar antes de poner un negocio.»

**Contenido:** se reemplaza completo por este texto (entre las dos líneas de guiones, sin incluirlas):

----------

Cada año aparece una lista nueva de «profesiones del futuro». Sirven para mirar hacia dónde se mueve el trabajo, no para elegir por moda. Y poner un negocio, en el Perú, es algo que mucha gente ya hace: conviene saber cómo.

### Hacia dónde se mueve el trabajo

El Foro Económico Mundial pregunta cada dos años a empresas grandes qué esperan del trabajo. Para su informe de 2025 respondieron más de mil, de 55 países. Estiman que, hacia 2030, cerca de 4 de cada 10 habilidades que hoy pide un trabajo habrán cambiado (39 %).

El informe mide el crecimiento de dos maneras, y salen listas distintas:

| Cómo se mide | Qué ocupaciones salen |
| --- | --- |
| Las que crecen más rápido, en porcentaje | Especialistas en datos y en inteligencia artificial, desarrolladores de software, ingenieros ambientales y de energías renovables |
| Las que suman más puestos, en cantidad | Trabajadores del campo, de reparto, de construcción y de ventas; enfermería, cuidado de personas, docentes de secundaria y de educación superior |

Una ocupación puede crecer muy rápido y seguir siendo pequeña. Otra crece despacio y da muchos más puestos.

### De dónde se llega

Estos son ejemplos de carreras que forman para lo que crece. No es una lista cerrada: a casi todas estas ocupaciones se llega por más de un camino.

| Lo que crece | Ocupaciones | Carreras desde las que se llega |
| --- | --- | --- |
| Datos e inteligencia artificial | Especialistas en datos y en inteligencia artificial, desarrolladores | Ciencias de la computación, ingeniería de sistemas, estadística, matemática |
| Seguridad digital | Especialistas en ciberseguridad y en redes | Ingeniería de sistemas, redes y telecomunicaciones |
| Energía y ambiente | Ingenieros ambientales y de energías renovables | Ingeniería ambiental, de energía, civil |
| Salud y cuidado | Enfermería, cuidado de personas, trabajo social | Ciencias de la salud, trabajo social |
| Educación | Docentes de secundaria y de educación superior | Educación, o una carrera de base más formación docente |
| Campo y alimentos | Trabajadores agrícolas y de la industria de alimentos | Agronomía, industrias alimentarias, carreras técnicas agropecuarias |

Mi Carrera, la plataforma del Ministerio de Trabajo, publica su propia lista de carreras del futuro para el Perú. Léela con las mismas preguntas que cualquier otra.

### Cómo leer una lista de carreras del futuro

1. **Del futuro de quién.** Una lista habla del mercado de quienes respondieron: aquí, empresas grandes de muchos países. Lo que se pide en tu región puede ser otra cosa, y cambia de un año a otro.
2. **Crecer rápido no es dar muchos puestos.** Mira si la lista mide porcentaje o cantidad.
3. **Crecer no es pagar bien ni dar empleo formal.** Una ocupación puede crecer y seguir siendo mal pagada o informal.
4. **Muchas no son carreras sino especializaciones.** A «especialista en inteligencia artificial» se llega desde computación, estadística o ingeniería. No es una carrera con ese nombre.
5. **Lo que más se pide no es una carrera.** Las empresas del informe ponen primero pensar con orden un problema; después, adaptarse a los cambios y trabajar con otros.

### Poner un negocio en el Perú

Según el reporte GEM Perú 2025/2026:

- El 12,8 % de los adultos está empezando un negocio o tiene uno de menos de tres años y medio.
- El 5,3 % tiene un negocio que ya pasó los tres años y medio.
- De quienes emprenden, 7 de cada 10 (71,6 %) dicen que empezaron porque no encontraban empleo.
- 1 de cada 10 (9,9 %) espera dar trabajo a más de seis personas en cinco años.

Empezar porque no hay empleo es lo más común, y no tiene nada de malo: muchas familias viven de un negocio así. Lo que ayuda es prepararlo.

### Antes de abrir

1. **¿Qué sé hacer que alguien necesita?** Puede venir de una carrera, de un oficio o de años de práctica.
2. **¿Quién me lo pagaría, y cuánto?** Pregúntaselo a quienes serían tus clientes, no a tus amigos.
3. **¿Con qué empiezo y cuánto aguanto sin ganar?** Los primeros meses casi nunca dan ingresos estables.
4. **¿Conozco a alguien que ya lo hizo?** Su experiencia ahorra errores.

Estudiar y poner un negocio no se excluyen. Una formación te da algo que ofrecer, y trabajar un tiempo en el rubro te muestra cómo funciona por dentro.

> Una lista de carreras del futuro es una pista. Ábrela antes de usarla.

**Para tu viaje.** En el catálogo de ocupaciones, cada ocupación tiene «Cómo se llega aquí»: la familia de carreras que forma para ella y, en «También puedes llegar desde», otras familias. Es una guía, no una lista definitiva: a muchas ocupaciones se llega también por otros caminos.

**Fuentes:** [Foro Económico Mundial (2025), The Future of Jobs Report 2025](https://www.weforum.org/publications/the-future-of-jobs-report-2025/digest/). [Mi Carrera (MTPE)](https://micarrera.trabajo.gob.pe/). GEM Perú 2025/2026, en [Andina (2026)](https://andina.pe/agencia/noticia-financiamiento-y-politicas-publicas-siguen-siendo-las-mayores-barreras-para-emprender-1080299.aspx) y [Gestión (2026)](https://gestion.pe/economia/emprendedores-pendientes-en-peru-8-de-cada-10-ven-oportunidades-pero-solo-2-las-toman-noticia/).

----------

En el archivo va como una sola cadena, con `\n` y con las comillas escapadas como en las demás fichas.

## 3. Pruebas y lo que no cambia

- Si alguna prueba o fixture compara la descripción, la duración, la cantidad de nodos de `ma5`, el mensaje de `R-F23` o el texto de F23, se actualiza con los valores de este documento.
- Ninguna pregunta de batalla usa F23. No cambian la cantidad de fichas, las reglas ni lo que abre la actividad. El conjunto `ruta` y sus pruebas no se tocan.

## 4. Comprobaciones

- `scripts/verificar_contenido_front.py` sin discrepancias y suites completas.
- Buscar en `ma5.json` «después de hora», «registro», «único» y «apuesta»: no aparecen. Buscar en F23 «44 %», «módulo» y «sobrevive»: no aparecen.
- En el navegador, con el conjunto `contenido`:
  - **ma5:** con el registro de `h3` adecuado, aparece colgada de `h3`. Las tres preguntas con pista y explicación, y la lámina con su tabla y sus dos destacados, también en pantalla angosta.
  - **Ficha:** al cerrar, F23 queda en la mochila con el texto nuevo; las tres tablas y los enlaces de las fuentes se ven bien.
  - **Catálogo:** abrir una ocupación y confirmar que el panel se llama «Cómo se llega aquí» y que debajo aparece «También puedes llegar desde» cuando hay familias secundarias.
  - **«Anterior»:** recorrer `ma5` de inicio a fin y de fin a inicio.

## 5. Decisiones ya tomadas (para `decisiones.md`)

- `ma5` es práctica: un viajero dejó en el taller una lista de «profesiones del futuro» e Iván la abre con el estudiante (carrera o especialización, de qué mercado habla). Emprender sale de la historia de Iván en b1-3: la bomba, el molino y los faroles.
- Salen «Sol vio tu registro», «me dijeron que contrastaste tu perfil», «el único de la ciudad que vive de un negocio propio» (Dora tiene la taberna) y «abrí el taller después de años arreglando artefactos para otros», que contradecía b1-3.
- La plataforma no tiene pantalla de carreras del futuro: se muestran desde la ficha F23.
- «Cómo se llega aquí» se presenta como guía y no como lista definitiva, en la lámina y en la ficha.
- F23 pasa al informe de 2025 del Foro Económico Mundial (39 %, ya no 44 %) y suma la diferencia entre crecer rápido y sumar más puestos.
- F23 corrige la lectura del GEM: el 5,3 % es la parte de los adultos con un negocio de más de tres años y medio, no la parte de emprendedores que «consolida». Sale «entre los países con más emprendimiento del mundo».
- Salen de F23 dos afirmaciones sin fuente: que el negocio por oportunidad «sobrevive más» y que uno abierto después de una carrera «tiene mejores probabilidades». El negocio por necesidad se trata sin desmerecerlo.
- Las cifras del GEM se leyeron en notas de prensa, no en el reporte.

---

## Ajuste · coherencia-ma1-ma7


## Contexto

Reescritura, decidida por el usuario, de las informativas opcionales `ma1` (Nadia, cuelga de b1-1) y `ma7` (Doña Cifra, cuelga de b3-4), del banco de la batalla `ma7-b`, de la ficha F13 y de tres textos del desafío de Doña Cifra. Textos **tal cual** del texto de observaciones y de los adjuntos (`ma1 (1).json`, `ma7 (1).json`, `bancos_opcionales (1).py`). Se suma a la spec en curso `ov_backend/docs/specs/ajuste-coherencia-misiones-helena.md` como sección `## Ajuste · coherencia-ma1-ma7` (con el texto como anexo), en `ajuste/coherencia-bloque5`. Se aplica sobre ma5 ya hecho (no hay archivos en común salvo `contenido.py`, en entradas distintas).

## Qué cambia (hoy → pasará a)

### F8 · contenido
- Front:
  - `plataforma/ma1.json` y `ma7.json` se reemplazan por los adjuntos (ma1: 4 nodos, ubicación «Nevado, taller de la cartógrafa»; ma7: 4 → 11 nodos, tres preguntas y una lámina final, subtítulo «Un solo número», ubicación «Puerto, mercado», `objetivoAprendizaje`).
  - `plataforma/ma7_b.json`: solo `ubicacion` «Doña Cifra y las brechas» → «Puerto, plaza del mercado».
  - `src/data/content/challenges.ts`, `desafio-cifra-brechas` (l. 375–388): `presentacionEnemigo`, `recompensa.titulo` y `recompensa.mensajeFin` (§3). Nada más del desafío.
- Backend `datos/contenido.py` (script de un solo uso en el scratchpad, reemplazos exactos):
  - `DESCRIPCIONES` de ma1, ma7 y ma7-b (§2.1).
  - `PREGUNTAS_BATALLA`: las diez tuplas `ma7-b-p01..p10` (l. 502–511) se reemplazan por las doce de `PREGUNTAS_MA7_B` del adjunto (leídas con `ast.literal_eval`, escritas con `repr`). `CONFIGURACION_BATALLAS['ma7-b'] = (3, 3, 5)` no cambia.
  - `FICHAS` F13: contenido completo de §2.3 (entre las líneas de guiones); título, resumen, tema «Mundo laboral» y audiencia iguales.
- Ya comprobado: los nombres de la lámina («Cuánto ganan sus egresados», «Por lugar», «Jóvenes», «Adultos») están en `features/discovery/components/IngresoCarrera.tsx`. Ningún id de nodo `ma1-0x`/`ma7-0x` se usa fuera de los JSON.

### Prueba que se adapta (autorizada por §4: prueba que compara el banco de ma7-b)
- `tests/integration/datos/test_conversaciones_contenido.py` fija la posición de la correcta de `ma7-b-p03` (0) y `ma7-b-p07` (3) «antes del ajuste». El banco se reemplaza entero (p03 y p07 pasan a la tercera opción), como ya pasó con b1-5 y b3-5 en ajustes anteriores, donde esas entradas se sacaron. Se sacan también estas dos y, para no dejar la prueba vacía, `test_las_batallas_tocadas…` pasa a comprobar el banco nuevo con los valores del texto: doce preguntas `ma7-b-p01..p12`, todas de F13, cuatro opciones, explicación, y la correcta tres veces en cada posición. Se anota en `decisiones.md`.
- `test_ninguna_cifra_vieja…` ya cubre F13 y el banco (no contienen «85 %» ni «75,7»).

### Docs
- `decisiones.md`: las de §6 y la adaptación de la prueba.
- `contenidos-actividades.md`: «Pendientes»: quitar `ma1` de «Textos que no siguen los criterios» (ya no dice «Leí tu punto de origen») y la batalla ma7-b de «Por revisar con el mismo patrón» si ya no aplica; sumar a «Datos que envejecen» la Encuesta de Demanda Ocupacional 2026 y el INEI abril 2025–marzo 2026 en F13, ma7 y ma7-b; «Por confirmar en la fuente»: cifras de la encuesta leídas en la nota del MTPE y en prensa. «Continuidad»: Nadia escribió una carta a la niña que fue (calza con b1-2); nadie en la historia lee lo que el viajero escribe.

## Qué no cambia
Títulos, duraciones, reglas (`R-ma1`, `R-ma7`, `R-ma7-b`, `R-d-nino`), lo que abre cada actividad, la cantidad de fichas, la pregunta del diario «Carta al niño que fui», `b3_3.json`, el banco de b3-5, el resto del desafío. El conjunto `ruta`.

## Pruebas y verificación
- `verificar_contenido_front.py`; re-exportar fixtures; impacto: `tests/integration/datos`, `escenarios`, `batallas`, `fichas`; front `tests/local/actividades`, `tests/servidor/actividades`, `tests/servidor/batallas`, `tests/servidor/registro`. Commit `Ajuste coherencia-ma1-ma7 · F8: …`.
- Búsquedas: «MINEDU» y «Horna» en `ma1.json`; «revancha» y «registro» en `ma7.json`; «Puno» en F13: ninguna.
- F9 · cierre: suites completas; navegador con `contenido` (backend aparte en 8010 sobre base temporal; avanzar hasta b3-4 adecuado): ma1 colgada de b1-1 (diálogos, elección con dos reacciones, cierre; la carta queda en el diario), ma7 colgada de b3-4 (tres preguntas con retroalimentación y explicación, lámina con tabla también a 375 px; al cerrar se abre ma7-b), ma7-b con el banco nuevo y los textos nuevos de presentación y final, F13 en la mochila (lista de cinco, párrafo nuevo, enlaces), «Anterior» en ma1 y ma7 de inicio a fin y de fin a inicio. Decisiones y docs; borrar lo provisional. Commit.

La spec queda en curso.

## Preguntas abiertas
Ninguna.

---

### Anexo · texto de observaciones de coherencia-ma1-ma7


Para sumar al ajuste en curso, **en la rama actual** (`ajuste/coherencia-bloque5`), después de `ajuste-coherencia-registros-ma.md`. Revisado contra `main` del repo `carloz31/ov`, commit `5f49fc3` (13 nov 2026).

## Qué es

Reescritura de dos informativas opcionales, `ma1` (con Nadia, cuelga de `b1-1`) y `ma7` (con Doña Cifra, cuelga de `b3-4`), del banco de preguntas de la batalla opcional `ma7-b` y dos agregados a la ficha F13. Los textos ya están decididos por el usuario: **no se reescriben, no se resumen y no se «mejoran»**.

Esta carpeta trae, junto a este documento:

- Dos JSON finales: `ma1.json` y `ma7.json`.
- `bancos_opcionales.py`: el banco de la batalla `ma7-b`, en el formato de `PREGUNTAS_BATALLA`.

La ficha F13 va completa en la sección 2.3.

Todo lo del backend va **solo en el conjunto `contenido`** (`ov_backend/datos/contenido.py`).

## 1. JSON de las actividades

**Hoy:** `ov_frontend/src/data/activities/contenidos/plataforma/ma1.json` y `ma7.json`.
**Pasará a:** cada uno se reemplaza, completo, por el archivo del mismo nombre de esta carpeta.

| Actividad | Nodos (hoy → queda) | Lo que conviene saber |
|---|---|---|
| ma1 Carta al niño que fui | 4 → 4 | Solo diálogos y una elección. Cambia `ubicacion` («Una carta privada» → «Nevado, taller de la cartógrafa»). Título y subtítulo no cambian |
| ma7 Más allá del promedio | 4 → 11 | **Tres preguntas de opción única, que hace Lumi, y una lámina después de las preguntas** (`ma7-09`), sin presentador: lleva `etiqueta`, una tabla de tres columnas y tres filas, un destacado y la fuente con `url`. Cambian `subtitulo` («Doña Cifra y las regiones» → «Un solo número») y `ubicacion` (→ «Puerto, mercado»). Se suma `objetivoAprendizaje` |

Además:

- En las tres preguntas de `ma7`, las opciones tienen un largo parecido y la correcta varía de posición (segunda, primera, tercera). Los textos van tal cual.
- Los nombres entre comillas de la lámina son los de la pantalla de ingresos del catálogo (`IngresoCarrera.tsx`): «Cuánto ganan sus egresados», «Por lugar», «Jóvenes» y «Adultos». Si alguno no coincide con lo que se ve, avisar antes de cambiar el texto.
- Las cifras de la lámina son las de F13 (Geología, Obstetricia y el 84,8 % del INEI), que no cambian.
- Los identificadores de nodo cambian. Comprobar con una búsqueda que ninguno se use fuera de estos archivos.
- `requisitos`, `mapa` (con `origen` y `adicional`), `personajeIds`, `duracionEstimadaMin`, `escenario`, `bloque` y `orden` no cambian.

### `ma7_b.json`

No se reemplaza. Solo cambia un campo:

| Campo | Hoy | Queda |
|---|---|---|
| `ubicacion` | «Doña Cifra y las brechas» (repite el subtítulo) | «Puerto, plaza del mercado» (como el desafío) |

## 2. Datos del backend (`ov_backend/datos/contenido.py`)

### 2.1 Descripciones cortas (`DESCRIPCIONES`)

| Actividad | Hoy | Queda |
|---|---|---|
| ma1 | «Nadia te propone escribirle una carta al niño o la niña que fuiste.» | «Nadia cuenta la carta que le escribió a la niña que fue, y te propone escribir la tuya en el diario.» |
| ma7 | «Doña Cifra muestra lo que nunca muestra: los números por región, edad y formalidad.» | «Doña Cifra trae un solo promedio. Léelo por partes: de dónde es, de qué edad y de quiénes.» |
| ma7-b | «La revancha con las brechas.» | «Doña Cifra dice lo que significan sus números. Corrígela con lo que ya sabes leer.» |

Títulos, duraciones y reglas (`R-ma1`, `R-ma7`, `R-ma7-b`, `R-d-nino`) no cambian.

### 2.2 Banco de la batalla ma7-b (`PREGUNTAS_BATALLA`)

El banco está en `bancos_opcionales.py` (`PREGUNTAS_MA7_B`), en el mismo formato de tuplas del archivo. Reemplaza, completas, las preguntas de hoy:

| Batalla | Hoy | Queda | Ficha |
|---|---|---|---|
| ma7-b | 10 (`ma7-b-p01` a `p10`) | 12 (`ma7-b-p01` a `p12`) | Las doce con F13 |

- `CONFIGURACION_BATALLAS` de ma7-b, `(3, 3, 5)`, no cambia.
- En cada pregunta las cuatro opciones tienen la misma forma y un largo parecido, y la correcta cae tres veces en cada posición. Los textos van tal cual.
- Cuatro preguntas (6, 7, 9 y 10) se responden con los agregados a F13 de la sección 2.3: el banco y la ficha entran juntos.
- Ninguna repite una pregunta de b3-3 ni del banco de b3-5, que también usa F13.
- Si alguna prueba cuenta las preguntas de ma7-b (10), pasa a 12.
- `bancos_opcionales.py` es solo el material para copiar: no se agrega al código ni se importa.

### 2.3 Ficha F13 (`FICHAS`)

El título, el resumen, el tema y el destinatario no cambian. **No se quita nada de lo que la ficha dice hoy**, así que `b3-3` y el banco de `b3-5` siguen valiendo. Cambian tres partes:

| Parte | Qué cambia |
|---|---|
| «Las carreras "más demandadas"» | Dice a qué empresas se les pregunta, cuántos puestos anunciaron para 2026, que casi cuatro de cada cinco son temporales y en qué regiones se concentran (antes, «Puno no es Piura», sin dato). La lista pasa de cuatro puntos a cinco, y se suma que los negocios de menos de 20 trabajadores no entran |
| «El empleo sin planilla» | Un párrafo nuevo: la informalidad según el nivel de estudios (37,6 % con educación universitaria; 94,7 % con primaria o menos) |
| Fuentes | La Encuesta de Demanda Ocupacional se cita con su edición (puestos previstos para 2026) y con la nota del MTPE |

Todo lo de demanda sale de una sola edición de la encuesta del MTPE, la misma que alimenta la lista de Mi Carrera a la que manda la ficha.

**Contenido:** se reemplaza completo por este texto (entre las dos líneas de guiones, sin incluirlas):

----------

Los números del mercado laboral sirven si sabes de quién son y de qué año. Mal leídos, un promedio puede hacerte elegir una carrera por un sueldo que gana una minoría.

### Cómo se lee un salario

- **Promedio, mínimo y máximo van juntos.** El promedio es el centro de mucha gente distinta. El mínimo y el máximo dejan fuera los extremos: uno de cada diez gana menos que el mínimo y uno de cada diez, más que el máximo.
- **Jóvenes y adultos.** «Jóvenes» son egresados recientes, de 18 a 29 años; «adultos», personas con más experiencia. La diferencia entre los dos muestra cuánto suele crecer el ingreso: en Geología, de S/ 4 200 a S/ 10 800; en Obstetricia, de S/ 4 500 a S/ 5 300.
- **Por familia, no por carrera.** El dato es de la familia de carreras y del tipo de institución, no de una carrera exacta.
- **Por departamento.** Una misma familia paga distinto en Arequipa o en Loreto; el catálogo lo muestra por lugar.
- **Solo empleo en planilla.** Son sueldos de quienes trabajan para un empleador, antes de los descuentos de ley, y ganan al menos el sueldo mínimo. Quien trabaja sin contrato o por su cuenta no está contado.

### Qué familias pagan más al inicio

Ingreso promedio mensual de egresados jóvenes con empleo en planilla, en todo el país, con los mismos datos del catálogo:

| Universidades | S/ | Institutos y escuelas | S/ |
| --- | --- | --- | --- |
| Medicina | 7 030 | Minería, metalurgia y petróleo | 6 804 |
| Odontología | 4 732 | Ingeniería eléctrica | 3 757 |
| Obstetricia | 4 480 | Hidrografía | 3 641 |
| Ingeniería de sistemas y cómputo | 4 320 | Suboficiales de las Fuerzas Armadas | 3 561 |
| Ingeniería de telecomunicaciones | 4 227 | Ingeniería industrial | 3 551 |

Estas son la excepción. La mitad de las familias universitarias está por debajo de S/ 3 100, y la mitad de las de institutos, por debajo de S/ 2 600. Y el sueldo no dice nada de lo que cuesta llegar: Medicina paga más, pero dura siete años.

### Universidad e instituto: lo que dicen los datos

- La familia de instituto mejor pagada (minería, metalurgia y petróleo) supera al inicio a casi todas las universitarias.
- En la mayoría de las familias que se estudian en los dos tipos de institución (18 de 22), la universitaria paga más al inicio.

Las dos cosas son ciertas a la vez. Ni «el instituto es la opción B» ni «da lo mismo»: depende de la familia. Míralo en el catálogo para la que te interesa.

### Las carreras «más demandadas»

Cada año, el Ministerio de Trabajo les pregunta a las empresas privadas formales de 20 o más trabajadores cuánta gente piensan contratar y de qué carreras. De ahí salen las listas de carreras más demandadas, que puedes ver en Mi Carrera. Para 2026, las empresas anunciaron cerca de 425 mil puestos nuevos. Al leer la lista:

1. Muy pedida no es empleo seguro. Administración está entre las primeras casi todos los años, y también es la carrera universitaria con más estudiantes: hay muchos puestos y muchísima gente que los busca.
2. Casi cuatro de cada cinco puestos anunciados para 2026 son temporales o por temporada.
3. La lista cambia de un año a otro. La de hoy no es la de cuando egreses.
4. Cambia por región: casi ocho de cada diez puestos de 2026 están en cinco regiones (Lima Metropolitana, Ica, Lambayeque, Piura y La Libertad).
5. Pedida no es bien pagada.

Los negocios con menos de 20 trabajadores no entran en la encuesta. El catálogo de la plataforma no incluye la demanda.

### El empleo sin planilla

En el Perú, el 69,8 % de las personas que trabajaban tenía un empleo informal entre abril de 2025 y marzo de 2026; entre quienes tenían de 14 a 24 años, el 84,8 % (INEI). Un empleo es informal cuando no da seguridad social; suele venir sin contrato, sin pensión y sin vacaciones pagadas.

Estudiar baja ese riesgo, pero no lo elimina: en el mismo periodo, de quienes tenían educación universitaria, el 37,6 % trabajaba en la informalidad; de quienes tenían primaria o menos, el 94,7 %.

Para tu decisión importa por una razón: los sueldos que ves en el catálogo son de quienes consiguieron empleo en planilla. No todos los egresados lo consiguen, ni lo consiguen pronto.

Otro dato para tener en cuenta: menos de la mitad de los egresados trabaja en algo vinculado a lo que estudió, el 44 % de los técnicos y el 38,4 % de los universitarios (Minedu y UNESCO, 2026).

> Un salario promedio es un dato de otras personas. Sirve para ubicarte, no para saber cuánto vas a ganar tú.

**Para tu viaje.** En el detalle de cada carrera, «Cuánto ganan sus egresados» muestra los ingresos de su familia por lugar y por institución. Usa el dato de jóvenes para pensar tus primeros años y el de adultos para más adelante.

**Fuentes:** Catálogo de la plataforma, con datos de Ponte en Carrera (MTPE y Minedu), consultados en 2026; [nota técnica de Ponte en Carrera sobre mínimos y máximos](https://ponteencarrera.minedu.gob.pe/pec-portal-web/assets/archivos/cuanto-ganan-tecnicos.pdf). MTPE, Encuesta de Demanda Ocupacional con los puestos previstos para 2026, en [Mi Carrera](https://micarrera.trabajo.gob.pe/) y en la [nota del MTPE (2026)](https://www.gob.pe/institucion/mtpe/noticias/1309892-peru-generaria-mas-de-425-mil-nuevas-oportunidades-laborales-en-2026). [Sunedu, en Gestión (2023), las carreras con más estudiantes](https://gestion.pe/peru/sunedu-educacion-al-futuro-universidades-que-estudian-los-peruanos-la-12-carreras-con-mayor-poblacion-profesionales-peruanos-noticia/). [INEI (2026), Comportamiento de los indicadores de mercado laboral a nivel nacional, abril 2025–marzo 2026](https://www.inei.gob.pe/media/MenuRecursivo/boletines/empleo-nacional-i-trimestre-2026.pdf). Minedu y UNESCO (2026), Revisión de la Política de Educación y Formación Técnica y Profesional del Perú, en [Andina](https://andina.pe/agencia/noticia-peru-tecnicos-superan-a-universitarios-trabajos-afines-a-sus-estudios-revela-unesco-1080082.aspx).

----------

En el archivo va como una sola cadena, con `\n` y con las comillas escapadas como en las demás fichas.

## 3. Desafío de Doña Cifra (`ov_frontend/src/data/content/challenges.ts`, `desafio-cifra-brechas`)

| Campo | Hoy | Queda |
|---|---|---|
| `presentacionEnemigo` | «Doña Cifra saca los números que nunca muestra: por región, por edad y por formalidad. Cada brecha que leas bien es un promedio que deja de engañar. Corta y opcional.» | «Doña Cifra trae más números a la plaza y dice lo que significan, a su manera. Cada vez que la corrijas con lo que ya sabes leer, un promedio deja de engañar. Corta y opcional.» |
| `recompensa.titulo` | «Las brechas, leídas» | «Los números, leídos» |
| `recompensa.mensajeFin` | «Un promedio nacional es cuatro promedios mezclados. Léelo por partes.» | «Un promedio se lee por partes: de dónde es, de qué edad y de quiénes.» |

Lo demás del desafío no cambia.

## 4. Pruebas y lo que no cambia

- Si alguna prueba o fixture compara las descripciones, la cantidad de nodos de `ma1` o `ma7`, o la cantidad de preguntas de `ma7-b`, se actualiza con los valores de este documento.
- Si alguna prueba o fixture compara el texto de F13, se actualiza con el de la sección 2.3.
- No cambian las reglas, lo que abre cada actividad, la cantidad de fichas ni la pregunta del diario «Carta al niño que fui». Tampoco `b3_3.json` ni el banco de `b3-5`. El conjunto `ruta` y sus pruebas no se tocan.

## 5. Comprobaciones

- `scripts/verificar_contenido_front.py` sin discrepancias y suites completas.
- Buscar «MINEDU» y «Horna» en `ma1.json`, y «revancha» y «registro» en `ma7.json`: no aparecen. Buscar «Puno» en F13: no aparece.
- En el navegador, con el conjunto `contenido`:
  - **ma1:** con el registro de `b1-1` adecuado, aparece colgada de `b1-1`. Los dos diálogos de Nadia, la elección con sus dos reacciones y el cierre de Lumi. Al cerrar, la carta «Carta al niño que fui» está en el diario.
  - **ma7:** con el registro de `b3-4` adecuado, aparece colgada de `b3-4`. Las tres preguntas con pista y explicación, y la lámina con su tabla, también en pantalla angosta. Al cerrar se abre `ma7-b`.
  - **ma7-b:** las preguntas salen del banco nuevo, con cuatro opciones y su explicación. La presentación de Doña Cifra y el mensaje final muestran los textos nuevos.
  - **Ficha F13:** en la mochila, «Las carreras "más demandadas"» muestra la lista de cinco puntos y «El empleo sin planilla» el párrafo nuevo; los enlaces de las fuentes abren.
  - **«Anterior»:** recorrer `ma1` y `ma7` de inicio a fin y de fin a inicio.

## 6. Decisiones ya tomadas (para `decisiones.md`)

- `ma1`: Nadia ya no dice «Leí tu punto de origen» (nadie en la historia lee lo que el viajero escribe). Cuenta la carta que le escribió a la niña que fue, que calza con lo que contó en b1-2. Sale la cita de la fuente en boca de Lumi y la opción «¿Y quién la lee?», que repetía b0-2.
- `ma7` es práctica, no repaso de b3-3: Doña Cifra trae un solo promedio y tres personas que lo usaron mal. El estudiante corrige cada caso (el lugar, la edad, quiénes están contados) y la lámina dice dónde mirar cada cosa en el catálogo.
- En `ma7`, Doña Cifra afirma y Lumi pregunta; la lámina va después de las preguntas y no la presenta Lumi.
- Salen de `ma7` «tu registro del mercado estuvo bien hecho», «la revancha de verdad… te quedas con el puesto» y «cuatro promedios mezclados».
- El banco de `ma7-b` se rehízo con F13: Doña Cifra afirma y el estudiante corrige. No repite las preguntas de b3-3, del banco de b3-5 ni los casos de `ma7`.
- F13 suma solo datos verificables y útiles para el estudiante: a quién se le pregunta por la demanda, cuántos puestos son temporales, dónde se concentran y la informalidad según el nivel de estudios. Todo lo de demanda sale de una sola edición de la encuesta del MTPE (puestos previstos para 2026), la que muestra Mi Carrera.
- Se dejó fuera de F13 lo que no se pudo confirmar o no aportaba: cuántos puestos suma la carrera más pedida, los ingresos del INEI por nivel de estudios y las listas regionales de 2023.
- La plataforma no tiene la demanda: la ficha lo dice y ninguna pregunta manda a buscarla en el catálogo.
- Las cifras de la encuesta se leyeron en la nota del MTPE y en prensa; el informe completo no se pudo abrir.

---

## Ajuste · coherencia-feria


## Contexto

Reescritura, decidida por el usuario, de la informativa opcional `feria` (Marina, se abre al completar b3-6) y de su ficha F22. Textos **tal cual** del texto de observaciones y del `feria.json` adjunto. Se suma a la spec en curso `ov_backend/docs/specs/ajuste-coherencia-misiones-helena.md` como sección `## Ajuste · coherencia-feria` (con el texto como anexo), en `ajuste/coherencia-bloque5`. Mismo patrón que coherencia-ma5.

## Qué cambia (hoy → pasará a)

### F10 · feria y F22
- Front: `plataforma/feria.json` se reemplaza por el adjunto (8 → 11 nodos: tres preguntas de Lumi y una lámina final sin presentador; subtítulo «El plano de la plaza», 6 min, `objetivoAprendizaje` y `mensajeFin` nuevos; `mapa` igual).
- Backend `datos/contenido.py`, con un script de reemplazos exactos en el scratchpad (como el de ma5) que toma el contenido de F22 del texto de observaciones (entre las líneas de guiones):
  - `ACTIVIDADES` l. 121: duración de feria 8 → 6.
  - `DESCRIPCIONES` l. 256: feria → «Marina cuelga el plano de la feria. Planea tu visita: qué preparar, qué preguntar y qué anotar al salir.»
  - `REGLAS` l. 1257: `R-F22` «Prueba la guía de Marina.» → «Planea con Marina tu visita a la feria.» (condición igual).
  - `FICHAS` F22: resumen y contenido nuevos; título, tema «Mis opciones» y audiencia iguales.
- Ya comprobado: «Mis favoritos» existe en el catálogo (`CatalogoServidor.tsx`), «Página web» en el detalle de institución (`DetalleInstitucionServidor.tsx`), y «Mis dudas» dentro de «Qué tanto la conozco» en el plan. Ningún id de nodo `feria-0x` se usa fuera del JSON. Ninguna prueba compara textos de feria o F22.

### Docs
- `decisiones.md`: las de §5.
- `contenidos-actividades.md`: «Continuidad»: Marina fue a su primera feria a los diecisiete y volvió con dos bolsas de folletos; feria ya no repite b3-6 (licencia, «dato o promesa», Faro Dorado). F22 remite a «Licenciamiento y acreditación».

## Qué no cambia
Título de feria, `R-feria`, requisitos, `mapa`, cantidad de fichas y reglas, `b3_6.json` y sus fichas, el conjunto `ruta`.

## Pruebas y verificación
- `verificar_contenido_front.py`, re-exportar fixtures, impacto (`tests/integration/datos`, `escenarios`, `fichas`; front `tests/local/actividades`, `tests/servidor/actividades`, `tests/servidor/registro`), commit `Ajuste coherencia-feria · F10: …`.
- Búsquedas en `feria.json`: «guía», «Faro Dorado», «licenci», «promesa»: ninguna.
- F11 · cierre: suites completas; navegador con `contenido` (backend aparte en 8010 sobre base temporal avanzada hasta b3-6): feria aparece, tres preguntas (con un error para la retroalimentación y la explicación), lámina con tabla también a 375 px, «Anterior» de inicio a fin y de fin a inicio, F22 en la mochila al cerrar (tabla, listas, cita, enlaces), y los nombres «Mis favoritos», «Página web», «Mis dudas»/«Qué tanto la conozco». Decisiones y docs; borrar lo provisional. Commit.

La spec queda en curso.

---

### Anexo · texto de observaciones de coherencia-feria


Para sumar al ajuste en curso, **en la rama actual** (`ajuste/coherencia-bloque5`), después de `ajuste-coherencia-ma5.md`. Revisado contra `main` del repo `carloz31/ov`, commit `5f49fc3` (13 nov 2026).

## Qué es

Reescritura de la informativa opcional `feria` (con Marina, se abre al completar `b3-6`) y de su ficha F22. Los textos ya están decididos por el usuario: **no se reescriben, no se resumen y no se «mejoran»**.

Esta carpeta trae, junto a este documento, el JSON final `feria.json`. La ficha F22 va completa en la sección 2.3.

Todo lo del backend va **solo en el conjunto `contenido`** (`ov_backend/datos/contenido.py`).

## 1. JSON de la actividad

**Hoy:** `ov_frontend/src/data/activities/contenidos/plataforma/feria.json`.
**Pasará a:** se reemplaza, completo, por `feria.json` de esta carpeta.

| Actividad | Nodos (hoy → queda) | Lo que conviene saber |
|---|---|---|
| feria La feria vocacional | 8 → 11 | **Tres preguntas de opción única, que hace Lumi, y una sola lámina después de las preguntas** (`feria-09`), sin presentador: lleva `etiqueta`, una tabla de dos columnas y tres filas, un destacado y la fuente con `url`. Salen las dos láminas del inicio, la elección y la pregunta de selección múltiple. Cambian `subtitulo` («La plaza de la ciudad en día de feria» → «El plano de la plaza»), `duracionEstimadaMin` (8 → 6), `objetivoAprendizaje` y `recompensa.mensajeFin` |

Además:

- En las tres preguntas, las opciones tienen un largo parecido y la correcta varía de posición (segunda, tercera, primera). Los textos van tal cual.
- La lámina nombra pantallas de la plataforma: «Mis favoritos» (catálogo) y «Mis dudas» (en el plan, dentro de «Qué tanto la conozco»). Si alguno no coincide con lo que se ve, avisar antes de cambiar el texto.
- Los identificadores de nodo cambian. Comprobar con una búsqueda que ninguno se use fuera de este archivo.
- `titulo`, `ubicacion`, `requisitos`, `mapa`, `personajeIds`, `escenario`, `bloque` y `orden` no cambian.

## 2. Datos del backend (`ov_backend/datos/contenido.py`)

### 2.1 Actividad (`ACTIVIDADES` y `DESCRIPCIONES`)

| Campo | Hoy | Queda |
|---|---|---|
| Duración de feria | 8 | 6 |
| Descripción de feria | «Marina abre la feria de la plaza. Qué preguntar y cómo separar un dato de una promesa.» | «Marina cuelga el plano de la feria. Planea tu visita: qué preparar, qué preguntar y qué anotar al salir.» |

El título y la regla `R-feria` no cambian.

### 2.2 Regla de la ficha

| Regla | Mensaje de hoy | Queda |
|---|---|---|
| `R-F22` | «Prueba la guía de Marina.» | «Planea con Marina tu visita a la feria.» |

La condición no cambia.

### 2.3 Ficha F22 (`FICHAS`)

El título («Cómo aprovechar una feria»), el tema («Mis opciones») y el destinatario no cambian.

**Resumen, hoy:** «Qué llevar a una feria o a la web de una institución, qué preguntar y cómo separar un dato de una promesa.»
**Queda:** «Cómo planear tu visita a una feria vocacional: qué preparar antes, qué preguntar y a quién, y qué hacer con lo que averiguaste.»

**Contenido:** se reemplaza completo por este texto (entre las dos líneas de guiones, sin incluirlas):

----------

Una feria vocacional junta en un solo lugar a muchas instituciones que quieren que estudies con ellas. Ir no alcanza: sirve si vas con un plan. Sin plan, se sale con una bolsa de folletos y las mismas dudas.

### Antes de ir

1. **Elige tus paradas.** Revisa tus favoritos y anota qué instituciones los dictan. Si la feria publica la lista de participantes o un plano, marca esos puestos. Lo demás es paseo.
2. **Escribe tres preguntas.** Que sean de las que la página web no responde. Si puedes, ármalas con alguien de tu casa o con un compañero: se les ocurrirán cosas que a ti no.
3. **Lleva lapicero y libreta.** De lo que no se apunta, al día siguiente queda poco.
4. **Calcula el tiempo.** Con veinte puestos y una mañana no alcanza para todos. Con cuatro o cinco paradas, sí alcanza para conversar.

### En la feria

- **Ve primero a tus paradas.** Después, si queda tiempo, pasea.
- **Pregunta lo que escribiste.** Quien atiende tiene un discurso listo; tus preguntas lo sacan de ahí.
- **Busca a un estudiante de la carrera.** Muchas instituciones llevan estudiantes a su puesto. Para saber cómo es estudiar ahí, nadie responde mejor.
- **Apunta al salir de cada puesto.** Dos líneas bastan: qué te dijeron y qué quedó sin responder.
- **Deja un rato para un puesto que no estaba en tu lista.** A veces aparece una opción que no habías mirado.
- **Si hay charlas u orientación gratuita, aprovéchalas.** Varias ferias las incluyen.

### Preguntas que valen

| Pregunta | Para qué sirve |
| --- | --- |
| ¿Qué curso es el que más cuesta en primer año? | Para saber cómo es estudiar la carrera, no solo qué se estudia |
| ¿Dónde hacen prácticas los estudiantes de esta carrera? | Pide nombres de lugares, no «tenemos convenios» |
| ¿Cuánto se paga en total por ciclo, con matrícula y otros pagos? | Las ferias suelen decir la pensión «desde»; pide el total |
| ¿Qué becas o escalas de pensión hay, y con qué requisitos? | Si la beca exige un promedio, pregunta cuántos la mantienen |
| ¿Cuándo es la admisión y qué modalidades tiene? | Fechas, costo de inscripción y qué se evalúa |
| A un estudiante: ¿cómo es una semana normal?, ¿qué te sorprendió al empezar? | Lo que no sale en ningún folleto |

### Esa misma noche

Antes de que se mezcle todo: por cada institución que te interesó, anota qué averiguaste y qué te falta saber. Lo que falta lo buscas después en su página web, o se lo preguntas a alguien que estudie ahí.

Una buena impresión no es una respuesta. Un puesto bonito o un promotor simpático no dicen nada de la carrera.

### Lo que te digan, compruébalo

Si en un puesto te hablan de licencia, de acreditación o de «empleo asegurado», no lo tomes como dato hasta comprobarlo fuera de la institución. Cómo hacerlo está en la ficha «Licenciamiento y acreditación».

### Si no hay feria donde vives

- Haz lo mismo con la página web de cada institución: tus paradas, tus tres preguntas y tus apuntes.
- Algunas ferias son virtuales, y hay colegios que se conectan a ellas desde el aula.
- El Pronabec organiza la feria Ruta 18 en varias regiones, gratuita y sin inscripción previa, con información de la Beca 18 y de las instituciones donde se puede usar.
- Pregunta en tu colegio: muchas ferias se organizan para cuarto y quinto de secundaria.

> A una feria se va con preguntas. Lo que cuenta es lo que anotas al salir.

**Para tu viaje.** Tus paradas salen de «Mis favoritos», en el catálogo. Cada institución del catálogo tiene el enlace a su «Página web». Y lo que te quede por averiguar puede ir a «Mis dudas», en tu plan, dentro de «Qué tanto la conozco».

**Fuentes:** MINEDU (2013), cartilla, actividad 11 (feria vocacional). [NACAC, College Fair Tip Sheet](https://macac.wildapricot.org/resources/Documents/SOTR%20Toolkit/P5/Early%20High%20School%20SBS5%20Activity%20-%20Campus%20Visits%20and%20College%20Fairs.pdf). [College Board (2012), College Counseling Sourcebook, «How to get the most out of a college fair»](https://secure-media.collegeboard.org/digitalServices/pdf/membership/counselor-workshops/conduct.pdf). [Pronabec, feria Ruta 18](https://www.pronabec.gob.pe/feria-ruta-18/).

----------

En el archivo va como una sola cadena, con `\n` y con las comillas escapadas como en las demás fichas.

## 3. Pruebas y lo que no cambia

- Si alguna prueba o fixture compara la descripción, la duración, la cantidad de nodos de `feria`, el mensaje de `R-F22` o el texto de F22, se actualiza con los valores de este documento.
- Ninguna pregunta de batalla usa F22. No cambian la cantidad de fichas, las reglas ni lo que abre la actividad. `b3_6.json` y sus fichas no se tocan. El conjunto `ruta` y sus pruebas no se tocan.

## 4. Comprobaciones

- `scripts/verificar_contenido_front.py` sin discrepancias y suites completas.
- Buscar en `feria.json` «guía», «Faro Dorado», «licenci» y «promesa»: no aparecen.
- En el navegador, con el conjunto `contenido`:
  - **feria:** aparece al completar `b3-6`. Las tres preguntas con pista y explicación, y la lámina con su tabla, también en pantalla angosta.
  - **Ficha:** al cerrar, F22 queda en la mochila con el texto nuevo; la tabla y los enlaces de las fuentes se ven bien.
  - **Nombres de pantalla:** en el catálogo existe «Mis favoritos»; en el detalle de una institución, «Página web»; en un plan, «Mis dudas» dentro de «Qué tanto la conozco».
  - **«Anterior»:** recorrer `feria` de inicio a fin y de fin a inicio.

## 5. Decisiones ya tomadas (para `decisiones.md`)

- `feria` enseña a planear la visita en tres momentos (antes, en la feria, esa misma noche). Ya no repite `b3-6`: salen la licencia, «dato o promesa» y las frases del Faro Dorado.
- Marina cuenta su primera feria, a los diecisiete: volvió con dos bolsas de folletos y sin saber nada nuevo. Sale «¿Me ayudas a probar la guía antes de abrir?».
- Lumi pregunta; la lámina va después de las preguntas y no la presenta Marina.
- F22 se reordena en los mismos tres momentos y remite a «Licenciamiento y acreditación» en vez de repetirla. Suma qué hacer si no hay feria (página web, ferias virtuales, Ruta 18 del Pronabec).
- Los consejos salen de la cartilla del MINEDU y de guías de orientadores (NACAC y College Board).
