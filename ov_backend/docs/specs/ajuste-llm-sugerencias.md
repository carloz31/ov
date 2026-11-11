# Ajuste llm-sugerencias · guion de Investigaciones y pasos del plan con Claude Haiku

## Contexto

Los dos usos del LLM fuera del registro (preguntas sugeridas del guion y pasos sugeridos del plan) siguen con Gemini (`app.state.evaluador_respuestas`, `EvaluadorGemini.sugerir_preguntas/sugerir_pasos`). Pasan a Claude Haiku (`app.state.cliente_llm`, `ClienteClaude.llamar`) con los prompts `guion-v4-haiku` y `pasos-v5-haiku` del texto de observaciones (que se copian tal cual), mensaje con etiquetas, salida con esquema JSON y los cambios de comportamiento de §2 y §3. No hay datos reales: no se migran datos, solo se dejan coherentes ruta, contenido y fixtures.

- Spec: no hay ninguna en curso → `ov_backend/docs/specs/ajuste-llm-sugerencias.md` (este plan, sin cambios).
- Rama: `claude/sweet-hypatia-y0zeng` (la que fija esta sesión). Hoy es idéntica a `main` y a `origin/ajuste/registros-llm`, así que ya trae `app/services/registro/llm/`. Commits `Ajuste llm-sugerencias · F<n>: …`. Sin push hasta el final (lo pide la sesión).
- Respuestas del usuario: SALUD sale de DIFICULTADES también para `b1-7-freno`; la corrida con Haiku la hago yo (si no hay clave en el contenedor, me detengo y aviso).

## Qué cambia (hoy → pasará a)

**Común**
- `app/api/investigaciones.py:pedir_sugerencias_guion` y `app/api/planes.py:guardar_seccion` pasan `evaluador_respuestas` y el `timeout_segundos` de Gemini → pasan `cliente_llm`. El tiempo máximo es el del cliente (`TIEMPO_MAXIMO_LLM_SEGUNDOS`, 12 s, `LlamadaFallida('tiempo_agotado')`); se quita el parámetro `tiempo_maximo_segundos` y la medición con `perf_counter` de ambos servicios.
- Nuevo `salida_json(cliente, sistema, mensaje, modelo_pydantic)` en `app/services/registro/llm/cliente.py`: llama, exige `parada == 'end_turn'` y valida con el modelo; cualquier otra cosa lanza una excepción propia con mensaje fijo (nunca el de la excepción externa). Reutiliza la lógica de `_llamar` de `llm/evaluacion.py` sin tocar el registro.
- Prompts en su propio módulo, como `prompt_v7_haiku_arranque.py`: `app/services/investigaciones/prompt_guion_v4_haiku.py` (`VERSION = 'guion-v4-haiku'`) y `app/services/planes/prompt_pasos_v5_haiku.py` (`VERSION = 'pasos-v5-haiku'`); `PROMPT` ya formateado con `{maximo_caracteres}` (160 / 180, constantes nuevas `MAXIMO_CARACTERES_PROMPT_GUION` y `MAXIMO_CARACTERES_PROMPT_PASO`) y `HASH`.
- `gemini.py` deja de importar `prompt_guion`/`prompt_sugerencias`; se quitan `sugerir_pasos` y `sugerir_preguntas` de `EvaluadorGemini` y de `EvaluadorFalso` (`registro/evaluacion.py`), con sus contadores y marcas. Quedan solo el diario y las cartas.

**Guion (§2)** — `app/services/investigaciones/sugerencias.py`
- Hoy `PROMPT_GUION_V2` + contexto en JSON + `{"preguntas": [...]}` → prompt v4, `armar_mensaje_guion(ContextoGuion)` con `<familia>`, `<base>` (una por línea, del catálogo), `<dia>`, `<necesita>`, `<duda>`; esquema `{dia|necesita|duda: {motivo, pregunta: str|null}}` sin propiedades adicionales (modelo Pydantic `RespuestaGuion` con `extra='forbid'`, `model_json_schema()` + `additionalProperties: False` en cada objeto).
- `filtrar_preguntas`: por campo, en orden dia→necesita→duda; con texto, termina en «?», un solo «¿», ≤ `MAXIMO_CARACTERES_PREGUNTA_GUION` (160 → **200**), sin repetir en `clave_pregunta` base, guion, sugerencias anteriores ni las ya aceptadas en esta respuesta. Devuelve `(campo, texto, motivo)`. Se elimina `MAXIMO_SUGERENCIAS_GUION` (el tope es uno por campo).
- Se mantiene: una llamada por versión de «lo que pienso», `texto_pobre`, LISTAS / SIN_SUGERENCIAS / ERROR, no guardar nada ante fallo.
- `datos/fijos.py:PREGUNTAS_BASE_GUION`: 3 → las 4 de §2.1 (BASE-1…BASE-4).
- `OrigenPreguntaGuion`: se retira `DUDA`. `acciones.py:101` y `schemas/investigaciones.py:76` pasan de «distinta de SUGERIDA» a «al menos una PROPIA», con los mismos mensajes.
- `SugerenciaGuionPublica` gana `campo` (`DIA`, `NECESITA`, `DUDA`; enumerado nuevo `CampoLoQuePienso`), también en `consultas.py:149`.

**Pasos (§3)** — `app/services/planes/sugerencias.py`
- `ContextoSugerencias`: quita familia, RIASEC, página web, tipo de institución y total; agrega `pasos_actuales` (textos de los pasos de la tarjeta y de las sugerencias PENDIENTE). `armar_mensaje_pasos` con `<carrera>`, `<institucion>` («nombre, pública|privada, ciudad» o «sin elegir»), `<camino>` (o «sin elegir»), `<tipos_paso>`, `<pasos_actuales>`, `<dudas>` o `<complicaciones>` numeradas y `<financiamiento>` solo con complicaciones.
- Esquema `{sugerencias: [{numero, clase (enum de 6), motivo, pasos: [{tipo (enum de PASOS), texto}]}]}`, sin propiedades adicionales.
- `validar_sugerencias`: tipo en PASOS, con texto, > `MAXIMO_CARACTERES_PASO` (140 → **220**) se **descarta** (hoy se corta); máximo `MAXIMO_PASOS_POR_DUDA` (2) y `MAXIMO_PASOS_POR_COMPLICACION` (nuevo, 2); números no enviados se ignoran; `no_aplica` → sin pasos aunque los traiga. Devuelve por número `(clase, motivo, pasos)`.
- `guardar_sugerencias`: guarda `clase` y `motivo` en cada sugerencia del LLM. Respaldo (§3.6) solo si la novedad es de lista (duda PREGUNTA o SUGERIDA, complicación de DIFICULTADES), no es `no_aplica` y la llamada falló / fuera de esquema / tope agotado / volvió sin pasos válidos (o sin entrada). Dudas propias y «Otro»: nada. Un paso por novedad, `generada_por = RESPALDO`, texto con `{carrera}` y la variante con o sin institución. Desaparecen «Averiguar: …» y «Ver qué puedo hacer con: …».
- Se mantiene: una llamada por guardado con novedades, `MAXIMO_LLAMADAS_SUGERENCIAS_POR_PLAN`, las dos transacciones.
- `DIFICULTADES`: sale `SALUD` (también de `b1-7-freno`, que usa la misma lista). Se ajusta solo lo que lea SALUD hoy (contenido, fixtures, pruebas vivas, front). Los casos de rondas cerradas (`tests/llm/casos/b1-7.json` y similares) no se cambian si nada vigente los carga (observación 3).

## Qué no cambia
- El registro: `llm/evaluacion.py`, `prompt_v7_haiku_arranque.py`, el flujo y `ClientePrueba` en lo que responde a los registros. El cliente sigue en `app/services/registro/llm/` (no se mueve de carpeta).
- El diario y las cartas siguen con Gemini (`evaluador_respuestas`, `EVALUADOR`); no se retira el adaptador.
- El eco `DIA/NECESITA/DUDA` de «lo que pienso» en `services/referencias.py:190` (registro LO_QUE_PIENSO): es otro uso de la duda y se queda.
- `MINIMO_IDEAL_PREGUNTAS`/`MAXIMO_IDEAL_PREGUNTAS` (6 y 8), la copia local `src/data/content/research.ts`, la estructura de `SugerenciasPasos.tsx`. No se reintentan sugerencias de pasos fallidas.

## Modelo de datos (lo pide el texto; sigue `/cambio-modelo`, una migración)
- `sugerencia_guion`: `campo` (`CampoLoQuePienso`, no nulo) y `motivo` (Text, no nulo). La migración borra las filas existentes (no hay datos reales).
- `pregunta_guion.origen`: sin `DUDA`; la migración pasa las filas DUDA a PROPIA antes de cambiar el enumerado.
- `sugerencia_tarjeta`: `clase` (`ClaseNovedadPlan`: DATO, EXPERIENCIA, SOBRE_MI, LO_QUE_DICEN, LISTA, NO_APLICA; nulo en las de respaldo) y `motivo` (Text, nulo en respaldo). No se exponen.
- **Decisión de diseño a aprobar:** tabla de catálogo nueva `respaldo_paso` para «dato cargado» de §3.6: `opcion_id` (único, FK a `opcion_lista`: la opción de PREGUNTAS_CONOCIMIENTO, DUDAS_SUGERIDAS o DIFICULTADES), `tipo_opcion_id` (PASOS), `texto` y `texto_sin_institucion`. Se llena desde `fijos.RESPALDOS_PASOS` (las 16 filas de §3.6, con las dos variantes escritas explícitamente), y la carga valida que toda opción de esas tres listas tenga su respaldo y que no haya respaldos sobrantes. Es catálogo, no estado.
- Documento: `docs/sistema/investigaciones.md` y `planes.md`.

## Pruebas
- `tests/soporte/soporte_llm.py`: `salida_guion(...)` y `salida_pasos(...)`; sin cola, `ClientePrueba` responde según el esquema recibido (guion: una pregunta válida por campo con texto; pasos: un paso por número leído del mensaje), así ruta corta, contrato y exportador siguen funcionando sin red.
- Reescribir con el cliente de prueba: `tests/unit/investigaciones/test_sugerencias_guion.py`, `tests/unit/planes/test_prompt_sugerencias.py` (mensaje, esquema, filtro, validación, respaldo), `tests/integration/investigaciones/test_investigacion_guion.py`, `tests/integration/planes/test_sugerencias_planes.py`, las partes de respaldo de `test_planes.py`, `soporte_investigaciones.py` y `test_ruta_corta.py` (sin `DUDA`). Casos nuevos: no_aplica sin respaldo, propia sin respaldo tras fallo, paso de 221 descartado, dos por complicación, `campo` en la sugerencia, guion terminado exige PROPIA. Adaptación autorizada por el texto (§1, «reescribir»); se anota en `decisiones.md`.
- `scripts/exportar_fixtures_front.py` y `scripts/verificar_leyenda.py`: sin `DUDA`; el exportador usa el cliente de prueba para las sugerencias.

## Corrida con Haiku (`tests/llm`, §4)
- Modos nuevos en `evaluar_tarjetas.py`: `--guion` y `--pasos` (con `--mostrar <id>` sin llamar y `--repeticiones`), con la lógica en un módulo aparte `tests/llm/sugerencias.py` para no engordar el runner. Arman el contexto desde el caso (sin base) y usan las mismas funciones del backend (`armar_mensaje_*`, esquema, filtro / validación, respaldo).
- Casos: `casos/guion-v4-haiku.json` (los 4 del playground + hasta ~15) y `casos/pasos-v5-haiku.json` (A–F + hasta ~15), con lo esperado.
- Chequeos automáticos de §4 y una columna para la lectura a ciegas; CSV e informe (con versión y hash del prompt) en `resultados/guion/` y `resultados/pasos/`. Una repetición; el informe resume lo que encuentro a mano. No cambio los prompts por lo que salga: lo anoto en el informe.

## Frontend (§2.6 y §3.7)
- `PasoLoQuePienso.tsx`: texto nuevo bajo la duda. `usePreguntasGuion.ts:42`: sin siembra. `PasoMisPreguntas.tsx`: sin bloque «Tu duda del paso anterior», tip fijo en la descripción, terminar exige una PROPIA. `SugerenciasLumi.tsx`: texto de «sin sugerencias» y rótulo «De tu duda» si `campo === 'DUDA'`. `adaptadoresInvestigaciones.ts:35`: solo PROPIA. `investigador.json`: «cuatro».
- `SeccionPasos.tsx`: tip fijo en «Mis pasos»; la franja y «Sugerencias · N» no se muestran con cero. Revisar en el navegador un paso de 220 caracteres en sugerencias, Mis pasos y lectura.
- `types/servidorInvestigaciones.ts`: `campo` y sin `DUDA`. Fixtures regenerados; pruebas del front que usen `DUDA` o SALUD, ajustadas. Modo local congelado.

## Fases (cada una con sus pruebas de impacto en verde y un commit)
1. Cliente compartido (`salida_json`), parámetros, `ClientePrueba` por esquema; servicios y API conectados a `cliente_llm`; Gemini sin guion ni pasos.
2. Guion: base, prompt, mensaje, esquema, filtro, columnas, orígenes, contrato y pruebas.
3. Pasos: prompt, contexto, validación, columnas, `respaldo_paso` y respaldo, DIFICULTADES sin SALUD, pruebas.
4. Corrida con Haiku de ambos usos e informe.
5. Front de Investigaciones y planes; fixtures; `npm run test:servidor`.
6. Cierre: suites completas de ambos repos, `decisiones.md`, `investigaciones.md`, `planes.md`, `registro.md` («Asistentes con Gemini»: solo diario), `ov_backend/AGENTS.md` (línea de `registro/`). La spec queda en curso.

## Observaciones del usuario al aprobar
1. Tabla `respaldo_paso`: aprobada como se propone.
2. Largo y tiempo de la llamada de pasos: en la fase 3, revisar si `MAXIMO_TOKENS_SALIDA_LLM` (2048) y `TIEMPO_MAXIMO_LLM_SEGUNDOS` (12) alcanzan para el caso más grande posible (5 dudas de conocimiento + 3 sugeridas + 2 propias en un guardado). Si no alcanzan, proponer cómo dar a esta llamada su propio tope de tokens y de tiempo sin cambiar los del registro, y consultarlo antes de implementarlo. En la fase 4, incluir ese caso en `pasos-v5-haiku.json` y anotar en el informe sus tokens de salida, latencia y parada.
3. `tests/llm/casos/b1-7.json` y los demás casos de rondas cerradas no se cambian si ningún runner o prueba vigente los carga; son evidencia. Solo se ajusta lo que lea SALUD hoy (contenido, fixtures, pruebas vivas). Si el runner actual deja fuera con aviso los casos cuya opción no existe, basta con eso.
4. Informe del guion: una sugerencia que repite una base con otras palabras es un defecto conocido y aceptado; va en una línea aparte («repite base»), no como fallo del caso.
5. Clave para la fase 4: comprobar que `ov_backend/.env` está ignorado por git (si no, detenerse y avisar); crearlo con una sola línea `ANTHROPIC_API_KEY=` escrita desde la variable de entorno, sin mostrar el valor en pantalla, archivo versionado, informe ni commit; no versionarlo ni subirlo. Primero una sola llamada de prueba: si falla por red o clave, detenerse y decir el error (sin la clave). Una repetición por caso; no relanzar la corrida completa sin consultar.

## Verificación
- Por fase, el subagente `pruebas` con las carpetas de impacto (`tests/unit|integration/investigaciones`, `…/planes`, `migraciones`, `datos`, `contrato`, `escenarios`); `uv run alembic heads` con un solo head.
- Front: `npm run test:servidor`, y al cierre `npm test`, `build`, `lint`, `check:estructura`; vista con el skill `run` para Investigaciones y Mis pasos.
- Al cierre: `uv run pytest -n auto -q`.
