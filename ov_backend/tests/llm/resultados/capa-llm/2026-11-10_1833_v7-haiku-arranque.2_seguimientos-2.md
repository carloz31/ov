# Capa del LLM: 2026-11-10_1833_v7-haiku-arranque.2_seguimientos-2

`claude-haiku-5-5`, prompt `v7-haiku-arranque.2 (6babbf14f64e)`. 68 casos, 68 corridas de caso, 136 llamadas con respuesta. CSV: [2026-11-10_1833_v7-haiku-arranque.2_seguimientos-2.csv](2026-11-10_1833_v7-haiku-arranque.2_seguimientos-2.csv).

## 1. Archivos

| Ruta | `git hash-object` |
|---|---|
| `tests/llm/evaluar_tarjetas.py` | `17bdbc04920f2f8b04d104f2bc1729018eab586c` |
| `app/services/registro/llm/__init__.py` | `9b77d36cd868d0a6907a51d8dddb2f421841543d` |
| `app/services/registro/llm/arranque.py` | `9c7d2ae3bc56f1195d617b81651d2ba7c6ee5bd7` |
| `app/services/registro/llm/cliente.py` | `e8c3e8cea1a1a76e69d121ff309b8d38307a86d2` |
| `app/services/registro/llm/estado.py` | `bd6ab8f06012f62bdf94152b4c47d9be3a84d06d` |
| `app/services/registro/llm/evaluacion.py` | `d15f7b9b29748025ef3febfe6a722225b004ea15` |
| `app/services/registro/llm/filtro.py` | `df029d7b4ce8db4b8a6232490ee44987a5da323b` |
| `app/services/registro/llm/mensaje.py` | `30cae0484ff04780ca7231bd92552278d5965141` |
| `app/services/registro/llm/prompt_v7_haiku_arranque.py` | `4fb67e1374522dfb50e2e5c1781018285c7b7a61` |
| `app/services/registro/llm/tarjeta.py` | `3d9fa7b6d5946e577296541ef1c8415b16f8fa6d` |
| `datos/tarjetas_registros/__init__.py` | `c54b9eba05ce43758a3830aafbe14c855a2979a0` |
| `datos/tarjetas_registros/b1_1.py` | `4c667f6927a0f97cab4243cebbf1c05f9254d780` |
| `datos/tarjetas_registros/b1_3.py` | `af8b6a297a48ad49dbe4644ec4ce5af2e4a43c0c` |
| `datos/tarjetas_registros/b1_6.py` | `be50a9a7de5358ac3cbc4c6976d0431e7faaece8` |
| `datos/tarjetas_registros/b1_7.py` | `2f5f55744d6446be6d68c4f7dd03e9411f63b7fc` |
| `datos/tarjetas_registros/b2_3.py` | `d18c37e9d0e0badad05634620411c8648c99ed26` |
| `datos/tarjetas_registros/b2_4.py` | `202d6b76bb82f5336f43a68819a9262e2677b829` |
| `datos/tarjetas_registros/b3_4.py` | `bbe5f915eec87171f1cbfe9dceeab1d1c14522a4` |
| `datos/tarjetas_registros/b4_1.py` | `5706582e4815012016157674793f4a63e52f36f5` |
| `datos/tarjetas_registros/b4_2.py` | `b729677f484de674a6f54404d7049d6efe0d374a` |
| `datos/tarjetas_registros/b4_5.py` | `cb3e04f5c842e899c7e9617ce748b516726c6f2c` |
| `datos/tarjetas_registros/b5_1.py` | `2bfb38f53027dbf920fb577c9aa32c22e75b5f90` |
| `datos/tarjetas_registros/b5_3.py` | `0157157be75a8ca0bbd9aae3a0c23255c379cac6` |
| `tests/llm/casos/b1-1-tarjetas-v7.1.json` | `208aa501278d240428e2b4bedeab8cd57f69c3c4` |
| `tests/llm/casos/b1-3-tarjetas-v7.2c.json` | `e783dbd4c1632cc94e53c9cad8bbdb95b091402a` |
| `tests/llm/casos/b1-3-tarjetas.json` | `873aecf80b9e9044fe558e254b29d1dce1281227` |
| `tests/llm/casos/b1-6-tarjetas-v7.3.json` | `9a20cc2b37257419ae3be322d6bbd62da299b79b` |
| `tests/llm/casos/b1-7-tarjetas-v7.4.json` | `3ab41f53496f8be8ea77cecc789b22e8a857624d` |
| `tests/llm/casos/b1-7-tarjetas-v7.4b.json` | `bbaa2b344e00cc3a697d4156e00ce6664ee915e9` |
| `tests/llm/casos/b2-3-tarjetas-v7.5b.json` | `0af211bb06ed5054250aa9667d59dc561db87b81` |
| `tests/llm/casos/b2-3-tarjetas-v7.5c.json` | `9662207aa71daf93596cb7b64b5b252a9985389a` |
| `tests/llm/casos/b2-4-tarjetas-v7.6.json` | `7e8d81fc5cbdd76debba00be5e216653e3c2d6ff` |
| `tests/llm/casos/b2-4-tarjetas-v7.6b.json` | `fc58c3d5b97effb9cb6ecc2e2753e78f589c4cbb` |
| `tests/llm/casos/b2-4-tarjetas-v7.6c.json` | `7246907cd78565cc02644fd57930954048556430` |
| `tests/llm/casos/b3-4-tarjetas-v7.7.json` | `157063c0d2ac4ac3be9a1bbae6712c716e368a22` |
| `tests/llm/casos/b3-4-tarjetas-v7.7c.json` | `3248eb4ff438ab7581dba25f5cdfc2a325469b24` |
| `tests/llm/casos/b4-1-tarjetas-v7.8.json` | `4a2a92f2f1f499ead290e3bef85e0babd335a6c4` |
| `tests/llm/casos/b4-1-tarjetas-v7.8e.json` | `f73e83e281c6bbc445f5606e5673dc9bffcc7ecd` |
| `tests/llm/casos/b4-1-tarjetas-v7.8f.json` | `402d3dd53fcd799da90984589def930b9a775acd` |
| `tests/llm/casos/b4-1-tarjetas-v7.8g.json` | `34a7327a6e05bc630b809d04681a242253d9806c` |
| `tests/llm/casos/b4-2-tarjetas-v7.9.json` | `3354a2321278c30f1b9939a9e3a6c5ca74c1ec58` |
| `tests/llm/casos/b4-5-tarjetas-v7.10.json` | `c4dc1aaec7a50555572fe6d5482c1d211f3e09c7` |
| `tests/llm/casos/b4-5-tarjetas-v7.10c.json` | `c985d347d58e341105af02a2d38c958810a3cfdb` |
| `tests/llm/casos/b5-1-tarjetas-v7.11.json` | `37f5203384a7f82d64a536d32e0e6c67c1bd8994` |
| `tests/llm/casos/b5-1-tarjetas-v7.11b.json` | `30020cda1557bb4599d05337e835c10b23e1f5a1` |
| `tests/llm/casos/b5-3-tarjetas-v7.12.json` | `8fea6f4162e49aaf4d7dbef3a061572e6ec0b27b` |
| `tests/llm/casos/b5-3-tarjetas-v7.12b.json` | `b4aed567d20d668dc63a421ddc7683481a09a694` |
| `tests/llm/casos/b5-3-tarjetas-v7.12c.json` | `87496bb8d5fc79af55567b711197650c2256d458` |

## 2. Resumen

- **Clasificación contra el esperado:** 67/68 (seguimiento: 67/68).
- **`sin_evaluar`:** ninguna. Errores del runner: 0.
- **Caídas del filtro, por regla:** mas_de_una_pregunta: 1.
- **Arranques del seguimiento:** pasó: 67, sin_arranque: 1.
- **Latencia** mediana / p95: 2278 / 5216 ms. Máximo de tokens de salida (con razonamiento): 1843.

## 3. Casos

| Caso | Grupo | Ítem | Opción | Texto | Esperado | Obtenido | ¿Coincide? |
|---|---|---|---|---|---|---|---|
| b1-1-tarjetas-v7.1#6 | seguimiento | b1-1-gustos |  | Jugar | general → final propio | general → conjunto propio → final propio | sí |
| b1-3-tarjetas#16 | seguimiento | b1-3-contraste | Chocan | Chocan | general → final propio | general → conjunto propio → final propio | sí |
| b1-3-tarjetas-v7.2c#16 | seguimiento | b1-3-contraste | Chocan | Chocamos bastante | general → conjunto propio → final propio | general → conjunto propio → final propio | sí |
| b1-3-tarjetas-v7.2c#20 | seguimiento | b1-3-voz | Mamá | Que tenga una carrera | general → conjunto general → final general | general → conjunto general → final general | sí |
| b1-6-tarjetas-v7.3#19 | seguimiento | b1-6-mito | Solo la universidad da futuro | Todos dicen eso | general → conjunto propio → final propio | general → conjunto propio → final propio | sí |
| b1-6-tarjetas-v7.3#20 | seguimiento | b1-6-mito | Si estudio lo que me gusta voy a ganar poco | Así me dijeron | general → conjunto general → final general | general → conjunto general → final general | sí |
| b1-7-tarjetas-v7.4#24 | seguimiento | b1-7-hito |  | Estudiando | general → conjunto propio → final propio | general → conjunto propio → final propio | sí |
| b1-7-tarjetas-v7.4b#25 | seguimiento | b1-7-freno |  | La familia | general → conjunto general → final general | general → conjunto general → final general | sí |
| b1-7-tarjetas-v7.4b#27 | seguimiento | b1-7-hito |  | Postulando | general → conjunto propio → final propio | general → conjunto propio → final propio | sí |
| b1-7-tarjetas-v7.4b#28 | seguimiento | b1-7-hito |  | En la academia | general → conjunto propio → final propio | general → conjunto propio → final propio | sí |
| b2-3-tarjetas-v7.5b#17 | seguimiento | b2-3-valores | Ingresos, Estabilidad, Aprender | Ingresos porque es importante | general → conjunto propio → final propio | general → conjunto propio → final propio | sí |
| b2-3-tarjetas-v7.5b#18 | seguimiento | b2-3-valores | Ingresos, Estabilidad, Reconocimiento | Mi familia siempre dice que eso es lo primero | general → conjunto general → final general | general → conjunto general → final general | sí |
| b2-3-tarjetas-v7.5c#26 | seguimiento | b2-3-valores | Estabilidad, Ingresos, Tiempo para la familia | Es lo que más pesa para mí | general → conjunto general → final general | general → conjunto general → final general | sí |
| b2-4-tarjetas-v7.6#26 | seguimiento | b2-4-bien | Ciencias, Matemática, Inglés | La verdad me gusta un montón | general → conjunto propio → final propio | general → conjunto propio → final propio | sí |
| b2-4-tarjetas-v7.6b#43 | seguimiento | b2-4-cruce | Sí, me gusta | Sí me gusta | general → conjunto propio → final propio | general → conjunto propio → final propio | sí |
| b2-4-tarjetas-v7.6c#44 | seguimiento | b2-4-cruce | No mucho | No me gusta | general → conjunto general o no_sabe → final general | general → conjunto no_sabe → final general | sí |
| b3-4-tarjetas-v7.7#27 | seguimiento | b3-4-necesito |  | La estabilidad | general → conjunto propio | general → conjunto propio → final propio | sí |
| b3-4-tarjetas-v7.7#28 | seguimiento | b3-4-necesito |  | El sueldo | general → conjunto general → final general | general → conjunto general → final general | sí |
| b3-4-tarjetas-v7.7#29 | seguimiento | b3-4-quien | Todavía no conozco a nadie | Alguien con experiencia | general → conjunto propio | general → conjunto propio → final propio | sí |
| b3-4-tarjetas-v7.7c#8 | seguimiento | b3-4-necesito |  | El sueldo | general → conjunto general → final general | general → conjunto general → final general | sí |
| b3-4-tarjetas-v7.7c#10 | seguimiento | b3-4-quien | Amigo/a | Porque es mi mejor amigo | general → conjunto propio | general → conjunto propio → final propio | sí |
| b3-4-tarjetas-v7.7c#9 | seguimiento | b3-4-necesito |  | Los turnos | general → conjunto general → final general | general → conjunto general → final general | sí |
| b4-1-tarjetas-v7.8f#9 | seguimiento | b4-1-respalda | Observar, preguntar y analizar para entender cómo funcionan las cosas (tu test de intereses) | Porque disfruto entender cómo funcionan las cosas | general → conjunto propio | general → conjunto propio → final propio | sí |
| b4-1-tarjetas-v7.8e#36 | seguimiento | b4-1-respalda | No quedarte tranquilo hasta resolver un problema (tu test de habilidades sociales) | No sé qué se hace | no_sabe → conjunto no_sabe → final no_sabe | no_sabe → conjunto no_sabe → final no_sabe | sí |
| b4-1-tarjetas-v7.8#37 | seguimiento | b4-1-respalda | Ingresos (lo que más valoras, 1.º) | Se gana bien | general → conjunto general → final general | general → conjunto general → final general | sí |
| b4-1-tarjetas-v7.8e#60 | seguimiento | b4-1-menos | Exponer (lo que te cuesta) | Me cuesta hablar en público | general → conjunto propio | general → conjunto propio → final propio | sí |
| b4-1-tarjetas-v7.8e#68 | seguimiento | b4-1-menos | Todo va con mi plan | Nada | general → conjunto general → final general | general → conjunto general → final general | sí |
| b4-1-tarjetas-v7.8e#37 | seguimiento | b4-1-respalda | Ingresos (lo que más valoras, 1.º) | Se gana bien | general → conjunto propio | general → conjunto propio → final propio | sí |
| b4-1-tarjetas-v7.8e#61 | seguimiento | b4-1-menos | Captas los estados de ánimo y los sentimientos de los demás (tu test de inteligencias) | Igual va | general → conjunto propio | general → conjunto general → final general | **no** |
| b4-1-tarjetas-v7.8e#62 | seguimiento | b4-1-menos | Inglés (lo que te cuesta) | Me cuesta el inglés | general → conjunto no_sabe → final general | general → conjunto no_sabe → final general | sí |
| b4-1-tarjetas-v7.8e#38 | seguimiento | b4-1-respalda | Defiendes tus derechos y dices lo que piensas sin ofender (tu test de habilidades sociales) | Mi papá es abogado y dice que tengo que ser abogada como él | general → conjunto propio | general → conjunto propio → final propio | sí |
| b4-1-tarjetas-v7.8g#2 | seguimiento | b4-1-respalda | Defiendes tus derechos y dices lo que piensas sin ofender (tu test de habilidades sociales) | Mi papá es abogado y dice que tengo que ser abogada como él | general → conjunto general → final general | general → conjunto general → final general | sí |
| b4-2-tarjetas-v7.9#30 | seguimiento | b4-2-estilo | Lo pienso con calma y comparo | Me metí al coro de un día para otro | general → conjunto propio | general → conjunto propio → final propio | sí |
| b4-2-tarjetas-v7.9#31 | seguimiento | b4-2-estilo | Lo pienso con calma y comparo | Me metí al coro de un día para otro | general → conjunto propio | general → conjunto propio → final propio | sí |
| b4-2-tarjetas-v7.9#32 | seguimiento | b4-2-estilo | Lo dejo para el último momento | Siempre es así conmigo | general → conjunto general → final general | general → conjunto general → final general | sí |
| b4-2-tarjetas-v7.9#33 | seguimiento | b4-2-estilo | Busco información antes | Ni idea, no recuerdo | no_sabe → conjunto no_sabe → final no_sabe | no_sabe → conjunto no_sabe → final no_sabe | sí |
| b4-2-tarjetas-v7.9#34 | seguimiento | b4-2-estilo | Termino haciendo lo que otros esperan | Los grandes deciden por mí | general → conjunto propio | general → conjunto propio → final propio | sí |
| b4-5-tarjetas-v7.10#30 | seguimiento | b4-5-moneda | También me gustaría | No extrañaría nada | general → conjunto propio | general → conjunto propio → final propio | sí |
| b4-5-tarjetas-v7.10#31 | seguimiento | b4-5-moneda | No sé qué sentí | No tengo idea, la verdad | no_sabe → conjunto propio | no_sabe → conjunto propio → final propio | sí |
| b4-5-tarjetas-v7.10#32 | seguimiento | b4-5-moneda | También me gustaría | Nada de nada | general → conjunto general → final general | general → conjunto general → final general | sí |
| b4-5-tarjetas-v7.10#33 | seguimiento | b4-5-moneda | Me desanimé | Me sentiría feo | general → conjunto propio | general → conjunto propio → final propio | sí |
| b4-5-tarjetas-v7.10#34 | seguimiento | b4-5-moneda | No sé qué sentí | No sé | no_sabe → conjunto no_sabe → final no_sabe | no_sabe → conjunto no_sabe → final no_sabe | sí |
| b4-5-tarjetas-v7.10c#4 | seguimiento | b4-5-moneda | Me desanimé | Ayudar a otros | general → conjunto propio | general → conjunto propio → final propio | sí |
| b5-1-tarjetas-v7.11#33 | seguimiento | b5-1-seguridad | Bastante seguro/a | Porque así lo siento | general → conjunto propio | general → conjunto propio → final propio | sí |
| b5-1-tarjetas-v7.11#34 | seguimiento | b5-1-seguridad | Poco seguro/a | Me dan nervios decidir | general → conjunto propio | general → conjunto propio → final propio | sí |
| b5-1-tarjetas-v7.11#35 | seguimiento | b5-1-seguridad | Poco seguro/a | Me da miedo elegir mal | general → conjunto general → final general | general → conjunto general → final general | sí |
| b5-1-tarjetas-v7.11#36 | seguimiento | b5-1-seguridad | Más o menos | No sé | no_sabe → conjunto no_sabe → final no_sabe | no_sabe → conjunto no_sabe → final no_sabe | sí |
| b5-1-tarjetas-v7.11#37 | seguimiento | b5-1-seguridad | Bastante seguro/a | Voy a esforzarme | fuera_de_tema → conjunto propio | fuera_de_tema → conjunto propio → final propio | sí |
| b5-1-tarjetas-v7.11b#19 | seguimiento | b5-1-seguridad | Bastante seguro/a | Voy a ver universidades | fuera_de_tema → conjunto propio | fuera_de_tema → conjunto propio → final propio | sí |
| b5-1-tarjetas-v7.11b#20 | seguimiento | b5-1-seguridad | Bastante seguro/a | Voy a ponerle ganas | fuera_de_tema → conjunto fuera_de_tema → final fuera_de_tema | fuera_de_tema → conjunto fuera_de_tema → final fuera_de_tema | sí |
| b5-1-tarjetas-v7.11b#21 | seguimiento | b5-1-seguridad | Poco seguro/a | Me dan nervios elegir | general → conjunto propio | general → conjunto propio → final propio | sí |
| b5-1-tarjetas-v7.11b#22 | seguimiento | b5-1-seguridad | Más o menos | Porque así lo siento | general → conjunto general → final general | general → conjunto general → final general | sí |
| b5-3-tarjetas-v7.12#52 | seguimiento | b5-3-cambio | Medicina (tu primera opción) | Ahora quiero cocina | general → conjunto propio | general → conjunto propio → final propio | sí |
| b5-3-tarjetas-v7.12#53 | seguimiento | b5-3-cambio | Aún no lo sé (la ruta que querías al terminar el colegio) | Ahora sí: un instituto | general → conjunto general → final general | general → conjunto general → final general | sí |
| b5-3-tarjetas-v7.12#54 | seguimiento | b5-3-cambio | Mis padres saben qué me conviene estudiar (una idea que habías escuchado o creído) | Ya no pienso así | general → conjunto propio | general → conjunto propio → final propio | sí |
| b5-3-tarjetas-v7.12#55 | seguimiento | b5-3-cambio | Lo veo todo igual | Sigo perdido | general → conjunto propio | general → conjunto propio → final propio | sí |
| b5-3-tarjetas-v7.12#56 | seguimiento | b5-3-cambio | Lo veo todo igual | Nada | general → conjunto general → final general | general → conjunto general → final general | sí |
| b5-3-tarjetas-v7.12#57 | seguimiento | b5-3-cambio | "Que no alcance la plata para la academia" (lo que dijiste que podía frenarte) | Voy a ahorrar | fuera_de_tema → conjunto fuera_de_tema | fuera_de_tema → conjunto fuera_de_tema → final fuera_de_tema | sí |
| b5-3-tarjetas-v7.12#58 | seguimiento | b5-3-cambio | "Ayudando a mi mamá en la chacra y con un negocio propio" (tu día a los 23) | No sé | no_sabe → conjunto no_sabe → final no_sabe | no_sabe → conjunto no_sabe → final no_sabe | sí |
| b5-3-tarjetas-v7.12#59 | seguimiento | b5-3-cambio | Ingeniería Civil (tu primera opción) | Ya no doy para eso | general → conjunto propio | general → conjunto propio → final propio | sí |
| b5-3-tarjetas-v7.12#111 | seguimiento | b5-3-cambio | Medicina (tu primera opción) | Ahora quiero cocina | general → conjunto propio | general → conjunto propio → final propio | sí |
| b5-3-tarjetas-v7.12b#14 | seguimiento | b5-3-cambio | La carrera decide toda mi vida (una idea que habías escuchado o creído) | Lo sigo viendo como antes | general → conjunto propio | general → conjunto propio → final propio | sí |
| b5-3-tarjetas-v7.12b#15 | seguimiento | b5-3-cambio | Educación Inicial (tu primera opción) | Ahora mecánica | general → conjunto general → final general | general → conjunto general → final general | sí |
| b5-3-tarjetas-v7.12c#6 | seguimiento | b5-3-cambio | Mis padres saben qué me conviene estudiar (una idea que habías escuchado o creído) | Ya no lo creo | general → conjunto propio | general → conjunto propio → final propio | sí |
| b5-3-tarjetas-v7.12c#7 | seguimiento | b5-3-cambio | "Trabajando en un hospital de Lima, en el turno de mañana" (tu día a los 23) | Ahora es distinto | general → conjunto propio | general → conjunto propio → final propio | sí |
| b5-3-tarjetas-v7.12c#8 | seguimiento | b5-3-cambio | Ingeniería Civil (tu primera opción) | Ya no me siento capaz | general → conjunto propio | general → conjunto propio → final propio | sí |
| b5-3-tarjetas-v7.12c#9 | seguimiento | b5-3-cambio | "Nada" (lo que dijiste que podía frenarte) | Cambió nomás | general → conjunto general → final general | general → conjunto general → final general | sí |
| b5-3-tarjetas-v7.12c#10 | seguimiento | b5-3-cambio | Educación Inicial (tu primera opción) | Me cambió la idea | general → conjunto general o no_sabe | general → conjunto no_sabe → final general | sí |

## 4. Arranques y línea del seguimiento

La línea se revisa a ojo: basta con que se entienda. «Propuesta» es la de Claude; la confirma el usuario.

| Caso | Primera respuesta | Repregunta mostrada | Segunda respuesta | Conjunto | Arranque | Chequeo | Línea armada | Citable | Propuesta |
|---|---|---|---|---|---|---|---|---|---|
| b1-1-tarjetas-v7.1#6 | Jugar | ¿A qué jugabas de niño, y con quién solías hacerlo? | A la pelota con mis primos en la calle | propio | Lo que hacía de niño con otros | pasó | Lo que hacía de niño con otros: A la pelota con mis primos en la calle | Jugar ¶ Lo que hacía de niño con otros: A la pelota con mis primos en la calle | sí |
| b1-3-tarjetas#16 | Chocan | ¿En qué punto chocan: la carrera, el lugar, el momento, el dinero? | En que ella quiere que me quede en Arequipa | propio | El punto en que chocamos | pasó | El punto en que chocamos: En que ella quiere que me quede en Arequipa | Chocan ¶ El punto en que chocamos: En que ella quiere que me quede en Arequipa | sí |
| b1-3-tarjetas-v7.2c#16 | Chocamos bastante | ¿En qué punto chocan: es lo de quedarte en Arequipa o irte a Lima, o algo más? | En que ella quiere que me quede en Arequipa | propio | El punto en que chocamos | pasó | El punto en que chocamos: En que ella quiere que me quede en Arequipa | Chocamos bastante ¶ El punto en que chocamos: En que ella quiere que me quede en Arequipa | sí |
| b1-3-tarjetas-v7.2c#20 | Que tenga una carrera | ¿Y qué carrera te ha dicho tu mamá que estudies, o en qué área cree que te iría bien? | Eso nomás dice, que tenga una carrera | general | La carrera o área que me sugiere mamá | pasó | La carrera o área que me sugiere mamá: Eso nomás dice, que tenga una carrera | Que tenga una carrera | sí |
| b1-6-tarjetas-v7.3#19 | Todos dicen eso | ¿Quién es ese 'todos' que lo dice más cerca de ti, en tu casa, el colegio o las redes? | En mi casa, sobre todo mi abuela | propio | La persona que lo dice más cerca de mí es | pasó | La persona que lo dice más cerca de mí: En mi casa, sobre todo mi abuela | Todos dicen eso ¶ La persona que lo dice más cerca de mí: En mi casa, sobre todo mi abuela | sí |
| b1-6-tarjetas-v7.3#20 | Así me dijeron | ¿Quién te lo dijo, o en qué lugar lo escuchas más cerca de ti? | Pero así dicen pues | general | Quien me lo dijo o dónde lo escucho | pasó | Quien me lo dijo o dónde lo escucho: Pero así dicen pues | Así me dijeron | sí |
| b1-7-tarjetas-v7.4#24 | Estudiando | ¿En qué estarías estudiando dentro de un año, y dónde lo harías? | Contabilidad en un instituto | propio | En qué estaría estudiando y dónde | pasó | En qué estaría estudiando y dónde: Contabilidad en un instituto | Estudiando ¶ En qué estaría estudiando y dónde: Contabilidad en un instituto | sí |
| b1-7-tarjetas-v7.4b#25 | La familia | ¿En qué parte de tu familia lo ves más complicado: que no alcance la plata, que te pidan trabajar o que cambien sus planes para ti? | Eso, la familia nomás | general | Lo que veo más complicado en mi familia | pasó | Lo que veo más complicado en mi familia: Eso, la familia nomás | La familia | sí |
| b1-7-tarjetas-v7.4b#27 | Postulando | ¿A qué estarías postulando dentro de un año, a una universidad, a un instituto o a algo distinto? | A alguna universidad, todavía no sé cuál | propio | A lo que estaría postulando dentro de un año | pasó | A lo que estaría postulando dentro de un año: A alguna universidad, todavía no sé cuál | Postulando ¶ A lo que estaría postulando dentro de un año: A alguna universidad, todavía no sé cuál | sí |
| b1-7-tarjetas-v7.4b#28 | En la academia | ¿A qué o para qué te estarías preparando en esa academia dentro de un año? | Para entrar a una universidad complicada | propio | A qué o para qué me estaría preparando | pasó | A qué o para qué me estaría preparando: Para entrar a una universidad complicada | En la academia ¶ A qué o para qué me estaría preparando: Para entrar a una universidad complicada | sí |
| b2-3-tarjetas-v7.5b#17 | Ingresos porque es importante | ¿Y a ti qué te daría tener ingresos? | Que me alcance para vivir solo y no pedirle a nadie | propio | Lo que me daría tener ingresos | pasó | Lo que me daría tener ingresos: Que me alcance para vivir solo y no pedirle a nadie | Ingresos porque es importante ¶ Lo que me daría tener ingresos: Que me alcance para vivir solo y no pedirle a nadie | sí |
| b2-3-tarjetas-v7.5b#18 | Mi familia siempre dice que eso es lo primero | ¿Qué piensas tú de que los ingresos vayan primero? | Así dicen en mi casa nomás | general | Lo que pienso de los ingresos primero | pasó | Lo que pienso de los ingresos primero: Así dicen en mi casa nomás | Mi familia siempre dice que eso es lo primero | sí |
| b2-3-tarjetas-v7.5c#26 | Es lo que más pesa para mí | ¿Y a ti qué te daría tener estabilidad en tu día a día? | Tranquilidad | general | Lo que me daría tener estabilidad | pasó | Lo que me daría tener estabilidad: Tranquilidad | Es lo que más pesa para mí | sí |
| b2-4-tarjetas-v7.6#26 | La verdad me gusta un montón | Que te guste ya cuenta. ¿Cómo notas que en Ciencias te sale bien? Puede ser una nota, un trabajo o algo que te dijeron. | Cuando hacemos experimentos en el laboratorio los entiendo antes que mis compañeros | propio | Lo que me hace notar que me va bien en Ciencias | pasó | Lo que me hace notar que me va bien en Ciencias: Cuando hacemos experimentos en el laboratorio los entiendo antes que mis compañeros | La verdad me gusta un montón ¶ Lo que me hace notar que me va bien en Ciencias: Cuando hacemos experimentos en el laboratorio los entiendo antes que mis compañeros | sí |
| b2-4-tarjetas-v7.6b#43 | Sí me gusta | ¿Qué parte de comunicación te gusta más: hablar, escribir o convencer a otros? | Cuando debatimos y logro que los demás cambien de opinión | propio | Lo que me gusta de comunicación es | pasó | Lo que me gusta de comunicación: Cuando debatimos y logro que los demás cambien de opinión | Sí me gusta ¶ Lo que me gusta de comunicación: Cuando debatimos y logro que los demás cambien de opinión | sí |
| b2-4-tarjetas-v7.6c#44 | No me gusta | ¿Qué parte de matemática no te gusta? Puede ser resolver problemas, las fórmulas o cómo te sientes cuando te toca hacerlo. | No sé, nomás | no_sabe | La parte de matemática que no me gusta | pasó | La parte de matemática que no me gusta: No sé, nomás | No me gusta | sí |
| b3-4-tarjetas-v7.7#27 | La estabilidad | ¿Qué tendría que ver en un trabajo para saber si te da estabilidad: si hay contrato, si llega fijo cada mes, o si depende de los turnos? | Que no te boten de un día para otro, que haya contrato | propio | Lo que tendría que ver en un trabajo | pasó | Lo que tendría que ver en un trabajo: Que no te boten de un día para otro, que haya contrato | La estabilidad ¶ Lo que tendría que ver en un trabajo: Que no te boten de un día para otro, que haya contrato | sí |
| b3-4-tarjetas-v7.7#28 | El sueldo | Sobre el sueldo, ¿qué querrías averiguar: si sube con los años, si es igual en tu región o si llega fijo cada mes? | Eso nomás, el sueldo | general | Lo que querría averiguar | pasó | Lo que querría averiguar: Eso nomás, el sueldo | El sueldo | sí |
| b3-4-tarjetas-v7.7#29 | Alguien con experiencia | ¿Qué tendría esa persona con experiencia para que te sirva: dónde trabaja, qué estudió o algo parecido a tu vida? | Alguien que trabaje en un hospital | propio | Lo que tendría esa persona que me sirva | pasó | Lo que tendría esa persona que me sirva: Alguien que trabaje en un hospital | Alguien con experiencia ¶ Lo que tendría esa persona que me sirva: Alguien que trabaje en un hospital | sí |
| b3-4-tarjetas-v7.7c#8 | El sueldo | Sobre el sueldo: ¿qué querrías averiguar, si sube con los años, si es igual en tu región o si llega fijo cada mes? | Eso nomás, el sueldo | general | Lo que querría averiguar | pasó | Lo que querría averiguar: Eso nomás, el sueldo | El sueldo | sí |
| b3-4-tarjetas-v7.7c#10 | Porque es mi mejor amigo | ¿Qué te hace pensar que tu mejor amigo podría contarte si hay que estudiar mucho: algo en lo que trabaja, algo que estudió o algo que vivió? | Su hermana estudia eso en la universidad y le cuenta cómo es | propio | Lo que me hace pensar que podría contarme | pasó | Lo que me hace pensar que podría contarme: Su hermana estudia eso en la universidad y le cuenta cómo es | Porque es mi mejor amigo ¶ Lo que me hace pensar que podría contarme: Su hermana estudia eso en la universidad y le cuenta cómo es | sí |
| b3-4-tarjetas-v7.7c#9 | Los turnos | Sobre los turnos, ¿qué querrías saber: si son rotativos, si hay turnos de noche o si te dejan días libres para tu familia? | Eso, los turnos nomás | general | Lo que querría saber de ese tema | pasó | Lo que querría saber de ese tema: Eso, los turnos nomás | Los turnos | sí |
| b4-1-tarjetas-v7.8f#9 | Porque disfruto entender cómo funcionan las cosas | ¿En qué momento de Ingeniería de Sistemas te tocaría entender cómo funciona algo: al diseñar un software, al analizar un problema, al revisar un sistema? | Programar es buscar por qué falla un código hasta encontrar el error | propio | El momento en que entiendo cómo funciona algo | pasó | El momento en que entiendo cómo funciona algo: Programar es buscar por qué falla un código hasta encontrar el error | Porque disfruto entender cómo funcionan las cosas ¶ El momento en que entiendo cómo funciona algo: Programar es buscar por qué falla un código hasta encontrar el error | sí |
| b4-1-tarjetas-v7.8e#36 | No sé qué se hace | Imagina a alguien que ya trabaja en Medicina Veterinaria: ¿qué hace en un día normal que se parezca a lo que marcaste? | Sigo sin saber, nunca he visto a uno trabajar | no_sabe | — | cayó: `sin_arranque` | Sigo sin saber, nunca he visto a uno trabajar | — (nada) | sí |
| b4-1-tarjetas-v7.8#37 | Se gana bien | ¿Qué de ese trabajo en Ingeniería de Minas daría ese ingreso: el contrato, cómo se paga, los turnos o el horario? | Porque pagan bien pues | general | Lo que de ese trabajo daría ese ingreso | pasó | Lo que de ese trabajo daría ese ingreso: Porque pagan bien pues | Se gana bien | sí |
| b4-1-tarjetas-v7.8e#60 | Me cuesta hablar en público | ¿En qué parte de Psicología se notaría más exponer: una clase, una presentación de caso o una sesión con un paciente? | En las terapias de grupo tendría que hablar delante de varias personas | propio | Donde más se me notaría exponer en Psicología | pasó | Donde más se me notaría exponer en Psicología: En las terapias de grupo tendría que hablar delante de varias personas | Me cuesta hablar en público ¶ Donde más se me notaría exponer en Psicología: En las terapias de grupo tendría que hablar delante de varias personas | sí |
| b4-1-tarjetas-v7.8e#68 | Nada | ¿Qué curso, tarea o momento de Ingeniería de Sistemas te pediría más: los proyectos de programación, las matemáticas o las prácticas en empresa? | Nada, de verdad | general | Lo que me pediría más | pasó | Lo que me pediría más: Nada, de verdad | Nada | sí |
| b4-1-tarjetas-v7.8e#37 | Se gana bien | ¿Qué de ese trabajo en Ingeniería de Minas te haría ganar bien: el contrato, el horario o cómo se paga? | Porque en las minas pagan más por trabajar en altura y por turnos | propio | Lo que de ese trabajo te hace ganar bien | pasó | Lo que de ese trabajo te hace ganar bien: Porque en las minas pagan más por trabajar en altura y por turnos | Se gana bien ¶ Lo que de ese trabajo te hace ganar bien: Porque en las minas pagan más por trabajar en altura y por turnos | **no**: «te hace ganar» queda en segunda persona; se entiende, pero no se lee como lo dice el estudiante |
| b4-1-tarjetas-v7.8e#61 | Igual va | ¿Qué parte de Psicología va menos con captar lo que sienten los demás: los casos, las prácticas o los trabajos en equipo? | Bueno, a veces me afecta mucho lo que sienten los demás y en terapia escucharía problemas todo el día | general | Lo que va menos con captar sentimientos | pasó | Lo que va menos con captar sentimientos: Bueno, a veces me afecta mucho lo que sienten los demás y en terapia escucharía problemas todo el día | Igual va | sí |
| b4-1-tarjetas-v7.8e#62 | Me cuesta el inglés | ¿En qué parte de Gastronomía se notaría más el inglés, en una clase, en una pasantía o en una cocina internacional? | No sé si en cocina se usa | no_sabe | La parte de Gastronomía donde más se notaría el inglés | pasó | La parte de Gastronomía donde más se notaría el inglés: No sé si en cocina se usa | Me cuesta el inglés | sí |
| b4-1-tarjetas-v7.8e#38 | Mi papá es abogado y dice que tengo que ser abogada como él | Y tú, ¿en qué momento de Derecho te tocaría defender tus derechos o decir lo que piensas: en un juicio, en clase, en una negociación? | Para defender a la gente que meten presa sin haber hecho nada | propio | Cuándo en Derecho defendería mis derechos | pasó | Cuándo en Derecho defendería mis derechos: Para defender a la gente que meten presa sin haber hecho nada | Mi papá es abogado y dice que tengo que ser abogada como él ¶ Cuándo en Derecho defendería mis derechos: Para defender a la gente que meten presa sin haber hecho nada | sí |
| b4-1-tarjetas-v7.8g#2 | Mi papá es abogado y dice que tengo que ser abogada como él | Y tú, ¿en qué momento de Derecho te tocaría defender algo o decir lo que piensas: en un juicio, en una negociación? | Hacer contratos y esas cosas | general | Me tocaría defender o decir lo que pienso | pasó | Me tocaría defender o decir lo que pienso: Hacer contratos y esas cosas | Mi papá es abogado y dice que tengo que ser abogada como él | sí |
| b4-2-tarjetas-v7.9#30 | Me metí al coro de un día para otro | En lo del coro, ¿cómo lo decidiste: buscaste algo o hablaste con alguien antes, o fue de otra forma? | No, esa vez fue rápido, pero casi siempre sí lo pienso bastante | propio | Lo que hice para decidirlo fue | pasó | Lo que hice para decidirlo: No, esa vez fue rápido, pero casi siempre sí lo pienso bastante | Me metí al coro de un día para otro ¶ Lo que hice para decidirlo: No, esa vez fue rápido, pero casi siempre sí lo pienso bastante | sí |
| b4-2-tarjetas-v7.9#31 | Me metí al coro de un día para otro | Cuando entraste al coro, ¿cómo lo decidiste: lo pensaste con calma y comparaste, o fue de otra forma? | Bueno, antes de decir que sí revisé si los ensayos chocaban con mis clases | propio | Cómo decidí entrar al coro | pasó | Cómo decidí entrar al coro: Bueno, antes de decir que sí revisé si los ensayos chocaban con mis clases | Me metí al coro de un día para otro ¶ Cómo decidí entrar al coro: Bueno, antes de decir que sí revisé si los ensayos chocaban con mis clases | sí |
| b4-2-tarjetas-v7.9#32 | Siempre es así conmigo | Piensa en una vez concreta: ¿qué tenías que decidir y qué hiciste para que se notara que lo dejas para el último momento? | Es que siempre soy así, para todo | general | Lo que me pasó al decidir fue | pasó | Lo que me pasó al decidir: Es que siempre soy así, para todo | Siempre es así conmigo | sí |
| b4-2-tarjetas-v7.9#33 | Ni idea, no recuerdo | Puede ser algo pequeño: elegir un curso, un deporte, qué hacer en vacaciones o dejar algo. ¿Cómo lo decidiste? | De verdad no se me ocurre ninguna | no_sabe | Lo que me hizo decidir así | pasó | Lo que me hizo decidir así: De verdad no se me ocurre ninguna | — (nada) | sí |
| b4-2-tarjetas-v7.9#34 | Los grandes deciden por mí | Piensa en una vez concreta: ¿qué tenías que decidir y qué hiciste al final, aunque otros opinaran? | Cuando eligieron mi colegio no me preguntaron y yo no dije nada | propio | Lo que tenía que decidir y lo que hice | pasó | Lo que tenía que decidir y lo que hice: Cuando eligieron mi colegio no me preguntaron y yo no dije nada | Los grandes deciden por mí ¶ Lo que tenía que decidir y lo que hice: Cuando eligieron mi colegio no me preguntaron y yo no dije nada | sí |
| b4-5-tarjetas-v7.10#30 | No extrañaría nada | ¿Por qué crees que no te haría falta nada de Educación Inicial? | Porque las dos tienen que ver con niños y eso es lo que quiero | propio | Por qué no me haría falta nada | pasó | Por qué no me haría falta nada: Porque las dos tienen que ver con niños y eso es lo que quiero | No extrañaría nada ¶ Por qué no me haría falta nada: Porque las dos tienen que ver con niños y eso es lo que quiero | sí |
| b4-5-tarjetas-v7.10#31 | No tengo idea, la verdad | Imagina tu primer año en Economía. ¿Hay algo de Ingeniería Industrial que te gustaría estar haciendo? | Creo que ninguna me convence mucho | propio | Lo que me gustaría hacer de Ingeniería Industrial | pasó | Lo que me gustaría hacer de Ingeniería Industrial: Creo que ninguna me convence mucho | Lo que me gustaría hacer de Ingeniería Industrial: Creo que ninguna me convence mucho | sí |
| b4-5-tarjetas-v7.10#32 | Nada de nada | ¿Por qué crees que no te haría falta nada de Marketing? | No sé, nada nomás | general | Por qué no me haría falta nada | pasó | Por qué no me haría falta nada: No sé, nada nomás | Nada de nada | sí |
| b4-5-tarjetas-v7.10#33 | Me sentiría feo | ¿Qué cosa de Medicina te haría falta si estudiaras Biología? | Operar; eso es lo que más quiero hacer | propio | Lo que me haría falta de Medicina | pasó | Lo que me haría falta de Medicina: Operar; eso es lo que más quiero hacer | Me sentiría feo ¶ Lo que me haría falta de Medicina: Operar; eso es lo que más quiero hacer | sí |
| b4-5-tarjetas-v7.10#34 | No sé | Imagina tu primer año en Administración. ¿Hay algo de Contabilidad que te gustaría estar haciendo? | Sigo sin saber, de verdad | no_sabe | Lo que me haría falta de Contabilidad | pasó | Lo que me haría falta de Contabilidad: Sigo sin saber, de verdad | — (nada) | sí |
| b4-5-tarjetas-v7.10c#4 | Ayudar a otros | Dijiste ayudar a otros: ¿qué de Enfermería te lo daría? | Atender a los pacientes en la posta | propio | Lo que me haría falta de Enfermería | pasó | Lo que me haría falta de Enfermería: Atender a los pacientes en la posta | Ayudar a otros ¶ Lo que me haría falta de Enfermería: Atender a los pacientes en la posta | sí |
| b5-1-tarjetas-v7.11#33 | Porque así lo siento | ¿Qué te da seguridad en tu proyecto, o qué te la quita? Puede ser algo que ya tienes a favor o algo que sientes que te falta. | Porque mi mamá ya me dijo que me paga la academia | propio | Lo que me da o me quita seguridad | pasó | Lo que me da o me quita seguridad: Porque mi mamá ya me dijo que me paga la academia | Porque así lo siento ¶ Lo que me da o me quita seguridad: Porque mi mamá ya me dijo que me paga la academia | sí |
| b5-1-tarjetas-v7.11#34 | Me dan nervios decidir | ¿Qué te da seguridad en tu proyecto, o qué te la quita? Puede ser algo que ya tienes a favor o algo que sientes que te falta. | Creo que lo de la academia, no sé si entro al turno que quiero | propio | Lo que me da o me quita seguridad | pasó | Lo que me da o me quita seguridad: Creo que lo de la academia, no sé si entro al turno que quiero | Me dan nervios decidir ¶ Lo que me da o me quita seguridad: Creo que lo de la academia, no sé si entro al turno que quiero | sí |
| b5-1-tarjetas-v7.11#35 | Me da miedo elegir mal | ¿Qué te da seguridad en tu proyecto, o qué te la quita? Puede ser algo que ya tienes a favor o algo que sientes que te falta. | Todo me da nervios | general | Lo que me da seguridad o me la quita | pasó | Lo que me da seguridad o me la quita: Todo me da nervios | Me da miedo elegir mal | sí |
| b5-1-tarjetas-v7.11#36 | No sé | Mira tu proyecto: ¿hay algo que ya tengas a favor, o algo que sientas que te falta? | Sigo sin saber | no_sabe | Lo que me da o me quita seguridad | pasó | Lo que me da o me quita seguridad: Sigo sin saber | — (nada) | sí |
| b5-1-tarjetas-v7.11#37 | Voy a esforzarme | Piensa en cómo te sientes hoy con tu proyecto: ¿qué te da seguridad, o qué te la quita? | Que mi primo ya ingresó y me presta sus libros | propio | Lo que me da o me quita seguridad | pasó | Lo que me da o me quita seguridad: Que mi primo ya ingresó y me presta sus libros | Lo que me da o me quita seguridad: Que mi primo ya ingresó y me presta sus libros | sí |
| b5-1-tarjetas-v7.11b#19 | Voy a ver universidades | Piensa en cómo te sientes hoy con tu proyecto: ¿qué te da seguridad, o qué te la quita? | Es que no sé todavía dónde enseñan Derecho y eso me hace dudar | propio | Lo que me da o me quita seguridad | pasó | Lo que me da o me quita seguridad: Es que no sé todavía dónde enseñan Derecho y eso me hace dudar | Lo que me da o me quita seguridad: Es que no sé todavía dónde enseñan Derecho y eso me hace dudar | sí |
| b5-1-tarjetas-v7.11b#20 | Voy a ponerle ganas | Piensa en cómo te sientes hoy con tu proyecto: ¿qué te da seguridad, o qué te la quita? | Voy a estudiar todos los días | fuera_de_tema | Lo que me da o me quita seguridad | pasó | Lo que me da o me quita seguridad: Voy a estudiar todos los días | — (nada) | sí |
| b5-1-tarjetas-v7.11b#21 | Me dan nervios elegir | ¿Qué te da seguridad en tu proyecto, o qué te la quita? Puede ser algo que ya tienes a favor o algo que sientes que te falta. | Que no sé si a mis papás les alcanza | propio | Lo que me da o me quita seguridad | pasó | Lo que me da o me quita seguridad: Que no sé si a mis papás les alcanza | Me dan nervios elegir ¶ Lo que me da o me quita seguridad: Que no sé si a mis papás les alcanza | sí |
| b5-1-tarjetas-v7.11b#22 | Porque así lo siento | ¿Qué te da seguridad en tu proyecto, o qué te la quita? Puede ser algo que ya tienes a favor o algo que sientes que te falta. | Bien nomás, sin drama | general | Lo que me da o me quita seguridad | pasó | Lo que me da o me quita seguridad: Bien nomás, sin drama | Porque así lo siento | sí |
| b5-3-tarjetas-v7.12#52 | Ahora quiero cocina | Hoy quieres cocina. ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. | Es que en la feria hice un plato con un chef y me encantó | propio | Lo que me hizo verlo distinto | pasó | Lo que me hizo verlo distinto: Es que en la feria hice un plato con un chef y me encantó | Ahora quiero cocina ¶ Lo que me hizo verlo distinto: Es que en la feria hice un plato con un chef y me encantó | sí |
| b5-3-tarjetas-v7.12#53 | Ahora sí: un instituto | Hoy piensas en un instituto. ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. | Porque sí, me gusta más | general | Lo que me hizo verlo distinto | pasó | Lo que me hizo verlo distinto: Porque sí, me gusta más | Ahora sí: un instituto | sí |
| b5-3-tarjetas-v7.12#54 | Ya no pienso así | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. | Mi hermana estudió lo que mis papás querían y lo dejó | propio | Lo que me hizo verlo distinto | pasó | Lo que me hizo verlo distinto: Mi hermana estudió lo que mis papás querían y lo dejó | Ya no pienso así ¶ Lo que me hizo verlo distinto: Mi hermana estudió lo que mis papás querían y lo dejó | sí |
| b5-3-tarjetas-v7.12#55 | Sigo perdido | ¿Qué crees que hizo que sigas igual? | Creo que no me tomé en serio las actividades | propio | Lo que creo que hizo que siga igual | pasó | Lo que creo que hizo que siga igual: Creo que no me tomé en serio las actividades | Sigo perdido ¶ Lo que creo que hizo que siga igual: Creo que no me tomé en serio las actividades | sí |
| b5-3-tarjetas-v7.12#56 | Nada | ¿Qué viste o supiste en este tiempo que te lo confirmó? Si nada cambió, cuéntame por qué crees que fue así. | Nada pues | general | Lo que me confirma o no lo que ya pensaba | pasó | Lo que me confirma o no lo que ya pensaba: Nada pues | Nada | sí |
| b5-3-tarjetas-v7.12#57 | Voy a ahorrar | Piensa en lo que marcaste: ¿qué viste, supiste o te pasó que te hizo verlo distinto? | Voy a juntar plata en el verano | fuera_de_tema | Lo que me hizo verlo distinto | pasó | Lo que me hizo verlo distinto: Voy a juntar plata en el verano | — (nada) | sí |
| b5-3-tarjetas-v7.12#58 | No sé | Mira lo que marcaste: ¿recuerdas algo que viste, supiste o te pasó que te hizo verlo distinto? | No sé, de verdad | no_sabe | Lo que me hizo verlo distinto | pasó | Lo que me hizo verlo distinto: No sé, de verdad | — (nada) | sí |
| b5-3-tarjetas-v7.12#59 | Ya no doy para eso | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. | Es que jalé mate dos bimestres este año | propio | Cuando empecé a verlo distinto, lo que pasó | pasó | Cuando empecé a verlo distinto, lo que pasó: Es que jalé mate dos bimestres este año | Ya no doy para eso ¶ Cuando empecé a verlo distinto, lo que pasó: Es que jalé mate dos bimestres este año | sí |
| b5-3-tarjetas-v7.12#111 | Ahora quiero cocina | Hoy quieres cocina. ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. | Es que en la feria hice un plato con un chef y me encantó | propio | Lo que me hizo verlo distinto | pasó | Lo que me hizo verlo distinto: Es que en la feria hice un plato con un chef y me encantó | Ahora quiero cocina ¶ Lo que me hizo verlo distinto: Es que en la feria hice un plato con un chef y me encantó | sí |
| b5-3-tarjetas-v7.12b#14 | Lo sigo viendo como antes | ¿Qué crees que hizo que siga igual? | Porque mi hermano estudió Contabilidad y hasta ahora trabaja en eso, no pudo cambiar | propio | Lo que me hizo seguir igual | pasó | Lo que me hizo seguir igual: Porque mi hermano estudió Contabilidad y hasta ahora trabaja en eso, no pudo cambiar | Lo sigo viendo como antes ¶ Lo que me hizo seguir igual: Porque mi hermano estudió Contabilidad y hasta ahora trabaja en eso, no pudo cambiar | sí |
| b5-3-tarjetas-v7.12b#15 | Ahora mecánica | Hoy piensas en mecánica. ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. | Me gusta nomás | general | Lo que me hizo verlo distinto | pasó | Lo que me hizo verlo distinto: Me gusta nomás | Ahora mecánica | sí |
| b5-3-tarjetas-v7.12c#6 | Ya no lo creo | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. | Cuando mi hermana dejó la carrera que le escogieron | propio | Cuándo empecé a verlo distinto | pasó | Cuándo empecé a verlo distinto: Cuando mi hermana dejó la carrera que le escogieron | Ya no lo creo ¶ Cuándo empecé a verlo distinto: Cuando mi hermana dejó la carrera que le escogieron | sí |
| b5-3-tarjetas-v7.12c#7 | Ahora es distinto | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. | Desde que entrevisté a la enfermera y me contó de los turnos de noche | propio | Lo que me hizo verlo distinto | pasó | Lo que me hizo verlo distinto: Desde que entrevisté a la enfermera y me contó de los turnos de noche | Ahora es distinto ¶ Lo que me hizo verlo distinto: Desde que entrevisté a la enfermera y me contó de los turnos de noche | sí |
| b5-3-tarjetas-v7.12c#8 | Ya no me siento capaz | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. | Desde el simulacro, saqué muy bajo en mate | propio | Lo que me hizo empezar a verlo distinto | pasó | Lo que me hizo empezar a verlo distinto: Desde el simulacro, saqué muy bajo en mate | Ya no me siento capaz ¶ Lo que me hizo empezar a verlo distinto: Desde el simulacro, saqué muy bajo en mate | sí |
| b5-3-tarjetas-v7.12c#9 | Cambió nomás | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. | Porque sí | general | Lo que me hizo empezar a verlo distinto | pasó | Lo que me hizo empezar a verlo distinto: Porque sí | Cambió nomás | sí |
| b5-3-tarjetas-v7.12c#10 | Me cambió la idea | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. | No me acuerdo bien, fue de a pocos | no_sabe | Cuándo empecé a verlo distinto y qué pasó | pasó | Cuándo empecé a verlo distinto y qué pasó: No me acuerdo bien, fue de a pocos | Me cambió la idea | sí |

## 5. Repreguntas

Primera respuesta: la repregunta mostrada; seguimiento: la pista. Cruda → mostrada («=» si es la misma).

| Caso | Rep. | Turno | Tipo | Repregunta | Forma | Filtro |
|---|---|---|---|---|---|---|
| b1-1-tarjetas-v7.1#6 | 1 | primera | general | ¿A qué jugabas de niño, y con quién solías hacerlo? → = | redactada | — |
| b1-3-tarjetas#16 | 1 | primera | general | ¿En qué punto chocan: la carrera, el lugar, el momento o el dinero? Por lo que veo, quizá sea el lugar, Arequipa o Lima, ¿o es otra cosa? → ¿En qué punto chocan: la carrera, el lugar, el momento, el dinero? | base tal cual | mas_de_una_pregunta |
| b1-3-tarjetas-v7.2c#16 | 1 | primera | general | ¿En qué punto chocan: es lo de quedarte en Arequipa o irte a Lima, o algo más? → = | redactada | — |
| b1-3-tarjetas-v7.2c#20 | 1 | primera | general | ¿Y qué carrera te ha dicho tu mamá que estudies, o en qué área cree que te iría bien? → = | redactada | — |
| b1-3-tarjetas-v7.2c#20 | 1 | seguimiento | general | Piensa en la última vez que hablaron del futuro. ¿Qué dijo, aunque sea de pasada? → = | redactada | — |
| b1-6-tarjetas-v7.3#19 | 1 | primera | general | ¿Quién es ese 'todos' que lo dice más cerca de ti, en tu casa, el colegio o las redes? → = | redactada | — |
| b1-6-tarjetas-v7.3#20 | 1 | primera | general | ¿Quién te lo dijo, o en qué lugar lo escuchas más cerca de ti? → = | redactada | — |
| b1-6-tarjetas-v7.3#20 | 1 | seguimiento | general | ¿En qué lugar de tu día a día se repite más esa idea: en tu casa, en el colegio o entre tus amigos? → = | redactada | — |
| b1-7-tarjetas-v7.4#24 | 1 | primera | general | ¿En qué estarías estudiando dentro de un año, y dónde lo harías? → = | redactada | — |
| b1-7-tarjetas-v7.4b#25 | 1 | primera | general | ¿En qué parte de tu familia lo ves más complicado: que no alcance la plata, que te pidan trabajar o que cambien sus planes para ti? → = | redactada | — |
| b1-7-tarjetas-v7.4b#25 | 1 | seguimiento | general | ¿Y fuera de la familia, hay algo del país o de los estudios que podría complicarte el camino? → = | redactada | — |
| b1-7-tarjetas-v7.4b#27 | 1 | primera | general | ¿A qué estarías postulando dentro de un año, a una universidad, a un instituto o a algo distinto? → = | redactada | — |
| b1-7-tarjetas-v7.4b#28 | 1 | primera | general | ¿A qué o para qué te estarías preparando en esa academia dentro de un año? → = | redactada | — |
| b2-3-tarjetas-v7.5b#17 | 1 | primera | general | ¿Y a ti qué te daría tener ingresos? → = | redactada | — |
| b2-3-tarjetas-v7.5b#18 | 1 | primera | general | ¿Qué piensas tú de que los ingresos vayan primero? → = | redactada | — |
| b2-3-tarjetas-v7.5b#18 | 1 | seguimiento | general | ¿Y a ti qué te daría que los ingresos vayan primero? → = | redactada | — |
| b2-3-tarjetas-v7.5c#26 | 1 | primera | general | ¿Y a ti qué te daría tener estabilidad en tu día a día? → = | redactada | — |
| b2-3-tarjetas-v7.5c#26 | 1 | seguimiento | general | ¿Tranquilidad frente a qué te gustaría dejar de preocuparte? → = | redactada | — |
| b2-4-tarjetas-v7.6#26 | 1 | primera | general | Que te guste ya cuenta. ¿Cómo notas que en Ciencias te sale bien? Puede ser una nota, un trabajo o algo que te dijeron. → = | redactada | — |
| b2-4-tarjetas-v7.6b#43 | 1 | primera | general | ¿Qué parte de comunicación te gusta más: hablar, escribir o convencer a otros? → = | redactada | — |
| b2-4-tarjetas-v7.6c#44 | 1 | primera | general | ¿Qué parte de matemática no te gusta? Puede ser resolver problemas, las fórmulas o cómo te sientes cuando te toca hacerlo. → = | redactada | — |
| b2-4-tarjetas-v7.6c#44 | 1 | seguimiento | no_sabe | Piensa en la última vez que lo hiciste: ¿qué parte disfrutaste o cuál te aburrió? → = | redactada | — |
| b3-4-tarjetas-v7.7#27 | 1 | primera | general | ¿Qué tendría que ver en un trabajo para saber si te da estabilidad: si hay contrato, si llega fijo cada mes, o si depende de los turnos? → = | redactada | — |
| b3-4-tarjetas-v7.7#28 | 1 | primera | general | Sobre el sueldo, ¿qué querrías averiguar: si sube con los años, si es igual en tu región o si llega fijo cada mes? → = | redactada | — |
| b3-4-tarjetas-v7.7#28 | 1 | seguimiento | general | Imagina que ya trabajas en algo que te gusta: ¿qué querrías que fuera de otra forma, el horario, el sueldo o con quién trabajas? → = | redactada | — |
| b3-4-tarjetas-v7.7#29 | 1 | primera | general | ¿Qué tendría esa persona con experiencia para que te sirva: dónde trabaja, qué estudió o algo parecido a tu vida? → = | redactada | — |
| b3-4-tarjetas-v7.7c#8 | 1 | primera | general | Sobre el sueldo: ¿qué querrías averiguar, si sube con los años, si es igual en tu región o si llega fijo cada mes? → = | redactada | — |
| b3-4-tarjetas-v7.7c#8 | 1 | seguimiento | general | ¿Qué querrías que fuera distinto en ese trabajo: el horario, el sueldo o con quién trabajas? → = | redactada | — |
| b3-4-tarjetas-v7.7c#10 | 1 | primera | general | ¿Qué te hace pensar que tu mejor amigo podría contarte si hay que estudiar mucho: algo en lo que trabaja, algo que estudió o algo que vivió? → = | redactada | — |
| b3-4-tarjetas-v7.7c#9 | 1 | primera | general | Sobre los turnos, ¿qué querrías saber: si son rotativos, si hay turnos de noche o si te dejan días libres para tu familia? → = | redactada | — |
| b3-4-tarjetas-v7.7c#9 | 1 | seguimiento | general | ¿Qué querrías que fuera de una forma y no de otra: el horario, el sueldo o con quién trabajas? → = | redactada | — |
| b4-1-tarjetas-v7.8f#9 | 1 | primera | general | ¿En qué momento de Ingeniería de Sistemas te tocaría entender cómo funciona algo: al diseñar un software, al analizar un problema, al revisar un sistema? → = | redactada | — |
| b4-1-tarjetas-v7.8e#36 | 1 | primera | no_sabe | Imagina a alguien que ya trabaja en Medicina Veterinaria: ¿qué hace en un día normal que se parezca a lo que marcaste? → = | redactada | — |
| b4-1-tarjetas-v7.8e#36 | 1 | seguimiento | no_sabe | Imagina a alguien que ya trabaja en Medicina Veterinaria: ¿qué hace en un día normal que se parezca a lo que marcaste? → = | redactada | — |
| b4-1-tarjetas-v7.8#37 | 1 | primera | general | ¿Qué de ese trabajo en Ingeniería de Minas daría ese ingreso: el contrato, cómo se paga, los turnos o el horario? → = | redactada | — |
| b4-1-tarjetas-v7.8#37 | 1 | seguimiento | general | ¿Y tú cómo crees que ese ingreso sube con los años en Ingeniería de Minas: por ascensos, por proyectos o por la experiencia en campo? → = | redactada | — |
| b4-1-tarjetas-v7.8e#60 | 1 | primera | general | ¿En qué parte de Psicología se notaría más exponer: una clase, una presentación de caso o una sesión con un paciente? → = | redactada | — |
| b4-1-tarjetas-v7.8e#68 | 1 | primera | general | ¿Qué curso, tarea o momento de Ingeniería de Sistemas te pediría más: los proyectos de programación, las matemáticas o las prácticas en empresa? → = | redactada | — |
| b4-1-tarjetas-v7.8e#68 | 1 | seguimiento | general | Puede ser algo pequeño: un curso, una tarea o un momento de Ingeniería de Sistemas que te pediría más. ¿Cuál sería? → = | redactada | — |
| b4-1-tarjetas-v7.8e#37 | 1 | primera | general | ¿Qué de ese trabajo en Ingeniería de Minas te haría ganar bien: el contrato, el horario o cómo se paga? → = | redactada | — |
| b4-1-tarjetas-v7.8e#61 | 1 | primera | general | ¿Qué parte de Psicología va menos con captar lo que sienten los demás: los casos, las prácticas o los trabajos en equipo? → = | redactada | — |
| b4-1-tarjetas-v7.8e#61 | 1 | seguimiento | general | ¿Qué parte de Psicología pide dejar de lado lo que siente la otra persona: los horarios, las sesiones o la forma de atender? → = | redactada | — |
| b4-1-tarjetas-v7.8e#62 | 1 | primera | general | ¿En qué parte de Gastronomía se notaría más el inglés, en una clase, en una pasantía o en una cocina internacional? → = | redactada | — |
| b4-1-tarjetas-v7.8e#62 | 1 | seguimiento | no_sabe | Imagina tu primer año en Gastronomía: ¿qué momento crees que chocaría con lo que marcaste? → = | redactada | — |
| b4-1-tarjetas-v7.8e#38 | 1 | primera | general | Y tú, ¿en qué momento de Derecho te tocaría defender tus derechos o decir lo que piensas: en un juicio, en clase, en una negociación? → = | redactada | — |
| b4-1-tarjetas-v7.8g#2 | 1 | primera | general | Y tú, ¿en qué momento de Derecho te tocaría defender algo o decir lo que piensas: en un juicio, en una negociación? → = | redactada | — |
| b4-1-tarjetas-v7.8g#2 | 1 | seguimiento | general | Y tú, al hacer contratos, ¿qué parte del trabajo te pide decir lo que piensas sin ofender a la otra persona? → = | redactada | — |
| b4-2-tarjetas-v7.9#30 | 1 | primera | general | En lo del coro, ¿cómo lo decidiste: buscaste algo o hablaste con alguien antes, o fue de otra forma? → = | redactada | — |
| b4-2-tarjetas-v7.9#31 | 1 | primera | general | Cuando entraste al coro, ¿cómo lo decidiste: lo pensaste con calma y comparaste, o fue de otra forma? → = | redactada | — |
| b4-2-tarjetas-v7.9#32 | 1 | primera | general | Piensa en una vez concreta: ¿qué tenías que decidir y qué hiciste para que se notara que lo dejas para el último momento? → = | redactada | — |
| b4-2-tarjetas-v7.9#32 | 1 | seguimiento | general | ¿Cuál fue la última vez que tuviste que decidir algo, como un curso, un deporte o qué hacer en vacaciones, y cómo lo resolviste? → = | redactada | — |
| b4-2-tarjetas-v7.9#33 | 1 | primera | no_sabe | Puede ser algo pequeño: elegir un curso, un deporte, qué hacer en vacaciones o dejar algo. ¿Cómo lo decidiste? → = | redactada | — |
| b4-2-tarjetas-v7.9#33 | 1 | seguimiento | no_sabe | Puede ser algo pequeño, como elegir un curso o qué hacer en vacaciones. ¿Qué decisión de esas te viene a la mente? → = | redactada | — |
| b4-2-tarjetas-v7.9#34 | 1 | primera | general | Piensa en una vez concreta: ¿qué tenías que decidir y qué hiciste al final, aunque otros opinaran? → = | redactada | — |
| b4-5-tarjetas-v7.10#30 | 1 | primera | general | ¿Por qué crees que no te haría falta nada de Educación Inicial? → = | redactada | — |
| b4-5-tarjetas-v7.10#31 | 1 | primera | no_sabe | Imagina tu primer año en Economía. ¿Hay algo de Ingeniería Industrial que te gustaría estar haciendo? → = | redactada | — |
| b4-5-tarjetas-v7.10#32 | 1 | primera | general | ¿Por qué crees que no te haría falta nada de Marketing? → = | redactada | — |
| b4-5-tarjetas-v7.10#32 | 1 | seguimiento | general | ¿Qué te hace pensar que, si estudiaras Comunicaciones, no te haría falta nada de Marketing? → = | redactada | — |
| b4-5-tarjetas-v7.10#33 | 1 | primera | general | ¿Qué cosa de Medicina te haría falta si estudiaras Biología? → = | redactada | — |
| b4-5-tarjetas-v7.10#34 | 1 | primera | no_sabe | Imagina tu primer año en Administración. ¿Hay algo de Contabilidad que te gustaría estar haciendo? → = | redactada | — |
| b4-5-tarjetas-v7.10#34 | 1 | seguimiento | no_sabe | Imagina tu primer año en Administración. ¿Hay algo de Contabilidad que te gustaría estar haciendo? → = | redactada | — |
| b4-5-tarjetas-v7.10c#4 | 1 | primera | general | Dijiste ayudar a otros: ¿qué de Enfermería te lo daría? → = | redactada | — |
| b5-1-tarjetas-v7.11#33 | 1 | primera | general | ¿Qué te da seguridad en tu proyecto, o qué te la quita? Puede ser algo que ya tienes a favor o algo que sientes que te falta. → = | redactada | — |
| b5-1-tarjetas-v7.11#34 | 1 | primera | general | ¿Qué te da seguridad en tu proyecto, o qué te la quita? Puede ser algo que ya tienes a favor o algo que sientes que te falta. → = | redactada | — |
| b5-1-tarjetas-v7.11#35 | 1 | primera | general | ¿Qué te da seguridad en tu proyecto, o qué te la quita? Puede ser algo que ya tienes a favor o algo que sientes que te falta. → = | redactada | — |
| b5-1-tarjetas-v7.11#35 | 1 | seguimiento | general | ¿Hay algo concreto de tu proyecto, como el examen, la plata o las universidades, que te genere esos nervios? → = | redactada | — |
| b5-1-tarjetas-v7.11#36 | 1 | primera | no_sabe | Mira tu proyecto: ¿hay algo que ya tengas a favor, o algo que sientas que te falta? → = | redactada | — |
| b5-1-tarjetas-v7.11#36 | 1 | seguimiento | no_sabe | Mira tu proyecto: ¿hay algo que ya tengas a favor, o algo que sientas que te falta? → = | redactada | — |
| b5-1-tarjetas-v7.11#37 | 1 | primera | fuera_de_tema | Piensa en cómo te sientes hoy con tu proyecto: ¿qué te da seguridad, o qué te la quita? → = | redactada | — |
| b5-1-tarjetas-v7.11b#19 | 1 | primera | fuera_de_tema | Piensa en cómo te sientes hoy con tu proyecto: ¿qué te da seguridad, o qué te la quita? → = | redactada | — |
| b5-1-tarjetas-v7.11b#20 | 1 | primera | fuera_de_tema | Piensa en cómo te sientes hoy con tu proyecto: ¿qué te da seguridad, o qué te la quita? → = | redactada | — |
| b5-1-tarjetas-v7.11b#20 | 1 | seguimiento | fuera_de_tema | Piensa en cómo te sientes hoy con tu proyecto: ¿qué te da seguridad, o qué te la quita? → = | redactada | — |
| b5-1-tarjetas-v7.11b#21 | 1 | primera | general | ¿Qué te da seguridad en tu proyecto, o qué te la quita? Puede ser algo que ya tienes a favor o algo que sientes que te falta. → = | redactada | — |
| b5-1-tarjetas-v7.11b#22 | 1 | primera | general | ¿Qué te da seguridad en tu proyecto, o qué te la quita? Puede ser algo que ya tienes a favor o algo que sientes que te falta. → = | redactada | — |
| b5-1-tarjetas-v7.11b#22 | 1 | seguimiento | general | Mira tu proyecto: ¿hay algo que ya tengas a favor, o algo que sientas que te falta? → = | redactada | — |
| b5-3-tarjetas-v7.12#52 | 1 | primera | general | Hoy quieres cocina. ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | frase + BASE | — |
| b5-3-tarjetas-v7.12#53 | 1 | primera | general | Hoy piensas en un instituto. ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | frase + BASE | — |
| b5-3-tarjetas-v7.12#53 | 1 | seguimiento | general | ¿Qué es lo que más te gusta del instituto, en comparación con lo que tenías en mente antes? → = | redactada | — |
| b5-3-tarjetas-v7.12#54 | 1 | primera | general | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | BASE | — |
| b5-3-tarjetas-v7.12#55 | 1 | primera | general | ¿Qué crees que hizo que sigas igual? → = | redactada | — |
| b5-3-tarjetas-v7.12#56 | 1 | primera | general | ¿Qué viste o supiste en este tiempo que te lo confirmó? Si nada cambió, cuéntame por qué crees que fue así. → = | BASE | — |
| b5-3-tarjetas-v7.12#56 | 1 | seguimiento | general | ¿Qué crees que hizo que todo siga igual? → = | redactada | — |
| b5-3-tarjetas-v7.12#57 | 1 | primera | fuera_de_tema | Piensa en lo que marcaste: ¿qué viste, supiste o te pasó que te hizo verlo distinto? → = | redactada | — |
| b5-3-tarjetas-v7.12#57 | 1 | seguimiento | fuera_de_tema | Piensa en lo que marcaste: ¿qué viste, supiste o te pasó que te hizo verlo distinto? → = | redactada | — |
| b5-3-tarjetas-v7.12#58 | 1 | primera | no_sabe | Mira lo que marcaste: ¿recuerdas algo que viste, supiste o te pasó que te hizo verlo distinto? → = | redactada | — |
| b5-3-tarjetas-v7.12#58 | 1 | seguimiento | no_sabe | Mira lo que marcaste: ¿recuerdas algo que viste, supiste o te pasó que te hizo verlo distinto? → = | redactada | — |
| b5-3-tarjetas-v7.12#59 | 1 | primera | general | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | BASE | — |
| b5-3-tarjetas-v7.12#111 | 1 | primera | general | Hoy quieres cocina. ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | frase + BASE | — |
| b5-3-tarjetas-v7.12b#14 | 1 | primera | general | ¿Qué crees que hizo que siga igual? → = | siga igual | — |
| b5-3-tarjetas-v7.12b#15 | 1 | primera | general | Hoy piensas en mecánica. ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | frase + BASE | — |
| b5-3-tarjetas-v7.12b#15 | 1 | seguimiento | general | Hoy piensas en mecánica. ¿Qué viste, supiste o te pasó que te hizo ver ese gusto? → = | redactada | — |
| b5-3-tarjetas-v7.12c#6 | 1 | primera | general | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | BASE | — |
| b5-3-tarjetas-v7.12c#7 | 1 | primera | general | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | BASE | — |
| b5-3-tarjetas-v7.12c#8 | 1 | primera | general | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | BASE | — |
| b5-3-tarjetas-v7.12c#9 | 1 | primera | general | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | BASE | — |
| b5-3-tarjetas-v7.12c#9 | 1 | seguimiento | general | Mira lo que marcaste: ¿recuerdas algo que viste, supiste o te pasó que te hizo verlo distinto? → = | redactada | — |
| b5-3-tarjetas-v7.12c#10 | 1 | primera | general | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | BASE | — |
| b5-3-tarjetas-v7.12c#10 | 1 | seguimiento | no_sabe | Mira lo que marcaste: ¿recuerdas algo que viste, supiste o te pasó que te hizo verlo distinto? → = | redactada | — |

## 6. Frente a 2026-11-10_1811_v7-haiku-arranque_seguimientos.csv

Solo se reporta: la equivalencia se mide contra el esperado (§2).

| Caso | Esperado | Antes | Ahora | ¿Cambia? |
|---|---|---|---|---|
| b1-1-tarjetas-v7.1#6 | general → final propio | general→propio | general→propio | no |
| b1-3-tarjetas#16 | general → final propio | general→propio | general→propio | no |
| b1-3-tarjetas-v7.2c#16 | general → conjunto propio → final propio | general→propio | general→propio | no |
| b1-3-tarjetas-v7.2c#20 | general → conjunto general → final general | general→general | general→general | no |
| b1-6-tarjetas-v7.3#19 | general → conjunto propio → final propio | general→propio | general→propio | no |
| b1-6-tarjetas-v7.3#20 | general → conjunto general → final general | general→general | general→general | no |
| b1-7-tarjetas-v7.4#24 | general → conjunto propio → final propio | general→propio | general→propio | no |
| b1-7-tarjetas-v7.4b#25 | general → conjunto general → final general | general→general | general→general | no |
| b1-7-tarjetas-v7.4b#27 | general → conjunto propio → final propio | general→propio | general→propio | no |
| b1-7-tarjetas-v7.4b#28 | general → conjunto propio → final propio | general→propio | general→propio | no |
| b2-3-tarjetas-v7.5b#17 | general → conjunto propio → final propio | general→propio | general→propio | no |
| b2-3-tarjetas-v7.5b#18 | general → conjunto general → final general | general→general | general→general | no |
| b2-3-tarjetas-v7.5c#26 | general → conjunto general → final general | general→general | general→general | no |
| b2-4-tarjetas-v7.6#26 | general → conjunto propio → final propio | general→propio | general→propio | no |
| b2-4-tarjetas-v7.6b#43 | general → conjunto propio → final propio | general→propio | general→propio | no |
| b2-4-tarjetas-v7.6c#44 | general → conjunto general o no_sabe → final general | general→no_sabe | general→no_sabe | no |
| b3-4-tarjetas-v7.7#27 | general → conjunto propio | general→propio | general→propio | no |
| b3-4-tarjetas-v7.7#28 | general → conjunto general → final general | general→general | general→general | no |
| b3-4-tarjetas-v7.7#29 | general → conjunto propio | general→propio | general→propio | no |
| b3-4-tarjetas-v7.7c#8 | general → conjunto general → final general | general→general | general→general | no |
| b3-4-tarjetas-v7.7c#10 | general → conjunto propio | general→propio | general→propio | no |
| b3-4-tarjetas-v7.7c#9 | general → conjunto general → final general | general→general | general→general | no |
| b4-1-tarjetas-v7.8f#9 | general → conjunto propio | general→propio | general→propio | no |
| b4-1-tarjetas-v7.8e#36 | no_sabe → conjunto no_sabe → final no_sabe | no_sabe→no_sabe | no_sabe→no_sabe | no |
| b4-1-tarjetas-v7.8#37 | general → conjunto general → final general | general→general | general→general | no |
| b4-1-tarjetas-v7.8e#60 | general → conjunto propio | general→propio | general→propio | no |
| b4-1-tarjetas-v7.8e#68 | general → conjunto general → final general | general→general | general→general | no |
| b4-1-tarjetas-v7.8e#37 | general → conjunto propio | general→propio | general→propio | no |
| b4-1-tarjetas-v7.8e#61 | general → conjunto propio | general→propio | general→general | **sí** |
| b4-1-tarjetas-v7.8e#62 | general → conjunto no_sabe → final general | general→no_sabe | general→no_sabe | no |
| b4-1-tarjetas-v7.8e#38 | general → conjunto propio | general→propio | general→propio | no |
| b4-1-tarjetas-v7.8g#2 | general → conjunto general → final general | general→general | general→general | no |
| b4-2-tarjetas-v7.9#30 | general → conjunto propio | general→propio | general→propio | no |
| b4-2-tarjetas-v7.9#31 | general → conjunto propio | general→propio | general→propio | no |
| b4-2-tarjetas-v7.9#32 | general → conjunto general → final general | general→general | general→general | no |
| b4-2-tarjetas-v7.9#33 | no_sabe → conjunto no_sabe → final no_sabe | no_sabe→no_sabe | no_sabe→no_sabe | no |
| b4-2-tarjetas-v7.9#34 | general → conjunto propio | general→propio | general→propio | no |
| b4-5-tarjetas-v7.10#30 | general → conjunto propio | general→propio | general→propio | no |
| b4-5-tarjetas-v7.10#31 | no_sabe → conjunto propio | no_sabe→propio | no_sabe→propio | no |
| b4-5-tarjetas-v7.10#32 | general → conjunto general → final general | general→no_sabe | general→general | **sí** |
| b4-5-tarjetas-v7.10#33 | general → conjunto propio | general→propio | general→propio | no |
| b4-5-tarjetas-v7.10#34 | no_sabe → conjunto no_sabe → final no_sabe | no_sabe→no_sabe | no_sabe→no_sabe | no |
| b4-5-tarjetas-v7.10c#4 | general → conjunto propio | general→propio | general→propio | no |
| b5-1-tarjetas-v7.11#33 | general → conjunto propio | general→propio | general→propio | no |
| b5-1-tarjetas-v7.11#34 | general → conjunto propio | general→propio | general→propio | no |
| b5-1-tarjetas-v7.11#35 | general → conjunto general → final general | general→general | general→general | no |
| b5-1-tarjetas-v7.11#36 | no_sabe → conjunto no_sabe → final no_sabe | no_sabe→no_sabe | no_sabe→no_sabe | no |
| b5-1-tarjetas-v7.11#37 | fuera_de_tema → conjunto propio | fuera_de_tema→propio | fuera_de_tema→propio | no |
| b5-1-tarjetas-v7.11b#19 | fuera_de_tema → conjunto propio | fuera_de_tema→propio | fuera_de_tema→propio | no |
| b5-1-tarjetas-v7.11b#20 | fuera_de_tema → conjunto fuera_de_tema → final fuera_de_tema | fuera_de_tema→fuera_de_tema | fuera_de_tema→fuera_de_tema | no |
| b5-1-tarjetas-v7.11b#21 | general → conjunto propio | general→propio | general→propio | no |
| b5-1-tarjetas-v7.11b#22 | general → conjunto general → final general | general→general | general→general | no |
| b5-3-tarjetas-v7.12#52 | general → conjunto propio | general→propio | general→propio | no |
| b5-3-tarjetas-v7.12#53 | general → conjunto general → final general | general→general | general→general | no |
| b5-3-tarjetas-v7.12#54 | general → conjunto propio | general→propio | general→propio | no |
| b5-3-tarjetas-v7.12#55 | general → conjunto propio | general→propio | general→propio | no |
| b5-3-tarjetas-v7.12#56 | general → conjunto general → final general | general→general | general→general | no |
| b5-3-tarjetas-v7.12#57 | fuera_de_tema → conjunto fuera_de_tema | fuera_de_tema→fuera_de_tema | fuera_de_tema→fuera_de_tema | no |
| b5-3-tarjetas-v7.12#58 | no_sabe → conjunto no_sabe → final no_sabe | no_sabe→no_sabe | no_sabe→no_sabe | no |
| b5-3-tarjetas-v7.12#59 | general → conjunto propio | general→propio | general→propio | no |
| b5-3-tarjetas-v7.12#111 | general → conjunto propio | general→propio | general→propio | no |
| b5-3-tarjetas-v7.12b#14 | general → conjunto propio | general→propio | general→propio | no |
| b5-3-tarjetas-v7.12b#15 | general → conjunto general → final general | general→general | general→general | no |
| b5-3-tarjetas-v7.12c#6 | general → conjunto propio | general→propio | general→propio | no |
| b5-3-tarjetas-v7.12c#7 | general → conjunto propio | general→propio | general→propio | no |
| b5-3-tarjetas-v7.12c#8 | general → conjunto propio | general→propio | general→propio | no |
| b5-3-tarjetas-v7.12c#9 | general → conjunto general → final general | general→general | general→general | no |
| b5-3-tarjetas-v7.12c#10 | general → conjunto general o no_sabe | general→no_sabe | general→no_sabe | no |

## 7. Notas

- **Corrida:** los mismos 68 seguimientos de `2026-11-10_1811_v7-haiku-arranque_seguimientos.csv`, una vez, con el prompt `v7-haiku-arranque.2` (línea de las dos cosas unidas con «o») y el chequeo nuevo del arranque (colas del final, 12 palabras, palabras de la respuesta). `b5-1-tarjetas-v7.11#37` espera ya `fuera_de_tema`.
- **Clasificación (67/68).** Frente a la corrida anterior cambian dos casos (§6):
  - `b4-5-tarjetas-v7.10#32`: ahora el conjunto sale `general`, como se esperaba (antes `no_sabe`, frontera aceptada).
  - `b4-1-tarjetas-v7.8e#61` («Igual va» → «Bueno, a veces me afecta mucho lo que sienten los demás…»): el conjunto sale `general` en vez de `propio` (antes `propio`). Es una sola corrida, y la línea del arranque no entra en la clasificación; no se puede atribuir al bloque nuevo sin repetir el caso.
- **Arranques:** 67 pasan; uno vuelve `null` (`b4-1-tarjetas-v7.8e#36`, conjunto `no_sabe`) y su línea es la segunda respuesta sola. Ninguno cayó por palabras de la respuesta ni por largo. Las colas se quitaron donde venían («La persona que lo dice más cerca de mí es» → «… de mí»; «Lo que tenía que decidir fue» → «…»).
- **b5-1 (10 seguimientos):** nueve arranques dicen «Lo que me da o me quita seguridad» y uno «Lo que me da seguridad o me la quita» (#35); en la corrida anterior solo #21 nombraba las dos.
- **b1-1-tarjetas-v7.1#6** ya no copia la primera respuesta: «Lo que hacía de niño con otros».
- **Propuesta de Claude:** 67 líneas sí y 1 no (`b4-1-tarjetas-v7.8e#37`, segunda persona).
