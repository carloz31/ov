---
name: cambio-modelo
description: Lista de pasos obligatoria cuando se agrega o cambia una tabla, columna, enumerado o restricción en ov_backend/app/models. Úsala antes de tocar app/models o migrations.
---

Un cambio de modelo se hace completo y en un solo commit:

1. **¿Está aprobado?** Si el plan o la spec no lo pide, detente y propónlo al usuario (qué cambia, por qué, qué HU lo necesita).
2. **Modelo:** edita `ov_backend/app/models/`. Respeta la `naming_convention` de `Base`, `snake_case` en español y enumerados en MAYÚSCULAS. Los índices parciales llevan `sqlite_where` y `postgresql_where`.
3. **Migración:** desde `ov_backend/`, `uv run alembic revision --autogenerate -m "<qué>"`. Revísala a mano (renombres que Alembic ve como borrar+crear, `render_as_batch`, valores por defecto para filas existentes). Nunca edites una migración ya integrada en `main`.
4. **Un solo head:** `uv run alembic heads` debe mostrar uno.
5. **Datos:** actualiza `datos/fijos.py` y `datos/ruta.py` si la tabla tiene datos sembrados.
6. **Documento vigente:** actualiza el de `docs/sistema/` que describe ese dominio (solo la parte que cambió).
7. **Esquemas y servicios** del dominio, y sus pruebas.
8. **Si cambia una respuesta que consume el front:** sigue «Contrato» del `AGENTS.md` raíz (tipos, `services/api`, adaptadores, fixtures regenerados, pruebas del front).
9. **Pruebas:** pide al subagente `pruebas` `tests/integration/migraciones`, `tests/integration/datos` y las carpetas del dominio.
10. Anota en `ov_backend/docs/decisiones.md`: qué cambió en el modelo y por qué.
