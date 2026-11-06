# Decisiones de la spec en curso

## Ajuste aviso-velocidad

- Modelo: `instrumento` gana `ms_por_palabra`, `ms_respuesta` y `racha_aviso`; `respuesta_item`, `tiempo_ms`; y hay una tabla de estado nueva, `ritmo_aplicacion`, porque hoy el intento no tiene fila propia (`progreso_actividad` es por actividad y la racha las cruza; `resultado_instrumento` solo existe al revelar).
- `ms_respuesta` cubre decidir más dos toques (la opción y «Continuar»): 800 con escala de 2 opciones y 1200 con 3 o más, en lugar de los 600 y 1000 de las observaciones. Lo pidió el usuario al aprobar el plan.
- El reinicio por perfil plano borra la fila de `ritmo_aplicacion`, igual que las respuestas: un intento anulado no conserva sus avisos. Aprobado por el usuario.
- Un ítem con `tiempo_ms` nulo no cambia ningún contador, ni la racha ni `items_desde_aviso`: las observaciones solo decían que no cuenta para la racha, y así es lo más simple.
- En la partida, que conduce Helena, el aviso va en tercera persona («las preguntas de Helena»): las observaciones se contradecían y el usuario eligió esta versión. La primera persona queda para cuando conduce Lumi (`companero`), hoy la llegada.
- Pruebas adaptadas por la tabla nueva, como en cada cambio de modelo: los conteos de tablas de `test_migraciones`, `test_semilla_ruta`, `test_integridad_catalogos` y `test_restricciones_estado`, el conjunto de tablas tras bajar en `test_migraciones` y `llenar_estado` del reinicio de desarrollo.
- `AvisoToast` gana `duracion` y `parrafo`, y `etiqueta` pasa a opcional: el aviso dura 8 s, su texto largo no cabe en una línea y las observaciones piden solo el título «Lumi». Sin esas props, el toast no cambia.
- `servidor-partida.test.mjs` se adapta porque la primera respuesta lleva `tiempo_ms`, y `test_clasificacion_tablas` clasifica `ritmo_aplicacion` como estado: ambas por el contrato y el modelo de este ajuste.
- En celular (hasta 767 px) el aviso va abajo, sobre el cuadro de diálogo, porque arriba tapaba la pregunta y la primera opción; así quedan libres pregunta, opciones y «Continuar». Lo pidió el usuario para ese caso. Su botón de cerrar pasa de 28 a 44 px en esa misma medida, porque 28 px era poco para un dedo. Todo va bajo `.sx-aviso-velocidad`: los demás toasts no cambian.
