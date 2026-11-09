"""Tarjetas de b3-4. Solo datos: el texto viene de `tarjetas-registros.md` y se copia tal cual.

`filtrar_etiqueta`: si el filtro rechaza una repregunta que contiene la etiqueta de la opción marcada. `por_opcion`: una opción con pregunta y tarjeta propias reemplaza a las del ítem. `ecos`: cómo se nombra cada eco y si va ordenado; `lista_ecos`: de dónde salen sus etiquetas (el eco de texto no usa lista). `{valor 1}` en la pregunta es la etiqueta del primero de los valores del caso. Las bases se leen de las líneas `BASE:` de la tarjeta.
"""

TARJETAS = {
    'b3-4-necesito': {
        'filtrar_etiqueta': False,
        'pregunta': 'Pusiste {valor 1} primero. ¿Qué tendrías que saber de la carrera que elijas para saber si te da eso?',
        'ecos': {
            'valores': {'nombre': 'Lo que valoras', 'ordenado': True},
        },
        'lista_ecos': 'VALORES',
        'tarjeta': '''NÚCLEO: algo concreto que tendría que saber de una carrera o del trabajo al que lleva para
  ver si le da lo que valora: cómo son los horarios o los turnos, si hay que viajar o
  mudarse, si suele haber contrato, si se puede trabajar por cuenta propia, si se trata
  con personas, cuánto se gana al empezar, en su región o con los años.
NO EXIGIR: una carrera concreta, dónde lo averiguaría, que sea un dato del catálogo, que
  hable del primer valor (vale otro de sus tres), ni que lo que pregunta encaje con el valor.
GENERAL SI:
  - solo un tema, sin decir qué querría saber de él ("los horarios", "el trabajo");
  - una pregunta vaga que sirve para cualquiera ("si es buena", "cómo es");
  - repite el valor como pregunta ("si tiene estabilidad", "si me deja crear");
  - quiere saber "todo" o "más información".
MATICES: si cuenta algo que ya sabe de una carrera o de alguien que trabaja en eso = propio.
  "No sé qué tendría que saber" = no_sabe. No se juzga el valor, si lo que pregunta encaja
  con él, ni si una carrera se lo daría. Querer irse de su casa, sin violencia ni riesgo,
  NO es sensible.
EJEMPLOS:
  "Si los médicos tienen que hacer guardias de noche" → propio (Tiempo para la familia)
  "Si un diseñador puede trabajar por su cuenta o siempre en una empresa" → propio (Autonomía)
  "Cuánto gana un contador en Arequipa, no en Lima" → propio (Ingresos)
  "Si en enfermería te hacen contrato o es por recibos" → propio (Estabilidad)
  "Si hay que viajar mucho por trabajo" → propio (Estabilidad: no se juzga si encaja)
  "Sé que en las fábricas hay turnos rotativos porque mi tío trabaja en una" → propio (lo que ya sabe)
  "Los horarios" → general (solo el tema)
  "Si es una buena carrera" → general (vaga)
  "Si tiene estabilidad" → general (repite el valor)
  "Ni idea de qué tendría que saber" → no_sabe
REPREGUNTA
  general · QUÉ PEDIR: algo concreto de ese trabajo que le diría si le da lo que valora.
    BASE: «Piensa en un día de trabajo: ¿qué tendría que pasar, o no pasar, para que te dé lo que pusiste primero?»
    CÓMO ADAPTARLA: nombra el valor del que habló (si no habló de ninguno, el que puso
    primero), nunca los tres. Si nombró un tema, pregunta qué de ese tema, con dos o tres
    posibilidades ligadas a su valor (Estabilidad y el sueldo: que llegue fijo cada mes,
    cuánto es al empezar). Si repitió el valor, pregunta qué tendría que ver en un trabajo
    para saberlo (Tiempo para la familia: los horarios, los turnos, si hay que viajar). Si
    fue vago, pregunta qué le haría pensar que le conviene. No pidas una cifra ni digas si
    una carrera da o no ese valor.
  no_sabe / vacio · BASE: «Imagina que ya trabajas en algo que te gusta. ¿Qué querrías que fuera de una forma y no de otra: el horario, el sueldo o con quién trabajas?»
  fuera_de_tema · BASE: «Volvamos a lo que pusiste primero: ¿qué tendrías que saber de una carrera para saber si te da eso?»''',
    },
    'b3-4-quien': {
        'filtrar_etiqueta': False,
        'pregunta': '¿Qué le preguntarías?',
        'ecos': {
            'necesito': {'nombre': 'Lo que necesitarías saber', 'ordenado': False},
        },
        'tarjeta': '''NÚCLEO: una pregunta concreta que le haría a esa persona sobre una carrera, cómo la estudió
  o su trabajo (puede ser lo mismo que escribió antes).
NO EXIGIR: que ya haya hablado con ella, que la conozca bien, que trabaje exactamente en lo
  que le interesa, ni que la pregunta sea distinta de la anterior.
GENERAL SI:
  - una pregunta que sirve para cualquier trabajo, sin nada de este ni de lo que busca
    ("cómo es", "qué tal le va", "si está contento");
  - dice que le preguntaría "todo" o "de todo", sin qué;
  - habla de esa persona sin decir qué le preguntaría.
MATICES: retomar lo que escribió antes ("lo mismo de arriba") = propio. "No sé qué le
  preguntaría" = no_sabe. Que en casa no apoyen una carrera o discutan por eso, sin
  violencia ni riesgo, NO es sensible.
EJEMPLOS:
  "Si tuvo que mudarse para conseguir trabajo" → propio
  "Cuánto ganaba cuando empezó" → propio
  "Si estudiar en un instituto le sirvió igual que la universidad" → propio
  "Cómo es" → general
  "De todo un poco" → general
  "No sé qué le preguntaría" → no_sabe
REPREGUNTA
  general · QUÉ PEDIR: una pregunta concreta sobre su trabajo o cómo llegó a él.
    BASE: «Si tuvieras cinco minutos con esa persona, ¿qué es lo primero que le preguntarías de su trabajo?»
    CÓMO ADAPTARLA: nombra a la persona por cómo la marcó. Puedes ofrecer lo que escribió
    antes como posibilidad, sin afirmarlo ("¿lo de los turnos, o algo más?"). Si habló de
    esa persona sin preguntarle nada, no comentes lo que contó: pregunta qué le preguntaría.
  no_sabe / vacio · BASE: «Puedes empezar por lo que escribiste antes: ¿qué te gustaría que te contara de eso?»
  fuera_de_tema · BASE: «Volvamos a esa persona: ¿qué le preguntarías de su trabajo?»''',
        'por_opcion': {
            'NADIE': {
                'filtrar_etiqueta': False,
                'pregunta': 'Está bien. ¿Qué tipo de persona te gustaría escuchar? Por ejemplo, alguien que estudió en un instituto o que trabaja en tu ciudad.',
                'tarjeta': '''NÚCLEO: un tipo de persona con algo concreto: dónde trabaja, qué o dónde estudió, cuánto
  tiempo lleva, o algo de su situación parecido a la suya.
NO EXIGIR: un nombre, ni saber cómo encontrarla.
GENERAL SI: "alguien que sepa", "un profesional", "cualquiera que trabaje en eso".
MATICES: "no sé" = no_sabe. No tener a quién preguntar no se presenta como un problema.
EJEMPLOS:
  "Una enfermera que trabaje en un hospital de aquí" → propio
  "Alguien que haya estudiado en el SENATI" → propio
  "Alguien que también sea el primero de su familia en estudiar" → propio
  "Un profesional" → general
REPREGUNTA
  general / no_sabe / vacio · QUÉ PEDIR: algo concreto de esa persona.
    BASE: «¿Qué tendría esa persona para que te sirva: dónde trabaja, qué estudió o algo de su vida parecido a la tuya?»
    CÓMO ADAPTARLA: no lo apures ni le digas que debería conocer a alguien.''',
            },
        },
    },
}
