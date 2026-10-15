# B11 · Sugerencias de pasos con LLM: prompt y ejemplos

Fuente del prompt para `services/sugerencias_planes.py` (spec B11, §3.6). Documento de apoyo del lote; al cerrar la spec, lo vigente pasa a `docs/sistema/planes.md` y este archivo se mueve a `docs/historico/B11/`.

## 1. Cuándo se llama

| Momento | Entrada | Salida | Llamadas |
|---|---|---|---|
| `guardar-seccion` CONOCIMIENTO | dudas **nuevas** (origen PREGUNTA, SUGERIDA o PROPIA) | 1–2 pasos por duda | 1 por guardado con dudas nuevas |
| `guardar-seccion` REALIDAD | complicaciones **nuevas** (lista DIFICULTADES u Otro) | 1 paso por complicación | 1 por guardado con complicaciones nuevas |

- Una llamada por guardado con todas las novedades (lote), nunca una por duda.
- Tope por plan: `MAXIMO_LLAMADAS_SUGERENCIAS_POR_PLAN`. Máximo `MAXIMO_PASOS_POR_DUDA` por duda, 1 por complicación.
- La respuesta se guarda en `sugerencia_tarjeta` junto a su duda o complicación (`generada_por = LLM`); reabrir o reeditar no regenera. Al editar la sección, solo las dudas o complicaciones nuevas van en la llamada.
- Respaldo (`generada_por = RESPALDO`) si falla la llamada, se agota el tope o la respuesta no parsea: por duda, «Averiguar: {texto}» con el tipo de investigar; por complicación, «Ver qué puedo hacer con: {texto}» con tipo «otra».
- Mismo cliente Gemini y mismo evaluador falso de las pruebas que en registro. Ninguna prueba llama a la red.

## 2. Contexto que recibe

- Carrera: nombre, familia, tipo RIASEC principal.
- Institución, si ya la eligió: nombre, tipo (pública/privada), ciudad, página web. Camino, si lo eligió.
- Las dudas o complicaciones nuevas, cada una con `id`, `texto` y `origen` (pregunta fija N / sugerida / propia; dificultad de lista / otro).
- La lista PASOS con código y etiqueta de cada tipo.
- Para complicaciones, además: total del primer año y financiamiento marcado.
- Nada más del estudiante: ni relato, ni resultados, ni respuestas de registro.

## 3. Prompt

### 3.1 Dudas

```
Eres parte de una plataforma de orientación vocacional para estudiantes de quinto de secundaria en el Perú.
El estudiante tiene como plan la carrera de {carrera}{ en {institucion}, {tipo_institucion} en {ciudad}}.
Anotó estas dudas sobre la carrera. Para cada duda, propón uno o dos pasos concretos que él mismo pueda
hacer en las próximas dos semanas para resolverla.

Reglas:
- Cada paso es una acción que un adolescente puede hacer solo o con ayuda de su colegio o familia, sin gastar dinero.
- Di a quién preguntar o dónde buscar, con nombre concreto: la página de admisión de {institucion}, el profesor
  del curso relacionado, la orientadora del colegio, alguien que estudie o trabaje en eso, la ficha de la carrera
  en la plataforma.
- Si la duda es sobre la experiencia de la carrera (cómo es el día a día, si es pesada, si hay trabajo), prefiere
  pasos con personas antes que búsquedas en internet.
- No respondas la duda, no opines sobre la carrera, no inventes cifras, fechas ni requisitos.
- Redacta en español del Perú, tuteando, en imperativo, máximo 140 caracteres por paso.
- Elige el tipo de cada paso entre: {lista PASOS como "codigo: etiqueta"}.

Dudas:
{id} · {texto} · origen: {origen}
...

Responde solo con JSON, sin texto alrededor:
[{"duda": "<id>", "pasos": [{"tipo": "<codigo>", "texto": "<paso>"}]}]
```

### 3.2 Complicaciones

Mismo prompt; cambia el segundo párrafo por:

```
Marcó estas cosas que podrían complicarle llegar a esa carrera. Su camino es {camino}; calculó que el primer año
le costaría aproximadamente S/ {total_primer_anio} y piensa pagarlo con {financiamiento}. Para cada complicación,
propón un paso que le ayude a saber qué tan grande es el problema o a empezar a resolverlo.
```

y la salida por `[{"complicacion": "<id>", "pasos": [{"tipo": "<codigo>", "texto": "<paso>"}]}]` (un paso).

### 3.3 Validación de la respuesta

- JSON parseable; cada `duda`/`complicacion` debe ser uno de los ids enviados (los demás se ignoran).
- `tipo` debe estar en PASOS; si no, se descarta ese paso. `texto` se recorta a 140 caracteres; vacío se descarta.
- Se conservan a lo sumo `MAXIMO_PASOS_POR_DUDA` por duda y 1 por complicación.
- Si tras validar una duda queda sin pasos, recibe el de respaldo.

## 4. Ejemplos de salida esperada (caso Mateo · Ingeniería Ambiental · UNALM, pública, Lima)

### Dudas

| Duda | Origen | Pasos esperados |
|---|---|---|
| ¿Cómo es un día normal de alguien de Ingeniería Ambiental? | pregunta 1 | Conversar · Pídele a tu profesor de CTA que te contacte con alguien que trabaje en medio ambiente y pregúntale cómo es su semana. · Investigar · Lee los testimonios de Ingeniería Ambiental en la plataforma y anota qué hacen un día cualquiera. |
| ¿Qué cursos llevaría? | pregunta 3 | Investigar · Busca el plan de estudios de Ingeniería Ambiental en la página de la UNALM y anota los cursos de los dos primeros años. |
| ¿Conozco a alguien que estudie o trabaje en esto? | pregunta 5 | Conversar · Pregunta en casa y a tus profesores si conocen a alguien que estudie o trabaje en Ingeniería Ambiental y pide que te presenten. |
| ¿Cuántos postulan y cuántos ingresan? | sugerida | Investigar · Entra a la página de admisión de la UNALM y busca cuántos postularon e ingresaron a Ingeniería Ambiental en el último examen. |
| ¿Hay trabajo en Lima o sobre todo en provincias? | propia | Conversar · Cuando hables con alguien de la carrera, pregúntale dónde trabajan sus compañeros de promoción. · Investigar · Busca en la página de la UNALM dónde hacen prácticas los estudiantes de Ingeniería Ambiental. |
| ¿Es muy pesado llevar eso y trabajar? | propia | Conversar · Pregúntale a un estudiante de la UNALM cuántas horas de clase tiene por semana y si conoce a alguien que trabaje. · Investigar · Revisa en el plan de estudios cuántos cursos se llevan por ciclo los primeros dos años. |

### Complicaciones

| Complicación | Paso esperado |
|---|---|
| Me cuesta matemática | Practicar · Pídele a tu profesor de matemática un examen de admisión pasado de la UNALM y resuélvanlo juntos para ver qué temas te faltan. |
| No sé si me alcanza el dinero | Investigar · Entra a pronabec.gob.pe y revisa los requisitos de Beca 18; anota cuáles cumples y cuáles no. |
| La universidad queda lejos | Conversar · Calcula con tu familia cuánto tiempo y pasaje tomaría ir y volver a La Molina cada día. |
| Otro: «Mi papá quiere que trabaje con él al salir» | Conversar · Pregúntale a tu papá si podrías ayudarlo medio tiempo mientras estudias y cuéntale el total del primer año que calculaste. |

## 5. Lo que no debe salir (casos para las pruebas con el evaluador falso)

- Pasos genéricos («investiga más sobre la carrera»): cada uno nombra fuente o persona.
- Pasos que cuestan dinero (academia, viaje).
- Responder la duda en vez de dar el paso.
- Cifras, plazos o requisitos inventados.
- Juicios sobre la carrera o sobre la complicación («matemática es fundamental, deberías…»).
- Más de dos pasos por duda; un tipo fuera de PASOS; texto de más de 140 caracteres.
- Una duda que no es sobre la carrera («¿me va a ir bien?») recibe igual un paso útil o el de respaldo, nunca una respuesta emocional.
