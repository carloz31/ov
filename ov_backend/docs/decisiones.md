# Decisiones de la spec en curso

<!-- Spec en curso: docs/specs/F03-revelado-libro.md (ajuste posterior a F03). -->

- **Número de partes antes de revelar la partida.** Con la partida lista para revelar, `cargarInstrumentos` pide además el catálogo (`/instrumentos`) y guarda cuántas dimensiones tiene `TEST-PARTIDA-LLEGADA` (`partesPartida`). Si el catálogo no responde, el libro carga igual y la línea dice «tu zona en cada parte de tu camino.».
- **Textos del revelado.** Nombres cortos («tu punto de partida», «tu código de interés»…) y líneas «Adentro:» son texto de pantalla del front, en `features/discovery/data/revealTexts.ts`. El de habilidades sociales es provisional (`TEXTO PROVISIONAL`), para que el usuario lo redacte.
- **Sello ocupado.** El sello es un `<button>` con `aria-disabled` (no `disabled`) mientras revela o si el revelado está bloqueado: se ve igual, sigue enfocable y no responde al clic.
- **Llegada lista.** Ocupa la tarjeta como el primer revelado: sin resumen de zonas ni «Ver resultado completo» hasta romper el sello; la vista explicada de la partida sigue en su ruta.
