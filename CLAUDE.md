@AGENTS.md

# Claude Code

## Ahorro de contexto

- Antes de abrir un archivo, búscalo con Grep/Glob. Lee rangos, no archivos enteros, cuando el archivo pase de ~300 líneas.
- No leas: `package-lock.json`, `uv.lock`, `ov_frontend/tests/fixtures/servidor/` (generados), `node_modules/`, `.venv/`.
- Las pruebas las corre el subagente `pruebas`, que devuelve solo el resumen. No pegues salidas completas de pruebas en la conversación.
- Si una tarea es exploración amplia («¿dónde se usa X en todo el repo?»), delégala al subagente Explore.
- No releas un archivo que acabas de editar para verificarlo.

# Compact instructions

Al compactar, conserva: la tarea en curso, la fase actual, los archivos tocados, las decisiones tomadas y las pruebas que siguen fallando con su causa. Descarta: salidas de pruebas, contenido de archivos leídos y exploraciones que no llevaron a nada.
