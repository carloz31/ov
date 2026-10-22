# Decisiones de la spec en curso

<!-- Spec en curso: F04 (docs/specs/F04.md). -->

- **Umbral propio de cada caso.** `CasoCuenta` entrega `puntaje_minimo` y el front decide «superado» con él; no hay umbral escrito en el front (el 60 de `t-caso` es solo dato de prueba).
- **Adaptadores de casos aparte.** `adaptadores.ts` está en el límite de 400 líneas; los de casos, colección y testimonios van en `lib/servidor/adaptadoresCasos.ts`, que también solo importa tipos.
- **Refresco común de acciones.** `accionConRefresco` (`store/servidor/refresco.ts`) reúne lo que hacía `accionRegistro`: incorpora los desbloqueos (toast y revelado de opcionales) y refresca; la usan registro, batallas y casos.
- **Apertura por tipo.** Una actividad BATALLA o CASO se abre según su tipo, no su bloque (`reproductorPorTipo` en `lib/servidor/contenidos.ts`): la batalla abre el reproductor de desafíos desde el camino o la Ciudad, sin exigir la Ciudad abierta; el caso enlaza a la Central de Casos.
- **Contenido de batallas y casos.** El JSON apunta al contenido del front con `desafio`, `fichas` y `caso` (`contenidos-actividades.md`); los marcadores fijos del desafío y del caso que ya representa el servidor se retiran de la Ciudad en api.
- **Recompensas de la batalla en api.** Lo que abre la victoria llega como aviso del servidor; la tarjeta de recompensa local (ficha e insignia oculta del desafío) no se muestra en api.
- **Puntaje del caso.** El front envía `puntaje = 100 × satisfacción / satisfacción máxima` de la definición del caso (un decimal) y las ocupaciones bien asignadas; el presupuesto agotado (game-over) envía puntaje 0 sin ocupaciones. Si el envío falla, el intento no se cierra y se muestra el error.
- **Acceso al caso en api.** Las rutas `cases/*` ya no pasan por `SoloLocal`: se abren si la actividad CASO que juega ese caso está visible y no bloqueada; si no, vuelven al camino. El tipo RIASEC va en el reporte, no en la intro.
- **Colección en api.** El contador de obtenidos del catálogo y la etiqueta del detalle leen `GET coleccion` (`useIconosObtenidos`); en el reporte, el testimonio local no se muestra en api (los testimonios abiertos llegan como avisos del servidor).
- **Testimonios en la mochila.** En api, la pestaña «Testimonios» lista los de `GET testimonios`, pedidos al abrir la mochila. Disponible: título, descripción y «Ver testimonio», que abre el enlace en el mismo clic y luego envía `ver-testimonio` sin esperar. Bloqueado: candado y título; al pulsarlo se abre el pop up de la ficha bloqueada («Cómo conocer este testimonio») con la pista o, sin pista, el mensaje de bloqueo. Sin persona, rol ni cita: el backend no los tiene.
- **Bloqueos: diálogo de Lumi y pop up.** Lo bloqueado de una sección usa el diálogo de Lumi; lo bloqueado de un contenido concreto (ficha o testimonio) usa un pop up con el detalle.
