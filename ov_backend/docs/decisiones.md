# Decisiones de la spec en curso

<!-- Spec en curso: F04 (docs/specs/F04.md). -->

- **Umbral propio de cada caso.** `CasoCuenta` entrega `puntaje_minimo` y el front decide «superado» con él; no hay umbral escrito en el front (el 60 de `t-caso` es solo dato de prueba).
- **Adaptadores de casos aparte.** `adaptadores.ts` está en el límite de 400 líneas; los de casos, colección y testimonios van en `lib/servidor/adaptadoresCasos.ts`, que también solo importa tipos.
- **Refresco común de acciones.** `accionConRefresco` (`store/servidor/refresco.ts`) reúne lo que hacía `accionRegistro`: incorpora los desbloqueos (toast y revelado de opcionales) y refresca; la usan registro, batallas y casos.
- **Apertura por tipo.** Una actividad BATALLA o CASO se abre según su tipo, no su bloque (`reproductorPorTipo` en `lib/servidor/contenidos.ts`): la batalla abre el reproductor de desafíos desde el camino o la Ciudad, sin exigir la Ciudad abierta; el caso enlaza a la Central de Casos.
- **Contenido de batallas y casos.** El JSON apunta al contenido del front con `desafio`, `fichas` y `caso` (`contenidos-actividades.md`); los marcadores fijos del desafío y del caso que ya representa el servidor se retiran de la Ciudad en api.
- **Recompensas de la batalla en api.** Lo que abre la victoria llega como aviso del servidor; la tarjeta de recompensa local (ficha e insignia oculta del desafío) no se muestra en api.
