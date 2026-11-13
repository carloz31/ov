# Decisiones de la spec en curso

## Ajuste coherencia-misiones-helena

- Los títulos de las misiones de Helena no empiezan con «Misión de Helena:»: «Mis intereses, N de 6», «Mi comportamiento con los demás, N de 4» y «Explorando mis inteligencias, N de 5».
- Ya no hay diálogos alrededor de cada frase del cuestionario: cada parte tiene una presentación, las frases y un cierre. El puente hacia las frases invita a responder y no dice de qué tratan, porque en cada parte vienen mezcladas todas las dimensiones.
- En la primera parte el personaje se presenta, cuenta algo breve de sí y explica cómo se responde, con la escala real del instrumento. En las siguientes saluda, cuenta algo breve y distinto cada vez, invita a responder y se despide.
- Los cierres no cuentan frases en boca del personaje: el avance va en el mensaje final de la actividad. En la última parte, el personaje dice qué hace Helena con las respuestas y Lumi nota el sello; nadie anuncia el registro que viene después.
- Sol (callada, humor seco), Dora (conversadora, directa) y Bruno (paciente, algo distraído) tienen cada uno su forma de hablar y su historia. Las partes de Sol son «visitas», no «estantes» (`R-h-intereses-2` a `6`: «Primero la visita anterior a Sol.»).
- Se corrigen las etiquetas de habilidades («¿Te pasa casi siempre o casi nunca?») e inteligencias («¿Es verdad en tu caso?»), que no coincidían con sus opciones.
- En el mapa de la ciudad, las partes de un mismo cuestionario van juntas. Con las coordenadas del texto (45–50 entre vecinos) las etiquetas tapaban los círculos vecinos de su grupo a cualquier zoom (cada punto ocupa ~61 de ancho y hasta ~53 bajo el centro), y mover el grupo entero no lo arreglaba. Por decisión del usuario se abrió cada forma (Dora 1,5×, Bruno 1,8×, Sol 1,9×) y se reubicó cada grupo con su registro al lado, sin solapes con ningún punto al 34, 50, 100 y 140 %. Coordenadas finales: Sol 615,531 · 548,493 · 548,417 · 615,379 · 682,417 · 682,493, h3 548,572; Bruno 410,436 · 330,436 · 305,358 · 370,312 · 435,358, h2 370,495; Dora 748,318 · 822,318 · 822,392 · 748,392, h1 890,355.

## Ajuste coherencia-registros-h

- h1, h2 y h3 siguen el mismo molde corto: el personaje ve que el viajero volvió con la página abierta, cuenta qué respondió cuando le tocó, va el ítem y cierra. Sin pregunta ni lámina, y Lumi ya no habla.
- Lo que cuenta cada uno muestra cómo se responde y cubre la respuesta menos obvia: Dora eligió practicar escuchar sin interrumpir; Bruno se reconoció en parte; a Sol le dio curiosidad una familia que no era la primera. Nadie pregunta qué salió en la página ni juzga el resultado.
- Sale de h1 «lo que importa es qué haces con la que salió más baja» y el dato sobre Rosa; sale de h3 la comparación con «lo que tú ya pensabas».
- h1 pasa a llamarse «Una habilidad para practicar» y h3, «La familia de carreras que me llama». Duraciones de los JSON: 4 minutos, como el backend.
- Salen «Esto lo lee tu orientadora…», «bitácora», «informe de viaje», «plan de práctica» y las promesas de que algo «vuelve».

## Ajuste coherencia-registros-ma

- `ma4` y `ma3` siguen el molde corto de h1 a h3. En `ma4`, Dora cuenta a quién mira para aprender a escuchar sin interrumpir (a Sol); sale el reto de siete días. En `ma3`, el guardián no cuenta nada de sí: habla de una viajera, y el cierre vale también para quien marca «Todavía nada»; salen «línea de tiempo», «partir el primer hito» y «acción, plazo, recurso».
- Los títulos de los JSON de `ma4` y `ma3` se alinean con los del backend. Sale «Esto lo lee tu orientadora…» de los dos.
