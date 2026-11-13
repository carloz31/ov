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

## Ajuste coherencia-ma1-ma7

- `ma1`: Nadia ya no dice «Leí tu punto de origen» (nadie en la historia lee lo que el viajero escribe). Cuenta la carta que le escribió a la niña que fue, que calza con b1-2. Salen la cita de la fuente en boca de Lumi y la opción «¿Y quién la lee?», que repetía b0-2.
- `ma7` es práctica, no repaso de b3-3: Doña Cifra trae un solo promedio y tres personas que lo usaron mal; el estudiante corrige cada caso (el lugar, la edad, quiénes están contados) y la lámina dice dónde mirar cada cosa en el catálogo. Doña Cifra afirma y Lumi pregunta; la lámina va después de las preguntas y no la presenta Lumi. Salen «tu registro del mercado estuvo bien hecho», «la revancha de verdad… te quedas con el puesto» y «cuatro promedios mezclados».
- El banco de `ma7-b` se rehízo con F13 (doce preguntas, la correcta tres veces en cada posición): Doña Cifra afirma y el estudiante corrige. No repite b3-3, el banco de b3-5 ni los casos de `ma7`. `test_conversaciones_contenido.py` fijaba la correcta de `ma7-b-p03` y `p07` del banco viejo; como el banco se reemplazó entero (igual que b1-5 y b3-5 antes), esas entradas salen y la prueba pasa a comprobar el banco nuevo con los valores del texto de observaciones (autorizado en su §4).
- F13 suma solo datos verificables: a quién se le pregunta por la demanda, cuántos puestos de 2026 son temporales, dónde se concentran y la informalidad según el nivel de estudios, todo de una sola edición de la Encuesta de Demanda Ocupacional (la que muestra Mi Carrera). Quedan fuera lo que no se pudo confirmar o no aportaba. La plataforma no tiene la demanda: la ficha lo dice. Las cifras de la encuesta se leyeron en la nota del MTPE y en prensa.
- El desafío de Doña Cifra cambia su presentación, el título de la recompensa («Los números, leídos») y su mensaje final; `ma7_b.json` pasa a la ubicación «Puerto, plaza del mercado». En api el cierre de una batalla no muestra ese título ni ese mensaje (ya era así; anotado en «Pendientes» de `contenidos-actividades.md`).

## Ajuste coherencia-ma5

- `ma5` es práctica: un viajero dejó en el taller una lista de «profesiones del futuro» e Iván la abre con el estudiante (carrera o especialización, de qué mercado habla). Tres preguntas de Lumi y una sola lámina al final. Emprender sale de la historia de Iván en b1-3: la bomba, el molino y los faroles. Duración 6 min.
- Salen «Sol vio tu registro», «me dijeron que contrastaste tu perfil», «el único de la ciudad que vive de un negocio propio» (Dora tiene la taberna) y «abrí el taller después de años arreglando artefactos para otros», que contradecía b1-3.
- La plataforma no tiene pantalla de carreras del futuro: se muestran desde la ficha F23. «Cómo se llega aquí» se presenta como guía y no como lista definitiva, en la lámina y en la ficha.
- F23 pasa al informe de 2025 del Foro Económico Mundial (39 %, ya no 44 %) y suma la diferencia entre crecer rápido y sumar más puestos. Corrige la lectura del GEM: el 5,3 % es la parte de los adultos con un negocio de más de tres años y medio. Salen «entre los países con más emprendimiento del mundo» y dos afirmaciones sin fuente («sobrevive más», «mejores probabilidades»); el negocio por necesidad se trata sin desmerecerlo. Las cifras del GEM se leyeron en notas de prensa.
- `R-F23` dice «Revisa con Iván la lista de profesiones del futuro.». El texto de observaciones pedía revisar «las tres tablas» de F23; el contenido de F23 trae dos (la tercera es la de la lámina `ma5-09`), y las tres se revisaron.
- `ajuste-coherencia-ma1-ma7.md`, que el texto de ma5 nombra como previo, se aplicó después de ma5 por decisión del usuario; no comparten archivos salvo `contenido.py`, en entradas distintas.
