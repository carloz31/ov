# F07 · Pantallas de la tarjeta de plan de carrera (insumo para `/lote F07a` y `/lote F07b`)

Armado el 25 oct 2026. Fuentes, por prioridad: (1) el backend implementado (`app/models/planes.py`, `app/schemas/planes.py`, `app/api/planes.py`, `datos/fijos.py`, `datos/ruta.py`, `docs/sistema/planes.md`, `docs/historico/B11/`); (2) `claude/caso-tarjeta-plan-v4.md` y `claude/respuesta-plan-B11-v4.md`; (3) el boceto «Tarjeta de plan de carrera», solo como referencia visual (está en v3). Formato de `claude/plan-lotes-F.md`.

El plan de cada lote parte de este documento: su sección «Pantallas» lo repite y no agrega otras. Todo aplica solo en modo `api` (local congelado): en local, `StudentPlansView` y `DecisionSheet` quedan como hoy, detrás de una bandera de dominio (`usaTarjetaV4`, falsa en local).

Criterio general: cambios ligeros sobre la vista actual de *Mis planes*, reutilizando sus componentes (`DiscoveryStage`, `Parchment`, `sx-d-plan-card`, `Dialog`, `AvisoToast`, `PantallaCarga`, `SeccionBloqueada`, `Badge`, `Progress`, `Select`, `Input`, `Checkbox`). Los textos de las listas, las preguntas, las dudas, los estados y los mensajes de bloqueo llegan del backend y se muestran tal cual; los textos de pantalla (títulos, ayudas, botones) son del front y se fijan aquí. La revisión estética va al final, no en estos lotes.

## 0. Condiciones previas y lo que se retira

- **F06 primero.** F07a crea planes «desde mis favoritos» y REALIDAD (F07b) elige la institución entre las que ofrecen la carrera: necesita `GET /cuentas/{c}/favoritos` y `GET /cuentas/{c}/catalogo/carreras/{codigo}` en el front (hoy no existen `services/api/favoritos.ts` ni la carrera del catálogo en api; `StudentCatalogView` y los detalles siguen con datos locales). Si F06 no se hace antes, F07a asume solo lo mínimo: `favoritos.ts` (consulta) y el detalle de carrera, sin tocar las vistas del catálogo.
- **Lo que trae el boceto v3 y NO se implementa:** línea de texto por pregunta de conocimiento y botón «Convertir en duda»; bloque «Lo que sé»; «¿Lo conversé en casa?»; fechas, «vencido» y «Último cambio: hace 3 días» como texto relativo; reflejo o comentario de Lumi al guardar; botones «Es a propósito» / «Ver otras áreas» en el aviso de misma familia (fuera de B11); resumen `Carreras · Ocupaciones · Instituciones` al pie (los favoritos viven en el catálogo, F06). Del boceto se conserva la estructura: tres espacios A/B/C, tarjeta con frente + lista de secciones con píldora de estado, plan abierto con menú de secciones a la izquierda y una sola sección a la derecha, lectura con *Editar* y edición con *Guardar sección* / *Cancelar*.
- **Se reemplaza:** `DecisionSheet`, `plans.ts`, `PlanCard` (discovery) y lo que lee de ellos en api: `StudentProfileView` («Capítulo III · Hacia dónde voy»), `CareerDetailView` («¿Y si la conviertes en un plan?»), `InstitutionDetailView` («Usarla en un presupuesto»), `useStudentProfile.plans`. En local siguen igual.
- **Vocabulario fijo (front):** secciones «1 · Por qué la elijo», «2 · Qué tanto la conozco», «3 · Cómo lo haría realidad», «4 · Mis próximos pasos». El backend las nombra «Por qué», «Qué tanto la conozco», «Qué tan real es», «Mis pasos» (`seccion.nombre`): el front muestra sus títulos propios en la tarjeta y el menú, y el `nombre` del servidor donde cita un desbloqueo (extra `SECCION_PLAN` del cierre de actividad, como hoy). Estados, siempre con la misma píldora: `BLOQUEADA` «Bloqueada» · `POR_EMPEZAR` «Por empezar» · `EN_PROCESO` «En proceso» · `LISTA` «Lista». Nunca «1 de 3», «a medias» ni variantes.

## 1. Contrato y estado (ambos lotes)

- `types/servidorPlanes.ts` (nuevo, `servidor.ts` está al tope): `PlanesCuenta`, `PlanCarrera`, `SeccionPlan`, `DudaPublica`, `GastoPublico`, `SugerenciaPublica`, `PasoPublico`, `OpcionesTarjeta` y los cuerpos de las seis acciones, copiados de `app/schemas/planes.py`.
- `services/api/planes.ts`: `obtenerPlanes` y `enviarCrearPlan`, `enviarGuardarSeccion`, `enviarMedidores`, `enviarPasoHecho`, `enviarOrdenarPlanes`, `enviarEliminarPlan`.
- `store/servidor/`: sección `planes` en `DatosSecciones`, `consultas` y `contadores`; hook `usePlanesServidor(activo)`. Se pide al abrir *Mis planes* (no al ingresar). Toda acción refresca con `accionConRefresco` y vence `planes`; `seccionesPorDesbloqueos`: un desbloqueo `SECCION_PLAN` también vence `planes`.
- `lib/servidor/adaptadoresPlanes.ts` (nuevo, registrado en el `AGENTS.md` del front): reemplaza `{carrera}` en preguntas y dudas, arma el resumen de cada sección para el menú, calcula «N de 4 secciones listas» y precarga los gastos (F07b).
- Hook de dominio `features/plans/hooks/usePlanesServidor.ts` → `{activo, planes, avisos, opcionInicial, maximoPlanes, opciones, error, acciones}`; bandera `usaTarjetaV4 = modoApi`.
- Carga y error: `PantallaCarga` con `enSeccion` (como el diario). Mientras una acción está en vuelo, el botón que la disparó queda `ocupado`. Errores 409/422 de una acción: toast con el `mensaje` del servidor; sección bloqueada al guardar (409 con `progreso`): el mismo toast y la tarjeta vuelve a lectura.
- Sección PLANES cerrada: ya resuelto en F00 (`SeccionProtegida` + `SeccionBloqueada`, y la guía de Lumi desde el acceso rápido). No se agrega nada.
- Pruebas: `tests/servidor/planes/` con `ruta-planes.json`, `ruta-crear-plan.json`, `ruta-medidores-plan.json`; el lote regenera los fixtures que faltan (`ruta-guardar-seccion-*`, `ruta-paso-hecho`, que `integracion.md` nombra y no están). `tests/local/` no se amplía.

---

# F07a · Mis planes, orden, POR_QUE y CONOCIMIENTO

## 2. Mis planes (`StudentPlansView`, api)

> **Ajuste v4.2 (28 oct, implementado en F07a; manda sobre lo que sigue en esta sección):** sin el contador «N de 3 planes listos para comparar». El plan A es la tarjeta principal, en columna ancha, con «Plan A · tu ruta principal»; B y C, compactas, en una columna a la derecha bajo «Rutas alternas», con los espacios libres (también compactos) al final; en teléfono se apila, A primero. Cada tarjeta: letra, carrera, institución o «Aún sin institución elegida», «Tu primer interés», papelera; sin la caja «Por qué la elijo». Las secciones son cuatro casillas independientes (Lista: verde con check; En proceso: dorado con círculo medio lleno; Por empezar: borde punteado con el número; Bloqueada: gris con candado); en A con título y estado, en B y C solo el ícono, con «{n} · {título} · {estado}» y el mensaje de bloqueo en tooltip. Botón principal sin cambios; en B y C, «Hacer mi plan A» (`ordenar` con esa carrera primero; toast «{carrera} ahora es tu plan A»); sin «Subir / Bajar prioridad». Sin «N de 4 secciones listas» en las tarjetas (el menú del plan abierto lo conserva); «Último cambio» pequeño, abajo a la derecha. «Lista para comparar» no se muestra en ninguna pantalla: en su lugar, el sello «Plan completo» con las cuatro secciones Lista (también en el perfil). **Medidores (F07b):** solo en A, bajo el botón, tres mini tarjetas (ícono, nombre, barra de tres segmentos, palabra Poco · Algo · Mucho en negrita); «Sin valorar» con segmentos punteados y el enlace «Valorar» que abre «Cómo me siento».

Misma cabecera y mismo escenario de hoy. Cambia el contenido:

- **Cabecera:** «Mis planes» · «Las opciones que estás considerando para después del colegio. Ninguna es definitiva: puedes cambiarlas cuando quieras.» · contador con estrella «{n} de {maximo_planes} planes listos para comparar» (cuenta `lista_para_comparar`).
- **Aviso de misma familia** (si `avisos` trae `MISMA_FAMILIA`): franja de aviso, estilo `sx-d-notice`, con «Tus planes {A} y {B} son de la misma familia, **{familia.nombre}**. Tener una alternativa en otra área también puede ayudarte a decidir.» y el enlace «Explorar otras áreas» al catálogo. Sin botones.
- **Tres espacios A, B y C** (`sx-d-columns`), por `prioridad`:
  - *Espacio vacío:* como hoy («Espacio para tu plan {X}», «Tener otra opción a la mano también es parte de decidir. Puedes partir de una carrera que marcaste como favorita.»), botón **«Desde mis favoritos»** (abre el selector de §3) y enlace «Buscar en el catálogo» (catálogo de carreras). Solo el primer espacio vacío lleva los botones; los siguientes solo la letra y el título.
  - *Tarjeta con plan* (`sx-d-plan-card`): letra y «Plan {X}» · papelera «Eliminar plan {X}» · nombre de la carrera · bajo el nombre: `{institucion.nombre} · {Pública|Privada} ` si hay institución, si no «Aún sin institución elegida» · etiquetas: «Tu primer interés» si `carrera.codigo === opcion_inicial.codigo` y «Lista para comparar» si `lista_para_comparar` · caja «Por qué la elijo» con el motivo principal (`motivos[0]`, texto de VALORES o el «otro») y la primera línea del `relato` entre comillas; si no hay nada, «Todavía no cuentas por qué la eliges.» · lista de las cuatro secciones con su píldora de estado; las bloqueadas además con candado y, en texto secundario, `bloqueo[0].mensaje` (HU-099: el mensaje nombra la actividad que la abre) · «{n} de 4 secciones listas» con `TrailBar` · «Último cambio: {actualizada_en}» con fecha corta (`d MMM`) · botón ancho: «Empezar: Por qué la elijo» si POR_QUE está `POR_EMPEZAR`; «Seguir con: {primera sección abierta que no esté LISTA}»; «Ver mi plan» si todas las abiertas están listas. Abre el plan en esa sección · «Subir prioridad» / «Bajar prioridad» como hoy (ocultos si no aplica).
- **Ordenar:** cada flecha envía `ordenar` con la permutación completa de `carreras` (A, B, C). Sin animación nueva.
- **Eliminar:** el diálogo actual de archivar, con textos nuevos: «¿Eliminar el plan {X} · {carrera}?» · «Se borrará lo que escribiste en sus secciones. Podrás volver a crearlo desde tus favoritos.» · «Cancelar» / «Eliminar plan». Al confirmar, `eliminar` y toast «Plan eliminado».
- **Pie de privacidad:** se conserva: «Tus planes los ven tú y tu orientadora. Tus compañeros no los ven.»
- Se retira de api el `Parchment` «Lo que guardaste en el camino» y `PendingNotice`.

## 3. Crear un plan desde favoritos

Diálogo (`Dialog`) «¿Qué carrera quieres considerar?»: lista de `favoritos.carreras` (de `GET /favoritos`) con nombre y familia; las que ya tienen plan aparecen deshabilitadas con «Ya es tu plan {X}». Botón por fila «Hacer mi plan {letra libre}». Sin favoritas: «Aún no guardas carreras. Marca una como favorita en el catálogo para partir de ella.» y el enlace «Explorar carreras». Al crear: `crear` (toast «Plan creado. Empieza por contar por qué la eliges.»); si el servidor responde 409 (tope o repetida), toast con su mensaje. El plan nuevo se abre en POR_QUE.

En el detalle de carrera del catálogo (api), el bloque «¿Y si la conviertes en un plan?» queda con el mismo botón si la carrera es favorita y hay espacio; si ya es plan, «Ya es tu plan {X} · Ver mi plan». (Si F06 no está hecho, este punto se deja para F06 y se anota en `pendientes-interfaz.md`.)

## 4. Plan abierto (vista nueva `StudentPlanView`, ruta `profile/decisions/:carrera`)

Dentro de `SeccionProtegida PLANES`. Dos columnas (apiladas a lo ancho de un teléfono):

- **Menú de secciones (izquierda):** letra y «Plan {X}» · nombre de la carrera · `{institucion.nombre}` o «Aún sin institución» · píldora «Lista para comparar» si corresponde · entradas, en este orden: «Cómo me siento» (F07b; en F07a no aparece), «1 · Por qué la elijo», «2 · Qué tanto la conozco», «3 · Cómo lo haría realidad», «4 · Mis próximos pasos». Cada entrada: título, píldora de estado y una línea de resumen (del adaptador): POR_QUE → `{idea_origen} · {motivo principal} · «{inicio del relato}»`; CONOCIMIENTO → «{n} de 5 respondidas · {dudas abiertas} dudas abiertas · {cerradas} resueltas»; bloqueada → el `mensaje` del bloqueo; por empezar → «Todavía nada». Debajo, «{n} de 4 secciones listas» y la barra. La entrada seleccionada se marca; las bloqueadas se pueden seleccionar (muestran su tarjeta de bloqueo, §4.1). Enlace «Mis planes» en la cabecera para volver.
- **Panel (derecha):** solo la sección elegida, como una tarjeta con número, título y píldora de estado. Modo **lectura** (botón «Editar») o **edición** (cambios en memoria; «Guardar sección» envía `guardar-seccion` con la sección completa; «Cancelar» descarta). Al guardar, el panel vuelve a lectura con los datos refrescados.
- **En F07a**, las entradas 3 y 4 se muestran con su estado real, pero al seleccionarlas el panel solo tiene el título, la píldora y, si está bloqueada, su mensaje; si está abierta, «Esta sección llega en el siguiente lote.» (texto provisional, se retira en F07b).

### 4.1 Sección bloqueada
Tarjeta con candado, el título de la sección y `bloqueo[0].mensaje` del servidor, sin condiciones faltantes y sin diálogo de Lumi (el diálogo es solo para secciones del panel y la Ciudad). Reutiliza `SeccionBloqueada` con el título de la sección.

### 4.2 Sección 1 · Por qué la elijo (POR_QUE)

- *Arriba, solo lectura, si hay resultado RIASEC revelado* (lo tiene el store de instrumentos): «**Cómo encaja contigo.** {carrera} es de tipo {riasec[0] en palabras}. Tu tipo principal es {tipo} y el segundo, {tipo}. Es una pista, no una regla.» Si `carrera.riasec` está vacío o no hay resultado, el bloque no aparece. (El bloque «De tu camino» con la cita de 1.7 no se implementa: el backend no la entrega; va a `pendientes-interfaz.md`.)
- *Edición:*
  - «¿De quién fue la idea?» — cinco botones de una sola elección: Mía · De mi familia · De alguien que conozco · De un test · De la plataforma (`MIA, FAMILIA, CONOCIDO, TEST, PLATAFORMA`).
  - «¿Qué te mueve a elegirla?» — chips de `opciones.valores` sin tope; el orden en que se marcan es el orden enviado (el primero es el principal y se señala «principal»); chip «+ Otro motivo» con un campo de texto que se comporta como los chips (ver «Motivos en dos filas» abajo). Ayuda: «Marca primero el que más pesa.»
  - «¿Qué viviste que te hizo pensar en esta carrera?» — área de texto (se agrega `Textarea` a `components/ui/`), sin contador ni mínimo visible.
  - «Guardar sección» / «Cancelar».
- *Motivos en dos filas (ajuste del 28 oct, implementado en F07a):* en edición, arriba «Tus motivos · el 1 es el principal» con los elegidos en su orden, numerados y con «✕» (vacía: «Todavía no marcas ninguno. El primero que marques será el principal.»); abajo «Para elegir» con los chips de VALORES que no están arriba y «+ Otro motivo». Marcar uno de abajo lo sube al final con el siguiente número; la «✕» de uno de VALORES lo baja y la de uno propio lo borra; los demás se renumeran. «+ Otro motivo» abre un campo; al confirmarlo (Enter o salir con texto) el texto sube como chip propio y el botón vuelve a su estado inicial. Vacío o repetido (mismo texto que otro propio, sin importar mayúsculas ni espacios) no se agrega: el servidor responde 422. Para reordenar se quita y se vuelve a marcar (sin arrastre). El cuerpo no cambia: `motivos` en el orden de la fila de arriba, `{opcion}` o `{otro}`. En lectura, solo la fila de arriba, numerada. Todos los chips tienen el mismo alto. Componente: `ChipsElegibles`.
- *Al guardar:* toast «Lo anoté. Volverá cuando compares tus planes.» Si la respuesta refrescada deja la sección `EN_PROCESO` con las tres respuestas presentes (relato corto: el mínimo de 40 caracteres no se muestra), en lectura aparece bajo el relato la repregunta fija «¿Puedes contar un poco más? ¿Qué pasó, con quién estabas?» con el botón «Agregar». Se puede ignorar.
- *Lectura:* las tres respuestas en texto («Idea: Mía», motivos como chips con el principal primero, relato entre comillas) y «Editar».

### 4.3 Sección 2 · Qué tanto la conozco (CONOCIMIENTO)

- *Intro (front):* «Responde con sinceridad. Si no podrías explicarlo en una frase, marca *Más o menos*. Lo que no sepas se convierte en una duda, y cada duda te puede dar un próximo paso.» Enlace «Ver la ficha de la carrera» al detalle de la carrera (catálogo).
- *Edición:* las cinco preguntas de `opciones.preguntas` (texto con `{carrera}` reemplazado), cada una con tres botones Sí / Más o menos / No (`SI, MAS_O_MENOS, NO`). Debajo, **«Mis dudas»**:
  - las que saldrán de las respuestas: por cada pregunta con «Más o menos» o «No», una fila con `texto_duda` y la nota «De tu respuesta» (si ya existe en `dudas`, su estado; si no, «Se creará al guardar»). No se pueden quitar aquí: cambian con la respuesta;
  - las sugeridas (`opciones.dudas_sugeridas`) como chips «+ {texto}»; al marcar una pasa a la lista con «Sugerida» y una «✕» para quitarla;
  - «+ Escribir otra duda» → un `Input`; en la lista con «Duda tuya» y «✕».
  - Se envía `respuestas` (las cinco) y `dudas`: `{numero}` para las sugeridas y propias que se conservan, `{origen: SUGERIDA, opcion}` o `{origen: PROPIA, texto}` para las nuevas. Las de pregunta no se envían: las crea y cierra el servidor.
- *Al guardar:* toast «Guardado. Tus dudas quedaron anotadas.» (F07b lo cambia por el aviso de sugerencias). El guardado puede tardar unos segundos (el servidor llama al LLM): el botón queda `ocupado` con «Guardando…».
- *Lectura:* las cinco preguntas con su respuesta; una pregunta cuya duda está `CERRADA` con `hallazgo` muestra «Sí · averiguado» en lugar de su respuesta. Lista «Mis dudas»: abiertas con su origen («De tu respuesta» / «Sugerida» / «Duda tuya»), cerradas tachadas con «Resuelta» y el `hallazgo` debajo. «Editar».
- Estado `LISTA` con las cinco respondidas, aunque haya dudas abiertas.
- Las `sugerencias` que el backend genere en este lote no se muestran todavía (F07b).

## 5. Perfil y otros puntos de entrada (api)

- `StudentProfileView`, «Capítulo III · Hacia dónde voy»: A/B/C con el nombre de la carrera o «Espacio libre», y la píldora «Lista para comparar» o «{n} de 4 secciones listas» (reemplaza «Opción real» / «n de 4»). El enlace sigue siendo «Ver mis planes y favoritos» → *Mis planes*. La línea «Tienes {n} carreras favoritas que aún no son un plan.» se mantiene si F06 ya trae favoritos; si no, se retira en api.
- Guía del «?» de *Mis planes* (`guideTexts`, 3 pasos): «Tus planes son las opciones que estás considerando. Puedes tener hasta tres: A, B y C.» · «Cada tarjeta tiene cuatro secciones que se abren con tu camino: por qué la eliges, qué tanto la conoces, cómo la harías realidad y tus próximos pasos.» · «Puedes cambiar el orden o eliminar un plan cuando quieras.»

## 6. Contenidos, pendientes y ajustes (F07a)

- **Contenidos:** ninguno nuevo (`t_comparar` y `t_proyecto` son de F07b).
- **Pendientes que cierra:** B11 «Planes de carrera» (parte: lista, crear, ordenar, eliminar, estados, aviso, opción inicial, POR_QUE, CONOCIMIENTO). Anota como pendientes nuevos: «De tu camino» (cita de 1.7 en POR_QUE) y «valores de 2.3 primero» (orden personalizado de VALORES según el registro de valores: el backend no indica cuáles marcó).
- **Ajustes al backend:** ninguno previsto. Opcionales, a decidir en el plan (no cambian el modelo): `opciones.valores[].de_registro` (bool) para marcar «de Lo que valoro».

---

# F07b · REALIDAD, PASOS, sugerencias, medidores y actividades que citan los planes

## 7. Sección 3 · Cómo lo haría realidad (REALIDAD)

- *Edición:*
  - «Dónde estudiaría» — `Select` con las instituciones que ofrecen la carrera (`CarreraDetalle.instituciones`, F06), favoritas primero; cada opción `{nombre} · {Pública|Privada|sin dato} · {ubicacion.nombre}`. Opción «Todavía no sé».
  - «Cómo llegaría» — una elección entre `opciones.caminos` (botones apilados) + «Otro» con texto.
  - «Cuánto costaría» — tabla editable: rubro · monto (S/, entero ≥ 0) · frecuencia (`Select`: Una vez · Mensual · Por ciclo · Anual). **Precarga, solo la primera vez que se edita (sección `POR_EMPEZAR`):** los rubros de `opciones.rubros` con `frecuencia_recomendada` y `monto_referencia`; Pensión en 0 si la institución es pública (`cero_si_publica` y `gestion = PUBLICA`), con su referencia si no tiene gestión; Preparación solo si el camino tiene `incluye_preparacion`. Alimentación y Vivienda no se precargan. Mientras se edita: elegir un camino con preparación agrega la fila Preparación si falta (con su referencia); cambiar de institución no toca los montos. «+ Otro gasto» abre los rubros sin fila (`opciones.rubros` restantes) o «Otro» con texto. Cada fila se puede borrar. Ayuda: «Montos de referencia; cámbialos por los de tu institución.» Enlace «Ver costos en su página ↗» a `pagina_web` de la institución (del detalle de institución, F06) si existe.
  - **Totales en vivo** (front, misma fórmula del servidor): «Primer año ≈ S/ {UNICA + 12·MENSUAL + CICLOS_POR_ANIO·POR_CICLO + ANUAL}» y «≈ S/ {primer año / 12} al mes». Ver ajuste al backend en §11 para `ciclos_por_anio` y `duracion_ciclos`.
  - «¿Cómo lo pagarías?» — chips de `opciones.financiamiento`, varios, + «Otro» en dos filas como los motivos (§4.2, «Motivos en dos filas»), pero sin números: el orden no significa nada.
  - «Lo que podría complicarlo» — chips de `opciones.dificultades`, varios, + «Otro» en dos filas como los motivos (§4.2, «Motivos en dos filas»), pero sin números: el orden no significa nada. Las existentes llevan `numero`; las nuevas, `{opcion}` o `{otro}`.
  - «Guardar sección» / «Cancelar». Envía `institucion`, `camino`, `gastos`, `financiamiento`, `complicaciones`.
- *Al guardar:* botón `ocupado` «Guardando…» (puede llamar al LLM). Toast según §9.
- *Lectura:* «Dónde estudiaría» (nombre, gestión, ubicación) · «Cómo llegaría» · tabla de gastos en texto (`gastos` del servidor) · tarjeta oscura con «Primer año» `total_primer_anio` en grande, «≈ S/ {x} al mes» y, si `total_carrera` no es nulo, «toda la carrera ≈ S/ {total_carrera}» en texto secundario · «Muéstrales este número en casa.» · «Cómo lo pagaría» chips · «Lo que podría complicarlo» chips · «Editar».
- Estado `LISTA` con institución + camino + ≥ 1 financiamiento; las complicaciones no cuentan.
- Frente de la tarjeta en *Mis planes*: bajo el nombre de la institución, «1.er año ≈ S/ {total_primer_anio}» cuando REALIDAD está `LISTA`. Resumen en el menú: «{institución} · {camino} · 1.er año ≈ S/ {x}».

## 8. Sección 4 · Mis próximos pasos (PASOS)

- *Arriba, siempre que haya `sugerencias` PENDIENTE (también en lectura):* bloque **«Sugerencias»** — «Salen de tus dudas y de lo que podría complicarlo. Agrega las que te sirvan.» Cada sugerencia: etiqueta de tipo (`opciones.pasos`), `texto`, y «para: {origen.texto}». Botones: **«Agregar»** (pasa a *Mis pasos* como paso con `sugerencia: numero`), **«Editar»** (igual, con el texto abierto para cambiarlo) y **«Ahora no»** (va a `sugerencias_descartadas`). Las de `generada_por = RESPALDO` se ven igual que las demás. Los cambios del bloque se guardan con la sección.
- *Edición de «Mis pasos»:* lista de pasos `PENDIENTE` (`numero`), cada uno con tipo (`Select` de `opciones.pasos`), texto (`Input`), «para: {duda o complicación de origen}» si la tiene, y «✕». «+ Escribir un paso». Los pasos `HECHO` se muestran aparte, en lectura, y no se editan ni se borran desde aquí. «Guardar sección» envía `pasos` (conservados con `numero`, aceptados con `sugerencia`, nuevos con `tipo` y `texto`) y `sugerencias_descartadas`.
- *Lectura:* pasos pendientes con casilla **«Lo hice»**; al marcarla, diálogo «¿Qué averiguaste? (opcional)» con `Textarea` y botones «Guardar» / «Solo marcar» → `paso-hecho` al instante (sin pasar por «Guardar sección»); toast «Paso hecho. Si tenía una duda, ya quedó resuelta.» Pasos hechos tachados con su `hallazgo`. «Editar» arriba. Sin fechas: solo pendiente / hecho.
- Estado `LISTA` con ≥ 1 paso. Resumen en el menú: «{n} pasos, {hechos} hechos · {m} sugerencias».
- Si PASOS está bloqueada pero ya hay sugerencias pendientes, su entrada del menú añade «{m} sugerencias te esperan» y la tarjeta de bloqueo lo repite debajo del mensaje.

## 9. Aviso de sugerencias al guardar 2 y 3

Tras `guardar-seccion` de CONOCIMIENTO o REALIDAD, con la respuesta refrescada: toast «Tienes {dudas abiertas} dudas y {sugerencias pendientes} pasos sugeridos en *Mis próximos pasos*» (en REALIDAD, «{complicaciones} complicaciones y {m} pasos sugeridos»); si no hay sugerencias pendientes, el toast de F07a. Reemplaza el de F07a en CONOCIMIENTO. No se distingue LLM de respaldo.

## 10. Medidores («Cómo me siento»)

- Entrada «Cómo me siento» al inicio del menú del plan, con resumen «{Mucho} · {Algo} · {Poco}» o «Sin valorar». Su panel: «Cómo me siento con este plan» · «Cámbialo cuando quieras. Se guarda al instante y sirve para comparar tus planes.» · tres filas con tres botones (Poco · Algo · Mucho = 1 · 2 · 3): «Me entusiasma» (¿Cuánto te atrae esta opción?), «Me siento capaz» (¿Crees que puedes con los estudios y el ingreso?), «Tengo cómo lograrlo» (¿Cuentas con el dinero, el apoyo y el tiempo?). Cada clic envía `medidores` con los tres valores actuales; sin «Guardar». Se agrega un control segmentado simple a `components/ui/` (tres `Button` en grupo con `role="group"`).
- Frente de la tarjeta en *Mis planes*: las tres escalas como puntos (1–3) con la palabra, o «Sin valorar», solo lectura.

## 11. Actividades que citan los planes (`t_comparar`, `t_proyecto`)

- Hoy son marcadores vacíos. F07b les da nodos mínimos (`"_dato_de_prueba": true`): `t_comparar` → consigna del ítem `t-comparar-eleccion` con `"eco": "t-ref-planes"`; `t_proyecto` → consigna del ítem `t-proyecto-paso` con `"eco": ["t-ref-plan-a", "t-ref-pasos-plan-a", "t-ref-opcion-inicial"]`.
- La zona de eco (F02) aprende a citar los cuatro tipos: `PLANES` y `PASOS_PLAN_A` como lista de `opciones` (texto); `PLAN` como el `texto` (carrera) seguido de la `cita` (relato) entre comillas y las `opciones` (motivos) como chips; `OPCION_INICIAL` como `texto`. SIN_DATO: el aviso actual del eco.
- Los requisitos de ambas (`planes_listos_para_comparar`, `pasos_plan_a`) llegan en `bloqueo.mensaje` y se muestran como cualquier actividad bloqueada (F00).

## 12. Contenidos, pendientes y ajustes (F07b)

- **Contenidos:** `t_comparar.json`, `t_proyecto.json` (nodos mínimos).
- **Pendientes que cierra:** el resto de B11 «Planes de carrera» (REALIDAD, PASOS, sugerencias, medidores, `cita` en las referencias). Fuera de los lotes, y a anotar: HU-049; «Es a propósito» en el aviso; lo que ve la orientadora (B14).
- **Ajustes al backend (sin cambio de modelo), a aprobar en el plan:**
  1. `opciones.ciclos_por_anio` en `GET /planes` (hoy `CICLOS_POR_ANIO = 2` solo en `parametros.py`), para que el front no repita la constante al calcular el total en vivo.
  2. `institucion.duracion_ciclos` en `PlanCarrera` (de `institucion_carrera`), para mostrar en vivo «toda la carrera ≈» mientras se edita; sin él, ese total solo se muestra en lectura (`total_carrera`).
  Si no se aprueban: el front usa 2 como constante anotada en `decisiones.md` y el total de la carrera solo en lectura.

## 13. Preguntas abiertas (máximo 3)

1. ¿F06 se hace antes de F07a (orden decidido) o F07a incluye lo mínimo de favoritos y detalle de carrera en api?
2. ¿«Buscar en el catálogo» desde un espacio vacío solo lleva al catálogo (para marcar favoritas), o también se puede crear un plan desde el detalle de una carrera no favorita? (El backend lo permite; la decisión previa fue «la carrera se elige de los favoritos».)
3. Ajustes 1 y 2 de §12: ¿se agregan en F07b (lote sin M) o se queda la constante en el front?
