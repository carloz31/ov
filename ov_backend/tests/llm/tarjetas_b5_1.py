"""Tarjeta de b5-1. Solo datos: viene de §2 de la spec v7.11 (`prueba-tarjetas-b5-1.md`), provisional, y se copia tal cual, con su bloque SEGUIMIENTO.

`filtrar_etiqueta`: si el filtro rechaza una repregunta que contiene la etiqueta de la opción marcada. `ecos`: una sola línea con el proyecto de hoy (la carrera del Plan A, la institución y el camino si los tiene, y sus pasos pendientes y hechos). Las bases se leen de las líneas `BASE:` de la tarjeta.
"""

TARJETAS = {
    'b5-1-seguridad': {
        'filtrar_etiqueta': False,
        'pregunta': '¿Qué es lo que más influye en que te sientas así?',
        'ecos': {'proyecto': {'nombre': 'Tu proyecto hoy', 'ordenado': False}},
        'tarjeta': '''NÚCLEO: algo que le da o le quita seguridad frente a su próximo paso o a su proyecto: algo
  que ya hizo o averiguó, una persona que lo apoya o que se opone, un recurso que tiene o
  que le falta (la plata, el tiempo), algo suyo (algo que le sale bien o que le cuesta),
  una parte del proyecto (el examen, la academia, la carrera misma) o una duda o un miedo
  que nombra de qué es. Basta con uno de los dos lados, y basta con nombrar el tema.
NO EXIGIR: los dos lados, que el texto calce con el nivel que marcó, más detalle del tema
  que nombró (cuánta plata, qué parte del examen), qué hará, por qué siente lo que siente,
  ni más de una cosa.
GENERAL SI:
  - no nombra nada ("me siento seguro nomás", "porque sí", "normal", "todo");
  - duda de sí sin decir en qué ("no sé si podré", "no creo que me dé");
  - solo un motivo para elegir la carrera ("porque me gusta", "es lo que quiero", "es mi
    sueño");
  - solo describe su proyecto o repite un paso ("voy a postular el otro año");
  - solo lo que hará ("voy a estudiar más", "le voy a echar ganas");
  - nervios o miedo de decidir o de equivocarse, sin nada de su proyecto ("me da nervios
    tomar esta decisión", "tengo miedo de equivocarme").
MATICES: ante la duda entre propio y general, propio. Un tema solo ("la plata", "el examen")
  es propio: no pidas más detalle. Nervios o miedo con algo del proyecto ("me pone nervioso
  el examen") es propio. Nombrar nervios o miedo no es emocional, porque aquí se pregunta
  justamente cómo se siente; si expresa una angustia que lo desborda (no duerme, llora, se
  bloquea, siente que no puede con nada) = emocional, aunque nombre algo del proyecto.
  Decir que ninguna carrera lo convence, o que su carrera tampoco, es propio: no preguntes
  qué no le convence. Decir que lo tiene decidido desde hace años y no ha dudado es propio:
  esa firmeza es lo que le da seguridad. El apoyo o la oposición de su familia es propio;
  hablar de su familia nunca es fuera_de_tema, y no se comenta ni se juzga. Una
  autovaloración negativa ("soy malo para todo") = general: no la contradigas. "No sé" =
  no_sabe. No se juzga el nivel que marcó ni su proyecto, y no se sugiere cambiarlo.
EJEMPLOS:
  "Ya fui a la charla de la universidad y me explicaron cómo es el ingreso" → propio
  "Mi hermana estudió lo mismo y me va a orientar" → propio
  "No sé si en mi casa alcanza para la pensión" → propio
  "El puntaje que piden" → propio (un tema solo basta)
  "Me da miedo jalar el examen" → propio (miedo con algo del proyecto)
  "Soy bueno en biología y eso viene harto" → propio
  "La verdad ninguna carrera me termina de convencer" → propio
  "Mi papá quiere que estudie otra cosa" → propio
  "Lo tengo claro desde hace años, nunca dudé" → propio
  "Me siento bien nomás" → general
  "Porque es lo que quiero estudiar" → general (motivo de la carrera)
  "Me voy a esforzar al máximo" → general (solo lo que hará)
  "Me da nervios decidir algo tan grande" → general (nervios de decidir; no es emocional)
  "No creo que me dé" → general
  "Ni idea" → no_sabe
  "Me bloqueo, siento que no puedo con nada de esto" → emocional
REPREGUNTA
  general · QUÉ PEDIR: una cosa que le dé o le quite seguridad para su próximo paso.
    BASE: «Piensa en tu próximo paso: ¿qué te da seguridad para darlo, o qué te la quita?»
    CÓMO ADAPTARLA: la repregunta siempre pregunta qué le da o le quita seguridad para su
    próximo paso o su proyecto. Si no nombró nada, usa la base; si ayuda, ofrece dos o tres
    tipos de cosas dentro de la misma pregunta (algo que ya hiciste, alguien que te apoya,
    algo que te falta), nunca respuestas hechas. Si dio un motivo de la carrera, reconócelo
    en pocas palabras y pregunta qué le hace sentir que puede dar ese paso. Si dijo solo lo
    que hará, pregunta qué le hace sentir que puede hacerlo. Si describió su proyecto o
    repitió un paso, pregunta qué le da o le quita seguridad para ese paso. Si habló de
    nervios o miedo de decidir o de equivocarse, no nombres esa emoción ni preguntes por
    ella: pregunta por el proyecto ("De tu proyecto, ¿hay alguna parte que sientas menos
    firme?"). Si dudó de sí o dijo algo negativo de sí, no repitas esas palabras ni lo
    contradigas: pregunta por el paso ("¿Qué parte de ese paso ves más difícil?"). Nunca
    preguntes por el sentimiento (por qué lo siente, desde cuándo, qué tan fuerte), por qué
    eligió la carrera, por montos ni por la situación económica de su casa. No sugieras
    cambiar de plan, no califiques el nivel que marcó, no consueles ni contradigas, y no
    pidas algo "exacto" o "específico".
  no_sabe / vacio · BASE: «Mira tus pasos: ¿hay algo que ya tengas a favor para dar el próximo, o algo que te falte?»
  fuera_de_tema · BASE: «Volvamos a tu proyecto: ¿qué te da o te quita seguridad para tu próximo paso?»
SEGUIMIENTO: el conjunto es propio si la segunda respuesta nombra algo que le da o le quita
  seguridad. Si insiste en no nombrar nada, en los nervios de decidir o en "todo", queda
  general sin insistir. Si sigue sin saber, queda no_sabe (el ítem admite abierto).''',
    },
}
