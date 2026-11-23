# Pendientes de interfaz

Datos que el backend entrega (o que una vista necesita) y que la interfaz todavía no muestra. Los resuelve el usuario.

## 2026-11-14 · Ajuste panel-estudiantes · Nombres de las secciones en el plan completo de la orientadora

- **Dato:** el `nombre` de cada `seccion_tarjeta` («Por qué la elijo», «Qué tanto la conozco», «Cómo lo haría realidad», «Mis próximos pasos»), escrito con la voz del estudiante.
- **Dónde se mostraría:** los títulos de las cuatro tarjetas del plan completo en la pestaña Planes del perfil del estudiante.
- **Opciones:** títulos del front para la orientadora, como el boceto 10 («Por qué la elige», «Qué tanto la conoce», «Su realidad», «Sus pasos»); un nombre para la orientadora en `seccion_tarjeta`; dejar los de la base.
- **Si no se muestra:** la orientadora lee los nombres con la voz del estudiante.
- **Estado:** pendiente. Hoy se muestran los de la base, como pide la spec (§2, §8.2).

## 2026-11-07 · Ajuste vista del ítem de registro · Respuestas en la pantalla de fin

- **Dato:** lo que el estudiante eligió y escribió en cada ítem del registro que acaba de entregar (ya está en el registro del servidor).
- **Dónde se mostraría:** en la pantalla de fin del registro (`FinishScreen`), debajo de cada ítem: «Elegiste: …» y la respuesta, en el orden del ítem.
- **Opciones:** un resumen por ítem en la pantalla de fin; un enlace «Ver lo que respondiste» que abra la consulta; dejarlo solo en la consulta.
- **Si no se muestra:** las respuestas se leen al volver a abrir el registro (consulta), que ya usa la vista nueva.
- **Estado:** pendiente. El usuario decidió no cambiar la pantalla de fin en este ajuste.

## 2026-10-29 · F09 · Aviso a los autores cuando la orientadora elimina

- **Dato:** que la orientadora eliminó la entrevista o un comentario de un autor (la spec pide «un aviso genérico»).
- **Dónde se mostraría:** un aviso al entrar a Investigaciones o en el detalle de la entrevista propia.
- **Opciones:** un evento por autor que el backend exponga como aviso no visto (como los desbloqueos); una marca en Mis investigaciones al faltar una entrevista que estaba; no avisar.
- **Si no se muestra:** la entrevista eliminada desaparece de Mis investigaciones y su detalle responde 404; el comentario eliminado deja de verse.
- **Estado:** pendiente de decisión del usuario (el backend no guarda el aviso). Desde el ajuste panel-entrevistas-configuracion, la orientadora oculta la entrevista en lugar de eliminarla.

## 2026-10-28 · F07b · Planes fuera de los lotes F07

- **Dato:** lo que B11 dejó fuera y ningún lote F07 implementa: HU-049 (sugerir revisar los planes al completar un cuestionario, un caso o una comprobación, o al publicar una entrevista); lo que ve la orientadora de las tarjetas (HU-086, B14), incluido el aviso de misma familia (`avisos`), que desde el ajuste coherencia-bloque0 el estudiante ya no ve.
- **Dónde se mostraría:** el cierre de actividad o un aviso en Mis planes (HU-049).
- **Opciones:** HU-049 como aviso en el cierre de actividad con enlace a Mis planes, o como franja en Mis planes.
- **Si no se muestra:** el estudiante no recibe el recordatorio de revisar sus planes, y la orientadora no ve qué planes son de la misma familia.
- **Estado:** la vista de la orientadora quedó resuelta en el ajuste panel-estudiantes (pestaña Planes del perfil: de un vistazo y plan completo, sin el aviso de misma familia, que la spec no pidió). HU-049 sigue pendiente. «Es a propósito» se descartó en el ajuste coherencia-bloque0.

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

## 2026-10-27 · Ajuste catalogo-datos-reales · Planes en los detalles del catálogo

- **Dato:** desde F07a, los planes del front en api son los del servidor, pero la institución del plan se elige en REALIDAD (F07b); el perfil del estudiante en api no tiene departamento.
- **Dónde se mostraría:** «Usarla en un presupuesto» (debería abrir el plan con la institución precargada en REALIDAD), «En tus planes» del detalle de institución («Aquí estudiarías X en tu Plan A») y el chip inicial de «Dónde estudiarla» (el departamento del estudiante).
- **Hoy:** «Usarla en un presupuesto» lleva a Mis planes sin precarga; «En tus planes» no se pinta en la institución; «Dónde estudiarla» arranca en Lima. En api, «Armar un plan» crea el plan en el servidor (solo si la carrera es favorita) y abre su sección 1; «Ver mi tarjeta» abre el plan de esa carrera (F07a).
- **Opciones:** precargar la institución al llegar a REALIDAD (F07b); o mantenerlo así hasta la revisión estética.
- **Estado:** pendiente. Con F07b ya hecho, «Usarla en un presupuesto» sigue llevando a Mis planes sin precargar la institución y «Dónde estudiarla» sigue arrancando en Lima.

## 2026-10-25 · Ajuste pasaporte-perfil · Textos de condición en bloqueos y desbloqueos

- **Dato:** cada condición trae `texto` (lo que pide, redactado en el servidor) también en `bloqueo.condiciones_faltantes` de actividades y secciones y en `nuevos_desbloqueos[].condiciones`.
- **Dónde se mostraría:** el diálogo de Lumi ante algo cerrado, el drawer de una actividad bloqueada o el cierre de actividad.
- **Opciones:**
  1. Listar las condiciones faltantes con su texto bajo el mensaje de bloqueo.
  2. Dejarlo solo en el pasaporte (modal de insignia y siguiente título), como hoy.
- **Si no se muestra:** esas vistas siguen con el mensaje de bloqueo de la regla; el texto de cada condición solo se ve en el pasaporte y el perfil.
- **Estado:** pendiente; ninguna vista lo pinta fuera del pasaporte por decisión del usuario al aprobar el ajuste.

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

## 2026-10-22 · F04d · Video incrustado en el visor de recursos

- **Dato:** los recursos de tipo video del catálogo (`rec-video-mitos`, en `encuentro_mitos`) y los enlaces de YouTube.
- **Dónde se mostraría:** dentro del visor de la mochila (`VisorRecurso`), que desde F04d es la única presentación de un recurso.
- **Opciones:** incrustar el video en `ResourceContent` cuando el enlace es de YouTube, como hacía el drawer «Fichas para tu camino»; abrirlo solo con «Abrir fuente del recurso»; abrir tipos de recurso que hoy no se abren.
- **Si no se muestra:** el video se abre con «Abrir fuente del recurso» si tiene enlace; sin enlace (como `rec-video-mitos`), el visor muestra el aviso de «próximamente». Nada que se abría deja de abrirse.
- **Estado:** fuera de alcance de F04d por decisión del usuario. Ajustes Central (7): los testimonios sí incrustan su video de YouTube en el visor (ya lo hacía `ResourceContent` para enlaces de YouTube); los recursos de video del catálogo siguen igual.

## 2026-10-14 · B09 · Avance por temática

- **Dato:** `GET /cuentas/{c}/tematicas` (`codigo`, `nombre`, `completadas`, `total`, `porcentaje` de las cinco dimensiones del cuestionario de partida y llegada). El resto de B09 (diario, pregunta del día, amistad, check-in y afinidad) se conectó en F05.
- **Dónde se mostraría:** sin decidir; no tiene relación con la Ciudad.
- **Opciones:**
  1. Un bloque en el perfil o en el pasaporte con una barra por temática.
  2. Junto a la comparación partida–llegada del libro de Helena.
  3. Solo en el panel de la orientadora.
- **Si no se muestra:** el avance por temática solo existe en el servidor; el front no lo pide (no hay cliente).
- **Estado:** pendiente, sin vista por decisión del usuario (F05), para un lote posterior. HU-075 queda parcial (nivel y afinidad). El ajuste pasaporte-perfil rediseñó el perfil y el pasaporte sin incluirlo: sigue sin vista.

## 2026-10-28 · Ajuste inicio-apoderado · Comparación partida → llegada para el apoderado

- **Dato:** los dos resultados de partida y llegada del hijo (`GET /cuentas/{c}/familia/resultados`, uno por aplicación con el mismo instrumento), si el salón llegara a compartir ese cuestionario con la familia.
- **Dónde se mostraría:** la vista explicada del apoderado (`ParentQuestionnaireDetailView`), con el cambio de zona por dimensión.
- **Opciones:** reutilizar la comparación del libro de Helena en modo lectura; una tabla sencilla «partida / llegada» por dimensión; no mostrarla (solo el resultado más reciente).
- **Si no se muestra:** el inicio y la vista explicada usan el resultado de llegada si existe y, si no, el de partida. Hoy ningún salón de `ruta` lo comparte (mide también la presión de la familia).
- **Estado:** pendiente.

## 2026-11-01 · Ajuste carga-instrumentos · Puntaje visual en la vista de la orientadora

- **Dato:** cada dimensión del resultado trae `puntaje_visual` (0–100 entero), `puntaje` y `puntaje_maximo`. La spec pide que la orientadora vea el 0–100 como dato principal y «27 de 40» como secundario.
- **Dónde se mostraría:** el detalle de cuestionario de la orientadora (`QuestionnaireBars` / `QuestionnaireDetailContent`), que en api ya existe desde el ajuste panel-estudiantes, pero no usa `puntaje_visual`, `puntaje` ni `puntaje_maximo`.
- **Opciones:** el número 0–100 junto a la barra con «27 de 40» debajo en gris; o el 0–100 en la barra y «27 de 40» en una nota al pie de la tarjeta.
- **Estado:** pendiente.

## 2026-11-11 · Ajuste registros llm (lote 2) · Contratos nuevos de registro

- **Dato:** el backend cambió los contratos de registro y el front actual no funciona contra la rama `ajuste/registros-llm` (el texto del lote 2 lo deja fuera de alcance). `items-registro` trae `dialogo`, `pregunta_eleccion`, `pregunta_texto`, `arranque`, `con_llm` y, en la elección, `etiqueta_otra` y las propias con `pregunta`, `arranque` y `sin_llm` (sale `consigna` y `sin_seguimiento`). El registro trae por ítem `estado`, `opciones_elegidas` (`{codigo, texto}`) y `texto` (salen la conversación, `items_por_ampliar` e `items_abiertos`). `entregar` lleva los ítems en el cuerpo; borrador, seguimiento, edición y continuar sin responder responden 501. Las fuentes PIEZAS_* y la «Otra» múltiple (`OTRA-1`…) son nuevas. Los fixtures de `tests/fixtures/servidor` no se regeneraron.
- **Dónde se ve:** las vistas de registro del Camino y la Ciudad (diálogos, mensajes de cierre, diapositivas, piezas y ecos, podio con varias «Otra»), y los JSON de `contenidos/plataforma/` de los 19 registros (`scripts/verificar_contenido_front.py` reporta sus diferencias). El check-in de b5-1 llega como número («2 de 5») sin etiqueta.
- **Estado:** resuelto en lo que es contrato y flujo (ajuste front de registros, lote 1): el front usa la lectura nueva del registro y las acciones ítem por ítem, con fixtures regenerados, y los 19 JSON pasan `verificar_contenido_front.py`. La presentación quedó resuelta en el lote 2 del front (selector de piezas, varias «Otra» en lista y podio, formas de eco; el check-in de b5-1 como eco de elección «2 de 5» con su origen «Tu primera señal»). Sigue pendiente la apertura y el cierre que el lote 2 dejó para el lote 3 (las respuestas en la pantalla de fin tienen su propia entrada).
