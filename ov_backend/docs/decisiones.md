# Decisiones de la spec en curso

<!-- Spec en curso: F04 (docs/specs/F04.md). -->

- **Umbral propio de cada caso.** `CasoCuenta` entrega `puntaje_minimo` y el front decide «superado» con él; no hay umbral escrito en el front (el 60 de `t-caso` es solo dato de prueba).
- **Adaptadores de casos aparte.** `adaptadores.ts` está en el límite de 400 líneas; los de casos, colección y testimonios van en `lib/servidor/adaptadoresCasos.ts`, que también solo importa tipos.
- **Refresco común de acciones.** `accionConRefresco` (`store/servidor/refresco.ts`) reúne lo que hacía `accionRegistro`: incorpora los desbloqueos (toast y revelado de opcionales) y refresca; la usan registro, batallas y casos.
