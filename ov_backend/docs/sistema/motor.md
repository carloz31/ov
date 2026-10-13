# Motor de desbloqueos

Cómo funciona hoy el núcleo de la plataforma: las acciones registran eventos, y las reglas convierten esos eventos en desbloqueos. Código: `app/services/motor/`, `app/services/actividades.py`, `app/services/cuentas.py` y servicios de cada dominio. Datos: `datos/ruta.py`.

## Modelo

| Grupo | Tablas |
|---|---|
| Cuentas | `cuenta` (rol ESTUDIANTE, APODERADO u ORIENTADORA; `salon_id`, `correo`, `contrasena_hash`, `activa`), `salon`, `orientadora_salon` (`es_principal`), `vinculo_familiar` (estudiante, apoderado, `parentesco`, `es_activo` y sus cartas) |
| Catálogo | `bloque` (espacio MISIONES_CAMPO, CIUDAD o PORTAL_FAMILIA, audiencia), `actividad` (tipo INFORMATIVA, REGISTRO, CUESTIONARIO, CASO o BATALLA; `orden`, `contenido`, `visibilidad`, `requerida`, `duracion_estimada_min`, `descripcion`, `puntaje_minimo` solo en CASO), `actividad_dimension` (tipos RIASEC de un caso, uno o varios; solo CASO, lo valida el cargador), `seccion` (audiencia), `ficha` (audiencia), `testimonio` (`pista`, que se muestra mientras está bloqueado), `pregunta_diario`, `conversacion`, `insignia` (`es_oculta`, audiencia), `nivel`, `familia_carrera`, `carrera` |
| Estado de la cuenta | `progreso_actividad` (EN_CURSO o COMPLETADA, `posicion`), `resultado_caso`, `resultado_batalla` (cada intento: `victoria`, `aciertos`, `preguntas`), `coleccion_ocupacion` (ocupaciones obtenidas al superar un caso, una vez por cuenta), `entrada_diario`, `check_in`, `entrevista`, `entrevista_autor`, `conversacion_vinculo` |
| Motor | `evento_uso`, `regla_desbloqueo` (`mensaje_bloqueo` obligatorio), `condicion_desbloqueo`, `desbloqueo` (único por cuenta y regla; `visto`) |

`id_objetivo` de una regla e `id_referencia` de un evento o condición son referencias polimórficas sin FK; los cargadores resuelven códigos a ids. `id_objetivo` nunca es nulo.

**Secciones.** Partes del perfil que se abren con reglas como cualquier objetivo (`SECCION`). Las fijas están en `datos/fijos.py`: DIARIO, CHECK_IN, CATALOGO, PLANES y FAMILIA del estudiante, y CONVERSACIONES del apoderado. Cada ruta decide con sus reglas cuándo se abre cada una. La migración `0004` convirtió las reglas del antiguo objetivo CONVERSACIONES en reglas de esa sección.

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

## Reglas

Una regla se cumple cuando se cumplen **todas** sus condiciones y, si tiene `evaluador_especial`, el evaluador devuelve verdadero. Una alternativa (A **o** B) se expresa con dos reglas que apuntan al mismo objetivo.

Cada condición cuenta los eventos de la cuenta con su `tipo_evento` (y su `id_referencia`, si la tiene) según `tipo_conteo`, y se cumple si el conteo es ≥ `cantidad_minima`:

| `tipo_conteo` | Cuenta | Ejemplo |
|---|---|---|
| EVENTOS | eventos | «completó esta actividad» |
| REFERENCIAS_DISTINTAS | referencias distintas, sin contar nulas | «8 actividades distintas»: repetir no suma |
| DIAS_DISTINTOS | fechas calendario distintas de `fecha_hora`, sin convertir a UTC | «check-in en 3 días distintos» |

**Evaluadores especiales** (`app/services/motor/evaluadores.py`, registro `EVALUADORES`). Reciben sesión y cuenta y leen su umbral de `regla_desbloqueo.parametro_evaluador`, no de `cantidad_minima`:

- `carreras_de_3_familias`: los eventos VISTA_CARRERA apuntan a carreras de al menos `parametro` familias distintas.
- `misiones_camino_sin_inicio`: la cuenta completó al menos `parametro` actividades distintas del bloque CAMINO, sin contar la de orden 1.
- `instrumentos_prioritarios` (sin parámetro, B07): la cuenta debe tener resultado vigente (revelado) en dos casos:
  - la aplicación ENTRADA (la partida) de todo instrumento COMPARACION;
  - todas las aplicaciones de cada instrumento que `salon_instrumento` marca `es_prioritario` en su salón.

  Un COMPARACION marcado como prioritario se ignora: la partida es obligatoria por diseño y la llegada ocurre después. Sin salón o sin prioritarios, solo exige la partida. Hace una consulta a los resultados vigentes y lee la configuración de la caché de definiciones.

**Configuración del salón** (B07; la orientadora la editará en B14):
- `salon_actividad_prioritaria`: los registros que ella ve destacados en el perfil.
- `salon_instrumento`: por cuestionario, `es_prioritario` (requisito de T2, la «decisión») y `visible_apoderado`.

Son catálogo, como las temáticas. La carga rechaza un COMPARACION prioritario y una actividad prioritaria que no sea de registro.

Una regla con evaluador también tiene condiciones normales: definen con qué eventos se reevalúa. En `datos/ruta.py`, el evaluador de una regla se declara en `EVALUADORES_REGLAS = {regla: evaluador}`. Una regla sin condiciones o con un evaluador desconocido es un error de configuración (`ValueError`), nunca un desbloqueo.

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
| TESTIMONIO, PREGUNTA_DIARIO, NIVEL | solo ESTUDIANTE |

Al desbloquearse un bloque, sus actividades sin regla propia quedan disponibles; las que tienen regla siguen bloqueadas hasta cumplirla. Un objetivo sin reglas está disponible desde el inicio: por eso todo logro que aún no se puede ganar necesita una regla.

**Estado de una actividad:** BLOQUEADA si ella o su bloque no están disponibles (prevalece sobre cualquier progreso); si no, COMPLETADA, EN_CURSO o DISPONIBLE según su progreso.

**Requeridas y opcionales:** una actividad con `requerida` falso se puede completar, pero no cuenta para COMPLETA_BLOQUE.

**Motivo de bloqueo** (`motivos_bloqueo`, `services/motor/reglas.py`): para un objetivo bloqueado de la audiencia de la cuenta, una entrada por regla (son alternativas) con `regla`, `mensaje` (su `mensaje_bloqueo`), `condiciones_faltantes` (solo las no cumplidas) y, si tiene, `evaluador_especial`. Una actividad con su bloque bloqueado devuelve los motivos del bloque (regla 2). Disponible u otra audiencia: `null`.

**Sujeto de una condición (diseño; se implementa en B12).** Hoy toda condición cuenta eventos de la cuenta evaluada. Para objetivos del apoderado que dependen del progreso del hijo:
- `CondicionDesbloqueo.sujeto`: PROPIA (por defecto) o ESTUDIANTE_VINCULADO.
- Al evaluar una regla para un apoderado, las condiciones ESTUDIANTE_VINCULADO cuentan los eventos de los estudiantes de sus vínculos `es_activo` (con varios, basta uno), desde el mismo contexto agrupado por cuenta.
- Cuando un estudiante registra eventos, `registrar_eventos` evalúa también, para cada apoderado de sus vínculos activos, las reglas de audiencia APODERADO con alguna condición ESTUDIANTE_VINCULADO del tipo registrado. El desbloqueo se guarda en el apoderado en la misma transacción y no aparece en la respuesta del estudiante.
- El desbloqueo es permanente aunque el vínculo deje de estar activo. No hay sujeto inverso.

**Nivel actual:** el de mayor `numero` disponible. El nivel 1 no tiene reglas. Las reglas de cada nivel repiten las condiciones del anterior, así que el nivel nunca baja ni se salta. Para un apoderado es `null`.

**Insignia oculta no obtenida:** se muestra con código `???`, nombre «Logro oculto» y sin descripción ni requisito; al obtenerla se muestra completa.

## Acciones

Todas reciben `cuenta` y `fecha_hora` opcional, y devuelven `eventos_registrados` y `nuevos_desbloqueos`. Las que afectan a varias cuentas devuelven `{"por_cuenta": {codigo: {...}}}`.

| Acción (POST) | Valida | Efecto y eventos |
|---|---|---|
| `/acciones/ingresar` | — | INGRESO |
| `/acciones/completar-actividad` | Actividad disponible y no CASO ni BATALLA. Si tiene ítems de instrumento, todos respondidos; si tiene ítems de registro obligatorios, todos en FINAL (si no, 409 con `items_faltantes`, sin eventos). | Progreso a COMPLETADA. COMPLETA_ACTIVIDAD en **cada** finalización, también al repetir. COMPLETA_BLOQUE la primera vez que se completan todas las actividades del bloque. No calcula resultados de instrumentos: eso ocurre al revelar. |
| `/acciones/resolver-caso` | Actividad CASO disponible; puntaje 0–100; `ocupaciones` (códigos de las bien asignadas) existentes, si no 422 | Guarda el intento. Con puntaje ≥ `puntaje_minimo`: completa la actividad (COMPLETA_ACTIVIDAD), SUPERA_CASO la primera vez y agrega a `coleccion_ocupacion` las ocupaciones que la cuenta no tenía (`ocupaciones_nuevas` en la respuesta). Con menos, queda EN_CURSO, sin eventos. |
| `/acciones/resolver-batalla` | Actividad BATALLA disponible; `victoria`, `aciertos` ≤ `preguntas` (≥ 1) | Guarda cada intento en `resultado_batalla`. La primera victoria completa la actividad (COMPLETA_ACTIVIDAD) y registra SUPERA_BATALLA, y VENCE_DESAFIO_INTACTO si acertó todas. Perder deja la batalla EN_CURSO; los intentos posteriores a la victoria son repaso, sin eventos. El primer intento es el que cuenta para la métrica de conocimiento. |
| `/acciones/ver-testimonio` | Solo estudiante; testimonio disponible (si no, 409 con su mensaje) | VISTA_TESTIMONIO solo la primera vez. |
| `/acciones/responder-registro` | Clasificación ADECUADA o POCO_DESARROLLADA | RESPUESTA_REFLEXIVA si es ADECUADA o `ampliada`. (Acción simple; el registro con evaluador está en `registro.md`.) |
| `/acciones/escribir-entrada` | Solo estudiante; sección DIARIO; GUIADA exige pregunta disponible y no respondida; LIBRE sin pregunta | ESCRIBE_ENTRADA_DIARIO y, si es LIBRE, ESCRIBE_ENTRADA_LIBRE. |
| `/acciones/check-in` | Solo estudiante; sección CHECK_IN; uno por día; nivel 1–5 | REGISTRA_CHECK_IN |
| `/acciones/ver-carrera`, `/acciones/ver-ocupacion`, `/acciones/ver-institucion` | Sección CATALOGO abierta | VISTA_CARRERA, VISTA_OCUPACION, VISTA_INSTITUCION (con el elemento visto como referencia) |
| `/acciones/marcar-favorito` | Sección CATALOGO abierta; aún no es favorito | MARCA_FAVORITO (sin referencia: los ids de carreras, ocupaciones e instituciones se cruzan) |
| `/acciones/publicar-entrevista` | Autores: lista no vacía, sin repetidos, todos estudiantes | PUBLICA_ENTREVISTA en cada autor. Código `ENT-<uuid>`. |
| `/acciones/escribir-carta` | La cuenta pertenece a un vínculo activo; el estudiante, con la sección FAMILIA | Guarda la carta de su rol; ESCRIBE_CARTA solo la primera vez. |
| `/acciones/completar-conversacion` | Sección CONVERSACIONES del apoderado del vínculo, marque quien marque | Marca la conversación del vínculo; COMPLETA_CONVERSACION en las dos cuentas, solo la primera vez. |
| `/eventos` (depuración) | Solo que existan cuenta y referencia | Registra un evento crudo y evalúa reglas, sin validaciones de dominio ni cambios de estado. |

Las acciones de instrumentos (`responder-items`, `revelar-resultado`, `reiniciar-instrumento`) están en `instrumentos.md`, y las de registro, en `registro.md`.

Un objetivo bloqueado responde 409 con `detail.mensaje` = el mensaje de bloqueo de su primera regla (por código; el del bloque si la actividad está bloqueada por él) y `detail.progreso`. Leer el contenido de una sección bloqueada también responde 409 con su mensaje.

## Consultas del motor

| GET | Devuelve |
|---|---|
| `/reglas` | Todas las reglas, legibles, por código, con su `mensaje_bloqueo`. No evalúa. |
| `/cuentas` | Cuentas. |
| `/cuentas/{c}/progreso/{tipo}/{codigo}` | Cada regla del objetivo con su `mensaje_bloqueo` y el avance de cada condición (`actual`, `requerido`, `cumplida`) y del evaluador. Niveles con código `N1`…`N5`. Insignia oculta no obtenida: 403. Tipo inválido: 422. |
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
6. Un check-in por día y una entrada GUIADA por pregunta.
7. El nivel actual nunca baja.
