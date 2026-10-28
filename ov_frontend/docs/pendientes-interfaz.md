# Pendientes de interfaz

Datos que el backend entrega (o que una vista necesita) y que la interfaz todavía no muestra. Los resuelve el usuario.

## 2026-10-28 · F08 · Avisos al apoderado (HU-067)

- **Dato:** cuándo el hijo habilita una conversación (`abierta_para_hijo` pasa a verdadero) o responde una que el apoderado espera.
- **Dónde se mostraría:** un aviso al ingresar al portal o una marca en el menú «Conversaciones».
- **Opciones:** notificaciones asíncronas (backend con eventos por cuenta); calcular la novedad al ingresar comparando con la última visita; dejar solo la marca «{hijo} respondió» de la lista (como hoy).
- **Si no se muestra:** el apoderado ve lo nuevo al abrir Conversaciones (la lista se revalida al montarla).
- **Estado:** pospuesto en F08 (notificaciones asíncronas).

## 2026-10-28 · F08 · «Requiere atención» en el inicio del apoderado

- **Dato:** temas en «Le toca responder» del hijo activo.
- **Dónde se mostraría:** la tarjeta de Conversaciones del inicio (estilo de alerta que ya tiene la tarjeta en local).
- **Opciones:** resaltar la tarjeta cuando hay temas por responder; un contador en el menú; no resaltar.
- **Si no se muestra:** el inicio muestra conversadas y por conversar del hijo activo, sin alerta.
- **Estado:** pospuesto en F08.

## 2026-10-28 · F08 · Varios hijos en el inicio del apoderado

- **Dato:** `GET /sesion` trae todos los hijos; `GET /familia` solo el primer vínculo (`estudiante`).
- **Dónde se mostraría:** «Mis hijos», el avance del hijo y sus resultados en el inicio (hoy, solo el primero).
- **Opciones:** `familia?estudiante=` como en Conversaciones (ajuste sin modelo); un selector en el inicio; mantener el primero.
- **Si no se muestra:** con dos hijos, el inicio muestra al primero; Conversaciones ya permite elegir.
- **Estado:** pendiente de decisión del usuario.

## 2026-10-28 · F08 · Tramos colapsables en Mis actividades

- **Dato:** el bloque de cada actividad del apoderado (nombre y número).
- **Dónde se mostraría:** cabecera de cada tramo «{n} · {nombre} · {x} de {y} completadas» con «Ocultar / Mostrar».
- **Opciones:** implementarlos cuando la ruta del apoderado tenga más de un bloque.
- **Si no se muestra:** con un solo bloque (FAMILIA, la ruta actual) la spec pide la lista directa, que es lo que se ve.
- **Estado:** pendiente hasta que la ruta real del apoderado tenga más de un bloque.

## 2026-10-28 · F08 · Contenido de fichas del estudiante bajo demanda

- **Dato:** la mochila del estudiante ya pide el contenido de cada ficha al abrir el modal (`GET /fichas/{codigo}`, ajuste mochila); la lista no trae el contenido.
- **Estado:** verificado en F08; no hace falta cambio.

## 2026-10-28 · F07b · Planes fuera de los lotes F07

- **Dato:** lo que B11 dejó fuera y ningún lote F07 implementa: HU-049 (sugerir revisar los planes al completar un cuestionario, un caso o una comprobación, o al publicar una entrevista); «Es a propósito» en el aviso de misma familia (guardar que el estudiante ya respondió); lo que ve la orientadora de las tarjetas (HU-086, B14).
- **Dónde se mostraría:** el cierre de actividad o un aviso en Mis planes (HU-049); la franja del aviso de misma familia; el perfil del estudiante en el portal de la orientadora (F10).
- **Opciones:** HU-049 como aviso en el cierre de actividad con enlace a Mis planes, o como franja en Mis planes; «Es a propósito» como botón en el aviso, con su campo en el backend; las tarjetas en la vista de la orientadora cuando llegue B14.
- **Si no se muestra:** el estudiante no recibe el recordatorio de revisar sus planes y el aviso de misma familia sigue apareciendo.
- **Estado:** pendiente de su lote (backend sin implementar para HU-049 y «Es a propósito»; B14 para la orientadora).

## 2026-10-28 · Ajuste F07a v4.2 · Compartir o imprimir el plan

- **Dato:** el plan completo (secciones, dudas y, desde F07b, presupuesto y pasos) ya está en `GET /planes`; no hay forma de compartirlo ni imprimirlo para verlo en familia.
- **Dónde se mostraría:** Mis planes o el plan abierto (una acción «Compartir» o «Imprimir»), o el portal del apoderado.
- **Opciones:** vista de impresión del plan abierto; compartir con el apoderado desde F08; o dejarlo para la revisión final.
- **Si no se muestra:** el estudiante comenta su plan en casa sin tenerlo a la vista.
- **Estado:** pendiente de decisión del usuario (F08 o revisión final).

## 2026-10-28 · F07a · «De tu camino» en «Por qué la elijo»

- **Dato:** la tarjeta v4 cita en POR_QUE lo que el estudiante escribió en la actividad 1.7 («De tu camino»); el backend no entrega esa cita en `GET /planes`.
- **Dónde se mostraría:** sección 1 del plan abierto, sobre «¿De quién fue la idea?», en lectura y en edición.
- **Opciones:** una referencia con la respuesta de 1.7 en `GET /planes` (ajuste sin modelo); reutilizar `GET /actividades/{a}/referencias` desde la tarjeta; o dejar la sección sin la cita.
- **Si no se muestra:** el estudiante escribe su relato sin ver lo que ya contó en 1.7.
- **Estado:** pendiente de decisión del usuario; no se implementa en F07a.

## 2026-10-28 · F07a · Valores del registro 2.3 primero

- **Dato:** la tarjeta v4 ordena los chips de VALORES en POR_QUE con los que el estudiante marcó en el registro «Lo que valoro» (2.3) primero; `opciones.valores` no indica cuáles marcó.
- **Dónde se mostraría:** «¿Qué te mueve a elegirla?» de la sección 1 del plan abierto (orden de los chips y, quizá, una marca «de Lo que valoro»).
- **Opciones:** `opciones.valores[].de_registro` en `GET /planes` (ajuste sin modelo); leer las respuestas del registro desde la tarjeta; o mantener el orden de la lista común.
- **Si no se muestra:** los chips siguen el orden de la lista común VALORES.
- **Estado:** pendiente de decisión del usuario; no se implementa en F07a.

## 2026-10-26 · F06 · Datos del catálogo local que el servidor no entrega

- **Dato:** el catálogo local muestra, y el servidor no entrega:
  - en la ocupación, `interestScores` (las seis barras RIASEC);
  - en la institución, dirección, distrito y provincia (el servidor tiene `ubicacion` con código y nombre);
  - en la carrera, ingresos por ámbito (Lima, nacional) y por edad (jóvenes, adultos) con su ranking (el servidor tiene `ingreso` con promedio, fuente, año y tramos con porcentaje);
  - en la tarjeta de carrera de la lista, la duración y la descripción (`CarreraResumen` no las trae; el detalle sí).
- **Dónde se mostraría:** detalle de ocupación («A qué tipo de persona le suele atraer»), detalle de institución («Dónde queda»), detalle de carrera («Cuánto se gana») y tarjetas del catálogo de carreras.
- **Opciones:**
  1. Agregar esos campos al backend (puntajes O*NET por dimensión, dirección, ingresos por ámbito y edad, duración en el resumen).
  2. Dejar las vistas de api con lo que hoy entrega el servidor.
- **Si no se muestra:** en api, la ocupación muestra sus sellos sin barras, la institución solo su ubicación, la carrera su ingreso promedio con tramos y la tarjeta de carrera, nombre, familia y sellos. En local no cambia.
- **Estado:** resuelto en el ajuste catalogo-datos-reales (2026-10-27): el servidor entrega los puntajes por dimensión (`puntajes`, 0–100), la dirección y el distrito (la provincia se descarta), los ingresos de la familia por departamento y por edad (`ingreso.nacional` y `ingreso.departamentos`, con jóvenes y adultos) y por institución, y la duración en el resumen de carrera. Las pantallas que los muestran son F6 de ese ajuste.

## 2026-10-27 · Ajuste catalogo-datos-reales · Planes en los detalles del catálogo

- **Dato:** desde F07a, los planes del front en api son los del servidor, pero la institución del plan se elige en REALIDAD (F07b); el perfil del estudiante en api no tiene departamento.
- **Dónde se mostraría:** «Usarla en un presupuesto» (debería abrir el plan con la institución precargada en REALIDAD), «En tus planes» del detalle de institución («Aquí estudiarías X en tu Plan A») y el chip inicial de «Dónde estudiarla» (el departamento del estudiante).
- **Hoy:** «Usarla en un presupuesto» lleva a Mis planes sin precarga; «En tus planes» no se pinta en la institución; «Dónde estudiarla» arranca en Lima. En api, «Armar un plan» crea el plan en el servidor (solo si la carrera es favorita) y abre su sección 1; «Ver mi tarjeta» abre el plan de esa carrera (F07a).
- **Opciones:** precargar la institución al llegar a REALIDAD (F07b); o mantenerlo así hasta la revisión estética.
- **Estado:** reescrito en F07a; «Usarla en un presupuesto» y «En tus planes» esperan REALIDAD (F07b). El departamento sigue pendiente de decisión del usuario.

## 2026-10-27 · Ajuste catalogo-datos-reales · Contador de exploración en carreras e instituciones

- **Dato:** cuántas carreras o instituciones vio la cuenta («Tu exploración: N descubiertas» en los bocetos).
- **Estado:** descartado por el usuario: el progreso va en el pasaporte. El bloque no se pinta en esos listados (sí en profesiones, como «N de M íconos revelados»). Si más adelante se quiere un empujón ahí, que tenga mecánica (por ejemplo, familias visitadas hacia la insignia), no un conteo de vistas.

## 2026-10-27 · Ajuste catalogo-datos-reales · Ocupaciones reales por carrera

- **Dato:** la relación carrera → ocupaciones. Hoy es provisional: de 3 a 5 ocupaciones al azar por carrera (semilla fija), salvo las 6 carreras de la ruta; las carreras de FF. AA. no tienen ninguna.
- **Dónde se mostraría:** «Profesiones a las que conduce» (detalle de carrera) y «Carreras que llevan aquí» (detalle de profesión).
- **Opciones:** cargar el archivo real de emparejamiento carrera → ocupaciones cuando esté; mientras tanto, mostrar la relación provisional (como hoy) o no pintar esas secciones.
- **Estado:** pendiente del archivo de emparejamiento.

## 2026-10-25 · Ajuste pasaporte-perfil · Textos de condición en bloqueos y desbloqueos

- **Dato:** cada condición trae `texto` (lo que pide, redactado en el servidor) también en `bloqueo.condiciones_faltantes` de actividades y secciones y en `nuevos_desbloqueos[].condiciones`.
- **Dónde se mostraría:** el diálogo de Lumi ante algo cerrado, el drawer de una actividad bloqueada o el cierre de actividad.
- **Opciones:**
  1. Listar las condiciones faltantes con su texto bajo el mensaje de bloqueo.
  2. Dejarlo solo en el pasaporte (modal de insignia y siguiente título), como hoy.
- **Si no se muestra:** esas vistas siguen con el mensaje de bloqueo de la regla; el texto de cada condición solo se ve en el pasaporte y el perfil.
- **Estado:** pendiente; ninguna vista lo pinta fuera del pasaporte por decisión del usuario al aprobar el ajuste.

## 2026-10-23 · F05 · «Hoy ya contaron tus 3 conversaciones» en el panel de amistad

- **Dato:** `GET diario/amistad` trae `puntos`, `nivel` y `siguiente_en`, pero no cuántas escrituras contaron hoy (tope `TOPE_ENTRADAS_AMISTAD_DIA`).
- **Dónde se mostraría:** panel «Amistad con Lumi» del diario (`LumiBondPanel`) y la ayuda del editor («Esta conversación suma a tu amistad con Lumi»).
- **Opciones:**
  1. Que `amistad` entregue `contadas_hoy` (o `restantes_hoy`).
  2. Dejarlo solo en el aviso al guardar, que ya lo deduce comparando los puntos antes y después.
- **Si no se muestra:** en api el panel no dice que el tope del día se alcanzó y el editor no anticipa si la entrada suma; el aviso al guardar sí lo dice.
- **Estado:** resuelto en el ajuste del diario de F05: el panel dice el texto fijo «Hoy cuentan hasta 3 cartas · la amistad nunca se pierde» y no deduce cuántas contaron hoy, por decisión del usuario.

## 2026-10-22 · Ajustes Central (7) · Favoritos de testimonios

- **Dato:** la estrella de la tarjeta y «Agregar a favoritos» del visor de un testimonio. El backend no tiene favoritos de testimonios (`TipoFavorito`: CARRERA, OCUPACION, INSTITUCION).
- **Dónde se muestra:** tarjeta del testimonio en Recursos y visor del testimonio.
- **Opciones:** agregar TESTIMONIO (y FICHA) a los favoritos del servidor; mantenerlos en el navegador.
- **Si no se muestra en el servidor:** se guardan en `adventure.bookmarks`, como las fichas, solo en ese navegador.
- **Estado:** el usuario decidió dejarlos locales en los ajustes de la Central.

## 2026-10-22 · Ajustes Central (6) · Qué actividad abre cada pregunta del diario (drawer y cartas)

- **Dato:** el servidor no dice qué actividad desbloquea cada pregunta del diario: `GET diario/preguntas` trae `codigo`, `nombre`, `estado`, `personalizada`, `redactada` y `respondida`, sin la actividad; solo la respuesta de la acción que la abre trae `entradas_desbloqueadas`.
- **Dónde se mostraría:** dos lugares con el mismo hueco:
  - el drawer de actividad (`ActivityDrawer`, `renderJournal`), en el camino y la Ciudad: en F00 se decidió que conserva la entrada de diario de la actividad, con su enlace, pero en api no la muestra (`details.journal` solo se arma en local, `pointDetails.ts`);
  - las cartas de Lumi del diario: en api no se pinta «Después de: {actividad}» (F05).
- **Opciones:**
  1. Que `GET diario/preguntas` entregue la actividad (o el objetivo) que abre cada pregunta.
  2. Que `GET actividades` entregue la pregunta del diario que abre cada actividad.
  3. Dejarlo solo en el cierre de la actividad, que ya avisa «Lumi te dejó una pregunta en tu diario» (F05).
- **Si no se muestra:** en api el drawer no enlaza al diario y las cartas no dicen después de qué actividad llegaron; la pregunta sigue en el diario y en el cierre.
- **Estado:** resuelto en el ajuste del diario de F05: `diario/preguntas` entrega `actividad` (el remitente, guardado al crear la carta); las cartas dicen «De: …» y el drawer muestra la carta de su actividad.

## 2026-10-22 · Ajustes Central (2) · Hoja de vida de los contactos

- **Dato:** la hoja de vida de la Central lee en api el detalle de ocupación del servidor (`titulo`, `descripcion`, `conocimientos`, `habilidades`). En el catálogo del backend solo algunas ocupaciones tienen esos campos; las demás llegan con `descripcion` nula y listas vacías. Los rellenos «[por completar desde O*NET]» y la etiqueta «Ficha en preparación» que pedía la spec existen solo en el catálogo del front, no en el backend.
- **Dónde se muestra:** hoja de vida del paso Problema (`ProfessionalResume`).
- **Opciones:** completar esas ocupaciones en `datos/fijos.py`; que el backend entregue un estado «ficha en preparación»; dejarlo así.
- **Si no se muestra:** en api, una sección vacía no se pinta (queda el nombre, la inicial y la ocupación). En local no cambia.
- **Estado:** resuelto en F06 con la primera opción: `datos/fijos.py` completa la descripción, los lugares de trabajo y las habilidades de las ocupaciones de las seis carreras, y `ruta` sus conocimientos. Las que siguen sin texto lo tendrán con la carga real.

## 2026-10-22 · F03 · «Sorpresas nuevas» en la línea de actividades del inicio

- **Dato:** que una actividad opcional desbloqueada todavía no se haya abierto. El backend no lo entrega: `Desbloqueo.visto` dice que se vio el aviso del desbloqueo (se marca en bloque con `marcar-vistos`), y `DISPONIBLE` dice que no se inició, no que no se abrió.
- **Dónde se mostraría:** en la línea «N actividades disponibles · Ver todas ›» del panel de aventura, como «· N sorpresa(s) nueva(s)».
- **Opciones:** registrar en el backend la primera apertura de una actividad; aproximarlo con `estado == DISPONIBLE` (no iniciada); aproximarlo con los desbloqueos no vistos.
- **Si no se muestra:** la línea solo dice cuántas actividades hay disponibles.
- **Estado:** pendiente de decisión del usuario.

## 2026-10-22 · F03 · Textos del front por decidir en instrumentos

- **Dato:** textos que la interfaz de F03 necesita y el backend no entrega: «Romper el sello», «Revela tu punto de llegada»; «Tu código de interés:», «Ocupaciones afines:», «Completa:», «Ir al libro de Helena», «Volver a hacer las misiones»; al re-entrar a un test completado, «Cambiar mis respuestas» y «Tus respuestas ya quedaron fijas.»; el aviso de perfil plano («Tus respuestas no distinguen un tipo de interés. Puedes volver a hacer las misiones una vez.», y solo la primera frase con el reinicio usado); el misterio y el sello de la página «Tu punto de partida y llegada». Los textos de la tarjeta y la vista explicada de partida y llegada son del front.
- **Dónde se muestra:** libro de Helena y su vista explicada, consigna de `t-contraste`, aviso del punto bloqueado de T2.
- **Opciones:** mantenerlos en el front; moverlos al backend (parámetros o catálogo de textos); ajustarlos en la revisión estética final.
- **Si no se decide:** se usan los textos actuales.
- **Estado:** pendiente de decisión del usuario.

## 2026-10-22 · F03 · Ocupaciones y carreras del hijo para el apoderado

- **Dato:** `GET /cuentas/{c}/familia/resultados` trae `coincidencias` y `carreras_recomendadas` del resultado RIASEC del hijo.
- **Dónde se mostraría:** vista explicada del apoderado (`ParentQuestionnaireDetailView`), como en la demostración local («Cómo tomar estas recomendaciones»).
- **Opciones:** listar las ocupaciones afines con su ajuste; listar también las carreras; dejarlas solo para la conversación con el estudiante.
- **Si no se muestra:** el apoderado ve qué mide el cuestionario, el código de interés y cada dimensión con su descripción.
- **Estado:** pendiente de decisión del usuario.

## 2026-10-22 · F04d · Video incrustado en el visor de recursos

- **Dato:** los recursos de tipo video del catálogo (`rec-video-mitos`, en `encuentro_mitos`) y los enlaces de YouTube.
- **Dónde se mostraría:** dentro del visor de la mochila (`VisorRecurso`), que desde F04d es la única presentación de un recurso.
- **Opciones:** incrustar el video en `ResourceContent` cuando el enlace es de YouTube, como hacía el drawer «Fichas para tu camino»; abrirlo solo con «Abrir fuente del recurso»; abrir tipos de recurso que hoy no se abren.
- **Si no se muestra:** el video se abre con «Abrir fuente del recurso» si tiene enlace; sin enlace (como `rec-video-mitos`), el visor muestra el aviso de «próximamente». Nada que se abría deja de abrirse.
- **Estado:** fuera de alcance de F04d por decisión del usuario. Ajustes Central (7): los testimonios sí incrustan su video de YouTube en el visor (ya lo hacía `ResourceContent` para enlaces de YouTube); los recursos de video del catálogo siguen igual.

## 2026-10-22 · F04 · Contenido de la ficha `t-ficha` para repasar antes de la batalla

- **Dato:** `t_batalla.json` ofrece `t-ficha` para repasar («Repasar la ficha»), y el servidor la da al completar `t-inicio`.
- **Dónde se mostraría:** en el reproductor de desafíos, antes de la batalla y tras perderla.
- **Opciones:** crear el contenido de prueba de `t-ficha` en el catálogo de recursos; esperar a las fichas reales de la ruta base; apuntar `fichas` a una ficha que ya tenga contenido.
- **Si no se muestra:** en api, «Repasar la ficha» no aparece, porque `t-ficha` no tiene contenido en el front. El resto de la batalla funciona.
- **Estado:** resuelto en F04 con la primera opción (`t-ficha` y, desde F04b, `t-ficha-2` tienen contenido de prueba en `catalogo.json`). Desde F04d aparecen en la mochila: en api, la mochila lista las fichas de la cuenta en el servidor, con el contenido del catálogo.

## 2026-10-22 · F01 · «Ampliar →» en los ítems por ampliar

- **Dato:** `items_por_ampliar` del registro cerrado (`GET /cuentas/{c}/actividades/{a}/registro`) y la edición de un ítem entregado (`POST /acciones/registro/editar`).
- **Dónde se mostraría:** a la derecha de cada ítem por ampliar, en el cierre del registro y en el drawer de la actividad.
- **Opciones:** abrir la edición de ese ítem en el reproductor; abrir la consulta del registro (F02) en ese ítem.
- **Si no se muestra:** el cierre y el drawer nombran los ítems por ampliar sin enlace.
- **Estado:** resuelto en F02 sin enlace por ítem, por decisión del usuario: en el drawer basta el aviso de ítems por ampliar; se amplían desde «Ver o modificar mis respuestas», que abre la consulta del registro con la pista de cada ítem.

## 2026-10-21 · F01 · «Anterior» en batallas y junto a preguntas con retroalimentación

- **Dato:** el estado de cada pregunta de comprobación (intentos, retroalimentación, pistas) y de cada batalla (vidas, aciertos).
- **Dónde se mostraría:** el reproductor de actividades (`QuestionNode`) y el de batallas (`ChallengePlayer`).
- **Opciones:** volver a una pregunta ya resuelta en solo lectura (con su explicación); permitir un nuevo intento al volver; mantener sin retroceso.
- **Si no se muestra:** «Anterior» no aparece en una pregunta con retroalimentación inmediata ni en el paso que la sigue (en ese paso desaparece, aunque el anterior a él sí admitiría volver), ni en las batallas.
- **Estado:** pendiente de decisión del usuario.

## 2026-10-21 · F01 · «Anterior» en el reproductor del apoderado

- **Dato:** el nodo actual de la actividad del apoderado (`useParentActivitySession`).
- **Dónde se mostraría:** el reproductor del portal del apoderado.
- **Opciones:** el mismo «Anterior» del estudiante; un índice de pasos; mantener sin retroceso.
- **Si no se muestra:** el apoderado solo avanza en sus actividades, como hasta ahora.
- **Estado:** revisado en F08 sin cambios: la spec de pantallas no lo incluye; queda para la revisión estética.

## 2026-10-21 · F00 · Carta del apoderado (`t_apo_carta`)

- **Dato:** `t-apo-carta` en `GET /cuentas/{c}/actividades` del apoderado (bloque FAMILIA), con su `bloqueo` mientras falta `t-apo-1`.
- **Dónde se mostraría:** lista «Mis actividades» del portal y su reproductor; en F08 se completa escribiendo la carta.
- **Opciones:** conectar la escritura de la carta (B12) en F08; mostrarla como informativa hasta entonces; ocultarla.
- **Si no se muestra:** F00 la lista con `t_apo_carta.json` sin nodos (`DATO DE PRUEBA`). Bloqueada, la tarjeta dice «Bloqueada» y la entrada por URL muestra el mensaje del servidor. Abierta, el portal la sigue tratando como no disponible y no se puede iniciar: así FAMILIA no se cierra sin la carta.
- **Estado:** resuelto en F08: la carta no es una actividad; se escribe en Conversaciones (A3) y `t-apo-carta` sale de la ruta (la reemplaza `t-apo-2`, de prueba).

## 2026-10-19 · B17 · Hijos y salones de la sesión

- **Dato:** `GET /sesion` entrega `hijos` (apoderado: `codigo`, `nombre`, `salon` y `parentesco` de sus vínculos activos) y `salones` (orientadora: `codigo`, `nombre` y `es_principal`). Llegan a `store/accesoStore.ts` (`datosSesion()`), pero ninguna vista los pinta.
- **Dónde se mostraría:** la lista de hijos del portal del apoderado (hoy son datos de demostración en `features/parent/data/parentPortal.ts`) y el selector de salón de la orientadora (hoy `ov.staff.selected-salon.v1` sobre salones de demostración).
- **Opciones:**
  - conectar la lista de hijos en el lote F de familia y los salones en B14 y B16;
  - mostrar solo el nombre del hijo en la cabecera del portal del apoderado;
  - no mostrarlos hasta tener las rutas propias de la orientadora.
- **Si no se muestra:** el portal del apoderado sigue mostrando hijos de demostración en modo `api`, aunque sus actividades sí son de la cuenta con sesión.
- **Estado:** hijos resuelto en F08: el portal usa `GET /sesion` para el parentesco del perfil, el selector «Con {nombre}» de Conversaciones y el hijo activo; los salones de la orientadora siguen pendientes (F10). El inicio y «Mis hijos» siguen mostrando un solo hijo (el de `familia`): ver «F08 · Varios hijos en el inicio».

## 2026-10-15 · B12 · Familia: conversaciones, cartas y ruta del apoderado

- **Dato:**
  - `GET /cuentas/{c}/conversaciones` (estudiante y apoderado): `carta_pendiente`, `completadas`, `total`, `carta_propia`, `carta_recibida` (solo con todas conversadas) y, por conversación disponible, `codigo`, `titulo`, `pregunta` de su rol, `estado` (`sin_responder`, `esperando_al_otro`, `te_toca`, `por_conversar`, `conversada`), `mi_respuesta`, `conversada_en` y, con las dos respuestas, `respuesta_otro`, `preguntas_guia` y `mensaje_diferencias`;
  - `POST /acciones/responder-conversacion` (nueva) y `completar-conversacion` (exige las dos respuestas; el evento va solo al estudiante); `escribir-carta` exige ahora la sección de cada rol y se cierra al entregarse;
  - `GET /cuentas/{c}/familia` (apoderado): `avance`, `diploma {obtenido, obtenido_en}` y `estudiante {codigo, nombre, avance, nivel_actual}`;
  - `GET /cuentas/{c}/familia/resultados` (apoderado con su ruta completa): resultados vigentes del hijo en los cuestionarios visibles al apoderado.
- **Dónde se mostraría:** sección Familia del estudiante (carta y conversaciones), portal del apoderado (conversaciones, carta, diploma, avance y resultados del hijo). Hoy el diploma del apoderado se calcula en el front con el estado remoto de sus actividades.
- **Opciones:** conectar familia en su lote F con estas consultas; mientras tanto, el portal del apoderado sigue con sus actividades y su diploma actuales.
- **Si no se muestra:** en modo `api` las conversaciones, las cartas y los resultados visibles al apoderado existen solo en el servidor. El aviso al apoderado cuando el hijo habilita una conversación (HU-067) queda fuera de B12.
- **Estado:** resuelto en F08: Familia del estudiante (E2–E8), Conversaciones del apoderado (A1–A6), diploma (A9) y avance; el contrato cambió (conversada al responder el segundo, lista completa con tramo y bloqueo, `otro`, `cartas_disponibles`, código del diploma). El aviso HU-067 queda en «F08 · Avisos al apoderado».

## 2026-10-14 · B09 · Avance por temática

- **Dato:** `GET /cuentas/{c}/tematicas` (`codigo`, `nombre`, `completadas`, `total`, `porcentaje` de las cinco dimensiones del cuestionario de partida y llegada). El resto de B09 (diario, pregunta del día, amistad, check-in y afinidad) se conectó en F05.
- **Dónde se mostraría:** sin decidir; no tiene relación con la Ciudad.
- **Opciones:**
  1. Un bloque en el perfil o en el pasaporte con una barra por temática.
  2. Junto a la comparación partida–llegada del libro de Helena.
  3. Solo en el panel de la orientadora (F10/F11).
- **Si no se muestra:** el avance por temática solo existe en el servidor; el front no lo pide (no hay cliente).
- **Estado:** pendiente, sin vista por decisión del usuario (F05), para un lote posterior. HU-075 queda parcial (nivel y afinidad). El ajuste pasaporte-perfil rediseñó el perfil y el pasaporte sin incluirlo: sigue sin vista.

## 2026-10-13 · B08 · Batallas, casos y testimonios

- **Dato:**
  - el tipo de actividad `BATALLA` y `POST /acciones/resolver-batalla` (`victoria`, `aciertos`, `preguntas`): guarda cada intento, solo la primera victoria completa (SUPERA_BATALLA y, sin errores, VENCE_DESAFIO_INTACTO); `completar-actividad` rechaza las batallas con 409. `GET /cuentas/{c}/batallas` trae intentos, si se superó y el primer intento. La actividad `t-batalla` (T1, opcional) no tiene contenido en el front;
  - `resolver-caso` ya no completa el caso si el puntaje no llega a `puntaje_minimo` (queda EN_CURSO); acepta `ocupaciones` (las bien asignadas) y responde `ocupaciones_nuevas`. Hoy `forestFireCaseOutcome.ts` desbloquea la colección en local;
  - `GET /cuentas/{c}/casos` (tipos RIASEC en `dimensiones`, intentos, último y mejor puntaje) y `GET /cuentas/{c}/coleccion` (ocupaciones obtenidas al superar casos);
  - `GET /cuentas/{c}/testimonios` cambió de forma (`TestimonioEstado`: `visto`, `pista` si está bloqueado, `descripcion` y `enlace` si está disponible) y `POST /acciones/ver-testimonio` registra VISTA_TESTIMONIO la primera vez.
- **Dónde se mostraría:**
  - en el reproductor de desafíos (`useChallengePlayer`, `recordBattle`): enviar cada intento al terminar y leer el estado del servidor en vez de `challengeResults`;
  - en la central de casos: el tipo RIASEC de cada caso, el resultado del último intento y la colección de íconos;
  - en una vista de testimonios (no existe): los disponibles con su enlace y los bloqueados con su pista.
- **Opciones:**
  - conectar batallas y casos en el lote F de actividades, agregando los tipos a `servidor.ts` y un archivo por router en `src/services/api/`;
  - crear `t_batalla.json` o mapear `t-batalla` a un desafío real al cargar la ruta;
  - crear la vista de testimonios cuando la spec de su lote F la autorice.
- **Si no se muestra:** en modo `api`, una batalla nunca se completa por `completar-actividad`, un caso fallido ya no aparece completado y los testimonios solo se ven en local.
- **Estado:** resuelto en F04: el reproductor de desafíos envía cada intento y se abre por el tipo de la actividad (`t_batalla` apunta a `desafio-rumor`); la Central de Casos envía puntaje y ocupaciones, decide «superado» con `puntaje_minimo` y muestra el tipo RIASEC en el reporte; la colección se lee en el catálogo y el detalle de ocupación; los testimonios van en la pestaña de la mochila.

## 2026-10-13 · B07 · Partida y llegada, temáticas y prioritarios

- **Dato:**
  - el cuestionario `TEST-PARTIDA-LLEGADA` (actividades `t-partida` en T0 y `t-llegada` en T2, sin contenido en el front), que se revela por aplicación (`APL-PARTIDA`, `APL-LLEGADA`) con `POST /acciones/revelar-resultado`;
  - en `GET /cuentas/{c}/instrumentos/{i}/resultado`, cada dimensión trae ahora `zona` (FUERTE, EN_CAMINO, POR_TRABAJAR) y `tematica`. En COMPARACION, `puntaje`, `puntaje_maximo` y `porcentaje` llegan en `null`, pero `src/types/servidor.ts` los declara `number`;
  - `GET /cuentas/{c}/instrumentos/{i}/comparacion` (HU-094) cambió de forma: por dimensión, la zona de partida y la de llegada, `actividades_completadas` de su temática e `items` con la etiqueta elegida en cada momento y `cambio`, sin números;
  - el bloque T2 «Decisión», que se abre con T1 cerrado, la partida revelada y los cuestionarios prioritarios del salón revelados, y muestra ese mensaje de bloqueo;
  - la actividad `t-lee-cuestionario` (T1, opcional), sin contenido en el front, y su referencia RESPUESTA_CUESTIONARIO (`texto`: la etiqueta elegida en `AUTO-01` de la partida).
- **Dónde se mostraría:**
  - en el libro de Helena: las zonas de partida en palabras al revelarla y, al cierre, la comparación dimensión por dimensión, con los ítems que cambiaron primero y los que se mantuvieron plegados. Un cambio a una opción menor no se marca como negativo;
  - en el mapa, T2 bloqueado con su mensaje;
  - en `t-lee-cuestionario`, la cita de la respuesta.
- **Opciones:**
  - en el lote F de instrumentos: hacer opcionales los números de `DimensionResultado` en `servidor.ts`, agregar `zona` y `tematica` y el tipo de la comparación nueva, y conectar revelar partida y llegada;
  - crear `t_partida.json`, `t_llegada.json` y `t_lee_cuestionario.json`, o mapearlas a las actividades reales al cargar la ruta.
- **Si no se muestra:** en modo `api`, T2 nunca se abre si la partida no se revela, y el front que suponga números en las dimensiones de COMPARACION recibe `null`.
- **Estado:** resuelto en F03. El libro de Helena tiene en api la página I «Partida y llegada»: se revela con «Romper el sello» (`APL-PARTIDA`), muestra cada temática con su zona en palabras y, con la llegada completa, un segundo sello; con las dos reveladas, «partida → llegada» y la vista explicada `COMPARACION` (ítems que cambiaron primero, los demás plegados, sin marcar un cambio como negativo). T2 bloqueado muestra su mensaje y el enlace «Ir al libro de Helena». `t_partida`, `t_llegada` y `t_lee_cuestionario` (con la cita de la respuesta) tienen contenido.

## 2026-10-13 · B06 · Revelar resultados y libro de Helena

- **Dato:**
  - `completar-actividad` ya no calcula ni devuelve `resultados_generados` (el front lo lee en `NodeRenderer.tsx` y en `src/types/servidor.ts`);
  - `POST /acciones/revelar-resultado` (`cuenta`, `instrumento`, `aplicacion?`), que calcula el resultado y responde `perfil_plano`, eventos (REVELA_RESULTADO) y desbloqueos; 409 si faltan misiones (`items_faltantes`) o si ya se reveló;
  - en `GET /cuentas/{c}/instrumentos`, COMPLETADO con `hay_resultado_vigente: false` significa «listo para revelar»;
  - `POST /acciones/reiniciar-instrumento` solo procede con perfil plano revelado, y una vez por cuenta y aplicación;
  - la actividad `t-contraste` (registro en CIUDAD, se abre al revelar), sin contenido en el front, y sus referencias RESULTADO (dimensiones del código de interés) y COINCIDENCIAS (ocupaciones), con `opciones: []` si el perfil es plano.
- **Dónde se mostraría:**
  - en el libro de Helena: un botón «Revelar» cuando el cuestionario está COMPLETADO y sin resultado, y las vistas resumida y explicada después;
  - con perfil plano, una invitación a repetir el test y el botón que llama al reinicio (solo si aún no se usó);
  - en `t-contraste`, la zona de eco con el código de interés y las ocupaciones citadas.
- **Opciones:**
  - conectar revelar y el reinicio en el lote F de instrumentos y quitar `resultados_generados` de `servidor.ts` y `NodeRenderer.tsx`;
  - crear `t_contraste.json` o mapearla a la actividad real de contraste cuando se cargue la ruta.
- **Si no se muestra:** en modo `api` el resultado nunca se calcula (el front espera `resultados_generados` al completar), `t-contraste` no se abre y el perfil plano no se puede repetir.
- **Estado:** resuelto en F03. En api, la página de intereses (II) se revela con `revelar-resultado` cuando el avance está COMPLETADO sin resultado; con perfil plano invita a repetir las misiones y llama a `reiniciar-instrumento` si el historial no trae un reinicio usado. `t_mision_intereses`, `t_mision_intereses_2` y `t_contraste` (con la cita del código de interés y las ocupaciones) tienen contenido; `resultados_generados` ya no existía en el front.

## 2026-10-13 · B05 · Referencias y eco

- **Dato:**
  - `GET /cuentas/{c}/actividades/{a}/referencias`: por referencia, `codigo`, `tipo` (ELECCION o TEXTO), `estado` (DISPONIBLE, POR_DESARROLLAR o SIN_DATO) y, solo si está disponible, `texto` (cita literal de la consolidada) u `opciones` (`[{codigo, texto}]`, lo elegido antes);
  - `eleccion.referencia` en `GET /actividades/{a}/items-registro`: en un ítem que elige por referencia, `lista` es nula y `opciones` va vacía, y las opciones salen de esa referencia;
  - la actividad `t-eco` (registro en T1, opcional), que no tiene contenido en el front.
- **Dónde se mostraría:**
  - en la zona de eco de un ítem que retoma una respuesta: la cita literal, con DISPONIBLE;
  - **el aviso de «por desarrollar»**, con POR_DESARROLLAR: en lugar de la cita, un aviso de Lumi en esa misma zona (p. ej., «Esta respuesta aún está por desarrollar; puedes ampliarla en “Lo que esperan de mí”»), con enlace a la consulta y edición del registro de origen (pendiente B04). Nunca muestra la clasificación;
  - con SIN_DATO, la zona de eco se oculta;
  - en un ítem que elige por referencia, las opciones de la referencia ELECCION en lugar de una lista, sin «otra» propia.
- **Opciones:**
  - conectar los nodos de consigna del reproductor a `referencias` en el lote F de registros, con la clave de la referencia en el JSON de contenido;
  - crear `t_eco.json` o mapear `t-eco` a una actividad real cuando se cargue la ruta;
  - definir el texto definitivo del aviso «por desarrollar».
- **Si no se muestra:** en modo `api` las actividades no retoman lo escrito antes y `t-eco` se descarta por no tener contenido.
- **Estado:** resuelto en F02. La consigna con `eco` muestra, con la burbuja de Lumi, el recuerdo y la cita (DISPONIBLE), «La vez pasada lo contaste en pocas palabras. Aquí puedes tomarte tu tiempo.», sin enlace (POR_DESARROLLAR), o nada (SIN_DATO); el registro de origen sale de `actividad` de la referencia. Ajuste de F02 (cambio de modelo aprobado): la elección que retoma una anterior usa la lista original completa con la elección guiada; lo elegido la vez pasada llega marcado con la etiqueta «La vez pasada» y se mantiene o se cambia. `t_eco.json` tiene sus consignas.

## 2026-10-13 · B04 · Respuesta consolidada y edición de registros

- **Dato:**
  - en `GET /cuentas/{c}/actividades/{a}/registro` con el registro cerrado: `texto_consolidado` por ítem e `items_por_ampliar` como `{item, pista}` (antes, al cerrar, era una lista de códigos);
  - `POST /acciones/registro/editar` con `items: [{item, texto}]`, que abre un nuevo intento con seguimiento;
  - la conversación muestra solo los turnos del intento vigente.
- **Dónde se mostraría:**
  - una consulta del registro entregado con la respuesta consolidada de cada ítem y, en los que se pueden ampliar, su pista y un botón «Editar»;
  - la edición reutiliza la misma interfaz de seguimiento con Lumi que la entrega (pregunta pendiente, «Responder», «Continuar sin responder»).
- **Opciones:** construir la consulta y el botón de editar en el lote F de registros; mantener la lógica local hasta entonces.
- **Si no se muestra:** en modo `api` el estudiante no puede consultar ni editar lo que entregó; la misión adicional solo se abre si todo quedó adecuado en la entrega.
- **Estado:** resuelto en F02. «Ver o modificar mis respuestas» abre el mismo reproductor solo con las consignas, en modo lectura (elección marcada y texto como cita) con «Modificar»; la pista la dice Lumi. Cambiar el texto o la elección (que obliga a reescribir) y «Entregar cambios» edita con el seguimiento de F01.

## 2026-10-09 · AP-F3 · Carga y error del portal del apoderado

- **Dato:** `useParentActivities().loading` y `.error`, durante el ingreso y `GET /cuentas/{c}/actividades`.
- **Dónde se mostraría:** inicio y lista de actividades del portal. No tienen aviso de carga ni de error del servidor.
- **Opciones:** incorporar un aviso de carga y error en esas vistas; conservar el contenido previo con un aviso al fallar una actualización; mantener la presentación actual hasta definirla.
- **Si no se muestra:** durante la carga se ve «0 de 0 actividades» y, si falla el ingreso o la consulta, la lista queda vacía. El error llega al hook. El detalle devuelve `null` durante la carga para evitar un candado prematuro; el reproductor sí usa su aviso y reintento existentes al fallar un guardado.
- **Estado:** resuelto en F00: `PantallaCargaPortal` en la carga inicial (actividades y familia) y en su error, con «Reintentar» y «Volver a ingresar».

## 2026-10-09 · AP-F3 · Nombre del apoderado

- **Dato:** `CuentaResumen.nombre` de `GET /cuentas` (también disponible en `ResumenCuenta.cuenta.nombre`).
- **Dónde se mostraría:** saludo y perfil del portal, que hoy usan `parentProfile.name` de demostración.
- **Opciones:** conectar el nombre de la cuenta seleccionada al saludo y perfil existentes; definir un nombre preferido editable en su iteración; conservar explícitamente el perfil de demostración.
- **Si no se muestra:** ingresar con `apo-rosa` sigue mostrando «José», aunque las actividades sí pertenecen a `apo-rosa`.
- **Estado:** resuelto en F00: el saludo y el perfil usan el nombre de la sesión (`useParentProfile`); el parentesco sigue siendo de demostración.

## 2026-10-09 · AP-F3 · Hijos y progreso del hijo

- **Dato:** el vínculo `VIN-ANA` existe en el backend, pero no tiene consulta de lectura para el portal; hijos, progreso y cuestionarios vienen de `parentPortal.ts` y `studentProfiles`.
- **Dónde se mostraría:** «Mis hijos», avance y resultados del hijo en el inicio y sus detalles.
- **Opciones:** definir una consulta del dominio familiar y conectar las vistas actuales; integrar después selección y progreso de hijos en su iteración; conservar la demostración hasta disponer del contrato.
- **Si no se muestra:** el portal sigue mostrando a Gabriela y su progreso de demostración; completar actividades del apoderado no convierte esos datos en resultados reales de `est-ana`.
- **Estado:** resuelto en F00 y F03: en api, el resumen usa `GET /cuentas/{c}/familia` (nombre, avance del hijo y avance propio) y, con el diploma, los resultados visibles del hijo (`familia/resultados`) con su vista explicada.

## 2026-10-09 · AP-F3 · Evento de bloque FAMILIA completado

- **Dato:** `COMPLETA_BLOQUE FAMILIA` en `RespuestaCompletarActividad.eventos_registrados` al terminar la segunda actividad.
- **Dónde se mostraría:** confirmación del recorrido o diploma; el evento no tiene una vista propia.
- **Opciones:** mantener el diploma derivado de la ruta completa; mostrar el evento en un historial futuro; definir una confirmación específica del bloque.
- **Si no se muestra:** el backend registra el evento y el diploma existente se muestra desde `route.complete`, calculado con las actividades completadas del servidor.
- **Estado:** resuelto en F08: el diploma sale del servidor (`familia.diploma`, con fecha y código) y se ve en Mis actividades y en su pantalla (A9).

## 2026-10-09 · Anexo F2 · Descripciones fuera del resumen de Helena

- **Dato:** `ResultadoPublico.dimensiones[].descripcion` de las seis dimensiones y `dimensiones_destacadas[].descripcion` de los instrumentos DESTACADAS; `GET /cuentas/{c}/instrumentos/{instrumento}/resultado`.
- **Dónde se mostraría:** perfil por dimensión y guía de la vista de resultado completo de Helena. Hoy el resumen de intereses usa las tres áreas de `codigo_interes`; el resto de las descripciones permanece en el resultado remoto. TEST-INT y TEST-HAB reales solo están en demo del backend, no en la semilla plataforma; TEST-HAB conserva sus textos de demostración según F2.
- **Opciones:**
  1. Usar el perfil por dimensión y la guía descritos y autorizados en F4 del anexo (decisión ya aprobada; pendiente de esa fase).
  2. Conservar únicamente las descripciones del resumen actual hasta ejecutar F4.
  3. Integrar posteriormente el resultado real de TEST-INT cuando se incorpore a plataforma; requiere su iteración y sustituye la demostración señalada.
- **Si no se muestra:** el contrato y los resultados conservan todas las descripciones, pero el resumen no permite consultar todas las dimensiones. F2 no agrega controles ni secciones. F4 también usará la demostración de inteligencias; los instrumentos reales se integrarán en su iteración.
- **Estado:** resuelto para intereses en F4: perfil y guía muestran las seis descripciones remotas. Inteligencias muestra las siete descripciones de la demostración aprobada. TEST-INT y TEST-HAB reales permanecen pendientes de su iteración; F4 no los incorpora a plataforma.

## 2026-10-08 · B3 · Actividad de prueba sin contenido

- **Dato:** el conjunto `piloto` y su actividad `cdd-sin-contenido` ya no existen (B00).
- **Dónde se mostraría:** —
- **Opciones:** —
- **Si no se muestra:** en `ruta`, una actividad sin contenido en el front se descarta y se avisa en desarrollo (`avisarContenidoFaltante`); la prueba `servidor-mapa` lo cubre con un contenido inexistente inyectado.
- **Estado:** cerrado en F00.

## 2026-10-08 · B3 · Texto de la llave con Ciudad abierta al segundo paso

- **Dato:** `BloqueActividades.estado` de `CIUDAD`, en `GET /cuentas/{c}/actividades`; en `piloto` pasa a `DISPONIBLE` tras `enc-mitos`, con el Camino aún incompleto.
- **Dónde se mostraría:** llave de la Ciudad en el Camino, cuyo texto actual es «Destino al completar el camino» (§8).
- **Opciones:**
  1. Definir un texto que sirva para ambos conjuntos.
  2. Mostrar la condición real de apertura desde el progreso del servidor.
  3. Conservar el texto actual durante las pruebas del piloto.
- **Si no se muestra:** F3 muestra correctamente la llave disponible, confirmado en F4, pero el texto describe una condición distinta en piloto. Se conserva sin cambios según §8.
- **Estado:** resuelto en F00: en api ya no hay punto de llave; la Ciudad cerrada se explica desde el selector Camino/Ciudad.

## 2026-10-08 · B3 · Revelado sin animación

- **Dato:** `ActividadCuenta.visibilidad = "AL_DESBLOQUEAR"` y `visible` de `act-tip-final`, en `GET /cuentas/{c}/actividades` con `piloto`.
- **Dónde se mostraría:** punto de Elena al completar `act-tip-14`; no existe animación de revelado para actividades de esta consulta (§8).
- **Opciones:**
  1. Mostrar el punto al actualizar su visibilidad, sin animación.
  2. Definir una animación para su aparición.
  3. Definir un aviso de revelado con la interacción que decida el usuario.
- **Si no se muestra:** F3 aplica la visibilidad enviada por el servidor; F4 confirma la aparición sin una transición especial. No se reutiliza el mecanismo local de misiones adicionales.
- **Estado:** pendiente.

## 2026-10-08 · B2 · Testimonios del servidor

- **Dato:** `ContenidoEstado[].codigo`, `titulo` y `estado`, en `GET /cuentas/{c}/testimonios`.
- **Dónde se mostraría:** acceso a testimonios o historias de profesiones del portal del estudiante; hoy no tiene una vista conectada al servidor.
- **Opciones:**
  1. Conectar una lista de testimonios en su futura sección.
  2. Ofrecerlos desde el detalle de una profesión.
  3. Mantenerlos fuera de la interfaz hasta la iteración 4.
- **Si no se muestra:** la consulta conserva el dato en la API al retirar `/estado`; el front no la solicita ni agrega sus tipos o servicios en esta fase (§4 de la spec de actividades por dominio).
- **Estado:** resuelto en F04 con la opción 1: la pestaña «Testimonios» de la mochila lista los del servidor.

## 2026-10-08 · B2 · Preguntas del diario del servidor

- **Dato:** `PreguntaDiarioEstado[].codigo`, `pregunta`, `estado` y `respondida`, en `GET /cuentas/{c}/diario/preguntas`.
- **Dónde se mostraría:** preguntas guiadas del diario del estudiante; su funcionamiento actual sigue siendo local.
- **Opciones:**
  1. Conectar las preguntas guiadas en la iteración 3.
  2. Integrarlas como sugerencias al escribir una entrada.
  3. Mantener el diario local hasta definir su integración completa.
- **Si no se muestra:** el front no conoce la disponibilidad ni las respuestas registradas en el servidor; no llama a esta consulta durante la iteración 1 y conserva su comportamiento actual.
- **Estado:** resuelto en F05: en api, las preguntas DISPONIBLE sin responder son las cartas de Lumi del diario y las BLOQUEADA se cuentan como «por descubrir».

## 2026-10-08 · B2 · Disponibilidad de conversaciones del servidor

- **Dato:** `ConversacionesEstado.estado`, en `GET /cuentas/{c}/conversaciones`.
- **Dónde se mostraría:** acceso a conversaciones familiares del portal del estudiante; todavía no hay una vista en modo API que consuma este estado.
- **Opciones:**
  1. Conectar la disponibilidad al acceso de conversaciones en la iteración 4.
  2. Mostrarla al abrir el detalle de una conversación.
  3. Mantener el acceso de próxima iteración hasta integrar lectura y acciones.
- **Si no se muestra:** el estado sigue disponible en el backend; el front no solicita la consulta y conserva su presentación actual de próxima iteración.
- **Estado:** resuelto en F08: el estado de cada conversación (y `bloqueada` con su mensaje) organiza las pestañas de Familia y Conversaciones.

## 2026-10-08 · F4 · Señal de hoy todavía local

- **Dato:** el front conserva la señal en su almacenamiento local; existe `POST /acciones/check-in`, pero falta una consulta de lectura para conectarla como fuente única (D9 y §11).
- **Dónde se mostraría:** panel del mapa, registro de señal y evolución del diario, con sus elementos actuales.
- **Opciones:**
  1. Integrar lectura y escritura juntas en la iteración 3, como está previsto.
  2. Definir antes el contrato de consulta manteniendo la integración para esa iteración.
  3. Conservar explícitamente el comportamiento local hasta completar ambos extremos.
- **Si no se muestra:** la señal del panel sigue siendo local incluso en modo API; el recorrido de F4 no la envía al servidor y no mezcla sus datos con disponibilidad o progreso.
- **Estado:** resuelto en F05: `GET check-ins` (con `registrado_hoy`) y `POST check-in` alimentan el panel del mapa, el aviso al ingresar, el diálogo y la evolución, en la escala 1–5.

## 2026-10-09 · Anexo F3 · Persona, rol, cita y apertura de testimonios

- **Dato:** `RespuestaAccion.nuevos_desbloqueos[].objetivo.codigo` y `.nombre` cuando `tipo_objetivo = TESTIMONIO`, en `POST /acciones/completar-actividad`. El recibo no contiene persona, rol ni cita; `Recurso` de `catalog.recursos` tampoco tiene persona/rol. El contenido puede faltar. `GET /cuentas/{c}/testimonios` entrega `ContenidoEstado[].codigo`, `titulo` y `estado`, pero su integración no corresponde a esta iteración (pendiente B2 anterior).
- **Dónde se mostraría:** tarjeta de testimonio dentro de «Nuevo en tu mochila» y visor seleccionado mediante `?kind=testimonial&ficha={codigo}`.
- **Opciones:** completar el catálogo narrativo con metadatos y contenido para esos códigos; definir una respuesta de lectura de testimonios con persona/rol/cita en su iteración; conservar solo el nombre en el cierre hasta disponer de contenido e integración remota.
- **Si no se muestra:** el cierre presenta el nombre real y su enlace, sin atribuciones o citas inventadas. La selección local funciona cuando el testimonio existe, con sus candados actuales. En API la mochila conserva solo las fichas remotas de esta iteración: un testimonio sin integración no abre un visor de contenido, aunque su enlace ya incluye el código y filtro correctos.
- **Estado:** resuelto en F04: en api la tarjeta muestra título, descripción y «Ver testimonio» (enlace en otra pestaña). Ajustes Central (7): el backend entrega persona, ocupación, años, cita y el caso que lo regala; la tarjeta es la del prototipo y «Escuchar su historia» abre el visor. El cierre del caso lo lista en sus desbloqueos y lleva a Recursos, donde se abre.

## 2026-10-09 · Anexo F3 · Conservar el cierre al volver de una ficha

- **Dato:** `RespuestaCompletarActividad.nuevos_desbloqueos`, recibido en `POST /acciones/completar-actividad`, vive en el estado del reproductor; no se conserva al desmontarlo para abrir una ficha.
- **Dónde se mostraría:** misma tarjeta de cierre al regresar desde la mochila.
- **Opciones:** conservar temporalmente el recibo y origen en un estado del dominio; abrir el visor sobre la tarjeta sin abandonar el reproductor; volver al mapa y consultar el historial de desbloqueos.
- **Si no se muestra:** las fichas permanecen obtenidas, pero regresar por el navegador no recupera el cierre con los desbloqueos de esa finalización. Reabrir la actividad completada muestra el modo repaso sin reutilizar recompensas anteriores.
- **Estado:** resuelto en F04d con la segunda opción: las fichas del cierre se abren con el visor de la mochila encima de la tarjeta, sin desmontar el reproductor; al cerrarlas, el cierre sigue con sus desbloqueos.
- **Verificación F5:** reproducido en navegador con shell real, en API contra SQLite desechable y en local. El historial vuelve a un cierre de repaso, sin el recibo original; las fichas obtenidas sí permanecen disponibles. No se implementa ninguna opción en esta fase de verificación.

## 2026-10-09 · Anexo F4 · Duración de las carreras

- **Dato:** falta duración en `ResultadoPublico.carreras_recomendadas[]` / `CarreraRecomendada`; petición `GET /cuentas/{c}/instrumentos/TEST-RIASEC/resultado`.
- **Dónde se mostraría:** tarjetas de carreras del resultado completo de intereses.
- **Opciones:** incorporar duración validada al contrato en su iteración; mantenerla solo en el detalle local que ya dispone de ese catálogo; omitirla del resultado completo.
- **Si no se muestra:** las tarjetas conservan nombre, familia, vías, favorito y plan, sin atribuir duración a la respuesta remota ni copiar años de demostración.
- **Estado:** resuelto por instrucción directa del usuario en la corrección de F4 del 9 de octubre: se muestra el texto literal de `careerCatalog.duration`, por `codigo`/`id`, en ambos modos. Se omite si no hay coincidencia. Se mantiene fuera del contrato; esta decisión sustituye la omisión inicial de la línea 331 del anexo. F06: el detalle de carrera del catálogo en api muestra la `duracion` del servidor; las tarjetas del resultado siguen con la de `careerCatalog`.

## 2026-10-09 · Anexo F4 · Descripciones de intereses como lista

- **Dato:** `ResultadoPublico.dimensiones[].descripcion`, en `GET /cuentas/{c}/instrumentos/TEST-RIASEC/resultado`, comienza con «Te atrae…» o «Te atraen…» y no encaja naturalmente dentro de la frase compuesta de la sección 2a.
- **Dónde se mostraría:** debajo del código de interés.
- **Opciones:** mostrar las tres descripciones completas como lista; definir fragmentos gramaticales adicionales en el contrato; aprobar una nueva redacción específica para la frase compuesta.
- **Si no se muestra:** se perdería la interpretación del código; concatenar los textos actuales produciría frases repetidas o incorrectas.
- **Estado:** resuelto por instrucción directa del usuario en la corrección de F4 del 9 de octubre: seis `fragmentosResumen` fijos aprobados componen la plantilla exacta del detalle, con negritas y orden del código. La lista de tres descripciones remotas permanece como respaldo si falta un fragmento. Filas, guía y resumen del libro conservan sus descripciones completas.

## 2026-10-09 · Anexo F4 · Ocupaciones sin contenido o sin código local

- **Dato:** `ResultadoPublico.coincidencias[].codigo` puede ser nulo; `titulo` y `codigo_onet` siguen llegando en `GET /cuentas/{c}/instrumentos/TEST-RIASEC/resultado`. Para algunas ocupaciones con código, `occupationDetails.whatTheyDo` solo contiene un marcador de contenido pendiente; no existe una descripción real en ese catálogo.
- **Dónde se mostraría:** descripción, letras, detalle y corazón de las tarjetas de ocupaciones afines.
- **Opciones:** completar el catálogo y la correspondencia por código; definir favoritos de ocupaciones sin correspondencia en una iteración posterior; conservar únicamente los datos y acciones que tienen soporte actual.
- **Si no se muestra:** una ocupación sin catálogo conserva título y ajuste remotos y permite filtrar sus carreras por O*NET; no muestra descripción, letras o enlace inventados. Sin código local tampoco se presenta el corazón, porque los favoritos actuales guardan ese identificador. Una ocupación con contenido pendiente omite el marcador provisional y conserva su detalle existente con sus candados actuales.
- **Estado:** resuelto en F06: en api, el corazón de las ocupaciones afines marca en el servidor cualquier coincidencia con `codigo` y su detalle se lee del catálogo del servidor; una coincidencia sin `codigo` sigue sin corazón ni enlace.


## 2026-10-09 · Corrección F4 · Íconos obtenidos en la Central de Casos

- **Dato:** las referencias incluyen una marca «Ícono obtenido en la Central de Casos» por ocupación. `ResultadoPublico.coincidencias[]`, en `GET /cuentas/{c}/instrumentos/TEST-RIASEC/resultado`, no entrega esa marca ni la relación caso/ocupación. `GET /cuentas/{c}/fichas` entrega `ContenidoEstado.codigo`, `titulo` y `estado`, sin esa relación; no permite deducirla.
- **Dónde se mostraría:** insignia bajo las letras de cada tarjeta de ocupación afín.
- **Opciones:** definir la relación y el estado de obtención en el contrato de casos en su iteración; aprobar un catálogo explícito de relaciones y leer su estado remoto; mantener la omisión actual.
- **Si no se muestra:** la tarjeta conserva afinidad, letras y acciones, sin afirmar que el estudiante obtuvo una recompensa que no está confirmada.
- **Estado:** resuelto en F04: `GET /cuentas/{c}/coleccion` entrega la ocupación y el caso; en api, el contador de obtenidos y la marca «Ícono obtenido» de las tarjetas del catálogo (también con el filtro de afines) y la etiqueta del detalle leen la colección.

## 2026-10-09 · Anexo F5 · Recarga directa del resultado API

- **Dato/estado:** durante la carga inicial de `GET /cuentas/{c}/instrumentos` y `GET /cuentas/{c}/instrumentos/TEST-RIASEC/resultado`, `useResultPage` todavía no dispone de una página válida; `HelenaResultView` redirige al libro. No falta un campo en el contrato.
- **Dónde ocurre:** al recargar o abrir directamente `/student/profile/helena/intereses` en modo API, incluso con la página revelada. Reproducido dos veces contra la SQLite desechable de F5; la entrada mediante el enlace del libro funciona.
- **Opciones:** diferenciar carga de acceso denegado en el hook y conservar la ruta hasta resolverla usando los componentes existentes; cargar los datos antes de evaluar la guarda de la ruta; mantener por ahora la entrada desde el libro.
- **Consecuencia actual:** no se pierde el resultado ni su revelación, pero la recarga abandona el detalle y exige volver a entrar desde el libro.
- **Estado:** resuelto en F03: la vista pide el libro al abrirse y, mientras lo lee (o con su error y «Reintentar»), no vuelve al libro.

## 2026-10-13 · B01 · Motivo de bloqueo de bloques y actividades

- **Dato:** `BloqueActividades.bloqueo` y `ActividadCuenta.bloqueo` (motivos con `mensaje` y `condiciones_faltantes`), `GET /cuentas/{c}/actividades`; también `detail.mensaje` de los 409.
- **Dónde se mostraría:** candado del mapa, lista de actividades del estudiante y del apoderado.
- **Opciones:** mostrar el `mensaje` junto al candado; mostrar además la condición que falta; conservar los textos actuales del front.
- **Si no se muestra:** lo bloqueado sigue con los textos locales del front; el servidor ya explica qué falta.
- **Estado:** resuelto en F00: el drawer y «Actividad bloqueada» del apoderado muestran `bloqueo[0].mensaje` (de la actividad o de su bloque), y la Ciudad cerrada lo explica Lumi desde el selector.

## 2026-10-13 · B01 · Requerida, duración y descripción de actividades

- **Dato:** `ActividadCuenta.requerida`, `duracion_estimada_min` y `descripcion`, `GET /cuentas/{c}/actividades`.
- **Dónde se mostraría:** tarjeta o punto de cada actividad en el mapa y en el panel.
- **Opciones:** etiqueta «opcional» y duración en la tarjeta; solo excluir opcionales del progreso del bloque; no mostrarlas todavía.
- **Si no se muestra:** las opcionales cuentan en el progreso del front aunque el servidor no las exige para cerrar el bloque.
- **Estado:** resuelto en F00: insignia «Opcional» en el drawer y « · opcional» en el panel; tiempo, descripción y etiqueta del servidor; el avance y los tramos cuentan solo las requeridas; las opcionales van fuera del camino.

## 2026-10-13 · B01 · Secciones del perfil

- **Dato:** `GET /cuentas/{c}/secciones` y `/secciones/{codigo}` (`SeccionEstado` con `estado` y `bloqueo`): DIARIO, CHECK_IN, CATALOGO, PLANES y FAMILIA del estudiante; CONVERSACIONES del apoderado. La lectura del diario responde 409 con DIARIO bloqueada.
- **Dónde se mostraría:** menú y perfil del estudiante (accesos a diario, check-in, catálogo, planes y familia) y portal del apoderado (conversaciones).
- **Opciones:** candado con mensaje en cada acceso; ocultar las secciones bloqueadas; mantener los accesos actuales hasta su lote F.
- **Si no se muestra:** el front no sabe qué secciones están abiertas; en modo api, escribir sin la sección abierta recibe 409.
- **Estado:** resuelto en F00 para el estudiante: candado y ayuda de Lumi en los accesos, y tarjeta de bloqueo por URL. CONVERSACIONES del apoderado queda para F08.

## 2026-10-13 · B01 · Fichas del apoderado

- **Dato:** `GET /cuentas/{c}/fichas` para un apoderado devuelve sus fichas (audiencia APODERADO); antes devolvía `[]`.
- **Dónde se mostraría:** portal del apoderado (no tiene vista de fichas).
- **Opciones:** una sección de recursos en el portal; mostrarlas dentro de cada actividad; no mostrarlas todavía.
- **Si no se muestra:** las fichas del apoderado se obtienen sin que se vean.
- **Estado:** resuelto en F08: chips por actividad en Mis actividades (A7) y el modal compartido sin favorito (A8), con el contenido pedido al abrir.
