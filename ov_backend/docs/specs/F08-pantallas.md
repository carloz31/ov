# F08 · Familia: estudiante y apoderado (insumo para `/lote F08`)

Armado el 28 oct 2026. Fuentes, por prioridad: (1) el backend implementado (B12 familia/conversaciones, B17 sesión e hijos, B01 fichas del apoderado, `datos/ruta.py`, `docs/sistema/` y `docs/historico/B12/`, `B17/`); (2) `claude/plan-lotes-F.md` (entrada F08) y `claude/spec-actividades-apoderado.md`; (3) los bocetos del lienzo «Conversaciones en familia · rediseño F08», exportados como PNG en `ov_backend/docs/specs/bocetos/F08/` (abrirlos con la herramienta de lectura antes de cada fase de pantalla). Formato de `claude/F07-pantallas.md`.

El plan del lote parte de este documento: su sección «Pantallas» lo repite y no agrega otras. Todo aplica solo en modo `api` (local congelado). Las vistas implementadas deben quedar lo más cercanas posible a los bocetos (idealmente iguales), para que la revisión estética final sea de detalles.

Criterio general: misma disposición que la sección de familia actual, con el estilo de cada rol: **estudiante** = fondo oscuro, tarjetas crema y acentos dorados (como la Mochila); **apoderado** = portal claro con menú lateral (como *Actividades para familias*). El contenido es idéntico en ambos; solo cambia el estilo. Los textos de preguntas (versión estudiante y versión apoderado), guías de conversación, «puente», mensajes de bloqueo y nombres de fichas llegan del backend y se muestran tal cual; los textos de pantalla (títulos, ayudas, botones, chispas de Lumi) son del front y se fijan aquí.

## 0. Decisiones tomadas (resumen)

1. **Sin check de «conversada».** `COMPLETA_CONVERSACION` se registra en ambas cuentas cuando responde el segundo. El estado `por_conversar` desaparece (o equivale a `conversada`). La entrega del regalo (cartas) sigue siendo «las seis conversadas». Ajuste al backend, sin cambio de modelo.
2. **La carta es editable** después de guardada (`carta_estudiante` / `carta_apoderado` aceptan actualización). Sin estado de borrador: un solo botón «Guardar mi carta».
3. **El regalo es un misterio.** Ningún texto antes del final dice que son cartas: «hay algo guardado para ti y todavía no sabes qué es». La única pista: «tu familia / tu hijo la leerá en algún momento del camino, pero no sabrás cuándo».
4. **Diploma del apoderado:** uno por apoderado (no por hijo), emitido por la plataforma al completar su ruta; fecha = la de completar la última actividad de la ruta; código generado por el backend (§8.3).
5. **Fichas del apoderado** dentro de *Mis actividades* (sin pestaña de fichas), como chips por actividad; se abren en el modal compartido de ficha, sin favorito.
6. **Inicio del apoderado, resultados del hijo y actividades del apoderado:** se usan las interfaces que existen hoy en la parte de apoderados (F03 ya incluyó al apoderado en la vista resumida y explicada de resultados). Se conectan a datos reales y se ajustan en la revisión estética.
7. **Pantallas de carga y error del portal:** confirmar que existen las de F00 (pantalla completa para apoderado/orientadora, con manejo de error) y que se usan al ingresar y al abrir una actividad; si falta la de error, se agrega con el mismo patrón.
8. **Apoderado que adelantó su respuesta** (el hijo aún no abre el tema): reutiliza la pantalla «Esperando al otro» (E6) con el estilo claro.

## 1. Contrato, estado y reglas transversales

- **Tipos y servicios:** copiar de los schemas de B12/B17 (verificar nombres en `app/schemas/`): sección familia de la cuenta (estado de la sección, carta propia, lista de conversaciones con estado, regalo), acciones `guardar-carta`, `responder-conversacion`; `GET /sesion` con los hijos reales del apoderado; fichas del apoderado por actividad (B01) y detalle de ficha. Si el backend expone la carta del otro (regalo) como campo o endpoint aparte, usar eso; si no, pedir `cartas_disponibles` + carta en la misma lectura de familia.
- **Store:** sección `familia` en `store/servidor/` (estudiante) y en el almacén del apoderado; se pide al abrir la sección, no al ingresar. Toda acción refresca venciendo `familia` (patrón de planes/diario).
- **Loaders y acciones (atención especial):**
  - Todo botón que dispara un método (`guardar carta`, `guardar respuesta`, `completar actividad`, `ver ficha`, `abrir regalo`) queda `ocupado` con su etiqueta en gerundio («Guardando…», «Abriendo…») hasta la respuesta, y no puede volver a pulsarse.
  - **Al pulsar Guardar en la carta o en una respuesta, el área de texto se desactiva** (solo lectura, atenuada) mientras la acción está en vuelo; si falla (toast con el `mensaje` del servidor), vuelve a habilitarse con el texto intacto.
  - Carga de pantalla: `PantallaCarga` con `enSeccion` al entrar a Familia / Conversaciones y al abrir una conversación; error con el patrón existente y botón «Reintentar».
- **Fichas, carga bajo demanda (atención especial):** la lista de actividades del apoderado trae solo `codigo`, `titulo`, `es_nueva` de cada ficha (lo que cabe en el chip). El contenido se pide **recién al pulsar el chip** (`GET` de la ficha); el modal se abre de inmediato con cabecera (título) y un skeleton/loader en el cuerpo hasta que llega. Lo mismo para el estudiante si su mochila aún trae el contenido completo: no se toca en este lote, pero se anota en `pendientes-interfaz.md` si es el caso.
- **Un solo modal de ficha** para todos los roles y secciones (cabecera y pie fijos, cuerpo con scroll propio). Bandera `puedeMarcarFavorito` = `rol === 'ESTUDIANTE'`; para el apoderado el pie muestra «Esta ficha queda disponible en Mis actividades» y «Cerrar». Al abrirla se registra el evento de vista (quita «Nueva»).
- **Hijos reales:** el apoderado trabaja con los vínculos de `GET /sesion`. Con un solo hijo no hay selector; con varios, selector en la cabecera de Conversaciones («Con {nombre} ▾») que cambia el vínculo activo; carta y conversaciones son por vínculo. El diploma y *Mis actividades* no dependen del hijo.
- **Pruebas:** `tests/servidor/familia/` con fixtures regenerados por el script (estudiante: sección bloqueada, carta pendiente, lista con estados, conversación en cada estado, regalo; apoderado: bloqueado, carta pendiente, lista, actividades con fichas, diploma). `tests/local/` no se amplía. Al cerrar F08 se retiran los fixtures congelados de la raíz y los datos de demostración de hijos.

## 2. Estados de una conversación (front)

Mapa de estados del backend a pestañas y textos. Cada tarjeta muestra el bloque («Bloque N · nombre»), el tema (del backend), la pregunta **en la versión del rol**, los avatares E/F (relleno = ya respondió) y una línea de estado:

| Estado backend | Pestaña | Línea de estado | Acción |
|---|---|---|---|
| `sin_responder` | Te toca responder | «Nadie ha respondido aún» | Responder |
| `te_toca` (el otro ya respondió) | Te toca responder | «Tu familia / Mateo ya respondió» + marca «Nueva» | Responder |
| `esperando_al_otro` | Esperando a tu familia / Esperando a {hijo} | «Tu mirada ya está guardada» | Ver (E6) |
| `conversada` (ambos respondieron) | Listas para conversar | «Las dos miradas están listas» | Ver (E7/A5) |
| bloqueada (solo estudiante) | Por abrir | `bloqueo.mensaje` del backend | — (enlace «Ir al mapa») |

Las pestañas son filtros con contador; la primera con contenido va seleccionada. Para el apoderado no existe «Por abrir»: los temas que el hijo aún no abrió se muestran con borde punteado y la nota «{hijo} aún no llega a este tema. Puede adelantar su respuesta» y el botón «Adelantar mi respuesta» (misma acción de responder). Las pestañas «Conversadas» y «Listas para conversar» son la misma lista: se deja una sola, «Listas para conversar», con contador; el nombre «Conversadas» se retira.

## 3. Estudiante · sección Familia

### 3.1 Bloqueada (E1)
`SeccionProtegida FAMILIA` como en F00: al pulsar la sección, diálogo de Lumi (solo Anterior/Siguiente) con el texto propio de bloqueo y el `mensaje` del backend (actividad que la abre). Sin pantalla de sección.

### 3.2 Desbloqueada, carta pendiente (E2)
Cabecera «Familia · Dos miradas / Conversaciones en familia / Acabas de abrir esta puerta…». Hero crema con el sobre sellado (ilustración CSS, sin imagen), kicker «Primer paso», título «Deja una carta para tu familia», párrafo (texto del boceto), botón **«Escribir mi carta»** y nota «Toma unos 5 minutos». Debajo, tres pasos en tarjetas oscuras: «Escribes tu carta» · «Responden seis temas por separado» · «Conversan… y al final, un regalo». Luego la línea con candado «Las conversaciones se abren cuando guardes tu carta» y tres tarjetas de tema apagadas (solo bloque y tema, de las tres primeras conversaciones que devuelve el backend).

### 3.3 Escribir la carta (E3)
Ruta propia dentro de Familia. Dos columnas (apiladas en teléfono): **papel** (fondo crema rayado, encabezado «Querida familia,» en caligrafía, `Textarea` sin mínimo, contador de palabras, botón **«Guardar mi carta»**); **lateral**: tarjeta de Lumi («no es una tarea ni la leerá tu orientadora… si no sabes por dónde empezar, te doy algunas ideas») con botón **«Pedirle ideas a Lumi»** que abre el diálogo de ayuda de Lumi (Anterior/Siguiente) con 4 ideas como texto: «Lo que me ilusiona de elegir mi camino es…», «Lo que me da un poco de miedo es…», «En esta etapa me gustaría que ustedes…», «Algo que quiero que recuerden pase lo que pase…». **Nada se inserta en el texto.** Tarjeta «Tu carta queda guardada aquí: puedes volver a leerla y agregar algo nuevo…». Al guardar: textarea desactivada + botón ocupado; al confirmar, toast «Carta guardada» y vuelve a la lista (3.4). Volver a entrar muestra el texto guardado, editable, con el mismo botón.

### 3.4 Lista de conversaciones (E4)
Cabecera (kicker, título «Conversaciones en familia», subtítulo) y a la derecha el enlace «Tu carta · ver o editar» → 3.3. Tarjeta oscura del **regalo**: sello dorado (ícono de regalo), «Un regalo sellado para el final», «{n} de 6 conversaciones», seis puntos numerados (llenos = conversadas), texto «Hay algo guardado para ti, y todavía no sabes qué es. El sello se rompe cuando hayan conversado los seis temas». Si `cartas_disponibles`, la tarjeta cambia a «El sello se rompió» con botón **«Abrir el regalo»** → 3.8. Pestañas y tarjetas según §2; grilla de 2 columnas.

### 3.5 Responder (E5)
Tarjeta crema: bloque, «?» de Lumi arriba a la derecha (ayuda de la sección), tema, título «Dos miradas sobre {tema}», dos columnas: izquierda pregunta + `Textarea` «Tu mirada» (placeholder «Escribe desde tu propia mirada… no hay respuestas correctas») + nota «Podrás editarla mientras tu familia no haya respondido» + **«Guardar mi respuesta»**; derecha, si el otro ya respondió, caja punteada con candado «Tu familia ya respondió · Su mirada se revela en cuanto guardes la tuya» y un párrafo borroso decorativo (texto fijo del front, no la respuesta real: el backend no la entrega hasta que ambos responden); si no, la caja «Esperando…» de 3.6. Al guardar: textarea desactivada + botón ocupado; al confirmar navega a 3.6 o 3.7 según el estado refrescado.

### 3.6 Esperando al otro (E6)
Tarjeta: «Tu mirada ya está guardada»; izquierda la pregunta y la respuesta propia con botón «Editar mientras tu familia no responda» (vuelve a 3.5 con el texto); derecha caja punteada con avatares y «Esperando a tu papá, mamá o apoderado · Su respuesta aparecerá aquí cuando esté lista». Botón «Volver a las conversaciones».

### 3.7 Listas para conversar (E7)
Tarjeta: título «Las dos miradas ya están sobre la mesa»; dos columnas «Tu mirada» (pregunta versión estudiante + respuesta) y «La mirada de tu familia» (pregunta versión apoderado + respuesta, borde oscuro). Franja oscura «Un puente entre ambas miradas» (texto del backend). «Preguntas para conversar en casa» (lista del backend) y caja «Algo que ya saben» (del backend). Cierre, sin check ni reflexión: a la izquierda la tarjeta oscura **«Se abrió una entrada en tu diario»** con el título de la entrada y botón «Ir al diario» (solo si el backend indica la entrada desbloqueada; si no, la tarjeta no aparece); a la derecha la tarjeta punteada con los seis puntos y «Tema {n} de 6 listo · Cuando los seis estén así, se rompe el sello… y descubres qué había guardado. Ahora les toca conversar fuera de la pantalla».

### 3.8 El regalo (E8)
Pantalla propia en Familia (no modal). Estado sellado: fondo radial oscuro, kicker «Conversaron los seis temas», título «El sello se rompió», texto «Hay algo esperándote aquí desde el primer día. Todavía no sabes qué es… pero ya puedes abrirlo», sobre flotando (animación suave) con sello que pulsa, botón **«Abrir el regalo»**, seis puntos llenos. Al pulsar: chispas (CSS) y la carta se eleva (`rise`), kicker «Era una carta», título «Tu familia la escribió antes de empezar», papel con remitente («Escrita por {nombre} · tu {parentesco}»), «Para ti, cuando llegues hasta aquí», el texto de la carta en caligrafía y la firma. Solo lectura: sin guardar ni favorito. Pie: «Esta carta queda aquí, en Familia. Vuelve a leerla cuando lo necesites», botones «Ver el sobre otra vez» y «Volver a las conversaciones». La animación se muestra cada vez que se abre desde el sobre (no se guarda «ya visto»); desde la lista, la tarjeta del regalo abierto lleva a esta pantalla.

## 4. Apoderado · Conversaciones

Mismo contenido que §3 con el estilo claro del portal (menú lateral, topbar, tarjetas blancas, acento índigo).

- **A1 · Bloqueada:** el apoderado sí entra. Tarjeta con título, subtítulo, bloque con candado «Se abre al terminar sus actividades» + texto + barra de avance «{n} de {m} actividades completadas · falta «{siguiente}» ({min} min)» + botón «Ir a Mis actividades»; debajo tres tarjetas atenuadas con lo que encontrará (carta, seis temas, un regalo al final). Sin diálogo de Lumi.
- **A2 · Carta pendiente:** igual a 3.2 en claro; el nombre del hijo en los textos («Escríbale una carta a {hijo}»). Kicker «Conversaciones en familia · con {hijo}».
- **A3 · Escribir la carta:** igual a 3.3; encabezado «Querido/a {hijo},»; lateral «Si no sabe por dónde empezar» con botón «Ver ideas» (su versión del diálogo de ayuda) con 4 ideas: «Lo que admiro de cómo estás pensando tu futuro…», «Me comprometo a acompañarte así…», «Cuando yo tuve tu edad…», «Pase lo que pase, quiero que recuerdes…». Nota «Solo la leerá su hijo. Ni la orientadora ni el colegio la ven».
- **A4 · Lista:** igual a 3.4 con selector de hijo si hay varios; tarjeta del regalo clara («Un regalo sellado para el final», «Hay algo guardado para usted…», enlace «Ver o editar mi carta»); tarjetas según §2 (temas no abiertos por el hijo con «Adelantar mi respuesta»).
- **Responder / Esperando:** E5 y E6 en claro (sin artboard propio).
- **A5 · Listas para conversar:** igual a 3.7 sin la tarjeta de diario (es privada del estudiante); el cierre es la tarjeta punteada con los puntos y «Ahora les toca hablar en casa…» + botón «Volver a las conversaciones».
- **A6 · El regalo:** igual a 3.8 en claro, dentro del portal; remitente «Escrita por {hijo} · su hijo/hija».

## 5. Apoderado · Mis actividades (A7)

Se conserva la disposición actual con estos cambios:

- **Cabecera en dos columnas:** izquierda título y descripción; derecha un panel de ~340 px con el **progreso** (anillo con % y «{n} de {m} actividades · Progreso general de su ruta») y debajo la fila del **diploma** (ícono, «Diploma de compromiso», «Se emite a su nombre al completar las {m}», botón «Ver» apagado). Al completar la ruta: «Emitido el {fecha}» y «Ver» activo → §8.
- **Tramos colapsables:** si la ruta del apoderado tiene más de un bloque, cada bloque es una tarjeta con cabecera «{n} · {nombre} · {x} de {y} completadas» y botón de texto «Ocultar / Mostrar» con flecha; el tramo con la siguiente actividad disponible arranca abierto y los completados, cerrados. Con un solo bloque, lista directa sin agrupador.
- **Fila de actividad compacta:** estado (check verde / círculo / candado), título + pill («✓ Completada» / «Disponible» / «Se abre después de la anterior» o el `mensaje` del backend), una línea de descripción, duración y la **fila de fichas**: un chip por ficha obtenida («Ficha · {título}», con marca «Nueva» si no se ha visto) que abre el modal de ficha (§1, carga bajo demanda); si la actividad no está completa, un solo chip punteado «{k} ficha(s) al completar». Botón a la derecha «Repasar» / «Comenzar» (ocupado al pulsar hasta abrir la actividad). Se retira el bloque «Material de consulta → Ver ficha».

## 6. Modal de ficha para el apoderado (A8)

El componente compartido: cabecera fija (ícono, kicker con la categoría, título, «Lectura de N min · Obtenida en {actividad}» como texto, no enlace), botón cerrar; cuerpo con scroll propio (mientras carga, skeleton de 3 bloques); pie fijo con «Esta ficha queda disponible aquí, en Mis actividades, cuando quiera volver a leerla» y botón «Cerrar». Sin «Agregar a favoritos» ni «Leí la ficha».

## 7. Inicio del apoderado, resultados del hijo, carga y error

Sin pantallas nuevas: se conectan las vistas actuales a los datos reales (`GET /sesion` → hijo/s; avance de familia; resultados visibles del hijo según F03, solo con ruta completa e instrumento visible). Se verifica que la pantalla de carga de F00 cubra el ingreso del apoderado y la apertura de actividades, y que exista la de error; de lo contrario se agrega con el mismo patrón. Lo que quede por mejorar va a `pendientes-interfaz.md` para la revisión estética.

## 8. Diploma de compromiso (A9)

### 8.1 Pantalla
Ruta dentro de *Mis actividades*. Cabecera: «Ruta completada · {m} de {m} actividades», «Su diploma de compromiso», «Emitido por la plataforma a su nombre. Puede descargarlo o imprimirlo», botones «Imprimir» y «Descargar PDF» (el PDF se genera en el front desde la misma vista, p. ej. impresión a PDF con estilos de impresión; botón ocupado mientras se genera). Diploma: papel crema, doble borde dorado, esquinas, «Plataforma de orientación vocacional **Explora**» (o el nombre vigente), «otorga el presente», «DIPLOMA / de compromiso», nombre completo del apoderado subrayado, texto «por completar la ruta de acompañamiento familiar y comprometerse a acompañar, con escucha y sin decidir por ellos, la orientación vocacional de su familia», firma «Equipo de orientación · Orientación Explora», sello circular con la estrella y el año, «{fecha} · Fecha de emisión», y al pie «N.º {codigo} · Documento generado por la plataforma». **Sin nombre de hijo.**

### 8.2 Datos
El backend expone, en el avance del apoderado (o endpoint propio, a decidir en el plan): `diploma: {disponible, emitido_en, codigo}`. `disponible` = todas las actividades de la ruta del apoderado completadas; `emitido_en` = `max(completada_en)` de esas actividades. No se crea tabla: se calcula.

### 8.3 Regla del código (propuesta)
`EXP-AP-{AAAA}-{NNNNN}-{D}` donde `AAAA` = año de `emitido_en`, `NNNNN` = `cuenta.id` del apoderado con ceros a la izquierda, y `D` = dígito verificador: suma de cada dígito de `AAAA` y `NNNNN` multiplicado por su posición (1…9, de izquierda a derecha), módulo 10. Determinista y reproducible desde la cuenta y la fecha, único por apoderado (el id lo garantiza), sin tabla ni secuencia. Ejemplo: cuenta 148, año 2026 → `EXP-AP-2026-00148-D` con D calculado por el backend. Si el nombre de la plataforma cambia, solo cambia el prefijo (parámetro en `parametros.py`).

## 9. Contenidos, pendientes y ajustes

- **Contenidos:** `t_apo_1`, `t_apo_carta` (y los demás del bloque del apoderado que ya existan en `ruta`); textos del diálogo de Lumi para Familia bloqueada y para las ideas de la carta (front, dos versiones).
- **Pendientes que cierra:** B12, B17 hijos, AP-F3 (×4), B01 fichas apoderado, B2 conversaciones. Anota nuevos: notificaciones asíncronas al apoderado (pospuestas), «requiere atención» (pospuesto), contenido de fichas del estudiante bajo demanda si aún no lo está.
- **Ajustes al backend (sin cambio de modelo), a aprobar en el plan:**
  1. `COMPLETA_CONVERSACION` automático al responder el segundo; retiro del estado `por_conversar` y de la acción de marcar conversada.
  2. Carta editable: la acción de guardar carta acepta sobrescribir.
  3. `diploma` en el avance del apoderado con `emitido_en` y `codigo` (§8.2–8.3).
  4. Fichas del apoderado: lista ligera por actividad (`codigo`, `titulo`, `es_nueva`) y detalle por ficha, si el endpoint actual devuelve el contenido completo en la lista.
  5. Verificar que cada conversación tenga pregunta en versión estudiante y versión apoderado, y que la carta del otro se entregue solo cuando `cartas_disponibles`.

## 10. Preguntas abiertas (máximo 3)

1. ¿El backend ya entrega la entrada de diario que desbloquea una conversación conversada (3.7), o se agrega en este lote como regla?
2. ¿`diploma` va en el avance de familia del apoderado o en un endpoint aparte?
3. ¿La ruta del apoderado en `ruta` tiene más de un bloque (para activar los tramos colapsables) o un solo bloque FAMILIA?
