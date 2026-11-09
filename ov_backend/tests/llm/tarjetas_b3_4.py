"""Tarjetas de b3-4. Solo datos: el texto viene de `tarjetas-registros.md` y se copia tal cual.

`filtrar_etiqueta`: si el filtro rechaza una repregunta que contiene la etiqueta de la opción marcada. `por_opcion`: una opción con pregunta y tarjeta propias reemplaza a las del ítem. `ecos`: cómo se nombra cada eco y si va ordenado; `lista_ecos`: de dónde salen sus etiquetas (el eco de texto no usa lista). `{valor 1}` en la pregunta es la etiqueta del primero de los valores del caso. Las bases se leen de las líneas `BASE:` de la tarjeta.
"""

TARJETAS = {
    'b3-4-necesito': {
        'filtrar_etiqueta': False,
        'pregunta': 'Pusiste {valor 1} primero. ¿Qué tendrías que saber de la carrera que elijas para saber si te da eso?',
        'ecos': {
            'valores': {'nombre': 'Lo que pusiste primero', 'ordenado': False},
        },
        'lista_ecos': 'VALORES',
        'tarjeta': '''NÚCLEO: algo concreto que tendría que saber de una carrera o del trabajo al que lleva para
  ver si le da lo que valora: cómo son los horarios o los turnos, si hay que viajar o
  mudarse, si suele haber contrato, si se puede trabajar por cuenta propia, si se trata
  con personas, cuánto se gana al empezar, en su región o con los años.
NO EXIGIR: una carrera concreta, dónde lo averiguaría, que sea un dato del catálogo, ni que
  lo que pregunta encaje con su valor.
GENERAL SI:
  - solo un tema, sin decir qué querría saber de él ("los horarios", "el trabajo");
  - una pregunta vaga que sirve para cualquiera ("si es buena", "cómo es");
  - repite el valor como pregunta ("si tiene estabilidad", "si me deja crear");
  - quiere saber "todo" o "más información".
MATICES: si lo que pregunta va más con otro valor o con ninguno, igual es propio si es
  concreto: no lo devuelvas a su valor. Si cuenta algo que ya sabe de una carrera o de
  alguien que trabaja en eso = propio. "No sé qué tendría que saber" = no_sabe. No se juzga
  el valor ni si una carrera se lo daría. Querer irse de su casa, sin violencia ni riesgo,
  NO es sensible.
EJEMPLOS:
  "Si los médicos tienen que hacer guardias de noche" → propio (Tiempo para la familia)
  "Si un diseñador puede trabajar por su cuenta o siempre en una empresa" → propio (Autonomía)
  "Cuánto gana un contador en Arequipa, no en Lima" → propio (Ingresos)
  "Si en enfermería te hacen contrato o es por recibos" → propio (Estabilidad)
  "Si hay que viajar mucho por trabajo" → propio (Estabilidad: no se juzga si encaja)
  "Si se puede ascender rápido" → propio (Estabilidad: va más con otro tema, igual vale)
  "Sé que en las fábricas hay turnos rotativos porque mi tío trabaja en una" → propio (lo que ya sabe)
  "Los horarios" → general (solo el tema)
  "Si es una buena carrera" → general (vaga)
  "Si tiene estabilidad" → general (repite el valor)
  "Ni idea de qué tendría que saber" → no_sabe
REPREGUNTA
  general · QUÉ PEDIR: algo concreto de ese trabajo que le diría si le da lo que valora.
    BASE: «Piensa en un día de trabajo: ¿qué tendría que pasar, o no pasar, para que te dé lo que pusiste primero?»
    CÓMO ADAPTARLA: si nombró un tema, pregunta qué querría averiguar de ese tema, con dos
    o tres posibilidades de lo que un promedio no dice (el sueldo: si sube con los años, si
    es igual en tu región, si llega fijo cada mes). Si repitió el valor, pregunta qué
    tendría que ver en un trabajo para saberlo (Tiempo para la familia: los horarios, los
    turnos, si hay que viajar). Si fue vago, pregunta qué le haría pensar que le conviene.
    No le preguntes cuánto quiere ganar, no pidas una cifra ni digas si una carrera da o
    no ese valor.
  no_sabe / vacio · BASE: «Imagina que ya trabajas en algo que te gusta. ¿Qué querrías que fuera de una forma y no de otra: el horario, el sueldo o con quién trabajas?»
  fuera_de_tema · BASE: «Volvamos a lo que pusiste primero: ¿qué tendrías que saber de una carrera para saber si te da eso?»''',
    },
    'b3-4-quien': {
        'filtrar_etiqueta': False,
        'pregunta': '¿Qué sabe o vivió esa persona que te podría servir?',
        'ecos': {
            'necesito': {'nombre': 'Lo que necesitarías saber', 'ordenado': False},
        },
        'tarjeta': '''NÚCLEO: una razón concreta para preguntarle a esa persona: algo que la une con lo que
  quiere saber o con una carrera o trabajo (trabaja o trabajó en eso, lo estudió, conoce a
  gente de ese rubro, vivió algo parecido, le ha contado cosas de su trabajo).
NO EXIGIR: que trabaje justo en lo que le interesa, que sepa todo, que ya hayan hablado,
  ni que sea la persona más adecuada.
GENERAL SI:
  - solo el vínculo o la confianza ("porque es mi hermana", "porque confío en ella");
  - dice que sabe o que tiene experiencia, sin decir de qué ("porque sabe mucho");
  - habla de esa persona o de lo que pasa con ella (que no lo apoya, que no es fácil
    hablarle) sin decir por qué podría ayudarlo.
MATICES: si da una razón concreta y además dice que no es fácil hablarle = propio. "No sé
  por qué la marqué" = no_sabe. Hablar de esa persona nunca es fuera_de_tema. No se juzga
  si es la persona más adecuada. Que en casa no apoyen una carrera o discutan por eso, sin
  violencia ni riesgo, NO es sensible.
EJEMPLOS:
  "Trabajó diez años en una fábrica y sabe cómo son los turnos" → propio
  "Estudió en un instituto y después se pasó a la universidad" → propio
  "Conoce a varios contadores por su trabajo" → propio
  "Porque es mi hermana" → general (solo el vínculo)
  "Porque sabe mucho" → general (sin de qué)
  "Ni idea, la marqué por marcar" → no_sabe
REPREGUNTA
  general · QUÉ PEDIR: qué le hace pensar que esa persona podría contarle cómo es.
    BASE: «¿Qué te hace pensar que esa persona te podría contar cómo es: algo en lo que trabaja, algo que estudió o algo que vivió?»
    CÓMO ADAPTARLA: nombra a la persona por cómo la marcó. Si dijo solo el vínculo o la
    confianza, reconócelo en pocas palabras y pregunta qué sabe o vivió esa persona. Si
    dijo que no es fácil hablarle o que no lo apoya, no comentes eso ni preguntes por la
    relación: pregunta qué le hace pensar que podría ayudarlo. No sugieras que elija a
    otra persona.
  no_sabe / vacio · BASE: «Piensa en lo que esa persona hace o ha hecho: ¿algo de eso tiene que ver con lo que quieres saber?»
  fuera_de_tema · BASE: «Volvamos a esa persona: ¿qué sabe o vivió que te podría servir?»''',
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
