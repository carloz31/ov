"""Tarjetas de b2-3. Solo datos: el texto viene de `tarjetas-registros.md` y se copia tal cual.

`filtrar_etiqueta`: si el filtro rechaza una repregunta que contiene la etiqueta de la opción marcada. Las bases se leen de las líneas `BASE:` de la tarjeta.
"""

TARJETAS = {
    'b2-3-valores': {
        'filtrar_etiqueta': False,
        'pregunta': '¿Qué significa para ti el que pusiste primero? Cuéntalo con algo concreto: cómo se vería en tu trabajo o en tu vida.',
        'tarjeta': '''NÚCLEO: qué significa en concreto para él o ella uno de sus valores (la pregunta es por
  el primero), con algo suyo: cómo se vería en un trabajo (un sueldo fijo, que nadie
  lo mande, ver a quién ayudó), para qué lo quiere (ayudar en su casa, tener su casa)
  o algo que vivió o vio que lo explica.
NO EXIGIR: de dónde le viene el valor, que lo justifique, que sea realista ni que lo
  relacione con una carrera.
GENERAL SI:
  - repite el valor con otras palabras ("algo estable", "ganar bien");
  - solo dice que es importante o que va primero ("es lo principal", "sin eso no hay
    nada");
  - solo dice de dónde le viene, sin qué significa para él o ella ("así me criaron",
    "en mi casa piensan igual");
  - no da ninguna razón ("porque sí").
MATICES: la pregunta es por el primero, pero si describe con algo concreto otro de sus
  tres valores = propio (no le pidas el primero). "No sé" o que no sabe explicarlo =
  no_sabe. Elegir por ingresos o por lo que piensa su familia no se juzga. Algo
  doloroso sin riesgo que explica el valor (un duelo, la falta de plata en casa) =
  propio. Violencia, abuso o riesgo = sensible.
EJEMPLOS:
  "Un sueldo que llegue todos los meses, sin estar pensando si me botan" → propio (Estabilidad: cómo se vería)
  "Que me alcance para darle a mi mamá y pagar mis cosas" → propio (Ingresos: para qué)
  "Cuando mi abuela estuvo internada vi cómo la trataban las enfermeras" → propio (Ayudar a otros: algo que vio)
  "Organizar yo mi día, sin alguien encima" → propio (Autonomía: cómo se vería)
  "Que sea estable" → general (Estabilidad: repite el valor)
  "Es lo más importante de todo" → general (Ingresos: solo importancia)
  "Así me enseñaron en mi casa" → general (Crear: solo el origen)
  "No sabría decirlo" → no_sabe
REPREGUNTA
  general · QUÉ PEDIR: cómo se vería ese valor en su trabajo o en su vida.
    BASE: «¿Cómo se vería eso en tu trabajo? Piensa en algo concreto: qué tendría ese trabajo o qué te permitiría hacer.»
    CÓMO ADAPTARLA: nombra el valor del que habló (si no habló de ninguno, el que puso
    primero), nunca los tres, y pregunta cómo se vería en un trabajo, con dos o tres
    posibilidades concretas de ese valor (estabilidad: un sueldo fijo, un contrato, no
    tener que mudarse). Si dijo de dónde le viene (su familia, cómo lo criaron), no
    preguntes más por eso: pregunta qué significa para él o ella. Si dijo que es lo más
    importante, no lo discutas. Pregunta solo por el significado: nunca de dónde le
    viene ni por qué lo eligió, y no ofrezcas dos caminos en la misma pregunta.
  no_sabe / vacio · BASE: «Imagina un trabajo que te guste mucho. ¿Qué tendría que tener para que sientas que ahí está lo que pusiste primero?»
  fuera_de_tema · BASE: «Volvamos a lo que pusiste primero: ¿cómo se vería eso en un trabajo tuyo?»''',
    },
}
