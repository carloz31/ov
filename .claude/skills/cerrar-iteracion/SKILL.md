---
name: cerrar-iteracion
description: Verificar e integrar todos los lotes de una iteración y dejar los documentos al día (por ejemplo, /cerrar-iteracion 2).
argument-hint: <número de iteración>
disable-model-invocation: true
---

Iteración: $ARGUMENTS

1. Lista los lotes de la iteración en `ov_backend/docs/plan-iteraciones.md` y su estado. Si alguno no está «Implementado», detente y avisa.
2. Pide al subagente `pruebas` la suite completa de ambos repos sobre `main`.
3. Comprueba que `uv run alembic heads` muestra un solo head y que `uv run alembic upgrade head` funciona sobre una base vacía.
4. Revisa que `ov_frontend/docs/pendientes-interfaz.md` no tenga entradas de esta iteración sin decidir; lístalas para el usuario.
5. Marca la iteración como «Implementada; pendiente de aprobación del usuario» en `plan-iteraciones.md` y haz commit `Iteración $ARGUMENTS · cierre`.
6. Resume para el usuario: HU cubiertas, HU que quedaron fuera y por qué, pendientes de interfaz y decisiones relevantes para la tesis. No hagas push.
