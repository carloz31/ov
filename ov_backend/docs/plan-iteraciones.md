# Plan de iteraciones

Sirve para no cerrar caminos a lo que viene, no para adelantarlo: solo se implementa lo que pide la spec en curso (`docs/specs/`). Catálogo de referencia: catálogo de requisitos vigente, 93 HU.

| It. | Tema | HU | Estado |
|---|---|---|---|
| 1 | Integración base: desbloqueos, informativas, test de intereses y recomendaciones | 002, 004, 011, 013, 014, 015, 021, 022, 025, 026 (sin favoritos), 027, 073, 074, 075 (solo nivel) | Implementada; pendiente de aprobación del usuario. |
| 2 | Registro con LLM, comprobaciones, acceso y ayuda | 001, 005, 006, 007, 008, 009, 010, 012, 016, 017, 018, 019, 020 | El registro con evaluador existe en el backend (`docs/sistema/registro.md`), sin datos en `plataforma`. Faltan login, retoma de ítems de otras actividades (009), misiones adicionales y batalla. |
| 3 | Autoconocimiento y exploración: diario, check-in, perfil, catálogos y planes | 023, 024, 028–036, 037–042, 043–050 | Diario y check-in existen en el backend sin vista conectada. Catálogos, favoritos y planes son nuevos. |
| 4 | Ciudad y comunidad: casos, entrevistas y familia | 003, 051–056, 057–065, 066–072 | Casos, entrevistas, coautoría, cartas y conversaciones existen en el backend. Reacciones y Leyendas son nuevas. |
| 5 | Apoderado, orientadora y perfil social | 076–080, 081–093 | Casi todo es consulta de datos que ya existen. |

## Material

- Cada iteración carga el material de sus actividades. El contenido narrativo vive en los JSON del front (`ov_frontend/docs/contenidos-actividades.md`), así que cargar material solo toca el backend para agregar actividades, ítems o reglas.
- Los datos de prueba se marcan `DATO DE PRUEBA` para encontrarlos y reemplazarlos al cargar el material definitivo.
- El último 15–20 % del calendario se reserva para revisar y completar el material.

## Lotes

Cada lote cabe en una sesión de Claude Code y se integra a `main` al terminar. Orden sugerido: 2A primero (todo lo demás depende de la sesión); después, los lotes sin flecha de dependencia pueden ir en cualquier orden. Los marcados con **M** cambian el modelo: no corras dos lotes **M** en paralelo.

| Lote | Tema | HU | Antes de empezar | Estado |
|---|---|---|---|---|
| 2A | Inicio y cierre de sesión **M** | 001, 020 | Decidir el mecanismo (sesión por cookie o token) y si las credenciales vienen precargadas. | Pendiente |
| 2B | Actividades de registro **M** | 006, 007, 008, 009, 010 | Tras 2A. Ya existe el evaluador (`docs/sistema/registro.md`). | Pendiente |
| 2C | Comprobaciones, misiones adicionales y batalla | 005, 012, 016, 017 | Tras 2A. Mockup o descripción de la batalla. | Pendiente |
| 2D | Ayuda contextual | 018, 019 | Textos de ayuda por pantalla (pueden ser `DATO DE PRUEBA`). | Implementado |
| 3A | Diario, pregunta del día y amistad con Lumi | 028–034 | El backend ya existe; es sobre todo conexión de vistas. | Pendiente |
| 3B | Check-in de seguridad | 035, 036 | El backend ya existe. | Pendiente |
| 3C | Perfil y vista explicada de resultados | 023, 024 | — | Pendiente |
| 3D | Catálogos, favoritos y testimonios **M** | 026 (favoritos), 037–042 | Fuente de datos de instituciones. | Pendiente |
| 3E | Planes de carrera **M** | 043–050 | Tras 3D. | Pendiente |
| 4A | Casos y colección de ocupaciones | 003, 051–056 | El backend ya existe. | Pendiente |
| 4B | Entrevistas y coautoría | 057–062 | El backend ya existe. | Pendiente |
| 4C | Reacciones, destacados y Leyendas **M** | 063–065 | Tras 4B. Regla para ser Leyenda. | Pendiente |
| 4D | Conversaciones y cartas con la familia | 066–072 | El backend ya existe. | Pendiente |
| 5A | Logros en el perfil, perfil social, diploma y avance del apoderado | 076–080 | — | Pendiente |
| 5B | Portal de la orientadora: seguimiento individual | 081–089 | Tras 2A (rol orientadora). Regla de alertas (088). | Pendiente |
| 5C | Portal de la orientadora: vista del salón | 090–093 | Tras 5B. | Pendiente |
