---
name: ajuste
description: Planificar e implementar un ajuste sobre algo ya implementado (una pantalla, un cálculo, una regla) a partir de un texto de observaciones del usuario, como fase nueva de la spec en curso (por ejemplo, /ajuste panel-avance-tramos).
argument-hint: <nombre-corto-del-ajuste>
disable-model-invocation: true
---

Ajuste a trabajar: $ARGUMENTS

Un ajuste no es un lote: no tiene fila en `plan-iteraciones.md` ni HU propias. Parte de un texto de observaciones que el usuario pega en el chat o adjunta como `.md`, y corrige o amplía algo que ya existe.

## 1. Preparar (sin escribir código)

1. Lee el texto de observaciones completo. Si no hay ninguno en la conversación, pídelo y detente.
2. Busca la spec en curso en `ov_backend/docs/specs/`:
   - una: el ajuste se agrega a ella como una fase nueva;
   - ninguna: el ajuste tendrá su propia spec `ov_backend/docs/specs/ajuste-$ARGUMENTS.md`;
   - más de una: detente y avisa.
3. Lee `ov_backend/docs/decisiones.md` (decisiones de la spec en curso) y el documento vigente de `ov_backend/docs/sistema/` del dominio que toca el ajuste. Si toca el front, lee la parte que corresponda de `ov_frontend/AGENTS.md`. Nada más.
4. Crea la rama `ajuste/$ARGUMENTS` desde `main`.
5. Explora solo lo que el ajuste nombra: dónde está hoy lo que cambia (`app/services`, `app/api`, `app/schemas`, vistas y hooks del front). Usa Grep antes de abrir archivos. Anota qué hace hoy el código en el punto que se ajusta: el plan debe decir «hoy hace X, pasará a hacer Y» con archivos y funciones reales.

## 2. Plan (en modo plan, para que el usuario lo apruebe)

El plan es corto y concreto. Lo que el texto de observaciones ya decide no se vuelve a discutir; lo que no define se propone como la opción más simple.

- **Qué cambia y por qué:** en una o dos líneas por punto, «hoy / pasará a», con el archivo y la función.
- **Qué no cambia:** lo que un lector podría creer afectado y no lo está (otros cálculos parecidos, otras vistas, el motor). Nombrarlo evita que la implementación lo «unifique» de paso.
- **Modelo de datos:** sin cambios, o las tablas o columnas nuevas o cambiadas marcadas como decisión de diseño a aprobar (y entonces el ajuste sigue `/cambio-modelo`).
- **Backend:** endpoints (método, ruta, respuesta), servicios y pruebas nuevas o adaptadas. Una prueba existente solo se adapta si el texto de observaciones lo autoriza; si no, se corrige la implementación.
- **Datos:** qué cambia en `datos/fijos.py` y `datos/ruta.py` (solo lo mínimo, marcado `DATO DE PRUEBA`) y si hay que regenerar fixtures del front.
- **Frontend:** vistas, hooks y tipos que cambian; el modo local sigue congelado salvo que el texto diga lo contrario.
- **Fases**, en orden, cada una cerrable con pruebas en verde. Normalmente: backend → front → cierre.
- **Preguntas abiertas**, si las hay (máximo 3).

## 3. Implementar

1. Guarda el plan aprobado, sin cambios de contenido, como sección `## Ajuste · $ARGUMENTS` al final de la spec en curso, o como `ov_backend/docs/specs/ajuste-$ARGUMENTS.md` si no había ninguna.
2. Por fase: implementa → pide al subagente `pruebas` las carpetas de impacto → corrige → commit `Ajuste $ARGUMENTS · F<n>: <qué>`.
3. Si cambias el modelo, sigue `/cambio-modelo`.
4. Si el backend entrega un dato que ninguna vista muestra, o una vista necesita un dato que el backend no entrega, y el plan no lo autoriza, no lo inventes: regístralo en `ov_frontend/docs/pendientes-interfaz.md` y avisa.
5. Al terminar todas las fases, pide a `pruebas` la suite completa de ambos repos.
6. Anota en `ov_backend/docs/decisiones.md` cada decisión del ajuste (una viñeta: qué y por qué) y actualiza el documento vigente de `docs/sistema/` solo en lo que cambió.
7. No cierres la spec: el ajuste la deja en curso. Cerrarla (mover a `docs/historico/`, incorporar lo vigente a `AGENTS.md`) es una decisión del usuario, según «Documentación» del `AGENTS.md` raíz.
8. Resume en 5–8 líneas: qué cambió, qué decisiones se tomaron, qué quedó en `pendientes-interfaz.md`, qué queda abierto. No hagas push.
