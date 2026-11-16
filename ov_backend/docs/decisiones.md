# Decisiones de la spec en curso

## Ajuste panel-orientadora-observaciones

- Alerta `familia-pendiente`: nombre «Su apoderado aún no inicia sesión» y el mismo motivo para SIN_VINCULO y SIN_INGRESO («Su apoderado aún no ha iniciado sesión en la plataforma»), porque en el colegio todo estudiante tendrá un apoderado con cuenta; el evaluador no cambia. La cabecera del perfil y «Avance y familia» conservan «Sin apoderado vinculado» (pedido del usuario).
- Textos del panel que arma el backend (texto plano): los nombres (tramo, registro, dimensión) van sin «»; lo que el estudiante marcó y las frases de los medidores, entre comillas “…”. En el front, los nombres van en cursiva y las citas entre “…”; las afirmaciones de partida y llegada, sin comillas.
- «Cómo lo haría realidad» del perfil: en dos columnas y «Incluye: …» con los rubros; sin monto por rubro (el usuario solo necesita saber qué incluye). Solo mostraba Matrícula porque el plan de ejemplo solo registraba ese rubro: la siembra de ejemplo ahora registra Matrícula, Materiales y Transporte.
- Selectores del perfil (plan y Destacados/Todos) y pestañas principales: la opción elegida en el color principal, con clases en el portal (`SELECTOR_RESALTADO`); `SegmentedControl` y `Tabs` comunes no cambian porque también los usa el estudiante.
- Tabla de Publicaciones: columna «Familia» sin «a qué se dedica», favoritos sin «/ N» (el umbral de Leyenda sigue llegando y no se pinta, por pedido del usuario), una sola insignia «Con reportes» y Leyenda con estrella.
- Ícono de Configuración: ruedita (`Settings`) en ambos modos; cambio solo visual del menú, excepción al modo local congelado pedida por el usuario.
- Visibilidad para el apoderado: siempre y nunca son la misma casilla, marcada o vacía y deshabilitada, con «(siempre)» o «(nunca)».

## Ajuste respuestas-orientadora

- Se agrega como fase de la spec en curso, en la rama `ajuste/respuestas-orientadora` creada desde `ajuste/panel-orientadora-observaciones` (que ya tocaba `PestanaRespuestas.tsx`).
- Lectura: se queda la forma de dos rutas (lista liviana + detalle al abrir) y `leer_primero` trae el detalle de los registros que requieren atención, que se abren solos sin otra petición. La lista bajó de 33/22/33 a 10/11/10 consultas (casos 5/6/7) porque ya no arma el contexto de hoy de todos los ítems; el detalle quedó igual (7 en b1-3, 13 en b4-5). La lista pesa ~1 KB más (campos de grupo y marca); el detalle, ~0,5 KB menos.
- El servidor devuelve las filas ya ordenadas (`grupo`, tramo, marca, camino) y `en_destacados`; el front solo agrupa filas seguidas, sin contar ni clasificar.
- Causa del «hoy» falso de §3.4: el panel usaba `eco_cambiado()` (marcadores y líneas al LLM) y la pregunta 1 de b1-3 pasó a sensible después de responder la 3, así que dejó de citarse; además el front pintaba el descriptor del eco. Ahora el panel compara cada eco mostrado con el de hoy por valor; los del mismo registro nunca cambian y uno que hoy ya no se muestra no cuenta. Esto reemplaza, solo en el panel, la decisión anterior de no contar los ecos que solo se muestran.
- El tipo de eco lo decide el servidor (`EcoLinea.fuente`; el campo no se llama `tipo` porque la prueba de contrato prohíbe esa clave). Pasos, proyecto, cabecera y referencias genéricas van como `OTRO` con el eco en bruto y el front reutiliza `lineaEco`; su «hoy» es su carrera o texto.
- Textos fijos de las marcas (§3.3): constantes del front en `features/counselor/lib/perfilEstudiante.ts` (`MARCAS_ITEM`); el de la alerta `respuesta-sensible` tiene otra redacción y `{registro}`, así que no se reutiliza.
- Enlace (§3.1): `AvisoPerfil` y `TemaPerfil` llevan `respuesta` (actividad e ítem) cuando el evaluador lo sabe (`respuesta_sensible`, `eleccion_registro`); la URL agrega `?registro=&item=` y, si el registro no es destacado, la pestaña abre en «Todos».
- No se agregó un tono `aviso-suave` a `ChipPerfil`: las marcas ya no son chips y la intensidad vive en `MarcaRespuesta`.
- Citas y nombres de actividad en la línea de eco con “…” y cursiva, según el ajuste anterior, en lugar de las «» del texto de observaciones.
- Siembra de ejemplo: el caso 5 tiene una respuesta fuera de tema en b1-7 (no destacado) y el caso 6 una sensible en b1-1 (no destacado).

## Ajuste partida-llegada-liviano

- Se corre en la misma rama, a pedido del usuario, al terminar respuestas-orientadora (con su suite completa en verde), y se agrega como sección de la spec en curso.
- `DimensionPartida` y `DimensionDetalle` ganan `clase` (bajó, sigue por trabajar, subió, igual) y el conteo con llegada separa «sigue por trabajar» de «igual»: el front ya no deduce «sigue por trabajar» de las zonas (también `gruposComoEmpezo`, del Resumen).
- El bloque de la pestaña Tests llega ordenado por atención, como el detalle (`ordenar_dimensiones`). Mismas consultas que antes (detalle 7/8/8; perfil y Tests sin cambios en sus presupuestos).
- `EtiquetaPanel` pasa a texto gris en todos los `BloquePanel`: el bloque y el detalle de partida y llegada y «Cuestionarios» del Inicio del panel.
- Los tonos de texto del portal (`--warning-text` #5a3b00 y `--success-text` #256b4c en el tema del portal) ya cumplen 4.5:1 sobre blanco: no se oscurecieron.
- Se retiraron `TONO_ZONA`, `TONO_CAMBIO`, `TONO_CAMBIO_AFIRMACION`, `textosCambio`, `textosCambioAfirmacion` y `textoConteo`, sin uso tras el cambio; la vista del estudiante usa los suyos (`features/discovery/lib/partidaLlegada.ts`) y no cambia.
- Frase del conteo con todas en un grupo: «Las N dimensiones subieron / bajaron / siguen por trabajar / siguen igual / están por trabajar / están en camino / son fuertes». Con llegada, «igual» se dice «sigue igual».
- El boceto 20 llegó en `.webp` y se guardó así.

## Perfiles de ejemplo y revisión de legibilidad (pedido del usuario)

- La siembra de ejemplo suma tres estudiantes en 5A (DATO DE PRUEBA): 9 con habilidades e inteligencias reveladas y misiones de la ciudad (una sin contenido y otra a medias); 10 que cambió el orden de sus planes después de responder (ecos con «hoy») y con una respuesta sensible y fuera de tema a la vez en un registro no destacado; 11 sin apoderado y con «Las voces y la mía» a medias. Las pruebas que cuentan los estudiantes de ejemplo pasan de 8 a 11.
- Revisión en el navegador con una base aparte: una pregunta sin responder ya no trae «Respondió viendo…» (el servidor no manda ecos sin respuesta); en un registro en curso dice «Aún no lo responde»; el eco de un resultado de test se lee «Tu test de habilidades: Asertividad.» y el de un plan, «Hoy su Plan A es …»; el origen de una pieza va aparte («(de: ¿Qué te cuesta?)»), sin pasarlo a minúsculas; «Por dónde va el salón» usa casillas de ancho mínimo para que los nombres largos no se partan en tres líneas.
- Resumen del perfil reordenado (pedido del usuario): tras Avisos y Para conversar, «Lo que está pensando» a todo el ancho con un plan por columna; debajo, en tres columnas del mismo alto, «Lo que le interesa», «Cómo empezó» (o «De la partida a la llegada») y «Sus respuestas» (que pasó de `RespuestasYNotas` a `TarjetasResumen`); al final, «Mis notas» a todo el ancho (`NotasPerfil`, antes `RespuestasYNotas`). En el vistazo de planes, cada medidor va en su línea con el nombre en negrita.

## Dichos entre comillas y en cursiva (pedido del usuario)

- Lo que alguien dice, dijo, piensa o se pregunta pasa de «…» a “…” en las actividades de `plataforma/` (estudiante y apoderado), las fichas y los textos de `contenido.py` y `fijos.py` (preguntas de batallas, ítems de registro, pasos sugeridos del plan, textos de instrumentos): 538 casos, más las líneas del folleto de b3-6 y el «no» de b2-1, para que sean coherentes con los anuncios de las batallas. Una cita dentro de un dicho va con ‘…’. Los nombres de actividades, secciones, botones, opciones y títulos, los términos sueltos y las ironías siguen con «» (392 y 154 casos). La clasificación se hizo caso por caso con dos agentes y se revisó una muestra.
- La cursiva no va en el contenido: `conDichos` (`components/common/ConDichos.tsx`) pone en cursiva todo lo que va entre “…” al pintar diálogos, preguntas, opciones, explicaciones, diapositivas, registros, batallas, fichas, la guía de dimensiones, el portal del apoderado y las preguntas del perfil de la orientadora. Es una función y no un componente para que las pruebas de render sigan leyendo el texto. Un texto sin “…” sale con el mismo marcado de antes, así que el modo local no cambia.
- El título de la retroalimentación cita una opción que es un dicho con sus “…” (no «“…”»), en el estudiante y en el apoderado.
