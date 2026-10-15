# Respuesta al plan del lote B11 · Planes de carrera (v4)

La tarjeta se redefinió (ver `claude/caso-tarjeta-plan-v4.md`): pasa de diez campos sueltos a **cuatro secciones más medidores**, con guardado por sección, dudas que se convierten en pasos y un único uso del LLM. El plan B11 se adapta a eso. Donde este documento no diga nada, vale el plan original. Sigue siendo lote B (solo backend, exportar `ruta-planes`) y sigue usando el conjunto `ruta` con pocas actividades, solo para probar desbloqueos.

## 1. Decisiones que cambian el plan

1. **Secciones, no campos.** El catálogo `campo_tarjeta` se reemplaza por `seccion_tarjeta` con cuatro códigos: `POR_QUE`, `CONOCIMIENTO`, `REALIDAD`, `PASOS`. Los medidores, la carrera y la prioridad no son secciones: siempre se pueden fijar. `TipoObjetivo.CAMPO_PLAN` pasa a `SECCION_PLAN` (RNF-19 habla de «campos de las tarjetas»; se actualiza la redacción, es el mismo mecanismo).
2. **Guardado por sección.** Una sección se guarda entera con una sola acción; lo enviado reemplaza lo anterior de esa sección y nada más. Los efectos derivados (crear dudas, generar sugerencias, cerrar dudas) ocurren solo en ese guardado. Medidores y «paso hecho» son acciones instantáneas aparte.
3. **Estado por sección** en lugar de «completitud por campos»: `BLOQUEADA · POR_EMPEZAR · EN_PROCESO · LISTA`, con criterio de «lista» propio de cada sección (§3.3). El plan es «listo para comparar» cuando `POR_QUE` y `REALIDAD` están listas.
4. **Sin topes ni fechas.** Motivos, financiamiento, complicaciones y pasos no tienen máximo. Los pasos no tienen fecha; tienen estado `PENDIENTE | HECHO` y un hallazgo opcional al marcarse hecho.
5. **Listas comunes, no enumerados**, para motivos (VALORES), camino (CAMINOS, nueva), rubros (RUBROS_GASTO, + Preparación y Admisión), financiamiento (FINANCIAMIENTO), complicaciones (DIFICULTADES) y tipo de paso (PASOS). Se usa `ListaOpciones` / `OpcionLista` de la spec de registros; si aún no existe en el backend, B11 la crea. Frecuencia de gasto sí queda como enumerado (`UNICA, MENSUAL, POR_CICLO, ANUAL`) porque participa en el cálculo. Cada lista acepta «Otro» con texto.
6. **Medidores 1–3**, no 1–5.
7. **Aviso de misma área solo por familia** (`MISMA_FAMILIA`); se retira `MISMO_TIPO`.
8. **LLM en un solo lugar:** al guardar `CONOCIMIENTO` con dudas nuevas y al guardar `REALIDAD` con complicaciones nuevas, una llamada que devuelve pasos sugeridos. Sin LLM en el relato. Mismo cliente Gemini y mismo patrón de respaldo que las repreguntas de registro.
9. **Se retiran:** `motivacion`, `trayecto`, `fortalezas`, `debilidades`, `oportunidades`, `obstaculos`, la tabla `presupuesto` como entidad aparte (la institución pasa a la tarjeta), `fecha` en acciones, y «conversado en casa» (vive en Conversaciones).

## 2. Modelo de datos (`app/models/planes.py`, migración `0017_planes_de_carrera`)

**Catálogo (fijo)**
- `seccion_tarjeta`: `codigo` (POR_QUE, CONOCIMIENTO, REALIDAD, PASOS), `nombre`, `orden`, `para_comparar` (true en POR_QUE y REALIDAD).
- Listas comunes nuevas o ampliadas (`datos/fijos.py`): `CAMINOS` (Postular directamente · Prepararme primero · Estudiar y trabajar · Trabajar primero y luego estudiar · Empezar con una técnica y continuar · Tomarme un tiempo), `RUBROS_GASTO` (+ Preparación, Admisión; cada rubro con `frecuencia_recomendada` y `monto_referencia`), `FINANCIAMIENTO`, `DIFICULTADES`, `PASOS`, `VALORES`. Las tres dudas sugeridas fijas: lista `DUDAS_SUGERIDAS`.
- `ofrece` (relación Institución–Carrera): se agrega `duracion_ciclos` (nulo permitido). Sirve para el total de toda la carrera.

**Estado (todas en `TABLAS_DE_ESTADO`)**
- `tarjeta_carrera`: `cuenta_id`, `carrera_id`, `prioridad` (1–3), `creada_en`, `actualizada_en`, `idea_origen` (enum `OrigenIdea`: MIA, FAMILIA, CONOCIDO, TEST, PLATAFORMA; nulo), `relato` (Text, nulo), `institucion_id` (nulo), `camino_opcion_id` / `camino_otro` (nulo), `entusiasmo`, `capacidad`, `recursos` (int 1–3, nulos), y cuatro marcas `guardada_por_que_en`, `guardada_conocimiento_en`, `guardada_realidad_en`, `guardada_pasos_en` (nulas hasta el primer guardado de cada sección). Únicos `(cuenta, carrera)` y `(cuenta, prioridad)`.
- `motivo_tarjeta`: `tarjeta_id`, `posicion` (1 = principal), `opcion_id` (VALORES) o `texto_otro`.
- `conocimiento_tarjeta`: `tarjeta_id`, `pregunta` (enum `PreguntaConocimiento`: DIA_NORMAL, DONDE_TRABAJAR, CURSOS, INGRESO, CONOCE_ALGUIEN), `respuesta` (enum `RespuestaConocimiento`: SI, MAS_O_MENOS, NO). Único `(tarjeta, pregunta)`.
- `duda_tarjeta`: `tarjeta_id`, `origen` (enum: PREGUNTA, SUGERIDA, PROPIA), `pregunta` (nulo salvo origen PREGUNTA), `opcion_id` (nulo salvo SUGERIDA), `texto`, `estado` (ABIERTA, CERRADA), `creada_en`, `cerrada_por_paso_id` (nulo). Único `(tarjeta, pregunta)` cuando origen = PREGUNTA.
- `gasto_tarjeta`: `tarjeta_id`, `posicion`, `rubro_opcion_id` o `rubro_otro`, `monto` (int ≥ 0), `frecuencia` (`FrecuenciaGasto`).
- `financiamiento_tarjeta`: `tarjeta_id`, `opcion_id` (FINANCIAMIENTO) o `texto_otro`.
- `complicacion_tarjeta`: `tarjeta_id`, `opcion_id` (DIFICULTADES) o `texto_otro`, `creada_en`.
- `sugerencia_tarjeta`: `tarjeta_id`, `duda_id` o `complicacion_id` (exactamente uno), `tipo_opcion_id` (PASOS), `texto`, `estado` (PENDIENTE, ACEPTADA, DESCARTADA), `generada_por` (LLM, RESPALDO), `creada_en`.
- `paso_tarjeta`: `tarjeta_id`, `posicion`, `tipo_opcion_id` (PASOS), `texto`, `duda_id` / `complicacion_id` / `sugerencia_id` (nulos), `estado` (PENDIENTE, HECHO), `hallazgo` (Text, nulo), `hecho_en` (nulo).
- `cuenta.opcion_inicial_id` igual que en el plan.

**Enumerados:** `TipoObjetivo.SECCION_PLAN`; `TipoEventoUso.CREA_PLAN`, `ACTUALIZA_PLAN`, `ELIMINA_PLAN` (referencia: la carrera); `TipoReferencia.PLAN`, `PLANES`, `PASOS_PLAN_A`, `OPCION_INICIAL`. El reinicio vacía las nueve tablas y la opción inicial.

## 3. Backend

### 3.1 Parámetros (`app/core/parametros.py`)
`MAXIMO_PLANES = 3`, `CICLOS_POR_ANIO = 2`, `NUMERO_BLOQUE_OPCION_INICIAL = 2`, `MINIMO_CARACTERES_RELATO` (no visible al estudiante; reutilizar el de los registros si existe), `MAXIMO_LLAMADAS_SUGERENCIAS_POR_PLAN = 6`, `MAXIMO_PASOS_POR_DUDA = 2`.

### 3.2 Consulta `GET /cuentas/{c}/planes`
Sección PLANES cerrada: 409; no estudiante: 404. Una sola carga por tabla (sin N+1); presupuesto de consultas fijo.
```
{ planes: [{
    prioridad: "A", carrera: CarreraResumen, institucion: InstitucionResumen | null,
    idea_origen, motivos: [{opcion|otro, posicion}], relato,
    conocimiento: {DIA_NORMAL: "SI"|"MAS_O_MENOS"|"NO"|null, ...},
    dudas: [{id, origen, pregunta, texto, estado, hallazgo}],      // hallazgo = el del paso que la cerró
    camino, gastos: [{rubro|otro, monto, frecuencia}],
    totales_por_frecuencia, total_primer_anio, total_carrera | null,  // null sin duracion_ciclos
    financiamiento: [...], complicaciones: [{id, opcion|otro}],
    sugerencias: [{id, origen: {duda|complicacion, texto}, tipo, texto, estado, generada_por}],
    pasos: [{id, tipo, texto, origen, estado, hallazgo}],
    medidores: {entusiasmo, capacidad, recursos},
    secciones: [{codigo, estado: BLOQUEADA|POR_EMPEZAR|EN_PROCESO|LISTA, bloqueo: [MotivoBloqueo]|null, guardada_en}],
    lista_para_comparar: bool, actualizada_en }],
  avisos: [{tipo: "MISMA_FAMILIA", planes: ["A","B"], familia: {codigo, nombre}}],
  opcion_inicial: CarreraResumen | null, maximo_planes: 3 }
```
`total_primer_anio` = UNICA + 12·MENSUAL + CICLOS_POR_ANIO·POR_CICLO + ANUAL. `total_carrera` = UNICA + duración·(12·MENSUAL/… ) sobre `duracion_ciclos` cuando existe.

### 3.3 Estado de cada sección (en `services/planes.py`)
- `BLOQUEADA`: la regla `SECCION_PLAN` no la abrió (motivo con la actividad que la abre, como `motivos_bloqueo`).
- `POR_EMPEZAR`: abierta y `guardada_*_en` nulo.
- `LISTA` cuando: **POR_QUE** = idea_origen + ≥1 motivo + relato con ≥ `MINIMO_CARACTERES_RELATO`; **CONOCIMIENTO** = cinco respuestas; **REALIDAD** = institución + camino + ≥1 financiamiento; **PASOS** = ≥1 paso.
- `EN_PROCESO`: guardada y no lista.

### 3.4 Acciones (una transacción cada una con `ejecutar_accion`; todas exigen la sección PLANES)

| Ruta | Cuerpo | Evento | Errores |
|---|---|---|---|
| `POST /acciones/planes/crear` | `cuenta, carrera` | CREA_PLAN | 409 tope o repetida; 404 carrera |
| `POST /acciones/planes/guardar-seccion` | `cuenta, carrera, seccion, datos` (ver abajo) | ACTUALIZA_PLAN | 409 sección bloqueada (con mensaje y `progreso`, nada guardado); 422 validación |
| `POST /acciones/planes/medidores` | `cuenta, carrera, entusiasmo?, capacidad?, recursos?` (1–3) | ACTUALIZA_PLAN | 422 fuera de rango |
| `POST /acciones/planes/paso-hecho` | `cuenta, carrera, paso, hallazgo?` | ACTUALIZA_PLAN | 409 si el paso no es suyo o ya está hecho |
| `POST /acciones/planes/ordenar` | `cuenta, carreras` (permutación) | ACTUALIZA_PLAN | 422 |
| `POST /acciones/planes/eliminar` | `cuenta, carrera` | ELIMINA_PLAN | 409 |

`datos` por sección (reemplaza la sección completa):
- `POR_QUE`: `{idea_origen, motivos: [{opcion|otro}], relato}`.
- `CONOCIMIENTO`: `{respuestas: {DIA_NORMAL: ..., ...}, dudas: [{id?, origen: SUGERIDA|PROPIA, opcion?|texto}]}`. Efectos: por cada pregunta con MAS_O_MENOS/NO sin duda → crea `duda_tarjeta` (origen PREGUNTA, texto fijo por pregunta con `{carrera}`); pregunta que pasa a SI → su duda se cierra; dudas enviadas sin `id` se crean, dudas existentes no enviadas se borran (con sus sugerencias pendientes); **dudas nuevas → llamada al LLM (§3.6)**.
- `REALIDAD`: `{institucion, camino: {opcion|otro}, gastos: [...], financiamiento: [...], complicaciones: [{id?, opcion|otro}]}`. 422 si la institución no ofrece la carrera o un monto < 0. Al cambiar de institución pública a privada no se tocan montos (son del estudiante). **Complicaciones nuevas → llamada al LLM.**
- `PASOS`: `{pasos: [{id?, tipo, texto, sugerencia?}], sugerencias_descartadas: [id]}`. Un paso con `sugerencia` marca esa sugerencia ACEPTADA y hereda su origen; pasos existentes no enviados se borran salvo los HECHO (no se borran desde aquí: se conservan y se devuelven igual).

`paso-hecho`: marca HECHO con `hecho_en`, guarda `hallazgo`, cierra la duda origen (`cerrada_por_paso_id`); nada más. (Hoy no se cambia la respuesta de conocimiento: la consulta devuelve la duda cerrada con su hallazgo y el front muestra «averiguado».)

### 3.5 Opción inicial
Como en el plan: al crear, si no hay opción inicial y no se completó el bloque `NUMERO_BLOQUE_OPCION_INICIAL`. No cambia después.

### 3.6 Sugerencias con LLM (`services/sugerencias_planes.py`)
- Se invoca dentro de `guardar-seccion` CONOCIMIENTO y REALIDAD solo si hay dudas o complicaciones **nuevas** en ese guardado, y si el plan no superó `MAXIMO_LLAMADAS_SUGERENCIAS_POR_PLAN`. Una llamada por guardado con todas las novedades.
- Entrada: carrera (nombre, familia, tipo), institución (nombre, tipo, ciudad, web) y camino si existen, la lista PASOS, y las dudas o complicaciones nuevas con id y origen. No recibe nada más del estudiante.
- Prompt y ejemplos: `claude/caso-tarjeta-plan-v4.md` §2.3–2.5. Salida JSON `[{duda|complicacion: id, pasos: [{tipo, texto}]}]`, máximo `MAXIMO_PASOS_POR_DUDA` por duda y 1 por complicación; `tipo` debe estar en PASOS (si no, se descarta ese paso); `texto` ≤ 140 caracteres.
- Resultado: filas en `sugerencia_tarjeta` con `generada_por = LLM`. Si la llamada falla, se agota el tope o la respuesta no parsea: una fila `RESPALDO` por duda («Averiguar: {texto}», tipo Averiguar la admisión / el de «investigar») y por complicación («Ver qué puedo hacer con: {texto}», tipo «otra»).
- Mismo cliente y mismas pruebas con el modelo simulado que en B03; sin llamada real en la suite.

### 3.7 Motor y referencias
- `SECCION_PLAN` en `MODELOS_OBJETIVO` (estudiante); `SeccionTarjeta` en la caché de definiciones; los tres eventos en `MODELOS_REFERENCIA` → `Carrera`.
- Evaluadores: `planes_listos_para_comparar(n)` = al menos n planes con POR_QUE y REALIDAD en LISTA; `pasos_plan_a(n)` = el plan A tiene ≥ n pasos (cualquier estado).
- Referencias sin fuente: `PLANES` (opciones carrera por prioridad); `PLAN` (plan A: `texto` = carrera, `cita` = relato, `opciones` = motivos; SIN_DATO sin planes); `PASOS_PLAN_A` (opciones `{codigo tipo, texto}` por posición); `OPCION_INICIAL`.
- Ninguna actividad escribe en los planes.

## 4. Datos de prueba (`datos/ruta.py`)
- Reglas `SECCION_PLAN`: `t-inicio` abre `POR_QUE`; `t-valores` abre `CONOCIMIENTO`; `t-explorar` abre `REALIDAD`; `t-comparar` abre `PASOS`. Cada una con `mensaje_bloqueo` que nombra la actividad.
- `t-comparar` y `t-proyecto` como en el plan; `t-comparar` con referencia PLANES; `t-proyecto` con PLAN, PASOS_PLAN_A y OPCION_INICIAL.
- `R-t-comparar`: ACTUALIZA_PLAN ≥ 1 + `planes_listos_para_comparar(2)`. `R-t-proyecto`: ACTUALIZA_PLAN ≥ 1 + `pasos_plan_a(1)` (dejar 1 por ahora; el parámetro queda en la regla por si se sube a 3).
- Fixture de instituciones: al menos una pública y una privada que ofrezcan la misma carrera, con `duracion_ciclos`.

## 5. Cambios en el catálogo de requisitos (E08 y relacionadas)

| HU | Cambio |
|---|---|
| HU-044 | Reescribir: «registrar en una tarjeta de carrera de quién fue la idea, los motivos por los que la elijo y qué viví que me hizo pensar en ella, para fundamentar esa opción con mis propias razones». Se retiran motivación, trayecto y las cuatro listas. |
| HU-045 | Reescribir: «definir en una tarjeta de carrera dónde la estudiaría, cómo llegaría a ella, cuánto me costaría el primer año (cada gasto con rubro, monto y frecuencia), cómo lo financiaría y qué podría complicarlo, para saber qué tan real es esa opción». |
| HU-046 | Reescribir: «registrar en una tarjeta de carrera los pasos con los que averiguo o me preparo para esa carrera, con su tipo, marcarlos como hechos y anotar qué averigüé, para pasar de las dudas a acciones concretas». Sin fecha. |
| HU-048 | «consultar el estado de cada sección de mis planes de carrera (bloqueada, por empezar, en proceso, lista) y cuáles están listos para comparar». |
| HU-097 | Escala 1 a 3 (Poco · Algo · Mucho). |
| HU-098 | «…pertenecen a la misma familia de carreras». Se retira el tipo RIASEC. |
| HU-099 | «consultar qué secciones de mis tarjetas…». |
| **HU-100 (nueva)** | Estudiante: «responder en una tarjeta de carrera qué tanto conozco de ella (su día a día, dónde trabajaría, qué cursos, cómo se ingresa, si conozco a alguien) y anotar mis dudas, para saber qué me falta averiguar». |
| **HU-101 (nueva)** | Estudiante: «recibir pasos sugeridos a partir de mis dudas y de lo que podría complicar mi plan, y aceptarlos, editarlos o descartarlos, para saber cómo resolverlos». Depende de LLM; respaldo sin modelo. |
| HU-086 | Agregar: idea de origen, dudas abiertas y cerradas, complicaciones, sugerencias aceptadas, estado por sección. |
| RNF-19 | «…secciones de las tarjetas de carrera…». |
| Glosario | Agregar: sección de tarjeta, duda, sugerencia de paso, hallazgo, complicación, listo para comparar. Retirar: trayecto, campo de tarjeta. |

HU-049 sigue fuera de B11.

## 6. Pruebas
- `tests/integration/planes/`: tope y repetida; sección bloqueada → 409 y nada guardado; estado por sección (POR_EMPEZAR → EN_PROCESO → LISTA con cada criterio); `lista_para_comparar`; guardar CONOCIMIENTO crea dudas por MAS_O_MENOS/NO y cierra al pasar a SI; dudas eliminadas se llevan sus sugerencias pendientes; sugerencias con el modelo simulado (tipos inválidos descartados, texto recortado) y respaldo cuando falla o se agota el tope; guardar REALIDAD: institución que no ofrece → 422, totales por frecuencia, `total_carrera` nulo sin duración; guardar PASOS acepta sugerencias y conserva pasos hechos; `paso-hecho` cierra la duda y guarda hallazgo; medidores 1–3; aviso MISMA_FAMILIA (y ausencia de MISMO_TIPO); opción inicial; ordenar y eliminar; sección PLANES cerrada; ninguna actividad escribe en planes; presupuesto de consultas de `GET /planes`.
- `tests/integration/referencias/`: PLAN (con cita), PLANES, PASOS_PLAN_A, OPCION_INICIAL.
- `tests/unit/motor`: los dos evaluadores.
- `test_ruta_corta.py`: crear dos planes → POR_QUE en ambos → CONOCIMIENTO (dudas, sugerencias simuladas) → REALIDAD → `t-comparar` se abre → PASOS acepta una sugerencia → `t-proyecto` se abre → paso hecho → cerrar T2.
- `desarrollo`: reinicio vacía las nueve tablas. Fixture `ruta-planes.json`.

## 7. Fases
1. **Modelo y datos:** modelos, enumerados, listas comunes nuevas, `duracion_ciclos`, migración 0017, `fijos.py`, `ruta.py`, cargador, `TABLAS_DE_ESTADO`, `docs/sistema/motor.md`.
2. **Servicio y API:** consulta, estado por sección, crear, guardar-seccion (las cuatro, con efectos de dudas), medidores, paso-hecho, ordenar, eliminar, avisos, opción inicial, totales. Sin LLM todavía (sugerencias solo RESPALDO).
3. **Sugerencias con LLM:** servicio, prompt, parseo, tope, pruebas con modelo simulado.
4. **Motor y referencias:** evaluadores, referencias, requisitos de `t-comparar` y `t-proyecto`.
5. **Escenario, presupuestos, fixtures y documentación:** `test_ruta_corta.py`, exportador, `docs/sistema/`, `plan-iteraciones.md`, catálogo de requisitos (§5). Suite completa de ambos repos.

## 8. Respuestas a las preguntas abiertas del plan
1. Asignación en `ruta`: `t-inicio` → POR_QUE, `t-valores` → CONOCIMIENTO, `t-explorar` → REALIDAD, `t-comparar` → PASOS (§4). Dato de prueba.
2. `PLAN` = plan A sin parámetro, pero devuelve también `cita` (relato) y `opciones` (motivos), porque 4.5 y 5.1 citan el relato.
3. Frecuencias como enumerado, sí. Rubros, tipos de paso, financiamiento, dificultades, motivos y camino como listas comunes (decisión previa, M20–M22). `total_primer_anio` calculado, y `total_carrera` calculado solo si la institución tiene duración.

## 9. Fuera de B11 (anotar para después)
- «Es a propósito» en el aviso de misma familia (persistir que el estudiante ya respondió).
- HU-049 (sugerencia de revisar planes al completar instrumentos).
- Eventos de cambio de plan A para «Mirar el camino» (ordenar ya deja ACTUALIZA_PLAN; derivar después si hace falta).
- Panel de la orientadora (HU-086) y temas para conversar por regla.
