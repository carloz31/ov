# Decisiones de la spec en curso

<!-- Spec en curso: F04d (docs/specs/F04d.md). -->

- **P1 · Visor único.** El pop up de la Mochila se extrae como `VisorRecurso` (mismo marcado) con `modo="repaso"`, que oculta el badge y «Leí la ficha» y conserva favoritos. Llega a las actividades por `store/visorRecursoStore.ts` (`abrirRecurso`, una función sin contexto, porque los arneses de `tests/local` llaman a los hooks fuera de React); `VisorRecursoHost`, montado en `StudentShell`, se suscribe y dibuja el visor encima, sin navegar. La lectura y los favoritos del visor viven en `useVisorRecurso`; el requisito de lo bloqueado, en `useRequisitoRecurso`, compartido con la Mochila.
- **Recursos por código.** `recursoDesdeCatalogo` arma cualquier recurso del catálogo aunque no lo use una actividad local; `recursoDeFicha` cubre una ficha del servidor sin contenido en el front. Enlace, lectura y video del reproductor siguen abriéndose; incrustar el video queda en `pendientes-interfaz.md`.
- **Un recurso por diapositiva.** `validateActivity` falla si una diapositiva trae más de un recurso: el visor abre uno a la vez.
- **Pop up de requisito sin «Volver al camino» dentro de una actividad.** El host no ofrece volver al camino: cerrar deja la pantalla como estaba. La Mochila conserva el botón.
