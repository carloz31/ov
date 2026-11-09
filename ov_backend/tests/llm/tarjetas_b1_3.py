"""Tarjetas de b1-3 para la prueba v7.2. Solo las usa `evaluar_tarjetas.py`.

`por_opcion`: una opción con pregunta y tarjeta propias reemplaza a las del ítem. `general_por_opcion`: la base de
`general` (y de `fuera_de_tema`, que usa la misma) depende de la opción marcada. Las demás bases se leen de las líneas
`BASE:` de la tarjeta.
"""

TARJETAS = {
    'b1-3-voz': {
        'pregunta': '¿Qué espera que hagas? Con sus palabras, aunque sea una frase.',
        'tarjeta': '''NÚCLEO: qué espera esa persona que haga al terminar el colegio, con algo concreto:
  una carrera, una ruta (universidad, instituto, trabajar, prepararse), un lugar o
  un trabajo.
NO EXIGIR: palabras textuales, los motivos de esa persona, ni si él o ella está de acuerdo.
GENERAL SI:
  - un deseo sin dirección ("que me vaya bien", "que sea feliz", "que sea alguien en la vida");
  - una dirección sin nada concreto ("que estudie", "que sea profesional", "que trabaje").
MATICES: "no sé qué espera" o "nunca me lo ha dicho" = no_sabe. Si escribe lo que quiere
  él en vez de lo que espera la otra persona = general. Que esa persona se enoje o
  presione, sin riesgo, NO es sensible.
EJEMPLOS:
  "Que sea contador como mi tío" → propio (carrera)
  "Que entre a una pública" → propio (ruta)
  "Que estudie algo" → general (dirección sin nada concreto)
  "Que sea feliz" → general (deseo)
  "Que trabaje con él en la tienda" → propio (trabajo)
  "Nunca me ha dicho nada" → no_sabe
REPREGUNTA
  general · QUÉ PEDIR: qué espera en concreto.
    BASE: «¿Y qué te ha dicho que hagas al terminar el colegio? Aunque sea una frase.»
    CÓMO ADAPTARLA: si dijo una dirección ("que estudie"), pregunta qué o dónde; si dijo
    un deseo ("que me vaya bien"), pregunta qué cree esa persona que sería que le vaya
    bien. Nombra a la persona por cómo la marcó ("tu mamá"), sin otras etiquetas.
  no_sabe / vacio · QUÉ PEDIR: una pista de lo que espera.
    BASE: «Piensa en la última vez que hablaron del futuro. ¿Qué dijo, aunque sea de pasada?»
  fuera_de_tema · BASE: «Volvamos a esa persona: ¿qué espera que hagas al terminar el colegio?»''',
    },
    'b1-3-mia': {
        'pregunta': '¿Por qué eso? Algo tuyo: lo que te pasa, lo que te gusta.',
        'tarjeta': '''NÚCLEO: una razón con algo suyo y concreto: qué le gusta, qué hace, qué le pasa, qué
  necesita o qué quiere para su vida.
NO EXIGIR: que la razón sea buena, que sea la única, ni que coincida con la voz.
GENERAL SI:
  - no hay razón ("porque sí", "porque quiero");
  - la razón es impersonal o ajena ("es lo normal", "da plata", "todos lo hacen");
  - la razón es suya pero sin contenido ("porque me gusta", "porque es lo mío").
EJEMPLOS:
  "Porque me gusta arreglar computadoras" → propio
  "Porque me gusta" → general (sin qué le gusta)
  "Porque quiero ayudar a mi mamá con los gastos" → propio (necesidad suya)
  "Porque da trabajo" → general (impersonal)
  "Porque quiero vivir sola y tener mi plata" → propio (lo que quiere para su vida)
REPREGUNTA
  general · QUÉ PEDIR: algo suyo detrás de esa razón.
    BASE: «¿Qué de ti hace que quieras eso? Algo que te gusta, que te pasa o que necesitas.»
    CÓMO ADAPTARLA: si dijo "me gusta", pregunta qué le gusta de eso o qué se imagina
    haciendo; si la razón es impersonal ("da plata"), pregunta qué significa eso para
    él o ella, sin discutirla. No opines sobre la ruta.
  no_sabe / vacio · BASE: «Piensa en lo que te imaginas haciendo ahí. ¿Qué de eso te gustaría?»
  fuera_de_tema · BASE: «Volvamos a lo que marcaste, {opción}: ¿qué de ti hace que quieras eso?»''',
        'por_opcion': {
            'AUN_NO': {
                'pregunta': '¿Qué te hace dudar?',
                'tarjeta': '''NÚCLEO: qué lo hace dudar: entre qué opciones, o qué le falta saber o resolver.
NO EXIGIR: que tenga opciones claras ni que esté cerca de decidir.
GENERAL SI: "todo", "muchas cosas", "no estoy seguro" sin decir de qué.
EJEMPLOS:
  "Me gustan dos cosas muy distintas" → propio (nombra la duda)
  "No sé si mis notas me alcanzan" → propio
  "No estoy seguro" → general
  "No sé" → no_sabe
REPREGUNTA
  general / no_sabe / vacio · QUÉ PEDIR: de qué viene la duda.
    BASE: «¿Entre qué cosas dudas, o qué te falta saber para decidir? Puede ser algo pequeño.»
    CÓMO ADAPTARLA: no lo apures a decidir; es válido que dude.''',
            },
        },
    },
    'b1-3-contraste': {
        'pregunta': '¿En qué punto: la carrera, el lugar, el momento, el dinero?',
        'tarjeta': '''NÚCLEO: nombra el punto en que coinciden o chocan (la carrera, el lugar, el momento,
  el dinero, estudiar o trabajar, cualquier punto concreto).
NO EXIGIR: que explique por qué, que lo resuelva, ni que lo marcado cuadre con los ecos.
GENERAL SI: solo el veredicto ("chocan", "no estamos de acuerdo", "en parte",
  "pensamos distinto", "sí").
MATICES: los ecos sirven para entender la respuesta, nunca para corregirla. Si expresa
  sobre todo miedo, pena o rabia ante el choque, sin nombrar el punto = emocional.
  Discusiones o enojos en casa, sin violencia ni riesgo, NO son sensibles.
EJEMPLOS:
  "Chocamos en que ella quiere que sea médico" → propio (la carrera)
  "Pensamos distinto" → general
  "En que estudie sí; en qué, no" → propio
  "Sí, igual" → general
  "Me da pena porque sé que se va a decepcionar" → emocional
REPREGUNTA
  general · QUÉ PEDIR: el punto.
    BASE por opción:
      COINCIDEN: «¿En qué coinciden: la carrera, el lugar, el momento?»
      EN_PARTE: «¿En qué sí y en qué no?»
      CHOCAN: «¿En qué punto chocan: la carrera, el lugar, el momento, el dinero?»
    CÓMO ADAPTARLA: puedes usar lo que dicen los ecos para ofrecer el punto como opción
    ("¿chocan en la carrera o en el lugar?"), sin afirmar que ese es el punto.
  no_sabe / vacio · BASE: «Mira lo que escribiste arriba sobre las dos voces. Elige una cosa, la carrera, el lugar o el momento, y cuéntame si ahí coinciden o no.»
  fuera_de_tema · BASE: la de `general` de la opción marcada.''',
        'general_por_opcion': {
            'COINCIDEN': '¿En qué coinciden: la carrera, el lugar, el momento?',
            'EN_PARTE': '¿En qué sí y en qué no?',
            'CHOCAN': '¿En qué punto chocan: la carrera, el lugar, el momento, el dinero?',
        },
    },
}
