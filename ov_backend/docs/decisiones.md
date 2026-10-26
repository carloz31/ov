# Decisiones de la spec en curso

- **«Explorando familias» se elimina del detalle de carrera en api** (no se oculta): la cubre la insignia oculta `t-ins-familias` del pasaporte (evaluador `carreras_familias_distintas`). En api, `viewedCareerIds` y `catalogVisits` dejan de alimentarse; en local sigue igual.
- **Pruebas adaptadas por la spec F06:** `tests/servidor/perfil/servidor-perfil.test.mjs` (los favoritos ya no son locales en api; los conteos del servidor van en una prueba nueva) y `tests/servidor/instrumentos/servidor-resultado.test.mjs` (en api, el corazón del resultado marca en el servidor y cambia al confirmarse).
