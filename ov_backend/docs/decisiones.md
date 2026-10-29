# Decisiones de la spec en curso

## B13 · Investigaciones y entrevistas

- **Modelo nuevo** (aprobado en el plan): `investigacion`, `pregunta_guion`, `sugerencia_guion`, `pregunta_base_guion`, `tipo_reaccion`, `reaccion` y `reporte`; `entrevista` gana ficha, ocupación, estado, destacado y Leyenda. `Entrevista` y `EntrevistaAutor` pasan de `progreso.py` a `investigaciones.py`, porque son del mismo dominio.
- La migración 0038 vacía `entrevista` y `entrevista_autor`. Sus filas solo tenían resumen y ninguna pantalla las publicaba, así que no hay forma de completar las columnas obligatorias.
- Los eventos de investigación (INICIA_INVESTIGACION, TERMINA_GUION) apuntan a la ocupación y no a la investigación: cancelar borra la investigación, y su evento quedaría sin código legible.
- Las descripciones cortas de los tipos de reacción (`fijos.TIPOS_REACCION`) son provisionales: la spec no las da y las pide el pop up.
- `t-investigador` y `t-investigador-cierre` son opcionales. Agregarlas como requeridas en CIUDAD habría cambiado el avance y el cierre del bloque que ya prueba el escenario.
