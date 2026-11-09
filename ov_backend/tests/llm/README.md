# Validación del LLM de seguimiento

Mide cómo responde Gemini a casos escritos a mano para cada registro: si clasifica bien (`cumple`, `abierto`, `sensible`) y si sus repreguntas, `falta` y consolidadas cumplen la rúbrica. Usa el mismo mensaje, prompt, esquema, modelo y temperatura que el backend.

**No es parte de la suite de pytest**: llama a Gemini real, cuesta dinero (centavos) y su resultado varía entre corridas. Ningún archivo aquí se llama `test_*.py`. Se corre a mano cuando cambia el prompt, la temperatura, el modelo o los campos de seguimiento de un ítem (`que_busca`, `texto_base`, `cumple`, `no_cumple`, `evitar`, opciones propias).

## Estructura

```
tests/llm/
  evaluar.py                     arma los mensajes, llama, compara y guarda
  casos/<registro>.json          casos y lo esperado por ítem
  resultados/<registro>/
    <fecha>_<prompt>_t<temp>_r<nivel>[_<etiqueta>].csv   una fila por caso, corrida e ítem
    resumen.md                   una línea por corrida (se agrega sola)
```

Los CSV y los `resumen.md` **se versionan**: son la evidencia de la validación del LLM.

## Uso (desde `ov_backend`)

```
uv run python tests/llm/evaluar.py b1-1 b1-3                     # todos los casos, 2 corridas
uv run python tests/llm/evaluar.py b1-1 --solo E4 S1 --corridas 3
uv run python tests/llm/evaluar.py b1-1 --temperaturas 0.2 1.0   # comparar temperaturas
uv run python tests/llm/evaluar.py b1-1 --razonamiento low       # minimal|low|medium|high; sin él, NIVEL_RAZONAMIENTO_REGISTRO adaptado al modelo
uv run python tests/llm/evaluar.py b1-1 --mostrar E4             # el mensaje exacto, sin llamar
```

El CSV guarda `razonamiento`, `tokens_entrada`, `tokens_razonamiento` y `tokens_salida`. En una entrega, latencia y tokens son de la llamada completa y se repiten en cada ítem: para promediar, cuenta una vez por caso y corrida.

Requiere `GEMINI_API_KEY` (la del proyecto con facturación, Tier 1); si no está en el entorno, la toma del `.env` del backend, igual que `GEMINI_MODELO` (sin imprimirlas). Por defecto hace 8 llamadas en paralelo (`--hilos`).

## Prueba de tarjetas (v7.x)

`evaluar_tarjetas.py` prueba la clasificación nueva por `tipo` con el método **B**: el LLM clasifica y redacta la repregunta, y un filtro decide si se usa o si va la base de la tarjeta. Hoy corre b1-3 (v7.2c, dos corridas de cada caso). No toca el backend, el prompt vigente ni `evaluar.py`: lee su prompt (`prompts/v7.md`), sus tarjetas (`tarjetas_b1_1.py`, `tarjetas_b1_3.py`, solo datos y copia de `tarjetas-registros.md`), sus casos (`casos/b1-3-tarjetas-v7.2c.json`) y su léxico (`lexico/es_ES.dic` y `.aff`, hunspell de [LibreOffice/dictionaries](https://github.com/LibreOffice/dictionaries), con `spylls`, dependencia de desarrollo).

```
uv run python tests/llm/evaluar_tarjetas.py --revisar           # solapamiento y filtro sobre v7 y v7.2, sin llamar
uv run python tests/llm/evaluar_tarjetas.py --mostrar 20        # el prompt y el mensaje, sin llamar
uv run python tests/llm/evaluar_tarjetas.py                     # una corrida: CSV e informe
uv run python tests/llm/evaluar_tarjetas.py --informe <csv>     # rehace el informe desde un CSV, sin llamar
```

Antes de llamar, el runner se detiene si un caso coincide con los EJEMPLOS o con las frases de GENERAL SI de su tarjeta. El informe es `resultados/b1-3/v7.2c.md` y anota el `git hash-object` de cada archivo usado; rehacerlo reemplaza las secciones escritas a mano. Las corridas anteriores (`resultados/b1-1/v7-tarjetas.md`, `v7.1-gustos.md` y `resultados/b1-3/v7.2.md`, `v7.2b.md`, con los casos `casos/b1-*-tarjetas*.json`) quedan como evidencia: el código, el prompt y las tarjetas con que corrieron están en el historial de git.

## Formato de un caso

```json
{"id": "E4", "tipo": "entrega", "descripcion": "…",
 "items": [{"item": "b1-1-logro", "texto": "…", "opciones": ["PERSISTIR", {"codigo": "OTRA", "texto": "Ninguna"}]}],
 "esperado": {"b1-1-logro": {"cumple": false, "no_contiene": ["costaba"], "retoma": ["logré", "logro"],
                             "util": "Pide qué hizo él, partiendo de lo que dijo"}}}

{"id": "S1", "tipo": "seguimiento", "item": "b1-1-logro", "texto": "texto inicial", "opciones": [],
 "turnos": [["repregunta", "respuesta del estudiante"]],
 "contexto": [{"item": "…", "texto": "…", "opciones": []}],
 "referencias": {"b4-1-ref-plan": {"tipo": "PLAN", "texto": "Ingeniería de Sistemas"}},
 "esperado": {"cumple": false, "abierto": true}}
```

- `opciones`: códigos de la lista o de las opciones propias del ítem; «otra» como objeto.
- `entrega`: los ítems de la actividad juntos (una llamada, como en la plataforma). Los ítems sin criterio, o con una opción `criterio: null`, no van al modelo y salen como «sin LLM».
- `contexto` y `referencias`: solo si el ítem declara `ecos_llm` que los necesiten.
- `esperado` por ítem. Claves que se comparan: `cumple`, `abierto`, `emocional`, `sensible` (bool; si falta, vale cualquiera), `repregunta_nula`. Claves que solo alimentan chequeos: `sin_futuro` (ítems que preguntan por el pasado), `no_contiene` (palabras de otro ítem), `contiene_alguno` (retomar lo que se fue del tema), `retoma` (palabras del estudiante: la repregunta debe contener alguna).
- `util` en `esperado`: una frase con lo que haría provechosa la repregunta en ese caso (a qué apunta, qué ángulo da). No se compara: sale en la columna `util` del CSV, junto a la repregunta, para revisarla a mano.
- `referencias`: el `nombre` del eco no viene del caso. Se toma, como en el backend, del ítem fuente de la referencia en `REFERENCIAS` o, sin ítem fuente, de `NOMBRES_ECO_REFERENCIA` según el `tipo`.

## Chequeos automáticos (columna `chequeos`)

| Código | Qué detecta |
|---|---|
| `filtro_backend` | La repregunta no pasaría `pregunta_valida`: el backend usaría el `texto_base` |
| `R1_generica` | Copia «¿Podrías darme un ejemplo concreto…?» |
| `R2_preguntas` / `R3_largo` | Más de una pregunta / más de 35 palabras |
| `R4_futuro` | Pregunta qué haría en un ítem que pregunta por lo que hizo |
| `R5_texto_base` | Copia el `texto_base` literal |
| `R6_otro_item` | Pregunta por lo que pide otro ítem |
| `R7_no_retoma` | La repregunta no contiene ninguna de las palabras de `retoma` |
| `R8_prohibida` | «explica más», «desarrolla», «por qué crees que», criterios, IA |
| `R9_califica` | Califica la respuesta: «suena a» o «eso no es» en la repregunta (por palabras, sin puntuación) |
| `R10_falta` | `falta` con pregunta, demasiado larga, como pedido («Necesito…», «Cuéntame…») o que no empieza por «Podrías» |
| `R11_truncada` | La repregunta contiene «…» o «...» |
| `R12_pero` | «, pero» o «pero ¿» en la repregunta |
| `R14_eco_vacio` | Cita como contenido «no sé», «nada», «ninguno» o «no me acuerdo», también en segunda persona o con «no recuerdas» («Dices que no sabes», «Contaste que nada»). No detecta paráfrasis como «no te falta nada» |
| `fuera_de_tema` | No retoma la palabra con la que se fue del tema |
| `C3_consolidada_larga` | La consolidada supera `FACTOR_MAXIMO_CONSOLIDADA` × lo escrito + `MARGEN_CONSOLIDADA` (el backend concatena) |

Estas columnas son informativas (se cuentan, pero no fallan) y valen `sí` cuando corresponde:

| Columna | Qué detecta |
|---|---|
| `sino` | La pregunta se responde con sí o no: empieza por «¿Recuerdas», «¿Hay», «¿Alguna vez», «¿Te…?», «¿Has…?», «¿Es…?» o similar |
| `r13_examen` | «exactamente», «punto exacto» o «específicamente» en la repregunta |
| `copia_guia` | La repregunta contiene 5 o más palabras seguidas (sin tildes ni mayúsculas) de un ángulo, del `texto_base` o del `que_busca` del ítem |
| `disyuntiva` | En la parte que va desde el último «¿», hay «o» o «u» seguida de un interrogativo con tilde (qué, quién, cómo, cuándo, dónde, cuál, cuánto; con preposición o sin ella) o de una palabra terminada en -aste, -iste, -abas o -ías. No cuenta listas de pistas («algo que aprendiste o que antes no te salía») ni un interrogativo escrito sin tilde |

Lo que no se automatiza se revisa a mano en el CSV: que la repregunta sirva (columna `util`), que el ángulo sea nuevo y que el tono sea de par (rúbrica en `claude/pruebas-llm-b1-1.md` del proyecto).

## Criterio de aceptación de una corrida

- Clasificación igual a lo esperado en todas las corridas, salvo casos anotados como límite en su `descripcion`.
- `sensible`: ningún falso positivo en los casos marcados «no sensible» y ningún falso negativo en los «sensible».
- Sin `R1`, `R4`, `R6`, `R7`, `R8`, `R9` ni `filtro_backend`. `R10` y `C3` se toleran ocasionales.

## Registros validados con v6.7

b1-1, b1-3, b1-6, b1-7 y ma3 quedan validados con el prompt v6.7 (`gemini-3.1-flash-lite`, temperatura 1.0).

| Registro | Corrida |
|---|---|
| b1-1 | [ronda-5](resultados/b1-1/2026-11-08_0349_v6.7_t1_ronda-5.csv) |
| b1-3 | [ronda-5](resultados/b1-3/2026-11-08_0349_v6.7_t1_ronda-5.csv) |
| b1-6 | [ronda-5](resultados/b1-6/2026-11-08_0349_v6.7_t1_ronda-5.csv) |
| b1-7 | [ronda-5](resultados/b1-7/2026-11-08_0349_v6.7_t1_ronda-5.csv) |
| ma3 | [ronda-5](resultados/ma3/2026-11-08_0349_v6.7_t1_ronda-5.csv) y [cierre](resultados/ma3/2026-11-08_0358_v6.7_t1_cierre.csv) (SM1, 4 corridas) |

Tras `ronda-5` cambió lo esperado en b1-1 S6 (`cumple: true`) y ma3-pasos ganó un ejemplo de `cumple`; por eso S6 y SM1 no coinciden en ese CSV, y SM1 se volvió a medir en `cierre` (4 de 4).

**Ejemplos de `cumple` tomados de su propio caso** (que ese caso pase no prueba que el modelo generalice):

- b1-6 E2 («Mis papás. Ya no lo creo.»).
- b1-7 F2-freno («Si no ingreso, vuelvo a postular»).
- b1-1 E10-gustos («Jugaba con plastilina»).
- ma3 SM1 («Inscribirme en una academia y luego dar el examen de San Marcos en marzo»). Tiene una variante que no está entre los ejemplos, SM3, que generaliza 4 de 4 ([cierre-variante](resultados/ma3/2026-11-08_0405_v6.7_t1_cierre-variante.csv)).

**Criterio de cierre:** lo que falla 1 de 2 con efecto leve se declara límite; un falso negativo de `sensible`, nunca.

**Límites** (también en la `descripcion` de cada caso):

| Caso | Límite | Tasa en `ronda-5` |
|---|---|---|
| b1-6 E6 | No cumple pese a traer la idea y dónde la oyó | 1 de 2 |
| b1-7 F2-dia | No cumple pese a describir el día | 1 de 2 |
| b1-7 F5-hito | Propone `abierto` en la entrega; el motor lo ignora | 2 de 2 |
| ma3 M4-pasos | La repregunta parafrasea la consigna | 2 de 2 |
| ma3 M5-falta | Ante «nada» pregunta «¿hay algo…?» | 2 de 2 |
