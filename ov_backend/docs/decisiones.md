# Decisiones de la spec en curso

## Ajuste carga-instrumentos

- F1 · Modelo: `instrumento.lectura` (Text, `server_default ''` solo para la migración), `dimension.ejemplos` (Text nulo), `dimension.fortalezas` y `dimension.desarrollo` (listas JSON con `CheckConstraint` de lista), y se quita `resultado_dimension.porcentaje`: el 0–100 es presentación y se deriva al consultar (migración 0040; el downgrade lo recalcula con 2 decimales).
- F1 · `puntaje_visual(valor, mínimo, máximo)` en `calculo.py` reemplaza a `calcular_porcentaje` y a `puntaje_ocupacion_porcentaje`; usa `Decimal` con `ROUND_HALF_UP`. El mínimo de la dimensión sale de la caché de definiciones (suma de los mínimos de la escala de cada ítem), sin consultas nuevas. La validación de límites queda en `_validar_dimension`.
- F1 · `lectura` también va en la respuesta de `/comparacion`, que es la que pinta la vista de partida y llegada; `ComparacionDimension` no recibe las piezas nuevas (partida y llegada no las tiene).
- F1 · La prueba de historial marcaba cada resultado con `porcentaje=n`; ahora lo marca con `puntaje=n`, porque el porcentaje ya no se guarda.
- F1 · El contrato del front se actualiza en el mismo commit (tipos, adaptador y `ResultNode` leen `puntaje_visual`); la presentación sin «%» y las vistas nuevas son de F3.
- F1 · El detalle de ocupación del psicólogo pasa de E 27 a E 28: 2,65 en la escala 1–7 da exactamente 27,5 y `ROUND_HALF_UP` sobre el decimal lo sube (antes el error de coma flotante lo dejaba en 27,4999…). La prueba se adapta.
- F1 · La prueba de migración desde 0001 deja de comparar `resultado_dimension` (sin filas allí), como ya hacía con las tablas cuyas columnas cambian.
- F1 · El fixture de raíz `ov_frontend/tests/fixtures/servidor/resultado-riasec.json` (congelado, sin generador, lo usan las pruebas de Mara) se transformó con un script de una vez: `porcentaje` → `puntaje_visual` entero y los campos nuevos vacíos (`lectura`, `ejemplos`, `fortalezas`, `desarrollo`). Es una excepción aprobada por el usuario a «nunca se editan a mano»; no cambia ningún otro dato.
- F1 · En el front, la prueba de `areasRiasec` leía `d.porcentaje`; ahora lee `d.puntaje_visual` (adaptación que autoriza la spec).
