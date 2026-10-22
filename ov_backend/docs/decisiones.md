# Decisiones de la spec en curso

<!-- Spec en curso: F04d (docs/specs/F04d.md). -->

- **P1 · Visor único.** El pop up de la Mochila se extrae como `VisorRecurso` (mismo marcado) con `modo="repaso"`, que oculta el badge y «Leí la ficha» y conserva favoritos. Llega a las actividades por `store/visorRecursoStore.ts` (`abrirRecurso`, una función sin contexto, porque los arneses de `tests/local` llaman a los hooks fuera de React); `VisorRecursoHost`, montado en `StudentShell`, se suscribe y dibuja el visor encima, sin navegar. La lectura y los favoritos del visor viven en `useVisorRecurso`; el requisito de lo bloqueado, en `useRequisitoRecurso`, compartido con la Mochila.
- **Recursos por código.** `recursoDesdeCatalogo` arma cualquier recurso del catálogo aunque no lo use una actividad local; `recursoDeFicha` cubre una ficha del servidor sin contenido en el front. Enlace, lectura y video del reproductor siguen abriéndose; incrustar el video queda en `pendientes-interfaz.md`.
- **Un recurso por diapositiva.** `validateActivity` falla si una diapositiva trae más de un recurso: el visor abre uno a la vez.
- **Pop up de requisito sin «Volver al camino» dentro de una actividad.** El host no ofrece volver al camino: cerrar deja la pantalla como estaba. La Mochila conserva el botón.
- **P2 · Mochila desde el servidor.** En api, las fichas de la mochila son las de `GET /cuentas/{c}/fichas` (título y estado del servidor; contenido del catálogo del front por código, con aviso de «próximamente» si no hay). `?ficha=<codigo>` de una ficha bloqueada abre su pop up de requisito. Sin ajustes al backend.
- **Fichas del cierre de actividad.** Se abren con el visor en modo `mochila`, encima de la tarjeta y sin navegar (cierra «Anexo F3 · Conservar el cierre al volver de una ficha»); en local también, porque es el mismo componente.
