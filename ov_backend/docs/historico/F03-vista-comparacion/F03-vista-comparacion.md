# F03 · Vista de resultados del cuestionario de partida y llegada (COMPARACION)

22 de octubre de 2026. **Ajuste posterior a F03**, ya implementado y probado: rehace la tarjeta de la página I y la vista explicada de partida y llegada que dejó F03 con un planteo básico. No cambia el backend ni el flujo de revelado (sellos, recargas, T2). Boceto aprobado en el canvas «Partida y llegada · resultados» (tres artboards: tarjeta del resumen, detalle completo, detalle solo partida).

## 0. Punto de partida

Antes de cambiar nada, revisa lo que F03 dejó en el código: la rama `COMPARACION` de `TipoResultadoHelena`, `resultPages`, `useResultPage` y `HelenaResultView`, la tarjeta de la página I y `DimensionSummaryRow`. Reutiliza lo que ya funciona (datos, estados, recargas) y cambia solo la presentación según esta spec. Si algo de la spec choca con lo implementado, o un dato que pide la spec no llega del backend, detente y avisa antes de inventarlo.

## 1. Alcance

Dos pantallas del libro de Helena para el instrumento `TEST-PARTIDA-LLEGADA` (tipo de resultado `COMPARACION`), para el estudiante:

- **Tarjeta del resumen** (página I del libro).
- **Vista explicada** (`/student/profile/helena/:pagina`), que vive en la página de partida y llegada. La comparación se muestra ahí; no hay vista aparte.

Ambas tienen **dos estados**:

| Estado | Condición | Datos |
|---|---|---|
| Solo partida | Resultado vigente de `APL-PARTIDA`; `APL-LLEGADA` sin resultado | Zonas de partida por dimensión y respuestas de partida ítem por ítem |
| Completo | Resultado vigente de `APL-PARTIDA` y de `APL-LLEGADA` | `/comparacion`: por dimensión zona de partida, zona de llegada y actividades completadas de su temática; ítems anidados con el texto de la opción en partida y llegada |

Nunca llegan puntajes ni diferencias; la rama no debe leer `puntaje`, `porcentaje` ni `diferencia` (vienen en `null` o no vienen).

Fuera de alcance: orientadora y apoderado (partida y llegada no está en `SALON_INSTRUMENTOS`).

## 2. Qué manda el backend y qué es texto del front

Del backend: nombre y descripción del instrumento, nombre, descripción y temática de cada dimensión, zona por dimensión (código `FUERTE | EN_CAMINO | POR_TRABAJAR`), enunciado de cada ítem, etiqueta de la opción elegida en cada aplicación, conteo de actividades completadas por temática.

Del front (texto de pantalla, igual que cualquier etiqueta; **no va a `pendientes-interfaz.md`**): etiquetas de las zonas en palabras (`Por trabajar`, `En camino`, `Fuerte`), «Se mantuvo», «Igual», «Al inicio», «Al cierre», «Al final», «Donde empezaste», «Donde estás hoy», los contadores de la síntesis, el aviso neutro de una dimensión que baja, el bloque sellado de la llegada y los textos de cabecera. Si F03 ya anotó alguno de estos en `pendientes-interfaz.md`, retíralo de ahí.

El orden de las zonas es fijo: Por trabajar → En camino → Fuerte (de izquierda a derecha).

## 3. Tarjeta del resumen (página I)

Misma estructura que las otras tarjetas: cabecera, título «Tu punto de partida y llegada», chip «Para tu proyecto» + «Cómo te sientes frente a tu futuro», bloque «En tu resultado completo», botón **«Ver resultado completo ›»** (no «Ver comparación») y enlace «¿Qué significa cada zona?».

- **Se quitan las letras A–E** delante de las dimensiones: chocan con el código RIASEC de la página de al lado.
- Lista de las cinco dimensiones (orden del backend), una línea cada una: nombre a la izquierda, zona a la derecha.

**Estado solo partida**
- Cabecera: `Página I · descifrada · falta la llegada`.
- Subtítulo de la lista: «Tu punto de partida». Cada dimensión muestra un chip neutro con su zona.
- Debajo de la lista, bloque con borde punteado e ícono de candado: «**Tu punto de llegada** se revela al final del camino, cuando vuelvas a responder.»
- «En tu resultado completo»: «Tus respuestas, parte por parte» · «Qué significa cada zona».

**Estado completo**
- Cabecera: `Página I · descifrada`.
- Subtítulo: «Tu partida → tu llegada».
- Si la zona cambió: chip neutro de partida, flecha, chip resaltado (azul oscuro) de llegada. Si no cambió: texto «Se mantuvo» + un solo chip neutro. Nunca «Por trabajar → Por trabajar».
- Debajo: «Avanzaste de zona en N de 5 partes. Son zonas, no notas: muestran dónde estás hoy.» (N = dimensiones cuya zona de llegada es mayor que la de partida).
- «En tu resultado completo»: «Qué cambió en cada respuesta» · «Lo que trabajaste en cada parte del camino».

Revisar el contador global «N de 4 páginas descifradas»: la página I cuenta como descifrada desde la partida.

## 4. Vista explicada

Misma estructura que la vista de intereses: cabecera + panel oscuro de síntesis + sección crema «Paso 1».

### 4.1 Cabecera
`Página I · descifrada · Cómo te sientes frente a tu futuro`, título, y párrafo:
- Completo: «Helena leyó cómo te sentías al empezar el camino y cómo te sientes al llegar. Son zonas, no notas: muestran dónde estás hoy y qué puedes seguir trabajando.»
- Solo partida: «Helena leyó cómo te sientes al empezar el camino. Son zonas, no notas: muestran desde dónde partes. Al final volverás a responder y verás qué cambió.»

### 4.2 Panel oscuro (dos columnas; se apilan en móvil)

**Izquierda · síntesis**
- Completo: rótulo «Tu recorrido»; frase «Avanzaste de zona en N de las 5 partes de tu camino.»; chips «N avanzaron» y «M se mantuvieron o cambiaron»; párrafo «Lo que más cambió fue {dimensiones que subieron, en negrita}. Abajo puedes ver, respuesta por respuesta, qué cambió.»; nota «Las zonas no te califican: son pistas para tu próximo paso.»
- Solo partida: rótulo «Tu punto de partida»; frase «Así empiezas el camino.»; chips con el conteo por zona («1 en camino», «4 por trabajar»); párrafo «Empezar con varias partes por trabajar es lo más común: para eso es el camino. Cada actividad te ayuda con alguna de ellas.»; bloque sellado con candado: «Tu punto de llegada — Se revela al final del camino. Entonces verás, parte por parte y respuesta por respuesta, qué cambió.»

**Derecha · «El camino de cada parte»** (equivale a las barras de porcentaje de intereses)
- Botón «ⓘ ¿Qué significa cada zona?» (mismo comportamiento que «¿Qué significa cada tipo?» en intereses).
- Rejilla: columna de nombres de 240 px + tres columnas iguales con cabecera «Por trabajar · En camino · Fuerte». Scroll horizontal en móvil.
- Una fila por dimensión: un **mini camino** de tres paradas (círculos) unidas por un tramo. Las paradas entre la zona de partida y la de llegada (inclusive) y el tramo entre ellas van en dorado; el resto en gris azulado.
- **Banderín vacío** (solo contorno) en la parada de partida; **banderín lleno** en la de llegada. Si se mantuvo, los dos banderines quedan juntos en la misma parada, sin símbolo especial. Si bajó, el lleno queda a la izquierda del vacío y el tramo se ilumina igual.
- Solo partida: un solo banderín (vacío) y ningún tramo iluminado.
- Leyenda debajo: «Donde empezaste» (banderín vacío) · «Donde estás hoy» (banderín lleno) · «Si los dos banderines están juntos, te mantuviste en la misma zona.» En solo partida: «Donde empiezas» · «El banderín de llegada aparecerá al final del camino.»
- Los banderines son SVG inline, reutilizando el que ya usa el mapa si existe.

### 4.3 Sección crema · «Paso 1 · Tus respuestas»
- Título completo: «Qué cambió, respuesta por respuesta»; subtítulo «En cada parte verás primero las respuestas que cambiaron. Las que se mantuvieron quedan plegadas al final.»
- Título solo partida: «Lo que respondiste al empezar»; subtítulo «Tus respuestas, parte por parte. Al final del camino podrás compararlas con las de tu llegada.»
- Una **tarjeta por dimensión** (orden del backend), con: «Parte n de 5», nombre, descripción; a la derecha la zona con los mismos chips de la tarjeta del resumen y, en completo, «Completaste N actividades de esta parte».
- Si en completo la zona de llegada es **menor** que la de partida: aviso neutro dentro de la tarjeta, mismo color que el resto: «**Ahora lo ves distinto.** Al conocerte más, a veces notas lo que aún te falta descubrir. No es un retroceso: es una pista para seguir explorando.»
- **Rejilla de ítems**, única para todos los bloques: `enunciado | Al inicio (150 px) | flecha (28 px) | Al cierre (150 px)`, con cabecera de columnas. Scroll horizontal en móvil.
  - Completo, ítems que cambiaron (primero, orden del backend): chip neutro con la etiqueta de partida, «→», chip resaltado con la etiqueta de llegada.
  - Completo, ítems que se mantuvieron: plegados en un `details` «N respuestas se mantuvieron» (singular «1 respuesta se mantuvo»); cada fila repite la rejilla con el chip de partida, «=» y un chip con borde «Igual». Si ningún ítem cambió: «En esta parte respondiste lo mismo al inicio y al cierre.»
  - Solo partida: todos los ítems, sin plegar; columna «Al inicio» con la respuesta, flecha atenuada y chip punteado atenuado «Al final» en la columna «Al cierre».
- Los ítems inversos se muestran igual que los demás, con la etiqueta elegida; no se marcan.

## 5. Componentes

- Se mantiene la rama `COMPARACION` que dejó F03 en `TipoResultadoHelena`, `resultPages`, `useResultPage` y `HelenaResultView`; solo cambia lo que pinta. Sigue sin usar `InterestCode`, `DimensionProfile`, ocupaciones ni carreras.
- Nuevo `ZoneChips` (chip de zona / par partida→llegada / «Se mantuvo»), usado en la tarjeta del resumen y en la vista explicada.
- Nuevo `ZonePath` (mini camino con banderines) para el panel oscuro.
- Nuevo `ItemComparisonGrid` para la rejilla de ítems, con los tres modos (cambió, se mantuvo, solo partida).
- Si F03 extendió `DimensionSummaryRow` con la forma «partida → llegada» y esa vista ya no la usa, quita la extensión; no debe cambiar lo que muestra para intereses.
- Las zonas llegan como código y el front las mapea a etiqueta y a posición (0, 1, 2).

## 6. Criterios de aceptación

- [ ] Con solo la partida revelada, la tarjeta y la vista explicada muestran el estado «solo partida» (bloque sellado, un banderín, chips «Al final»).
- [ ] Con la llegada revelada, muestran el estado completo: contadores, mini caminos con dos banderines, ítems cambiados primero y los iguales plegados.
- [ ] Una dimensión que baja se muestra con el mismo color y el aviso neutro.
- [ ] La rama COMPARACION no lee puntajes, porcentajes ni diferencias.
- [ ] Las letras A–E ya no aparecen en la tarjeta; el botón dice «Ver resultado completo».
- [ ] Las columnas de la rejilla de ítems coinciden entre los bloques «cambiaron» y «se mantuvieron».
- [ ] En móvil, el panel se apila y las rejillas tienen scroll horizontal sin romper el layout.
- [ ] La vista de intereses (página II) y el revelado de F03 siguen igual; las suites siguen en verde.
- [ ] Fixtures: `ruta` con solo partida y con partida + llegada, incluida una dimensión que baja y una dimensión sin cambios en ningún ítem.
