# Plan de iteraciones

Sirve para no cerrar caminos a lo que viene, no para adelantarlo: solo se implementa lo que pide la spec en curso (`docs/specs/`). Catálogo de referencia: catálogo de requisitos vigente, 107 HU (HU-072 retirada).

**Antes de este plan.** La iteración 1 (HU 002, 004, 011, 013, 014, 015, 021, 022, 025, 026 sin favoritos, 027, 073, 074, 075 solo nivel) está implementada sobre `plataforma`. Sus HU se vuelven a comprobar sobre `ruta` en B00 y en los lotes que las modifican.

## Enfoque

- **Primero el backend.** Todos los lotes B son solo backend y simulan con pruebas de integración lo que pedirá el front. El front se conecta después, lote por lote (sección «Lotes F»).
- **Solo `ruta`.** Desde B00, las pruebas usan únicamente el conjunto `ruta`. En B00 se retiran `plataforma` y `piloto`. Los fixtures actuales del front quedan congelados hasta su lote F. Los de `ruta` se exportan a `ov_frontend/tests/fixtures/servidor/ruta/`, y ninguna prueba del front los usa hasta entonces.
- **`ruta` es mínima.** Tiene solo lo necesario para demostrar que cada mecánica funciona y no reproduce la ruta base. Todo lo inventado se marca `DATO DE PRUEBA`, y los códigos nombran la mecánica (`t-...`). El contenido real se carga después: actividades, reglas, ítems, conversaciones, testimonios y prioritarios por defecto, con la numeración de la ruta base (`1.3`, `1.3-1`, `H1`, `MA3`, `P8`).
- **Lo fijo, aparte.** Lo que tendrá la plataforma sea cual sea la ruta vive en `datos/fijos.py` y se carga en todo conjunto. Comprende:
  - secciones;
  - listas comunes;
  - tipos de criterio con su repregunta;
  - temáticas;
  - campos de la tarjeta;
  - RIASEC con el catálogo O*NET;
  - el cuestionario de partida y llegada.

  Lo fijo no lleva `DATO DE PRUEBA`. Se agrega en el lote que lo necesita.
- **Formato declarativo.** Cada lote agrega a `ruta` en el mismo formato que usará la carga real: estructuras que el cargador interpreta, nunca lógica a medida. Cargar el contenido real debe ser escribir datos, no código.
- **Pruebas de cada lote:**
  - el escenario `tests/integration/escenarios/ruta/test_ruta_corta.py`, que cada lote extiende con su tramo, recorriendo la ruta con las mismas peticiones que haría el front y sin usar `/eventos`;
  - pruebas de la mecánica en `tests/integration/<dominio>/`;
  - los fixtures `ruta-*` de lo que cambie.
- **Invariantes de `ruta`:** toda regla tiene `mensaje_bloqueo` (desde B01), ningún registro tiene más de tres ítems (desde B02) y todo dato inventado está marcado.

## Ruta mínima de prueba

Bloques: `T0` Inicio, `T1` Camino y `T2` Decisión (desde B07), `CIUDAD` y `FAMILIA` (apoderado).

Cuentas:
- `est-ana` y `est-luis` en el salón `5A`, y `est-beto` en el `5B`;
- `apo-rosa`, vinculada con Ana;
- `ori-carmen`, orientadora principal del `5A` (desde B01).

| Código | Tipo | Dónde | Desde | Qué prueba |
|---|---|---|---|---|
| `t-inicio` | I | T0 | B00 | Ficha `t-ficha`. B01: abre las secciones DIARIO, CATALOGO y PLANES. B09: abre la entrada fija. B11: abre la sección POR_QUE de la tarjeta. |
| `t-cierre-inicio` | I | T0 | B00 | Cierra T0 (COMPLETA_BLOQUE abre T1). B01: abre CHECK_IN. |
| `t-expectativas` | R | T1 | B00 | Abre CIUDAD a mitad de bloque. B01: abre FAMILIA. B02: un ítem de lista común con «otra», uno de lista propia y uno de texto. B09: abre la entrada personalizada. |
| `t-opcional` | I | T1 | B01 | Opcional y `AL_DESBLOQUEAR`. |
| `t-valores` | R | T1 | B02 | Elección ordenada, un ítem sin criterios y uno solo con LONGITUD. B11: abre la sección CONOCIMIENTO de la tarjeta. |
| `t-adicional` | I | T1 | B03 | Misión adicional que se abre con REGISTRO_ADECUADO de `t-expectativas`. |
| `t-eco` | R | T1 | B05 | Referencias ELECCION y TEXTO; elección por referencia. |
| `t-mision-intereses`, `t-mision-intereses-2` | Q | CIUDAD | B00 | RIASEC en dos misiones de 30 ítems; el resultado espera a las dos. B06: revelar y perfil plano. |
| `t-contraste` | R | CIUDAD | B06 | Se abre con REVELA_RESULTADO; referencias RESULTADO y COINCIDENCIAS. |
| `t-partida`, `t-llegada` | Q | T0, T2 | B07 | Partida y llegada por dimensión, con zonas. |
| `t-lee-cuestionario` | I | T1 | B07 | Una informativa con referencia RESPUESTA_CUESTIONARIO. |
| `t-batalla` | B | T1 | B08 | Perder y reintentar; SUPERA_BATALLA abre `t-explorar`. |
| `t-caso` | CASO | CIUDAD | B00 | B08: tipo RIASEC, colección y dos testimonios (`t-testimonio-1` con pista). |
| `t-explorar` | R | T1 | B10 | Se abre con `favoritos_diversos`. B11: abre la sección REALIDAD de la tarjeta. |
| `t-comparar` | R | T2 | B11 | Se abre con `planes_listos_para_comparar` (dos planes); cita PLANES y abre la sección PASOS. |
| `t-proyecto` | R | T2 | B11 | Se abre con `pasos_plan_a` (un paso); cita PLAN, PASOS_PLAN_A y OPCION_INICIAL; cierra T2. |
| `t-investigador`, `t-investigador-cierre` | I | CIUDAD | B13 | Sección INVESTIGACIONES; el cierre se abre con PUBLICA_ENTREVISTA. |
| `t-apo-1`, `t-apo-carta` | I | FAMILIA | B00 | Ruta del apoderado. B01: `t-apo-1` da la ficha `t-ficha-apo`; cerrar FAMILIA abre la sección CONVERSACIONES. B12: carta y diploma. |
| `t-conv-1`, `t-conv-2` | Conversación | — | B00 | B12: `t-conv-1` con `t-expectativas` + carta; `t-conv-2` con `t-contraste`; entrada de diario al conversar. |
| `t-ins-1`, `t-ins-oculta`, niveles 1 y 2 | Logros | — | B00 | Progreso de logros, insignia oculta y nivel. |

## Lotes

Cada lote cabe en una sesión de Claude Code y se integra a `main` al terminar. Los marcados **M** cambian el modelo: no corras dos lotes **M** en paralelo. La versión funcional es B00 a B16. B17 va antes del primer lote F.

| Lote | Tema | HU | M | Tras | Termina con |
|---|---|---|---|---|---|
| B00 | Cambio a `ruta` · **Implementado** | Ninguna nueva; comprueba 004, 011, 013–015, 021, 073, 074 | — | — | Toda la batería en verde solo con `ruta`; `plataforma` y `piloto` retirados |
| B01 | Secciones, mensajes de bloqueo y salón · **Implementado** | 002, 025 | M | B00 | Lo bloqueado responde con su mensaje; las secciones se abren y permiten registrar |
| B02 | Registros: modelo, listas y borradores · **Implementado** | 006, 010 | M | B01 | Borradores con elección validada; ítems, criterios y listas cargados desde `datos/` |
| B03 | Registros: entrega y seguimiento · **Implementado** | 007, 016 | M | B02 | Entrega con seguimiento, omisión y fallo del LLM; la misión adicional aparece solo si todo quedó adecuado |
| B04 | Registros: respuesta consolidada y edición · **Implementado** | 008 | M | B03 | Consulta de la consolidada y de lo que se puede ampliar, con pista; la edición es un nuevo intento con seguimiento |
| B05 | Referencias y eco · **Implementado** | 009 | M | B04 | Citas literales; lo poco desarrollado sale como «por desarrollar» |
| B06 | Revelar resultados y libro de Helena · **Implementado** | 022–024, 027, 095 | M | B05 | Revelar calcula y abre el registro de contraste; reinicio con perfil plano |
| B07 | Partida y llegada, temáticas y prioritarios · **Implementado** | 094 | M | B06 | Comparación por dimensión; T2 se abre con los instrumentos prioritarios revelados |
| B08 | Batallas, casos y testimonios · **Implementado** | 017, 041, 051–056 | M | B05 | Batalla con reintento; el caso libera testimonios y colección |
| B09 | Diario, pregunta del día y check-in · **Implementado** | 028–033, 035, 036, 075 | M | B07 | Entradas fijas y personalizadas, también con fallo del LLM |
| B10 | Catálogo, instituciones y favoritos · **Implementado** | 026, 037–040 | M | B06 | `t-explorar` bloqueado hasta tener favoritos diversos |
| B11 | Planes de carrera · **Implementado** | 043–048, 050, 097–099, 109, 110 | M | B07, B08, B10 | Secciones que se habilitan, presupuesto, dudas con pasos sugeridos y requisitos de comparar y proyecto |
| B12 | Familia: ruta del apoderado, conversaciones y cartas · **Implementado** | 066–071, 078–080 | M | B09, B11 | Conversaciones que se abren una por una; cartas al completar todas |
| B13 | Investigaciones y entrevistas | 057–065, 100, 101 | M | B10 | Investigación completa, con aliados, reacciones y Leyenda |
| B14 | Orientadora: seguimiento y configuración | 081–089 (108 si entra) | M | B07, B11, B12 | Sus estudiantes, sus registros, la configuración y las seis alertas |
| B15 | Informe de viaje y temas para conversar | 034, 102–105 | — | B11–B13 | Bitácora desde el primer día; las siete reglas de temas; endgame |
| B16 | Orientadora: vista del salón | 090–093, 107 | — | B14 | Capa 1 del panel |
| B17 | Acceso · **Implementado** | 001 | M | B01 | Inicio y cierre de sesión con credenciales precargadas |

### Qué hace cada lote

**B00 · Cambio a `ruta`** (Implementado)
- **Hace:**
  - Crea `datos/fijos.py`, con RIASEC y el catálogo O*NET.
  - Crea `datos/ruta.py`, con las filas marcadas B00 en la tabla de la ruta mínima.
  - Pasa a `ruta` las plantillas de prueba y las pruebas genéricas: motor, acciones, instrumentos, registro, datos, migraciones y contrato.
  - Retira las pruebas propias de `plataforma` y `piloto`, y retira esos dos conjuntos.
  - Exporta los fixtures `ruta-*`.
  - Actualiza `AGENTS.md` (estructura, datos y contrato) y `docs/sistema/integracion.md`.
- **Comprueba:** que el comportamiento actual no cambia.

**B01 · Secciones, mensajes de bloqueo y salón (M)** (Implementado)
- **Modelo:**
  - `Seccion` y `TipoObjetivo.SECCION`;
  - `ReglaDesbloqueo.mensaje_bloqueo`;
  - `Actividad.requerida`, `duracion_estimada_min` y `descripcion`;
  - `Rol.ORIENTADORA`, `Salon` y `OrientadoraSalon`;
  - `Cuenta.salon_id`, `es_principal`, `correo`, `contrasena_hash` y `activa`;
  - `VinculoFamiliar.parentesco` y `es_activo`.
- **Datos:** las secciones van en `fijos`.
- **Pruebas:**
  - Qué secciones aparecen después de cada paso de T0.
  - Una actividad o sección bloqueada muestra su mensaje y las condiciones que le faltan.
  - Escribir en el diario, hacer el check-in o escribir la carta sin la sección abierta responde 409.
  - El listado trae requerida u opcional y la duración.
- **Comprueba:** regla 2; secciones que se abren; ciudad a mitad de bloque; requeridas y opcionales.

**B02 · Registros: modelo, listas y borradores (M)** (Implementado)
- **Modelo:**
  - `POCO_DESARROLLADA`, con migración de los valores guardados;
  - `texto_consolidado` y `opciones_elegidas`;
  - `ListaOpciones` y `OpcionLista`;
  - campos de elección del ítem;
  - `ItemRegistro.actividad_id` y `orden`, retirando `ActividadItemRegistro`;
  - criterios con tipo y `repregunta`;
  - el evento `REGISTRO_ADECUADO`.
- **Datos:** listas comunes y tipos de criterio en `fijos`.
- **Pruebas:**
  - Elecciones inválidas (mínimo, máximo, opción ajena, «otra» donde no se permite) responden 422.
  - Se retoma con los borradores.
  - La carga rechaza más de tres ítems por registro o un ítem en dos actividades.
  - La migración conserva las filas.
- **Comprueba:** regla 7; paso 1 del seguimiento; una sola fuente.

**B03 · Registros: entrega y seguimiento (M) · Implementado**
- **Modelo:** se quita `item_registro.nucleo` y el origen `RESPALDO_LONGITUD` pasa a `EXTENSION_MINIMA`.
- **Hace:**
  - Agrega la acción `entregar` al nivel del registro, que reemplaza la evaluación por ítem (`enviar` se retira).
  - Hace una sola llamada al LLM al entregar, con los ítems que tienen criterios; los demás se evalúan en código.
  - Pone como máximo dos preguntas por registro, por orden de ítem: se repite en el mismo ítem mientras siga poco desarrollado.
  - La pregunta la redacta el LLM a partir de la repregunta base del primer criterio faltante; si es inválida, se usa la base.
  - Cada respuesta a un turno reevalúa y consolida el ítem (concatenación como respaldo).
  - El evaluador falso aprende marcas por tipo de criterio.
- **Pruebas:**
  - Todo adecuado completa el registro y abre `t-adicional`.
  - Una sola llamada al entregar; los ítems sin criterios no llegan al LLM.
  - La segunda pregunta va al mismo ítem si sigue poco desarrollado, o al siguiente; nunca hay una tercera.
  - Omitir cierra sin misión adicional; `items_por_ampliar` aparece al cerrar.
  - Con el LLM caído, una respuesta corta recibe la genérica y una larga queda sin evaluar.
  - El estudiante nunca recibe la clasificación.
- **Comprueba:** pasos 2 a 6 y 8 del seguimiento.
  - Cada cuenta actúa solo sobre sí misma.
  - La orientadora actúa solo sobre su salón.

**B04 · Registros: respuesta consolidada y edición (M) · Implementado**
- **Modelo:** `intento` en respuestas y turnos (la edición es un nuevo intento con seguimiento) y `reflexiva_registrada`.
- **Hace:** HU-008: consultar la respuesta consolidada, ver qué se puede ampliar y editar. La consolidación ya ocurre en B03, tras cada respuesta a un turno.
- **Pruebas:**
  - La consulta devuelve la respuesta consolidada y qué ítems se pueden ampliar.
  - Editar es un nuevo intento: una evaluación de los ítems cambiados y su seguimiento (tope de dos por intento). Si todo queda adecuado, quita la marca y abre la misión adicional. REGISTRO_ADECUADO y RESPUESTA_REFLEXIVA, una vez cada uno.
- **Script manual con Gemini:** sobre `t-expectativas`; se corre solo si lo pide el usuario.
- **Comprueba:** paso 7.

**B05 · Referencias y eco (M) · Implementado**
- **Modelo:** `Referencia`, que pertenece a una actividad o a una pregunta de diario, y la consulta que la resuelve.
- **Pruebas:**
  - Se cita la respuesta consolidada.
  - Lo poco desarrollado sale como «por desarrollar», y la cita aparece al ampliarlo.
  - Lo que quedó sin evaluar por un fallo sí se cita.
  - Nunca hay datos de otra cuenta.
  - Un tipo fuera del catálogo se rechaza al cargar.
  - Una elección por referencia solo acepta los códigos que esa referencia devuelve.
- **Comprueba:** regla 5; paso 9; RNF-20.

**B06 · Revelar resultados y libro de Helena (M) · Implementado**
- **Modelo:** la acción y el evento `REVELA_RESULTADO`; el cálculo pasa de completar la última misión a revelar.
- **Hace:** agrega el reinicio con perfil plano y su tope.
- **Pruebas:**
  - Completar ya no calcula.
  - Revelar incompleto responde 409.
  - Revelar calcula y abre `t-contraste`.
  - Antes de revelar no hay resultado visible.
  - Se resuelven RESULTADO y COINCIDENCIAS.
  - El reinicio solo procede con perfil plano, y una vez.
- **Comprueba:** sección 5; regla 6 (cada instrumento cierra con un contraste).

**B07 · Partida y llegada, temáticas y prioritarios (M) · Implementado**
- **Modelo:**
  - dimensiones y resultado por aplicación en COMPARACION;
  - `Tematica` y temáticas por actividad;
  - `SalonActividadPrioritaria` y `SalonInstrumento`;
  - el evaluador `instrumentos_prioritarios`.
- **Datos:**
  - En `fijos`: el cuestionario de 19 ítems y las temáticas A a E.
  - En `ruta`: los prioritarios del `5A`.
- **Pruebas:**
  - El estudiante recibe zonas en palabras, no números.
  - La llegada se muestra junto a la partida, con las actividades completadas por dimensión.
  - T2 se abre, con su mensaje, solo con los prioritarios revelados.
  - `t-lee-cuestionario` cita la respuesta del cuestionario.
- **Comprueba:** sección 11; los tres sentidos de «prioritario»; apertura del Bloque 4.

**B08 · Batallas, casos y testimonios (M)**
- **Modelo:**
  - `TipoActividad.BATALLA`, `ResultadoBatalla` y `SUPERA_BATALLA`;
  - `Actividad.dimension_id` y `ColeccionOcupacion`;
  - `Testimonio.pista` y `VISTA_TESTIMONIO`.
- **Pruebas:**
  - Perder y ganar: el siguiente paso se abre una sola vez y solo cuenta el primer intento.
  - El caso libera testimonios y colección.
  - Un testimonio bloqueado muestra su pista.
  - Los casos traen su tipo RIASEC.
- **Comprueba:** repaso; casos y testimonios (secciones 8 y 10).

**B09 · Diario, pregunta del día y check-in (M)** (Implementado)
- **Modelo:**
  - `PreguntaDiario.personalizada`;
  - `EntradaDiario.pregunta_mostrada` y `actualizada_en`;
  - `RecomendacionDiaria` y `OrigenEntrada.RECOMENDACION_DIA`.
- **Pruebas:**
  - La entrada personalizada guarda la pregunta que se mostró, y el LLM recibe solo los datos que declara.
  - Si el LLM falla, se usa la pregunta fija.
  - Entradas libres y edición.
  - La pregunta del día sigue el avance por temática.
  - La amistad con Lumi sube.
  - Un check-in por día, con su evolución.
- **Comprueba:** reglas 3, 4 y 5 (el diario va en una sola dirección); reglas de las entradas personalizadas.

**B10 · Catálogo, instituciones y favoritos (M)** (Implementado)
- **Modelo:**
  - campos de `Carrera` y de `Ocupacion`;
  - `IngresoCarrera`, `RangoIngreso` y `HighPoint`;
  - `Institucion` con `Ubicacion`;
  - favoritos;
  - eventos `MARCA_FAVORITO`, `VISTA_OCUPACION` y `VISTA_INSTITUCION`.
- **Datos:** pocas carreras de tres tipos, y dos instituciones e ingresos de prueba.
- **Pruebas:**
  - Búsquedas y detalle.
  - Marcar y desmarcar favoritos.
  - `t-explorar` sigue bloqueado hasta tener tres favoritos: con resultado RIASEC, uno fuera del tipo principal; sin él, de dos tipos.
  - Las vistas registran eventos para «qué exploré».
- **Comprueba:** regla 6 (un interés fuera del perfil antes de decidir).

**B11 · Planes de carrera (M)** (Implementado)
- **Modelo:**
  - la tarjeta (`tarjeta_carrera`) con cuatro secciones (`seccion_tarjeta`: POR_QUE, CONOCIMIENTO, REALIDAD, PASOS), motivos, conocimiento, dudas, gastos, financiamiento, complicaciones, sugerencias y pasos;
  - `referencia_rubro`, `referencia_camino`, `Institucion.gestion`, `InstitucionCarrera.duracion_ciclos` y `Cuenta.opcion_inicial_id`;
  - listas comunes VALORES, CAMINOS, RUBROS_GASTO, FINANCIAMIENTO, PASOS, DUDAS_SUGERIDAS y las de conocimiento;
  - `TipoObjetivo.SECCION_PLAN`; eventos `CREA_PLAN`, `ACTUALIZA_PLAN` y `ELIMINA_PLAN`;
  - evaluadores `planes_listos_para_comparar` y `pasos_plan_a`; referencias PLAN, PLANES, PASOS_PLAN_A y OPCION_INICIAL.
- **Pruebas:**
  - El tope de tres planes, ordenar y eliminar sin huecos.
  - Guardar una sección bloqueada responde 409 indicando qué actividad la abre, sin guardar nada.
  - El estado de cada sección y «listo para comparar».
  - Dudas que crea y cierra CONOCIMIENTO; sugerencias del LLM (evaluador falso) con validación, tope por plan y respaldo.
  - Totales del primer año y de la carrera, también con duración impar.
  - Aviso de misma familia; opción inicial antes de completar T1.
  - Requisitos de `t-comparar` y `t-proyecto`; se resuelven las cuatro referencias.
  - Ninguna actividad escribe en los planes.
- **Comprueba:** regla 1; la tarjeta que crece; opción inicial; requisitos de 4.5 y 5.1.

**B12 · Familia (M)**
- **Modelo:** `TipoObjetivo.CONVERSACION`.
- **Pruebas:**
  - El apoderado ve todas las guías tras completar su ruta y su carta; el estudiante las abre una por una.
  - Marcar como conversada una que el estudiante no tiene responde 409.
  - Marcarla le da una entrada de diario al estudiante.
  - Las cartas se leen al completar todas las conversaciones.
  - Aviso al apoderado cuando el hijo habilita una conversación.
  - El apoderado ve resultados solo con su ruta completa y el instrumento visible.
  - Diploma y avances.
- **Comprueba:** sección 9.

**B13 · Investigaciones y entrevistas (M)**
- **Modelo:**
  - `Investigacion`;
  - campos de `Entrevista`;
  - `Reaccion` y `REACCIONA_ENTREVISTA`.
- **Pruebas:**
  - Los aliados son investigaciones activas, de la misma ocupación y del mismo salón.
  - Coautoría y «lo que cambió».
  - El investigador vuelve al publicar.
  - «Aprendí algo» sin comentario responde 422; una reacción por estudiante.
  - Leyenda con `MINIMO_REACCIONES_LEYENDA` reacciones y el destacado de la orientadora.
- **Comprueba:** investigaciones (sección 8).

**B14 · Orientadora: seguimiento y configuración (M)**
- **Modelo:** `TipoAlerta`; `NotaOrientadora`, si se decide incluir HU-108.
- **Pruebas:**
  - Solo ve sus salones.
  - Registros con la respuesta consolidada, la etiqueta y el seguimiento a pedido.
  - Configurar prioritarios y visibilidad. Un instrumento COMPARACION (partida y llegada) no muestra ni acepta la marca de prioritario: es obligatorio por diseño.
  - Detalle numérico de partida y llegada (puntaje y diferencia por ítem y por dimensión) en un endpoint propio de la orientadora, dentro de su vista de resultados del estudiante; el estudiante solo recibe zonas y textos.
  - Cada alerta aparece con su condición y desaparece al resolverse.
  - Nunca ve el contenido del diario.
- **Comprueba:** sección 13 (capas 2 y 3; alertas separadas de los temas para conversar).

**B15 · Informe de viaje y temas para conversar**
- **Pruebas:**
  - La bitácora crece desde el primer día, con sus cinco secciones en orden.
  - Cada tema aparece solo con su dato y tiene sus dos redacciones.
  - El apoderado solo ve los instrumentos visibles.
  - Al terminar el camino, todo sigue disponible.
  - El escenario de la ruta corta llega completo hasta el final.
- **Comprueba:** sección 12; cierre y endgame.

**B16 · Orientadora: vista del salón**
- **Pruebas:** agregados del salón, cambio entre partida y llegada, seguridad promedio y alertas más frecuentes.
- **Comprueba:** sección 13 (capa 1).

**B17 · Acceso** (Implementado)
- **Pruebas:**
  - Inicio y cierre de sesión.
  - Cada cuenta actúa solo sobre sí misma.
  - La política de salón de la orientadora queda probada en pruebas unitarias para B14 (en B17 no tiene rutas de estudiantes).

## Lotes F

Conexión del frontend, lote por lote. Se trabajan con `/lote F00`, igual que los B.

Parte del estado al 20 oct 2026: B00–B12 y B17 implementados; B13–B16 pendientes.

### Punto de partida (por qué no es solo conectar)

1. **El front no tiene contenido para `ruta`.** Sus 13 JSON (`mision_bienvenida`, `registro_huellas`…) son de `plataforma`, que ya no existe. Todas las actividades de `ruta` (`t_inicio`, `t_expectativas`…) se descartan hoy en modo `api` por no tener contenido. Cada lote F crea los `t_*.json` de su tramo (mínimos, `"_dato_de_prueba": true`, con su `mapa`).
2. **El contrato del front quedó atrás.** `servidor.ts` todavía espera `resultados_generados` al completar (B06 lo retiró), números en las dimensiones de COMPARACION (B07 los manda en `null`) y `enviar` en registros (B03 lo retiró). En `api`, hoy el resultado RIASEC nunca se calcula.
3. **Las pruebas del front usan fixtures congelados de `plataforma`.** Los 90 `ruta-*` existen, pero solo `tests/servidor/acceso` los usa.
4. **Varias pantallas no coinciden con el modelo nuevo:** planes (`DecisionSheet` frente a la tarjeta v4), seguimiento de registros (local, `followUpStore`), diario y check-in (locales), conversaciones (doble marca frente a responder–ver–conversar), libro de Helena (sin «Revelar» ni comparación partida–llegada).
5. **`pendientes-interfaz.md` tiene ~25 entradas** que esperan una decisión de pantalla. Cada lote F cierra las suyas.

### Reglas propias de los lotes F

- **Mostrar lo que tiene el backend, con cambios ligeros.** Cada lote F muestra todo lo que el backend ya entrega para su tramo, adaptando ligeramente las vistas actuales y reutilizando sus componentes. No se rediseña: la revisión estética de las pantallas se hace al final, aparte.
- **Pantallas antes que código.** Si existe `docs/specs/<lote>-pantallas.md` (insumo preparado con el usuario), el plan parte de él y no decide pantallas fuera de él. En todo caso, el plan de cada lote F lleva una sección **«Pantallas»**: por vista, qué cambia (elementos, textos, componentes que reutiliza) y, si es nueva, un boceto. Lo aprobado en el plan queda autorizado; lo que no esté ahí sigue la regla de `pendientes-interfaz.md`.
- **El backend se puede ajustar, pero declarado.** Si una pantalla necesita un dato que no existe (un campo, una lectura), el plan lo lista en **«Ajustes al backend»**. Si toca el modelo, el lote se marca **M** y sigue `/cambio-modelo` (migración, `ruta`, escenario, fixtures). Nunca dos **M** a la vez, tampoco con B13–B16.
- **Contenidos de prueba.** Los `t_*.json` son mínimos: lo justo para recorrer la mecánica. El contenido real se carga después con la numeración de la ruta base.
- **Pruebas.** Cada lote mueve su área de `tests/servidor/` a los `ruta-*` y, si cambia el contrato, regenera los fixtures en la misma tarea. Al cerrar F08 se retiran los fixtures de la raíz.
- **Modo local congelado (desde F00).** `VITE_DATOS=local` conserva lo que hace hoy y no recibe funciones nuevas. Lo que agrega un lote F existe solo en `api`: el hook del dominio expone una bandera con nombre del dominio (`puedeEditarRegistro`, `muestraComparacion`) y en local la vista se comporta como antes. `tests/local/` no se amplía; solo debe seguir pasando. Excepción: cambios solo visuales aprobados por el usuario, que no alteran textos, orden ni momento (F00: avisos como toasts).
- **Pendientes.** Cada lote cierra (o reescribe) las entradas de `pendientes-interfaz.md` que le tocan.

### Tabla

| Lote | Tema | HU | Tras | Cierra pendientes de | Pantallas que se adaptan |
|---|---|---|---|---|---|
| F00 | Base sobre `ruta` · **Implementado** | 002, 025 (y recomprueba 004, 011, 013–015, 021, 073, 074) | B17 | B01 (×3), B3 llave, B17 nombre | Candado con mensaje; etiqueta opcional y duración; accesos a secciones |
| F01 | Registros: elección, borradores, entrega y seguimiento · **Implementado** | 006, 007, 010, 016 | F00 | B02, B03 | Reproductor de registro |
| F02 | Registros: consulta, edición y eco | 008, 009 | F01 | B04, B05 | Consulta del registro (nueva); zona de eco |
| F03 | Instrumentos y libro de Helena | 022–024, 027, 094, 095 | F02 | B06, B07, F5 recarga | Libro: Revelar, perfil plano, comparación partida–llegada |
| F04 | Batallas, casos y testimonios · **Implementado** | 017, 041, 051–056 | F00 | B08, B2 testimonios, F3 testimonios, F4 íconos | Testimonios (vista nueva o en mochila); Central de Casos |
| F05 | Diario, pregunta del día y check-in | 028–033, 035, 036, 075 | F01 | B09, B2 diario, F4 señal | Diario; cierre de actividad; pasaporte |
| F06 | Catálogo y favoritos | 026, 037–040 | F03 | — | Catálogo y detalles |
| F07a | Planes: tarjeta, orden y primeras secciones | 043, 044, 047, 048, 050, 098, 099, 109 | F02, F06 | B11 (parte) | Mis planes: lista A/B/C, estados por sección, POR_QUE, CONOCIMIENTO con dudas |
| F07b | Planes: realidad, pasos y actividades que los citan | 045, 046, 097, 110 | F07a | B11 | REALIDAD con presupuesto, PASOS con sugerencias, medidores |
| F08 | Familia: estudiante y apoderado | 066–071, 078–080 | F05, F07b | B12, B17 hijos, AP-F3 (×4), B01 fichas apoderado, B2 conversaciones | Familia del estudiante; portal del apoderado |
| F09 | Investigaciones y entrevistas | 057–065, 100, 101 | B13 | — | Investigaciones, comunidad, Leyendas |
| F10 | Orientadora: seguimiento y configuración | 081–089 | B14 | B17 salones | Mis estudiantes, perfil, prioritarios, alertas |
| F11 | Informe de viaje, temas y vista del salón | 034, 090–093, 102–105, 107 | B15, B16 | — | Informe; panel del salón |

**Orden (decidido):** F00 → F01 → F02 → F03 → F04 → F05 → F06 → F07a → F07b → F08; después B13 → F09 → B14 → F10 → B15 → B16 → F11.
Razón: B14–B16 leen registros, planes, diario y familia. Si los lotes F cambian esas tablas, conviene que ocurra antes de construir el panel de la orientadora encima.

### Qué hace cada lote F

#### F00 · Base sobre `ruta` · **Implementado**
- **Contrato:** pone `servidor.ts` al día con lo que ya devuelve el backend: `bloqueo` (mensaje y condiciones), `requerida`, `duracion_estimada_min`, `descripcion`, `SeccionEstado`; quita `resultados_generados` del tipo y de `NodeRenderer.tsx` (el cálculo real llega en F03); números de COMPARACION opcionales.
- **Contenidos:** `t_inicio`, `t_cierre_inicio` y `t_opcional` con su `mapa` en T0/T1; T2 y la Ciudad reciben posiciones vacías para que sus puntos aparezcan bloqueados.
- **Secciones:** `store/servidor/secciones.ts` pide `GET /cuentas/{c}/secciones` y los accesos del panel (diario, check-in, catálogo, planes, familia) leen su estado.
- **Nombre real** del estudiante y del apoderado desde la sesión.
- **Pruebas:** `tests/servidor/mapa`, `actividades` y `logros` pasan a `ruta-*`.
- **Pantallas a decidir:**
  - Bloqueado: candado + `mensaje`, o candado + mensaje + condiciones faltantes.
  - Opcional: etiqueta «opcional» y duración en la tarjeta del drawer, o solo excluirlas del progreso.
  - Sección bloqueada: acceso con candado y mensaje, u ocultarla.
  - Texto de la llave de la Ciudad («Destino al completar el camino» ya no es cierto: se abre a mitad de T1).
- **Ajustes al backend posibles:** ninguno previsto.

#### F01 · Registros: elección, borradores, entrega y seguimiento · **Implementado**
- **Hace:** el reproductor de registro lee `items-registro` (elección con lista común + «otra», lista propia, ordenada), guarda borradores con `posicion` en el servidor, entrega con `registro/entregar` y muestra la pregunta de seguimiento que manda el servidor («Responder» / «Continuar sin responder»), en lugar de `followUpStore`. Al cerrar, el aviso de `items_por_ampliar` sin clasificación. La misión adicional aparece en el mapa.
- **Contenidos:** `t_expectativas`, `t_valores`, `t_adicional`.
- **Decisión de contrato clave:** cómo el JSON de contenido apunta a un ítem del backend (p. ej. `item: "t-expectativas-1"` en el nodo de consigna). Se documenta en `contenidos-actividades.md`. Sin esto, cada registro real necesitará un ajuste a mano.
- **Pantallas a decidir:** cómo se ve una elección ordenada; dónde va «Entregar» (último nodo o barra fija); el «Lumi está pensando…» mientras evalúa el LLM (puede tardar unos segundos).
- **Ajustes al backend posibles:** si el reproductor necesita saber qué nodo es cada ítem sin leer el JSON, un campo `orden` visible ya existe; no se prevé más.

#### F02 · Registros: consulta, edición y eco
- **Hace:** vista de consulta del registro entregado (consolidada por ítem, pista y «Editar» en los ampliables); la edición reutiliza la interfaz de seguimiento de F01. Zona de eco en los ítems con referencia: cita literal, aviso «por desarrollar» con enlace al registro de origen, oculta con SIN_DATO; elección por referencia.
- **Contenidos:** `t_eco`.
- **Pantallas a decidir:** desde dónde se abre la consulta (repaso de la actividad completada, mochila, perfil); el texto definitivo del aviso «por desarrollar».

#### F03 · Instrumentos y libro de Helena
- **Hace:** botón «Revelar» cuando un instrumento está COMPLETADO sin resultado (`revelar-resultado`); invitación a repetir con perfil plano y su reinicio; partida y llegada con zonas en palabras; comparación por dimensión (ítems que cambiaron primero, los demás plegados; un cambio a menos no se marca negativo). T2 bloqueado con el mensaje de prioritarios. Corrige la recarga directa de `/profile/helena/:pagina`.
- **Contenidos:** `t_mision_intereses` (reutiliza `instrumento_mara` o se mapea), `t_partida`, `t_llegada`, `t_contraste` (usa el eco de F02), `t_lee_cuestionario`.
- **Pantallas a decidir:** el revelado (animación o directo); dónde vive la comparación (página del libro o vista propia).
- **Ajustes al backend posibles:** si el libro necesita la fecha o el número de aplicación para la comparación, ya viene; no se prevé más.

#### F04 · Batallas, casos y testimonios · **Implementado**
- **Hace:** el reproductor de desafíos envía cada intento (`resolver-batalla`) y lee `batallas`; el caso envía puntaje y ocupaciones, y un caso fallido ya no aparece completado; tipo RIASEC del caso, colección de íconos (y la insignia en las ocupaciones afines, pendiente F4); testimonios disponibles con enlace y bloqueados con pista (`ver-testimonio`).
- **Contenidos:** `t_batalla` (mapeado a un desafío de `challenges.ts`), `t_caso` (mapeado al incendio forestal).
- **Pantallas a decidir:** vista de testimonios (lista propia o dentro de la mochila, que ya tiene `?kind=testimonial`).
- **Ajustes al backend posibles:** la relación caso → ocupaciones de la colección para mostrar el ícono en el resultado RIASEC (hoy no llega).

#### F05 · Diario, pregunta del día y check-in
- **Hace:** diario desde el servidor (preguntas fijas y personalizadas, entradas con título opcional, editar y borrar, pregunta del día vigente, amistad con Lumi); aviso en el cierre de actividad cuando deja una pregunta; check-in al ingresar si no hay uno del día y su evolución; temáticas y afinidad en el pasaporte.
- **Pantallas a decidir:** aviso «Lumi te dejó una pregunta en tu diario» en el cierre (no existe); estado «Lumi está escribiendo…» al abrir una personalizada; dónde va la pregunta del día dentro del diario; dónde se ven evolución, temáticas y afinidad.
- **Ajustes al backend posibles:** si el check-in al ingresar necesita saber «ya hizo el de hoy» sin traer la serie, un campo en el resumen.

#### F06 · Catálogo y favoritos
- **Hace:** búsqueda y detalle de carreras, ocupaciones e instituciones desde el servidor (filtro RIASEC por combinación), favoritos en el servidor, eventos de vista (que abren `t-explorar`), `gestion` de la institución. La presentación (imágenes, colores, videos) sigue en el front, buscada por código.
- **Contenidos:** `t_explorar`.
- **Riesgo:** el detalle del front muestra cosas que el backend quizá no tiene (o al revés). El plan debe cruzar campo por campo el detalle actual con la respuesta de `catalogo/*`.
- **Ajustes al backend posibles:** campos faltantes del detalle (es el lote con más probabilidad de agregar columnas).

#### F07 · Planes de carrera (tarjeta v4)
- **Hace:** reemplaza `DecisionSheet` por la tarjeta v4 (`caso-tarjeta-plan-v4.md`): crear desde favoritos, solo la sección elegida a la vista, editar y guardar por sección, estados homogéneos, medidores, dudas → pasos sugeridos, presupuesto con precarga armada en el front (`opciones.rubros`, `caminos`, `gestion`), pasos pendiente/hecho, orden A/B/C, aviso de misma familia, opción inicial. `t-comparar` y `t-proyecto` citan los planes.
- **Contenidos:** `t_comparar`, `t_proyecto`.
- **Partido en dos (decidido):**
  - **F07a:** crear desde favoritos, ordenar A/B/C, eliminar, estado de cada sección y qué actividad la abre, aviso de misma familia, opción inicial, POR_QUE y CONOCIMIENTO (las dudas se crean y se cierran; todavía sin sugerencias).
  - **F07b:** REALIDAD (presupuesto con precarga y totales, financiamiento, complicaciones), pasos sugeridos por el LLM desde dudas y complicaciones (aceptar, editar, descartar, respaldo), PASOS (pendiente/hecho), medidores y las actividades `t-comparar` y `t-proyecto`.
- **Pantallas a decidir:** lista de planes y tarjeta con una sola sección a la vista (F07a); presupuesto y medidores (F07b).
- **Ajustes al backend posibles:** los que salgan al aterrizar los textos y listas de la tarjeta.

#### F08 · Familia
- **Hace:**
  - Estudiante: sección Familia con su carta primero y después las conversaciones por estado (`sin_responder`, `esperando_al_otro`, `te_toca`, `por_conversar`, `conversada`); responder, ver la del otro con la guía y marcar conversada.
  - Apoderado: hijos reales (`GET /sesion`), conversaciones con el mismo flujo, carta, diploma y avance desde `familia`, resultados visibles del hijo, sus fichas, avisos de carga y error del portal.
- **Contenidos:** `t_apo_1`, `t_apo_carta`.
- **Pantallas a decidir:** reemplazo de la doble marca por responder → ver → conversar; dónde ve el apoderado sus fichas; aviso de carga y error del portal.
- **Al cerrar:** se retiran los fixtures congelados de la raíz y los datos de demostración de hijos.

#### F09 a F11
Se detallan al cerrar sus lotes B (B13, B14, B15–B16), con la misma estructura. Sus vistas ya existen en el prototipo (investigaciones, comunidad, panel de la orientadora), así que serán sobre todo conexión, con los ajustes que dejen sus lotes B en `pendientes-interfaz.md`.

## Constantes provisionales

| Constante | Valor |
|---|---|
| `MINIMO_REACCIONES_LEYENDA` | 3, de compañeros distintos (B13) |
| `DIAS_SIN_INGRESO_ALERTA` | 7 (B14) |
| `DIAS_FAMILIA_SIN_RUTA_ALERTA` | 14, desde que se abre la sección FAMILIA (B14) |
| `DIFERENCIA_AVANCE_ALERTA` | 20 puntos porcentuales bajo la mediana del salón (B14) |
| `MAXIMO_SEGUIMIENTOS_POR_REGISTRO` | 2 (B03) |
| `UMBRAL_ZONA_FUERTE`, `UMBRAL_ZONA_EN_CAMINO` | 3,5 y 2,5 (B07) |
| `MAXIMO_REINICIOS_PERFIL_PLANO` | 1 (B06) |
| `MAXIMO_PLANES`, `CICLOS_POR_ANIO` | 3 y 2 (B11) |
| `MAXIMO_LLAMADAS_SUGERENCIAS_POR_PLAN`, `MAXIMO_PASOS_POR_DUDA`, `MAXIMO_CARACTERES_PASO` | 6, 2 y 140 (B11) |
| `SEGURIDAD_BAJA_PROMEDIO`, `SEGURIDAD_BAJA_DIAS` | 2 y 14 (B14) |

La alerta «sin favoritos» se evalúa solo después de completar la actividad que abre el catálogo.

## Después de la versión funcional

- **Solo front:** 005, 096 y 106.
- **Ayuda y avisos:** 012, 018, 019 y 020.
- **Extras de catálogo y planes:** 042 y 049.
- **Perfil social:** 076 y 077, con `InsigniaExhibida`.
- **108:** decisión de alcance.
- **Mecánicas sin lote:** señales anónimas del salón (sin HU ni modelo), «requiere atención», MA6 con `OCUPACIONES_DE_TIPO` y el contexto de los sellos de 4.5.
- **Carga del contenido real de la ruta:**
  - actividades, reglas, ítems y criterios;
  - conversaciones, testimonios y fichas;
  - prioritarios por defecto;
  - instrumentos de habilidades sociales e inteligencias.
