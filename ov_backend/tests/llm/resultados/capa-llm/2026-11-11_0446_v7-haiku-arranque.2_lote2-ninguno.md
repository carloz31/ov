# Capa del LLM: 2026-11-11_0446_v7-haiku-arranque.2_lote2-ninguno

`claude-haiku-5-5`, prompt `v7-haiku-arranque.2 (6babbf14f64e)`. 13 casos, 13 corridas de caso, 14 llamadas con respuesta. CSV: [2026-11-11_0446_v7-haiku-arranque.2_lote2-ninguno.csv](2026-11-11_0446_v7-haiku-arranque.2_lote2-ninguno.csv).

## 1. Archivos

| Ruta | `git hash-object` |
|---|---|
| `tests/llm/evaluar_tarjetas.py` | `8dace570ce8b5db278902d628485d8743106049d` |
| `app/services/registro/llm/__init__.py` | `9b77d36cd868d0a6907a51d8dddb2f421841543d` |
| `app/services/registro/llm/arranque.py` | `9c7d2ae3bc56f1195d617b81651d2ba7c6ee5bd7` |
| `app/services/registro/llm/cliente.py` | `e8c3e8cea1a1a76e69d121ff309b8d38307a86d2` |
| `app/services/registro/llm/estado.py` | `bd6ab8f06012f62bdf94152b4c47d9be3a84d06d` |
| `app/services/registro/llm/evaluacion.py` | `d15f7b9b29748025ef3febfe6a722225b004ea15` |
| `app/services/registro/llm/filtro.py` | `df029d7b4ce8db4b8a6232490ee44987a5da323b` |
| `app/services/registro/llm/mensaje.py` | `30cae0484ff04780ca7231bd92552278d5965141` |
| `app/services/registro/llm/prompt_v7_haiku_arranque.py` | `4fb67e1374522dfb50e2e5c1781018285c7b7a61` |
| `app/services/registro/llm/tarjeta.py` | `3d9fa7b6d5946e577296541ef1c8415b16f8fa6d` |
| `datos/tarjetas_registros/__init__.py` | `75b91f4c95eb0c8641ead7f8e5fc5eb4d6a2a8d8` |
| `datos/tarjetas_registros/b1_1.py` | `63a2fe0841bfea230ad4bdb05cc99a9dc17301ad` |
| `datos/tarjetas_registros/b1_3.py` | `f3cdee4010e4217c594ffccce9582b6afee2ab55` |
| `datos/tarjetas_registros/b1_6.py` | `6c687cf27ad4b9bfe883a523ebc3d75f15d6cef4` |
| `datos/tarjetas_registros/b1_7.py` | `a8b8f9f11ff914e2f02cbe4d81e879cfc435dd76` |
| `datos/tarjetas_registros/b2_3.py` | `955d8997a1cdf5f63f37466b9ae46ab83a30de8e` |
| `datos/tarjetas_registros/b2_4.py` | `bc012d124c1b067ac772f31c7a76844b98e5d190` |
| `datos/tarjetas_registros/b3_4.py` | `7e9759a3d04a1b522c64ffcd4467378788f27ad2` |
| `datos/tarjetas_registros/b4_1.py` | `59f9adb46fc1ac8020db183c6fa95be12de5fa0f` |
| `datos/tarjetas_registros/b4_2.py` | `fe0f1d539dc42524b014e16a4586bd5a88f76628` |
| `datos/tarjetas_registros/b4_5.py` | `6870b21c7e7f387dacae870b8d309cc4644b6bac` |
| `datos/tarjetas_registros/b5_1.py` | `3cae1e32e9427f6504161d328f3485ecf9254795` |
| `datos/tarjetas_registros/b5_3.py` | `58e5f02acb6df5c73eaf42e0f7482b0740ca53d3` |
| `tests/llm/casos/b1-1-tarjetas-v7.13.json` | `73dc6b3a690062408919b9def86802eed7973c8c` |

## 2. Resumen

- **Clasificación contra el esperado:** 13/13 (principal: 13/13).
- **`sin_evaluar`:** ninguna. Errores del runner: 0.
- **Caídas del filtro, por regla:** ninguna.
- **Arranques del seguimiento:** pasó: 1.
- **Latencia** mediana / p95: 2127 / 4825 ms. Máximo de tokens de salida (con razonamiento): 931.

## 3. Casos

| Caso | Grupo | Ítem | Opción | Texto | Esperado | Obtenido | ¿Coincide? |
|---|---|---|---|---|---|---|---|
| b1-1-tarjetas-v7.13#1 | principal | b1-1-logro | No se me ocurre ninguno | Ayer cociné arroz con pollo para todos en mi casa | propio | propio | sí |
| b1-1-tarjetas-v7.13#2 | principal | b1-1-logro | No se me ocurre ninguno | Acabé un dibujo que tenía a medias desde hace meses | propio | propio | sí |
| b1-1-tarjetas-v7.13#3 | principal | b1-1-logro | No se me ocurre ninguno | Soy bien chambeador | general | general | sí |
| b1-1-tarjetas-v7.13#4 | principal | b1-1-logro | No se me ocurre ninguno | Siempre saco a pasear a mi perro | general | general | sí |
| b1-1-tarjetas-v7.13#5 | principal | b1-1-logro | No se me ocurre ninguno | Mi tío me llevó al estadio | general | general | sí |
| b1-1-tarjetas-v7.13#6 | principal | b1-1-logro | No se me ocurre ninguno | Nada | no_sabe | no_sabe | sí |
| b1-1-tarjetas-v7.13#7 | principal | b1-1-logro | No se me ocurre ninguno | No hago nada bien | no_sabe | no_sabe | sí |
| b1-1-tarjetas-v7.13#8 | principal | b1-1-logro | No se me ocurre ninguno | Me siento un inútil, todos hacen cosas menos yo y me da rabia | emocional | emocional | sí |
| b1-1-tarjetas-v7.13#9 | principal | b1-1-logro | No se me ocurre ninguno | Nada | no_sabe → conjunto propio | no_sabe → conjunto propio → final propio | sí |
| b1-1-tarjetas-v7.13#10 | principal | b1-1-logro | Liderar | Gané un campeonato de fulbito con mi salón | propio | propio | sí |
| b1-1-tarjetas-v7.13#11 | principal | b1-1-logro | Crear o diseñar | Soy bueno dibujando | general | general | sí |
| b1-1-tarjetas-v7.13#12 | principal | b1-1-logro | Organizar | No se me ocurre | no_sabe | no_sabe | sí |
| b1-1-tarjetas-v7.13#13 | principal | b1-1-logro | Explicar o enseñar | Mañana tengo examen de inglés | fuera_de_tema | fuera_de_tema | sí |

## 4. Arranques y línea del seguimiento

La línea se revisa a ojo: basta con que se entienda. «Propuesta» es la de Claude; la confirma el usuario.

| Caso | Primera respuesta | Repregunta mostrada | Segunda respuesta | Conjunto | Arranque | Chequeo | Línea armada | Citable | Propuesta |
|---|---|---|---|---|---|---|---|---|---|
| b1-1-tarjetas-v7.13#9 | Nada | ¿Y algo pequeño de esta semana que hayas terminado, arreglado o en lo que hayas ayudado a alguien? | bueno, le ayudé a mi mamá a cargar las bolsas del mercado | propio | Algo que terminé, arreglé o ayudé a alguien | pasó | Algo que terminé, arreglé o ayudé a alguien: bueno, le ayudé a mi mamá a cargar las bolsas del mercado | Algo que terminé, arreglé o ayudé a alguien: bueno, le ayudé a mi mamá a cargar las bolsas del mercado | _pendiente_ |

## 5. Repreguntas

Primera respuesta: la repregunta mostrada; seguimiento: la pista. Cruda → mostrada («=» si es la misma).

| Caso | Rep. | Turno | Tipo | Repregunta | Forma | Filtro |
|---|---|---|---|---|---|---|
| b1-1-tarjetas-v7.13#3 | 1 | primera | general | ¿Qué fue lo último que hiciste con esa chamba que te dejó contento o contenta, aunque sea pequeño? → = | redactada | — |
| b1-1-tarjetas-v7.13#4 | 1 | primera | general | Y de esta semana, ¿hubo algo puntual que terminaste, arreglaste o en lo que ayudaste a alguien? Puede ser pequeño. → = | redactada | — |
| b1-1-tarjetas-v7.13#5 | 1 | primera | general | Ir al estadio con tu tío suena a un buen plan. ¿Hubo algo que hiciste tú, aunque sea chico, como terminar algo, arreglar algo o ayudar a alguien? → = | redactada | — |
| b1-1-tarjetas-v7.13#6 | 1 | primera | no_sabe | Puede ser algo de esta semana: algo que terminaste, que arreglaste o en lo que ayudaste a alguien. ¿Qué fue? → = | redactada | — |
| b1-1-tarjetas-v7.13#7 | 1 | primera | no_sabe | Piensa en esta semana: ¿hubo algo que terminaste, arreglaste o en lo que ayudaste a alguien, aunque sea chiquito? → = | redactada | — |
| b1-1-tarjetas-v7.13#9 | 1 | primera | no_sabe | ¿Y algo pequeño de esta semana que hayas terminado, arreglado o en lo que hayas ayudado a alguien? → = | redactada | — |
| b1-1-tarjetas-v7.13#11 | 1 | primera | general | Cuéntame una vez en que eso se haya visto, con tus dibujos. Puede ser algo pequeño, del colegio, de tu casa o de tu barrio. → = | redactada | — |
| b1-1-tarjetas-v7.13#12 | 1 | primera | no_sabe | Puede ser algo pequeño: algo que aprendiste solo, algo que antes no te salía y ahora sí, o alguien a quien ayudaste. Cuéntame uno, aunque te parezca poca cosa. → = | redactada | — |
| b1-1-tarjetas-v7.13#13 | 1 | primera | fuera_de_tema | Volvamos a lo que marcaste, Explicar o enseñar: cuéntame algo que lograste en que se haya notado. → = | redactada | — |

## 7. Notas

_Pendiente._
