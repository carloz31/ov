# Ajuste panel-estudiantes · Lista de estudiantes y perfil del estudiante (orientadora)

Texto de observaciones para `/ajuste panel-estudiantes`, sobre `main` **con el ajuste panel-salon ya integrado** (usa sus tablas `grupo_alerta`, `alerta` y `parametro`, y `app/services/panel/`). Si panel-salon aún no está en `main`, detente y avisa.

Define, solo en modo api, la lista «Estudiantes» y el perfil de un estudiante con cinco pestañas. Cubre HU-081 a 088 y HU-108 (lo que el plan llamaba B14/F10), menos la configuración del salón.

Bocetos: `ov_backend/docs/specs/bocetos/panel-estudiantes/`

| Archivo | Pantalla |
|---|---|
| `05-estudiantes-lista.png` | Lista |
| `06-perfil-resumen.png` | Perfil · Resumen |
| `07-perfil-tests.png` | Perfil · Tests (solo partida) |
| `08-perfil-tests-con-llegada.png` | Bloque de partida y llegada con las dos aplicaciones |
| `09-perfil-planes.png` | Perfil · Planes (resumen) |
| `10-perfil-plan-completo.png` | Perfil · Plan completo |
| `11-perfil-respuestas.png` | Perfil · Respuestas |
| `12-perfil-avance-familia.png` | Perfil · Avance y familia |

La implementación debe quedar lo más parecida posible. Los datos de los bocetos son de ejemplo. Donde este texto y un boceto difieran, manda este texto (§11).

## 1. Para quién y para qué

La usuaria es la psicóloga escolar. Hasta hoy solo tenía un test vocacional por estudiante. El perfil debe servirle para **preparar una conversación de quince minutos** con un estudiante, sin abrumarla: cada pestaña responde una pregunta suya y lo que hay que interpretar llega dicho en palabras.

Reglas que valen para todo:

- Trato de **usted** hacia la orientadora en todo texto que se dirija a ella.
- Sin porcentajes, promedios ni gráficos de ejes. Las únicas barras son las seis del test de intereses.
- Zonas, niveles y cambios van en palabras (Fuerte, En camino, Por trabajar; Alto, Medio, Bajo; Subió, Igual, Bajó).
- Lo que el estudiante escribió se muestra tal cual, entre comillas o en caja, y se distingue de lo que arma la plataforma.
- **«Áreas sugeridas»**: así se nombran las familias de carreras recomendadas. Nunca «sugeridas por el test»: el test propone ocupaciones; las áreas las sugiere la plataforma. Un plan está «Entre sus áreas sugeridas» o «No está entre sus áreas sugeridas».
- El diario nunca muestra contenido. Las cartas entre estudiante y apoderado **no** se muestran a la orientadora, ni su texto ni su estado.
- Los textos que hablan de un estudiante no asumen género («Poca seguridad en sus últimas señales», no «poco seguro»). Los bocetos usan femenino solo porque el ejemplo es una estudiante.

## 2. Principio: parametrizable

Igual que en panel-salon: lo que se muestra sale de la base. En este ajuste, además:

- Los **temas «Para conversar»** son filas de `alerta` en un grupo propio (§3.1). Agregar, quitar, reordenar o cambiar el texto o el umbral de un tema es solo una fila; un tema de un tipo nuevo necesita un evaluador nuevo.
- Los textos de avisos y temas en el perfil llevan `{clave}` que se llenan con datos del estudiante.
- Cantidades y cortes nuevos van a `parametro` (§3.4).
- Nombres de tramos, cuestionarios, dimensiones, secciones del plan, preguntas de conocimiento, opciones y preguntas de los registros: de sus tablas. El front solo tiene títulos y subtítulos de bloque.

## 3. Modelo de datos (cambio de modelo, sigue `/cambio-modelo`)

Propuesta a aprobar en el plan.

### 3.1 Cambios en `grupo_alerta` y `alerta`

| Tabla | Columna nueva | Qué es |
|---|---|---|
| `grupo_alerta` | `en_inicio` (bool, por defecto verdadero) | Si el grupo aparece en «A quién buscar» del Inicio, en los conteos de avisos y en la lista de estudiantes. Los temas para conversar van en un grupo con `en_inicio = false` |
| `alerta` | `nombre_perfil` (nulo) | Título cuando se habla de **un** estudiante (lista y perfil). Si es nulo, se usa `nombre` |
| `alerta` | `descripcion_perfil` (nulo) | Línea de evidencia en el perfil; admite `{clave}` de los parámetros y de los datos que devuelve el evaluador |
| `alerta` | `destino` (nulo) | A qué pestaña del perfil lleva su enlace: `TESTS`, `PLANES`, `RESPUESTAS` o `AVANCE` |

**Evaluadores:** hoy devuelven el conjunto de estudiantes que cumplen. Pasan a devolver, por cada estudiante que cumple, un diccionario de datos para el texto (vacío si no hay nada que decir). Los seis evaluadores de panel-salon se adaptan; el Inicio sigue usando solo quién cumple.

### 3.2 Avisos: textos de perfil

| Código | `nombre_perfil` | `descripcion_perfil` | Datos del evaluador | `destino` |
|---|---|---|---|---|
| `respuesta-sensible` | Escribió algo que conviene leer | En «{registro}», Lumi lo derivó a usted en lugar de seguir preguntando. | `registro`: título de la actividad (la más reciente) | RESPUESTAS |
| `seguridad-baja` | Poca seguridad en sus últimas señales | Marcó {valores} de 5 ({fechas}). | `valores`, `fechas`: de las señales contadas | AVANCE |
| `sin-ingreso` | No ingresa hace {dias} días o más | Último ingreso: {ultimo}. | `ultimo`: fecha o «nunca» | — |
| `avance-bajo` | Va muy por detrás de su salón | Va en «{tramo}»; la mayoría del salón va en «{tramo_salon}». | ambos nombres | AVANCE |
| `test-por-revisar` | Test de intereses por revisar | {motivo}. | `motivo`: «Su resultado salió plano: todas las respuestas parecidas» o «Lo respondió muy rápido (estimado por tiempo)» | TESTS |
| `familia-pendiente` | Su familia aún no se registra | {motivo}. | `motivo`: «No tiene un apoderado vinculado» o «Su apoderado tiene cuenta, pero no ha ingresado» | AVANCE |

### 3.3 Temas «Para conversar»

Grupo nuevo `para-conversar` «Para conversar», `en_inicio = false`. Son puntos de entrada a la conversación, no urgencias. Solo se muestran en el Resumen del perfil. Reglas iniciales (se afinan en otro ajuste; aquí importa dejar la estructura):

| Código | Evaluador | Parámetros | `descripcion_perfil` | `destino` |
|---|---|---|---|---|
| `plan-idea-ajena` | `plan_idea_ajena` | `origenes: [FAMILIA, CONOCIDO]` | La idea de estudiar {carrera} (su Plan A) vino {origen}. | PLANES |
| `plan-conoce-poco` | `plan_conoce_poco` | `minimo_no: 3` | Dice conocer poco su Plan A: respondió «No» a {cantidad} de {total} preguntas ({preguntas}). | PLANES |
| `plan-complicaciones` | `plan_complicaciones` | — | Ve como posibles complicaciones de su Plan A: {complicaciones}. | PLANES |
| `plan-fuera-areas` | `plan_fuera_de_areas` | — | Su Plan A ({carrera}) no está entre sus áreas sugeridas. | PLANES |
| `dimension-por-trabajar` | `dimension_por_trabajar` | — | En su punto de {momento}, {dimensiones} quedó por trabajar. | TESTS |

- `origen` es el texto de la opción («de su familia», «de alguien que conoce»); `preguntas`, `complicaciones` y `dimensiones` son los nombres de la base unidos con comas e «y».
- `plan_fuera_de_areas` usa el mismo criterio que panel-salon («Planes frente al test»): exige Plan A y resultado vigente no plano.
- `dimension_por_trabajar` usa la aplicación más reciente con resultado (llegada si existe; si no, partida); `momento` es «partida» o «llegada».
- Los temas se listan por `orden`. Sin ninguno: «Todavía no hay puntos para conversar. Aparecerán cuando registre sus planes y responda sus cuestionarios.»

### 3.4 Notas de la orientadora (HU-108)

Tabla nueva `nota_orientadora` (estado): `id`, `orientadora_id`, `estudiante_id`, `texto`, `creada_en`, `actualizada_en`.

- Cada orientadora ve, edita y elimina **solo sus** notas. Nadie más las ve (ni otra orientadora del salón, ni el estudiante, ni el apoderado).
- Texto obligatorio, con el mismo tope de caracteres que el repo use para textos libres.

### 3.5 Parámetros nuevos

| Código | Valor | Uso |
|---|---|---|
| `PANEL_SENALES_PERFIL` | 6 | Señales de seguridad que se muestran en Avance y familia |
| `PANEL_OPCIONES_BAJAS` | 2 | Una respuesta de partida o llegada es «baja» si está entre las N opciones inferiores de su escala (con los ítems inversos ya invertidos) |
| `PANEL_AFIRMACIONES_POR_GRUPO` | 5 | Máximo de afirmaciones por grupo en «Afirmaciones para conversar» |
| `PANEL_DUDAS_VISIBLES` | 4 | Dudas visibles en el plan completo antes de «Ver las N restantes» |
| `PANEL_FILAS_ESTUDIANTES` | 20 | Tamaño de página de la lista |

## 4. Lista de estudiantes (`05-estudiantes-lista.png`)

Ruta actual `Estudiantes` del portal. Subtítulo: salón, número de estudiantes y «Primero aparecen quienes tienen avisos.»

**Accesos rápidos** (botones con conteo): Todos · Con avisos · un botón por cada grupo con `en_inicio` que tenga `orden` 1 (hoy «Conversar pronto») · Sin avisos.

**Filtros:** buscador por nombre; Salón (sus salones y «Todos mis salones»); Aviso (las alertas activas de grupos `en_inicio`); Test de intereses (los cuatro estados de panel-salon). Todo queda en la URL.

**Columnas:**

| Columna | Contenido |
|---|---|
| Estudiante | Nombre completo |
| Por dónde va | Nombre del tramo actual, «Sin empezar» o «Terminó» (misma lógica de panel-salon) |
| Test de intereses | Listo · Por revisar · En curso · Sin empezar, como etiqueta |
| Plan A | Nombre de la carrera o «Sin plan» |
| Último ingreso | «hoy», «ayer», «hace N días» o «Nunca ingresó» |
| Avisos | **Solo el aviso más importante** (`nombre_perfil`) y, si hay más, «y N más». Sin avisos: «Sin avisos» |
| — | Botón «Ver perfil» |

- El aviso más importante es el primero por `grupo.orden` y luego `alerta.orden`.
- **Orden inicial:** por aviso más importante (mismo criterio), luego por cantidad de avisos y luego por nombre; sin avisos al final. Las cabeceras ordenan como en panel-salon, sobre toda la lista y en el servidor.
- Paginada con «Mostrar más».
- No hay tarjetas de indicadores arriba (están en el Inicio).

**Enlaces desde el Inicio (cambios a panel-salon):**

- «Ver lista de estudiantes» queda habilitado y abre esta lista con el salón elegido.
- En el panel lateral «Ver», cada nombre enlaza a su perfil.
- En el bloque «Planes frente al test de intereses» del Inicio, los textos pasan a «Su Plan A está entre sus áreas sugeridas» y «Su Plan A no está entre sus áreas sugeridas», y el título a «Planes frente a sus áreas sugeridas».

## 5. Perfil: cabecera y pestañas

- Enlace «← Volver a Estudiantes» (conserva filtros y orden de la lista).
- Tarjeta: nombre; salón; último ingreso; apoderado con su estado entre paréntesis («aún no ingresa», «ingresó», «terminó su ruta») o «Sin apoderado vinculado». A la derecha, un solo dato de avance: «Va en el tramo N de M» y el nombre del tramo (o «Aún no empieza» / «Terminó el camino»).
- No hay botón «Imprimir ficha» en este ajuste.
- Pestañas, con la activa en la URL: **Resumen · Tests · Planes · Respuestas · Avance y familia**.

## 6. Pestaña Resumen (`06-perfil-resumen.png`)

De arriba abajo:

**Avisos** (tarjeta crema; no se muestra si no tiene). Agrupados con el nombre de cada grupo `en_inicio`, en su orden. Cada aviso: `nombre_perfil`, `descripcion_perfil` resuelta y, si tiene `destino`, un botón que abre esa pestaña.

**Para conversar.** Subtítulo: «Puntos que la plataforma encontró en lo que {nombre} registró. No son problemas: son entradas para la conversación.» Una fila por tema (§3.3) con su enlace («Ver plan», «Ver test», «Ver respuesta», «Ver avance», según `destino`).

**Tres tarjetas**, cada una con botón a su pestaña:

1. **Lo que le interesa.** Estado del test de intereses con su fecha. Con resultado: los tres tipos del código en palabras y las áreas sugeridas como chips. Por revisar: además, el motivo. Sin resultado: «Aún no tiene resultado» y cuántas partes respondió.
2. **Lo que está pensando.** Una fila por plan activo, en su orden: «Plan A · carrera», institución con tipo y gestión o «Aún sin institución», y la etiqueta de áreas sugeridas (solo si tiene resultado vigente no plano). Los que falten: «Plan B sin registrar». Sin planes: «Todavía no registra planes.»
3. **Cómo empezó** (cuestionario de partida y llegada). Tres estados:
   - *Sin partida:* «Aún no responde su punto de partida.»
   - *Solo partida:* título «Cómo empezó»; las dimensiones agrupadas por zona, en este orden: Por trabajar, En camino, Fuerte.
   - *Con llegada:* título «De la partida a la llegada»; las dimensiones agrupadas por cambio, en este orden: **Bajó**, **Sigue por trabajar** (por trabajar en ambas), **Subió**, **Se mantiene**. Cada dimensión muestra «zona de partida → zona de llegada». Un grupo vacío no se muestra.

**Dos tarjetas:**

- **Sus respuestas.** «N de M registros destacados completados» (si el salón no tiene destacados: «N de M registros completados», sobre los requeridos) y, si las hay, una fila por cada etiqueta con su conteo («1 respuesta sin contenido», «1 requiere atención»).
- **Mis notas.** Subtítulo: «Solo usted las ve. Sirven para recordar lo conversado.» Notas de la más reciente a la más antigua, con fecha, editar y eliminar (con confirmación); campo «Nueva nota» y «Guardar nota».

## 7. Pestaña Tests (`07…`, `08…`)

### 7.1 Test de intereses (instrumento principal de panel-salon)

Siempre primero y abierto. Título con su etiqueta (Requisito del salón, etc.), estado, fecha y el `mensaje_orientadora` del instrumento.

- **Con resultado:** las seis dimensiones como barras de 0 a 100 con su número, de mayor a menor, las tres del código resaltadas; «Sus tres intereses más altos»; «Áreas sugeridas a partir de sus intereses» (chips); «Frente a sus planes» (una etiqueta por plan activo). Botón «Ver resultado completo».
- **Por revisar:** lo anterior más un aviso con el motivo. Con perfil plano no hay código ni áreas: se dice «El resultado salió plano» y, si corresponde, que el estudiante puede rehacerlo o que ya lo rehízo.
- **En curso / sin empezar:** una línea con las partes respondidas.

**Resultado completo:** vista aparte que reutiliza la del apoderado (`ResultadoInteresesPortal`) con `mensaje_orientadora` y `lectura_orientadora`. No se rediseña.

### 7.2 Mi punto de partida y de llegada

Vista nueva (el apoderado no ve este cuestionario). Subtítulo con el `mensaje_orientadora`.

**Tabla de dimensiones:** nombre; zona en la partida con su fecha; zona en la llegada con su fecha o «Aún no responde»; y, con llegada, **Cambio** (Subió, Igual, Bajó, comparando zonas).

**Afirmaciones para conversar:**

| Situación | Qué se muestra |
|---|---|
| Solo partida | Las respuestas «bajas» (`PANEL_OPCIONES_BAJAS`), de la más baja a la menos, con la etiqueta que marcó. Nota: «Cuando responda la llegada, aquí irán primero las que bajaron.» |
| Partida y llegada | Tres grupos, en este orden: **Bajaron** (la llegada es menor que la partida), **Siguen bajas** (bajas en ambas y no bajaron), **Mejoraron** (la llegada es mayor). Cada afirmación muestra «etiqueta de partida → etiqueta de llegada» |

- La comparación usa el puntaje del ítem con los inversos ya invertidos; lo que se muestra es siempre la **etiqueta** que marcó, nunca el puntaje.
- Máximo `PANEL_AFIRMACIONES_POR_GRUPO` por grupo, ordenadas por tamaño del cambio (o por lo baja que es la respuesta).
- Botón «Ver todas sus respuestas»: todas las afirmaciones por dimensión con sus dos etiquetas.
- La orientadora **no** recibe puntajes ni promedios de este cuestionario (reemplaza lo previsto en B14).

### 7.3 Otros cuestionarios

Una fila por cada instrumento restante: nombre, etiqueta, estado. Con resultado: «Destaca: …» (dimensiones destacadas) y «Para practicar: …» (la de menor proporción, solo si el instrumento tiene textos de desarrollo), y «Ver resultado», que reutiliza la vista de resultado del apoderado con los textos de orientadora.

## 8. Pestaña Planes (`09…`, `10…`)

### 8.1 Resumen de planes

Tabla «Sus planes, de un vistazo»: una columna por plan (A, B, C; el que falta, «Sin registrar») y estas filas:

| Fila | Contenido |
|---|---|
| Tipo de carrera | `carrera.tipo` en palabras |
| Áreas sugeridas | Etiqueta de §1 (vacío sin resultado vigente no plano) |
| Dónde estudiaría | Institución, tipo y gestión, o «Sin elegir» |
| ¿De quién fue la idea? | Texto de `idea_origen`; resaltado si no es propia |
| Motivo principal | El motivo de posición 1 |
| Qué tanto la conoce | «Respondió «Sí» a N de M preguntas» |
| Dudas | «N abiertas · M resueltas» |
| Costo del primer año | `total_primer_anio` y cómo lo pagaría, o «Sin registrar» |
| Lo que podría complicarlo | Las complicaciones como etiquetas |
| Próximos pasos | «N de M hechos» o «Sin pasos» |
| Cómo se ve frente al plan | Los tres medidores en palabras (1 Bajo, 2 Medio, 3 Alto) |
| Partes llenas | Secciones en estado LISTA sobre el total |

Última fila: «Ver Plan X completo». Un dato sin registrar dice «Sin registrar», nunca queda vacío.

Debajo, **Antes de sus planes:** «Al empezar la ruta pensaba en {opción inicial}. Hoy su Plan A es {carrera}.» (solo si hay opción inicial; si coinciden: «Mantiene como Plan A la carrera en la que pensaba al empezar: {carrera}.»), y las carreras e instituciones favoritas como chips. No se muestran ocupaciones favoritas ni conteos de coincidencia.

### 8.2 Plan completo

Vista dentro de la pestaña, con «← Resumen de planes» y un selector entre los planes activos. Todo en lectura.

- **Cabecera:** «Plan A · carrera», tipo, etiqueta de áreas sugeridas, última actualización y «Todo lo que sigue lo registró {nombre}, con sus palabras.» Debajo, **Cómo se ve frente a este plan:** los tres medidores en tres casillas; un medidor en Bajo va resaltado; sin fijar, «Sin marcar».
- **Una tarjeta por sección** de `seccion_tarjeta`, en su orden, con su nombre y su estado (Lista, En proceso, Por empezar, o «Aún no se le abre» si está bloqueada, sin contenido):
  1. **Por qué la elige:** de quién fue la idea; los motivos numerados en su orden; el relato en una caja.
  2. **Qué tanto la conoce:** las cinco preguntas con Sí / Más o menos / No. Luego «Sus dudas · N abiertas, M resueltas»: primero las abiertas, después las resueltas con «Lo que encontró: {hallazgo}»; se muestran `PANEL_DUDAS_VISIBLES` y el resto con «Ver las N dudas restantes».
  3. **Su realidad:** dónde estudiaría (con ciclos si se conocen); cómo llegaría (camino); costos (`total_primer_anio`, `total_carrera` si existe, y los rubros en una línea); cómo lo pagaría; lo que podría complicarlo.
  4. **Sus pasos:** «N de M hechos. Primero los pendientes.» Los pendientes y luego los hechos, estos con fecha y hallazgo. Si un paso salió de una duda o complicación: «Sale de su duda: …». Se muestran todos. Las sugerencias pendientes o descartadas no se muestran.

## 9. Pestaña Respuestas (`11-perfil-respuestas.png`)

**Selector:** «Destacados · N» y «Todos · M». Los destacados son los registros de `salon_actividad_prioritaria` del salón del estudiante. Si el salón no tiene ninguno, no hay selector y se muestran todos. Línea de etiquetas como leyenda.

**Para leer primero:** si hay respuestas sensibles, sus registros van arriba, bajo ese encabezado, abiertos.

**Lista de registros**, en el orden del camino y, al final, los de la ciudad bajo «Misiones opcionales». Cada tarjeta: título, «Tramo «nombre»», estado y fecha (Completado · fecha; En curso; «Aún no llega» si no está disponible o no se inició) y sus etiquetas con conteo. Plegada por defecto; «Ver respuestas» la abre.

**Cada ítem**, siempre en este orden; cada pieza aparece solo si el ítem la tiene:

1. Encabezado: «Pregunta N · {nombre del ítem}» y su etiqueta.
2. **Contexto:** el `dialogo`, en cursiva, antecedido por el personaje si se conoce.
3. **«Tenía a la vista:»** los ecos que se le mostraron:
   - un plan: «su Plan A · carrera · institución»;
   - dos planes: «Plan A · … — Plan B · …»;
   - un texto anterior: «lo que escribió antes en «actividad»» y la cita;
   - una elección anterior: sus opciones como chips;
   - pasos, proyecto o señal: una línea con lo mismo que vio el estudiante.
4. **Pregunta de elección** y lo que eligió:
   - lista u opciones propias: chips;
   - podio (`eleccion_ordenada`): numerado 1, 2, 3;
   - piezas: el chip y, al lado, de dónde sale («de lo que dijo que se le da bien»), con el grupo u origen guardado;
   - «Otra»: su texto, con «lo escribió el estudiante».
5. **Pregunta de texto** y la respuesta en una caja: la primera respuesta; si hubo seguimiento, una línea punteada, «Lumi le preguntó: {repregunta}» y la segunda respuesta. No se concatenan.

**Con qué valores se muestra:** las preguntas (marcadores como `{carrera}`, `{plan_b}`) y los ecos se muestran **con los valores con que el estudiante respondió** (`respuesta_registro.valores_contexto` y `opciones_elegidas`), no con los de hoy. Si hoy cambiaron (la misma condición de «eco cambiado»), el registro lleva la etiqueta «Lo que tenía a la vista cambió después» y el eco aclara el valor de hoy («sus planes cuando respondió; hoy su Plan B es …»).

**Etiquetas** (solo estas):

| Etiqueta | Cuándo |
|---|---|
| Requiere atención | `sensible` |
| Sin contenido | `tipo_final` es `vacio` o `fuera_de_tema` |
| Aún no lo sabe | estado ABIERTO |

No se muestran el tipo «propio/general/emocional», los motivos del LLM, la pista ni el histórico de intentos. Solo se muestra el intento vigente. Un ítem no obligatorio sin respuesta: «No lo respondió».

## 10. Pestaña Avance y familia (`12-perfil-avance-familia.png`)

- **Su camino:** una fila por tramo (`bloque.nombre`, numerado) con «N de M misiones» (solo requeridas) y su estado: Completo, «Va aquí» (con «sigue: «título de la siguiente requerida»») o Por abrir. Debajo, una línea con las opcionales: «Además completó N misiones opcionales de la ciudad y superó M casos de la Central.» (se omite la parte que sea cero).
- **Cómo se siente con su decisión:** las últimas `PANEL_SENALES_PERFIL` señales, de la más antigua a la más reciente, cada una en una casilla con el número y la fecha; el tono de la casilla sigue las bandas de panel-salon. Una frase: «Viene bajando: sus tres últimas señales fueron 2 o menos.» si tiene el aviso `seguridad-baja` (con sus parámetros); si no, «Su última señal fue N de 5.» Sin señales: «Aún no registra señales.» Debajo: «Ha escrito N entradas en su diario; la última, hace X días. El diario es privado: aquí no se muestra su contenido.»
- **Su familia:** nombre y parentesco del apoderado; Ingreso a la plataforma; Ruta del apoderado («N de M actividades»); Conversaciones («N de M conversadas» y, si aplica, «{nombre} ya respondió N y espera a su apoderado»). Sin vínculo: «No tiene un apoderado vinculado.» **Nada sobre las cartas.**

## 11. Diferencias aceptadas con los bocetos

- No va el botón «Imprimir ficha».
- En «Para conversar» no va el punto sacado de un registro («no sabe si es su voz o la de su mamá»): solo los temas de §3.3.
- Los textos de avisos son los de §3.2 (sin género).
- En `11`, la etiqueta «Su Plan B cambió después» pasa a «Lo que tenía a la vista cambió después».

## 12. Estudiantes de ejemplo

Para revisar las pantallas con casos distintos, un script `ov_backend/scripts/sembrar_panel_ejemplo.py` (como `sembrar_entrevistas_ejemplo.py`), sobre el conjunto `contenido`, que deja en un salón de la orientadora de prueba estos estudiantes. Usa las acciones reales donde se pueda; lo que hoy decide el LLM (`tipo_final`, `sensible`, repregunta) se escribe directo. Todo marcado `DATO DE PRUEBA`.

| # | Caso | Qué debe verse |
|---|---|---|
| 1 | Nunca ingresó | Perfil casi vacío, con todos los estados «aún no» y sus avisos |
| 2 | Recién empieza | Parte del tramo 1, partida respondida, sin test ni planes; sin apoderado vinculado |
| 3 | Test con perfil plano | «Por revisar» por plano, sin código ni áreas; un plan sin etiqueta de áreas |
| 4 | Test respondido con prisa | «Por revisar» por prisa con resultado; un plan con solo «Por qué la elige» |
| 5 | A mitad, con mucho registrado | Plan A completo con 7 dudas y 6 pasos, Plan B parcial; registros con podio, piezas y «otra»; una respuesta sin contenido y una «aún no lo sabe»; tres señales bajas seguidas |
| 6 | Respuesta sensible | «Para leer primero»; apoderado con ruta completa y una conversación hecha |
| 7 | Terminó el camino | Llegada respondida con una dimensión que bajó y otras que subieron; tres planes; cambió su Plan B después de «Pongo a prueba mi orden»; Plan A fuera de sus áreas sugeridas y con idea de su familia |
| 8 | Avanzado y sin avisos | Todo en orden; habilidades sociales e inteligencias reveladas |

Los fixtures del front para las pruebas de render salen de estos casos (al menos 1, 5 y 7).

## 13. Backend y front

**Backend** (en `app/services/panel/`, rutas según las convenciones del repo):

- Lista de estudiantes paginada, con filtros, orden y los conteos de los accesos rápidos.
- Cabecera y Resumen del perfil en una lectura; una lectura por cada pestaña restante, pedida al abrirla; plan completo dentro de Planes; resultado completo de un instrumento y partida y llegada con textos de orientadora.
- Notas: listar, crear, editar y eliminar.
- Todas exigen sesión de orientadora y que el estudiante sea de uno de sus salones (`es_de_su_salon`); si no, 404. Ninguna devuelve contenido del diario, cartas, puntajes de partida y llegada, motivos del LLM ni histórico de intentos.
- Se reutilizan las consultas existentes de resultados, comparación, planes, registro, avance y familia; no se duplica su lógica.
- Pruebas: cada tema con sus bordes y con un parámetro cambiado en la base; un tema nuevo con evaluador existente aparece solo; textos con `{clave}` resueltos; el aviso más importante y el orden de la lista; los tres estados de «Cómo empezó»; los grupos de afirmaciones (incluido un ítem inverso); cada tipo de ítem de registro; valores con que respondió frente a los de hoy; las tres etiquetas; notas privadas por orientadora; acceso a un estudiante de otro salón; ausencia de cartas y diario en las respuestas.

**Front:**

- Solo en modo api; el modo local sigue con sus vistas actuales.
- Estado en `store/servidor/`, con las reglas de datos del servidor; cada pestaña se pide al abrirla y se revalida al volver al perfil.
- En api se reemplazan la lista y el detalle actuales (`features/counselor/components/student-detail/`). Los componentes que solo use el modo local se conservan.
- El ítem de registro en lectura es un componente propio del portal; no reutiliza el reproductor del estudiante.

## 14. Fuera de este ajuste

- Imprimir o exportar la ficha; informe de viaje.
- Configuración del salón (elegir destacados, cuestionarios requisito, visibilidad al apoderado). Mientras no exista, valen los destacados cargados, si los hay.
- Afinar las reglas de «Para conversar».
- Histórico de intentos de un registro.

## 15. Para decidir en el plan

1. Qué guarda exactamente `valores_contexto` y si alcanza para mostrar los ecos **mostrados** con los valores de entonces. Si un eco mostrado no se guardó, se resuelve con el valor de hoy y no se afirma que era el de entonces.
2. Si los evaluadores pasan a devolver datos por estudiante (§3.1) o si los temas llevan un registro de evaluadores aparte.
3. Sobre qué conjunto corre el script de ejemplo y qué parte se siembra con acciones reales.

## Ajuste · panel-estudiantes

Rama `ajuste/panel-estudiantes` (desde `main`, con panel-salon ya integrado: `1d0af55f`). No hay spec en curso: el texto de observaciones queda como `ov_backend/docs/specs/ajuste-panel-estudiantes.md` y este plan se agrega al final como `## Ajuste · panel-estudiantes`. Bocetos copiados a `ov_backend/docs/specs/bocetos/panel-estudiantes/` (05–12).

### Contexto

Hoy la orientadora en modo api solo tiene el Inicio (panel-salon). `Estudiantes` y el detalle (`pages/counselor/StudentsView.tsx`, `StudentDetailView.tsx`, `features/counselor/components/student-detail/`) son solo demostración, también en api. En el backend no existe ningún detalle de estudiante para la orientadora (B14 nunca se hizo): `es_de_su_salon` (`app/services/acceso.py:72`) no lo usa ninguna ruta. El ajuste construye la lista y el perfil de cinco pestañas, con avisos y temas «Para conversar» que salen de la base.

### Qué cambia (hoy → pasará a)

- **Evaluadores** (`app/services/panel/alertas.py`): hoy `funcion(lecturas, parametros) -> set[int]`; pasarán a devolver `dict[int, dict]` (por estudiante que cumple, los datos para `{clave}`). `calcular_alertas` expone `estudiantes` como antes (las claves) y además `datos`. Responde §15.2: **un solo registro** (`EVALUADORES_ALERTA`) para avisos y temas; los temas son filas de `alerta` en un grupo con `en_inicio = false`.
- **Inicio y «Ver»** (`seguimiento.py`, `estudiantes.py`): hoy calculan todas las alertas activas; pasarán a filtrar `grupo.en_inicio` (los temas nunca cuentan en el Inicio).
- **Señales** (`comun.senales_recientes`): hoy solo niveles; pasará a devolver `(nivel, fecha)` para que `seguridad-baja` diga `{valores}` y `{fechas}`. `bandas_seguridad` y el evaluador se adaptan sin cambiar el criterio.
- **Planes** (`app/services/planes/consultas.py`): `listar_planes` exige la sección abierta de la cuenta que consulta. Se separa una función interna que arma `PlanesCuenta` para un `cuenta_id` sin `exigir_planes`; el estudiante sigue usando `listar_planes` igual.
- **Registro – piezas** (`app/services/registro/eleccion.py:94 validar_eleccion`): hoy guarda `{codigo, texto}` aunque el comentario del modelo dice que también el origen. Pasará a guardar también `origen` (grupo de donde sale la pieza) en las respuestas nuevas; en las antiguas no se muestra «de dónde sale». (Ver pregunta 1.)
- **Inicio · «Planes frente al test»** (`ResumenIntereses.tsx`): textos «Su Plan A está/no está entre sus áreas sugeridas», título «Planes frente a sus áreas sugeridas». **«Ver lista de estudiantes»** (`CabeceraPanel.tsx:47`) se habilita y abre la lista con el salón; los nombres de `PanelVerEstudiantes` enlazan al perfil.

### Qué no cambia

- El criterio de cada aviso del Inicio, sus conteos y los textos `nombre`/`descripcion` del Inicio (solo se agregan columnas `*_perfil`).
- `representar_resultado`, `comparacion_autopercepcion`, `estado_seccion`, `totales`, `eco_cambiado`, `resolver_contexto`, `avance_ruta`: se llaman, no se reescriben.
- El motor, el flujo del registro (salvo guardar `origen` de la pieza), las vistas del estudiante y del apoderado, y el modo local del front (sus vistas siguen como están).
- `GET /panel/estudiantes?conjunto=` (el panel «Ver») sigue igual.

### Modelo de datos (decisión a aprobar; sigue `/cambio-modelo`)

Una migración nueva:

| Tabla | Cambio |
|---|---|
| `grupo_alerta` | `en_inicio` bool, defecto `true` |
| `alerta` | `nombre_perfil` texto nulo, `descripcion_perfil` texto nulo, `destino` enum nulo `DestinoPerfil` (`TESTS`, `PLANES`, `RESPUESTAS`, `AVANCE`) |
| `nota_orientadora` (nueva, estado) | `id`, `orientadora_id` FK cuenta, `estudiante_id` FK cuenta, `texto` (≤ parámetro `PANEL_MAXIMO_CARACTERES_NOTA` = 1000), `creada_en`, `actualizada_en`; índice (`orientadora_id`, `estudiante_id`). El reinicio de estado la vacía. |

`datos/fijos.py`: textos de perfil de las 6 alertas (§3.2), grupo `para-conversar` «Para conversar» (`en_inicio = false`) con sus 5 temas (§3.3) y los parámetros nuevos (los 5 de §3.5 y `PANEL_MAXIMO_CARACTERES_NOTA`). Para `{origen}` de `plan-idea-ajena`, el texto de cada opción va en los `parametros` de la fila (`textos_origen: {FAMILIA: "de su familia", CONOCIDO: "de alguien que conoce"}`), porque hoy esos textos solo existen en el front. `ruta.py` no cambia. Documento vigente: `docs/sistema/panel.md`.

### Backend

Servicios nuevos en `app/services/panel/` (≤ ~300 líneas cada uno): `perfil.py` (acceso, cabecera, resumen), `lista.py`, `temas.py` (evaluadores de §3.3, registrados en `EVALUADORES_ALERTA`), `perfil_tests.py`, `perfil_planes.py`, `perfil_respuestas.py`, `perfil_avance.py`, `notas.py`, y `textos.py` (fechas en palabras y unión «a, b y c»). Esquemas en `app/schemas/panel_estudiante.py`. Rutas en `app/api/panel.py`, todas de la propia orientadora `{c}`:

| Método y ruta | Respuesta |
|---|---|
| `GET /cuentas/{c}/panel/lista-estudiantes?salon&buscar&aviso&test&acceso&orden&limite&desde` | `{total, accesos: [{codigo, nombre, cantidad}], items: [FilaEstudiante]}`; `acceso` = `todos`/`con_avisos`/`sin_avisos`/código de grupo; orden en servidor sobre toda la lista |
| `GET …/panel/estudiantes/{e}` | `PerfilEstudiante`: cabecera + Resumen (avisos con textos resueltos y `destino`, temas, tres tarjetas, «Sus respuestas», notas) |
| `GET …/panel/estudiantes/{e}/tests` | test de intereses, partida y llegada (tabla de zonas y afirmaciones agrupadas, solo etiquetas), otros cuestionarios |
| `GET …/panel/estudiantes/{e}/tests/partida-llegada` | todas las afirmaciones por dimensión con sus dos etiquetas («Ver todas sus respuestas») |
| `GET …/panel/estudiantes/{e}/tests/{aplicacion}/resultado` | `ResultadoPublico` con `audiencia='orientadora'` (`instrumentos/consultas.py:350`) |
| `GET …/panel/estudiantes/{e}/planes` y `…/planes/{posicion}` | resumen «de un vistazo» + «Antes de sus planes»; plan completo |
| `GET …/panel/estudiantes/{e}/respuestas` | lista de registros sin ítems (destacados de `salon_actividad_prioritaria`, todos), salvo los de «Para leer primero», con sus ítems |
| `GET …/panel/estudiantes/{e}/respuestas/{actividad}` | ítems de un registro, con textos resueltos con los valores guardados |
| `GET …/panel/estudiantes/{e}/avance` | camino, señales, conteo del diario, familia |
| `GET/POST …/estudiantes/{e}/notas`, `PATCH/DELETE …/notas/{id}` | notas solo de esa orientadora |

- **Acceso:** una sola función (`perfil.estudiante_de_orientadora`) con `exigir_orientadora` + `es_de_su_salon`, usada por todas las rutas del perfil; estudiante ajeno o inexistente → 404 «Estudiante no encontrado». Una prueba recorre todas las rutas del perfil con un estudiante de otro salón. Otra orientadora no ve, edita ni borra notas ajenas (404).
- **Avisos del perfil:** `Lecturas` sobre el salón del estudiante (`avance_bajo` necesita la mediana del salón) y se toma su fila. **Temas:** `Lecturas` de un solo estudiante.
- **Partida sola:** no existe consulta (la de comparación exige las dos). Se escribe una con `calcular_zona`, `calcular_puntaje_item` y la escala (`escala_publica`). Nunca sale un puntaje en la respuesta.
- **«Para practicar»:** la dimensión de menor proporción, solo si el instrumento tiene textos `desarrollo`; «Destaca» = `dimensiones_destacadas`.
- **Respuestas (§15.1):** `valores_contexto` guarda `marcadores`, `ecos_mostrar` y `pregunta` ya resuelta. Alcanza: el diálogo y la pregunta de elección se rearman con `con_marcadores` y los marcadores guardados; los ecos mostrados salen de `ecos_mostrar`. Si una respuesta vieja no trae alguno, se resuelve con el contexto de hoy sin afirmar que era el de entonces. «Lo que tenía a la vista cambió después» usa `eco_cambiado` tal cual, y el eco agrega el valor de hoy.
- **Lo que nunca sale:** texto del diario, cartas (`carta_estudiante/apoderado`) ni su estado, puntajes de partida y llegada, motivos del LLM, pista, tipo propio/general/emocional, intentos no vigentes. Una prueba lo verifica sobre cada respuesta.
- **Pruebas** (`tests/integration/panel/`, nuevos archivos por pestaña): las de §13 (temas con bordes y parámetro cambiado en base, tema nuevo con evaluador existente, `{clave}`, aviso más importante y orden, tres estados de «Cómo empezó», grupos de afirmaciones con ítem inverso, cada tipo de ítem, valores de entonces vs hoy, etiquetas, notas privadas, estudiante de otro salón, ausencia de cartas/diario) y número de consultas acotado en la lista. Se adaptan las pruebas del panel-salon que comprueban el tipo de retorno de evaluadores y de `senales_recientes` (autorizado por §3.1).

### Estudiantes de ejemplo (§12, §15.3)

`ov_backend/scripts/sembrar_panel_ejemplo.py` sobre `contenido`, en 5A de `ori-carmen`: 8 estudiantes `DATO DE PRUEBA` (códigos `est-panel-1…8`), idempotente. Usa acciones reales para avanzar el camino (`soporte_contenido.avanzar`), responder cuestionarios (resultado calculado por el servicio) y llenar tarjetas de plan; escribe directo lo que decide el LLM (`tipo_final`, `sensible`, `repregunta`), check-ins, eventos de ingreso y el vínculo/estado del apoderado. El exportador de fixtures corre el script en una base `contenido` temporal y exporta lista, perfil y pestañas de los casos 1, 5 y 7 (`panel-estudiante-*`).

### Frontend (solo modo api)

- `src/types/servidorPanelEstudiante.ts`, `src/services/api/panelEstudiante.ts`, `src/store/servidor/panelEstudiante.ts` (mismo patrón de `store/servidor/panel.ts`: cada pestaña al abrirla, revalida al volver), `src/lib/servidor/adaptadoresPanelEstudiante.ts` (palabras de zonas, cambios, estados, medidores, tipo y gestión).
- Rutas: `students` y `students/:studentId` pasan a `SegunModo` (api: vistas nuevas; local: las actuales). Filtros, orden, pestaña y plan abierto en la URL; «← Volver a Estudiantes» conserva la query de la lista.
- `features/counselor/components/estudiantes/` (lista: accesos, filtros, tabla ordenable reutilizando el patrón de `TablaInteres.tsx`, «Mostrar más») y `features/counselor/components/perfil/` (cabecera, una carpeta de componentes por pestaña, `ItemRegistroLectura` propio, tarjeta de notas con diálogo de confirmación). Piezas de `panel/PanelComun.tsx` (`BloquePanel`, `EtiquetaPanel`) y `components/ui` (Tabs, Table, Dialog, Collapsible).
- Resultado completo: `ResultadoInteresesPortal` y `QuestionnaireDetailContent` reciben textos de orientadora (la respuesta ya trae `mensaje`/`lectura` de la audiencia; solo cambian los rótulos que hoy dicen «Su código…» si hace falta parametrizar el rótulo). Cierra el pendiente de `pendientes-interfaz.md` (:69-75, :13-19, :145-151) que este ajuste cubre.
- Pruebas `tests/servidor/panel/servidor-panel-estudiantes.test.mjs` con los fixtures de los casos 1, 5 y 7, y el local congelado sigue igual.

### Fases

1. **Modelo y alertas:** migración, `fijos.py`, evaluadores con datos, filtro `en_inicio`, textos de perfil, temas; pruebas de alertas y temas; `panel.md`.
2. **Lista y perfil (cabecera + Resumen) + notas:** servicios, rutas, esquemas, pruebas.
3. **Pestañas Tests, Planes, Avance y familia:** servicios, rutas, pruebas.
4. **Pestaña Respuestas** y origen de piezas en `validar_eleccion`; pruebas.
5. **Script de ejemplo y fixtures** (exportador).
6. **Front lista + cambios del Inicio.**
7. **Front perfil** (cinco pestañas, plan completo, resultado completo).
8. **Cierre:** suites completas de ambos repos, `decisiones.md`, `origen-de-datos.md`, `pendientes-interfaz.md`, AGENTS del front (sección panel).

Un commit por fase: `Ajuste panel-estudiantes · F<n>: …`.

### Verificación

- Por fase, subagente `pruebas` con las carpetas de impacto + `tests/integration/escenarios`; al final `uv run pytest -n auto -q`, `npm test`, `npm run build`, `npm run lint`, `npm run check:estructura`, `npm run test:servidor`.
- `uv run alembic heads` con un solo head.
- Revisión visual: base `contenido` + `sembrar_panel_ejemplo.py`, front en modo api, entrar como `ori-carmen` y recorrer lista y perfiles de los 8 casos frente a los bocetos.

### Respuestas del usuario y observaciones (aprobadas)

1. Se guarda el origen de la pieza desde ahora en `validar_eleccion`; en respuestas antiguas, solo el chip. El cambio no altera lo que recibe el estudiante ni el contexto que va al LLM, con su prueba.
2. Rutas bajo `/cuentas/{orientadora}/panel/estudiantes/{e}/…`. Todas pasan por una sola función que valida `es_de_su_salon`, y una prueba recorre todas las rutas del perfil con un estudiante de otro salón (404).
3. `sembrar_panel_ejemplo.py` se niega a correr sin una confirmación explícita de entorno de desarrollo (bandera o variable); nunca sobre la base desplegada.
4. El tope de la nota va en `parametro` (`PANEL_MAXIMO_CARACTERES_NOTA = 1000`), no en `MAXIMO_CARACTERES_TEXTO_LLM`.
5. Al parametrizar rótulos de `ResultadoInteresesPortal` y `QuestionnaireDetailContent`, una prueba confirma que la vista del apoderado queda igual.
6. En el cierre, nota en `plan-iteraciones.md`: B14/F10 quedan cubiertos por este ajuste, salvo la configuración del salón.
7. Al terminar la fase 5 (backend completo), detenerse y resumir antes de empezar el front.

#### Carga de datos y espera (todo el front del ajuste)

8. Cada vista pide solo lo que muestra. **Ajuste de rutas** que esto implica:
   - `…/tests` ya no trae «todas sus respuestas» de partida y llegada: solo la tabla de zonas y las afirmaciones agrupadas (máx. `PANEL_AFIRMACIONES_POR_GRUPO`). Nueva `GET …/estudiantes/{e}/tests/partida-llegada` con todas las afirmaciones por dimensión y sus dos etiquetas, pedida al pulsar «Ver todas sus respuestas».
   - `…/respuestas` trae la lista de registros sin ítems (título, tramo, estado, fecha, etiquetas con conteo, destacado), salvo los de «Para leer primero», que vienen con sus ítems. Nueva `GET …/estudiantes/{e}/respuestas/{actividad}` con los ítems de un registro, pedida al desplegarlo.
   - Plan completo (`…/planes/{posicion}`) y resultado completo (`…/tests/{aplicacion}/resultado`) ya eran rutas aparte: se piden al abrirlos.
   - La lista (`lista-estudiantes`) solo trae los campos de sus columnas, paginada.
9. El almacén (`store/servidor/panelEstudiante.ts`) guarda un solo perfil a la vez (con sus pestañas); al abrir otro estudiante o salir de Estudiantes se descarta. De la lista, solo las páginas del filtro y orden actuales; al cambiar filtro, orden o salón se reemplaza. Nada se copia a otro almacén ni a localStorage.
10. Espera: primera carga de lista y perfil con `PantallaCargaPortal` (error y «Reintentar»); cambio de pestaña, de plan, despliegue de registro, «Mostrar más», filtro u orden: espera dentro del bloque (Skeleton o cargador en el botón), sin que cabecera ni pestañas salten. Notas: cargador en el botón y la respuesta actualiza lo cargado sin volver a pedir el perfil. Una pestaña que falla muestra su error con «Reintentar» dentro de ella. Nunca un bloque vacío mientras carga.
11. Pruebas del front: abrir el perfil hace una sola petición; cada pestaña pide la suya solo al abrirse y una vez por visita; al cambiar de estudiante el almacén no conserva el anterior.

#### Notas como acciones (decisión del usuario durante F2)

Las notas no son rutas REST: `POST /acciones/escribir-nota`, `/acciones/editar-nota` y `/acciones/borrar-nota` (cuerpo: `cuenta` = orientadora, `estudiante`, `nota`, `texto`), con `ejecutar_accion`. La lista llega con el perfil, sin GET aparte. Escribir y editar devuelven la nota; borrar, solo la confirmación; el front actualiza lo cargado sin volver a pedir el perfil. Las tres pasan por la misma función que valida `es_de_su_salon` y la prueba del estudiante de otro salón las incluye (404). Editar o borrar una nota de otra orientadora: 404. Texto vacío o sobre `PANEL_MAXIMO_CARACTERES_NOTA`: 422. No registran eventos en `evento_uso`.
