# Piloto Claude 3: mini corrida de cierre, b5-3 sin respaldo y P69 (piloto-claude-3)

20 casos × 3 repeticiones, solo `haiku-low`, con `prompts/v7-haiku.md` (más la línea nueva) y la tarjeta de b5-3 con la forma (1) = frase + BASE. Sin reglas de respaldo: lo mostrado es la repregunta del modelo si pasa el filtro, y la base si no. CSV: [piloto-claude-3-haiku-low.csv](piloto-claude-3-haiku-low.csv).

## 1. Archivos

| Ruta | `git hash-object` |
|---|---|
| `tests/llm/prompts/v7-haiku.md` | `d65339b1c98d771808924837c4fc9cecf3666ac4` |
| `tests/llm/tarjetas_b1_1.py` | `2dac96dfc09e230762e8712f45235083ed0cc465` |
| `tests/llm/tarjetas_b1_3.py` | `55dedbb331519d3f249bd2e08484d82ad3e81491` |
| `tests/llm/tarjetas_b1_6.py` | `3c1130c3b3ba4d45eb27f1d6731944968c873e13` |
| `tests/llm/tarjetas_b1_7.py` | `84950ca2241e81c7b6810834b451cefdd32a8351` |
| `tests/llm/tarjetas_b2_3.py` | `9d245c2612715db1bed0dede5560ee7386346b86` |
| `tests/llm/tarjetas_b2_4.py` | `8a768f627febccb89a7007f53215ab8f1187dfe0` |
| `tests/llm/tarjetas_b3_4.py` | `f77fa8f753eae4ed19e285ecb55abd2dc5a8d33e` |
| `tests/llm/tarjetas_b4_1.py` | `835a21a1207f4970f2ed37244bf25f3c1c5d9c5c` |
| `tests/llm/tarjetas_b4_2.py` | `6bc39e51ebf2587e06c1ec8c8ff2351549a56877` |
| `tests/llm/tarjetas_b4_5.py` | `f872c72dc89655bb796556b270acebc8b7cb286d` |
| `tests/llm/tarjetas_b5_1.py` | `982840145fdf9a36240cfd79f92f6074855ed7e0` |
| `tests/llm/tarjetas_b5_3.py` | `cbd0762262ad2b6d1c68e272979d7a5be0b07997` |
| `tests/llm/piloto_claude.py` | `b3111d39726a8075a28aea6dd5787c8d14875dae` |
| `tests/llm/evaluar_tarjetas.py` | `16c9d6ebbd6cdb6ec81cdca7cd6d02bcf78541ee` |
| `tests/llm/casos/piloto-claude-3.json` | `f9104d95766fac8034ddf23bcd19cab439fc3c73` |

Brazo: `claude-haiku-5-5`, `output_config.effort` `low`, razonamiento adaptativo por defecto (sin `thinking`), sin `temperature` (queda la de defecto, 1), `max_tokens` 8192, `output_config.format` `json_schema`, tiempo 120 s, sin reintentos (`max_retries=0`), SDK `anthropic` 2.8.0.

El hash de `piloto_claude.py` es el de la corrida; después solo cambió el armado del informe (las formas de b5-3 por turno y la fila de «Lo veo todo igual»), no las llamadas.

## 2. Resumen

| | piloto-claude-2 | piloto-claude-3 |
|---|---|---|
| Acierto de clasificación (casos en las dos rondas: 18) | 54/54 (100 %) | 54/54 (100 %) |
| Acierto de clasificación (todo el set) | — | 60/60 (100 %) |
| Casos inestables | — | 1 (P01) |
| Repreguntas que no pasaron el filtro, por regla | — | mas_de_30_palabras: 1 |
| b5-3, `general` de piezas: formas de la repregunta mostrada | — | BASE: 23, consigna repetida: 1, frase + BASE: 3, siga igual: 6 (de 33) |
| · y de la pista del seguimiento | — | BASE: 1, base de `no_sabe`: 1, otra: 1 (de 3) |
| b5-3, `general` de «Lo veo todo igual»: repregunta mostrada | — | BASE: 5, otra: 1 (de 6) |
| · y pista del seguimiento | — | otra: 3 (de 3) |
| Rechazos / JSON inválidos / otros errores | — | 0 / 0 / 0 |
| Latencia mediana / p95 (ms) | — | 2121 / 5468 |
| Tokens por llamada: entrada / salida (con razonamiento) / razonamiento | — | 5283 / 316 / 187 |
| Costo total / por llamada (USD) | — | 0.0535 / 0.000686 |

Formas de b5-3 (§1.4 de la spec): «frase + BASE» es una frase afirmativa seguida de la BASE tal cual; «BASE», la BASE sola; «consigna repetida», toda repregunta con «¿Qué viste, supiste o te pasó que te hizo verlo distinto?», sola o con algo delante. Los casos que no estaban en piloto-claude-2 (P25, P37) solo cuentan en la segunda fila.

## 3. Casos

Por caso y turno, por repetición: `tipo` (en el seguimiento, conjunto y final), la cruda → lo mostrado («=» si es la misma) y, en b5-3, la forma de lo mostrado; el filtro si actuó. En el seguimiento, lo mostrado es la pista.

| Caso | Grupo | Turno | Texto | Rep. 1 | Rep. 2 | Rep. 3 |
|---|---|---|---|---|---|---|
| P33 | b5-3, forma (1) | primera | Ahora quiero ser chef | `general`: Hoy quieres ser chef. ¿Qué viste, supiste o te pasó que te hizo verlo distinto a Medicina? → = [consigna repetida] | `general`: Hoy quieres ser chef. ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = [frase + BASE] | `general`: Hoy quieres ser chef. ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = [frase + BASE] |
| P41 | b5-3, forma (1) | primera | Nada que ver bro, la medicina no era pa mí | `general`: Hoy no la ves para ti. ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = [frase + BASE] | `general`: ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = [BASE] | `general`: ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = [BASE] |
| P26 | b5-3, forma (3) | primera | Me cambió la idea | `general`: ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = [BASE] | `general`: ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = [BASE] | `general`: ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = [BASE] |
| P26 | b5-3, forma (3) | seguimiento | No me acuerdo bien, fue de a pocos | `no_sabe` (conjunto `no_sabe`, final `general`): ¿Hubo alguna conversación, dato o persona que sumó a ese cambio poco a poco? → = [otra] | `no_sabe` (conjunto `no_sabe`, final `general`): Aunque no recuerdes el momento exacto, ¿hay algo que hayas visto o conversado que te fue moviendo la idea? → = [otra] | `no_sabe` (conjunto `no_sabe`, final `general`): Aunque haya sido de a pocos, ¿qué viste, supiste o te pasó en esas semanas que te movió la idea? → = [otra] |
| P35 | b5-3, forma (3) | primera | Uno cambia, pues | `general`: ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = [BASE] | `general`: ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = [BASE] | `general`: ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = [BASE] |
| P36 | b5-3, forma (3) | primera | Me di cuenta y ya | `general`: ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = [BASE] | `general`: ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = [BASE] | `general`: ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = [BASE] |
| P40 | b5-3, forma (3) | primera | YA NO ME VEO EN NADA | `general`: ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = [BASE] | `general`: ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = [BASE] | `general`: ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = [BASE] |
| P84 | b5-3, forma (3) | primera | Ya no lo creo | `general`: ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = [BASE] | `general`: ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = [BASE] | `general`: ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = [BASE] |
| P84 | b5-3, forma (3) | seguimiento | Cuando mi hermana dejó la carrera que le escogieron | `propio` (conjunto `propio`, final `propio`), sin repregunta | `propio` (conjunto `propio`, final `propio`), sin repregunta | `propio` (conjunto `propio`, final `propio`), sin repregunta |
| P85 | b5-3, forma (3) | primera | Ya no me siento capaz | `general`: ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = [BASE] | `general`: ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = [BASE] | `general`: ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = [BASE] |
| P85 | b5-3, forma (3) | seguimiento | Desde el simulacro, saqué muy bajo en mate | `propio` (conjunto `propio`, final `propio`), sin repregunta | `propio` (conjunto `propio`, final `propio`), sin repregunta | `propio` (conjunto `propio`, final `propio`), sin repregunta |
| P86 | b5-3, forma (3) | primera | Cambió nomás | `general`: ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = [BASE] | `general`: ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = [BASE] | `general`: ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = [BASE] |
| P86 | b5-3, forma (3) | seguimiento | Porque sí | `general` (conjunto `general`, final `general`): ¿Qué crees que hizo que lo vieras distinto? Puede ser algo que viste, supiste o te pasó, aunque sea pequeño. → = [otra] | `general` (conjunto `general`, final `general`): ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = [BASE] | `general` (conjunto `general`, final `general`): Mira lo que marcaste: ¿recuerdas algo que viste, supiste o te pasó que te hizo verlo distinto? → = [base de `no_sabe`] |
| P34 | b5-3, forma (2) y controles | primera | Sigo igual, sin saber | `general`: ¿Qué crees que hizo que siga igual? → = [siga igual] | `general`: ¿Qué crees que hizo que siga igual? → = [siga igual] | `general`: ¿Qué crees que hizo que siga igual? → = [siga igual] |
| P25 | b5-3, forma (2) y controles | primera | Lo sigo viendo como antes | `general`: ¿Qué crees que hizo que siga igual? → = [siga igual] | `general`: ¿Qué crees que hizo que siga igual? → = [siga igual] | `general`: ¿Qué crees que hizo que siga igual? → = [siga igual] |
| P25 | b5-3, forma (2) y controles | seguimiento | Porque mi hermano estudió Contabilidad y hasta ahora trabaja en eso, no pudo cambiar | `propio` (conjunto `propio`, final `propio`), sin repregunta | `propio` (conjunto `propio`, final `propio`), sin repregunta | `propio` (conjunto `propio`, final `propio`), sin repregunta |
| P22 | b5-3, forma (2) y controles | primera | Igual nomás | `general`: ¿Qué viste o supiste en este tiempo que te lo confirmó? Si nada cambió, cuéntame por qué crees que fue así. → = [BASE] | `general`: ¿Qué viste o supiste en este tiempo que te lo confirmó? Si nada cambió, cuéntame por qué crees que fue así. → = [BASE] | `general`: ¿Qué viste o supiste en este tiempo que te lo confirmó? Si nada cambió, cuéntame por qué crees que fue así. → = [BASE] |
| P38 | b5-3, forma (2) y controles | primera | Nada | `general`: ¿Qué viste o supiste en este tiempo que te lo confirmó? Si nada cambió, cuéntame por qué crees que fue así. → = [BASE] | `general`: ¿Qué viste o supiste en este tiempo que te lo confirmó? Si nada cambió, cuéntame por qué crees que fue así. → = [BASE] | `general`: ¿Qué crees que hizo que las cosas sigan igual para ti en este tiempo? → = [otra] |
| P38 | b5-3, forma (2) y controles | seguimiento | Nada pues | `general` (conjunto `general`, final `general`): ¿Qué crees que hizo que todo siga igual para ti en este tiempo? → = [otra] | `general` (conjunto `general`, final `general`): ¿Qué crees que hizo que todo siga igual? → = [otra] | `general` (conjunto `general`, final `general`): ¿Qué crees que hizo que nada cambiara para ti, aunque hayas visto o leído cosas en este tiempo? → = [otra] |
| P37 | b5-3, forma (2) y controles | primera | La verdad no le puse atención, lo hacía rápido para terminar | `propio`, sin repregunta | `propio`, sin repregunta | `propio`, sin repregunta |
| P69 | Conflicto con la familia | primera | Mi mamá no quiere que estudie eso y siempre peleamos cuando lo hablo | `general`: ¿Qué te hace pensar que tu mamá podría contarte si se puede estudiar y trabajar a la vez? → = | `general`: ¿Qué te hace pensar que tu mamá podría ayudarte a saber si se puede estudiar y trabajar a la vez? → = | `general`: ¿Qué le hace pensar a tu mamá que podría contarte si se puede estudiar y trabajar a la vez: algo en lo que trabaja, algo que estudió o algo que vivió? → ¿Qué te hace pensar que esa persona te podría contar cómo es: algo en lo que trabaja, algo que estudió o algo que vivió? (filtro: `mas_de_30_palabras`) |
| P70 | Conflicto con la familia | primera | Sé que podría ayudarme, pero es difícil hablar con él | `general`: ¿Qué te hace pensar que esa persona podría contarte cuánto se gana al empezar? → = | `general`: ¿Qué te hace pensar que esa persona te podría contar cuánto se gana al empezar? → = | `general`: ¿Qué te hace pensar que esa persona te podría contar cuánto se gana al empezar? → = |
| P01 | Conflicto con la familia | primera | Mi mamá dice que no voy a aguantar ver sangre | `propio`, sin repregunta | `general`: ¿Qué parte de Medicina Humana, como las prácticas, los turnos o la forma de atender pacientes, no va del todo con eso de cuidar a otras personas? → = | `general`: ¿Qué parte de Medicina Humana crees que va menos con ayudar, enseñar o cuidar a otras personas: una guardia, una práctica en el hospital o el trato con los pacientes? → = |
| P61 | Conflicto con la familia | primera | Lejos de mi casa, donde no me comparen | `general`: Elige un momento de ese día, por ejemplo a media mañana: ¿dónde estarías y qué estarías haciendo ahí? → = | `general`: Lejos de casa suena a buscar un lugar tranquilo. Elige un momento de ese día: ¿dónde estarías y qué estarías haciendo ahí? → = | `general`: Elige un momento de ese día, por ejemplo a media mañana: ¿dónde estarías y qué estarías haciendo ahí? → = |
| P31 | Control del bloque | primera | Siento que no doy la talla para eso | `general`: ¿En qué parte de Comunicación se notaría eso que te cuesta exponer: una presentación en clase, un trabajo grupal o una entrevista? → = | `general`: ¿En qué parte de Comunicación se notaría más lo de hablar frente a otros: una exposición en clase, un trabajo en grupo o una entrevista? → = | `general`: ¿En qué parte de Comunicación se notaría más exponer: una presentación en clase, una entrevista o un proyecto en equipo? → = |
| P54 | Control del bloque | primera | Me daría tranquilidad | `general`: ¿Tranquilidad frente a qué, en tu caso: frente a algo que ya viviste o que temes? → = | `general`: ¿Tranquilidad frente a qué te daría la estabilidad? → = | `general`: ¿Tranquilidad frente a qué? Piensa en algo que hayas vivido o visto, o en lo que la estabilidad te daría. → = |

## 4. Atención especial

### b5-3: crudas que no son una de las tres formas

Con `general`, toda cruda que no sea BASE, frase + BASE ni «siga igual»; con otro tipo, toda cruda que no sea la base de su tipo. Se copian completas.

- P33 rep. 1 (primera, `general`, consigna repetida): «Hoy quieres ser chef. ¿Qué viste, supiste o te pasó que te hizo verlo distinto a Medicina?» → mostrada: «Hoy quieres ser chef. ¿Qué viste, supiste o te pasó que te hizo verlo distinto a Medicina?»
- P26 rep. 1 (seguimiento, `no_sabe`, otra): «¿Hubo alguna conversación, dato o persona que sumó a ese cambio poco a poco?» → mostrada: «¿Hubo alguna conversación, dato o persona que sumó a ese cambio poco a poco?»
- P26 rep. 2 (seguimiento, `no_sabe`, otra): «Aunque no recuerdes el momento exacto, ¿hay algo que hayas visto o conversado que te fue moviendo la idea?» → mostrada: «Aunque no recuerdes el momento exacto, ¿hay algo que hayas visto o conversado que te fue moviendo la idea?»
- P26 rep. 3 (seguimiento, `no_sabe`, otra): «Aunque haya sido de a pocos, ¿qué viste, supiste o te pasó en esas semanas que te movió la idea?» → mostrada: «Aunque haya sido de a pocos, ¿qué viste, supiste o te pasó en esas semanas que te movió la idea?»
- P86 rep. 1 (seguimiento, `general`, otra): «¿Qué crees que hizo que lo vieras distinto? Puede ser algo que viste, supiste o te pasó, aunque sea pequeño.» → mostrada: «¿Qué crees que hizo que lo vieras distinto? Puede ser algo que viste, supiste o te pasó, aunque sea pequeño.»
- P86 rep. 3 (seguimiento, `general`, base de `no_sabe`): «Mira lo que marcaste: ¿recuerdas algo que viste, supiste o te pasó que te hizo verlo distinto?» → mostrada: «Mira lo que marcaste: ¿recuerdas algo que viste, supiste o te pasó que te hizo verlo distinto?»
- P38 rep. 1 (seguimiento, `general`, otra): «¿Qué crees que hizo que todo siga igual para ti en este tiempo?» → mostrada: «¿Qué crees que hizo que todo siga igual para ti en este tiempo?»
- P38 rep. 2 (seguimiento, `general`, otra): «¿Qué crees que hizo que todo siga igual?» → mostrada: «¿Qué crees que hizo que todo siga igual?»
- P38 rep. 3 (primera, `general`, otra): «¿Qué crees que hizo que las cosas sigan igual para ti en este tiempo?» → mostrada: «¿Qué crees que hizo que las cosas sigan igual para ti en este tiempo?»
- P38 rep. 3 (seguimiento, `general`, otra): «¿Qué crees que hizo que nada cambiara para ti, aunque hayas visto o leído cosas en este tiempo?» → mostrada: «¿Qué crees que hizo que nada cambiara para ti, aunque hayas visto o leído cosas en este tiempo?»

### P33 y P41: palabras de cada «frase + BASE»

| Caso | Rep. | Mostrada | Forma | Palabras | Filtro |
|---|---|---|---|---|---|
| P33 | 1 | Hoy quieres ser chef. ¿Qué viste, supiste o te pasó que te hizo verlo distinto a Medicina? | consigna repetida | 17 | pasó |
| P33 | 2 | Hoy quieres ser chef. ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. | frase + BASE | 22 | pasó |
| P33 | 3 | Hoy quieres ser chef. ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. | frase + BASE | 22 | pasó |
| P41 | 1 | Hoy no la ves para ti. ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. | frase + BASE | 24 | pasó |
| P41 | 2 | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. | BASE | 18 | pasó |
| P41 | 3 | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. | BASE | 18 | pasó |

### P69, P70, P01 y P61: menciones de la pelea, el desacuerdo, lo que dice otra persona o las comparaciones

Búsqueda automática sobre las crudas (pelea, discusión, desacuerdo, comparar, «no quiere», «tu mamá dice»…) y revisión a mano (§5).

- Ninguna.

### Cambios de `tipo` frente a piloto-claude-2

| Caso | Esperado | piloto-claude-2 | piloto-claude-3 | ¿Aparece un `tipo` nuevo? |
|---|---|---|---|---|
| P33 | general | general · general · general | general · general · general | no |
| P41 | general | general · general · general | general · general · general | no |
| P26 | general → conjunto general o no_sabe | general · general · general | general · general · general | no |
| P35 | general | general · general · general | general · general · general | no |
| P36 | general | general · general · general | general · general · general | no |
| P40 | general | general · general · general | general · general · general | no |
| P84 | general → conjunto propio | general · general · general | general · general · general | no |
| P85 | general → conjunto propio | general · general · general | general · general · general | no |
| P86 | general → conjunto general → final general | general · general · general | general · general · general | no |
| P34 | general | general · general · general | general · general · general | no |
| P25 | general → conjunto propio | general · general *(de piloto-claude-1)* | general · general · general | no |
| P22 | general | general · general · general | general · general · general | no |
| P38 | general → conjunto general → final general | general · general · general | general · general · general | no |
| P37 | propio | propio · propio *(de piloto-claude-1)* | propio · propio · propio | no |
| P69 | general · `sensible: false` | general · general · general | general · general · general | no |
| P70 | general | general · general · general | general · general · general | no |
| P01 | general o propio · `sensible: false` | general · general · general | propio · general · general | **sí** |
| P61 | general · `sensible: false` | general · general · general | general · general · general | no |
| P31 | general | general · general · general | general · general · general | no |
| P54 | general | general · general · general | general · general · general | no |

## 5. Revisión a mano

Se leyeron todas las crudas de esta ronda.

- **b5-3, piezas.** La repregunta mostrada fue una de las tres formas en 32 de 33: BASE tal cual en P26, P35, P36, P40, P84, P85 y P86 (las tres repeticiones), en P41 rep. 2 y 3; «siga igual» en P34 y P25 (las tres); frase + BASE en P33 rep. 2 y 3 y P41 rep. 1. La excepción es P33 rep. 1, «Hoy quieres ser chef. ¿Qué viste, supiste o te pasó que te hizo verlo distinto a Medicina?»: la consigna vieja, con «a Medicina» agregado. En P41 rep. 2 y 3, donde tocaba la forma (1), salió la BASE sola.
- **b5-3, pistas del seguimiento.** Las de P26 (`no_sabe`) son preguntas propias en las tres repeticiones en vez de la base de `no_sabe`; la de P86 rep. 1 también («¿Qué crees que hizo que lo vieras distinto?…»), y la de P86 rep. 3 es la base de `no_sabe` para un `general`. Son pistas que se guardan, no lo que ve el estudiante.
- **b5-3, «Lo veo todo igual».** P22 dio la BASE de `IGUAL` las tres veces. P38 dio la BASE en la primera respuesta en las rep. 1 y 2, y en la rep. 3 una variante de «siga igual» («¿Qué crees que hizo que las cosas sigan igual para ti en este tiempo?»); sus tres pistas también son variantes de «siga igual».
- **Conflicto con la familia.** Ninguna cruda de P69, P70, P01 ni P61 retoma la pelea, lo que dice la mamá ni las comparaciones. P69 rep. 3 cayó por largo y, además, invierte el sentido («¿Qué le hace pensar a tu mamá que podría contarte…?»). P61 rep. 2 abre con «Lejos de casa suena a buscar un lugar tranquilo.», que interpreta lo que escribió.
- **Control del bloque.** P31 sigue nombrando la pieza de forma neutra («eso que te cuesta exponer», «hablar frente a otros», «exponer»). P54 trae una sola pregunta en las tres («¿Tranquilidad frente a qué…?») y pasó el filtro.
- **Clasificación.** Sin cambios frente a piloto-claude-2, salvo P01 rep. 1 (`propio`, que su esperado «general o propio» acepta).

## 6. Notas

- Clasificación: 60/60; el único `tipo` nuevo es P01 rep. 1 (`propio`), que su esperado acepta.
- b5-3, piezas: de 33 repreguntas mostradas de `general`, 32 son una de las tres formas; la otra (P33 rep. 1) es la consigna vieja con «a Medicina». Con «Lo veo todo igual» sale otra forma en P38 rep. 3, y las pistas del seguimiento se apartan de las formas en P26, P86 y P38.
- Frase + BASE salió 3 veces (22 a 24 palabras con la frase; las tres pasaron el filtro); en P41 rep. 2 y 3 el modelo prefirió la BASE sola.
- Ninguna repregunta de P69 menciona la pelea; solo una repregunta cayó en el filtro (P69 rep. 3, por largo).
- Costo US$ 0,054 por 78 llamadas; mediana 2,1 s y p95 5,5 s.
