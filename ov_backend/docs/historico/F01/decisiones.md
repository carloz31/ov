# Decisiones de la spec en curso

<!-- Spec en curso: F01 (docs/specs/F01.md). -->

- **Visibilidad fija por tipo:** todo registro lo ven el estudiante y su orientadora; el diario es privado. No hay campo de visibilidad en el ítem ni en el JSON: en api, la consigna de registro muestra siempre «Visible para ti y tu orientadora. Se guarda en tu cuenta.» (decisión del usuario; no es lote M).
- **Fixtures de seguimiento con `t-valores` de est-ana:** el exportador recorre `t-valores` (elección ordenada, `[vaga]`, una respuesta y una omisión) en lugar de un recorrido nuevo de est-luis en `t-expectativas`: est-luis no tiene token en el exportador y `t-valores` ya se respondía en el mismo punto. Los demás fixtures no cambian.
- **`item` sin validación propia:** `lib/activities/validation.ts` no valida campos de nodos; el cruce consigna ↔ ítem lo hace `registroServidor` al abrir (sin él, no hay actividad que abrir).
- **Prueba del exportador adaptada (autorizada por la spec):** `NOMBRES` de `test_exportar_fixtures_front.py` suma los seis fixtures de `t-valores` y se validan sus contratos.
- **`FollowUp` no se toca:** las pruebas locales leen su árbol superficial; extraer su hilo a otro componente cambiaría ese árbol. `RegistroSeguimiento` compone los mismos `TypedQuestion`, `InlineDialogue` y clases `sx-followup-*`.
- **Prueba del mapa adaptada:** «un contenido sin nodos ubica el punto…» usaba `t-expectativas`, que ahora tiene nodos (lo pide la spec); pasa a `t-lee-cuestionario`, que sigue sin nodos, y comprueba que `t-expectativas` ya se abre.
- **En api, el registro termina en su última consigna:** «Entregar» está en ella y, tras el seguimiento, «Continuar» lleva al fin; los nodos que siguieran a la última consigna no se muestran. Por eso `t_expectativas.json` no tiene diálogo de cierre (el plan lo mencionaba).
- **Solo el Camino abre registros del servidor en F01:** los registros de la Ciudad (`t-contraste`) y `t-eco` no tienen contenido hasta su lote; `CiudadScreen` no cambia.

## Ajuste al cierre: botón «Anterior» en el reproductor

- **Excepción al modo local congelado (aprobada por el usuario):** «Anterior» aplica también con `VITE_DATOS=local`, porque es navegación básica que el estudiante necesita en ambos modos. En `tests/local/` solo se agregó `actividades-anterior.test.mjs`; las demás no cambiaron.
- **Sin ramificaciones reales:** un nodo `eleccion` solo agrega diálogos de reacción y sigue con el mismo nodo siguiente, así que el camino recorrido es el orden de los nodos y el paso anterior es `nodes[index - 1]`, también al retomar. No se implementó descartar el historial de una rama: ninguna actividad ramifica hacia consignas o preguntas.
- **Diálogos:** `DialogueBox` muestra un texto por nodo; «Anterior» va al nodo anterior y lo muestra completo, sin máquina de escribir.
- **Registros en api:** «Anterior» guarda lo escrito como borrador sin validar (`guardar-borrador`, `posicion` = nodo al que se vuelve, aunque sea el diálogo de entrada; una «Otra» vacía se omite). En local, lo escrito ya queda en `journey.drafts`. Sin «Anterior» con el registro entregado.
- **Cuestionarios:** sin ajustes al backend: `responder-items` ya reemplaza una respuesta guardada. Sin «Anterior» en revisión o completados.
- **Sin «Anterior» junto a una pregunta con retroalimentación** (ni en ella ni en el paso que la sigue), **ni en batallas, ni en el portal del apoderado**: anotado en `pendientes-interfaz.md`.

## Ajuste al cierre: pie de paso y casos de retroceso

- **Pie único:** el par «Anterior» (secundario) + principal va alineado a la derecha en informativas, registros y cuestionarios (`.sx-step-actions`/`.sx-step-footer`). En el cuestionario, «Mantener mi respuesta y continuar» pasa a ser el principal (índigo). El pie de las informativas pierde la franja oscura: mismo fondo de la tarjeta y separador fino.
- **Móvil:** el par en una fila 1fr / 2fr con el principal siempre en la segunda columna; si «Anterior» no cabe (contenedor de 320 px o menos), queda solo la flecha, con `aria-label="Anterior"`.
- **Foco:** al cargar cada paso (y cada reacción) el foco va al botón principal del paso, nunca a «Anterior».
- **Registros entregados en local:** sin «Anterior» en los pasos posteriores a la última consigna. En api, tras la entrega, el reproductor muestra el seguimiento y luego el fin, sin «Anterior».
- **Conservación del estado:** sin guardado automático. En api, cada «Guardar y continuar» y cada «Anterior» guardan el borrador y el reproductor lo refleja; al volver, el podio y la encrucijada se muestran como quedaron. En local, lo escrito sigue en los borradores del navegador. Los cuestionarios reemplazan la respuesta, así que el resultado usa la última.
- **Sin confirmación de cambio de rama:** no hay ramas (las elecciones solo agregan reacciones), así que no hay una rama abandonada con datos que confirmar.
- **Accesibilidad:** las fichas del podio llevan `aria-label` con su nombre, como las tarjetas de la encrucijada.

## Ajuste al cierre: preguntas de cuestionario con avance automático

- **Avance:** tocar una opción la marca y avanza tras 275 ms; mientras tanto se ignoran otros toques (sin doble respuesta). Tocar la opción ya guardada avanza sin volver a responder (sin `responder-items`).
- **Pregunta ya respondida:** la opción guardada se ve marcada y aparece «Siguiente →» como principal. Reemplaza a «Mantener mi respuesta y continuar»; en revisión sigue «Continuar la revisión».
- **Última pregunta:** se comporta como las demás (se marca y avanza sola). El usuario descartó un botón de cierre propio («Ver resultado»/«Terminar cuestionario»): la revelación del resultado se hará desde otro lado.
- **«Anterior»:** solo, sin principal, va a la izquierda del pie. No aparece en la primera pregunta de un cuestionario, aunque la preceda un diálogo.
- **Foco:** al cargar una pregunta, va a la opción guardada o a la primera.

## Ajuste al cierre: ítems por ampliar en el cierre del registro y en el drawer

- **Cierre del registro:** un solo bloque de Lumi («¡Listo! Tu registro quedó guardado.» y, si hay ítems por ampliar, «Me quedé con ganas de saber un poco más de {una cosa | N cosas} que escribiste. Puedes volver a {ella | ellas}…»), una lista con el ícono (con elección o solo texto), el nombre y la pista de cada ítem, y «Continuar →» a ancho completo. Reemplaza «Tus respuestas quedaron entregadas.» y «Podrías profundizar en…».
- **Drawer:** en un registro completado con ítems por ampliar, un bloque con borde fino bajo el chip de tipo: Lumi con el mismo texto (sin la invitación a volver) y los nombres de los ítems, sin pistas. «Completada» y los botones no cambian. Llega por `renderPorAmpliar` (como `renderJournal`) y consulta `GET /cuentas/{c}/actividades/{a}/registro` al abrirse, solo en api.
- **Compartido** (`features/activities/lib/porAmpliar.ts` y `BloquePorAmpliar`): el texto de Lumi con singular y plural, el nombre humano del ítem (etiqueta corta `nombre`; si no hay, la consigna recortada; nunca el código) y la pista con su respaldo («Cuéntame un ejemplo o un poco más de por qué.»).
- **Sin «Ampliar →» por ahora** (decisión del usuario): la edición de un ítem entregado llega con F02. Anotado en `pendientes-interfaz.md`.
- **Datos, sin cambios al backend:** la consulta del registro ya entrega `items_por_ampliar` con el registro cerrado, e `items-registro` da la etiqueta corta (`nombre`) de todos los ítems de `ruta`. No hace falta extender ningún endpoint ni agregar campos.
