# Decisiones de la spec en curso

## Ajuste coherencia-bloque5

- **El pergamino trae una sola frase** («Quien llega hasta mí ya trae lo que vino a buscar.»). En la plataforma es la ficha F24, de `ESTUDIANTE` y tema «Decidir mi futuro», que entrega la regla `R-F24` al completar b5-5; su contenido es solo la cita, sin secciones, «Para tu viaje» ni fuentes.
- **El bloque no nombra el informe de viaje ni a la orientadora:** el informe no existe todavía y no estaba terminado de plantear. b5-5 pasa a llamarse «Lo que decía el pergamino».
- **Helena admite que sabía dónde estaba y que calló,** y da su razón: vio a muchos subir derecho al faro el primer día, leer la frase sin que les dijera nada y bajar creyendo que la isla los había engañado.
- **El guardián se despide en la puerta de la sala de la luz** (b5-4), donde la aguja deja de apuntar a la luz y señala la puerta, como dijo en b1-7.
- **La historia de Lumi sigue guardada para el diario:** en el faro solo insinúa; ya no cuenta cómo llegó a la isla ni anuncia que la deja. **Iván queda cerrado:** nunca llegó al faro y no le hizo falta.
- **b5-1:** Teresa cuenta qué tan segura estaba cuando le ofrecieron el faro, y eso muestra cómo se responde el ítem; la elección pregunta por los barcos y la analogía la hace Teresa después. La lámina trata de la seguridad; el calendario y «si no ingreso» quedan en F21.
- **F21:** sale la tabla por meses (ubicaba mal los exámenes y las becas) y «tres pasos con fecha»; entra qué da y qué quita seguridad; el calendario va por tema. Título y tema no cambian.
- **b5-2:** las preguntas están en una hoja de Helena, en la escalera; Lumi no sabe para qué están ahí y descubre al final el segundo sello de la primera página del libro (no es una página nueva).
- **b5-3:** entra Teresa, que sube al balcón y cuenta una idea con la que llegó (que cuidar un faro era aburrido) y qué la cambió (ver de cerca lo que se hace). Ella pide el ítem.
- **Ningún diálogo de `plataforma/` lleva `eco`:** salió el último (`b5-1-06`). El proyecto, los pasos y la primera señal se siguen viendo en el ítem `b5-1-seguridad`; `REFERENCIAS` no cambia. El código del front que pinta el eco de un diálogo se conserva porque lo usa el conjunto `ruta`.
- El mensaje de `R-B5` ya no dice «compara tus planes» ni «bajar»; `R-b5-1` nombra «Mis próximos pasos». Solo cambian los mensajes, no las condiciones.
- F02 cambia solo la frase de «Para tu viaje» sobre el acantilado; F22 y F23 no se revisan en este ajuste.
- Salen del bloque: «Esto lo lee tu orientadora…», «capítulo», «pasos con plazo», la línea de tiempo del desierto, «con el mismo instrumento», los anuncios de lo que viene y los adjetivos con género dirigidos al estudiante.
- `test_carga_contenido.py` pasa de 31 a 32 fichas y comprueba que F24 es de `ESTUDIANTE` (autorizado por el texto de observaciones, §4). Los fixtures del front se re-exportaron y no cambiaron.
- La revisión en el navegador se hizo con un backend y un front aparte (puertos 8010 y 5180) sobre una base temporal fuera del repo, para no tocar la base ni los servidores de desarrollo que ya estaban corriendo.
- Los textos de F21 y F24 se trasladaron a `contenido.py` con un script de un solo uso que copia los bloques del texto de observaciones, para no reteclearlos. El texto de observaciones queda como anexo de la spec.
