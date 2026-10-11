@AGENTS.md

# Claude Code

## Flujo por lote

Cada lote de HU está en `ov_backend/docs/plan-iteraciones.md` (sección «Lotes»). Se trabaja con `/lote <id>`: plan en modo plan, el plan aprobado se guarda como spec, implementación por fases, pruebas con el subagente `pruebas`, un commit por fase. Una sesión por lote; entre lotes, `/clear`.

El plan aprobado por el usuario es la spec: si el plan describe una vista nueva (qué pantalla, qué elementos, qué textos, qué componentes existentes reutiliza), esa vista queda autorizada.

## Ahorro de contexto

- Antes de abrir un archivo, búscalo con Grep/Glob. Lee rangos, no archivos enteros, cuando el archivo pase de ~300 líneas.
- No leas: `package-lock.json`, `uv.lock`, `ov_frontend/tests/fixtures/servidor/` (generados), `docs/historico/`, `node_modules/`, `.venv/`.
- Las pruebas las corre el subagente `pruebas`, que devuelve solo el resumen. No pegues salidas completas de pruebas en la conversación.
- Si una tarea es exploración amplia («¿dónde se usa X en todo el repo?»), delégala al subagente Explore.
- No releas un archivo que acabas de editar para verificarlo.

# Compact instructions

Al compactar, conserva: el id del lote y sus HU, la fase actual, los archivos tocados, las decisiones tomadas y las pruebas que siguen fallando con su causa. Descarta: salidas de pruebas, contenido de archivos leídos y exploraciones que no llevaron a nada.
