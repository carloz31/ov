# Decisiones de la spec en curso

<!-- Spec en curso: F00 · Base sobre `ruta` (docs/specs/F00.md). -->

- **Camino = espacio MISIONES_CAMPO.** El front ya no busca un bloque `CAMINO`: `bloquesZona(bloques, 'CAMINO')` reúne T0, T1 y T2, y el tramo del mapa es el `numero` de cada bloque. Así el Camino crece con la ruta real sin cambiar el front.
- **Avance solo con requeridas.** `progresoBloque` y `progresoCamino` descartan `requerida === false`; un fixture antiguo sin el campo se trata como requerido.
- **Contenido sin nodos = solo posición.** Un `t_*.json` con `nodos: []` dibuja su punto, pero `actividadPorContenido` no lo devuelve: no se abre por URL ni desde el drawer, que usa «Contenido pendiente» (lo que ya existía en `pointDetails`).
- **Cuestionario con plantilla.** Un nodo `item` con `itemId: "plantilla"` se repite con los ítems del servidor (`cuestionarioServidor`). El reproductor de Mara lo usa sin consultar el resultado RIASEC; act-tip conserva su camino. El Camino monta ese reproductor para los cuestionarios.
- **Drawer de actividades de `ruta`.** Las actividades sin marcador propio de `plataforma` usan `detallesRuta`: título, tipo, duración y descripción del servidor (o del contenido si vienen nulas).
- **`TipoObjetivo`** suma `SECCION`, `SECCION_PLAN` y `CONVERSACION`, que el backend ya envía.
- **Pruebas adaptadas** (autoriza la spec: se retiran `resultados_generados` y los textos propios de requisito):
  - `servidor-cierre`, `servidor-resultados` y `servidor-mara-ayudas` ya no esperan el aviso del libro tras act-tip-14 (vuelve en F03);
  - `servidor-adaptadores` y `servidor-logros` ya no esperan «X de 9»;
  - `tests/local/actividades/contenidos` pasa de 13 a 31 archivos, porque se agregan los `t_*.json`.
- **Pruebas que siguen en los fixtures de `plataforma`** hasta su lote:
  - Mara, sus fichas y su cierre (`servidor-cierre`, `servidor-servicios`, la secuencia de `servidor-mapa` y el test de Mara de `servidor-adaptadores`), hasta F03;
  - el portal del apoderado (`servidor-apoderado`): `t-apo-1` no tiene contenido en el front, hasta F08;
  - el catálogo de insignias de `servidor-logros`: compara códigos I1–I10 con su contenido local, y `ruta` solo tiene `t-ins-1`.
