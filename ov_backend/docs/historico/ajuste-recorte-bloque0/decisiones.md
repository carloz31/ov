# Decisiones de la spec en curso

- Ajuste recorte-bloque0: `useTypewriter` no cambia; los asteriscos de `**…**` cuentan como caracteres al escribir (dos ticks casi imperceptibles), porque descontarlos exige mapear posiciones entre el texto visible y el marcado.
- Ajuste recorte-bloque0: `conDichos` oculta un `*` suelto al final de un texto (hoy ningún texto del contenido termina así), solo si cierra una corrida impar de `*`, para que la máquina de escribir no lo muestre y un `**…**` completo no se rompa.
- Ajuste recorte-bloque0: no se agrega estilo para `strong`; `.sx-dialogue-text` y `.sx-content-reading` no fijan peso y el `bolder` del preflight da 700 con el mismo color (comprobado en el navegador: 700 frente a 400 del texto, mismo color).
- Ajuste recorte-bloque0: la prueba de equivalencia recorre los 88 JSON de `plataforma/` (el pedido hablaba de 80) y compara con una copia de la lógica de `conDichos` de `main` (1d74dd8); los marcados de `ResourceText` (ficha F19) y `ParentInlineText` se capturaron con el código de `main` antes del cambio.
- Ajuste recorte-bloque0: al regenerar los fixtures solo cambió `contenido-actividades-inicial.json` (las cuatro duraciones); los otros archivos que el exportador reescribió solo difieren en el fin de línea y git no ve cambio de contenido.
