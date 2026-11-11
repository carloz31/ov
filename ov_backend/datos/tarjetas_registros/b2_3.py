"""Tarjetas de b2-3. Solo datos: el texto de cada tarjeta es el de `claude/tarjetas-registros*.md`,
copiado carácter por carácter. `bases` repite, separadas, las líneas `BASE:` de la tarjeta (sin reemplazar los
marcadores); la prueba `test_llm_tarjetas.py` comprueba que están dentro del texto.
"""

TARJETAS = {
    'b2-3-valores': {
        'filtrar_etiqueta': False,
        'tarjeta': '''NÚCLEO: una razón con algo suyo para uno de sus valores (la pregunta es por el primero):
  algo que vivió o vio, lo que le daría o le evitaría, o una idea suya que dice algo de
  él o de su situación (lo que quiere, lo que teme, lo que necesita).
NO EXIGIR: de dónde le viene el valor, que la razón sea buena o realista, ni que lo
  relacione con una carrera.
GENERAL SI:
  - repite el valor con otras palabras ("porque quiero algo estable", "porque crear es
    lo mío");
  - solo dice que es importante, que va primero o que pesa más que los otros ("es lo
    principal", "sin eso no hay nada");
  - una razón genérica que cualquiera diría de ese valor, sin nada suyo ("me hace
    sentir seguro", "para estar contento");
  - una máxima sobre el mundo, sin nada de él o de su situación ("el que no estudia no
    es nadie", "la plata manda");
  - solo dice quién lo piensa, sin una razón suya ("así me criaron", "en mi casa piensan
    igual");
  - no da ninguna razón ("porque sí").
MATICES: la pregunta es por el primero, pero si da una razón suya para otro de sus tres
  valores = propio (no le pidas el primero). "No sé" o que no sabe explicarlo = no_sabe.
  Elegir por ingresos o por lo que piensa su familia no se juzga. Algo doloroso sin
  riesgo que explica el valor (un duelo, la falta de plata en casa) = propio. Violencia,
  abuso o riesgo = sensible.
EJEMPLOS:
  "Un sueldo que llegue todos los meses, sin estar pensando si me botan" → propio (Estabilidad: lo que le evitaría)
  "Que me alcance para darle a mi mamá y pagar mis cosas" → propio (Ingresos: lo que le daría)
  "Cuando mi abuela estuvo internada vi cómo la trataban las enfermeras" → propio (Ayudar a otros: algo que vio)
  "Siento que si dejo de aprender me quedo atrás" → propio (Aprender: idea suya)
  "Que sea estable" → general (Estabilidad: repite el valor)
  "Es lo más importante de todo" → general (Ingresos: solo importancia)
  "El que tiene plata manda" → general (Ingresos: máxima)
  "Así me enseñaron en mi casa" → general (Crear: solo quién lo piensa)
  "No sabría decirlo" → no_sabe
REPREGUNTA
  general · QUÉ PEDIR: qué hace que ese valor le importe a él o ella.
    BASE: «¿Qué hace que eso te importe tanto? Puede ser algo que viviste, algo que viste en otros o lo que te daría.»
    CÓMO ADAPTARLA: nombra el valor del que habló (si no habló de ninguno, el que puso
    primero), nunca los tres. Si repitió el valor ("porque me gusta"), pregunta qué
    le gusta de eso o qué le da. Si dijo una máxima o que es lo más importante, no la
    discutas: pregunta qué le daría a él o ella ("¿y a ti qué te daría tenerla?"). Si
    dio una razón genérica ("me hace sentir seguro"), pregunta frente a qué o para qué,
    en su caso ("¿seguro frente a qué?"). Si dijo quién lo piensa (su familia), no
    preguntes por esa persona: pregunta qué piensa él o ella. No preguntes de dónde le
    viene el valor ni uses "por qué crees que".
  no_sabe / vacio · BASE: «Imagina un trabajo sin lo que pusiste primero. ¿Qué es lo que más extrañarías?»
  fuera_de_tema · BASE: «Volvamos a lo que pusiste primero: ¿qué hace que te importe tanto?»''',
        'bases': {
            'general': '¿Qué hace que eso te importe tanto? Puede ser algo que viviste, algo que viste en otros o lo que te daría.',
            'no_sabe': 'Imagina un trabajo sin lo que pusiste primero. ¿Qué es lo que más extrañarías?',
            'vacio': 'Imagina un trabajo sin lo que pusiste primero. ¿Qué es lo que más extrañarías?',
            'fuera_de_tema': 'Volvamos a lo que pusiste primero: ¿qué hace que te importe tanto?',
        },
    },
}
