# F00 · Pantallas (insumo para `/lote F00`)

Decidido por el usuario el 20 oct 2026. El plan de F00 parte de este documento: su sección «Pantallas» lo repite y no agrega otras pantallas. Todo lo que sigue aplica solo en modo `api` (local congelado); en local cada vista queda como hoy.

Criterio general: cambios ligeros sobre las vistas actuales, reutilizando sus componentes y estilos. La revisión estética se hace al final, no en este lote.

## 1. Actividad bloqueada (drawer del mapa y portal del apoderado)

- **Drawer del estudiante** (`ActivityDrawer`): la caja `sx-drawer-requirement` muestra `bloqueo[0].mensaje` de la actividad (o del bloque, si la actividad no trae `bloqueo`), tal cual llega. No se listan `condiciones_faltantes`.
- Se retira la consulta a `GET /cuentas/{c}/progreso/...` para armar ese texto, y el texto «Consultando el requisito en el servidor…»: el `bloqueo` ya viene en `GET /cuentas/{c}/actividades`.
- `textoRequisito` deja de construir textos propios en api (incluido «Completa todas las misiones del camino (X de 9)»).
- **Apoderado:** `ParentActivityCard` conserva la etiqueta «Bloqueada»; `ActivityUnavailable` («Actividad bloqueada») muestra bajo el título solo el `mensaje` del servidor; «Complete la actividad anterior para continuar.» queda como respaldo cuando no llega ninguno (ajuste del 21 oct 2026).

## 2. Actividad opcional, duración y descripción (drawer y panel)

El drawer conserva todo lo que muestra hoy: insignia de estado, tiempo, título, descripción, tipo de actividad y la entrada de diario sugerida con su enlace. Solo cambia:

- **Opcional:** si `requerida` es `false`, una segunda insignia «Opcional» junto a la de estado, con la misma clase `sx-drawer-badge` (nuevo `data-status="Opcional"` con el color de acento suave). Las misiones adicionales conservan su insignia actual.
- **Opcionales en el mapa (ajuste del 21 oct 2026):**
  - todas son `AL_DESBLOQUEAR` en `ruta`: aparecen al desbloquearse;
  - el camino principal (`MapPath`) une solo las requeridas, en orden y cruzando bloques;
  - cada opcional se dibuja como hoy las misiones adicionales de local (`additional`, `originId`, `revealing`, `revealQueued`, `sx-node-additional`), con línea propia desde `mapa.origen` del contenido: punteada mientras está pendiente y verde al completarse;
  - las que llegan en los desbloqueos de una acción se revelan una por una al volver al Camino, con la animación existente (punto y línea), y el mapa se centra en cada una con el encuadre de las misiones adicionales (`frameAdditional`). La marca vive solo en memoria: tras recargar aparecen sin animación.
- **Opcionales como plus con intriga (ajuste 15, 21 oct 2026):**
  - conservan el color de misión adicional y la insignia de esquina `sx-extra-star`, que pasa a llevar `CircleHelp` («?») en lugar de `Star`;
  - su etiqueta en el mapa lleva solo el título, sin píldora («Opcional» ni «Misión adicional»);
  - el nodo no es más grande que el de una requerida (124 px frente a 140 px), así que no cambia el CSS;
  - en api, los puntos bloqueados usan `LockKeyhole` en lugar de `CircleHelp`, y el ícono dentro del círculo sigue indicando el tipo de actividad;
  - el `aria-label` dice «, misión extra» (`t-adicional` conserva «, misión adicional»);
  - «Opcional» se sigue mostrando en el drawer y en «Actividades disponibles»;
  - el punto que brilla es siempre una requerida disponible; una opcional solo si no queda ninguna;
  - el primer paso de la ayuda del Camino (`guiaCaminoApi`) explica el candado y el «?».
- **Tiempo:** `{duracion_estimada_min} min` del servidor; si viene nulo, el texto actual de `getMissionMeta`.
- **Descripción:** `descripcion` del servidor; si viene nula, la del JSON de contenido, como hoy.
- **Lista «Actividades disponibles» del panel:** el subtítulo agrega « · opcional» cuando corresponde.
- **Avance del tramo** (`BlockSign`, panel y progreso del bloque): cuenta solo las actividades `requerida`, como el servidor.
- La entrada de diario sugerida no cambia en F00 (se conecta al servidor en F05).

## 3. Sección bloqueada: la explica Lumi

- **Accesos con sección** (`AdventurePanel`): Mi diario (DIARIO), Información (CATALOGO), En familia (FAMILIA), el botón de la señal «Registrar mi señal / Cambiar» (CHECK_IN) y el enlace «Ver mis planes y favoritos» del perfil (PLANES). Su estado sale de `GET /cuentas/{c}/secciones`.
- **Bloqueada:** el acceso lleva el candado pequeño que ya usa «En familia» (`sx-quick-lock`, texto `sr-only` y `title` con el `mensaje`). Al pulsarlo no navega: abre la ayuda de Lumi con `openGuide(pasos)` (el mismo `LumiDialogue` del botón de ayuda, sin botones nuevos):
  1. un paso de adelanto propio de lo bloqueado (`textosBloqueo` en `guideTexts.ts`, por código de sección); no se usan `sectionIntros` ni `guideSteps`, que son para la sección abierta;
  2. la frase final de ese código seguida del `mensaje` del servidor. El requisito siempre viene del servidor.

  | Código | Adelanto | Frase final |
  |---|---|---|
  | DIARIO | Pronto tendrás un cuaderno solo para ti, donde podrás contarme lo que piensas y sientes en este viaje. | Todavía no puedes abrirlo. |
  | CHECK_IN | Muy pronto podrás contarme cada día cómo te sientes. Así, juntos, notaremos qué te da energía. | Todavía no puedes registrarla. |
  | CATALOGO | Aquí se guarda un atlas de profesiones, carreras e instituciones. Te servirá para explorar lo que te llame la atención. | Todavía no puedes consultarlo. |
  | PLANES | Más adelante podrás armar tus planes de carrera y ver qué tan preparados están. | Todavía no puedes empezarlos. |
  | FAMILIA | Este será un espacio para conversar con tu familia sobre lo que vas descubriendo. | Todavía no se abre. |
  | CIUDAD | Más adelante en tu recorrido se abre la ciudad. Allí sus habitantes necesitan ayuda, y tú decides a quién ayudar primero. | Todavía no abre sus puertas. |

  (Ajuste del 21 oct 2026.)
- **Entrada directa por URL** a una sección bloqueada: la vista muestra la tarjeta de bloqueo que ya existe en `FamilyConversationsView` (candado, título de la sección, `mensaje` del servidor). En FAMILIA reemplaza el texto actual («…cierre del Bloque 5…»). Diario, catálogo y planes reutilizan esa tarjeta (subirla a `components/student/` si la usan dos dominios).
- Investigaciones y Recursos no cambian (su sección llega en B13 o no existe).

## 4. Ciudad bloqueada: desde el selector

- Se **quita** el punto «La llave de la ciudad» del mapa del Camino (`caminoPoints`, modo api).
- **Selector Camino/Ciudad** (`ZoneSwitch`): con la Ciudad bloqueada, pulsar «Ciudad» abre la ayuda de Lumi con los `textosBloqueo` de CIUDAD (adelanto y «Todavía no abre sus puertas.» + el `mensaje` del bloque CIUDAD). El tooltip del selector muestra ese mismo `mensaje` (hoy: «Completa el camino para abrir la ciudad»).
- **Entrada directa a `/student/exploration` con la Ciudad bloqueada:** redirige al Camino y abre la misma ayuda. `CityLocked` deja de usarse en api; su barra «Camino hacia la ciudad» se retira.
- `guideSteps.missions` dice «Al final del camino está la ciudad…»: se cambia por «En el camino se abre la ciudad, donde podrás elegir tus actividades y ayudar a sus habitantes. Arriba puedes cambiar entre el camino y la ciudad.»

## 5. Pantallas de carga y error

Un componente por familia de portales, en `components/student/` y `components/staff/`, sin lógica de dominio (recibe estado, textos y acciones).

**Estudiante** (estilo de `ZoneTransition`: pantalla completa, fondo de la zona, avatar de Lumi):
- *Cargando:* título y frase; indicador animado que respeta `prefers-reduced-motion`. Solo aparece si la espera pasa de ~300 ms.
  - Ingreso a la sesión: «Preparando tu camino» / «Lumi está buscando el mapa…» (reemplaza «Consultando tu camino en el servidor…» de `StudentShell`).
  - Abrir una actividad (todo reproductor que carga datos del servidor, incluido Mara): «Preparando la actividad» / «Lumi está acomodando todo…» (reemplaza «Preparando el encuentro…»).
- *Error:* la misma pantalla con «Algo se cruzó en el camino», el texto de `mensajeErrorServidor`, y los botones «Reintentar» (primario) y «Volver al mapa» (en la sesión, en lugar de «Volver al mapa»: «Volver a ingresar»).
- *Secciones* (diario, catálogo, planes, perfil, familia): la misma pantalla, pero dentro del área de la sección (no tapa el panel).

**Apoderado y orientadora** (sobria, colores del portal, pantalla completa):
- *Cargando:* ícono de carga, «Cargando» / «Un momento, estamos trayendo tu información.» Al ingresar al portal y en la carga inicial de sus vistas (cierra el pendiente AP-F3 de carga y error: ya no se ve «0 de 0 actividades»).
- *Error:* «No pudimos cargar la información», `mensajeErrorServidor`, «Reintentar» (primario) y «Volver a ingresar», que cierra la sesión y lleva al login, como en la del estudiante (ajuste del 21 oct 2026).

**Sesión vencida (401):** vuelve al login con el aviso «Tu sesión terminó. Vuelve a ingresar.» (el mensaje del servidor).

## 5 bis. Avisos del estudiante como toasts (ajuste 16, 21 oct 2026)

Aplica a `UnlockToast`, `BadgeToast` y el aviso de error de avisos, en api y en local. En local es solo visual: los avisos conservan sus textos, su orden y el momento en que aparecen.

- **Posición:** fija arriba a la derecha, debajo de la barra superior del mapa y de las secciones. En pantallas angostas va arriba, a todo el ancho con margen de 16 px, debajo del selector Camino/Ciudad. Nunca tapa la barra superior ni el selector.
- **Tarjeta compacta**, al estilo del toast de shadcn y sin dependencias nuevas (`components/student/AvisoToast` y el CSS de `sx-badge-toast`):
  - un ícono pequeño del tipo de aviso: insignia `Award`, ficha `BookOpen`, nivel `TrendingUp`, ciudad `Building2` y error `TriangleAlert`;
  - la etiqueta, el título en negrita y una línea de descripción;
  - el enlace como botón pequeño (`sx-secondary-button`) y la X;
  - sin el avatar de Lumi.
- **Cola y tiempo:** se muestra un aviso a la vez. Cada uno se cierra a los 6 s o con la X, y entonces entra el siguiente. El tiempo se pausa con el puntero encima o el foco dentro, y el error espera a que se reintente.
- **Movimiento:** entra deslizándose desde la derecha; sin animación con `prefers-reduced-motion`.

## 6. Sin cambio visual

- Nombre del estudiante y del apoderado: el de la sesión, en los lugares donde hoy se muestra uno de demostración (cierra AP-F3 «Nombre del apoderado»).
- Puntos `t_*` del mapa: posiciones provisionales en el JSON de contenido; se reubican al cargar la ruta real.

## Pendientes que cierra

B01 «Motivo de bloqueo», B01 «Requerida, duración y descripción», B01 «Secciones del perfil», B3 «Texto de la llave», AP-F3 «Carga y error del portal», AP-F3 «Nombre del apoderado». Los demás quedan para su lote.

## Ajustes al backend

Ninguno previsto. Si el plan encuentra que una vista necesita un dato que no llega, se detiene y lo propone.
