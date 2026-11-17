# Ajuste · mapa-celular

## Contexto

En celular, al desbloquearse una misión adicional la imagen de fondo del mapa «desaparece» a pedazos y todo se pone lento; el arrastre del mapa también va pesado. La causa probable es que el lienzo del mapa es una sola capa de 5016×2823 px (la imagen ×3, reducida con `scale`, con `will-change: transform`) y dentro lleva efectos que obligan a repintarla: desenfoque de fondo en cada etiqueta, sombra sobre el SVG de las líneas y halos que animan `box-shadow`. Al revelar se suman una máscara animada del tamaño del lienzo y un zoom animado de toda la capa. Además, cada `pointermove` del arrastre hace un `setState` que re-renderiza el lienzo entero.

El usuario aprobó A y B, cada uno en su commit para poder revertirlo; C queda pendiente para después de las pruebas con usuarios del 18 y 19 de noviembre.

- Rama nueva `ajuste/mapa-celular` desde `main`, aparte de `ajuste/recorte-bloque0`.
- Spec `ov_backend/docs/specs/ajuste-mapa-celular.md` (este plan).
- Sin cambios de modelo, backend, contenido ni textos. No cambia el marcado de ningún componente: las pruebas de render comparan HTML.

## A. Efectos del mapa (CSS y encuadre). Commit 1

**Sin cambio visible en computadora**, en todos los dispositivos:

1. **Halo de la adicional disponible** (`src/styles/student/reflection.css`). Hoy anima `box-shadow` sin fin sobre `.sx-node-circle`, lo que repinta la capa del mapa en cada cuadro. Pasará a animar solo `opacity` y `transform` del `::before` del círculo, con la sombra fija dentro del pseudo-elemento: se ve igual y lo compone la tarjeta gráfica. La regla excluye `[data-recommended]`, que ya usa ese `::before`.
2. **Anillo del revelado** (`reflection.css`, `sx-extra-ring`). Hoy anima `inset` de −4 px a −55 px, lo que recalcula el layout en cada cuadro. Pasará a fijar `inset: -55px` y animar `transform: scale(0.59 → 1)` con `opacity`: el mismo recorrido. El borde arranca un poco más fino, casi imperceptible en 0,5 s.
3. **Máscara del revelado** (`src/features/adventure/components/MapPath.tsx`). Hoy mide todo el lienzo (5016×2823). Pasará a medir solo el rectángulo de la línea más un margen del grosor del trazo: se ve igual y el área que se repinta es mínima. Cambian los atributos `x`, `y`, `width` y `height` del `<mask>`; el resto del marcado no cambia.

**Solo en pantallas táctiles**, dentro de `@media (pointer: coarse)`. En computadora el mapa se ve igual que hoy:

4. **Etiquetas de los nodos** (`.sx-map-node .sx-node-label`, en `student-base.css`): sin `backdrop-filter` y con fondo sólido (el color de `--card`). Las adicionales ya tienen fondo blanco.
5. **Líneas del camino** (`.sx-map-path`): sin `filter: drop-shadow`.
6. **Cabecera, panel y controles**: sin `backdrop-filter` y con fondo opaco del mismo tono. Son `.sx-map-header`, `.sx-adventure-panel`, `.sx-panel-toggle` y los controles del mapa (`.sx-map-controls` / `.sx-zoom-controls`, si llevan desenfoque).
7. **Encuadre del revelado sin zoom** (`src/features/adventure/components/MapCanvas.tsx`, `framePoints`). Hoy calcula una escala nueva para que entren el origen y la nueva misión, y anima el zoom de toda la capa. En táctil (`matchMedia('(pointer: coarse)')`) pasará a conservar la escala actual y solo desplazar el mapa hasta centrar las dos, con la misma transición. En computadora sigue igual.

**Se queda igual:** la animación de aparición del nodo (`sx-extra-pop`, 0,4 s una vez), la estrella, el desenfoque de la Ciudad bloqueada y los demás `sx-glass` fuera del mapa.

## B. Arrastre y memoización (solo la parte segura). Commit 2

1. **Un movimiento por cuadro** (`src/features/adventure/hooks/useArrastreMapa.ts`). Hoy cada `pointermove` llama a `apply`, que lee `getBoundingClientRect`, hace `setState` y re-renderiza. Pasará a guardar la última posición y aplicarla una sola vez por cuadro con `requestAnimationFrame`. Al soltar, la posición pendiente se aplica de inmediato; al desmontar, el cuadro se cancela. La posición sigue en el estado de React (`apply` no cambia) y no se escribe el transform directo en el elemento.
2. **Nodos memoizados** (`MapNode.tsx` con `memo`). Para que el `memo` sirva, `MapCanvas` les pasa callbacks estables:
   - `onFocus` deja de ser una función nueva por nodo en cada render: pasa a ser un `useCallback` que lee puntos y panel desde una ref.
   - `onSelect` se envuelve en un callback estable que llama al último `onSelect` recibido, guardado en una ref.
   - También se memoizan `MapPath` y `BlockSign`: durante el arrastre sus props (`points`, `mapSize`) no cambian, y el SVG de las líneas es lo más costoso de volver a pintar.

## C. Pendiente, no se hace ahora

Reducir el lienzo de 3× a 1× (posiciones y tamaños de nodos, etiquetas y líneas a la escala de la imagen). Es el arreglo de fondo para la memoria gráfica, pero es riesgoso antes de las pruebas. Queda anotado en la spec y en `decisiones.md` como pendiente para después del 19 de noviembre.

## Documentos

- `ov_frontend/AGENTS.md`, «Excepciones al modo local congelado»: una frase con esta excepción. Son cambios solo visuales y de rendimiento, en ambos modos, pedidos por el usuario; en computadora no cambia nada.
- `ov_backend/docs/decisiones.md`: una viñeta por cada una de estas decisiones:
  - los cambios de aspecto solo con `(pointer: coarse)`;
  - en táctil, el encuadre sin zoom;
  - en B, `requestAnimationFrame` con la posición en el estado de React;
  - C pendiente.

## Archivos que se tocan

| Commit | Archivos |
|---|---|
| A | `src/styles/student/reflection.css`, `src/styles/student/student-base.css`, `src/features/adventure/components/MapPath.tsx`, `src/features/adventure/components/MapCanvas.tsx` (`framePoints`) |
| B | `src/features/adventure/hooks/useArrastreMapa.ts`, `src/features/adventure/components/MapNode.tsx`, `MapPath.tsx`, `BlockSign.tsx`, `MapCanvas.tsx` (callbacks estables) |
| Cierre | `ov_backend/docs/specs/ajuste-mapa-celular.md`, `ov_backend/docs/decisiones.md`, `ov_frontend/AGENTS.md` |

## Pruebas

- Tras A y tras B: `tests/local/aventura`, `tests/servidor/mapa` y `tests/servidor/logros` (tabla de impacto de `features/adventure/`).
- Al cerrar: `npm test`, `npm run build`, `npm run lint` y `npm run check:estructura`.
- Si una prueba de render o de mapa falla, me detengo y aviso; no adapto pruebas.
- En el navegador de la app:
  - en tamaño celular, un desbloqueo de opcional con Ana: se desplaza sin zoom, el halo late y el anillo se expande;
  - en escritorio: el mapa se ve igual que antes, con etiquetas translúcidas y sombra en las líneas.

## Cómo probarlo en tu celular (lo detallo al terminar)

- Antes, en `main` o en la rama del recorte, y después, en `ajuste/mapa-celular`:
  1. Completar una misión que abra una adicional.
  2. Volver al Camino y mirar si el fondo se borra a pedazos durante el revelado y si el revelado va a tirones.
  3. Arrastrar el mapa con el dedo varias veces rápido y ver si sigue al dedo.
  4. Dejar el mapa quieto con una adicional disponible y ver si el resto se mueve fluido.
- El front tiene que verse desde el celular en la misma red: `npm run dev -- --host` y abrir la IP de la PC.
