# Motor de desbloqueos

Cómo funciona hoy el núcleo de la plataforma: las acciones registran eventos, y las reglas convierten esos eventos en desbloqueos. Código: `app/services/motor/`, `app/services/actividades.py`, `app/services/cuentas.py` y servicios de cada dominio. Datos: `datos/ruta.py`.

## Modelo

| Grupo | Tablas |
|---|---|
| Cuentas | `cuenta` (rol ESTUDIANTE, APODERADO u ORIENTADORA; `salon_id`, `correo`, `contrasena_hash` (Argon2id), `activa`, `intentos_fallidos` y `bloqueada_hasta` para el bloqueo temporal de ingreso, B17), `salon`, `orientadora_salon` (`es_principal`), `vinculo_familiar` (estudiante, apoderado, `parentesco`, `es_activo` y sus cartas) |
| Catálogo | `bloque` (espacio MISIONES_CAMPO, CIUDAD, PORTAL_FAMILIA o LUMI, este último para los recuerdos de Lumi: el mapa no lo pinta y sus actividades son opcionales, audiencia), `actividad` (tipo INFORMATIVA, REGISTRO, CUESTIONARIO, CASO o BATALLA; `orden`, `contenido`, `visibilidad`, `requerida`, `duracion_estimada_min`, `descripcion`, `puntaje_minimo` y `puntaje_maximo` solo en CASO, en puntos de satisfacción: el máximo es el total de necesidades del caso, y el cargador lo valida contra `CONFIGURACION_CASOS` de `ruta.py`), `actividad_dimension` (tipos RIASEC de un caso, uno o varios; solo CASO, lo valida el cargador), `seccion` (audiencia), `ficha` (audiencia), `testimonio` (`pista`, que se muestra mientras está bloqueado; `persona`, `ocupacion_id`, `anios_experiencia` y `cita`; el caso que lo regala no es columna: se deduce de su regla SUPERA_CASO), `pregunta_diario` (ver «Diario»), `conversacion` (`orden`, preguntas de cada rol, `preguntas_guia`, `mensaje_diferencias`; ver «Conversaciones»), `grupo_insignia` (página del pasaporte: `codigo`, `nombre`, `orden`), `insignia` (`es_oculta`, audiencia, `grupo_id`, `orden` dentro del grupo, `pista`, que se muestra mientras una oculta no se obtiene, `descripcion` (su historia), `requisito` (lo que pide), `frase` (la frase destacada) y `logro` (cómo se consiguió, en pasado)), `nivel` (`titulo`, `descripcion`, `cita_lumi`), `familia_carrera`, `carrera` |
| Estado de la cuenta | `progreso_actividad` (EN_CURSO o COMPLETADA, `posicion`), `resultado_caso`, `resultado_batalla` y `respuesta_batalla` (cada intento y sus respuestas: `victoria`, `aciertos`, `preguntas`), `coleccion_ocupacion` (ocupaciones obtenidas al superar un caso, una vez por cuenta), `recomendacion`, `entrada_diario` y `contador_diario` (ver «Diario»), `check_in`, `entrevista`, `entrevista_autor`, `conversacion_vinculo`, las tablas de la tarjeta de carrera y `cuenta.opcion_inicial_id` (B11; ver «Secciones de la tarjeta»), `insignia_vitrina` (hasta 3 insignias obtenidas que la cuenta muestra, con `orden` 1–3; ver «Vitrina») |
| Motor | `evento_uso`, `regla_desbloqueo` (`mensaje_bloqueo` obligatorio), `condicion_desbloqueo` (`texto`: lo que pide, para mostrarlo tal cual; nulo si no tiene), `desbloqueo` (único por cuenta y regla; `fecha_hora`, `visto`) |

`id_objetivo` de una regla e `id_referencia` de un evento o condición son referencias polimórficas sin FK; los cargadores resuelven códigos a ids. `id_objetivo` nunca es nulo.

**Secciones.** Partes del perfil que se abren con reglas como cualquier objetivo (`SECCION`). Las fijas están en `datos/fijos.py`: DIARIO, CHECK_IN, CATALOGO, PLANES y FAMILIA del estudiante, y CONVERSACIONES del apoderado. Cada ruta decide con sus reglas cuándo se abre cada una. La migración `0004` convirtió las reglas del antiguo objetivo CONVERSACIONES en reglas de esa sección.

**Secciones de la tarjeta (B11).** Cada tarjeta de carrera tiene cuatro secciones, fijas en `seccion_tarjeta` (`datos/fijos.py`): POR_QUE, CONOCIMIENTO, REALIDAD y PASOS (`para_comparar` en POR_QUE y REALIDAD). Se abren por cuenta, para todas sus tarjetas, con reglas del objetivo `SECCION_PLAN`, solo del estudiante; cada ruta decide con qué actividad. Los medidores, la carrera y la prioridad no son secciones. Las tablas de la tarjeta (`tarjeta_carrera` y sus motivos, conocimiento, dudas, gastos, financiamiento, complicaciones, sugerencias y pasos) son estado y las vacía el reinicio, que además pone `cuenta.opcion_inicial_id` en nulo.

El espacio `PORTAL_FAMILIA` identifica los bloques del portal del apoderado. La migración `0003` amplía el `CHECK` de `bloque.espacio` para admitirlo en SQLite y PostgreSQL; su downgrade falla si todavía existen bloques con ese espacio y conserva los datos.

### A qué apunta `id_referencia`

| Evento | Referencia |
|---|---|
| INGRESO, RESPUESTA_REFLEXIVA, INVITA_A_CREW, FORMA_CREW, VENCE_DESAFIO_INTACTO | nula |
| COMPLETA_ACTIVIDAD, SUPERA_CASO, SUPERA_BATALLA, REGISTRO_ADECUADO | actividad (REGISTRO_ADECUADO: el registro que se cerró sin ítems poco desarrollados; ver `registro.md`) |
| COMPLETA_BLOQUE | bloque |
| ESCRIBE_ENTRADA_DIARIO, ESCRIBE_ENTRADA_LIBRE | entrada de diario (se expone como `null`: no tiene código público) |
| REGISTRA_CHECK_IN | check-in (se expone como `null`) |
| VISTA_CARRERA | carrera |
| PUBLICA_ENTREVISTA | entrevista |
| ESCRIBE_CARTA | vínculo familiar |
| COMPLETA_CONVERSACION | conversación |
| REINICIA_INSTRUMENTO | instrumento |
| REVELA_RESULTADO | aplicación (el resultado es por cuenta y aplicación; ver `instrumentos.md`) |
| VISTA_TESTIMONIO | testimonio |
| CREA_PLAN, ACTUALIZA_PLAN, ELIMINA_PLAN | carrera del plan (la tarjeta puede borrarse; la carrera no) |

## Reglas

Una regla se cumple cuando se cumplen **todas** sus condiciones y, si tiene `evaluador_especial`, el evaluador devuelve verdadero. Una alternativa (A **o** B) se expresa con dos reglas que apuntan al mismo objetivo.

Cada condición cuenta los eventos de la cuenta con su `tipo_evento` (y su `id_referencia`, si la tiene) según `tipo_conteo`, y se cumple si el conteo es ≥ `cantidad_minima`:

| `tipo_conteo` | Cuenta | Ejemplo |
|---|---|---|
| EVENTOS | eventos | «completó esta actividad» |
| REFERENCIAS_DISTINTAS | referencias distintas, sin contar nulas | «8 actividades distintas»: repetir no suma |
| DIAS_DISTINTOS | fechas calendario distintas de `fecha_hora`, sin convertir a UTC | «check-in en 3 días distintos» |
| EVENTOS_TOPE_DIARIO | eventos por día, cada día hasta `TOPE_ENTRADAS_AMISTAD_DIA`: el mismo conteo que la amistad con Lumi (ajuste del diario de F05) | «el recuerdo n se abre al llegar a `UMBRALES_AMISTAD[n-1]` cartas» |

**Evaluadores especiales** (`app/services/motor/evaluadores.py`, registro `EVALUADORES`). Reciben sesión y cuenta y leen su umbral de `regla_desbloqueo.parametro_evaluador`, no de `cantidad_minima`:

- `vistas_diversas(clase, atributo)` (B10): cuenta los elementos **distintos** vistos (las referencias de sus eventos de vista, no los eventos) y los agrupa por atributo. Se cumple con al menos `parametro` grupos; con `parametro` nulo, exige todos los grupos disponibles en el catálogo cargado. Se registra con tres nombres:
  - `carreras_familias_distintas`: VISTA_CARRERA por familia (familias con al menos una carrera);
  - `ocupaciones_high_point_distinto`: VISTA_OCUPACION por la letra en posición 1 de `high_point`;
  - `instituciones_tipos_distintos`: VISTA_INSTITUCION por tipo (tipos con al menos una institución).
- `vista_fuera_del_perfil` (sin parámetro, B10): mira el tipo principal (posición 1 de `tipo_carrera` o `high_point`) de las carreras y ocupaciones vistas; las que no tienen tipo no cuentan. Con un resultado RIASEC vigente y sin perfil plano, basta un tipo principal distinto de la primera letra del código de interés. Sin resultado o con perfil plano, hacen falta dos tipos principales distintos.
- `misiones_camino_sin_inicio`: la cuenta completó al menos `parametro` actividades distintas del bloque CAMINO, sin contar la de orden 1.
- `planes_listos_para_comparar` (B11): al menos `parametro` planes con todas sus secciones `para_comparar` (POR_QUE y REALIDAD) en LISTA (`planes.md`). Importa el dominio de planes dentro de la función, porque los planes usan el motor para saber qué secciones están abiertas.
- `pasos_plan_a` (B11): el plan A (prioridad 1) tiene al menos `parametro` pasos, en cualquier estado.
- `instrumentos_prioritarios` (sin parámetro, B07): la cuenta debe tener resultado vigente (revelado) en dos casos:
  - la aplicación ENTRADA (la partida) de todo instrumento COMPARACION;
  - todas las aplicaciones de cada instrumento que `salon_instrumento` marca `es_prioritario` en su salón.

  Un COMPARACION marcado como prioritario se ignora: la partida es obligatoria por diseño y la llegada ocurre después. Sin salón o sin prioritarios, solo exige la partida. Hace una consulta a los resultados vigentes y lee la configuración de la caché de definiciones.

**Configuración del salón** (B07; la orientadora la editará en B14):
- `salon_actividad_prioritaria`: los registros que ella ve destacados en el perfil.
- `salon_instrumento`: por cuestionario, `es_prioritario` (requisito de T2, la «decisión») y `visible_apoderado`.

Son catálogo, como las temáticas. La carga rechaza un COMPARACION prioritario y una actividad prioritaria que no sea de registro.

Una regla con evaluador también tiene condiciones normales: definen con qué eventos se reevalúa. En `datos/ruta.py`, el evaluador de una regla se declara en `EVALUADORES_REGLAS = {regla: (evaluador, parámetro)}`. Una regla sin condiciones o con un evaluador desconocido es un error de configuración (`ValueError`), nunca un desbloqueo.

## Evaluación

Cuando una acción registra eventos (`registrar_eventos`), el motor, en la misma transacción:

1. Inserta todos los eventos.
2. Toma las reglas que la cuenta aún no tiene, cuyo objetivo es de su audiencia y que tienen al menos una condición con el tipo de algún evento recién registrado.
3. Las evalúa en orden de código y crea un `desbloqueo` por cada una que se cumple.
4. Devuelve los desbloqueos nuevos, con el progreso de cada condición.

Si una acción registra eventos en varias cuentas (coautoría de entrevista, conversación familiar), cada cuenta se evalúa con sus propios eventos. Los desbloqueos no generan eventos: una pasada basta y no hay cascadas. Un desbloqueo es permanente.

## Disponibilidad

Un objetivo está disponible para una cuenta si:

1. **Audiencia:** corresponde a su rol. Si no, no aparece en sus consultas (y su progreso responde 404). La orientadora no tiene audiencia: ningún objetivo le corresponde.
2. **Bloque contenedor:** si es una actividad, su bloque está disponible. Se comprueba al consultar, no al desbloquear.
3. **Reglas:** ninguna regla apunta a él, o la cuenta tiene el desbloqueo de al menos una.

| Objetivo | Audiencia |
|---|---|
| BLOQUE, INSIGNIA, FICHA, SECCION | la `audiencia` de su fila |
| ACTIVIDAD | la de su bloque |
| TESTIMONIO, PREGUNTA_DIARIO, NIVEL, CONVERSACION | solo ESTUDIANTE |

Al desbloquearse un bloque, sus actividades sin regla propia quedan disponibles; las que tienen regla siguen bloqueadas hasta cumplirla. Un objetivo sin reglas está disponible desde el inicio: por eso todo logro que aún no se puede ganar necesita una regla.

**Estado de una actividad:** BLOQUEADA si ella o su bloque no están disponibles (prevalece sobre cualquier progreso); si no, COMPLETADA, EN_CURSO o DISPONIBLE según su progreso.

**Requeridas y opcionales:** una actividad con `requerida` falso se puede completar, pero no cuenta para COMPLETA_BLOQUE.

**Motivo de bloqueo** (`motivos_bloqueo`, `services/motor/reglas.py`): para un objetivo bloqueado de la audiencia de la cuenta, una entrada por regla (son alternativas) con `regla`, `mensaje` (su `mensaje_bloqueo`), `condiciones_faltantes` (solo las no cumplidas) y, si tiene, `evaluador_especial`. Una actividad con su bloque bloqueado devuelve los motivos del bloque (regla 2). Disponible u otra audiencia: `null`.

Toda condición cuenta eventos de la cuenta evaluada: ningún objetivo del apoderado depende de eventos del hijo.

**Nivel actual:** el de mayor `numero` disponible. El nivel 1 no tiene reglas. Las reglas de cada nivel repiten las condiciones del anterior, así que el nivel nunca baja ni se salta. Para un apoderado es `null`.

**Insignia oculta no obtenida:** se muestra con código `???`, nombre «Logro oculto» y sin descripción ni requisito, pero con su grupo, su orden y su pista (sin frase ni logro); al obtenerla se muestra completa.

**Fecha de obtención:** la de su primer desbloqueo, entre todas las reglas de la insignia.

**Vitrina** (ajuste pasaporte-perfil): `POST /acciones/vitrina` con `cuenta` y `codigos` reemplaza la lista completa, en el orden recibido; `[]` la vacía. Solo estudiante (409 si no). 422 con más de 3 códigos, repetidos o inexistentes; 409 si alguna no está obtenida. Sin eventos. Responde `{vitrina: [codigo]}`. Sin elección, la vitrina está vacía.

## Acciones

Todas reciben `cuenta` y `fecha_hora` opcional, y devuelven `eventos_registrados` y `nuevos_desbloqueos`. Las que afectan a varias cuentas devuelven `{"por_cuenta": {codigo: {...}}}`.

| Acción (POST) | Valida | Efecto y eventos |
|---|---|---|
| `/acciones/ingresar` | — | INGRESO |
| `/acciones/completar-actividad` | Actividad disponible y no CASO ni BATALLA. Si tiene ítems de instrumento, todos respondidos; si tiene ítems de registro obligatorios, todos en FINAL (si no, 409 con `items_faltantes`, sin eventos). | Progreso a COMPLETADA. COMPLETA_ACTIVIDAD en **cada** finalización, también al repetir. COMPLETA_BLOQUE la primera vez que se completan todas las actividades del bloque. No calcula resultados de instrumentos: eso ocurre al revelar. |
| `/acciones/resolver-caso` | Actividad CASO disponible; puntaje entero entre 0 y el `puntaje_maximo` del caso (422 si lo supera); `ocupaciones` (códigos de las bien asignadas) existentes, si no 422 | Guarda el intento. Con puntaje ≥ `puntaje_minimo`: completa la actividad (COMPLETA_ACTIVIDAD), SUPERA_CASO la primera vez y agrega a `coleccion_ocupacion` las ocupaciones que la cuenta no tenía (`ocupaciones_nuevas` en la respuesta, con `codigo` y `titulo`). Con menos, queda EN_CURSO, sin eventos. Responde también `puntaje_minimo` y `puntaje_maximo`; el mejor puntaje se lee en `GET casos`. |
| `/acciones/resolver-batalla` | Actividad BATALLA disponible; `respuestas` (`pregunta`, `opcion`: el índice de la opción), en el orden en que se dieron, al menos una, sin repetir, todas preguntas de esa batalla y con una opción existente; el intento debe terminar justo en la última respuesta (si no, 422) | El servidor recorre las respuestas con las vidas y los destellos de la batalla: cada acierto quita una vida al enemigo y cada error, un destello; gana si el enemigo queda sin vidas y pierde si se agotan los destellos (F04c). Guarda el intento en `resultado_batalla` (victoria, aciertos y preguntas) y cada respuesta en `respuesta_batalla`. La primera victoria completa la actividad (COMPLETA_ACTIVIDAD) y registra SUPERA_BATALLA, y VENCE_DESAFIO_INTACTO si terminó con todos los destellos. Perder deja la batalla EN_CURSO; los intentos posteriores a la victoria son práctica, sin eventos. Responde los campos de la acción más `victoria`, `practica` (ya estaba superada), `aciertos`, `preguntas`, `destellos_restantes` y `fichas_repaso` (F04d: `codigo` y `titulo` de las fichas de las preguntas falladas en el intento, sin repetir, de más a menos fallos; si empatan, la de la primera fallada; sin fallos, vacía). El primer intento es el que cuenta para la métrica de conocimiento. Las preguntas de cada intento las da `GET /cuentas/{c}/batallas/{a}/preguntas`. |
| `/acciones/ver-testimonio` | Solo estudiante; testimonio disponible (si no, 409 con su mensaje) | VISTA_TESTIMONIO solo la primera vez. |
| `/acciones/responder-registro` | Clasificación ADECUADA o POCO_DESARROLLADA | RESPUESTA_REFLEXIVA si es ADECUADA o `ampliada`. (Acción simple; el registro con evaluador está en `registro.md`.) |
| `/acciones/escribir-entrada` | Solo estudiante; sección DIARIO; `titulo` opcional y `texto`; `pregunta` (código) o `del_dia`, no ambos; sin ninguno es LIBRE. Con pregunta: su recomendación existe, ya tiene texto y no tiene entrada; la del día, además, vigente (si no, 409). | ESCRIBE_ENTRADA_DIARIO y, si es LIBRE, ESCRIBE_ENTRADA_LIBRE. |
| `/acciones/editar-entrada` | Solo estudiante; `numero` de la cuenta (si no, 404); sin límite de tiempo ni sección | Cambia `texto` y, si se envía, `titulo`; fija `actualizada_en`. Sin eventos. |
| `/acciones/borrar-entrada` | Solo estudiante; `numero` de la cuenta (si no, 404) | Borrado físico. La recomendación que respondía queda archivada (carta) o cerrada (pregunta del día): no vuelve a quedar por responder. Sin eventos. |
| `/acciones/diario/archivar-pregunta`, `/acciones/diario/desarchivar-pregunta` | Solo estudiante; sección DIARIO; `codigo` de una carta recibida (DESBLOQUEABLE; una del día responde 409). Archivar: redactada, sin responder y no archivada; desarchivar: archivada (si no, 409) | Fija o borra `archivada_en`; responde su `PreguntaDiarioEstado`. Sin eventos. |
| `/acciones/check-in` | Solo estudiante; sección CHECK_IN; uno por día, editable ese día (el segundo sobrescribe el nivel y no emite evento); nivel 1–5 | REGISTRA_CHECK_IN (solo el primero del día) |
| `/acciones/ver-carrera`, `/acciones/ver-ocupacion`, `/acciones/ver-institucion` | Sección CATALOGO abierta | VISTA_CARRERA, VISTA_OCUPACION, VISTA_INSTITUCION (con el elemento visto como referencia) |
| `/acciones/marcar-favorito` | Sección CATALOGO abierta; aún no es favorito | MARCA_FAVORITO (sin referencia: los ids de carreras, ocupaciones e instituciones se cruzan) |
| `/acciones/publicar-entrevista` | Autores: lista no vacía, sin repetidos, todos estudiantes | PUBLICA_ENTREVISTA en cada autor. Código `ENT-<uuid>`. |
| `/acciones/escribir-carta` | Sección de su rol (ver «Conversaciones») y vínculo activo; la carta aún no entregada | Guarda la carta de su rol; ESCRIBE_CARTA solo la primera vez. |
| `/acciones/responder-conversacion` | Ver «Conversaciones» | Guarda la respuesta de su rol. Sin eventos. |
| `/acciones/completar-conversacion` | Ver «Conversaciones» | Marca la conversación del vínculo; COMPLETA_CONVERSACION solo en el estudiante, la primera vez. |
| `/eventos` (depuración) | Solo que existan cuenta y referencia | Registra un evento crudo y evalúa reglas, sin validaciones de dominio ni cambios de estado. |

Las acciones de instrumentos (`responder-items`, `revelar-resultado`, `reiniciar-instrumento`) están en `instrumentos.md`, y las de registro, en `registro.md`.

Un objetivo bloqueado responde 409 con `detail.mensaje` = el mensaje de bloqueo de su primera regla (por código; el del bloque si la actividad está bloqueada por él) y `detail.progreso`. Leer el contenido de una sección bloqueada también responde 409 con su mensaje.

## Consultas del motor

| GET | Devuelve |
|---|---|
| `/reglas` | Todas las reglas, legibles, por código, con su `mensaje_bloqueo`. No evalúa. |
| `/cuentas` | Cuentas. |
| `/cuentas/{c}/progreso/{tipo}/{codigo}` | Cada regla del objetivo con su `mensaje_bloqueo` y el avance de cada condición (`actual`, `requerido`, `cumplida`, `texto`) y del evaluador. Niveles con código `N1`…`N5`. Insignia oculta no obtenida: 403. Tipo inválido: 422. |
| `/cuentas/{c}/eventos` | Línea de tiempo, del más reciente al más antiguo. |
| `/cuentas/{c}/desbloqueos?solo_no_vistos=true` | Desbloqueos con fecha y objetivo. |
| POST `/cuentas/{c}/desbloqueos/marcar-vistos` | Marca los pendientes; devuelve `{"marcados": n}`. |

Las consultas de lectura por dominio (`resumen`, `actividades`, `fichas`, `logros`…) están en `integracion.md`.

## Invariantes

1. Nunca hay dos desbloqueos para la misma cuenta y regla, y ninguno se elimina.
2. Una actividad bloqueada no se puede completar: 409 sin eventos.
3. Una cuenta nunca ve objetivos de otra audiencia.
4. COMPLETA_BLOQUE, SUPERA_CASO, SUPERA_BATALLA, VENCE_DESAFIO_INTACTO, VISTA_TESTIMONIO, ESCRIBE_CARTA y COMPLETA_CONVERSACION se registran solo la primera vez por referencia y cuenta; COMPLETA_ACTIVIDAD, en cada finalización.
5. Repetir una actividad no cambia su estado COMPLETADA.
6. Un check-in por día (editable ese día) y una entrada por recomendación (desbloqueada o del día).
7. El nivel actual nunca baja.

## Diario

El registro recoge lo que el estudiante piensa o decide, y lo ve la orientadora. El diario recoge lo que siente y es privado: solo lo lee, edita y borra su autor; otros roles, a lo sumo, verán conteos de entradas existentes. Ninguna actividad es de diario ni escribe en él: las actividades desbloquean preguntas. Va en **una sola dirección**: nada lee del diario (no hay tipo de referencia a entradas, su texto nunca va al LLM y no alimenta indicadores salvo conteos). Código: `app/services/diario/`.

| Tabla | Qué guarda |
|---|---|
| `pregunta_diario` (catálogo) | `codigo`, `nombre` (corto), `pregunta` (base), `personalizada`, `uso` DESBLOQUEABLE (la abre una regla `PREGUNTA_DIARIO`) o DIARIA (entra al sorteo de la pregunta del día), `dimension_id` (dimensión de partida y llegada; solo DIARIA, CHECK `dimension_solo_diaria`; no se muestra ni va al LLM). Sus referencias, solo si es personalizada (las valida el cargador). |
| `recomendacion` | Pregunta recibida por una cuenta: `tipo` DESBLOQUEADA o DIARIA, `contexto` (referencias resueltas al crearla), `texto` (nulo = por redactar; una vez guardado no cambia) con su `origen` FIJA o LLM, `fecha` (solo DIARIA), `creada_en`, `archivada_en` (carta archivada o pregunta del día cerrada) y `actividad_id` (remitente: la actividad que completó la acción que la abrió; nula si la abrió otra cosa). Única por cuenta y pregunta (DESBLOQUEADA) o por cuenta y fecha (DIARIA), con índices parciales. |
| `entrada_diario` | `origen` LIBRE, GUIADA (responde una desbloqueada) o RECOMENDACION_DIA; `recomendacion_id` (única; nula solo en LIBRE), `numero` y `numero_libre` (solo LIBRE), `titulo`, `texto`, `fecha_hora`, `actualizada_en`. |
| `contador_diario` | Últimos `numero` y `numero_libre` de la cuenta: borrar no libera números. |

**Desbloqueadas.** Cuando una regla desbloquea una pregunta, en la misma transacción y sin LLM se crea su recomendación: la fija, con su texto (FIJA); la personalizada, con el `contexto` de ese momento y sin texto. Si ninguna referencia tiene dato, se guarda la base (FIJA). Ocurre en `registrar_eventos`, así que también la deja un evento crudo de `/eventos`. La respuesta de la acción trae `entradas_desbloqueadas` (`codigo`, `nombre`, `personalizada`, `texto`, nulo si está por redactar) solo si hay alguna; las respuestas que amplían `RespuestaAccion` la heredan con `campos()`. El objetivo legible de una PREGUNTA_DIARIO es su `nombre`. `POST /acciones/diario/abrir-pregunta` la redacta una sola vez con el contexto guardado, no con los datos actuales.

**Archivo y remitente (ajuste del diario de F05).** Una carta está en la bandeja RESPONDIDA si tiene entrada; si no, ARCHIVADA con `archivada_en` y PENDIENTE sin él. Escribir sobre una archivada responde 409 («Desarchiva la carta…»). Borrar la respuesta de una carta la archiva, y la de una pregunta del día la cierra: `pregunta-del-dia` la sigue devolviendo con `cerrada` (no se sortea otra ese día) y escribirle responde 409. El remitente se guarda al crear la carta: la actividad del `COMPLETA_ACTIVIDAD` de la misma acción.

**Pregunta del día.** `POST /acciones/diario/pregunta-del-dia` devuelve la vigente (`fecha + VIGENCIA_PREGUNTA_DIA_DIAS > hoy`) o crea una: sortea una dimensión con peso `(máximo de la escala − promedio) + PESO_BASE_DIMENSION`, según el resultado vigente más reciente de partida o llegada (sin resultado, pesos iguales; las DIARIA sin dimensión pesan la base), y dentro de ella una DIARIA con todas sus referencias resueltas y fuera de las últimas `N_SIN_REPETIR_DIARIA`; si la dimensión no tiene ninguna, sortea entre las demás. Si con esas exclusiones no queda ninguna, se sortea sin la de «no repetir»; si tampoco, 409. Semilla `(cuenta, fecha)`. Sin tareas programadas; las vencidas quedan en la base y no se muestran ni se responden.

**Redacción.** Ver `registro.md`, «Asistente del diario».

**Lecturas.** Preguntas, entradas y amistad exigen la sección DIARIO (409 con su mensaje); editar y borrar, no. Otros roles reciben listas vacías.

**Amistad con el asistente.** Puntos = por cada día, las escrituras (eventos ESCRIBE_ENTRADA_DIARIO) hasta `TOPE_ENTRADAS_AMISTAD_DIA`; nivel según `UMBRALES_AMISTAD`. Se calcula con el conteo EVENTOS_TOPE_DIARIO del motor, el mismo que abre los recuerdos del bloque LUMI. Se cuenta sobre eventos, no sobre entradas: editar o borrar no la bajan.

**Invariantes del diario.** Solo el autor lee, edita y borra sus entradas; ningún tipo de referencia lee `entrada_diario`; los contextos enviados al LLM nunca incluyen texto de entradas; la amistad nunca baja; `numero` y `numero_libre` no cambian ni se reutilizan.

## Conversaciones

Conversaciones guiadas entre el estudiante y su apoderado, con una carta de cada uno (B12). Código: `app/services/conversaciones.py`. El estado es del vínculo activo de la cuenta (`conversacion_vinculo` y las cartas de `vinculo_familiar`).

- **Acceso:** el estudiante, con la sección FAMILIA; el apoderado, con CONVERSACIONES (su ruta completa). Sin la sección, 409 con su mensaje; sin vínculo activo, 409; la orientadora, 404.
- **Carta:** cada uno escribe la suya y la puede editar hasta la entrega (todas las conversaciones del catálogo conversadas); después, 409. La carta del otro solo se lee entregada.
- **Disponibilidad:** sin carta propia, ninguna. Con ella, el apoderado tiene todas; el estudiante, las que le abren sus reglas `CONVERSACION` (cada una pide ESCRIBE_CARTA y su condición).
- **Responder** (`responder-conversacion`, texto libre, sin LLM): solo una conversación disponible para quien responde (si no, 409 con su mensaje). El apoderado puede responder aunque el hijo aún no la tenga. La propia respuesta se edita mientras el otro no haya respondido; después, 409.
- **Marcar** (`completar-conversacion`): cualquiera de los dos, solo con ambas respuestas (si no, 409). Basta una marca (`conversada_en`, `conversada_por`); marcar de nuevo no cambia nada. COMPLETA_CONVERSACION va solo al estudiante y le abre su pregunta del diario.
- **Estado** para quien consulta: `sin_responder`, `esperando_al_otro` (solo yo respondí; también si el hijo aún no la habilitó), `te_toca`, `por_conversar` o `conversada`. La respuesta del otro, las `preguntas_guia` y el `mensaje_diferencias` se ven solo con las dos respuestas.
- **Pregunta:** cada rol ve la suya; con `pregunta_apoderado` nula, el apoderado responde la del estudiante.
- **Sin avisos:** no hay notificaciones entre cuentas. El apoderado no recibe aviso cuando el hijo habilita una conversación (HU-067), y si el apoderado marca, el estudiante ve su nueva pregunta del diario solo al consultarlo. Quedan para las notificaciones asíncronas.

## Avance del estudiante

Código: `app/services/avance.py` (`GET /cuentas/{c}/avance`, ajuste del panel de F05). Solo estudiante; otros roles, 404.

- **Camino:** todas las actividades (requeridas y opcionales) de los bloques `MISIONES_CAMPO` de audiencia ESTUDIANTE, con total fijo leído de las definiciones, nunca de lo visible o desbloqueado. Terminar las requeridas no es llegar al 100 %.
- **Tramo actual:** el primer bloque de `MISIONES_CAMPO` por `numero` con una requerida sin completar; cuenta solo sus requeridas. `null` y `camino_completo` cuando no queda ninguna, sea cual sea el porcentaje.
- **Tramos** (ajuste pasaporte-perfil): cada bloque de `MISIONES_CAMPO` por `numero`, con sus requeridas completadas y su total fijo, y `estado` COMPLETO (todas sus requeridas), ACTUAL (el tramo actual) o PENDIENTE. `requeridas` suma las de todos los tramos.
- **Ciudad:** todas las actividades del bloque `CIUDAD`, total fijo. Su porcentaje es la afinidad de `/logros` (`logros.afinidad` delega en `avance_ciudad`).
- LUMI y PORTAL_FAMILIA no cuentan. Porcentajes con `porcentaje()` de `services/tematicas.py`.

## Ruta del apoderado

Código: `app/services/familia.py`. Solo para cuentas APODERADO; otras, 404.

- **Avance** (`avance_ruta`, común a ambos roles): actividades requeridas COMPLETADAS sobre las requeridas de los bloques de la audiencia de la cuenta; las opcionales no cuentan. Es el avance que ve la familia; el del panel del estudiante es otro (ver «Avance del estudiante»).
- **Diploma:** se obtiene al completar todos los bloques de su audiencia (COMPLETA_BLOQUE de cada uno); `obtenido_en` es la fecha del último.
- **Hijo:** el estudiante del vínculo activo, con su avance y su nivel actual.
- **Resultados del hijo:** solo con el diploma (si no, 409) y vínculo activo (si no, 409); los resultados vigentes del hijo en los cuestionarios que `salon_instrumento` marca `visible_apoderado` en su salón, con la misma forma que la consulta de resultado del estudiante.

## Preguntas de batalla (F04b)

- Cada BATALLA tiene un pool en `pregunta_batalla`: enunciado, opciones (al menos tres), índice de la correcta, explicación y la ficha de la que sale (obligatoria, del estudiante). `actividad.preguntas_por_intento` dice cuántas salen en cada intento; el cargador exige que el pool tenga al menos el doble.
- `GET /cuentas/{c}/batallas/{a}/preguntas` toma ese número al azar del pool y mezcla las opciones; cada opción conserva su `indice`, que es lo que se responde. Entrega la correcta y la explicación para la retroalimentación del front. No escribe nada; 409 con el mensaje de bloqueo si la batalla no está disponible y 404 si no existe o no es BATALLA.
- Las fichas de una batalla se derivan de sus preguntas (sin tabla aparte): `BatallaCuenta.fichas`, en el orden de su primera pregunta, con su estado para la cuenta.
- Vidas del enemigo y destellos también son de la batalla (`actividad.vidas_enemigo` y `actividad.destellos`, F04c); el servidor decide la victoria. `preguntas_por_intento` debe alcanzar para terminar (vidas + destellos − 1) y el pool debe tener al menos el doble. Del desafío del front solo se usa la presentación (personaje, ilustración, narrativa).
