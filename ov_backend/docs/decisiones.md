# Decisiones de la spec en curso

<!-- Spec en curso: docs/specs/F03-revelado-libro.md (ajuste posterior a F03). -->

- **Número de partes antes de revelar la partida.** Con la partida lista para revelar, `cargarInstrumentos` pide además el catálogo (`/instrumentos`) y guarda cuántas dimensiones tiene `TEST-PARTIDA-LLEGADA` (`partesPartida`). Si el catálogo no responde, el libro carga igual y la línea dice «tu zona en cada parte de tu camino.».
- **Textos del revelado.** Nombres cortos («tu punto de partida», «tu código de interés»…) y líneas «Adentro:» son texto de pantalla del front, en `features/discovery/data/revealTexts.ts`. El de habilidades sociales es provisional (`TEXTO PROVISIONAL`), para que el usuario lo redacte.
- **Sello ocupado.** El sello es un `<button>` con `aria-disabled` (no `disabled`) mientras revela o si el revelado está bloqueado: se ve igual, sigue enfocable y no responde al clic.
- **Llegada lista.** Ocupa la tarjeta como el primer revelado: sin resumen de zonas ni «Ver resultado completo» hasta romper el sello; la vista explicada de la partida sigue en su ruta.
- **Prioritario.** `ScopeChip` refleja el valor actual del front (`required` de cada página; partida y llegada, siempre «Para tu proyecto»). Que el backend lo exponga al estudiante queda como lote B18 en `plan-iteraciones.md` (pendiente del backend, no de interfaz).
- **Modo local.** El revelado común, la entrada escalonada y los chips se aplican también en local: excepción 8 en `ov_frontend/AGENTS.md`.
- **Alineación por ancho.** Con la tarjeta de más de 440 px, nombre y chips en la misma línea; con menos (consulta de contenedor), nombre arriba y chips debajo, alineados a la derecha en las mismas columnas. Chips de 12 px y nombre recortado a dos líneas.
- **Entrada escalonada.** El hook recuerda la página recién revelada (`entrando`); la tarjeta lleva `sx-d-helena-entrando` y el CSS retrasa cada fila 150 ms tras los 0,4 s del sello, solo con `prefers-reduced-motion: no-preference`. Sin cambios de marcado en las filas.
