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
