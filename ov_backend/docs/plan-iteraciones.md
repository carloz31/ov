# Plan de iteraciones

Sirve para no cerrar caminos a lo que viene, no para adelantarlo: solo se implementa lo que pide la spec en curso (`docs/specs/`). Catálogo de referencia: catálogo de requisitos vigente, 107 HU (HU-072 retirada).

**Antes de este plan.** La iteración 1 (HU 002, 004, 011, 013, 014, 015, 021, 022, 025, 026 sin favoritos, 027, 073, 074, 075 solo nivel) está implementada sobre `plataforma`. Sus HU se vuelven a comprobar sobre `ruta` en B00 y en los lotes que las modifican.

## Enfoque

- **Primero el backend.** Todos los lotes B son solo backend y simulan con pruebas de integración lo que pedirá el front. El front se conecta después, lote por lote (lotes F, que se planifican aparte).
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
| `t-inicio` | I | T0 | B00 | Ficha `t-ficha`. B01: abre las secciones DIARIO, CATALOGO y PLANES. B09: abre la entrada fija. B11: abre los campos básicos de la tarjeta. |
| `t-cierre-inicio` | I | T0 | B00 | Cierra T0 (COMPLETA_BLOQUE abre T1). B01: abre CHECK_IN. |
| `t-expectativas` | R | T1 | B00 | Abre CIUDAD a mitad de bloque. B01: abre FAMILIA. B02: un ítem de lista común con «otra», uno de lista propia y uno de texto núcleo. B09: abre la entrada personalizada. |
| `t-opcional` | I | T1 | B01 | Opcional y `AL_DESBLOQUEAR`. |
| `t-valores` | R | T1 | B02 | Elección ordenada, un ítem sin criterios y uno solo con LONGITUD. B11: abre el campo «motivo». |
| `t-adicional` | I | T1 | B03 | Misión adicional que se abre con REGISTRO_ADECUADO de `t-expectativas`. |
| `t-eco` | R | T1 | B05 | Referencias ELECCION y TEXTO; elección por referencia. |
| `t-mision-intereses`, `t-mision-intereses-2` | Q | CIUDAD | B00 | RIASEC en dos misiones de 30 ítems; el resultado espera a las dos. B06: revelar y perfil plano. |
| `t-contraste` | R | CIUDAD | B06 | Se abre con REVELA_RESULTADO; referencias RESULTADO y COINCIDENCIAS. |
| `t-partida`, `t-llegada` | Q | T0, T2 | B07 | Partida y llegada por dimensión, con zonas. |
| `t-lee-cuestionario` | I | T1 | B07 | Una informativa con referencia RESPUESTA_CUESTIONARIO. |
| `t-batalla` | B | T1 | B08 | Perder y reintentar; SUPERA_BATALLA abre `t-explorar`. |
| `t-caso` | CASO | CIUDAD | B00 | B08: tipo RIASEC, colección y dos testimonios (`t-testimonio-1` con pista). |
| `t-explorar` | R | T1 | B10 | Se abre con `favoritos_diversos`. B11: abre los campos de trayecto y presupuesto. |
| `t-comparar` | R | T2 | B11 | Se abre con `planes_listos_para_comparar`; abre los campos restantes. |
| `t-proyecto` | R | T2 | B11 | Se abre con `acciones_plan_a`; cierra T2. |
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
| B02 | Registros: modelo, listas y borradores | 006, 010 | M | B01 | Borradores con elección validada; ítems, criterios y listas cargados desde `datos/` |
| B03 | Registros: entrega y seguimiento | 007, 016 | — | B02 | Entrega con seguimiento, omisión y fallo del LLM; la misión adicional aparece solo si todo quedó adecuado |
| B04 | Registros: respuesta consolidada y edición | 008 | — | B03 | Consolidación al cerrar; la edición se evalúa una vez |
| B05 | Referencias y eco | 009 | M | B04 | Citas literales; lo poco desarrollado sale como «por desarrollar» |
| B06 | Revelar resultados y libro de Helena | 022–024, 027, 095 | M | B05 | Revelar calcula y abre el registro de contraste; reinicio con perfil plano |
| B07 | Partida y llegada, temáticas y prioritarios | 094 | M | B06 | Comparación por dimensión; T2 se abre con los instrumentos prioritarios revelados |
| B08 | Batallas, casos y testimonios | 017, 041, 051–056 | M | B05 | Batalla con reintento; el caso libera testimonios y colección |
| B09 | Diario, pregunta del día y check-in | 028–033, 035, 036, 075 | M | B07 | Entradas fijas y personalizadas, también con fallo del LLM |
| B10 | Catálogo, instituciones y favoritos | 026, 037–040 | M | B06 | `t-explorar` bloqueado hasta tener favoritos diversos |
| B11 | Planes de carrera | 043–048, 050, 097–099 | M | B07, B08, B10 | Campos que se habilitan, presupuesto y requisitos de comparar y proyecto |
| B12 | Familia: ruta del apoderado, conversaciones y cartas | 066–071, 078–080 | M | B09, B11 | Conversaciones que se abren una por una; cartas al completar todas |
| B13 | Investigaciones y entrevistas | 057–065, 100, 101 | M | B10 | Investigación completa, con aliados, reacciones y Leyenda |
| B14 | Orientadora: seguimiento y configuración | 081–089 (108 si entra) | M | B07, B11, B12 | Sus estudiantes, sus registros, la configuración y las seis alertas |
| B15 | Informe de viaje y temas para conversar | 034, 102–105 | — | B11–B13 | Bitácora desde el primer día; las siete reglas de temas; endgame |
| B16 | Orientadora: vista del salón | 090–093, 107 | — | B14 | Capa 1 del panel |
| B17 | Acceso | 001 | — | B01 | Inicio y cierre de sesión con credenciales precargadas |

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

**B02 · Registros: modelo, listas y borradores (M)**
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

**B03 · Registros: entrega y seguimiento**
- **Hace:**
  - Agrega la acción `entregar` al nivel del registro, que reemplaza la evaluación por ítem.
  - Lleva el seguimiento a dos por registro, dando prioridad al núcleo.
  - Repregunta fija con encuadre y fragmento literal.
  - El evaluador falso aprende marcas por tipo de criterio.
- **Pruebas:**
  - Todo adecuado completa el registro y abre `t-adicional`.
  - Prioridad: núcleo, luego más faltantes, luego el primero.
  - Un ítem puede recibir las dos repreguntas; nunca hay una tercera.
  - Omitir cierra con la marca y sin misión adicional.
  - Un fragmento que no es literal va sin cita.
  - Con el LLM caído, una respuesta corta recibe la genérica y una larga queda sin evaluar.
  - El estudiante nunca recibe la clasificación.
- **Comprueba:** pasos 2 a 6 y 8 del seguimiento.

**B04 · Registros: respuesta consolidada y edición**
- **Pruebas:**
  - La respuesta se consolida al cerrar; si falla el LLM, se concatena.
  - La consulta devuelve la respuesta consolidada y qué ítems se pueden ampliar.
  - Editar evalúa una vez, sin seguimiento, y conserva `texto_inicial`. Si queda adecuada, quita la marca y abre la misión adicional.
- **Script manual con Gemini:** sobre `t-expectativas`; se corre solo si lo pide el usuario.
- **Comprueba:** paso 7.

**B05 · Referencias y eco (M)**
- **Modelo:** `Referencia`, que pertenece a una actividad o a una pregunta de diario, y la consulta que la resuelve.
- **Pruebas:**
  - Se cita la respuesta consolidada.
  - Lo poco desarrollado sale como «por desarrollar», y la cita aparece al ampliarlo.
  - Lo que quedó sin evaluar por un fallo sí se cita.
  - Nunca hay datos de otra cuenta.
  - Un tipo fuera del catálogo se rechaza al cargar.
  - Una elección por referencia solo acepta los códigos que esa referencia devuelve.
- **Comprueba:** regla 5; paso 9; RNF-20.

**B06 · Revelar resultados y libro de Helena (M)**
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

**B07 · Partida y llegada, temáticas y prioritarios (M)**
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

**B09 · Diario, pregunta del día y check-in (M)**
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

**B10 · Catálogo, instituciones y favoritos (M)**
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

**B11 · Planes de carrera (M)**
- **Modelo:**
  - `TarjetaCarrera`, `Presupuesto`, `GastoPresupuesto` y `AccionPreparacion`;
  - `Cuenta.opcion_inicial_id`;
  - `CampoTarjeta` y `TipoObjetivo.CAMPO_PLAN`;
  - eventos `CREA_PLAN` y `ACTUALIZA_PLAN`;
  - evaluadores `planes_listos_para_comparar` y `acciones_plan_a`.
- **Pruebas:**
  - El tope de tres planes.
  - Llenar un campo bloqueado responde 409 indicando qué actividad lo habilita.
  - La completitud se calcula sobre los campos habilitados.
  - Aviso cuando dos planes son de la misma familia o del mismo tipo.
  - La opción inicial solo se fija antes de completar T1.
  - El total del presupuesto se calcula por frecuencia.
  - Requisitos de `t-comparar` y `t-proyecto`.
  - Se resuelven PLAN, PLANES, ACCIONES_PLAN_A y OPCION_INICIAL.
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
  - Configurar prioritarios y visibilidad.
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

**B17 · Acceso**
- **Pruebas:**
  - Inicio y cierre de sesión.
  - Cada cuenta actúa solo sobre sí misma.
  - La orientadora actúa solo sobre su salón.

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
