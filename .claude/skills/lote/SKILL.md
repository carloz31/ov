---
name: lote
description: Planificar e implementar un lote de historias de usuario del plan de iteraciones (por ejemplo, /lote 2B).
argument-hint: <id del lote>
disable-model-invocation: true
---

Lote a trabajar: $ARGUMENTS

## 1. Preparar (sin escribir código)

1. Lee en `ov_backend/docs/plan-iteraciones.md` la sección «Enfoque», la fila del lote en «Lotes» (o en «Lotes F»), su apartado en «Qué hace cada lote» (o «Qué hace cada lote F», más «Punto de partida» y «Reglas propias de los lotes F») y las filas de «Ruta mínima de prueba» marcadas con el lote. Nada más del plan.
   Lee en `ov_backend/docs/requisitos.md` solo las filas de las HU del lote (y los RNF o términos que nombren).
2. Si `ov_backend/docs/specs/` tiene una spec en curso de otro lote, detente y avisa.
3. Crea la rama `lote/$ARGUMENTS` desde `main`.
4. Explora solo lo necesario: qué existe ya en el backend para estas HU (`app/api`, `app/services`, `app/models` del dominio) y qué vistas del front las tocan. Usa Grep antes de abrir archivos.

## 2. Plan (en modo plan, para que el usuario lo apruebe)

El plan es corto y concreto:

- **HU y criterio de hecho** de cada una, en una línea, con el texto de `docs/requisitos.md`.
- **Modelo de datos:** tablas o columnas nuevas o cambiadas. Si hay cambios, márcalos como decisión de diseño a aprobar.
- **Backend:** endpoints (método, ruta, respuesta), servicios y pruebas nuevas.
- **Datos:** qué entra en `datos/fijos.py` y qué en `datos/ruta.py` (solo lo mínimo para probar la mecánica, marcado `DATO DE PRUEBA`).
- **Frontend:** solo en los lotes F. En los lotes B no se toca el front: se exportan los fixtures `ruta-*`.
- **Pantallas (lotes F):** por cada vista que cambia, qué elementos, textos y componentes reutiliza (boceto si es nueva); qué entradas de `ov_frontend/docs/pendientes-interfaz.md` cierra; qué `t_*.json` crea. Lo nuevo solo en modo `api` (local congelado).
- **Ajustes al backend (lotes F):** lo que la interfaz necesita y el backend no entrega. Si cambia el modelo, el lote es **M** y sigue `/cambio-modelo`.
- **Fases**, en orden, cada una cerrable con pruebas en verde.
- **Preguntas abiertas**, si las hay (máximo 3).

## 3. Implementar

1. Guarda el plan aprobado como `ov_backend/docs/specs/$ARGUMENTS.md` (sin cambios de contenido).
2. Por fase: implementa → pide al subagente `pruebas` las carpetas de impacto → corrige → commit `Lote $ARGUMENTS · F<n>: <qué>`.
3. Si cambias el modelo, sigue `/cambio-modelo`.
4. Al terminar todas las fases, pide a `pruebas` la suite completa de ambos repos (política «Al cerrar una spec»).
5. Cierra la spec según «Documentación» del `AGENTS.md` raíz y marca el lote como «Implementado» en `plan-iteraciones.md`.
6. Resume en 5–8 líneas: qué HU quedaron, qué decisiones se tomaron, qué quedó en `pendientes-interfaz.md`. No hagas push.
