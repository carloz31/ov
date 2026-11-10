"""Tarjetas de b4-2. Solo datos: el texto de cada tarjeta es el de `claude/tarjetas-registros*.md`,
copiado carácter por carácter. `bases` repite, separadas, las líneas `BASE:` de la tarjeta (sin reemplazar los
marcadores); la prueba `test_llm_tarjetas.py` comprueba que están dentro del texto.
"""

TARJETAS = {
    'b4-2-estilo': {
        'filtrar_etiqueta': False,
        'pregunta': 'Cuenta una vez en que decidiste así: qué tenías que decidir y qué hiciste.',
        'tarjeta': '''NÚCLEO: una decisión suya que ya tomó (qué tenía que decidir) y lo que hizo, o dejó de
  hacer, al decidir, que muestra el estilo que marcó. Basta con que se entienda que esa
  vez decidió de esa forma, aunque no lo diga con todas las palabras.
NO EXIGIR: que la decisión sea grande o sobre estudios, cómo le fue después, por qué
  decide así, que el ejemplo muestre el estilo con todas sus partes, ni más de una vez.
CÓMO SE VE CADA ESTILO (basta con una señal):
  - Lo pienso con calma y comparo: se tomó tiempo o puso opciones lado a lado.
  - Lo dejo para el último momento: esperó hasta que ya no quedaba tiempo, o hasta que
    otro decidió.
  - Me guío por lo que siento: eligió por cómo se sentía o por lo que le nacía.
  - Pregunto a varias personas: pidió opinión (basta con nombrar a alguien a quien
    preguntó).
  - Termino haciendo lo que otros esperan: alguien esperaba algo y terminó haciéndolo.
  - Busco información antes: buscó o revisó algo antes de decidir.
  - Decido rápido y después dudo: decidió rápido, o dudó después de decidir.
  - Me cuesta descartar opciones: no pudo elegir entre opciones, se quedó con varias o
    no eligió ninguna.
  - Me da miedo equivocarme: hizo o dejó de hacer algo por miedo a equivocarse.
  - Otra: lo que escribió en "¿Cuál?", sin juzgarlo.
GENERAL SI:
  - nombra una decisión sin nada de cómo la tomó ("elegí mi colegio");
  - repite el estilo o habla de cómo decide siempre, sin una vez concreta ("siempre lo
    dejo para el final", "en mi casa deciden mis papás");
  - una decisión que todavía no tomó o que imagina ("si tuviera que elegir carrera…");
  - solo cómo le fue, sin la decisión ("me salió mal");
  - cuenta una decisión con un cómo que no muestra el estilo marcado o va claramente en
    contra (marcó "Lo pienso con calma" y cuenta "lo decidí en cinco minutos").
MATICES: ante la duda entre propio y general, propio: si la relación con el estilo es floja
  pero razonable, vale. Cualquier decisión vale, aunque sea pequeña (qué comprar, a qué
  taller entrar, dejar algo), y también la de su carrera. Que otra persona haya decidido
  por él nunca es fuera_de_tema, y no se comenta ni se juzga a esa persona; con "Termino
  haciendo lo que otros esperan" puede ser justo el ejemplo. Una autovaloración negativa
  ("soy pésimo decidiendo") = general: no la contradigas. "No me acuerdo" o "nunca he
  decidido nada" = no_sabe. Contar un miedo dentro de la decisión ("no me presenté por
  miedo a hacerlo mal") es propio; si expresa sobre todo angustia presente sin una
  decisión ("me paralizo, lloro cada vez que tengo que elegir") = emocional. No se juzga
  si el estilo es bueno o malo ni si decidió bien.
EJEMPLOS:
  "Para elegir academia vi tres, anoté precios y horarios y me tomé una semana" → propio (Lo pienso con calma y comparo)
  "Lo del viaje de promo: no dije nada hasta el último día y mi mamá pagó por mí" → propio (Lo dejo para el último momento)
  "Me quedé en el vóley porque ahí me siento bien, aunque me quitaba tiempo" → propio (Me guío por lo que siento)
  "Le pregunté a mi tutora si me cambiaba de sección" → propio (Pregunto a varias personas; basta una persona)
  "Quería taller de arte, pero mi papá dijo robótica y fui a robótica" → propio (Termino haciendo lo que otros esperan)
  "Dejé el fútbol en un día y después estuve semanas pensando si volver" → propio (Decido rápido y después dudo)
  "No me presenté a delegado por si lo hacía mal" → propio (Me da miedo equivocarme)
  "Me inscribí al taller de pintura" → general (decisión sin cómo)
  "Siempre pregunto a todo el mundo" → general (estilo sin una vez)
  "Si me toca elegir carrera, lo voy a pensar bien" → general (decisión imaginada)
  "Escogí el curso de verano en un ratito, sin pensarlo" → general (marcó Lo pienso con calma: el cómo va en contra)
  "No me acuerdo de ninguna" → no_sabe
  "Cada vez que tengo que elegir algo me pongo a llorar y no puedo" → emocional
REPREGUNTA
  general · QUÉ PEDIR: cómo muestra una decisión concreta suya el estilo que marcó.
    BASE: «Piensa en una vez concreta: ¿qué tenías que decidir y qué hiciste que muestre tu forma de decidir?»
    CÓMO ADAPTARLA: nombra el estilo en segunda persona, con las palabras de la opción
    ("lo piensas con calma", "lo dejas para el último momento", "preguntas a varias
    personas"); con "Me da miedo equivocarme", di "que te preocupa equivocarte". Si contó
    una decisión, retómala en pocas palabras y pregunta cómo se notó en ella ese estilo
    ("En lo del coro, ¿en qué momento se notó que lo piensas con calma?"). Si contó una
    decisión con un cómo distinto, no señales la diferencia ni digas que no coincide:
    pregunta en qué momento de esa decisión apareció el estilo. Si nombró una decisión
    sin decir cómo la tomó, pregunta cómo la decidió sin dar por hecho que lo hizo con ese
    estilo (no "¿cómo buscaste información?", sino "Cuando elegiste el taller, ¿cómo lo
    decidiste: buscaste algo antes o fue de otra forma?"). Si no contó ninguna decisión
    (solo el estilo, una decisión imaginada o solo el resultado), pide una vez real que ya
    pasó; si ayuda, ofrece dos o tres posibilidades cortas dentro de la misma pregunta (un
    curso, un deporte, qué hacer en vacaciones, algo que dejaste). Si habló de quién
    decide por él, no comentes a esa persona: pide una vez concreta. Si dijo algo
    negativo de sí, no repitas esas palabras. No califiques el estilo, no sugieras otra
    forma de decidir, no preguntes por qué decide así ni por su carrera.
  no_sabe / vacio · BASE: «Puede ser algo pequeño: elegir un curso, un deporte, qué hacer en vacaciones o dejar algo. ¿Cómo lo decidiste?»
  fuera_de_tema · BASE: «Volvamos a tu forma de decidir: ¿qué decisión recuerdas en la que se haya notado?»
SEGUIMIENTO: el conjunto es propio si la segunda respuesta muestra el estilo en una decisión
  concreta, o si reconoce que esa vez decidió distinto ("esa vez fue rápido, pero casi
  siempre lo pienso"): darse cuenta de la diferencia es lo que se busca, no un error. Si
  insiste en el estilo sin una vez concreta, queda general sin insistir. Si sigue sin
  recordar ninguna, queda no_sabe (el ítem admite abierto).''',
        'bases': {
            'general': 'Piensa en una vez concreta: ¿qué tenías que decidir y qué hiciste que muestre tu forma de decidir?',
            'no_sabe': 'Puede ser algo pequeño: elegir un curso, un deporte, qué hacer en vacaciones o dejar algo. ¿Cómo lo decidiste?',
            'vacio': 'Puede ser algo pequeño: elegir un curso, un deporte, qué hacer en vacaciones o dejar algo. ¿Cómo lo decidiste?',
            'fuera_de_tema': 'Volvamos a tu forma de decidir: ¿qué decisión recuerdas en la que se haya notado?',
        },
    },
}
