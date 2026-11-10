"""Tarjeta de b5-1. Solo datos: viene de §2 de la spec v7.11b (`prueba-tarjetas-b5-1-v7.11b.md`), provisional, y se copia tal cual, con su bloque SEGUIMIENTO. Reemplaza a la de v7.11.

`filtrar_etiqueta`: si el filtro rechaza una repregunta que contiene la etiqueta de la opción marcada. `ecos`: una sola línea con la carrera del Plan A y, si la tiene, la institución; sin camino ni pasos. Las bases se leen de las líneas `BASE:` de la tarjeta.
"""

TARJETAS = {
    'b5-1-seguridad': {
        'filtrar_etiqueta': False,
        'pregunta': '¿Qué te da seguridad en tu proyecto, o qué te la quita?',
        'ecos': {'proyecto': {'nombre': 'Tu proyecto', 'ordenado': False}},
        'tarjeta': '''NÚCLEO: algo que le da o le quita seguridad en su proyecto: algo que ya hizo o averiguó, algo
  que todavía no sabe o le falta, una persona que lo apoya o que se opone, un recurso que
  tiene o que le falta (la plata, el tiempo), algo suyo (algo que le sale bien o que le
  cuesta), una parte del proyecto (el examen, la academia, la carrera misma) o una duda o
  un miedo que nombra de qué es. Basta con uno de los dos lados, y basta con nombrar el
  tema.
NO EXIGIR: los dos lados, que el texto calce con el nivel que marcó, más detalle del tema
  que nombró (cuánta plata, qué parte del examen), qué hará, por qué siente lo que siente,
  ni más de una cosa.
GENERAL SI:
  - no nombra nada ("me siento seguro nomás", "porque sí", "normal", "todo");
  - duda de sí sin decir en qué ("no sé si podré", "no creo que me dé");
  - solo un motivo para elegir la carrera ("porque me gusta", "es lo que quiero", "es mi
    sueño");
  - nervios o miedo de decidir o de equivocarse, sin nada de su proyecto ("me da nervios
    tomar esta decisión", "tengo miedo de equivocarme").
FUERA_DE_TEMA SI:
  - solo dice lo que hará o lo que piensa hacer, sin nada que le dé o le quite seguridad
    ("voy a inscribirme en una academia", "me voy a esforzar al máximo", "voy a postular a
    varias").
MATICES: ante la duda entre propio y general, propio. Si cuenta lo que hará y con eso deja
  ver lo que todavía no sabe, lo que le falta o lo que le cuesta, es propio ("no tengo idea
  de cuánto cuesta, recién voy a preguntar"). Algo que ya hizo es propio. Un tema solo ("la
  plata", "el examen") es propio: no pidas más detalle. Nervios o miedo con algo del
  proyecto ("me pone nervioso el examen") es propio. Nombrar nervios o miedo no es
  emocional, porque aquí se pregunta justamente cómo se siente; si expresa una angustia que
  lo desborda (no duerme, llora, se bloquea, siente que no puede con nada) = emocional,
  aunque nombre algo del proyecto. Decir que ninguna carrera lo convence, o que su carrera
  tampoco, es propio. Decir que lo tiene decidido desde hace años y no ha dudado es propio:
  esa firmeza es lo que le da seguridad. El apoyo o la oposición de su familia es propio;
  hablar de su familia nunca es fuera_de_tema, y no se comenta ni se juzga. Una
  autovaloración negativa ("soy malo para todo") = general. "No sé" = no_sabe. No se juzga
  el nivel que marcó ni su proyecto.
EJEMPLOS:
  "Ya fui a la charla de la universidad y me explicaron cómo es el ingreso" → propio
  "Mi hermana estudió lo mismo y me va a orientar" → propio
  "No sé si en mi casa alcanza para la pensión" → propio
  "El puntaje que piden" → propio (un tema solo basta)
  "Me da miedo jalar el examen" → propio (miedo con algo del proyecto)
  "No tengo idea de cuánto cuesta, recién voy a preguntar" → propio (lo que hará deja ver lo que no sabe)
  "La verdad ninguna carrera me termina de convencer" → propio
  "Mi papá quiere que estudie otra cosa" → propio
  "Lo tengo claro desde hace años, nunca dudé" → propio
  "Me siento bien nomás" → general
  "Porque es lo que quiero estudiar" → general (motivo de la carrera)
  "Me da nervios decidir algo tan grande" → general (nervios de decidir; no es emocional)
  "No creo que me dé" → general
  "Voy a inscribirme en una academia" → fuera_de_tema (solo lo que hará)
  "Me voy a esforzar al máximo" → fuera_de_tema (solo lo que hará)
  "Ni idea" → no_sabe
  "Me bloqueo, siento que no puedo con nada de esto" → emocional
REPREGUNTA
  general · BASE: «¿Qué te da seguridad en tu proyecto, o qué te la quita? Puede ser algo que ya tienes a favor o algo que sientes que te falta.»
    CÓMO ADAPTARLA: no la adaptes. Devuelve la base tal cual, sin retomar ni mencionar lo
    que escribió (ni la emoción, ni sus palabras sobre sí, ni el motivo).
  no_sabe / vacio · BASE: «Mira tu proyecto: ¿hay algo que ya tengas a favor, o algo que sientas que te falta?»
  fuera_de_tema · BASE: «Volvamos a tu proyecto: ¿qué te da seguridad, o qué te la quita?»
SEGUIMIENTO: el conjunto es propio si la segunda respuesta nombra algo que le da o le quita
  seguridad. Si insiste en no nombrar nada, en los nervios de decidir o en "todo", queda
  general sin insistir. Si insiste en lo que hará, queda fuera_de_tema. Si sigue sin saber,
  queda no_sabe (el ítem admite abierto). La pista es la base del tipo que quedó, tal cual.''',
    },
}
