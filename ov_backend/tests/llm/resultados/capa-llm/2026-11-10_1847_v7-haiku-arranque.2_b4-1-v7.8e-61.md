# Capa del LLM: 2026-11-10_1847_v7-haiku-arranque.2_b4-1-v7.8e-61

`claude-haiku-5-5`, prompt `v7-haiku-arranque.2 (6babbf14f64e)`. 1 casos, 3 corridas de caso, 6 llamadas con respuesta. CSV: [2026-11-10_1847_v7-haiku-arranque.2_b4-1-v7.8e-61.csv](2026-11-10_1847_v7-haiku-arranque.2_b4-1-v7.8e-61.csv).

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

- **Clasificación contra el esperado:** 3/3 (seguimiento: 3/3).
- **`sin_evaluar`:** ninguna. Errores del runner: 0.
- **Caídas del filtro, por regla:** ninguna.
- **Arranques del seguimiento:** pasó: 2, sin_arranque: 1.
- **Latencia** mediana / p95: 3295 / 6662 ms. Máximo de tokens de salida (con razonamiento): 1006.

## 3. Casos

| Caso | Grupo | Ítem | Opción | Texto | Esperado | Obtenido | ¿Coincide? |
|---|---|---|---|---|---|---|---|
| b4-1-tarjetas-v7.8e#61 | seguimiento | b4-1-menos | Captas los estados de ánimo y los sentimientos de los demás (tu test de inteligencias) | Igual va | general → conjunto propio | general → conjunto propio → final propio | sí |
| b4-1-tarjetas-v7.8e#61 | seguimiento | b4-1-menos | Captas los estados de ánimo y los sentimientos de los demás (tu test de inteligencias) | Igual va | general → conjunto propio | general → conjunto propio → final propio | sí |
| b4-1-tarjetas-v7.8e#61 | seguimiento | b4-1-menos | Captas los estados de ánimo y los sentimientos de los demás (tu test de inteligencias) | Igual va | general → conjunto propio | general → conjunto propio → final propio | sí |

## 4. Arranques y línea del seguimiento

La línea se revisa a ojo: basta con que se entienda. «Propuesta» es la de Claude; la confirma el usuario.

| Caso | Primera respuesta | Repregunta mostrada | Segunda respuesta | Conjunto | Arranque | Chequeo | Línea armada | Citable | Propuesta |
|---|---|---|---|---|---|---|---|---|---|
| b4-1-tarjetas-v7.8e#61 | Igual va | ¿Qué parte de Psicología va menos con captar los sentimientos de los demás: un curso, una tarea o el día a día de ese trabajo? | Bueno, a veces me afecta mucho lo que sienten los demás y en terapia escucharía problemas todo el día | propio | La parte que va menos con captar sentimientos | pasó | La parte que va menos con captar sentimientos: Bueno, a veces me afecta mucho lo que sienten los demás y en terapia escucharía problemas todo el día | Igual va ¶ La parte que va menos con captar sentimientos: Bueno, a veces me afecta mucho lo que sienten los demás y en terapia escucharía problemas todo el día | _pendiente_ |
| b4-1-tarjetas-v7.8e#61 | Igual va | ¿Qué parte de Psicología, un curso, una práctica o el trato con las personas, va menos con captar lo que sienten los demás? | Bueno, a veces me afecta mucho lo que sienten los demás y en terapia escucharía problemas todo el día | propio | — | cayó: `sin_arranque` | Bueno, a veces me afecta mucho lo que sienten los demás y en terapia escucharía problemas todo el día | Igual va ¶ Bueno, a veces me afecta mucho lo que sienten los demás y en terapia escucharía problemas todo el día | _pendiente_ |
| b4-1-tarjetas-v7.8e#61 | Igual va | ¿Qué parte de Psicología, como una sesión, un trabajo en equipo o el trato diario con personas, te haría notar más esa sensibilidad a los demás? | Bueno, a veces me afecta mucho lo que sienten los demás y en terapia escucharía problemas todo el día | propio | La parte de Psicología que me haría notarlo | pasó | La parte de Psicología que me haría notarlo: Bueno, a veces me afecta mucho lo que sienten los demás y en terapia escucharía problemas todo el día | Igual va ¶ La parte de Psicología que me haría notarlo: Bueno, a veces me afecta mucho lo que sienten los demás y en terapia escucharía problemas todo el día | _pendiente_ |

## 5. Repreguntas

Primera respuesta: la repregunta mostrada; seguimiento: la pista. Cruda → mostrada («=» si es la misma).

| Caso | Rep. | Turno | Tipo | Repregunta | Forma | Filtro |
|---|---|---|---|---|---|---|
| b4-1-tarjetas-v7.8e#61 | 1 | primera | general | ¿Qué parte de Psicología va menos con captar los sentimientos de los demás: un curso, una tarea o el día a día de ese trabajo? → = | redactada | — |
| b4-1-tarjetas-v7.8e#61 | 2 | primera | general | ¿Qué parte de Psicología, un curso, una práctica o el trato con las personas, va menos con captar lo que sienten los demás? → = | redactada | — |
| b4-1-tarjetas-v7.8e#61 | 3 | primera | general | ¿Qué parte de Psicología, como una sesión, un trabajo en equipo o el trato diario con personas, te haría notar más esa sensibilidad a los demás? → = | redactada | — |

## 7. Notas

_Pendiente._
