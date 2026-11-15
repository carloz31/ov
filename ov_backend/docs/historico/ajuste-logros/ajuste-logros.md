# Ajuste logros

Spec para `/ajuste logros` sobre `main` del repo `carloz31/ov`. Reemplaza en el conjunto `contenido` las insignias, las páginas y las reglas de insignias que hoy se toman prestadas de `ruta` (entrada «Insignias, grupos, textos, pistas y evaluadores de vistas» de `PROVISIONALES`). Todo el contenido que hace falta está en este documento.

## 0. Alcance

**Entra:**
- 25 insignias del estudiante en 4 páginas del pasaporte, con sus textos, pistas y reglas (§2 y §3).
- Tres evaluadores nuevos: dos leen solo datos ya cargados y el de planes lee de la caché de planes (§4.1).
- Una caché de planes por petición, para que los evaluadores de planes no repitan lecturas ni carguen los planes completos cuando no hace falta (§4.2).
- El progreso «N de M» de los evaluadores en el pasaporte (§4.3).
- Una precisión en el refresco del front cuando lo único nuevo es una insignia (§5.2).

**No entra:**
- `ruta`: sus insignias `t-ins-*` y sus pruebas se quedan como están, porque es el banco de pruebas.
- Los niveles: siguen provisionales, con su propia entrada en `PROVISIONALES`.
- El diploma del apoderado.
- Un ícono por insignia: el front sigue usando el mismo para todas.

**Cuidado.** Hay pruebas con usuarios el 18 y el 19 de noviembre. El motor de reglas es lógica ya validada y este ajuste no debe cambiar ningún desbloqueo que no sea de insignias. En concreto:
- `evaluar_regla` no cambia cuándo se cumple una regla.
- La caché de planes no cambia lo que devuelve `GET planes`.
- La suite completa y los presupuestos de consultas actuales deben seguir pasando.

## 1. Criterios de diseño (del usuario)

- Los títulos deben llamar la atención de un estudiante de 5.° de secundaria. Son misteriosos y neutros en género, y ninguno nombra códigos de actividad.
- Los ocultos no dicen qué piden. Mientras no se obtienen, solo se ve la pista de Lumi.
- Ningún logro premia velocidad, intentos ni favoritos.
- Ningún logro depende de b2-1, b2-2, b3-6, b3-7 ni b3-9 como requeridas, porque pasan a opcionales con el recorte del volcán y del puerto.
- Los recuerdos de Lumi tienen su propio logro («Alguien preguntó») y no cuentan para «La isla entera».
- Las insignias de `ruta` desaparecen de `contenido`, incluidas «Exploradora de familias» y «Exploradora de intereses». La exploración del catálogo queda en «Diez caminos a la vista», «Diez oficios, diez vidas» y «Todas las puertas».

## 2. Páginas del pasaporte

| Código | Nombre | Orden |
|---|---|---|
| `G-camino` | La luz que despeja caminos | 1 |
| `G-ciudad` | Huellas en la ciudad | 2 |
| `G-planes` | El mapa que trazo | 3 |
| `G-oculto` | Lo que no se ve a simple vista | 4 |

## 3. Insignias

Campos (los mismos de `ruta`):
- **Historia** (`descripcion`): en una visible se lee aunque no esté obtenida, así que no debe adelantar nada.
- **Requisito**: lo que pide.
- **Frase**: la frase destacada.
- **Logro**: cómo se consiguió, en pasado y en minúscula.
- **Pista**: solo en las ocultas.
- **Condición**: el texto de cada condición (`TEXTOS_CONDICIONES`), en el orden de la regla.

Cada insignia tiene una sola regla, `R-<código>`. En la columna de la regla, «+ evaluador» indica que la regla lleva evaluador especial y que su condición solo sirve para reevaluarla (§4).

**Mensajes de bloqueo.** Siguen la convención de `tests/integration/datos/test_mensajes_reglas_contenido.py`: toda condición con referencia nombra su título entre «». Si esa prueba no alcanza a las reglas `INSIGNIA`, igual se aplica la convención. En las ocultas el mensaje no se muestra (el progreso responde 403), pero se escribe igual.

### 3.1 La luz que despeja caminos

| # | Código | Nombre | Oculta | Regla |
|---|---|---|---|---|
| 1 | `ins-chispa` | La primera chispa | No | `COMPLETA_ACTIVIDAD b0-1`, EVENTOS, 1 |
| 2 | `ins-primera-sombra` | La primera sombra | No | `SUPERA_BATALLA` sin referencia, EVENTOS, 1 |
| 3 | `ins-destello` | Destello intacto | Sí | `VENCE_DESAFIO_INTACTO`, EVENTOS, 1 |
| 4 | `ins-sin-sombras` | Ninguna sombra en pie | No | `SUPERA_BATALLA` sin referencia, EVENTOS, 1 + evaluador `todas_las_batallas` |
| 5 | `ins-helena` | Lo que Helena descifró | No | `REVELA_RESULTADO APL-RIASEC`, `REVELA_RESULTADO APL-HABILIDADES` y `REVELA_RESULTADO APL-INTELIGENCIAS`, EVENTOS, 1 cada una |
| 6 | `ins-bitacora` | Bitácora completa | No | `COMPLETA_ACTIVIDAD` sin referencia, EVENTOS, 1 + evaluador `todos_los_registros` |
| 7 | `ins-faro` | Más allá del faro | No | `COMPLETA_ACTIVIDAD b5-5`, EVENTOS, 1 |
| 8 | `ins-isla` | La isla entera | Sí | `COMPLETA_ACTIVIDAD` sin referencia, EVENTOS, 1 + evaluador `todas_las_actividades` |

**La primera chispa** (`ins-chispa`)
- Historia: «Antes de buscar un destino decidiste mirar. Ese primer paso, el de aceptar que todavía no sabes, es el que abre todos los demás.»
- Requisito: «Conoce a Lumi en el muelle.»
- Frase: «Una nueva mirada viaja contigo.»
- Logro: «conociste a Lumi en el muelle.»
- Condición: «Completa la misión «Bienvenida: la vocación se construye»»

**La primera sombra** (`ins-primera-sombra`)
- Historia: «Toda idea equivocada proyecta una sombra. La primera que disipes te enseñará que se vencen con información, no con suerte.»
- Requisito: «Gana tu primera batalla.»
- Frase: «La primera sombra siempre parece la más grande.»
- Logro: «ganaste tu primera batalla.»
- Condición: «Gana una batalla»

**Destello intacto** (`ins-destello`)
- Historia: «Enfrentaste una idea equivocada sin perder ni un destello. Contrastar lo que crees con lo que sabes te deja mirar con más claridad.»
- Requisito: «Gana una batalla sin perder destellos.»
- Frase: «La información hace brillar tu camino.»
- Logro: «ganaste una batalla sin perder destellos.»
- Pista: «No todo brillo sobrevive a una batalla. El que no se apaga ni una vez, deja huella.»
- Condición: «Gana una batalla sin perder destellos»

**Ninguna sombra en pie** (`ins-sin-sombras`)
- Historia: «Algunas sombras se esconden y solo aparecen cuando respondes con calma. Esta insignia es para quien las encuentra todas.»
- Requisito: «Gana todas las batallas de la isla, también las que aparecen en el camino.»
- Frase: «Ninguna idea falsa te sigue el paso.»
- Logro: «ganaste todas las batallas de la isla.»
- Condición: «Batallas ganadas» (se muestra con el progreso del evaluador, §4.3)

**Lo que Helena descifró** (`ins-helena`)
- Historia: «Helena guarda tres páginas en blanco con tu nombre. Cuando las descifres, dirán algo de ti que hoy solo intuyes.»
- Requisito: «En el libro de Helena, rompe los sellos de «Lo que te atrae hacer», «Cómo te relacionas» y «Tus formas de ser inteligente».»
- Frase: «Conocerte también se aprende.»
- Logro: «rompiste los tres sellos del libro de Helena.»
- Condiciones: «Rompe el sello de «Lo que te atrae hacer»», «Rompe el sello de «Cómo te relacionas»» y «Rompe el sello de «Tus formas de ser inteligente»»

**Bitácora completa** (`ins-bitacora`)
- Historia: «Cada registro es una página de tu bitácora. Algunas solo aparecen cuando las anteriores dicen algo de verdad.»
- Requisito: «Completa todos los registros, también los que aparecen en el camino y en la ciudad.»
- Frase: «Lo que escribes también te orienta.»
- Logro: «completaste todos los registros de la isla.»
- Condición: «Registros completados» (progreso del evaluador)

**Más allá del faro** (`ins-faro`)
- Historia: «Cruza la isla de punta a punta. Lo que viene después ya no está en ningún mapa.»
- Requisito: «Abre el pergamino en la sala de la luz.»
- Frase: «El viaje sigue, ahora sin mapa.»
- Logro: «abriste el pergamino en la sala de la luz.»
- Condición: «Completa la misión «Lo que decía el pergamino»»

**La isla entera** (`ins-isla`)
- Historia: «No te quedaste en el camino marcado: entraste a cada rincón de la isla, también a los que había que ganarse.»
- Requisito: «Completa todas las misiones del camino y de la ciudad, incluidas las opcionales.»
- Frase: «Ningún rincón quedó a oscuras.»
- Logro: «completaste todas las misiones de la isla.»
- Pista: «Hay quienes cruzan la isla y quienes la recorren entera.»
- Condición: «Misiones completadas»

### 3.2 Huellas en la ciudad

| # | Código | Nombre | Oculta | Regla |
|---|---|---|---|---|
| 1 | `ins-caso` | Caso cerrado | No | `SUPERA_CASO` sin referencia, EVENTOS, 1 |
| 2 | `ins-expediente` | Expediente completo | No | `SUPERA_CASO` sin referencia, EVENTOS, 1 + evaluador `todos_los_casos` |
| 3 | `ins-carreras` | Diez caminos a la vista | Sí | `VISTA_CARRERA` sin referencia, REFERENCIAS_DISTINTAS, 10 |
| 4 | `ins-ocupaciones` | Diez oficios, diez vidas | Sí | `VISTA_OCUPACION` sin referencia, REFERENCIAS_DISTINTAS, 10 |
| 5 | `ins-puertas` | Todas las puertas | Sí | `VISTA_INSTITUCION` sin referencia, EVENTOS, 1 + evaluador `instituciones_tipos_distintos` con parámetro nulo (todos los tipos; ya existe) |
| 6 | `ins-voz` | Voz de la ciudad | No | `PUBLICA_ENTREVISTA`, EVENTOS, 1 |
| 7 | `ins-leyenda` | Leyenda | No | `ENTREVISTA_LEYENDA`, EVENTOS, 1 |

**Caso cerrado** (`ins-caso`)
- Historia: «En la Central, cada caso es un problema real que se resuelve con las personas correctas. El primero es el más difícil de armar.»
- Requisito: «Resuelve tu primer caso en la Central.»
- Frase: «Cada oficio tiene su lugar en el equipo.»
- Logro: «resolviste tu primer caso en la Central.»
- Condición: «Resuelve un caso de la Central»

**Expediente completo** (`ins-expediente`)
- Historia: «Seis lugares, seis problemas y muchos oficios distintos. Quien los resuelve todos conoce la ciudad mejor que nadie.»
- Requisito: «Resuelve los seis casos de la Central.»
- Frase: «La ciudad ya no tiene secretos para ti.»
- Logro: «resolviste los seis casos de la Central.»
- Condición: «Casos resueltos» (progreso del evaluador)

**Diez caminos a la vista** (`ins-carreras`)
- Historia: «Te asomaste a diez carreras distintas. Mirar varias antes de elegir es la mejor forma de no quedarte con la primera.»
- Requisito: «Mira el detalle de diez carreras distintas en el catálogo.»
- Frase: «Elegir empieza por mirar.»
- Logro: «miraste diez carreras distintas en el catálogo.»
- Pista: «Una carrera vista es una puerta entreabierta. ¿Cuántas te animas a abrir?»
- Condición: «Carreras distintas vistas»

**Diez oficios, diez vidas** (`ins-ocupaciones`)
- Historia: «Conociste diez formas distintas de pasar un día de trabajo. Cada una es otra manera de imaginarte en el futuro.»
- Requisito: «Mira el detalle de diez ocupaciones distintas en el catálogo.»
- Frase: «Un oficio es una forma de vivir el día.»
- Logro: «miraste diez ocupaciones distintas en el catálogo.»
- Pista: «Detrás de cada carrera hay oficios muy distintos. Asómate a unos cuantos.»
- Condición: «Ocupaciones distintas vistas»

**Todas las puertas** (`ins-puertas`)
- Historia: «Conociste todas las formas de seguir estudiando. Saber qué puertas existen te deja elegir con más libertad.»
- Requisito: «Mira instituciones de todos los tipos.»
- Frase: «Conocer las puertas también es avanzar.»
- Logro: «miraste instituciones de todos los tipos.»
- Pista: «Hay más de una puerta para estudiar. Asómate a todas antes de elegir una.»
- Condición: «Mira instituciones de todos los tipos»

**Voz de la ciudad** (`ins-voz`)
- Historia: «Conversaste con alguien que ejerce un oficio y lo compartiste con tu salón. Preguntar a quien ya recorrió el camino lo vuelve más real.»
- Requisito: «Publica una entrevista.»
- Frase: «Preguntar abre caminos.»
- Logro: «publicaste una entrevista.»
- Condición: «Publica una entrevista»

**Leyenda** (`ins-leyenda`)
- Historia: «Tu entrevista quedó como Leyenda: la verán otros salones y otras promociones.»
- Requisito: «Logra que tu entrevista sea Leyenda.»
- Frase: «Tu voz llega lejos.»
- Logro: «tu entrevista llegó a Leyenda.»
- Condición: «Logra que tu entrevista sea Leyenda»

### 3.3 El mapa que trazo

| # | Código | Nombre | Oculta | Regla |
|---|---|---|---|---|
| 1 | `ins-plan-a` | Un destino en el mapa | No | `CREA_PLAN` sin referencia, REFERENCIAS_DISTINTAS, 1 |
| 2 | `ins-plan-b` | Otra ruta posible | No | `CREA_PLAN` sin referencia, REFERENCIAS_DISTINTAS, 2 |
| 3 | `ins-plan-c` | Tres rumbos | No | `CREA_PLAN` sin referencia, REFERENCIAS_DISTINTAS, 3 |
| 4 | `ins-plan-completo` | Rumbo trazado | No | `ACTUALIZA_PLAN` sin referencia, EVENTOS, 1 + evaluador `planes_completos` con parámetro 1 |
| 5 | `ins-planes-completos` | Ningún cabo suelto | Sí | `ACTUALIZA_PLAN` sin referencia, EVENTOS, 1 + evaluador `planes_completos` con parámetro 3 |

- **Planes A, B y C.** Se cuentan con eventos: la referencia de `CREA_PLAN` es la carrera del plan, así que «Tres rumbos» se obtiene al haber creado planes para tres carreras distintas. Si el estudiante elimina un plan y crea otro de otra carrera, también cuenta. Se acepta así porque no cuesta ninguna consulta, y un desbloqueo es permanente de todas formas.
- **Plan completo.** Es el que tiene sus cuatro secciones (POR_QUE, CONOCIMIENTO, REALIDAD y PASOS) en LISTA, con el criterio de `planes.md`. Los medidores no cuentan, porque no son secciones. Es el sello «Plan completo» que el usuario ya había decidido.

**Un destino en el mapa** (`ins-plan-a`)
- Historia: «Un plan no es una promesa: es una opción real que puedes mirar, mover y cambiar. El primero es el que da nombre al viaje.»
- Requisito: «Crea tu Plan A en «Mis planes».»
- Frase: «Elegir un rumbo no cierra los demás.»
- Logro: «creaste tu Plan A.»
- Condición: «Crea un plan en «Mis planes»»

**Otra ruta posible** (`ins-plan-b`)
- Historia: «Tener una segunda opción no es dudar de la primera: es tener por dónde seguir si el camino cambia.»
- Requisito: «Crea tu Plan B en «Mis planes».»
- Frase: «Dos rutas, más libertad.»
- Logro: «creaste tu Plan B.»
- Condición: «Planes creados»

**Tres rumbos** (`ins-plan-c`)
- Historia: «Con tres opciones sobre la mesa puedes compararlas de verdad y ver qué tienen en común.»
- Requisito: «Crea tu Plan C en «Mis planes».»
- Frase: «Comparar también es decidir.»
- Logro: «creaste tu Plan C.»
- Condición: «Planes creados»

**Rumbo trazado** (`ins-plan-completo`)
- Historia: «Por qué la eliges, qué sabes de ella, qué tan real es y cuáles son tus próximos pasos: cuando un plan tiene todo eso, ya puedes conversarlo en casa.»
- Requisito: «Completa las cuatro secciones de uno de tus planes.»
- Frase: «Un rumbo claro se puede contar.»
- Logro: «completaste las cuatro secciones de un plan.»
- Condición: «Planes con sus cuatro secciones completas» (progreso del evaluador)

**Ningún cabo suelto** (`ins-planes-completos`)
- Historia: «Tus tres planes quedaron completos. Ya no son ideas sueltas: son tres rutas que puedes comparar y defender.»
- Requisito: «Completa las cuatro secciones de tus tres planes.»
- Frase: «Tres rutas, ningún cabo suelto.»
- Logro: «completaste las cuatro secciones de tus tres planes.»
- Pista: «Un plan completo es un buen comienzo. ¿Y si los tres lo estuvieran?»
- Condición: «Planes con sus cuatro secciones completas»

### 3.4 Lo que no se ve a simple vista

| # | Código | Nombre | Oculta | Regla |
|---|---|---|---|---|
| 1 | `ins-senderos` | Senderos que no estaban en el mapa | Sí | `REGISTRO_ADECUADO` sin referencia, REFERENCIAS_DISTINTAS, 3 |
| 2 | `ins-lumi` | Alguien preguntó | Sí | `COMPLETA_ACTIVIDAD` de `lumi-1`, `lumi-2`, `lumi-3`, `lumi-4` y `lumi-5`, EVENTOS, 1 cada una |
| 3 | `ins-brujula` | Brújula interna | No | `REGISTRA_CHECK_IN`, DIAS_DISTINTOS, 5 |
| 4 | `ins-conversacion` | La otra mitad de la historia | No | `COMPLETA_CONVERSACION` sin referencia, EVENTOS, 1 |
| 5 | `ins-sobremesa` | Sobremesa larga | Sí | `COMPLETA_CONVERSACION` sin referencia, EVENTOS, 1 + evaluador `todas_las_conversaciones` |

**Senderos que no estaban en el mapa** (`ins-senderos`)
- Historia: «Te tomaste en serio tus respuestas, y la isla te mostró caminos que no estaban en el mapa.»
- Requisito: «Completa tres registros con respuestas desarrolladas.»
- Frase: «Pensar despacio abre atajos.»
- Logro: «completaste tres registros con respuestas desarrolladas.»
- Pista: «Hay caminos que solo aparecen cuando alguien se toma su tiempo para responder.»
- Condición: «Registros con respuestas desarrolladas»

**Alguien preguntó** (`ins-lumi`)
- Historia: «A Lumi nadie le preguntó adónde quería ir. Tú le escribiste, y te contó su historia completa.»
- Requisito: «Escucha los cinco recuerdos de Lumi en tu diario.»
- Frase: «Escuchar también es un camino.»
- Logro: «escuchaste los cinco recuerdos de Lumi.»
- Pista: «Lumi guarda una historia que nunca le contó a nadie. Quizá solo espera que alguien le escriba.»
- Condiciones: una por recuerdo, con su título: «Escucha «De dónde vengo»», «Escucha «Lo que escribí en el tronco»», «Escucha «Un poco de todo»», «Escucha «Hasta la mitad»» y «Escucha «Lo que elijo yo»»

**Brújula interna** (`ins-brujula`)
- Historia: «La brújula de Iván señala la ciudad. Hay otra que solo tú sabes leer: cómo te sientes con tu decisión, día a día.»
- Requisito: «Haz tu check-in en cinco días distintos.»
- Frase: «Lo que sientes también orienta.»
- Logro: «hiciste tu check-in en cinco días distintos.»
- Condición: «Días con check-in»

**La otra mitad de la historia** (`ins-conversacion`)
- Historia: «Tu familia también tiene una versión de tu camino. Escucharla no decide por ti: te da la otra mitad.»
- Requisito: «Completa una conversación con tu familia en «En familia».»
- Frase: «Dos miradas ven más lejos.»
- Logro: «completaste una conversación con tu familia.»
- Condición: «Completa una conversación con tu familia»

**Sobremesa larga** (`ins-sobremesa`)
- Historia: «Conversaron de lo que te gusta, de lo que temen y de lo que esperan. Pocas mesas aguantan tanta sobremesa.»
- Requisito: «Completa todas las conversaciones con tu familia.»
- Frase: «En casa también se encuentra el rumbo.»
- Logro: «completaste todas las conversaciones con tu familia.»
- Pista: «Hay conversaciones que no caben en una sola noche.»
- Condición: «Conversaciones completadas»

**Total:** 25 insignias, 16 visibles y 9 ocultas.

## 4. Backend

### 4.1 Evaluadores nuevos (`app/services/motor/evaluadores.py`)

Los dos primeros leen solo `datos.conteos`, que ya se carga en una consulta por cuenta y petición, y `datos.definiciones`, que es caché. No hacen ninguna consulta propia. Usan los eventos (los mismos que `_vistos`) en lugar de `progreso_actividad`. Los conteos se invalidan en `registrar_eventos` después de insertar, así que nunca leen un estado viejo de la misma acción. En cambio, `progresos_de` podría haberse cargado antes de la escritura.

- **`actividades_completas(tipo)`.** Las actividades de bloques de audiencia ESTUDIANTE, sin el bloque LUMI y, si se da `tipo`, solo las de ese tipo, deben tener todas un `COMPLETA_ACTIVIDAD`.
  - Una batalla y un caso solo emiten `COMPLETA_ACTIVIDAD` al superarse, en la misma llamada a `registrar_eventos` que `SUPERA_BATALLA` o `SUPERA_CASO` (`resolver_batalla` y `resolver_caso`; `completar_actividad` los rechaza). Ya está verificado en `main`.
  - Se registra con cuatro nombres, con `partial`, porque `parametro_evaluador` es entero:

    | Nombre | Tipo |
    |---|---|
    | `todas_las_batallas` | BATALLA |
    | `todos_los_casos` | CASO |
    | `todos_los_registros` | REGISTRO |
    | `todas_las_actividades` | sin filtro |

  - El conjunto de ids por tipo se arma desde las definiciones; si conviene, se guarda junto a ellas. El total sale del contenido cargado, sin cifras fijas. Hoy son 8 batallas, 6 casos, 19 registros y todas las actividades del estudiante salvo LUMI; si el contenido cambia, el logro se ajusta solo.
- **`todas_las_conversaciones`.** Todas las `conversacion` cargadas tienen un `COMPLETA_CONVERSACION` de la cuenta.
- **`planes_completos(parametro)`.** Al menos `parametro` planes activos con todas las secciones de `seccion_tarjeta` en LISTA, con el mismo criterio de `estado_seccion` y `_lista` (las secciones se leen de las definiciones). Lee de la caché de §4.2 y mira primero solo las tarjetas, como se explica ahí. Es el único de los tres que puede consultar.

Todos se agregan a `EVALUADORES` y a `docs/sistema/motor.md`.

### 4.2 Caché de planes por petición (corrige una repetición que ya existe)

**El problema.** `contar_listos_para_comparar` llama a `cargar_planes` cada vez, y son hasta 9 consultas (las tarjetas más 8 tablas hijas). El evaluador guarda su resultado por `(nombre, parámetro)`, así que cada evaluador de planes distinto repite la carga. `pasos_plan_a` no entra en esto: hace un solo `COUNT`.
- Hoy, un `guardar-seccion` con R-b4-1, R-b4-5 y R-b5-1 aún pendientes carga los planes 2 veces (`por_que_en_planes` con 1 y con 2) y hace el conteo de `pasos_plan_a`.
- Con `ins-plan-completo` e `ins-planes-completos` serían 4 cargas.
- Además, hoy las acciones de planes dejan de cargar los planes cuando esas tres reglas ya se obtuvieron. `ins-planes-completos` quedará pendiente para casi todos los estudiantes y su condición es `ACTUALIZA_PLAN`, así que sin más cuidado cada `guardar-seccion`, `guardar-medidores`, `marcar-paso-hecho` y `ordenar-planes` haría una carga completa para siempre.

**La corrección:**
- `ContextoConsultas.planes_de(cuenta_id)` guarda el `DatosPlanes` de la cuenta durante la petición, en dos niveles:
  - las tarjetas activas (1 consulta);
  - las filas hijas (8 consultas), que se cargan solo cuando alguien las pide.
- `invalidar_eventos(cuenta_id)` borra ambos niveles junto con los conteos. Esa función corre en `registrar_eventos` después de las escrituras de la acción y antes de evaluar, y también en `responder_varias_cuentas`.
- `contar_listos_para_comparar` lee de ahí, con las hijas.
- `pasos_plan_a` no se toca.
- `planes_completos` mira primero solo las tarjetas y cuenta las que tienen sus cuatro secciones guardadas (los campos de `GUARDADA`). Una sección sin fecha de guardado está en POR_EMPEZAR, así que ese plan no puede estar completo.
  - Si esas tarjetas son menos que `parametro`, devuelve no cumplido sin cargar las hijas. El avance es 0 de `parametro` si no hay ninguna; en otro caso devuelve `bool` y queda sin avance.
  - Solo si alcanzan, carga las hijas y aplica `estado_seccion`.
  - Así el caso normal cuesta 1 consulta y no 9.
- `GET planes` puede seguir con su carga propia: no se toca su salida.

**Comprobación.** Si al implementar resulta que alguna acción lee los planes antes de escribir dentro de la misma petición y luego evalúa sin pasar por `invalidar_eventos`, se avisa antes de seguir.

### 4.3 Progreso de los evaluadores en el pasaporte

**El problema.** Una insignia visible con evaluador hoy mostraría «1 de 1 cumplidas»: la condición que la reevalúa se cumple al primer evento, aunque el evaluador no.

**La corrección:**
- `ResultadoEvaluador` (`app/schemas/motor.py`) suma dos campos opcionales, `actual` y `requerido`.
- Los evaluadores de §4.1 devuelven, además del booleano, su avance (batallas ganadas de las del contenido, planes completos sobre el parámetro, etc.). Por ejemplo, con un valor `Avance(actual, requerido)` que `evaluar_regla` convierte a `cumplido = actual >= requerido`. Los evaluadores que ya existen siguen devolviendo `bool` y quedan sin avance.
- Esto no cambia cuándo se cumple una regla: solo agrega datos a la respuesta.
- `GET /progreso/INSIGNIA/{código}` y `nuevos_desbloqueos` llevan esos campos. Las fixtures exportadas al front se regeneran (`test_exportar_fixtures_front`).

### 4.4 Datos (`datos/contenido.py`)

- `INSIGNIAS`, `GRUPOS_INSIGNIA`, `PAGINAS_INSIGNIAS`, `TEXTOS_INSIGNIAS` y `PISTAS_INSIGNIAS` son propios, con lo de §2 y §3.
- Las reglas `R-ins-*` van en `REGLAS`, sus textos en `TEXTOS_CONDICIONES` y sus evaluadores en `EVALUADORES_REGLAS`.
- Se quita todo lo que hoy se toma de `ruta` para insignias:
  - la sobrescritura de `t-ins-1`;
  - `R-t-ins-1`;
  - el filtro `r[1] == 'INSIGNIA'` sobre `ruta.REGLAS`;
  - el filtro `R-t-ins-` de `EVALUADORES_REGLAS` y de `TEXTOS_CONDICIONES`.
- En `PROVISIONALES` sale la entrada de insignias y queda la de niveles.
- Las reglas de los niveles provisionales no se tocan.
- La carga con `--vaciar` borra el estado, así que el cambio de códigos no deja desbloqueos ni vitrinas huérfanas. Las cuentas de la prueba aún no existen en producción. Si algo de esto no se cumple, se avisa.

### 4.5 Pruebas

Las que existen de `ruta` (`t-ins-*`) no cambian. Se agregan:

- **Carga de `contenido`:**
  - las 25 insignias con su página, sus textos y su regla;
  - pista solo en las ocultas;
  - ningún texto nombra códigos de actividad;
  - mensajes con «título» según la convención.
- **Evaluadores:**
  - `actividades_completas` por tipo y sin tipo, sin LUMI;
  - una batalla perdida no cuenta;
  - un caso fallido no cuenta;
  - `todas_las_conversaciones`;
  - `planes_completos` con 1 y con 3, sin contar los planes inactivos;
  - `planes_completos` no carga las filas hijas cuando las tarjetas con sus cuatro secciones guardadas son menos que el parámetro;
  - el avance que devuelve cada uno.
- **Escenario de `contenido`:** al menos `ins-chispa`, `ins-primera-sombra`, `ins-plan-a`, `ins-carreras` (10 vistas distintas; una vista repetida no suma) e `ins-brujula` (5 días; dos check-ins el mismo día no suman).
- **Presupuestos:**
  - `completar-actividad`, `responder-batalla`, `guardar-seccion` y `GET logros` no crecen con estas insignias. Se miden con y sin ellas, o se extiende `tests/integration/motor/test_presupuestos_motor.py` y `tests/integration/planes/test_presupuesto_planes.py`.
  - `guardar-seccion` carga los planes una sola vez por evaluación, aunque haya varias reglas de planes pendientes.
  - Con R-b4-1, R-b4-5 y R-b5-1 ya obtenidas y las insignias de planes pendientes, `guardar-seccion`, `guardar-medidores`, `marcar-paso-hecho` y `ordenar-planes` hacen a lo más dos lecturas más que hoy (la de conteos de eventos y la de tarjetas), salvo cuando hay al menos `parametro` planes con sus cuatro secciones guardadas. (Corregido al implementar: decía «una consulta más»; ver `decisiones.md`.)
  - `GET /progreso/INSIGNIA` de una insignia con evaluador hace a lo más las consultas de hoy más una carga de planes, y solo la de tarjetas si ningún plan tiene sus cuatro secciones guardadas.

## 5. Front

### 5.1 Progreso en el pasaporte

En `condicionesObjetivo` (`src/lib/servidor/adaptadores.ts`), solo para insignias, una regla con `evaluador_especial` que trae `requerido` muestra su única condición con estos datos del evaluador:
- `cumplida` del evaluador;
- `actual` y `requerido` del evaluador, con el mismo tope que ya se aplica a las condiciones.

El texto de la condición no cambia. Así «Batallas ganadas» se ve como «5 de 8». Las reglas sin avance del evaluador se ven como hoy.

### 5.2 Refresco tras una acción (sin cargar más al servidor)

**El problema.** Según el criterio F2b de la auditoría, una acción que no cambia el progreso refresca solo cuando trae desbloqueos. Con más insignias, más acciones traen alguna: por ejemplo, la décima vista de una carrera o el quinto check-in.

**La corrección:**
- Si **todos** los `nuevos_desbloqueos` de la respuesta son `INSIGNIA`, el front vence solo `logros` y no pide `GET actividades`.
- Si viene cualquier otro tipo, incluido NIVEL (el título del panel del mapa), se refresca como hoy.
- El aviso y la campana no cambian.
- Se verifica que ninguna vista del camino o de la ciudad dependa de una insignia.

### 5.3 Pasaporte

`insigniasServidor` ya arma las páginas desde la API: debe verse bien con 4 páginas y 25 insignias en vez de 2 y 7, sin pedir nada más. El pasaporte sigue con un solo `GET logros`, el de hoy.

## 6. Documentación

- **`docs/sistema/motor.md`:** los evaluadores nuevos, el avance de `ResultadoEvaluador` y la caché de planes.
- **`docs/sistema/planes.md`:** que `contar_listos_para_comparar` y `planes_completos` leen de la caché, y que `planes_completos` mira primero solo las tarjetas.
- **Decisiones del ajuste:**
  - planes A, B y C por carreras distintas creadas;
  - plan completo = 4 secciones en LISTA, sin medidores;
  - «La isla entera» sin LUMI;
  - recrear un plan eliminado lo reactiva con sus secciones y emite `CREA_PLAN`, no `ACTUALIZA_PLAN`: si con eso se llega a tres planes completos, «Ningún cabo suelto» se obtiene en la siguiente acción sobre un plan. Se acepta así;
  - el refresco de §5.2.

## Adenda de niveles


Adenda a la spec de `/ajuste logros`. Agrega al plan vigente los niveles definitivos del estudiante en el conjunto `contenido`. Con esto, la entrada «Niveles y citas de Lumi» de `PROVISIONALES` también sale en este ajuste. Todo el contenido que hace falta está aquí.

### 1. Qué cambia respecto a la spec

- **§0, «No entra»:** se quita la línea de los niveles. Los niveles entran.
- **§0, «Cuidado»:** el ajuste no debe cambiar ningún desbloqueo que no sea de insignias o de niveles.
- **§4.4:** en `PROVISIONALES` salen las dos entradas, la de insignias y la de niveles. Las reglas `R-NIV-2` y `R-NIV-3` provisionales se reemplazan por las de esta adenda.
- **`ruta`** no cambia: sus niveles, sus reglas `R-NIV-*` y sus pruebas se quedan como están.

### 2. Criterios (del usuario)

- Son pocos y cada uno coincide con una fase del proceso que el estudiante reconoce: llegar, conocerse, explorar y decidir.
- El título dice en qué parte del camino va el estudiante, no cuánto vale. Es neutro en género.
- Dependen solo del avance propio en el camino. Ninguno pide conversaciones familiares, entrevistas, planes ni vistas del catálogo: eso ya lo cubren las insignias.
- No se pueden saltar: los tramos se abren en cadena, así que el pasaporte nunca muestra un nivel bloqueado debajo de uno obtenido.

### 3. Niveles

| Nivel | Título | Regla | Condición |
|---|---|---|---|
| 1 | Visitante del muelle | sin regla (nivel inicial) | |
| 2 | Caminante sin apuro | `R-NIV-2` | `COMPLETA_BLOQUE B0`, EVENTOS, 1 |
| 3 | Detective de pistas propias | `R-NIV-3` | `COMPLETA_BLOQUE B2`, EVENTOS, 1 |
| 4 | Navegante de oficios | `R-NIV-4` | `COMPLETA_BLOQUE B3`, EVENTOS, 1 |
| 5 | Timonel de rumbo propio | `R-NIV-5` | `COMPLETA_BLOQUE B5`, EVENTOS, 1 |

Ninguna regla lleva evaluador especial ni más de una condición.

**Textos de cada nivel** (`NIVELES` y `CITAS_LUMI`):

| Nivel | Descripción | Cita de Lumi |
|---|---|---|
| 1 | Acabas de llegar a la isla. Todavía no hay mapa: solo ganas de mirar. | Mirar con calma también es avanzar. |
| 2 | Ya tienes compañía, un punto de partida y permiso para dudar. | Los títulos no dicen cuánto vales. Dicen en qué parte del camino vas. |
| 3 | Juntaste pistas sobre tu historia, lo que valoras y lo que se te da bien. Ahora sabes mejor qué buscas. | Conocerte no te encierra: te da por dónde empezar. |
| 4 | Recorriste el puerto y ya sabes cómo se ven por dentro los estudios y el trabajo. | Un mapa no te dice adónde ir; te muestra por dónde podrías. |
| 5 | Ordenaste tus opciones, trazaste tus pasos y abriste el pergamino. Lo que sigue se decide fuera de la isla. | Yo también voy a buscar mi camino. Gracias por enseñarme cómo. |

**Mensajes de bloqueo y textos de condición.** Siguen la convención de los tramos: nombran la misión exacta que cierra el tramo.

| Regla | Mensaje de bloqueo | Texto de la condición |
|---|---|---|
| `R-NIV-2` | Completa «Dudar también es avanzar», la última misión del tramo «Inicio». | Termina el tramo «Inicio» |
| `R-NIV-3` | Completa «Intereses y ambientes de trabajo», la última misión del tramo «Me conozco». | Termina el tramo «Me conozco» |
| `R-NIV-4` | Completa «Caminos que no van en línea recta», la última misión del tramo «Exploro el mundo profesional». | Termina el tramo «Exploro el mundo profesional» |
| `R-NIV-5` | Completa «Lo que decía el pergamino», la última misión del tramo «Mi decisión». | Termina el tramo «Mi decisión» |

La misión que se nombra debe ser la última requerida del tramo en el `main` sobre el que se implementa, la misma que nombran los mensajes de `R-B1`, `R-B3`, `R-B4` y la regla de cierre del camino. Si los recortes del volcán o del puerto la cambiaron, se usa la vigente y se avisa.

### 4. Backend (`datos/contenido.py`)

- `NIVELES` y `CITAS_LUMI` pasan a ser propios, con lo de §3. Ya no se toman de `ruta`.
- En `REGLAS` se reemplazan `R-NIV-2` y `R-NIV-3` y se agregan `R-NIV-4` y `R-NIV-5`.
- En `TEXTOS_CONDICIONES` se reemplazan los textos de `R-NIV-2` y `R-NIV-3` y se agregan los de `R-NIV-4` y `R-NIV-5`.
- En `PROVISIONALES` sale la entrada «Niveles y citas de Lumi».
- No cambia el motor: `nivel_actual` sigue tomando el nivel más alto disponible.
- Vale lo mismo que para las insignias: la carga con `--vaciar` borra el estado. Si algo de eso no se cumple, se avisa.

**Consultas.** Estas reglas solo son candidatas cuando la acción emite `COMPLETA_BLOQUE`, y se resuelven con los conteos ya cargados. No agregan consultas a ninguna acción ni a `GET logros`.

### 5. Front

- El pasaporte y el panel del mapa ya leen los niveles de la API. Deben verse bien con 5 niveles en vez de 3, sin pedir nada más.
- Un nivel nuevo siempre llega junto con el cierre de un tramo, que ya refresca el mapa. El refresco de §5.2 de la spec no cambia: un desbloqueo `NIVEL` se trata como hoy.
- Se verifica que ningún texto del front tenga fijos los tres títulos provisionales ni el número de niveles. Las fixtures exportadas se regeneran.

### 6. Pruebas

Las de `ruta` no cambian. Las de `contenido` que dependan de los niveles provisionales (por ejemplo, del nivel 3 por ver tres carreras) se adaptan. Se agregan:

- **Carga de `contenido`:** los 5 niveles con su título, descripción y cita; los niveles 2 a 5 con una sola regla de una sola condición `COMPLETA_BLOQUE`, sin evaluador.
- **Escenario de `contenido`:**
  - al cerrar B0 se obtiene el nivel 2;
  - al cerrar B2, el 3;
  - al cerrar B3, el 4;
  - al cerrar B5, el 5;
  - ver carreras ya no sube de nivel;
  - `nivel_actual` devuelve en cada paso el nivel más alto obtenido.
- **Presupuestos:** los de la spec siguen valiendo con los niveles nuevos, sin margen adicional.

### 7. Documentación

En las decisiones del ajuste se agrega:

- los niveles son 5 y dependen solo del cierre de tramos del camino;
- el nivel 3 no exige haber revelado resultados de Helena: se acepta, porque el tramo 4 ya pide el de intereses;
- conversaciones, entrevistas, planes y catálogo quedan en las insignias, no en los niveles.

## Ajuste · logros

### Contexto

Hoy `contenido` toma de `ruta` las insignias (7 `t-ins-*`, 2 páginas) y sus reglas (`datos/contenido.py:1143-1156`, `R-t-ins-1` y el filtro `r[1] == 'INSIGNIA'` en `REGLAS`, los filtros `R-t-ins-` de `TEXTOS_CONDICIONES` y `EVALUADORES_REGLAS`). La spec adjunta (`ajuste-logros.md`) define las 25 insignias definitivas en 4 páginas, tres evaluadores nuevos, una caché de planes por petición, el avance «N de M» de los evaluadores y un refresco más liviano en el front. No hay spec en curso: la spec adjunta se guarda tal cual como `ov_backend/docs/specs/ajuste-logros.md` y este plan va al final como `## Ajuste · logros`. Rama `ajuste/logros` (ya creada desde `main`).

La adenda `ajuste-logros-niveles.md` agrega los 5 niveles definitivos del estudiante en `contenido`; se guarda junto a la spec, como sección «Adenda de niveles» de `ajuste-logros.md`.

Pruebas con usuarios el 18 y 19 de noviembre: ningún desbloqueo que no sea de insignias o de niveles cambia, `evaluar_regla` no cambia cuándo se cumple una regla y la suite y los presupuestos actuales siguen pasando sin adaptarse.

### Qué cambia (hoy → pasará a)

1. **`app/schemas/motor.py` · `ResultadoEvaluador`**: hoy `{nombre, cumplido}` → suma `actual` y `requerido` opcionales. Se serializan **solo si tienen valor** (`model_serializer` que omite los nulos), para que las respuestas de los evaluadores que ya existen sigan idénticas (`test_prioritarios_motor`, `test_progreso_motor`, `test_requisitos_planes` comparan el dict exacto).
2. **`app/services/motor/reglas.py` · `evaluar_regla`**: hoy guarda `bool` por `(nombre, parámetro)` → acepta además `Avance(actual, requerido)` (dataclass nueva en `evaluadores.py`) y lo convierte a `cumplido = actual >= requerido`. La caché `especiales` guarda el resultado tal cual. Para `bool` nada cambia.
3. **`app/core/contexto.py` · `ContextoConsultas`**: nuevo `planes_de(cuenta_id, hijas=False)` con dos niveles (tarjetas activas; filas hijas al pedirlas). `invalidar_eventos` también borra `self.planes[cuenta_id]` (ya corre en `registrar_eventos` tras insertar y en `comun.responder_varias_cuentas`). `core/` no puede importar `services/`: la carga se mueve a `core` como función que recibe los modelos (o `DatosPlanes`/`cargar_planes` se mueve a `app/core/planes.py` y `services/planes/consultas.py` lo reexporta). Elegiré lo segundo, lo más simple sin romper capas.
4. **`app/services/planes/consultas.py` · `contar_listos_para_comparar`**: hoy llama a `cargar_planes` cada vez (hasta 9 consultas por evaluador) → lee `contexto(sesion).planes_de(cuenta.id, hijas=True)`. `listar_planes` (`GET planes`) sigue con su carga propia; `pasos_plan_a` no se toca.
5. **`app/services/motor/evaluadores.py`**, evaluadores nuevos, todos devuelven `Avance`:
   - `actividades_completas(tipo)`: actividades de bloques ESTUDIANTE sin espacio LUMI (y del `tipo`, si se da) desde las definiciones, contra las referencias de `COMPLETA_ACTIVIDAD` en `datos.conteos`. Sin consultas propias. Registrado con `partial` como `todas_las_batallas`, `todos_los_casos`, `todos_los_registros`, `todas_las_actividades`.
   - `todas_las_conversaciones`: `Conversacion` de las definiciones contra referencias de `COMPLETA_CONVERSACION`.
   - `planes_completos(parametro)`: tarjetas de `planes_de` (1 consulta); cuenta las que tienen las cuatro `guardada_*_en`; si son menos que `parametro` devuelve `Avance(0, p)` si no hay ninguna y si no `False` (sin avance, como dice la spec) sin cargar hijas; si alcanzan, carga hijas y aplica `estado_seccion` con `secciones_abiertas` → `Avance(completos, p)`.
   - Los tres van a `EVALUADORES`.
6. **`datos/contenido.py`**: `INSIGNIAS`, `TEXTOS_INSIGNIAS`, `GRUPOS_INSIGNIA`, `PAGINAS_INSIGNIAS`, `PISTAS_INSIGNIAS` propios (§2–§3 de la spec, textos literales); 25 reglas `R-ins-*` en `REGLAS` con sus textos en `TEXTOS_CONDICIONES` y evaluadores en `EVALUADORES_REGLAS`. Se quitan la sobrescritura de `t-ins-1`, `R-t-ins-1`, el filtro de `ruta.REGLAS` y los filtros `R-t-ins-`. `TEXTOS_CONDICIONES` deja de expandir `ruta.TEXTOS_CONDICIONES` (además de las insignias, solo quedan los niveles definitivos `R-NIV-2` a `R-NIV-5`, ver 7b). `PROVISIONALES` pierde la fila de insignias.
   - **Mensajes de bloqueo** (la spec no los da): el requisito de la insignia; si una condición tiene referencia, se nombra el título entre «» («Conoce a Lumi en el muelle: completa la misión «Bienvenida: la vocación se construye».»; Helena con los tres títulos del libro; «Alguien preguntó» con los cinco recuerdos). Se anota en `decisiones.md`.
7. **Front `src/lib/servidor/adaptadores.ts` · `condicionesObjetivo`**: hoy toma las condiciones tal cual → con un parámetro de insignia (lo pasa `useBadgeDetail`; `useProgresoNivel` no), una regla con `evaluador_especial.requerido` muestra su única condición con `cumplida` del evaluador y `actual`/`requerido` (con el `Math.min` y el `> 1` actuales). `types/servidor.ts`: `ResultadoEvaluador` con `actual?` y `requerido?`.
7b. **Niveles (adenda `ajuste-logros-niveles.md`)** · `datos/contenido.py`: hoy `NIVELES = ruta.NIVELES`, `CITAS_LUMI = ruta.CITAS_LUMI` y las provisionales `R-NIV-2` (COMPLETA_BLOQUE B0) y `R-NIV-3` (B0 + 3 carreras vistas) → `NIVELES` y `CITAS_LUMI` propios con los 5 títulos, descripciones y citas de la adenda; `R-NIV-2..5` con una sola condición `COMPLETA_BLOQUE` de B0, B2, B3 y B5, sin evaluador, con los mensajes y textos de la adenda. Verificado en `main`: las últimas requeridas son `b0-6` «Dudar también es avanzar», `b2-5` «Intereses y ambientes de trabajo», `b3-10` «Caminos que no van en línea recta» y `b5-5` «Lo que decía el pergamino», y los tramos se llaman «Inicio», «Me conozco», «Exploro el mundo profesional» y «Mi decisión» (los mismos de `R-B1`, `R-B3` y `R-B4`): no hace falta aviso. `PROVISIONALES` pierde también «Niveles y citas de Lumi» (queda sin las dos filas). `nivel_actual` no cambia.
8. **Front `src/store/servidor/refresco.ts`**: `conDesbloqueos` hoy es `length > 0` → verdadero solo si algún desbloqueo no es `INSIGNIA`. En `accionConRefresco`, cuando no refresca y hubo insignias, `vencerSiNoRefrescada('logros')` y pide las montadas (`cargarVencidasMontadas`). El predicado propio de `store/servidor/catalogo.ts:318` pasa a usar `conDesbloqueos`. Toasts y campana sin cambios (`revelarDesbloqueos`/`incorporarNotificaciones` van antes).

### Qué no cambia

- `ruta`: insignias, reglas, evaluadores y sus pruebas tal cual. Los evaluadores nuevos no se agregan a `ruta` (la spec lo excluye; se prueban sobre `contenido`).
- Los niveles de `ruta` (`R-NIV-*` y sus pruebas); el diploma; el ícono único del front.
- El refresco de un desbloqueo `NIVEL` (siempre llega con el cierre de un tramo, que ya refresca el mapa).
- `evaluar_regla` decide igual; `vistas_diversas` y los demás evaluadores siguen devolviendo `bool`; `pasos_plan_a` y `GET planes` no se tocan.
- `completar-actividad` y las demás acciones que siempre refrescan; el pasaporte sigue con un solo `GET logros` (`insigniasServidor` ya arma páginas desde la API).
- Modo local congelado.

### Modelo de datos

Sin cambios (las columnas de insignia y grupo ya existen). La carga con `--vaciar` borra el estado, así que no quedan desbloqueos ni vitrinas de `t-ins-*` en `contenido`.

### Backend · pruebas nuevas (las existentes no se adaptan)

- `tests/integration/datos/test_insignias_contenido.py`: 25 insignias (16 visibles, 9 ocultas) con página, textos y una regla `R-<código>`; pista solo en ocultas; ningún texto con códigos de actividad (regex `b\d-`, `lumi-`, `APL-`…); toda condición con actividad nombra su título entre «» en el mensaje; textos de condiciones del largo de la regla; ninguna regla INSIGNIA pide b2-1, b2-2, b3-6, b3-7 ni b3-9.
- `tests/integration/datos/test_niveles_contenido.py`: los 5 niveles con título, descripción y cita; los niveles 2 a 5 con una sola regla de una sola condición `COMPLETA_BLOQUE`, sin evaluador; el mensaje nombra la última requerida y el tramo (calculados desde `ACTIVIDADES`/`BLOQUES`, como `test_mensajes_reglas_contenido`).
- Escenario `tests/integration/escenarios/contenido/test_niveles_contenido.py` (eventos `COMPLETA_BLOQUE` por `/eventos`, o el recorrido real si el soporte de `contenido` lo permite sin alargar): cerrar B0 → nivel 2, B2 → 3, B3 → 4, B5 → 5; `nivel_actual` (`GET logros` / `resumen`) devuelve en cada paso el más alto; ver 3 carreras ya no sube de nivel.
- Pruebas de `contenido` que dependan de los niveles provisionales: revisé `tests/integration` y ninguna lee `R-NIV-*` ni el nivel 3 por carreras en `contenido` (las coincidencias son de amistad del diario o del panel). Si al correr aparece alguna, se adapta según §6 de la adenda y se anota.
- `tests/integration/motor/test_evaluadores_logros.py` (sobre `cliente_contenido`, eventos con `/eventos` y acciones reales donde importa): `actividades_completas` por tipo y sin tipo, sin LUMI; batalla perdida y caso fallido no cuentan (acciones reales); `todas_las_conversaciones`; `planes_completos` con 1 y con 3, sin contar inactivos; no carga hijas bajo el parámetro (`ContadorConsultas` sin SELECT a `motivo_tarjeta`); el avance de cada uno en `GET progreso/INSIGNIA`.
- `tests/integration/escenarios/contenido/test_logros_contenido.py`: `ins-chispa`, `ins-primera-sombra`, `ins-plan-a`, `ins-carreras` (10 distintas; repetida no suma) e `ins-brujula` (5 días; dos el mismo día no suman).
- Presupuestos (`tests/integration/motor/test_presupuesto_logros.py`, `contenido`): `completar-actividad`, `responder-batalla`, `guardar-seccion` y `GET logros` miden igual con y sin las reglas `R-ins-*` (se quitan de la caché de definiciones con `monkeypatch` para la medición «sin»); `guardar-seccion` carga hijas una vez aunque haya varias reglas de planes pendientes; con R-b4-1, R-b4-5 y R-b5-1 obtenidas, las cuatro acciones de planes hacen ≤ 1 consulta más que sin insignias (salvo con ≥ `parametro` planes de cuatro secciones guardadas); `GET progreso/INSIGNIA/ins-plan-completo` ≤ hoy + carga de planes, y solo tarjetas sin planes completos guardados.
- Fixtures del front: se regeneran (salen de `ruta`; cambian solo si cambia alguna forma, y no debería).

### Fases

1. **F1 · Motor**: `Avance`, `ResultadoEvaluador`, caché de planes, `contar_listos_para_comparar` sobre la caché, tres evaluadores. Pruebas: `tests/unit/motor`, `tests/integration/motor`, `tests/integration/planes`, `tests/integration/actividades`, `tests/integration/escenarios`. Comprobación de §4.2: confirmar que ninguna acción lee planes del contexto antes de escribir sin pasar por `invalidar_eventos` (si aparece, aviso antes de seguir).
2. **F2 · Datos de `contenido`**: insignias y niveles, reglas, textos, `PROVISIONALES`, pruebas de carga y escenarios. Pruebas: `tests/integration/datos`, `tests/integration/escenarios`, `tests/integration/logros`, más `scripts/verificar_contenido_front.py`.
3. **F3 · Presupuestos y evaluadores sobre `contenido`**: las pruebas de evaluadores y presupuestos de arriba; regenerar fixtures. Pruebas: `tests/integration/motor`, `tests/integration/planes`, `tests/integration/contrato`.
4. **F4 · Front**: tipos, `condicionesObjetivo`, refresco de §5.2, verificación de que ninguna vista del camino o la ciudad depende de una insignia (grep de `logros` en `features/adventure`, `cases`, `activities`); verificación de niveles: ningún texto del front fija los títulos provisionales ni el número de niveles. Hallazgo previo: en api, `getTravelerLevel` (`store/adventureStore.ts:264`) busca el número del servidor en `travelerLevels` local (5 entradas) y de ahí toma `nextStep`; título y descripción ya vienen del servidor. Con 5 niveles todos encuentran presentación; si `nextStep` se muestra en api con un texto que no corresponde al nivel nuevo, no se toca la vista: se anota en `pendientes-interfaz.md` y se avisa; pruebas en `tests/servidor/logros` y `tests/servidor/perfil` (adaptador con avance; refresco que solo vence `logros`). `npm run test:servidor`.
5. **F5 · Cierre**: `docs/sistema/motor.md` (evaluadores, avance, caché, Reglas del contenido · insignias), `docs/sistema/planes.md` (caché y `planes_completos`), `decisiones.md` con las decisiones de la spec §6 y las de este plan; suite completa de ambos repos (`uv run pytest -n auto -q`; `npm test`, `build`, `lint`, `check:estructura`). La spec queda en curso.

Un commit por fase: `Ajuste logros · F<n>: <qué>`. Sin push.

### Precisiones del usuario al aprobar

1. En los evaluadores nuevos, un total de 0 no cuenta como cumplido: con `requerido` 0 el evaluador devuelve no cumplido (como `vistas_diversas` con `bool(disponibles)`). Se agrega una prueba.
2. Única adaptación permitida de pruebas existentes: pruebas de `contenido` que comparen la lista exacta de `nuevos_desbloqueos` o de notificaciones y ahora reciban insignias o niveles nuevos; se adaptan solo en eso y se reportan al cierre de la fase. Cualquier otra prueba existente que falle se avisa antes de tocarla.
3. Confirmado: quitar `ruta.TEXTOS_CONDICIONES` de `contenido` no deja reglas sin texto; a `app/core/planes.py` van solo `DatosPlanes` y `cargar_planes`, sin cambiar su lógica (`_lista` y `estado_seccion` se quedan en `services/planes/consultas.py`); `nextStep` no se muestra en api, no va a `pendientes-interfaz.md`.

### Decisiones propias (van a `decisiones.md`)

- `actual`/`requerido` del evaluador se omiten en el JSON cuando son nulos, para no cambiar las respuestas actuales.
- Mensajes de bloqueo de las insignias = el requisito más los títulos de sus referencias.
- `DatosPlanes`/`cargar_planes` pasan a `app/core/planes.py` (reexportados desde `services/planes/consultas.py`) para que el contexto los use sin que `core` importe `services`.
- De la adenda: los niveles son 5 y dependen solo del cierre de tramos; el nivel 3 no exige resultados de Helena (el tramo 4 ya pide el de intereses); conversaciones, entrevistas, planes y catálogo quedan en las insignias.
- Los evaluadores nuevos no se prueban en `ruta` (la spec congela `ruta`); se prueban sobre `contenido`.

### Verificación

- Por fase, el subagente `pruebas` con las carpetas de impacto.
- Al final, suite completa de ambos repos y `uv run alembic heads` (debe seguir uno solo; no hay migración).
- Recorrido manual sugerido al usuario: cargar `contenido` con `--vaciar`, abrir el pasaporte (4 páginas, 25 sellos), ganar una batalla y ver «1 de 8» en «Ninguna sombra en pie»; cerrar el tramo «Inicio» y ver «Caminante sin apuro» en el panel del mapa.
- Presupuestos: los de arriba se miden con los niveles nuevos cargados, sin margen adicional (las reglas `R-NIV-*` solo son candidatas con `COMPLETA_BLOQUE` y usan los conteos ya cargados).
