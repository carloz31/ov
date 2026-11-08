# Decisiones de la spec en curso

## Ajuste registros

- `b1-7-freno` usa la lista común `DIFICULTADES` de la tarjeta, ampliada con `NO_INGRESAR`, `CAMBIAR_OPINION`, `TIEMPO` y `SALUD` sin quitar ni renombrar opciones; las cuatro nuevas también aparecen en «Lo que podría complicarlo» de la tarjeta (aceptado por el usuario).
- Una repregunta por ítem por defecto (`seguimiento.max_repreguntas`, 1; `b5-1-decision` = 2); el presupuesto del intento sale de `actividad.maximo_seguimientos` (defecto 2; solo `b5-3` = 1). Las pruebas de `ruta` que suponían dos repreguntas seguidas al mismo ítem se adaptan (autorizado por el usuario).
- La consolidada por LLM se conserva: `consolidada` opcional solo en la llamada de seguimiento, como en B03/B04.
- `DATOS_CARRERA_PLAN_A` toma el salario de `IngresoFamilia` (familia y tipo, sin ubicación): el eco lo presenta como «referencia de carreras de esta familia», no como el salario de la carrera. Fuente y año se omiten: el catálogo no los guarda.
- La ELECCION de un ítem sensible sí se cita; solo su TEXTO pasa a SIN_DATO.
- `LUMI_SENSIBLE` vive en la tabla `texto_fijo`, cargada desde `fijos.TEXTOS_FIJOS`, no en código.
- La clasificación conserva ADECUADA como «desarrollada» y agrega ABIERTA; NO_EVALUADA sigue para el respaldo.
- `planes_listos_para_comparar` recibe `secciones`; `contenido` lo usa como `planes_con_por_que` y `planes_creados` (`functools.partial`), sin cambiar `parametro_evaluador`.
- Las cartas C1–C6 son preguntas de diario desbloqueables personalizadas; `pregunta_diario.respaldo_si` (solo C2, nulo en el resto) da el texto fijo sin LLM.
- Modelo (0049): `item_registro` gana `fuente_opciones`, `referencia_opciones_id`, `opciones_propias`, `premarcar_si` y `seguimiento`; `respuesta_registro`, `sensible` y `requiere_atencion`; `evaluacion_respuesta`, `sensible` y `falta`; `actividad.maximo_seguimientos`; `pregunta_diario.respaldo_si`; tabla `texto_fijo`; ABIERTA en la clasificación y en el estado de referencia; tres tipos de referencia. No se agregó `abierto` a la evaluación: la clasificación ABIERTA ya lo registra.
- El contrato v5 no distingue criterios: si un ítem no cumple, sus `criterios_faltantes` (y los del turno) son todos los del ítem. Las pruebas unitarias del contrato anterior se adaptaron al nuevo.
- `items_por_ampliar.pista` sigue siendo la pregunta vigente; se agrega `falta` y el front muestra `falta` o, si no hay, el `nombre` (así no cambian las pruebas de `ruta`).
- Un ítem sin campos de seguimiento (`ruta`) conserva su comportamiento: repregunta de respaldo genérica y, ante una pregunta inválida, la del primer criterio.
- El aviso `LUMI_SENSIBLE` va al final de la conversación de la respuesta sensible (`{tipo: 'aviso'}`); `sensible` no se expone. `items_abiertos` llega solo con el registro cerrado, como `items_por_ampliar`.
- Los ecos de ítem de `ecos_llm` usan, en la entrega, el texto entregado del ítem anterior; en el seguimiento y la edición, su consolidada (nunca la de uno sensible).
- `t-referencia` tiene 3 ítems (invariante de `ruta`): el premarcado va en el ítem que retoma. `ruta` gana `RESPALDOS_DIARIO` para `t-diario-personal` (DATO DE PRUEBA).
- Toda pregunta personalizada desbloqueable se redacta como carta (`PROMPT_CARTA_V1`, `ContextoCarta`, misma forma de datos al LLM); la pregunta del día conserva el prompt v1.
- El downgrade de 0049 se niega si hay datos de los registros definitivos (como las migraciones anteriores con su contenido); `datos.cargar --vaciar` deja sin elección a los ítems que eligen de una referencia para romper el ciclo.
- Las opciones de un ítem con fuente REFERENCIA no salen en `items-registro` (no es por cuenta): el front las lee de las referencias de la actividad.
- Los tipos del registro del front pasan a `types/servidorRegistro.ts` (límite de 400 líneas de `servidor.ts`).
- `t-val-orden` (ruta) declara `max_repreguntas: 2` sin guía: conserva su flujo de dos repreguntas (exportador y fixtures del front sin cambios) y prueba la mecánica de `b5-1-decision`.
- `contenido` (F2, corregido con `registros-definicion.md` v2.3): las descripciones cortas de los 19 registros, la consigna de cada ítem (columna «Consigna funcional») y el texto fijo de las seis cartas (§8) son los del documento. En el backend, `{carrera}` (b3-4-dato) y `{opción inicial}` (b5-3-inicial) quedan neutros («tu carrera», «una opción»): el dato lo muestra el eco del front. La frase «una parte que hoy no te respalda no decide por ti…» de b4-1 va en el JSON, no en la consigna de `b4-1-menos`.
- R-b4-5 lleva además `CREA_PLAN`: con `planes_creados` crear el segundo plan debe reevaluarla (si no, quedaría cerrada hasta otra edición).
- b4-5 declara también la referencia PLAN (`b4-5-ref-plan`): es el eco de `b4-5-debil` para el LLM y §2.4 no la listaba.
- Las opciones propias entre llaves de §2.3 (las de «ninguno» con pregunta propia o `∅`) son exclusivas; las demás, no. Las listas de `h1` y `h2` (dimensiones de sus instrumentos) no admiten «otra»: son conjuntos cerrados (principio 6 del documento; decisión del usuario).
- El contexto de cada carta lee los TEXTO de los ítems de §2.6 (más la ELECCION de `b1-3-voz` y PLAN, PLANES u OPCION_INICIAL según la tabla).
- `soporte_ruta.eleccion_minima` toma también las opciones de la referencia y las propias (para responder registros desde las pruebas).
- F3 (front): las opciones de cada ítem se arman al abrir el registro (`itemsConOpciones`: lista o referencia en vivo, más las propias), así las vistas de elección siguen leyendo `eleccion.opciones`; las exclusivas y preguntas propias del servidor se suman a las del JSON.
- Una opción con `criterio: null` deja el texto opcional en el front y en el backend (entrega y edición la aceptan sin texto).
- `b3-4` y `b5-3` declaran PLANES: el destino «tarjeta del Plan A» necesita el código de la carrera.
- El aviso sensible se muestra una vez por ítem y texto durante el seguimiento (los que ya estaban al abrir no se repiten). «Lo dejaste abierto: …» va bajo el bloque de cierre; en la consulta, la burbuja de Lumi lo recuerda.
- Destinos: claves de ruta del front (`familia`, `catalogo`, `catalogo-familia`, `plan-a-dudas`…) resueltas en `features/activities/lib/destinoRegistro.ts`; el botón «Ir a …» va a la izquierda de «Volver al mapa».
- JSON: se conserva toda la apertura (diálogos, diapositivas, elecciones) y se reemplazan las consignas; los ecos de apertura van en el último diálogo antes de las consignas; la frase de b4-1 («una parte que hoy no te respalda…») es un diálogo antes de sus consignas; el `mensajeFin` de los seis registros con carta no la anuncia: la pantalla de fin ya muestra la fila «Lumi te dejó una carta en tu buzón» y repetirlo sobraba (decisión del usuario tras la prueba en el navegador; se aparta de §3).
- F4: los ayudantes del recorrido de `contenido` pasan a `tests/soporte/soporte_contenido.py`, que comparten `escenarios/contenido` y la carpeta nueva `tests/integration/registros/`. Los casos de la tabla §4.6 que dependen solo de la mecánica (contrato, `ecos_llm`, respaldo, edición, referencias en vivo, instrucciones en el texto) se prueban en `ruta` (`registro/test_registro_referencia.py`); en `contenido` se prueban los que dependen de sus ítems (salidas, abierto, sensible fuera de su actividad, reglas de planes y cartas).
- La coherencia front–back corre también como prueba (`datos/test_carga_registros_definitivos.py`, con `verificar_contenido_front.verificar`).
- La colección de evaluación es `scripts/evaluar_registros.py` (CSV con clasificación, repregunta, `falta` y `sensible`); con `EVALUADOR=gemini` llama a la API real y solo se corre cuando se decida revisar el modelo.

## Ajuste vista del ítem de registro

- Inventario «hoy → dónde va» aprobado por el usuario (en la spec). Nada se quita salvo lo aprobado: los íconos de opción (chips sin ícono, spec §1.3), el `inicio` sin nada marcado y «Arma tu podio…» con el podio vacío.
- «Siguiente» en todos los ítems salvo el último («Entregar»); «Paso anterior» se conserva junto al botón; la consulta conserva sus textos (`pieConsulta`).
- La pantalla de fin no cambia; la consulta usa la nueva estructura (decisión del usuario; queda en `pendientes-interfaz.md`).
- La reacción del personaje (`eleccion.mensajes`, `mensajeLumi`) va bajo las opciones, también con eco o en la consulta al modificar; en la lectura de la consulta no se muestra (antes tampoco: la burbuja del eco ocupaba su lugar).
- `inicio` solo saluda lo que llegó marcado (la vez pasada o `premarcar_si`) mientras no cambie; el hook expone `premarcadasDe` para saberlo.
- JSON de `ruta` sin campos de presentación: la consigna del servidor va sobre las opciones (o sobre el campo, si no hay elección) y la pregunta de la elección (`eleccion.pregunta`, `podio.pregunta`) sobre el campo; sin nada elegido, `{opciones}` se lee «esa opción» y `{opcion}` del podio, «…».
- `entradaPropia` es un mapa `{código de opción: placeholder}` en el nodo; vale con esa opción elegida sola.
- `errorTexto` exige al menos 1 carácter aunque el ítem no sea obligatorio (ningún ítem se guarda vacío); solo la opción sin seguimiento lo deja opcional.
- El marco recibe los bloques ya ordenados como hijos (`enOrden`), para que el arnés de pruebas los recorra; `RegistroEco` sin nada que decir no dibuja nada.
- Se borró `features/activities/data/iconosRegistro.ts` (sin uso) y los campos `iconos` de `ConfigPodio` y `ConfigEleccion`; los `iconos` que traen los JSON de `ruta` quedan sin efecto.
- Pruebas adaptadas (autorizadas por este ajuste): marcado de `eleccion`, `podio`, `reproductor`, `consulta` y `eco` de `tests/servidor/registro/` (campo siempre visible, reacción bajo las opciones, eco como hijo, leyenda en el pie, `inicio` sin selección).
- F2: en los 19 JSON de `contenido`, cada nodo de ítem gana `dialogo`, `preguntaEleccion` (solo E y P), `preguntaTexto`, `entrada` y, en b1-1-logro, b1-7-dia y b4-2-estilo, `orden: texto-primero`, con los textos de la tabla de Fase 3; `eleccion.pregunta` y `podio.pregunta` salen (los reemplazan `preguntaTexto` y `entrada`). `mensajes` se conservan con el recorte aprobado.
- F2: el `dialogo` de b4-1-menos repite, sin «con otra», el diálogo `b4-1-principio` de la apertura; se conservan los dos (la tabla de la spec lo pide y la apertura no se toca). Queda para la capa narrativa.
- F2: la regla de carga es `errores_presentacion` de `scripts/verificar_contenido_front.py` y solo mira los JSON de `plataforma/` (los de `ruta` usan el respaldo); su prueba unitaria va en `tests/unit/registro/test_presentacion_item_front.py`.
- Prueba en el navegador: el nombre del personaje va sobre el globo y el avatar se centra con el globo, no con el nombre (referencia del usuario).
- Prueba en el navegador: cuando una opción cambia la pregunta del campo (pregunta propia o sin seguimiento) y no declara `entradaPropia`, el placeholder pasa a «Escribe aquí…» (la entrada del ítem ya no encaja; así se ve en la referencia del usuario de b1-3-voz con «Nadie»).
- Prueba en el navegador (aprobado por el usuario): en el podio, el chip colocado sale de la lista y los demás se reacomodan (antes dejaba un hueco invisible; en móvil, una fila en blanco).
- Prueba en el navegador (aprobado por el usuario): `etiquetaElegida` deja de mostrarse; solo lo elegido la vez pasada lleva etiqueta (`etiquetaAnterior`). La etiqueta agrandaba el chip y movía la fila bajo el dedo, y en las exclusivas no tenía sentido («Nadie… · ESA VOZ»). El ✓ marca lo elegido.
- Prueba en el navegador: en móvil, la regla que da alto a la barra superior del reproductor no se aplicaba con el ambiente `sunrise` (un selector más específico la anulaba) y el contador de pasos caía sobre la barra de progreso; la regla de móvil usa ahora el mismo selector (sin tocar la barra de las batallas). Afecta a todo el reproductor, no solo a los registros.
- Prueba en el navegador: en móvil, el pie del ítem pone la leyenda en su propia fila, a la izquierda, y los botones en la rejilla 1fr / 2fr de siempre (antes la leyenda caía centrada en la columna del botón).

## Ajuste pruebas llm

- Respuesta emocional (`repregunta: null` sin cumplir ni sensible): POCO_DESARROLLADA sin pregunta; `avanzar` la salta y el presupuesto pasa al siguiente ítem. Una repregunta no nula pero inválida sigue → `texto_base`.
- Su pista al cerrar y en la consulta es el texto fijo `PISTA_SIN_REPREGUNTA` (tabla `texto_fijo`, como `LUMI_SENSIBLE`; decisión del usuario); los demás poco desarrollados conservan su repregunta como pista. `ItemPorAmpliar.pista` sigue siendo `str`. La prueba de la semilla de `ruta` pasa a esperar 2 textos fijos.
- `TEMPERATURA_REGISTRO = 1.0` solo en entrega y seguimiento: el adaptador usaba esa constante en todas sus llamadas, así que diario, cartas, sugerencias de pasos y guion pasan a `TEMPERATURA_ASISTENTES` (0.2, su valor de hoy).
- `mensaje_evaluador` (gemini.py) quita `repregunta` de los criterios solo en ítems con guía; los demás contextos van igual que antes.
- `guia_para` (acciones.py) es la parte pura de `criterio_y_guia`; `criterio_y_guia` solo lee los criterios cuando la opción propia no los reemplaza.
- Pruebas adaptadas (autorizadas): versión `v6`, `PROMPT_ENTREGA`/`PROMPT_SEGUIMIENTO` en lugar de los `_V5`, temperatura 1.0 en las del adaptador.
- F2: `NO_RECUERDO` de b1-1-logro hereda el criterio y solo cambia el `texto_base`, **sin `pregunta_propia`** (decisión del usuario): 2.1 la pedía, pero b1-1-logro es `texto-primero` y la regla de carga de esa vista prohíbe una opción que cambie la pregunta del campo; el ángulo va en `mensajes.exclusiva`; b1-1-logro pasa a `admite_abierto` (ocho ítems; la prueba de carga se adapta, autorizado).
- F2: `mensajes.exclusiva` de `b1_1.json` = «Está bien, a veces cuesta verlos. Si se te ocurre algo pequeño —algo que aprendiste solo, en casa, en un deporte o con amigos—, puedes agregarlo arriba.» (texto del usuario; la clave ya existía y sin ella la exclusiva mostraba «Anotado.»).
- F2: el eco ELECCION de b1-1-logro en b4-1 cita la exclusiva aunque el ítem quede ABIERTA (regla vigente de referencias); queda en `pendientes-interfaz.md`, sin cambiar la regla (observación del usuario).
