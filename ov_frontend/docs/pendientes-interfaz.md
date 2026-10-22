# Pendientes de interfaz

Datos que el backend entrega (o que una vista necesita) y que la interfaz todavía no muestra. Los resuelve el usuario.

## 2026-10-22 · F04d · Video incrustado en el visor de recursos

- **Dato:** los recursos de tipo video del catálogo (`rec-video-mitos`, en `encuentro_mitos`) y los enlaces de YouTube.
- **Dónde se mostraría:** dentro del visor de la mochila (`VisorRecurso`), que desde F04d es la única presentación de un recurso.
- **Opciones:** incrustar el video en `ResourceContent` cuando el enlace es de YouTube, como hacía el drawer «Fichas para tu camino»; abrirlo solo con «Abrir fuente del recurso»; abrir tipos de recurso que hoy no se abren.
- **Si no se muestra:** el video se abre con «Abrir fuente del recurso» si tiene enlace; sin enlace (como `rec-video-mitos`), el visor muestra el aviso de «próximamente». Nada que se abría deja de abrirse.
- **Estado:** fuera de alcance de F04d por decisión del usuario.

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
- **Estado:** revisar en F08.

## 2026-10-21 · F00 · Carta del apoderado (`t_apo_carta`)

- **Dato:** `t-apo-carta` en `GET /cuentas/{c}/actividades` del apoderado (bloque FAMILIA), con su `bloqueo` mientras falta `t-apo-1`.
- **Dónde se mostraría:** lista «Mis actividades» del portal y su reproductor; en F08 se completa escribiendo la carta.
- **Opciones:** conectar la escritura de la carta (B12) en F08; mostrarla como informativa hasta entonces; ocultarla.
- **Si no se muestra:** F00 la lista con `t_apo_carta.json` sin nodos (`DATO DE PRUEBA`). Bloqueada, la tarjeta dice «Bloqueada» y la entrada por URL muestra el mensaje del servidor. Abierta, el portal la sigue tratando como no disponible y no se puede iniciar: así FAMILIA no se cierra sin la carta.
- **Estado:** pendiente de F08.

## 2026-10-19 · B17 · Hijos y salones de la sesión

- **Dato:** `GET /sesion` entrega `hijos` (apoderado: `codigo`, `nombre`, `salon` y `parentesco` de sus vínculos activos) y `salones` (orientadora: `codigo`, `nombre` y `es_principal`). Llegan a `store/accesoStore.ts` (`datosSesion()`), pero ninguna vista los pinta.
- **Dónde se mostraría:** la lista de hijos del portal del apoderado (hoy son datos de demostración en `features/parent/data/parentPortal.ts`) y el selector de salón de la orientadora (hoy `ov.staff.selected-salon.v1` sobre salones de demostración).
- **Opciones:**
  - conectar la lista de hijos en el lote F de familia y los salones en B14 y B16;
  - mostrar solo el nombre del hijo en la cabecera del portal del apoderado;
  - no mostrarlos hasta tener las rutas propias de la orientadora.
- **Si no se muestra:** el portal del apoderado sigue mostrando hijos de demostración en modo `api`, aunque sus actividades sí son de la cuenta con sesión.
- **Estado:** en parte: el portal del apoderado ya muestra al hijo desde `familia` (F00); `hijos` de la sesión y los salones de la orientadora siguen sin vista (F08, F10).

## 2026-10-15 · B12 · Familia: conversaciones, cartas y ruta del apoderado

- **Dato:**
  - `GET /cuentas/{c}/conversaciones` (estudiante y apoderado): `carta_pendiente`, `completadas`, `total`, `carta_propia`, `carta_recibida` (solo con todas conversadas) y, por conversación disponible, `codigo`, `titulo`, `pregunta` de su rol, `estado` (`sin_responder`, `esperando_al_otro`, `te_toca`, `por_conversar`, `conversada`), `mi_respuesta`, `conversada_en` y, con las dos respuestas, `respuesta_otro`, `preguntas_guia` y `mensaje_diferencias`;
  - `POST /acciones/responder-conversacion` (nueva) y `completar-conversacion` (exige las dos respuestas; el evento va solo al estudiante); `escribir-carta` exige ahora la sección de cada rol y se cierra al entregarse;
  - `GET /cuentas/{c}/familia` (apoderado): `avance`, `diploma {obtenido, obtenido_en}` y `estudiante {codigo, nombre, avance, nivel_actual}`;
  - `GET /cuentas/{c}/familia/resultados` (apoderado con su ruta completa): resultados vigentes del hijo en los cuestionarios visibles al apoderado.
- **Dónde se mostraría:** sección Familia del estudiante (carta y conversaciones), portal del apoderado (conversaciones, carta, diploma, avance y resultados del hijo). Hoy el diploma del apoderado se calcula en el front con el estado remoto de sus actividades.
- **Opciones:** conectar familia en su lote F con estas consultas; mientras tanto, el portal del apoderado sigue con sus actividades y su diploma actuales.
- **Si no se muestra:** en modo `api` las conversaciones, las cartas y los resultados visibles al apoderado existen solo en el servidor. El aviso al apoderado cuando el hijo habilita una conversación (HU-067) queda fuera de B12.
- **Estado:** pendiente del lote F de familia; no se toca la interfaz en B12.

## 2026-10-15 · B11 · Planes de carrera

- **Dato:**
  - `GET /cuentas/{c}/planes`: hasta tres tarjetas por prioridad (A, B, C) con sus cuatro secciones (POR_QUE, CONOCIMIENTO, REALIDAD, PASOS), el estado de cada una (`BLOQUEADA`, `POR_EMPEZAR`, `EN_PROCESO`, `LISTA`, con el motivo de bloqueo que nombra la actividad que la abre), `lista_para_comparar`, dudas, gastos con `totales_por_frecuencia`, `total_primer_anio` y `total_carrera`, financiamiento, complicaciones, sugerencias, pasos, medidores (1–3), `avisos` de misma familia, `opcion_inicial` y `opciones` (las listas de la tarjeta);
  - `POST /acciones/planes/crear`, `guardar-seccion`, `medidores`, `paso-hecho`, `ordenar` y `eliminar`. Dudas, complicaciones, sugerencias y pasos se identifican por `numero` dentro de la tarjeta;
  - `gestion` (PUBLICA, PRIVADA o nula) en `InstitucionResumen` del catálogo.
  - referencias nuevas en `GET /cuentas/{c}/actividades/{a}/referencias`: PLANES (carreras por prioridad), PLAN (plan A: `texto` con la carrera, `cita` con el relato y `opciones` con los motivos), PASOS_PLAN_A y OPCION_INICIAL. `cita` es un campo nuevo de la referencia que el front no consume todavía.
- **Precarga de gastos (responsabilidad del front):** el backend no inserta gastos ni devuelve una propuesta. Con `opciones.rubros` (`frecuencia_recomendada`, `monto_referencia`, `cero_si_publica`, `solo_si_camino_prepara`), `opciones.caminos` (`incluye_preparacion`) y la `gestion` de la institución elegida, el front arma en vivo los gastos precargados: Pensión en 0 si la institución es pública (con su monto de referencia si no tiene gestión), Preparación solo si el camino incluye prepararse, y Alimentación y Vivienda a mano. Al guardar REALIDAD envía los gastos que el estudiante dejó.
- **Dónde se mostraría:** la sección Planes del estudiante (tarjeta por secciones, medidores, orden A/B/C, aviso de misma familia), el detalle de institución del catálogo (pública o privada) y las actividades 4.5 y 5.1 (`t-comparar` y `t-proyecto` en `ruta`), que citan los planes, el relato del plan A, sus pasos y la opción inicial.
- **Opciones:** conectar Planes en su lote F con la tarjeta v4; mantener los planes locales actuales (`DecisionSheet`), que no coinciden con este modelo, hasta diseñar la vista.
- **Si no se muestra:** en modo `api` los planes, la opción inicial y los requisitos de `t-comparar` y `t-proyecto` existen solo en el servidor.
- **Estado:** pendiente del lote F de planes; no se toca la interfaz en B11.

## 2026-10-14 · B09 · Diario, pregunta del día, check-in y avance

- **Dato:**
  - `entradas_desbloqueadas` en la respuesta de la acción que deja una pregunta en el diario (`codigo`, `nombre`, `personalizada`, `texto`; nulo si está por redactar) y `POST /acciones/diario/abrir-pregunta`, que la redacta una vez (`codigo`, `nombre`, `texto`, `respondida`);
  - `POST /acciones/diario/pregunta-del-dia` (`nombre`, `texto`, `fecha`, `respondida`) y `escribir-entrada` con `del_dia`;
  - `escribir-entrada` cambió: `titulo` opcional y `pregunta` o `del_dia` (sin `origen`); `POST /acciones/editar-entrada` y `POST /acciones/borrar-entrada` por `numero`;
  - `GET /cuentas/{c}/diario/entradas` (`titulo_mostrado`, «Entrada libre N»), `GET /cuentas/{c}/diario/amistad` (`puntos`, `nivel`, `siguiente_en`) y `GET /cuentas/{c}/diario/preguntas` con `nombre`, `personalizada` y `redactada`;
  - `GET /cuentas/{c}/check-ins` (`dias_registrados` y la serie por fecha);
  - `GET /cuentas/{c}/tematicas` (avance por temática) y `afinidad` en `logros`.
- **Dónde se mostraría:**
  - en la pantalla de cierre de una actividad: «Lumi te dejó una pregunta en tu diario: {nombre}» (no existe);
  - al abrir una pregunta personalizada: «Lumi está escribiendo…» mientras llega el texto (no existe);
  - en el diario: títulos de las entradas, editar y borrar, la pregunta del día y la amistad con Lumi;
  - en el perfil o el pasaporte: la evolución de check-ins, el avance por temática y la afinidad.
- **Opciones:**
  - conectar el diario en su lote F, agregando los tipos a `servidor.ts` y `services/api/diario.ts`, y crear la pantalla de cierre y el estado «escribiendo» cuando la spec los autorice;
  - mostrar solo lo que ya tiene vista (lista de preguntas y entradas) y dejar amistad, pregunta del día, evolución y afinidad para una spec de perfil;
  - mantener el diario local hasta diseñar las vistas nuevas.
- **Si no se muestra:** en modo `api` el diario no ve las preguntas personalizadas ni la del día, la amistad no sube en pantalla y la evolución de check-ins y el avance por temática solo existen en el servidor.
- **Estado:** pendiente de los lotes F; no se toca la interfaz en B09.

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
- **Estado:** pendiente del lote F de instrumentos; no se toca la interfaz en B07.

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
- **Estado:** pendiente del lote F de instrumentos; no se toca la interfaz en B06.

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
- **Estado:** resuelto en F02. «Ver o modificar mis respuestas» abre el mismo reproductor solo con las consignas, precargado con la consolidada, la elección (sin poder cambiarla) y la pista de los por ampliar; cambiar un texto y «Entregar cambios» edita con el seguimiento de F01.

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
- **Estado:** resuelto en parte en F00: en api, el resumen usa `GET /cuentas/{c}/familia` (nombre, avance del hijo y avance propio); los resultados del hijo quedan para F08.

## 2026-10-09 · AP-F3 · Evento de bloque FAMILIA completado

- **Dato:** `COMPLETA_BLOQUE FAMILIA` en `RespuestaCompletarActividad.eventos_registrados` al terminar la segunda actividad.
- **Dónde se mostraría:** confirmación del recorrido o diploma; el evento no tiene una vista propia.
- **Opciones:** mantener el diploma derivado de la ruta completa; mostrar el evento en un historial futuro; definir una confirmación específica del bloque.
- **Si no se muestra:** el backend registra el evento y el diploma existente se muestra desde `route.complete`, calculado con las actividades completadas del servidor.
- **Estado:** pendiente de una presentación propia del evento; se conserva el diploma actual sin nuevos elementos.

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
- **Estado:** pendiente. B2 solo registra el dato; no implementa ninguna opción.

## 2026-10-08 · B2 · Disponibilidad de conversaciones del servidor

- **Dato:** `ConversacionesEstado.estado`, en `GET /cuentas/{c}/conversaciones`.
- **Dónde se mostraría:** acceso a conversaciones familiares del portal del estudiante; todavía no hay una vista en modo API que consuma este estado.
- **Opciones:**
  1. Conectar la disponibilidad al acceso de conversaciones en la iteración 4.
  2. Mostrarla al abrir el detalle de una conversación.
  3. Mantener el acceso de próxima iteración hasta integrar lectura y acciones.
- **Si no se muestra:** el estado sigue disponible en el backend; el front no solicita la consulta y conserva su presentación actual de próxima iteración.
- **Estado:** pendiente. B2 solo registra el dato; no implementa ninguna opción.

## 2026-10-08 · F4 · Señal de hoy todavía local

- **Dato:** el front conserva la señal en su almacenamiento local; existe `POST /acciones/check-in`, pero falta una consulta de lectura para conectarla como fuente única (D9 y §11).
- **Dónde se mostraría:** panel del mapa, registro de señal y evolución del diario, con sus elementos actuales.
- **Opciones:**
  1. Integrar lectura y escritura juntas en la iteración 3, como está previsto.
  2. Definir antes el contrato de consulta manteniendo la integración para esa iteración.
  3. Conservar explícitamente el comportamiento local hasta completar ambos extremos.
- **Si no se muestra:** la señal del panel sigue siendo local incluso en modo API; el recorrido de F4 no la envía al servidor y no mezcla sus datos con disponibilidad o progreso.
- **Estado:** pendiente de la iteración 3; no se modifica interfaz ni almacenamiento.

## 2026-10-09 · Anexo F3 · Persona, rol, cita y apertura de testimonios

- **Dato:** `RespuestaAccion.nuevos_desbloqueos[].objetivo.codigo` y `.nombre` cuando `tipo_objetivo = TESTIMONIO`, en `POST /acciones/completar-actividad`. El recibo no contiene persona, rol ni cita; `Recurso` de `catalog.recursos` tampoco tiene persona/rol. El contenido puede faltar. `GET /cuentas/{c}/testimonios` entrega `ContenidoEstado[].codigo`, `titulo` y `estado`, pero su integración no corresponde a esta iteración (pendiente B2 anterior).
- **Dónde se mostraría:** tarjeta de testimonio dentro de «Nuevo en tu mochila» y visor seleccionado mediante `?kind=testimonial&ficha={codigo}`.
- **Opciones:** completar el catálogo narrativo con metadatos y contenido para esos códigos; definir una respuesta de lectura de testimonios con persona/rol/cita en su iteración; conservar solo el nombre en el cierre hasta disponer de contenido e integración remota.
- **Si no se muestra:** el cierre presenta el nombre real y su enlace, sin atribuciones o citas inventadas. La selección local funciona cuando el testimonio existe, con sus candados actuales. En API la mochila conserva solo las fichas remotas de esta iteración: un testimonio sin integración no abre un visor de contenido, aunque su enlace ya incluye el código y filtro correctos.
- **Estado:** resuelto en F04: en api la tarjeta muestra título, descripción y «Ver testimonio» (enlace en otra pestaña); persona, rol y cita no se muestran porque el backend no los tiene. El enlace del cierre abre la pestaña de testimonios.

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
- **Estado:** resuelto por instrucción directa del usuario en la corrección de F4 del 9 de octubre: se muestra el texto literal de `careerCatalog.duration`, por `codigo`/`id`, en ambos modos. Se omite si no hay coincidencia. Se mantiene fuera del contrato; esta decisión sustituye la omisión inicial de la línea 331 del anexo.

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
- **Estado:** faltantes registrados; no se inventa correspondencia ni contenido. El fixture actual tiene códigos locales para sus diez coincidencias. La ausencia de código queda cubierta con un escenario DATO DE PRUEBA.


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
- **Estado:** pendiente de corrección, detectado en F5. No se elimina la guarda ni se agrega un estado visual durante esta fase de verificación. El scroll del detalle funciona entrando desde el libro.

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
- **Estado:** pendiente (lote F).
