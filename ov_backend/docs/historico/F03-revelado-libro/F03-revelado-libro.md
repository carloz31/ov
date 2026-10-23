# F03 · Patrón común de revelado en las tarjetas del libro de Helena

22 de octubre de 2026. **Ajuste posterior a F03.** Las cuatro páginas del libro. No toca el backend ni la lógica de revelado; solo la presentación de la tarjeta en estado «lista para revelar», la entrada del contenido tras revelar, la alineación de las tarjetas descifradas y los chips de alcance.

## 1. Una sola tarjeta de revelado para todos los cuestionarios

El cuerpo de la tarjeta es un bloque claro que contiene:

- El sello grande (~132 px) como `<button>` con `aria-label="Romper el sello"`. Es la única acción; se quita el botón separado «Romper el sello». Brillo dorado suave alrededor; sin parpadeo. Mientras revela, se ve igual (sin atenuar) y no responde al clic.
- El texto de Helena: «Helena terminó de leer tus respuestas. Rompe el sello para descubrir {nombre corto del resultado}.»
- Una línea «**Adentro:** …», específica por instrumento:
  - Partida y llegada (partida): «tu zona en las 5 partes de tu camino.»
  - Partida y llegada (llegada): «cómo cambió cada parte desde tu partida.»
  - Intereses: «tu código de interés y las ocupaciones que se le parecen.»
  - Inteligencias: «tus formas de ser inteligente más desarrolladas.»
  - Habilidades sociales: texto provisional, marcado para que el usuario lo redacte.
- Cierre: «Toca el sello para romperlo».

El número de partes sale del backend (dimensiones del catálogo antes de revelar la partida; del resultado de la partida para la llegada). Los nombres cortos del resultado y las frases son texto de pantalla del front.

## 2. Llegada lista

Ocupa todo el card, igual que el primer revelado, y ya no es un bloque al pie. Cabecera «Página I · tu llegada está lista»; texto «Helena leyó tus respuestas del cierre. Toca el sello para ver cómo llegaste.»; el ícono del sello es el banderín (mismo SVG que `ZonePath`).

## 3. Después de romper el sello

Se mantiene la animación actual del sello. Al terminar, el contenido entra escalonado (~150 ms entre elementos): las zonas de las cinco partes en partida y llegada, las letras del código en intereses, las inteligencias destacadas en inteligencias. Con `prefers-reduced-motion`, sin animación.

## 4. Tarjeta lista para revelar en el libro

Borde dorado suave para distinguirla de las descifradas (también con la llegada lista).

## 5. Alineación en las tarjetas descifradas

Regla por ancho. En tarjeta ancha, nombre y chips en la misma línea (nombre a la izquierda, chips a la derecha). En tarjeta angosta (celular), nombre arriba y chips debajo, alineados a la derecha. Chips de 12 px. El nombre nunca pasa de dos líneas.

## 6. Chips de alcance

«Para tu proyecto» pasa a chip lleno (fondo verde oscuro, texto blanco) con el ícono de banderín (mismo SVG que `ZonePath`); «Opcional» pasa a chip con solo borde punteado gris, ícono de brújula y texto «Opcional · si quieres». Un componente común `ScopeChip` con las dos variantes, usado en las cuatro tarjetas y en sus estados de revelado.

Si un instrumento es prioritario u opcional lo decide el backend (`SalonInstrumento`), pero hoy no lo entrega al estudiante: el chip usa el valor actual del front y queda como pendiente del backend (exponer `prioritario` por instrumento en `AvanceInstrumento` o `/instrumentos`, en un lote B pequeño). Partida y llegada siempre es «Para tu proyecto».

## 7. Modo local

Las tarjetas son las mismas en local: el cambio se aplica en ambos modos como excepción aprobada al modo local congelado (excepción 8 en `ov_frontend/AGENTS.md`).

## 8. Pruebas

Estados de revelado de partida, llegada e intereses; el sello accesible por teclado (`<button>` con su `aria-label`, deshabilitado mientras revela); `ScopeChip` en sus dos variantes.
