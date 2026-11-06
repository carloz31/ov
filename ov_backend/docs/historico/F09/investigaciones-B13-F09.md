# Investigaciones y entrevistas · spec de B13 (backend) y F09 (frontend)

Insumo para que `/lote B13` y luego `/lote F09` armen su plan. Es una especificación de comportamiento y pantallas, no el plan: el lote decide tablas, endpoints y fases, respetando lo que aquí se fija. Los bocetos están en `bocetos/` (PNG por pantalla); F09 debe abrirlos antes de cada fase de pantalla y dejar las vistas lo más cercanas posible a ellos.

Historias que cubre: HU-057 a HU-065, HU-100 (lo que pienso) y HU-101 (qué cambió; ver §8, se resuelve como misión de registro, no como pantalla de este módulo). Épica E10 del catálogo.

---

## 1. Resumen del módulo

Un estudiante **investiga** una ocupación: elige la ocupación, escribe lo que piensa hoy de ella, arma un guion de preguntas (fijas + sugeridas por Lumi + propias), entrevista fuera de la plataforma a un profesional, sube el video a YouTube como «no listado» y **publica** la entrevista con una ficha y el enlace, solo o con **coautores** del salón. El salón y la orientadora la ven; los compañeros dejan **reacciones** (tipo + comentario) y la marcan como **favorita**; la orientadora la **destaca**. Destacada + N favoritos → **Leyenda**, visible para todos los salones y promociones siguientes.

Estados de una investigación (boceto `00-flujo.png`):

| Estado | Qué hay | Puede |
|---|---|---|
| Sin investigación | Nada en curso | Iniciar investigación |
| Guion en curso | Ocupación elegida y/o lo que pienso guardado, preguntas incompletas | Seguir, cancelar |
| Guía lista | Guion completo (≥ 3 base + 1 propia) | Editar guion, publicar, cancelar; aparece en Aliados |
| Publicada | Entrevista con ficha, enlace y autores | Editar ficha, retirar (cualquier autor) |
| Leyenda | Publicada + destacada + N favoritos | Igual que publicada; si se retira o se quita el destacado deja de ser Leyenda |

Reglas base:
- **Una investigación en curso por estudiante** a la vez. Puede tener varias publicadas (secuencialmente).
- **Cancelar** (guion en curso o guía lista): confirmación simple, sin motivo. Borra guion y lo que pensaba; sale de Aliados.
- **Retirar** (publicada): cualquier autor, confirmación simple. Se oculta para todos; sale de Mis investigaciones de todos los autores; sus reacciones y favoritos quedan en BD pero no se muestran. No se vuelve a publicar la misma: se inicia otra.
- **Coautores = autores**: mismos permisos (editar ficha, retirar). Ninguno reacciona ni marca favorita la propia.
- La sección **Investigaciones** se desbloquea al completar una misión informativa de la Ciudad (regla del motor, como las demás secciones).

---

## 2. Visibilidad

| Vista | Ve |
|---|---|
| De mi salón | Entrevistas publicadas por estudiantes de su salón (Leyendas de su salón con badge) |
| Leyendas | Todas las Leyendas de todos los salones y promociones |
| Mis investigaciones | Las suyas: la en curso (si hay) y las publicadas donde es autor o coautor |
| Orientadora | Publicadas por estudiantes de sus salones (tabla), más Leyendas de promociones anteriores al final |

«Visto / no visto» por entrevista y estudiante: se marca al abrir el detalle (evento de vista). Alimenta el punto «Nueva» de la tarjeta y el filtro «No vistas».

---

## 3. Pantallas del estudiante

### 3.1 Investigaciones · listado (`01-listado-de-mi-salon.png`, `02-mis-investigaciones.png`)

- Cabecera: título, subtítulo y botón **Iniciar investigación** (deshabilitado si ya hay una en curso; en ese caso la cabecera muestra «Ver mi guion», ver 3.2).
- **Un solo selector** con tres vistas: De mi salón · Leyendas · Mis investigaciones, cada una con su conteo. Reemplaza los dos botones + botón dorado «Salón de Leyendas» del prototipo.
- Buscador con debounce por título, ocupación o nombre del profesional.
- Chips: **Favoritas · No vistas · Destacadas**; orden **Recientes · Más reaccionadas**. Aplican a la vista activa. En Mis investigaciones no van los chips (no aplican a las propias).
- Tarjeta: cabecera (dorada si Leyenda) con badge Leyenda / «Destacada por tu orientadora» y estrella de favorito (única acción de favorito; desaparece el botón «Agregar a favoritos»); etiqueta «ENTREVISTA · <ocupación>», título, profesional · duración, «en pocas palabras», autores con nivel y título; pie con **«N reacciones · Favoritos N»** (sin desglose por tipo, para que no se rompa al crecer el catálogo) y «Nueva»/«Vista»; botón Ver la entrevista.
- Última tarjeta de la grilla cuando no tiene investigación: invitación «¿Y la tuya?».
- Mis investigaciones: tarjeta de la en curso (estado, aliados, Ver mi guion / Publicar) y tarjetas de las publicadas con **medidor «Camino a Leyenda»** (favoritos X de N, destacada sí/no) y desglose de reacciones por tipo. Estado vacío con invitación.
- Listados paginados (patrón de F06: páginas de 20, «Mostrar más»).

### 3.2 Con investigación en curso + Aliados (`03-en-curso-aliados.png`)

Encima del selector aparece la tarjeta **Tu investigación en curso**: ocupación, stepper de tres pasos (Guion listo ✓ · Entrevistar fuera · Publicar), botones **Publicar mi entrevista** y **Consejos y camino a Leyenda** (abre el paso Guía lista), enlace **Cancelar investigación**.

Panel **Aliados en tu salón**: compañeros del salón con guía lista. Dos grupos: **Investigan lo mismo que tú** (resaltados) y **También están investigando** (con su ocupación). Cada uno: nombre, nivel y título, insignias de su vitrina (si tiene), ocupación. Solo informativo, sin mensajería. Un aliado desaparece al publicar o cancelar.

### 3.3 Iniciar · paso 1 Lo que pienso (`09-paso1-lo-que-pienso.png`)

- Stepper superior: Lo que pienso · Mis preguntas · Guía lista (con punto dorado en los completados).
- **Buscador de ocupación** con debounce (≈ 500 ms), máximo 8 resultados con su grupo, navegable con teclado. Estados: escribiendo, sin resultados («No encontramos esa ocupación. Prueba con otra palabra»), error con reintentar. Al elegir queda como chip con «Cambiar». Solo ocupaciones del catálogo.
- Recién con ocupación elegida se habilita **Lo que pienso hoy**, tres campos (HU-100): *¿Qué crees que hace en un día normal?*, *¿Qué crees que se necesita para ejercerla?*, *Una duda que quieres resolver*. Texto libre, sin LLM, sin repreguntas. Lo ve la orientadora, no el salón.
- «Seguir con las preguntas» se habilita con ocupación + tres respuestas; guarda al seguir. Se puede volver y editar hasta publicar (al cambiar lo que pienso se vuelven a pedir sugerencias, §3.4).

### 3.4 Iniciar · paso 2 Mis preguntas (`10-paso2-mis-preguntas.png`)

Secciones, en orden:
1. **Preguntas base · siempre van** (3, fijas, no editables; vienen del backend como catálogo).
2. **Tu duda del paso anterior**: la duda del paso 1 entra automáticamente como pregunta propia (editable, se puede quitar).
3. **Lumi te sugiere, a partir de lo que escribiste**: hasta 3 sugerencias del LLM, cada una con «+ Agregar» (pasa a Mis preguntas, editable) y «×» (descartar; no vuelve). Estados: cargando («Lumi está leyendo lo que escribiste…»), sin sugerencias («Con lo que escribiste no pude armar preguntas nuevas…»), error («No pude pensar sugerencias ahora» + Reintentar). Se pide una vez al entrar al paso 2, y de nuevo si cambió lo que pienso. **Nunca bloquea el paso.**
   - Criterio de «registro pobre»: el mismo mínimo de longitud del respaldo de registros (no visible). Si no se alcanza, no se llama al LLM y se muestra «sin sugerencias».
   - Robustez: el LLM recibe lo que escribió el estudiante como dato, no como instrucción (misma política que las repreguntas).
4. **Mis preguntas**: lista numerada continua (las base son 1–3), cada propia con «×»; campo para agregar.
- Contador «N preguntas · lo ideal: entre 6 y 8». **Sin tope**; si pasa de 10, aviso suave. Mínimo para terminar: 3 base + 1 propia.
- «Terminar mi guion» → guía lista.

### 3.5 Iniciar · paso 3 Guía lista (`11-paso3-guia-lista.png`)

- Confirmación «Tu guía de entrevista está lista», ocupación · N preguntas.
- Cuatro pasos: (1) **Mira si alguien de tu salón investiga lo mismo** (aliados de la misma ocupación inline + cuántos investigan otras); (2) busca a un profesional; (3) conversa, no interrogues, graba con permiso; (4) súbela a YouTube como «No listado» y vuelve a publicar.
- Botones: Ir a Investigaciones · Editar mi guion. Desplegable «Preguntas que llevarás» con la lista (misma vista que «Ver mi guion» desde la cabecera, con botón copiar).
- Lateral: **Consejos para una buena entrevista** (5 consejos, texto del front) y tarjeta **Camino a Leyenda** explicando la regla (destacada + N favoritos; N viene del backend) y por qué una buena conversación ayuda a todos.

### 3.6 Publicar (`04-publicar.png`)

Formulario: título (frase), profesional entrevistado, duración aproximada (texto corto), **enlace de YouTube** (validado como enlace de YouTube; ayuda sobre «No listado»), **en pocas palabras** (2–5 líneas, sin LLM, se publica tal cual), **coautores** (buscador entre compañeros del salón con guía lista en la **misma ocupación**; chips), check «la persona entrevistada dio su permiso» (obligatorio). Lateral: previsualización de la tarjeta y nota de qué pasa al publicar.

Al publicar:
- La entrevista queda publicada con todos los autores; la investigación en curso de cada coautor se **cierra** (pasa a publicada, su guion deja de estar en curso).
- Evento de publicación por cada autor (sirve a logros/niveles e insignias; «subir la entrevista, individual o grupal» ya es requisito de nivel).
- Para quien publica su **primera** entrevista, el motor desbloquea en la Ciudad la misión de registro de §8.
- La ficha se puede editar después (mismo formulario, sin cambiar autores salvo agregar).

### 3.7 Detalle de una entrevista de un compañero (`05-detalle-companero.png`)

- Volver; tarjeta de cabecera con **video incrustado** (embed de YouTube) y **Ver en YouTube** de respaldo; badge Destacada/Leyenda; estrella favorito; menú «⋯» → **Reportar entrevista**; etiqueta ocupación (enlace al catálogo) · fecha; título; profesional · duración; en pocas palabras; autores con nivel.
- Abrir el detalle registra la vista.
- **Lo que dejó a tu salón**: conteo total y desglose por tipo; botón **Dejar mi reacción** (abre pop up 3.9). Si ya reaccionó, su reacción va primero con **Editar** y «⋯» → Eliminar; el botón pasa a oculto.
- Lista de reacciones: avatar, nombre, nivel · título, badge del tipo, fecha, texto con etiqueta «Lo que aprendiste / te gustó / le preguntarías…» según el tipo; «⋯» en ajenos → Reportar comentario. Orden: la propia primero, luego por fecha. «Mostrar más» cada 10.
- Los comentarios de la orientadora aparecen en la misma lista con etiqueta «Orientadora» y sin tipo de reacción.

### 3.8 Detalle de mi entrevista (`06-detalle-propia.png`)

Igual que 3.7, pero: badge «Tu entrevista»; sin estrella ni reacción; botones **Editar ficha** y «⋯» → **Retirar entrevista** (confirmación: «Se ocultará para todos, también para <coautores>»). Columna izquierda: **Camino a Leyenda** (medidor + dos condiciones: destacada ✓/–, favoritos X de N) y nota de permisos; derecha: **Lo que dicen de tu entrevista** (misma lista, solo lectura, «⋯» → Reportar comentario).

### 3.9 Pop up · dejar reacción (`07-popup-reaccion.png`)

- Grilla de 2 columnas con las reacciones del **catálogo** (nombre, descripción corta, ícono). Crece sola si el catálogo crece.
- Al elegir una, el campo de comentario muestra **su pregunta** y si es **obligatorio**.
- Catálogo inicial (cargado como dato):

| Reacción | Pregunta | Comentario |
|---|---|---|
| Aprendí algo | ¿Qué aprendiste? | Obligatorio |
| Me gustó cómo se realizó | ¿Qué te gustó de cómo la hicieron? | Opcional |
| Me dio curiosidad | ¿Qué le preguntarías tú? | Obligatorio |
| Me hizo pensar en mi camino | ¿En qué te hizo pensar? | Obligatorio |

- Una reacción por estudiante y entrevista; editable (puede cambiar el tipo) y borrable. Nunca en las propias.
- Botones Cancelar · Publicar reacción (con loader).

### 3.10 Pop up · reportar (`08-popup-reportar.png`)

Aplica a una entrevista o a un comentario. Motivos (catálogo o enumerado): ofensivo o se burla · el video no abre o no corresponde · muestra datos privados del entrevistado · otro; detalle opcional. Un reporte por persona y contenido. Tras enviar, el contenido muestra «Reportado» solo a quien reportó. Nadie más sabe quién reportó.

---

## 4. Pantallas de la orientadora (dos pantallas, estilo tabla del portal)

### 4.1 Tabla de publicaciones (`12-orientadora-tabla.png`)

Cabecera «CONTENIDO · Publicaciones». Buscador a la izquierda (autor, ocupación, título); desplegables a la derecha: Salón · Estado (todos / sin destacar / destacada / Leyenda) · **Con reportes** (su cola de moderación, con conteo).

Columnas: Autores · Salón · Profesión u ocupación · Fecha de publicación · **Reacciones** · **Favoritos** (con «/ N» mientras no sea Leyenda) · Estado (Sin destacar · Destacada · Leyenda + badge rojo «N reportes» / «N comentario reportado») · Acciones (Ver entrevista). Las Leyendas de promociones anteriores van al final con salón «Promoción anterior». Paginada.

### 4.2 Detalle (`12b-orientadora-detalle.png`)

Cabecera: título, estado, favoritos X de N, botones **Destacar / Quitar destacado** (reversible) y **Eliminar entrevista**. Izquierda: video + ficha en filas (autores con salón, ocupación, profesional, fecha, en pocas palabras, reacciones por tipo, **lo que pensaban antes** de cada autor, que solo ve ella). Derecha: reacciones y comentarios, **reportados primero** con «Descartar reporte» / «Eliminar comentario»; cualquier comentario se puede eliminar; su propio comentario con Editar/Eliminar; cuadro **Dejar un comentario a los autores** (etiqueta «Orientadora»; lo ven autores y salón).

La orientadora **no** usa las reacciones del estudiante ni marca favoritos. Eliminar (entrevista o comentario) pide confirmación; los autores ven un aviso genérico. Descartar un reporte lo cierra sin tocar el contenido y sin avisar al que reportó.

---

## 5. Leyenda

- Condición: **destacada por la orientadora** y **≥ N favoritos** de estudiantes (de cualquier salón que la vea). N es un **parámetro del backend**, en la misma lógica de reglas/desbloqueos; el front lo lee junto con el medidor (`favoritos`, `requeridos`, `destacada`).
- Se evalúa al destacar y al marcar favorito. Es reversible: si se quita el destacado o se retira la entrevista deja de ser Leyenda (los favoritos no se pueden «desmarcar» por debajo del umbral una vez Leyenda; decisión simple: Leyenda se pierde solo por quitar destacado o retirar).
- Al volverse Leyenda: evento para cada autor (sello en el pasaporte, según el catálogo de insignias). El estudiante lo ve en su detalle y en Mis investigaciones.

---

## 6. Datos que el backend debe sostener (orientación para el modelo de B13)

Sin prescribir tablas; lo que las pantallas necesitan:

- **Investigación** por estudiante: ocupación, estado (en curso / guía lista / publicada / cancelada / retirada), lo que pienso (3 textos), fechas.
- **Guion**: preguntas con origen (base / duda / sugerida / propia), orden, texto; sugerencias del LLM con estado (pendiente / agregada / descartada) para no repetirlas.
- **Preguntas base**: catálogo cargado como dato (3).
- **Entrevista publicada**: título, profesional, duración (texto), enlace, en pocas palabras, fecha; **autores** (N:M con la investigación/estudiante, todos con los mismos permisos); destacada (por quién, cuándo); Leyenda (cuándo).
- **Tipos de reacción**: catálogo con nombre, descripción, pregunta, obligatorio, ícono (nombre), orden.
- **Reacción**: estudiante × entrevista única; tipo, comentario, fechas. **Comentario de orientadora**: mismo listado, sin tipo.
- **Favorito** de entrevista: reutiliza el mecanismo de favoritos existente (ya tiene tipos: fichas, testimonios, catálogo) con un tipo nuevo y su evento propio.
- **Vista** de entrevista por estudiante (evento, como `VISTA_FICHA`).
- **Reporte**: contenido (entrevista o reacción), quién, motivo, detalle, estado (pendiente / descartado / resuelto por eliminación).
- **Parámetro** N de favoritos para Leyenda.
- **Eventos** para el motor: investigación iniciada, guía lista, entrevista publicada (por autor), reacción dejada, favorito, destacada, Leyenda, vista. Sirven a desbloqueos, niveles e insignias (la insignia por publicar y por Leyenda; definirlas en el catálogo de insignias).

Lecturas que piden las pantallas: listado por vista (salón / leyendas / mías) con filtros, orden y paginado, trayendo solo lo de la tarjeta; detalle completo; mi investigación en curso; aliados del salón; catálogo de ocupaciones por texto (ya existe en F06, reutilizar); sugerencias LLM; medidor de Leyenda; para la orientadora, tabla con filtros y detalle con reportes.

---

## 7. LLM

Una sola llamada por paso 2: entrada = ocupación + los tres textos de «lo que pienso» + las preguntas base; salida = hasta 3 preguntas cortas, en segunda persona, sin repetir las base. Mismo modelo y misma política de respaldo que las repreguntas de registros: si falla o tarda, estado de error con reintentar; si el texto es pobre, no se llama. Sin reintentos automáticos. Las sugerencias se guardan para no volver a pedirlas al reabrir el paso.

---

## 8. Fuera de este módulo (pero que dependen de él)

- **Misión de registro «¿Qué cambió?»** (HU-101): se desbloquea en la Ciudad al publicar la **primera** entrevista; trae como eco los tres textos de «lo que pienso» y pide contrastar y si la ocupación sube o baja en su lista. Es contenido de la ruta (actividad de registro con eco), no pantalla de Investigaciones; B13 debe exponer «lo que pienso» como fuente de eco y el evento de publicación como condición de desbloqueo.
- **Misión informativa de la Ciudad** que desbloquea la sección Investigaciones (contenido de la ruta; regla del motor).
- **Insignias** por publicar una entrevista y por Leyenda; **nivel** que requiere la entrevista (ya previsto).
- **Panel de la orientadora** (B14/F10): las publicaciones ya quedan en su propia pestaña de Contenido (§4); el perfil del estudiante puede enlazar a sus entrevistas.

---

## 9. Decisiones ya tomadas (no reabrir en el plan)

1. Leyenda cuenta **favoritos**, no reacciones. N es parámetro del backend.
2. Favorito ≠ reacción: favorito es «volver a verla» (cuenta para Leyenda); reacción es tipo + comentario (reconocimiento).
3. Reacciones como **catálogo** cargado como dato, con cuatro iniciales (§3.9).
4. Coautores tienen los **mismos permisos** que el autor, incluido retirar.
5. **Sin tope** de preguntas; mínimo 3 base + 1 propia; sugerencia «entre 6 y 8».
6. «Lo que pienso» son **tres campos** (HU-100), sin LLM ni repreguntas; la duda pasa como pregunta.
7. El contraste antes/después **no** vive en Investigaciones: es una misión de registro con eco (§8).
8. La orientadora comenta libremente y destaca; no reacciona ni marca favoritos; puede eliminar cualquier entrevista o comentario; dos pantallas (tabla + detalle) en el estilo de las tablas del portal.
9. Las tarjetas muestran «N reacciones · Favoritos N»; el desglose por tipo solo en el detalle.
10. Una investigación en curso por estudiante; cancelar y retirar sin pedir motivo.

## 10. Pendientes menores que el plan puede resolver

- Si la orientadora puede destacar una entrevista de otro salón que no es suyo (propuesta: no; solo sus salones).
- Qué muestra la tarjeta cuando un autor fue dado de baja del salón (propuesta: nombre igual, sin nivel).
- Si «Editar ficha» permite cambiar el enlace del video una vez publicada (propuesta: sí, registra evento de edición).
- Nombres de íconos del catálogo de reacciones para el front (propuesta: `bombilla`, `estrella`, `pregunta`, `caminos`).
