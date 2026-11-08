# Validación del LLM de seguimiento

Mide cómo responde Gemini a casos escritos a mano para cada registro: si clasifica bien (`cumple`, `abierto`, `sensible`) y si sus repreguntas, `falta` y consolidadas cumplen la rúbrica. Usa el mismo mensaje, prompt, esquema, modelo y temperatura que el backend.

**No es parte de la suite de pytest**: llama a Gemini real, cuesta dinero (centavos) y su resultado varía entre corridas. Ningún archivo aquí se llama `test_*.py`. Se corre a mano cuando cambia el prompt, la temperatura, el modelo o los campos de seguimiento de un ítem (`que_busca`, `texto_base`, `cumple`, `no_cumple`, `evitar`, opciones propias).

## Estructura

```
tests/llm/
  evaluar.py                     arma los mensajes, llama, compara y guarda
  casos/<registro>.json          casos y lo esperado por ítem
  resultados/<registro>/
    <fecha>_<prompt>_t<temp>[_<etiqueta>].csv   una fila por caso, corrida e ítem
    resumen.md                   una línea por corrida (se agrega sola)
```

Los CSV y los `resumen.md` **se versionan**: son la evidencia de la validación del LLM.

## Uso (desde `ov_backend`)

```
uv run python tests/llm/evaluar.py b1-1 b1-3                     # todos los casos, 2 corridas
uv run python tests/llm/evaluar.py b1-1 --solo E4 S1 --corridas 3
uv run python tests/llm/evaluar.py b1-1 --temperaturas 0.2 1.0   # comparar temperaturas
uv run python tests/llm/evaluar.py b1-1 --mostrar E4             # el mensaje exacto, sin llamar
```

Requiere `GEMINI_API_KEY` (la del proyecto con facturación, Tier 1); si no está en el entorno, la toma del `.env` del backend, igual que `GEMINI_MODELO` (sin imprimirlas). Por defecto hace 8 llamadas en paralelo (`--hilos`).

## Formato de un caso

```json
{"id": "E4", "tipo": "entrega", "descripcion": "…",
 "items": [{"item": "b1-1-logro", "texto": "…", "opciones": ["PERSISTIR", {"codigo": "OTRA", "texto": "Ninguna"}]}],
 "esperado": {"b1-1-logro": {"cumple": false, "no_contiene": ["costaba"]}}}

{"id": "S1", "tipo": "seguimiento", "item": "b1-1-logro", "texto": "texto inicial", "opciones": [],
 "turnos": [["repregunta", "respuesta del estudiante"]],
 "contexto": [{"item": "…", "texto": "…", "opciones": []}],
 "referencias": {"b4-1-ref-plan": {"tipo": "PLAN", "texto": "Ingeniería de Sistemas"}},
 "esperado": {"cumple": false, "abierto": true}}
```

- `opciones`: códigos de la lista o de las opciones propias del ítem; «otra» como objeto.
- `entrega`: los ítems de la actividad juntos (una llamada, como en la plataforma). Los ítems sin criterio, o con una opción `criterio: null`, no van al modelo y salen como «sin LLM».
- `contexto` y `referencias`: solo si el ítem declara `ecos_llm` que los necesiten.
- `esperado` por ítem. Claves que se comparan: `cumple`, `abierto`, `sensible` (bool; si falta, vale cualquiera), `repregunta_nula`. Claves que solo alimentan chequeos: `sin_futuro` (ítems que preguntan por el pasado), `no_contiene` (palabras de otro ítem), `contiene_alguno` (retomar lo que se fue del tema).

## Chequeos automáticos (columna `chequeos`)

| Código | Qué detecta |
|---|---|
| `filtro_backend` | La repregunta no pasaría `pregunta_valida`: el backend usaría el `texto_base` |
| `R1_generica` | Copia «¿Podrías darme un ejemplo concreto…?» |
| `R2_preguntas` / `R3_largo` | Más de una pregunta / más de 35 palabras |
| `R4_futuro` | Pregunta qué haría en un ítem que pregunta por lo que hizo |
| `R5_texto_base` | Copia el `texto_base` literal |
| `R6_otro_item` | Pregunta por lo que pide otro ítem |
| `R8_prohibida` | «explica más», «desarrolla», «por qué crees que», criterios, IA |
| `R9_califica` | Califica la respuesta o la corrige: «pero» o «suena a» en la repregunta |
| `R10_falta` | `falta` con pregunta, demasiado larga o como pedido («Necesito…», «Cuéntame…») |
| `fuera_de_tema` | No retoma la palabra con la que se fue del tema |
| `C3_consolidada_larga` | La consolidada supera `FACTOR_MAXIMO_CONSOLIDADA` (el backend concatena) |

Lo que no se automatiza se revisa a mano en el CSV: que la repregunta retome sus palabras, que el ángulo sea nuevo y que el tono sea de par (rúbrica en `claude/pruebas-llm-b1-1.md` del proyecto).

## Criterio de aceptación de una corrida

- Clasificación igual a lo esperado en todas las corridas, salvo casos anotados como límite en su `descripcion`.
- `sensible`: ningún falso positivo en los casos marcados «no sensible» y ningún falso negativo en los «sensible».
- Sin `R1`, `R4`, `R6`, `R8`, `R9` ni `filtro_backend`. `R10` y `C3` se toleran ocasionales.
