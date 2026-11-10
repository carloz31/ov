# Capa del LLM: 2026-11-10_1809_v7-haiku-arranque_equivalencia

`claude-haiku-5-5`, prompt `v7-haiku-arranque (0f7d4b71d44b)`. 20 casos, 60 corridas de caso, 78 llamadas con respuesta. CSV: [2026-11-10_1809_v7-haiku-arranque_equivalencia.csv](2026-11-10_1809_v7-haiku-arranque_equivalencia.csv).

## 1. Archivos

| Ruta | `git hash-object` |
|---|---|
| `tests/llm/evaluar_tarjetas.py` | `17bdbc04920f2f8b04d104f2bc1729018eab586c` |
| `app/services/registro/llm/__init__.py` | `9b77d36cd868d0a6907a51d8dddb2f421841543d` |
| `app/services/registro/llm/arranque.py` | `e3efef2b9aeb70655b77b8d3fde902c19d437ebd` |
| `app/services/registro/llm/cliente.py` | `e8c3e8cea1a1a76e69d121ff309b8d38307a86d2` |
| `app/services/registro/llm/estado.py` | `bd6ab8f06012f62bdf94152b4c47d9be3a84d06d` |
| `app/services/registro/llm/evaluacion.py` | `67d3e8722f0e4dd197258a1b172c9f9ab4355dfd` |
| `app/services/registro/llm/filtro.py` | `df029d7b4ce8db4b8a6232490ee44987a5da323b` |
| `app/services/registro/llm/mensaje.py` | `30cae0484ff04780ca7231bd92552278d5965141` |
| `app/services/registro/llm/prompt_v7_haiku_arranque.py` | `74f72bfc4737cb1f58a9238aef747c23eca26f85` |
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
| `tests/llm/casos/b1-7-tarjetas-v7.4.json` | `3ab41f53496f8be8ea77cecc789b22e8a857624d` |
| `tests/llm/casos/b2-3-tarjetas-v7.5c.json` | `9662207aa71daf93596cb7b64b5b252a9985389a` |
| `tests/llm/casos/b3-4-tarjetas-v7.7b.json` | `e309008bb5270c68374b3a198e48e84f13ba5729` |
| `tests/llm/casos/b4-1-tarjetas-v7.8e.json` | `f73e83e281c6bbc445f5606e5673dc9bffcc7ecd` |
| `tests/llm/casos/b5-3-tarjetas-v7.12.json` | `8fea6f4162e49aaf4d7dbef3a061572e6ec0b27b` |
| `tests/llm/casos/b5-3-tarjetas-v7.12b.json` | `b4aed567d20d668dc63a421ddc7683481a09a694` |
| `tests/llm/casos/b5-3-tarjetas-v7.12c.json` | `87496bb8d5fc79af55567b711197650c2256d458` |
| `tests/llm/casos/piloto-claude-3.json` | `f9104d95766fac8034ddf23bcd19cab439fc3c73` |

## 2. Resumen

- **Clasificación contra el esperado:** 60/60 (b5-3, forma (1): 6/6, b5-3, forma (3): 21/21, b5-3, forma (2) y controles: 15/15, Conflicto con la familia: 12/12, Control del bloque: 6/6).
- **`sin_evaluar`:** ninguna. Errores del runner: 0.
- **Caídas del filtro, por regla:** ninguna.
- **Arranques del seguimiento:** pasó: 18.
- **Latencia** mediana / p95: 2875 / 6615 ms. Máximo de tokens de salida (con razonamiento): 1245.

## 3. Casos

| Caso | Grupo | Ítem | Opción | Texto | Esperado | Obtenido | ¿Coincide? |
|---|---|---|---|---|---|---|---|
| P33 | b5-3, forma (1) | b5-3-cambio | Medicina (tu primera opción) | Ahora quiero ser chef | general | general | sí |
| P33 | b5-3, forma (1) | b5-3-cambio | Medicina (tu primera opción) | Ahora quiero ser chef | general | general | sí |
| P33 | b5-3, forma (1) | b5-3-cambio | Medicina (tu primera opción) | Ahora quiero ser chef | general | general | sí |
| P41 | b5-3, forma (1) | b5-3-cambio | Medicina (tu primera opción) | Nada que ver bro, la medicina no era pa mí | general | general | sí |
| P41 | b5-3, forma (1) | b5-3-cambio | Medicina (tu primera opción) | Nada que ver bro, la medicina no era pa mí | general | general | sí |
| P41 | b5-3, forma (1) | b5-3-cambio | Medicina (tu primera opción) | Nada que ver bro, la medicina no era pa mí | general | general | sí |
| P26 | b5-3, forma (3) | b5-3-cambio | Educación Inicial (tu primera opción) | Me cambió la idea | general → conjunto general o no_sabe | general → conjunto no_sabe → final general | sí |
| P26 | b5-3, forma (3) | b5-3-cambio | Educación Inicial (tu primera opción) | Me cambió la idea | general → conjunto general o no_sabe | general → conjunto no_sabe → final general | sí |
| P26 | b5-3, forma (3) | b5-3-cambio | Educación Inicial (tu primera opción) | Me cambió la idea | general → conjunto general o no_sabe | general → conjunto no_sabe → final general | sí |
| P35 | b5-3, forma (3) | b5-3-cambio | Medicina (tu primera opción) | Uno cambia, pues | general | general | sí |
| P35 | b5-3, forma (3) | b5-3-cambio | Medicina (tu primera opción) | Uno cambia, pues | general | general | sí |
| P35 | b5-3, forma (3) | b5-3-cambio | Medicina (tu primera opción) | Uno cambia, pues | general | general | sí |
| P36 | b5-3, forma (3) | b5-3-cambio | "Programando videojuegos" (tu día a los 23) | Me di cuenta y ya | general | general | sí |
| P36 | b5-3, forma (3) | b5-3-cambio | "Programando videojuegos" (tu día a los 23) | Me di cuenta y ya | general | general | sí |
| P36 | b5-3, forma (3) | b5-3-cambio | "Programando videojuegos" (tu día a los 23) | Me di cuenta y ya | general | general | sí |
| P40 | b5-3, forma (3) | b5-3-cambio | "Trabajando en una constructora grande" (tu día a los 23) | YA NO ME VEO EN NADA | general | general | sí |
| P40 | b5-3, forma (3) | b5-3-cambio | "Trabajando en una constructora grande" (tu día a los 23) | YA NO ME VEO EN NADA | general | general | sí |
| P40 | b5-3, forma (3) | b5-3-cambio | "Trabajando en una constructora grande" (tu día a los 23) | YA NO ME VEO EN NADA | general | general | sí |
| P84 | b5-3, forma (3) | b5-3-cambio | Mis padres saben qué me conviene estudiar (una idea que habías escuchado o creído) | Ya no lo creo | general → conjunto propio | general → conjunto propio → final propio | sí |
| P84 | b5-3, forma (3) | b5-3-cambio | Mis padres saben qué me conviene estudiar (una idea que habías escuchado o creído) | Ya no lo creo | general → conjunto propio | general → conjunto propio → final propio | sí |
| P84 | b5-3, forma (3) | b5-3-cambio | Mis padres saben qué me conviene estudiar (una idea que habías escuchado o creído) | Ya no lo creo | general → conjunto propio | general → conjunto propio → final propio | sí |
| P85 | b5-3, forma (3) | b5-3-cambio | Ingeniería Civil (tu primera opción) | Ya no me siento capaz | general → conjunto propio | general → conjunto propio → final propio | sí |
| P85 | b5-3, forma (3) | b5-3-cambio | Ingeniería Civil (tu primera opción) | Ya no me siento capaz | general → conjunto propio | general → conjunto propio → final propio | sí |
| P85 | b5-3, forma (3) | b5-3-cambio | Ingeniería Civil (tu primera opción) | Ya no me siento capaz | general → conjunto propio | general → conjunto propio → final propio | sí |
| P86 | b5-3, forma (3) | b5-3-cambio | "Nada" (lo que dijiste que podía frenarte) | Cambió nomás | general → conjunto general → final general | general → conjunto general → final general | sí |
| P86 | b5-3, forma (3) | b5-3-cambio | "Nada" (lo que dijiste que podía frenarte) | Cambió nomás | general → conjunto general → final general | general → conjunto general → final general | sí |
| P86 | b5-3, forma (3) | b5-3-cambio | "Nada" (lo que dijiste que podía frenarte) | Cambió nomás | general → conjunto general → final general | general → conjunto general → final general | sí |
| P34 | b5-3, forma (2) y controles | b5-3-cambio | "No saber qué estudiar" (lo que dijiste que podía frenarte) | Sigo igual, sin saber | general | general | sí |
| P34 | b5-3, forma (2) y controles | b5-3-cambio | "No saber qué estudiar" (lo que dijiste que podía frenarte) | Sigo igual, sin saber | general | general | sí |
| P34 | b5-3, forma (2) y controles | b5-3-cambio | "No saber qué estudiar" (lo que dijiste que podía frenarte) | Sigo igual, sin saber | general | general | sí |
| P25 | b5-3, forma (2) y controles | b5-3-cambio | La carrera decide toda mi vida (una idea que habías escuchado o creído) | Lo sigo viendo como antes | general → conjunto propio | general → conjunto propio → final propio | sí |
| P25 | b5-3, forma (2) y controles | b5-3-cambio | La carrera decide toda mi vida (una idea que habías escuchado o creído) | Lo sigo viendo como antes | general → conjunto propio | general → conjunto propio → final propio | sí |
| P25 | b5-3, forma (2) y controles | b5-3-cambio | La carrera decide toda mi vida (una idea que habías escuchado o creído) | Lo sigo viendo como antes | general → conjunto propio | general → conjunto propio → final propio | sí |
| P22 | b5-3, forma (2) y controles | b5-3-cambio | Lo veo todo igual | Igual nomás | general | general | sí |
| P22 | b5-3, forma (2) y controles | b5-3-cambio | Lo veo todo igual | Igual nomás | general | general | sí |
| P22 | b5-3, forma (2) y controles | b5-3-cambio | Lo veo todo igual | Igual nomás | general | general | sí |
| P38 | b5-3, forma (2) y controles | b5-3-cambio | Lo veo todo igual | Nada | general → conjunto general → final general | general → conjunto general → final general | sí |
| P38 | b5-3, forma (2) y controles | b5-3-cambio | Lo veo todo igual | Nada | general → conjunto general → final general | general → conjunto general → final general | sí |
| P38 | b5-3, forma (2) y controles | b5-3-cambio | Lo veo todo igual | Nada | general → conjunto general → final general | general → conjunto general → final general | sí |
| P37 | b5-3, forma (2) y controles | b5-3-cambio | Lo veo todo igual | La verdad no le puse atención, lo hacía rápido para terminar | propio | propio | sí |
| P37 | b5-3, forma (2) y controles | b5-3-cambio | Lo veo todo igual | La verdad no le puse atención, lo hacía rápido para terminar | propio | propio | sí |
| P37 | b5-3, forma (2) y controles | b5-3-cambio | Lo veo todo igual | La verdad no le puse atención, lo hacía rápido para terminar | propio | propio | sí |
| P69 | Conflicto con la familia | b3-4-quien | Mamá | Mi mamá no quiere que estudie eso y siempre peleamos cuando lo hablo | general | general | sí |
| P69 | Conflicto con la familia | b3-4-quien | Mamá | Mi mamá no quiere que estudie eso y siempre peleamos cuando lo hablo | general | general | sí |
| P69 | Conflicto con la familia | b3-4-quien | Mamá | Mi mamá no quiere que estudie eso y siempre peleamos cuando lo hablo | general | general | sí |
| P70 | Conflicto con la familia | b3-4-quien | Abuelo/a | Sé que podría ayudarme, pero es difícil hablar con él | general | general | sí |
| P70 | Conflicto con la familia | b3-4-quien | Abuelo/a | Sé que podría ayudarme, pero es difícil hablar con él | general | general | sí |
| P70 | Conflicto con la familia | b3-4-quien | Abuelo/a | Sé que podría ayudarme, pero es difícil hablar con él | general | general | sí |
| P01 | Conflicto con la familia | b4-1-menos | Ayudar, enseñar, cuidar o acompañar a otras personas (tu test de intereses) | Mi mamá dice que no voy a aguantar ver sangre | general o propio | general | sí |
| P01 | Conflicto con la familia | b4-1-menos | Ayudar, enseñar, cuidar o acompañar a otras personas (tu test de intereses) | Mi mamá dice que no voy a aguantar ver sangre | general o propio | general | sí |
| P01 | Conflicto con la familia | b4-1-menos | Ayudar, enseñar, cuidar o acompañar a otras personas (tu test de intereses) | Mi mamá dice que no voy a aguantar ver sangre | general o propio | propio | sí |
| P61 | Conflicto con la familia | b1-7-dia | Lo veo bastante claro | Lejos de mi casa, donde no me comparen | general | general | sí |
| P61 | Conflicto con la familia | b1-7-dia | Lo veo bastante claro | Lejos de mi casa, donde no me comparen | general | general | sí |
| P61 | Conflicto con la familia | b1-7-dia | Lo veo bastante claro | Lejos de mi casa, donde no me comparen | general | general | sí |
| P31 | Control del bloque | b4-1-menos | Exponer (lo que te cuesta) | Siento que no doy la talla para eso | general | general | sí |
| P31 | Control del bloque | b4-1-menos | Exponer (lo que te cuesta) | Siento que no doy la talla para eso | general | general | sí |
| P31 | Control del bloque | b4-1-menos | Exponer (lo que te cuesta) | Siento que no doy la talla para eso | general | general | sí |
| P54 | Control del bloque | b2-3-valores | Estabilidad, Ingresos, Aprender | Me daría tranquilidad | general | general | sí |
| P54 | Control del bloque | b2-3-valores | Estabilidad, Ingresos, Aprender | Me daría tranquilidad | general | general | sí |
| P54 | Control del bloque | b2-3-valores | Estabilidad, Ingresos, Aprender | Me daría tranquilidad | general | general | sí |

## 4. Arranques y línea del seguimiento

La línea se revisa a ojo: basta con que se entienda. «Propuesta» es la de Claude; la confirma el usuario.

| Caso | Primera respuesta | Repregunta mostrada | Segunda respuesta | Conjunto | Arranque | Chequeo | Línea armada | Citable | Propuesta |
|---|---|---|---|---|---|---|---|---|---|
| P26 | Me cambió la idea | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. | No me acuerdo bien, fue de a pocos | no_sabe | Cuándo empecé a verlo distinto | pasó | Cuándo empecé a verlo distinto: No me acuerdo bien, fue de a pocos | Me cambió la idea | _pendiente_ |
| P26 | Me cambió la idea | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. | No me acuerdo bien, fue de a pocos | no_sabe | Lo que me fue haciendo verlo distinto | pasó | Lo que me fue haciendo verlo distinto: No me acuerdo bien, fue de a pocos | Me cambió la idea | _pendiente_ |
| P26 | Me cambió la idea | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. | No me acuerdo bien, fue de a pocos | no_sabe | Lo que me hizo verlo distinto | pasó | Lo que me hizo verlo distinto: No me acuerdo bien, fue de a pocos | Me cambió la idea | _pendiente_ |
| P84 | Ya no lo creo | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. | Cuando mi hermana dejó la carrera que le escogieron | propio | Empecé a verlo distinto cuando | pasó | Empecé a verlo distinto cuando: Cuando mi hermana dejó la carrera que le escogieron | Ya no lo creo ¶ Empecé a verlo distinto cuando: Cuando mi hermana dejó la carrera que le escogieron | _pendiente_ |
| P84 | Ya no lo creo | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. | Cuando mi hermana dejó la carrera que le escogieron | propio | Empecé a verlo distinto cuando | pasó | Empecé a verlo distinto cuando: Cuando mi hermana dejó la carrera que le escogieron | Ya no lo creo ¶ Empecé a verlo distinto cuando: Cuando mi hermana dejó la carrera que le escogieron | _pendiente_ |
| P84 | Ya no lo creo | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. | Cuando mi hermana dejó la carrera que le escogieron | propio | Cuando empecé a verlo distinto | pasó | Cuando empecé a verlo distinto: Cuando mi hermana dejó la carrera que le escogieron | Ya no lo creo ¶ Cuando empecé a verlo distinto: Cuando mi hermana dejó la carrera que le escogieron | _pendiente_ |
| P85 | Ya no me siento capaz | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. | Desde el simulacro, saqué muy bajo en mate | propio | Lo que me hizo verlo distinto | pasó | Lo que me hizo verlo distinto: Desde el simulacro, saqué muy bajo en mate | Ya no me siento capaz ¶ Lo que me hizo verlo distinto: Desde el simulacro, saqué muy bajo en mate | _pendiente_ |
| P85 | Ya no me siento capaz | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. | Desde el simulacro, saqué muy bajo en mate | propio | Empecé a verlo distinto cuando | pasó | Empecé a verlo distinto cuando: Desde el simulacro, saqué muy bajo en mate | Ya no me siento capaz ¶ Empecé a verlo distinto cuando: Desde el simulacro, saqué muy bajo en mate | _pendiente_ |
| P85 | Ya no me siento capaz | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. | Desde el simulacro, saqué muy bajo en mate | propio | Cuándo empecé a verlo distinto, y qué pasó | pasó | Cuándo empecé a verlo distinto, y qué pasó: Desde el simulacro, saqué muy bajo en mate | Ya no me siento capaz ¶ Cuándo empecé a verlo distinto, y qué pasó: Desde el simulacro, saqué muy bajo en mate | _pendiente_ |
| P86 | Cambió nomás | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. | Porque sí | general | Cuándo empecé a verlo distinto | pasó | Cuándo empecé a verlo distinto: Porque sí | Cambió nomás | _pendiente_ |
| P86 | Cambió nomás | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. | Porque sí | general | Cuándo empecé a verlo distinto | pasó | Cuándo empecé a verlo distinto: Porque sí | Cambió nomás | _pendiente_ |
| P86 | Cambió nomás | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. | Porque sí | general | Cuándo empecé a verlo distinto | pasó | Cuándo empecé a verlo distinto: Porque sí | Cambió nomás | _pendiente_ |
| P25 | Lo sigo viendo como antes | ¿Qué crees que hizo que siga igual? | Porque mi hermano estudió Contabilidad y hasta ahora trabaja en eso, no pudo cambiar | propio | Lo que creo que hizo que siga igual | pasó | Lo que creo que hizo que siga igual: Porque mi hermano estudió Contabilidad y hasta ahora trabaja en eso, no pudo cambiar | Lo sigo viendo como antes ¶ Lo que creo que hizo que siga igual: Porque mi hermano estudió Contabilidad y hasta ahora trabaja en eso, no pudo cambiar | _pendiente_ |
| P25 | Lo sigo viendo como antes | ¿Qué crees que hizo que siga igual? | Porque mi hermano estudió Contabilidad y hasta ahora trabaja en eso, no pudo cambiar | propio | Lo que creo que hizo que siga igual | pasó | Lo que creo que hizo que siga igual: Porque mi hermano estudió Contabilidad y hasta ahora trabaja en eso, no pudo cambiar | Lo sigo viendo como antes ¶ Lo que creo que hizo que siga igual: Porque mi hermano estudió Contabilidad y hasta ahora trabaja en eso, no pudo cambiar | _pendiente_ |
| P25 | Lo sigo viendo como antes | ¿Qué crees que hizo que siga igual? | Porque mi hermano estudió Contabilidad y hasta ahora trabaja en eso, no pudo cambiar | propio | Lo que creo que hizo que siga igual | pasó | Lo que creo que hizo que siga igual: Porque mi hermano estudió Contabilidad y hasta ahora trabaja en eso, no pudo cambiar | Lo sigo viendo como antes ¶ Lo que creo que hizo que siga igual: Porque mi hermano estudió Contabilidad y hasta ahora trabaja en eso, no pudo cambiar | _pendiente_ |
| P38 | Nada | ¿Qué viste o supiste en este tiempo que te lo confirmó? Si nada cambió, cuéntame por qué crees que fue así. | Nada pues | general | Lo que pasó es que | pasó | Lo que pasó es que: Nada pues | Nada | _pendiente_ |
| P38 | Nada | ¿Qué viste o supiste en este tiempo que te lo confirmó? Si nada cambió, cuéntame por qué crees que fue así. | Nada pues | general | Lo que vi o supe que me confirmó | pasó | Lo que vi o supe que me confirmó: Nada pues | Nada | _pendiente_ |
| P38 | Nada | ¿Qué viste o supiste en este tiempo que te lo confirmó? Si nada cambió, cuéntame por qué crees que fue así. | Nada pues | general | Lo que me hizo verlo distinto | pasó | Lo que me hizo verlo distinto: Nada pues | Nada | _pendiente_ |

## 5. Repreguntas

Primera respuesta: la repregunta mostrada; seguimiento: la pista. Cruda → mostrada («=» si es la misma).

| Caso | Rep. | Turno | Tipo | Repregunta | Forma | Filtro |
|---|---|---|---|---|---|---|
| P33 | 1 | primera | general | Hoy quieres ser chef. ¿Qué viste, supiste o te pasó que te llevó a esa idea? → = | redactada | — |
| P33 | 2 | primera | general | Hoy quieres ser chef. ¿Recuerdas qué viste, supiste o te pasó que te hizo verlo distinto? → = | redactada | — |
| P33 | 3 | primera | general | Hoy quieres ser chef. ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | frase + BASE | — |
| P41 | 1 | primera | general | Hoy la medicina no te cuadra. ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | frase + BASE | — |
| P41 | 2 | primera | general | Hoy descartas Medicina. ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | frase + BASE | — |
| P41 | 3 | primera | general | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | BASE | — |
| P26 | 1 | primera | general | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | BASE | — |
| P26 | 1 | seguimiento | no_sabe | Mira lo que marcaste: ¿recuerdas algo que viste, supiste o te pasó que te hizo verlo distinto? → = | redactada | — |
| P26 | 2 | primera | general | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | BASE | — |
| P26 | 2 | seguimiento | no_sabe | Aunque no recuerdes cuándo, ¿qué cosa de las que viste o escuchaste te fue moviendo la idea, aunque fuera poco a poco? → = | redactada | — |
| P26 | 3 | primera | general | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | BASE | — |
| P26 | 3 | seguimiento | no_sabe | ¿Y hubo alguna cosa que viste, supiste o te pasó, aunque sea chica, que te fue moviendo la idea? → = | redactada | — |
| P35 | 1 | primera | general | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | BASE | — |
| P35 | 2 | primera | general | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | BASE | — |
| P35 | 3 | primera | general | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | BASE | — |
| P36 | 1 | primera | general | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | BASE | — |
| P36 | 2 | primera | general | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | BASE | — |
| P36 | 3 | primera | general | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | BASE | — |
| P40 | 1 | primera | general | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | BASE | — |
| P40 | 2 | primera | general | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | BASE | — |
| P40 | 3 | primera | general | ¿Qué crees que hizo que ya no te veas en nada? Cuéntame qué viste, supiste o te pasó. → = | redactada | — |
| P84 | 1 | primera | general | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | BASE | — |
| P84 | 2 | primera | general | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | BASE | — |
| P84 | 3 | primera | general | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | BASE | — |
| P85 | 1 | primera | general | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | BASE | — |
| P85 | 2 | primera | general | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | BASE | — |
| P85 | 3 | primera | general | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | BASE | — |
| P86 | 1 | primera | general | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | BASE | — |
| P86 | 1 | seguimiento | general | Mira lo que marcaste: ¿recuerdas algo que viste, supiste o te pasó que te hizo verlo distinto? → = | redactada | — |
| P86 | 2 | primera | general | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | BASE | — |
| P86 | 2 | seguimiento | general | Mira lo que marcaste: ¿recuerdas algo que viste, supiste o te pasó que te hizo verlo distinto? → = | redactada | — |
| P86 | 3 | primera | general | ¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron. → = | BASE | — |
| P86 | 3 | seguimiento | general | Mira lo que marcaste: ¿hubo alguna charla, persona o resultado de la plataforma que te hiciera pensar en otra cosa? → = | redactada | — |
| P34 | 1 | primera | general | ¿Qué crees que hizo que siga igual? → = | siga igual | — |
| P34 | 2 | primera | general | ¿Qué crees que hizo que siga igual? → = | siga igual | — |
| P34 | 3 | primera | general | ¿Qué crees que hizo que siga igual? → = | siga igual | — |
| P25 | 1 | primera | general | ¿Qué crees que hizo que siga igual? → = | siga igual | — |
| P25 | 2 | primera | general | ¿Qué crees que hizo que siga igual? → = | siga igual | — |
| P25 | 3 | primera | general | ¿Qué crees que hizo que siga igual? → = | siga igual | — |
| P22 | 1 | primera | general | ¿Qué viste o supiste en este tiempo que te lo confirmó? Si nada cambió, cuéntame por qué crees que fue así. → = | BASE | — |
| P22 | 2 | primera | general | ¿Qué viste o supiste en este tiempo que te lo confirmó? Si nada cambió, cuéntame por qué crees que fue así. → = | BASE | — |
| P22 | 3 | primera | general | ¿Qué viste o supiste en este tiempo que te lo confirmó? Si nada cambió, cuéntame por qué crees que fue así. → = | BASE | — |
| P38 | 1 | primera | general | ¿Qué viste o supiste en este tiempo que te lo confirmó? Si nada cambió, cuéntame por qué crees que fue así. → = | BASE | — |
| P38 | 1 | seguimiento | general | ¿Qué crees que hizo que las cosas sigan igual para ti? → = | redactada | — |
| P38 | 2 | primera | general | ¿Qué viste o supiste en este tiempo que te lo confirmó? Si nada cambió, cuéntame por qué crees que fue así. → = | BASE | — |
| P38 | 2 | seguimiento | general | ¿Lo tenías decidido desde antes de entrar a la plataforma, o pesó algo más? → = | redactada | — |
| P38 | 3 | primera | general | ¿Qué viste o supiste en este tiempo que te lo confirmó? Si nada cambió, cuéntame por qué crees que fue así. → = | BASE | — |
| P38 | 3 | seguimiento | general | ¿Qué crees que hizo que todo siga igual? → = | redactada | — |
| P69 | 1 | primera | general | ¿Qué te hace pensar que tu mamá podría contarte si se puede estudiar y trabajar a la vez? → = | redactada | — |
| P69 | 2 | primera | general | ¿Qué te hace pensar que tu mamá podría contarte si se puede estudiar y trabajar a la vez? → = | redactada | — |
| P69 | 3 | primera | general | ¿Qué te hace pensar que tu mamá podría ayudarte a saber si se puede estudiar y trabajar a la vez? → = | redactada | — |
| P70 | 1 | primera | general | ¿Qué te hace pensar que esa persona podría contarte cómo es: algo en lo que trabaja, algo que estudió o algo que vivió? → = | redactada | — |
| P70 | 2 | primera | general | ¿Qué te hace pensar que esa persona podría contarte cuánto se gana al empezar? → = | redactada | — |
| P70 | 3 | primera | general | ¿Qué te hace pensar que esa persona podría contarte cuánto se gana al empezar: algo en lo que trabaja, algo que estudió o algo que vivió? → = | redactada | — |
| P01 | 1 | primera | general | ¿Qué de Medicina Humana va menos con ayudar a otras personas: un turno, una guardia o el trato con los pacientes? → = | redactada | — |
| P01 | 2 | primera | general | ¿Qué parte de Medicina Humana, como una consulta, una guardia o las prácticas, va menos con eso de ayudar y cuidar a otras personas? → = | redactada | — |
| P61 | 1 | primera | general | Piensa en un momento de ese día, a tus 23 años: ¿dónde te gustaría estar y qué estarías haciendo ahí? → = | redactada | — |
| P61 | 2 | primera | general | ¿Dónde te gustaría estar a media mañana de ese día, y qué estarías haciendo ahí? → = | redactada | — |
| P61 | 3 | primera | general | Piensa en un momento de ese día, por ejemplo a media mañana: ¿dónde te gustaría estar y qué estarías haciendo? → = | redactada | — |
| P31 | 1 | primera | general | ¿En qué parte de Comunicación se notaría eso que te cuesta: una exposición en clase, presentar un proyecto o hablar ante un público? → = | redactada | — |
| P31 | 2 | primera | general | ¿En qué parte de Comunicación se notaría más eso que te cuesta: una presentación en clase, una entrevista o un programa en vivo? → = | redactada | — |
| P31 | 3 | primera | general | ¿En qué parte de Comunicación se notaría más eso que te cuesta exponer: una presentación en clase, un proyecto grupal o una entrevista? → = | redactada | — |
| P54 | 1 | primera | general | ¿Y frente a qué te daría tranquilidad la estabilidad? → = | redactada | — |
| P54 | 2 | primera | general | ¿Tranquilidad frente a qué, en tu caso: algo que viviste o algo que viste en otros? → = | redactada | — |
| P54 | 3 | primera | general | ¿Tranquilidad frente a qué, en tu caso? → = | redactada | — |

## 6. Frente a piloto-claude-3-haiku-low.csv

Solo se reporta: la equivalencia se mide contra el esperado (§2).

| Caso | Esperado | Antes | Ahora | ¿Cambia? |
|---|---|---|---|---|
| P33 | general | general · general · general | general · general · general | no |
| P41 | general | general · general · general | general · general · general | no |
| P26 | general → conjunto general o no_sabe | general→no_sabe · general→no_sabe · general→no_sabe | general→no_sabe · general→no_sabe · general→no_sabe | no |
| P35 | general | general · general · general | general · general · general | no |
| P36 | general | general · general · general | general · general · general | no |
| P40 | general | general · general · general | general · general · general | no |
| P84 | general → conjunto propio | general→propio · general→propio · general→propio | general→propio · general→propio · general→propio | no |
| P85 | general → conjunto propio | general→propio · general→propio · general→propio | general→propio · general→propio · general→propio | no |
| P86 | general → conjunto general → final general | general→general · general→general · general→general | general→general · general→general · general→general | no |
| P34 | general | general · general · general | general · general · general | no |
| P25 | general → conjunto propio | general→propio · general→propio · general→propio | general→propio · general→propio · general→propio | no |
| P22 | general | general · general · general | general · general · general | no |
| P38 | general → conjunto general → final general | general→general · general→general · general→general | general→general · general→general · general→general | no |
| P37 | propio | propio · propio · propio | propio · propio · propio | no |
| P69 | general | general · general · general | general · general · general | no |
| P70 | general | general · general · general | general · general · general | no |
| P01 | general o propio | propio · general · general | general · general · propio | no |
| P61 | general | general · general · general | general · general · general | no |
| P31 | general | general · general · general | general · general · general | no |
| P54 | general | general · general · general | general · general · general | no |

## 7. Notas

- **Equivalencia:** el set de piloto-claude-3 (20 casos × 3) por la capa del backend, con el prompt v7-haiku más el bloque del arranque: 60/60 contra el tipo esperado de cada caso, sin `sin_evaluar` ni errores.
- **Frente a `piloto-claude-3-haiku-low.csv` (§6):** ningún caso cambia la secuencia de tipos de sus tres repeticiones.
- **Filtro:** ninguna repregunta cayó. Los 18 arranques de los 6 seguimientos pasaron el chequeo.
