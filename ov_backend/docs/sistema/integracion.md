# Integración entre ov_backend y ov_frontend

Contrato vigente entre los dos repos. Lo usan los agentes de ambos. Las reglas generales están en «Reglas compartidas» de los `AGENTS.md`; aquí está el detalle.

## Quién es dueño de cada dato

| Dato | Dueño |
|---|---|
| Cuentas, salones, bloques, actividades (código, título, tipo, orden, `contenido`, `visibilidad`, `requerida`, duración, descripción), secciones, reglas y sus mensajes de bloqueo | Base de datos |
| Fichas, insignias y niveles (código, nombre, requisito, oculta) | Base de datos. La presentación (íconos, imágenes, cuerpo de la ficha) está en el front, buscada por código. |
| Instrumento RIASEC (ítems, enunciados, escala, dimensiones con descripción, aplicación) | Base de datos |
| Ocupaciones y carreras del universo de recomendación, con sus puntajes O*NET | Base de datos |
| Estado del estudiante: progreso, eventos, desbloqueos, respuestas a ítems, resultados | Base de datos. El front solo guarda una copia de presentación. |
| Estado del apoderado: disponibilidad, completitud de actividades y eventos | Base de datos. Nodo actual, intentos de práctica y elecciones quedan en el front por cuenta. |
| Contenido narrativo de cada actividad (nodos JSON) | Front (`src/data/activities/contenidos/`) |
| Batallas y casos: preguntas, vidas, problemas, presupuesto, pistas por problema y cálculo del puntaje | Front. El servidor guarda cada intento (victoria y aciertos; puntaje y ocupaciones bien asignadas), la colección y los tipos RIASEC de cada caso. |
| Textos de registros, borradores, respuestas de la brújula, intentos de comprobaciones, favoritos, planes | Front (local). Pasan al servidor en iteraciones siguientes. |
| Detalle del catálogo (descripciones, ingresos, instituciones, duración de carreras) | Front (`src/data/catalog/`) |

`ov_frontend/docs/origen-de-datos.md` tiene el inventario completo del lado del front.

## Códigos

- Los códigos del backend son exactamente los ids del front (`mission-welcome`, `enc-mitos`, `act-tip-01`, `ficha-mitos`, `I1`, `nursing`). No hay tabla de traducción.
- Los códigos nuevos usan el mismo estilo (minúsculas y guiones), salvo los que ya existen en el backend: `TEST-RIASEC`, `APL-RIASEC`, `ESC-LIKERT5`, dimensiones `R`…`C`, reglas `R-…`.
- `actividad.contenido` es la clave del JSON del front (`[a-z0-9_]`). Varias actividades pueden compartirla: las 14 interacciones de Mara usan `instrumento_mara`. Si el front renombra un JSON, se cambia también en `datos/`.

## Modos del front

- `VITE_DATOS=local` (por defecto): el front funciona solo, con sus datos y cálculos de demostración.
- `VITE_DATOS=api`: usa el servidor. `prototypeAllUnlocked`, `studentDemoEnabled` y `pendingContent` no afectan la disponibilidad. En desarrollo, el proxy de Vite envía `/api` a `http://127.0.0.1:8000`, sin CORS.

## Consultas por dominio

Todas son GET, reciben el código de la cuenta y responden 404 «Cuenta no encontrada» si no existe. Para un apoderado, las listas propias del estudiante salen vacías; para una orientadora, todas. Leer el contenido de una sección bloqueada responde 409 con su mensaje de bloqueo.

| Ruta | Respuesta | El front la pide |
|---|---|---|
| `/cuentas/{c}/resumen` | `ResumenCuenta`: `cuenta` y `nivel_actual` | Al ingresar (menú y panel) |
| `/cuentas/{c}/actividades` | `list[BloqueActividades]` | Al ingresar (mapa y panel del estudiante; inicio y actividades del apoderado) |
| `/cuentas/{c}/fichas` | `list[ContenidoEstado]`, las de la audiencia de la cuenta | Al abrir la mochila o un recurso |
| `/cuentas/{c}/secciones` | `list[SeccionEstado]`: `codigo`, `nombre`, `estado`, `bloqueo` | Todavía no |
| `/cuentas/{c}/secciones/{codigo}` | `SeccionEstado`; 404 si no existe o es de otra audiencia | Todavía no |
| `/cuentas/{c}/logros` | `LogrosCuenta`: `insignias` y `niveles` | Al abrir el perfil, el pasaporte o una insignia |
| `/cuentas/{c}/testimonios` | `list[TestimonioEstado]`: `codigo`, `titulo`, `estado`, `visto`; bloqueado, solo `pista`; disponible, `descripcion` y `enlace` | Todavía no (sin vista) |
| `/cuentas/{c}/batallas` | `list[BatallaCuenta]`: `actividad`, `titulo`, `estado`, `intentos`, `superada` y `primer_intento` (`victoria`, `aciertos`, `preguntas`, `fecha_hora`) | Todavía no |
| `/cuentas/{c}/casos` | `list[CasoCuenta]`: `actividad`, `titulo`, `dimensiones` (códigos RIASEC), `estado`, `intentos`, `superado`, `ultimo_puntaje`, `mejor_puntaje` | Todavía no |
| `/cuentas/{c}/coleccion` | `list[OcupacionColeccion]`: `ocupacion`, `titulo`, `caso`, `obtenida_en` | Todavía no |
| `/cuentas/{c}/diario/preguntas` | `list[PreguntaDiarioEstado]`; 409 con DIARIO bloqueada | Todavía no |

Además usa `/cuentas`, `/cuentas/{c}/progreso/...`, `/cuentas/{c}/desbloqueos` (no vistos y marcar vistos), las acciones `ingresar`, `completar-actividad` y `responder-items`, y las consultas de instrumentos (ítems, respuestas, avance y resultado). Todas están descritas en `motor.md` e `instrumentos.md`.

**`BloqueActividades`:** bloques por `numero` y `codigo`, con `estado` y `bloqueo`; actividades por `orden` y `codigo`. Cada actividad trae `codigo`, `titulo`, `tipo`, `orden`, `contenido`, `visibilidad`, `visible`, `estado` (BLOQUEADA, DISPONIBLE, EN_CURSO o COMPLETADA), `requerida`, `duracion_estimada_min`, `descripcion` y `bloqueo`.

**`bloqueo`:** `null` si no está bloqueado; si no, una entrada por regla alternativa con `regla`, `mensaje` y `condiciones_faltantes` (`motor.md`, «Motivo de bloqueo»). Una actividad bloqueada por su bloque trae los motivos del bloque.

**Opcionales:** una actividad con `requerida` falso no se propone como «siguiente» (HU-011) y no cuenta para cerrar su bloque.

**Visibilidad:**

- `SIEMPRE`: se ve aunque esté bloqueada. `AL_DESBLOQUEAR`: solo aparece cuando deja de estar bloqueada. `visible = visibilidad == SIEMPRE or estado != BLOQUEADA`. Las actividades no visibles también se envían, con su título.
- Si el front no tiene el contenido indicado, la actividad no se muestra ni cuenta en el progreso (en desarrollo se avisa en consola) y se anota en `pendientes-interfaz.md`.
- El progreso de un bloque cuenta solo las actividades `SIEMPRE` con contenido en el front.
- En el mapa, las actividades consecutivas de un bloque que comparten `contenido` forman un solo punto («Interacción n de total»), que representa la primera no completada.

**Qué se vuelve a pedir:**

| Momento | Se pide | Se marca vencido |
|---|---|---|
| Ingreso | `/cuentas`, `ingresar` y, en paralelo, `resumen`, `actividades` y desbloqueos no vistos. El resultado RIASEC, solo si `act-tip-final` no está bloqueada. | — |
| Después de `completar-actividad` o `responder-items` | `actividades` y desbloqueos no vistos | Según `nuevos_desbloqueos[].tipo_objetivo`: FICHA → `fichas`; INSIGNIA → `logros`; NIVEL → `logros` y `resumen`. |
| Reinicio de datos de prueba | Todo vuelve a «sin cargar» y se repite el ingreso | — |

Una sección vencida con una vista montada se vuelve a pedir enseguida; si no, al abrir su vista.

El portal del apoderado tiene su propia sesión en `ov_frontend/src/store/servidor/apoderado.ts`, separada del estado del estudiante. Al ingresar consulta `/cuentas`, elige la cuenta `APODERADO` que coincide con el usuario escrito (o la primera por código), envía `ingresar` y consulta solo sus `actividades`. Tras completar vuelve a pedir `actividades`; no consulta resumen, logros ni desbloqueos del estudiante. La cuenta se conserva en memoria y se vuelve a seleccionar al recargar. Se descartan respuestas de otra sesión y se reutilizan pedidos en curso; durante una finalización solo se admite un envío, compartido si es del mismo código.

## Finalizar actividades desde el front

- El estudiante informa la finalización solo al llegar al nodo `$fin` del reproductor (`useActivityCompletion.ts`). Consultar, revelar o revisar no completa nada.
- Repetir una actividad del estudiante siempre llega al servidor (registra otro COMPLETA_ACTIVIDAD).
- El apoderado sigue la misma regla de confirmación remota en api: al terminar el último nodo, `useParentActivitySession` envía `completar-actividad` y espera la nueva consulta de `actividades` antes de mostrar el cierre. Con error conserva el nodo y permite reintentar; repasar una actividad ya completada no envía otra finalización.
- La disponibilidad, los candados y el diploma del apoderado usan el estado remoto. Los nodos JSON siguen en el front; `ov.parent-missions.v1` conserva nodo, intentos y elecciones en `accounts[codigo]`, proyectando el estado del servidor sin alterar esos datos. En local conserva `apo-prototipo`, los requisitos del JSON y la completitud local.
- Mara: cada interacción guarda sus respuestas con `responder-items` y se puede retomar. El resultado se revela cuando existe un resultado vigente en el servidor.

## Conjuntos de datos

**`ruta`** (`datos/ruta.py`, `DATO DE PRUEBA`) sobre **`fijos`** (`datos/fijos.py`). Es el único conjunto. `fijos` lleva lo que tendrá la plataforma sea cual sea la ruta. Comprende:
- el RIASEC `TEST-RIASEC` (60 ítems, escala `ESC-LIKERT5`, aplicación `APL-RIASEC`);
- las ocupaciones y carreras del catálogo del front, con sus puntajes O*NET;
- las temáticas A–E;
- el cuestionario de partida y llegada `TEST-PARTIDA-LLEGADA` (COMPARACION): 19 ítems provisionales en las dimensiones `AUTO-A` a `AUTO-E`, escala `ESC-ACUERDO4` y aplicaciones `APL-PARTIDA` (ENTRADA) y `APL-LLEGADA` (SALIDA). `ruta` lleva lo mínimo para probar cada mecánica, en tuplas que interpreta el cargador:

- salones `5A` y `5B`; cuentas `est-ana` y `est-luis` (5A), `est-beto` (5B), `apo-rosa` (vínculo `VIN-ANA`, madre) y `ori-carmen` (orientadora principal del 5A);
- bloques `T0` (`t-inicio`, `t-partida` con los 19 ítems, `t-cierre-inicio`), `T1` (`t-expectativas`, REGISTRO; `t-opcional`, opcional y `AL_DESBLOQUEAR`; `t-valores`, REGISTRO opcional; `t-adicional`, misión adicional opcional y `AL_DESBLOQUEAR`; `t-eco`; `t-lee-cuestionario`, informativa opcional que cita `AUTO-01` de la partida; `t-batalla`, BATALLA opcional), `T2` (`t-llegada`, con los 19 ítems), `CIUDAD` (`t-mision-intereses` y `t-mision-intereses-2`, con 30 ítems RIASEC cada una; `t-caso`, CASO con los tipos RIASEC R y S) y `FAMILIA` del apoderado (`t-apo-1`, `t-apo-carta`);
- temáticas por actividad (`t-expectativas` A y B, `t-valores` B, `t-eco` A, `t-mision-intereses` B, `t-caso` C); en el 5A, el RIASEC prioritario y `t-expectativas` como registro prioritario;
- fichas `t-ficha` y `t-ficha-apo` (del apoderado); testimonios `t-testimonio-1` (con pista) y `t-testimonio-2`; conversaciones `t-conv-1` y `t-conv-2`; insignias `t-ins-1`, `t-ins-oculta` y `t-ins-batalla` (provisional hasta B10); niveles 1 y 2;
- reglas, todas con mensaje de bloqueo: T0 en secuencia; `t-inicio` da `t-ficha`, `t-ins-1` y abre DIARIO, CATALOGO y PLANES; cerrar T0 abre T1, el nivel 2 y CHECK_IN; `t-expectativas` abre la Ciudad, `t-opcional` y FAMILIA, y, si se cierra sin ítems poco desarrollados (REGISTRO_ADECUADO), `t-adicional`; `t-inicio` también abre `t-batalla`, cuya victoria (SUPERA_BATALLA) da `t-ins-batalla` y, si es sin errores, `t-ins-oculta`; `t-mision-intereses` abre `t-mision-intereses-2`, que abre `t-caso`; superar `t-caso` abre los dos testimonios; el resultado se calcula al revelarlo, con las dos completadas, y revelar (REVELA_RESULTADO de `APL-RIASEC`) abre `t-contraste`, que cita el resultado y las coincidencias; T2 se abre al cerrar T1 con la partida revelada y los cuestionarios prioritarios del salón revelados (evaluador `instrumentos_prioritarios`); `t-apo-1` abre `t-apo-carta` y da `t-ficha-apo`; cerrar FAMILIA abre la sección CONVERSACIONES del apoderado.

El contenido de cada actividad es su código con guiones bajos (`t_inicio`) y todavía no existe en el front: lo agrega el lote F que conecte cada tramo. Cada lote B extiende `ruta` con las filas de su tramo (ver `docs/plan-iteraciones.md`).

## Fixtures de contrato

`scripts/exportar_fixtures_front.py --destino <ov_frontend>/tests/fixtures/servidor` crea una base temporal con `ruta`, recorre la ruta corta y escribe 44 JSON en `ruta/` con prefijo `ruta-`: `cuentas`; `resumen-inicial`; `actividades` al inicio, con T1 abierto, con la Ciudad abierta y con T2 abierto (`actividades-t2`); `secciones` al inicio y con T1 abierto; `fichas` y `logros` al inicio y al final; `completar-t-inicio` y `completar-t-cierre-inicio`; `items-t-mision-intereses` (la primera misión); `revelar-riasec` y `resultado-riasec`; `referencias-t-contraste`; `items-t-partida`, `revelar-partida` y `resultado-partida` (zonas en palabras); `referencias-t-lee-cuestionario`; `comparacion-partida-llegada`; `desbloqueos-no-vistos`; `items-registro-t-expectativas`, `borrador-t-expectativas` y `registro-t-expectativas-borrador` (un borrador con elección y posición); `entregar-t-expectativas` (entrega todo adecuada, que cierra el registro y abre `t-adicional`); `registro-t-expectativas-cerrado` y `editar-t-expectativas` (consolidada y edición con seguimiento); `items-registro-t-eco` y `referencias-t-eco` (elección por referencia, y una cita «por desarrollar» junto a una elección disponible); `testimonios` inicial y final (bloqueados con pista; abiertos, uno visto); `resolver-batalla-derrota`, `resolver-batalla-victoria` y `batallas` (dos intentos, el primero perdido); `resolver-caso` (superado tras un intento fallido, con `ocupaciones_nuevas`), `casos` y `coleccion`; y `apoderado-actividades` y `apoderado-secciones` inicial y final. Ninguna prueba del front los usa todavía; los fixtures de la raíz de `tests/fixtures/servidor/` quedan congelados hasta su lote F. Si cambia una respuesta del contrato, se regeneran en la misma tarea; nunca se editan a mano.

## Reinicio de datos de prueba

`POST /desarrollo/reiniciar` → `{"mensaje": "Datos de prueba reiniciados"}`, solo con `ENTORNO=desarrollo`. Borra en una transacción las tablas de `TABLAS_DE_ESTADO` (`app/services/desarrollo.py`) y conserva el catálogo (incluidas las cartas del vínculo). El front lo ofrece en el menú del estudiante solo en desarrollo y modo `api`; después borra `ov.missions.v2.api` y `ov.student-adventure.v1.api` del navegador, prepara un nuevo ingreso y recarga.

## Pendientes de interfaz

Lo que el backend entrega y ninguna vista muestra, o lo que una vista necesita y el backend no entrega, se anota en `ov_frontend/docs/pendientes-interfaz.md` con este formato y se avisa al usuario:

```markdown
## <fecha> · <dato>

- **Dato:** campo y respuesta (`ActividadCuenta.visibilidad`, `GET /cuentas/{c}/actividades`).
- **Dónde se mostraría:** vista y elemento.
- **Opciones:** 2 o 3, en una línea cada una.
- **Si no se muestra:** qué pasa hoy.
- **Estado:** pendiente.
```
