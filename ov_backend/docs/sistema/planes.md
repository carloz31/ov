# Planes de carrera

Cada estudiante desarrolla hasta tres planes de carrera (HU-043 a 048, 050, 097 a 099, 109 y 110). Cada plan es una tarjeta con cuatro secciones que se abren a medida que avanza el camino, más medidores y prioridad. Código: `app/models/planes.py`, `app/services/planes/` (`consultas.py`, `acciones.py`, `sugerencias.py`), `app/schemas/planes.py` y `app/api/planes.py`. Todo exige la sección PLANES abierta: si está cerrada, 409 con su mensaje; una cuenta que no es de estudiante recibe 404.

## Modelo

| Tabla | Qué guarda |
|---|---|
| `seccion_tarjeta` | Catálogo fijo: POR_QUE, CONOCIMIENTO, REALIDAD y PASOS, con `orden` y `para_comparar` (POR_QUE y REALIDAD). Objetivo `SECCION_PLAN` del motor. |
| `referencia_rubro` | Por opción de RUBROS_GASTO: `frecuencia_recomendada`, `monto_referencia` (nulo si se consulta en la institución: Matrícula y Pensión, migración 0034), `cero_si_publica` y `solo_si_camino_prepara`. Tener fila es lo que hace que el front lo proponga. |
| `referencia_camino` | Por opción de CAMINOS: `incluye_preparacion`. |
| `tarjeta_carrera` | `cuenta_id`, `carrera_id`, `prioridad` (1 = A; nula si está inactiva), `activa` (migración 0035), `creada_en`, `actualizada_en`, `idea_origen` (`OrigenIdea`), `relato`, `institucion_id`, `camino_opcion_id` o `camino_otro`, medidores `entusiasmo`, `capacidad` y `recursos` (1 a 3), una marca `guardada_*_en` por sección, contadores `ultimo_numero_*` y `llamadas_sugerencias`. Únicos `(cuenta, carrera)` y `(cuenta, prioridad)`; CHECK `prioridad_si_activa` (activa con prioridad, inactiva sin ella). |
| `motivo_tarjeta` | Motivos por `posicion` (1 = principal): opción de VALORES o `texto_otro`. |
| `conocimiento_tarjeta` | Respuesta (`SI`, `MAS_O_MENOS`, `NO`) a cada `PreguntaConocimiento`: DIA_NORMAL, DONDE_TRABAJAR, CURSOS, INGRESO, CONOCE_ALGUIEN. |
| `duda_tarjeta` | `numero`, `origen` (PREGUNTA con su `pregunta`, SUGERIDA con su opción de DUDAS_SUGERIDAS, PROPIA), `texto`, `estado` (ABIERTA, CERRADA) y `cerrada_por_paso_id`. Una por pregunta. |
| `gasto_tarjeta` | Por `posicion`: rubro de RUBROS_GASTO o `rubro_otro`, `monto` (soles, ≥ 0) y `frecuencia` (`FrecuenciaGasto`: UNICA, MENSUAL, POR_CICLO, ANUAL). |
| `financiamiento_tarjeta`, `complicacion_tarjeta` | Opción de FINANCIAMIENTO o DIFICULTADES, u «Otro» con texto. La complicación lleva `numero`. |
| `sugerencia_tarjeta` | `numero`, su duda **o** su complicación, tipo de PASOS, `texto`, `estado` (PENDIENTE, ACEPTADA, DESCARTADA), `generada_por` (LLM, RESPALDO) y, en las del LLM, `clase` (`ClaseNovedadPlan`) y `motivo` (migración 0055; no se exponen). |
| `respaldo_paso` | Catálogo: el paso fijo de respaldo de cada opción de PREGUNTAS_CONOCIMIENTO, DUDAS_SUGERIDAS y DIFICULTADES (ver «Sugerencias de pasos»). |
| `paso_tarjeta` | `numero`, `posicion`, tipo de PASOS, `texto`, origen (duda, complicación o sugerencia), `estado` (PENDIENTE, HECHO), `hallazgo` y `hecho_en`. |
| `cuenta.opcion_inicial_id` | La carrera de la opción inicial. |
| `institucion.gestion`, `institucion_carrera.duracion_ciclos` | Pública o privada (nula si no se conoce) y duración de la carrera en esa institución (nula si no se conoce). |

- Toda opción «o Otro» lleva exactamente una de las dos (CHECK `opcion_u_otro`).
- Dudas, complicaciones, sugerencias y pasos se identifican en la API por `numero`: una secuencia por tipo y por tarjeta que nunca se reutiliza, aunque se borre la fila (contadores `ultimo_numero_*`). La API nunca expone ids internos.
- `duda_tarjeta.cerrada_por_paso_id` y `paso_tarjeta.duda_id` forman un ciclo: la primera clave lleva `use_alter` y la migración la crea al final.
- Borrar una duda o una complicación borra todas sus sugerencias; los pasos que salieron de ellas conservan texto, tipo y estado, con su origen en nulo (`ON DELETE SET NULL`). Eliminar un plan no lo borra: queda inactivo y conserva todo lo suyo (las claves siguen con `ON DELETE CASCADE` por si un día se purgan).
- **Planes inactivos.** Un plan inactivo no existe para la cuenta: no sale en la consulta ni en las referencias, no cuenta para el tope, para `planes_listos_para_comparar` ni para `pasos_plan_a`, y las acciones sobre él responden 409 como si no hubiera plan. Volver a crear esa carrera lo reactiva con todo lo suyo, al final del orden.
- `prioridad` tiene CHECK `>= 1`: ordenar pasa por prioridades temporales mayores que `MAXIMO_PLANES`, porque ni SQLite ni PostgreSQL difieren el único. El tope lo garantiza el servicio.
- Las nueve tablas de la tarjeta son estado (`TABLAS_DE_ESTADO`); el reinicio de desarrollo también pone `cuenta.opcion_inicial_id` en nulo.

## Secciones y su estado

Las secciones se abren por cuenta, para todas sus tarjetas, con reglas `SECCION_PLAN` (`motor.md`). Los medidores, la carrera y la prioridad no son secciones: siempre se pueden fijar.

| Estado | Cuándo |
|---|---|
| BLOQUEADA | La regla no la abrió; `bloqueo` trae el motivo, con la actividad que la abre. |
| POR_EMPEZAR | Abierta y nunca guardada. |
| LISTA | Guardada y cumple su criterio (abajo). |
| EN_PROCESO | Guardada y no lista. |

- **POR_QUE:** idea de origen, al menos un motivo y relato de al menos `MINIMO_CARACTERES_RELATO` (= `MIN_CARACTERES_RESPALDO`, 40; no se muestra al estudiante).
- **CONOCIMIENTO:** las cinco respuestas.
- **REALIDAD:** institución, camino y al menos una forma de financiamiento.
- **PASOS:** al menos un paso.

Un plan está **listo para comparar** cuando todas sus secciones `para_comparar` están en LISTA.

## Consulta

`GET /cuentas/{c}/planes` → `PlanesCuenta`, con una lectura por tabla sea cual sea el número de planes:
- `planes`, por prioridad (`A`, `B`, `C`): `carrera`, `institucion` (con `gestion` y `duracion_ciclos` de la carrera en ella, nula si no se conoce; F07b), `idea_origen`, `motivos`, `relato`, `conocimiento` (las cinco preguntas, nulas sin respuesta), `dudas` (con el `hallazgo` del paso que la cerró), `camino`, `gastos`, `totales_por_frecuencia`, `total_primer_anio`, `total_carrera`, `financiamiento`, `complicaciones`, `sugerencias` (con su `origen`: número de duda o complicación y su texto), `pasos` (con su `origen`), `medidores`, `secciones` (`codigo`, `nombre`, `estado`, `bloqueo`, `guardada_en`), `lista_para_comparar` y `actualizada_en`;
- `avisos`: `MISMA_FAMILIA` con las prioridades de los planes de una misma familia de carreras (HU-098). Es un dato para el informe de la orientadora: el front no se lo muestra al estudiante (ajuste coherencia-bloque0);
- `opcion_inicial` y `maximo_planes`;
- `opciones`: las listas de la tarjeta (`valores`, `caminos` con `incluye_preparacion`, `rubros` con su referencia, `financiamiento`, `dificultades`, `pasos`, `dudas_sugeridas`) y las `preguntas` de conocimiento con su `texto` y el `texto_duda` que crean, ambos con `{carrera}`; y `ciclos_por_anio` (F07b).

**Totales.** `total_primer_anio` = UNICA + 12·MENSUAL + `CICLOS_POR_ANIO`·POR_CICLO + ANUAL. Con la duración de la carrera en la institución elegida, `total_carrera` = UNICA + ciclos·(MENSUAL·12 / `CICLOS_POR_ANIO` + POR_CICLO) + ANUAL·ciclos / `CICLOS_POR_ANIO`, calculado exacto (7 ciclos son 3,5 años) y redondeado a entero solo al final; sin duración, nulo. El front repite la fórmula en vivo mientras se edita REALIDAD, con `opciones.ciclos_por_anio` y la `duracion_ciclos` de la institución elegida (la del plan o la de `InstitucionEnCarrera` del detalle de carrera, F07b); en lectura muestra los totales del servidor.

**Gastos propuestos.** Los arma el front con `opciones` en cada edición: los rubros con `frecuencia_recomendada` (Preparación solo si el camino incluye prepararse; Alimentación y Vivienda nunca), con su frecuencia y el monto vacío; `monto_referencia` se muestra como pista, y sin él, «Consúltalo en su página». El único monto escrito de antemano es Pensión en 0 si la institución es pública. Una fila con el monto vacío no se envía. El backend no inserta gastos: solo valida lo que llega en REALIDAD.

## Acciones

Bajo `/acciones/planes/`. Cada una exige PLANES, valida todo antes de escribir, registra un evento con la carrera del plan (`CREA_PLAN`, `ACTUALIZA_PLAN` o `ELIMINA_PLAN`) y responde `RespuestaAccion`. Ninguna actividad escribe en los planes.

| Ruta | Cuerpo | Errores |
|---|---|---|
| `crear` | `cuenta, carrera` (si la carrera tuvo un plan eliminado, lo recupera) | 409 si la carrera ya tiene plan activo, con tres planes activos o si la carrera no es favorita de la cuenta (F07a; desmarcarla después no toca el plan); 404 carrera inexistente |
| `guardar-seccion` | `cuenta, carrera, seccion, datos` | 409 sección bloqueada (mensaje y `progreso`, nada guardado) o sin plan; 422 validación |
| `medidores` | `cuenta, carrera, entusiasmo?, capacidad?, recursos?` (1 a 3; lo enviado reemplaza) | 422 fuera de rango |
| `paso-hecho` | `cuenta, carrera, paso, hallazgo?` | 409 si el paso no es suyo o ya está hecho |
| `ordenar` | `cuenta, carreras` (todas, en orden A, B, C) | 422 si no es una permutación de sus planes |
| `eliminar` | `cuenta, carrera` (lo deja inactivo, sin prioridad) | 409 sin ese plan activo; los demás suben sin dejar huecos |

`datos` de `guardar-seccion` reemplaza la sección entera y nada más; sus efectos ocurren solo ahí:
- **POR_QUE:** `idea_origen`, `motivos` (`[{opcion | otro}]`, el primero es el principal, sin repetir) y `relato`.
- **CONOCIMIENTO:** `respuestas` (`{pregunta: SI | MAS_O_MENOS | NO}`) y `dudas` (`[{numero}]` para conservar, `{origen: SUGERIDA, opcion}` o `{origen: PROPIA, texto}` para crear). Una pregunta con MAS_O_MENOS o NO crea su duda (texto de DUDAS_CONOCIMIENTO con la carrera); con SI, la cierra; si vuelve a MAS_O_MENOS o NO y se había cerrado con «sí», se reabre. Las sugeridas o propias omitidas se borran.
- **REALIDAD:** `institucion` (debe ofrecer la carrera; si no, 422), `camino` (`{opcion | otro}`), `gastos` (`[{rubro | otro, monto, frecuencia}]`), `financiamiento` y `complicaciones` (`[{numero}]` o `{opcion | otro}` de DIFICULTADES; las omitidas se borran). Cambiar de institución no toca los montos.
- **PASOS:** `pasos` (`[{numero, tipo?, texto?}]` para conservar o editar un pendiente; `{sugerencia, tipo?, texto?}` para aceptar una sugerencia pendiente, con su texto editable; `{tipo, texto}` para uno nuevo) y `sugerencias_descartadas`. Los pasos pendientes omitidos se borran; los hechos se conservan al final.

`paso-hecho` marca el paso, guarda el hallazgo y cierra la duda de la que salió (la consulta la devuelve CERRADA con su hallazgo).

**Opción inicial.** Al crear un plan, si la cuenta no tiene opción inicial y no completó el bloque MISIONES_CAMPO del estudiante con número `NUMERO_BLOQUE_OPCION_INICIAL` (en `ruta`, T1), esa carrera queda como opción inicial. No cambia después, aunque se elimine el plan; recuperar un plan eliminado sigue la misma regla que crearlo.

## Sugerencias de pasos (HU-110; ajuste llm-sugerencias)

**Cuándo.** Al guardar CONOCIMIENTO con dudas nuevas o REALIDAD con complicaciones nuevas, una sola llamada al LLM con todas las novedades de ese guardado. Volver a guardar no regenera. Tope: `MAXIMO_LLAMADAS_SUGERENCIAS_POR_PLAN` (6) intentos por plan, contados en `llamadas_sugerencias` aunque fallen.

**Dos transacciones.** Como el registro: la primera guarda la sección, sus novedades y el evento; la llamada va fuera de toda transacción, y la segunda guarda las sugerencias de las novedades que siguen existiendo sin sugerencias. Si la segunda falla, la sección queda guardada sin sugerencias. El estudiante espera la llamada con el botón de guardar en carga.

**Cliente.** Claude Haiku (`app.state.cliente_llm`, `claude-haiku-5-5`, esfuerzo `low`), el mismo cliente del registro, con topes propios para esta llamada: `MAXIMO_TOKENS_SALIDA_PASOS` (6000) y `TIEMPO_MAXIMO_PASOS_SEGUNDOS` (30), **provisionales** hasta decidirlos con la medición de `tests/llm` (1, 3, 5, 8 y 10 dudas). Las pruebas usan `ClientePrueba` (`tests/soporte/soporte_llm.py`): sin cola, un paso por novedad; `salida_pasos(...)` arma una salida a medida y `fallar_pasos` hace fallar todas las llamadas de pasos.

**Prompt** `pasos-v5-haiku` (`services/planes/prompt_pasos_v5_haiku.py`, con `VERSION` y `HASH`; pide pasos de hasta `MAXIMO_CARACTERES_PROMPT_PASO`, 180). El modelo clasifica cada novedad (`clase`: dato, experiencia, sobre_mi, lo_que_dicen, lista, no_aplica) antes de proponer, escribe los pasos en infinitivo y primera persona y pone la pregunta de una conversación dentro del paso.

**Mensaje** (`armar_mensaje`, con etiquetas): `<carrera>`; `<institucion>` («nombre, pública|privada, ciudad» o «sin elegir»); `<camino>` (o «sin elegir»); `<tipos_paso>` (código y etiqueta de PASOS, uno por línea); `<pasos_actuales>` (los textos de los pasos del plan y de las sugerencias pendientes, uno por línea); `<financiamiento>`, solo con complicaciones; y `<dudas>` o `<complicaciones>` numeradas con el número de la tarjeta. Nada más del estudiante: ni relato, ni resultados, ni respuestas de registro, ni RIASEC, familia, página web o total del primer año. Los textos son datos, nunca instrucciones.

**Salida** con esquema JSON (`salida_json`): `{sugerencias: [{numero, clase, motivo, pasos: [{tipo, texto}]}]}`, `tipo` limitado a los códigos de PASOS, sin propiedades adicionales. Fallo, tiempo agotado, parada distinta de `end_turn` (también `max_tokens`) o salida fuera del esquema: la llamada no sirve y van los respaldos.

**Validación** (`validar_sugerencias`), por novedad:
- Se ignoran los números que no se enviaron y la segunda entrada de un mismo número.
- Un paso vale si su tipo está en PASOS, tiene texto y no supera `MAXIMO_CARACTERES_PASO` (220); el que lo supera se descarta, no se corta.
- A lo sumo `MAXIMO_PASOS_POR_DUDA` (2) por duda y `MAXIMO_PASOS_POR_COMPLICACION` (2) por complicación.
- Con `clase = no_aplica` no se crea ninguna sugerencia.
- Las sugerencias del LLM guardan `clase` y `motivo` (no se exponen).

**Respaldo fijo** (`generada_por = RESPALDO`, sin clase ni motivo), un paso por novedad, solo para las de lista (dudas de una pregunta de conocimiento o sugeridas, complicaciones de DIFICULTADES), cuando la llamada falló o no sirvió, se agotó el tope, o la novedad volvió sin ningún paso válido (o no volvió), salvo que su clase sea `no_aplica`. Dudas propias y complicaciones «Otro» no reciben nada. Los textos son dato cargado: tabla `respaldo_paso` (`opcion_id` de PREGUNTAS_CONOCIMIENTO, DUDAS_SUGERIDAS o DIFICULTADES; tipo; `texto` con `{carrera}` e `{institucion}`; `texto_sin_institucion`), desde `fijos.RESPALDOS_PASOS`. La carga exige exactamente uno por opción de esas tres listas.

**Para revisar a mano** (la validación solo comprueba lo estructural): que nada de lo que «puede existir o no» (una persona de la carrera, charlas, talleres, una entrevista publicada) aparezca como si existiera; que no responda la duda, no opine ni dé cifras, fechas, puntajes o direcciones web; que no se le pregunte a una persona cuánto gana. La corrida con el modelo real está en `tests/llm` (modo `--pasos`).

## Motor y referencias

- Reglas `SECCION_PLAN` abren las secciones; los evaluadores `planes_listos_para_comparar` y `pasos_plan_a` son los requisitos de comparar (4.5) y del proyecto (5.1) (`motor.md`). Sus reglas se reevalúan con ACTUALIZA_PLAN.
- Referencias sin fuente PLANES, PLAN (con `cita`), PASOS_PLAN_A y OPCION_INICIAL (`referencias.md`).

## Carga

- `datos/fijos.py`: `SECCIONES_TARJETA`; las listas comunes VALORES (también la del registro 2.3), CAMINOS, RUBROS_GASTO, FINANCIAMIENTO, PASOS (sus códigos son los que recibe y devuelve el LLM), DUDAS_SUGERIDAS, PREGUNTAS_CONOCIMIENTO y DUDAS_CONOCIMIENTO (con los códigos de `PreguntaConocimiento`, que el cargador exige); `REFERENCIAS_RUBROS`, `CAMINOS_CON_PREPARACION` y `RESPALDOS_PASOS`. DIFICULTADES se reutiliza (también en `b1-7-freno`); desde el ajuste llm-sugerencias ya no tiene «Mi salud o la de alguien cercano».
- `datos/ruta.py`: reglas `R-PLAN-*`, `t-comparar` y `t-proyecto` con sus reglas y referencias, la gestión de las instituciones y `DURACIONES_CICLOS` (ver `integracion.md`).

## Fuera de B11

- HU-049: sugerir revisar los planes al completar un cuestionario, un caso o una comprobación, o al publicar una entrevista.
- Eventos propios de cambio de plan A (ordenar ya deja ACTUALIZA_PLAN).
- Lo que ve la orientadora de las tarjetas (HU-086, B14) y los temas para conversar.
- El cliente de Claude vive en `services/registro/llm/` aunque ya lo usan el guion y los planes.
