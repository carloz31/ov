"""Tarjeta de b4-5. Solo datos: viene de §2 de la spec v7.10b (`prueba-tarjetas-b4-5-v7.10b.md`), provisional, y se copia tal cual, con su bloque SEGUIMIENTO.

`filtrar_etiqueta`: si el filtro rechaza una repregunta que contiene la etiqueta de la opción marcada. `{plan_a}` y `{plan_b}` en la pregunta y en la tarjeta son marcadores que declara cada caso. `ecos`: cómo se nombra cada eco (los dos planes con sus motivos y su relato). Las bases se leen de las líneas `BASE:` de la tarjeta.
"""

TARJETAS = {
    'b4-5-moneda': {
        'filtrar_etiqueta': False,
        'pregunta': 'Piensa en {plan_a}. ¿Hay algo de ella que te haría falta?',
        'ecos': {'plan_a': {'nombre': 'Plan A', 'ordenado': False}, 'plan_b': {'nombre': 'Plan B', 'ordenado': False}},
        'tarjeta': '''NÚCLEO: algo de {plan_a} que le haría falta si estudiara {plan_b} (algo que se hace, un
  tema o un área aunque sea amplia, como las ciencias o el arte, un lugar, la gente con la
  que trabajaría o una condición del trabajo, como el sueldo o el horario), o por qué no le
  haría falta nada (las dos le dan lo que busca, {plan_a} tampoco lo convence, {plan_a} era
  idea de otra persona, o la puso primero por otra razón, como que es más difícil entrar).
NO EXIGIR: qué le da {plan_b} ni por qué igual le gustaría (eso ya está en sus motivos), más
  detalle de lo que ya nombró, que el texto calce con la reacción que marcó, que diga si
  cambiará el orden, por qué siente lo que siente, ni más de una cosa.
GENERAL SI:
  - "nada" o que le da igual, sin por qué;
  - "todo", o solo un sentimiento sin de qué ("me sentiría mal", "lo extrañaría");
  - repite un motivo de {plan_a} con las mismas palabras de los ecos, sin nada más;
  - que prefiere {plan_a} sin decir qué tiene ("es mi primera opción", "es mejor", "siempre
    fue mi sueño");
  - que las dos son casi lo mismo, sin decir qué tienen en común;
  - solo quién eligió {plan_a} o lo que espera otra persona, sin decir si le haría falta
    algo.
MATICES: ante la duda entre propio y general, propio. No se juzga la reacción que marcó ni
  se compara con el texto. Un tema o un área amplia ya es algo de {plan_a}: propio, sin
  pedir cuál en particular. Si tiene dos intereses distintos y nombra solo el de {plan_a},
  es propio: no le pidas el de {plan_b}. Nombrar algo que {plan_b} también tiene es propio.
  Un motivo de los ecos dicho con algo más (dónde, con quién, en qué) es propio. Si lo que
  le haría falta parece ser de {plan_b}, no lo corrijas ni señales la diferencia: propio.
  Decir que ninguna lo convence, o que {plan_a} tampoco, es propio: no preguntes qué no le
  convence. Decir que no le haría falta nada porque {plan_a} era idea de otra persona es
  propio: ya dio el porqué. Una razón de estrategia para el orden es propio. "No sé" =
  no_sabe. Nombrar tristeza o desánimo ("me desanimaría") no es emocional, porque aquí se
  pregunta justamente qué siente: es general. Si expresa sobre todo miedo o angustia fuerte
  sin nada de los planes = emocional. Hablar de su familia o de quién eligió nunca es
  fuera_de_tema, y no se comenta. No se juzga el orden de sus planes ni se sugiere
  cambiarlo.
EJEMPLOS:
  "Salir al campo a ver animales; en Contabilidad estaría todo el día sentado" → propio (A: Veterinaria)
  "Construir cosas con las manos; en Administración estaría todo el día en la compu" → propio (A: Mecánica)
  "La historia, me encanta" → propio (A: Arqueología; un área amplia basta)
  "Tener un sueldo fijo cada mes" → propio (motivo de A: Estabilidad, dicho con algo más)
  "No me haría falta nada: en las dos estaría enseñando" → propio
  "Ganar más; igual con Educación estaría tranquila" → propio (condición del trabajo)
  "Nada, la verdad Derecho tampoco me convence" → propio
  "Nada, puse Arquitectura arriba porque es a la que más cuesta entrar" → propio (estrategia)
  "Nada, Odontología la eligió mi abuelo más que yo" → propio (da el porqué de "nada")
  "Nada" → general
  "Me sentiría mal" → general
  "La estabilidad" → general (motivo de A: Estabilidad; repite el motivo)
  "Es mi primera opción" → general
  "Es casi lo mismo" → general
  "Mi mamá quiere que sea doctor" → general (solo quién eligió)
  "Ni idea" → no_sabe
  "Me da pánico, siento que sin eso no voy a ser nada" → emocional
REPREGUNTA
  general · QUÉ PEDIR: una cosa de {plan_a} que le haría falta, o por qué no le haría falta
    nada.
    BASE: «¿Qué cosa de {plan_a} te haría falta si estudiaras {plan_b}?»
    CÓMO ADAPTARLA: la repregunta siempre pregunta qué le haría falta de {plan_a} o por qué
    no le haría falta nada; no preguntes qué le atrae o le gusta de {plan_a}, ni por qué
    siente lo que siente. Usa "hacer falta", como la pregunta, y un solo verbo por pregunta.
    Di "si estudiaras {plan_b}", no "si terminaras en". Si dijo "nada" o que le da igual,
    sin por qué, pregunta por qué no le haría falta nada de {plan_a}, sin suponer si es
    porque le gustan las dos o porque ninguna lo convence ("¿Por qué crees que no te haría
    falta nada de {plan_a}?"). Si dijo "todo", solo un sentimiento o que prefiere {plan_a},
    pide una cosa de {plan_a}; si ayuda, ofrece dos o tres tipos de cosas dentro de la misma
    pregunta (algo que se hace, un lugar, el sueldo), nunca respuestas hechas. Si repitió un
    motivo de los ecos, retómalo y pregunta en qué momento o parte de {plan_a} lo tendría.
    Si dijo que son casi lo mismo, pregunta qué tienen las dos que le importa. Si dijo solo
    quién eligió {plan_a}, no comentes a esa persona: pasa a él o ella ("Y a ti…"). No pidas
    algo "exacto" o "específico". Nunca preguntes qué le da {plan_b} ni por qué le gustaría,
    no preguntes qué no le convence, no sugieras cambiar el orden, no califiques la reacción
    que marcó y no repitas palabras negativas.
  no_sabe / vacio · BASE: «Imagina tu primer año en {plan_b}. ¿Hay algo de {plan_a} que te gustaría estar haciendo?»
  fuera_de_tema · BASE: «Volvamos a la moneda: si estudiaras {plan_b}, ¿qué te haría falta de {plan_a}?»
SEGUIMIENTO: el conjunto es propio si la segunda respuesta da una cosa de {plan_a} o una
  razón de por qué no le haría falta nada (incluido que ninguna lo convence). Si insiste en
  "nada", en el motivo o en el sentimiento sin de qué, queda general sin insistir. Si sigue
  sin saber, queda no_sabe (el ítem admite abierto).''',
    },
}
