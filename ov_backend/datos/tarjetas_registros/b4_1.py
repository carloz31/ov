"""Tarjetas de b4-1. Solo datos: el texto de cada tarjeta es el de `claude/tarjetas-registros*.md`,
copiado carácter por carácter. `bases` repite, separadas, las líneas `BASE:` de la tarjeta (sin reemplazar los
marcadores); la prueba `test_llm_tarjetas.py` comprueba que están dentro del texto.
"""

TARJETAS = {
    'b4-1-respalda': {
        'filtrar_etiqueta': False,
        'tarjeta': '''NÚCLEO: una relación concreta entre la pieza que marcó y algo de esa carrera o del trabajo
  al que lleva: una tarea, un curso, un lugar, algo que se hace o se produce, o una
  condición de ese trabajo (que haya empleo, el horario, el contrato, las vacaciones,
  trabajar por su cuenta, cómo se paga: por turnos, por proyecto, cómo sube con los años).
  Basta con que se entienda que lo de la carrera tiene que ver con la pieza, aunque no lo
  diga con todas las palabras.
NO EXIGIR: que la relación sea correcta o completa, que sepa mucho de la carrera, que la
  diga con todas las palabras, una cifra, ni más de una relación.
GENERAL SI:
  - repite la pieza o habla solo de sí, sin nada de la carrera ("porque soy así", "se me
    da bien eso");
  - nombra algo de la carrera que no tiene nada que ver con la pieza (con "ayudar o cuidar
    a otros" en Arquitectura: "se hacen maquetas");
  - una relación que vale para cualquier carrera ("en todo trabajo se resuelven
    problemas", "toda carrera necesita esfuerzo");
  - solo que le gusta o que es lo suyo ("me gusta", "es lo mío");
  - con un valor, dice que la carrera le da eso, con esas u otras palabras ("porque da
    estabilidad", "paga bien", "deja tiempo libre"), sin qué de la carrera o de su trabajo
    se lo da;
  - dice quién eligió la carrera o lo que otra persona espera de él, sin nada suyo frente
    a la carrera ("mi tía me la recomendó", "en mi casa quieren eso"); si además dice que
    no sabe, es no_sabe.
MATICES: si la pieza es algo que hacía de niño, basta con que lo de la carrera tenga que ver
  con ese tipo de actividad (cocinar, armar, estar en el campo), no con la escena. Si
  cuenta algo suyo del mismo tipo que la pieza y algo de la carrera que lo usa = propio.
  Hay dos tipos de valores: los que se cumplen en el trabajo mismo (Ayudar a otros, Aportar
  a mi comunidad, Crear, Aprender, Reconocimiento) se relacionan con una tarea; los que se
  cumplen en las condiciones (Estabilidad, Ingresos, Tiempo para la familia, Autonomía),
  con una condición del trabajo. "No sé qué se hace en esa carrera" o "no sé cómo se
  relaciona" = no_sabe: le falta el dato para relacionarlo. Una duda sobre sí ("creo que
  no soy capaz", "no sé si me alcanza") = no_sabe: no la contradigas. Si dice quién eligió
  la carrera y además que no sabe = no_sabe. Si expresa sobre todo miedo o angustia sin
  nada de la carrera = emocional, y eso manda sobre la duda. Hablar de quién eligió la
  carrera o de lo que dice su familia nunca es fuera_de_tema, y no se juzga ni se comenta.
  No se juzga si la pieza de verdad respalda la carrera ni si la carrera le conviene. Si
  relaciona otra cosa suya y no la pieza marcada = propio (no le pidas la marcada). Lo
  escrito en "Otra" es una pieza más. Una pieza no es una aptitud: no la presentes como
  algo que lo hace capaz o no.
EJEMPLOS:
  "En Enfermería pasas el día atendiendo pacientes y a mí me nace cuidar" → propio (pieza: ayudar, cuidar o acompañar)
  "Los contadores revisan que los números cuadren, como cuando ordeno las cuentas de la bodega" → propio
  "En mecánica se desarman motores" → propio (pieza: trabajar con las manos; relación implícita)
  "Hay física y estadística en todos los ciclos" → propio (pieza: Matemática; el curso usa la pieza)
  "Juego fútbol desde chico y en la carrera se aprende a entrenar equipos" → propio (pieza: usar el cuerpo; algo suyo del mismo tipo)
  "En Administración se manejan ventas y caja" → propio (pieza de niño: jugar a la tiendita; mismo tipo de actividad)
  "En Medicina nunca se deja de estudiar" → propio (pieza: Aprender; valor que se cumple en el trabajo)
  "Todas las empresas necesitan un contador, hasta las chiquitas" → propio (pieza: Estabilidad; condición: hay empleo)
  "Un traductor puede trabajar desde su casa y acomodar sus horas" → propio (pieza: Tiempo para la familia; condición: horario)
  "Porque me gusta cuidar a las personas" → general (repite la pieza)
  "En Medicina se estudian muchos años" → general (pieza: ayudar o cuidar; no tiene nada que ver con ella)
  "Se calculan estructuras y se revisan planos" → general (pieza: ponerte en el lugar del otro, en Ingeniería Civil; tarea real que no tiene que ver con ponerse en el lugar del otro)
  "En cualquier trabajo hay que resolver problemas" → general (vale para cualquier carrera)
  "Porque da estabilidad" → general (solo el valor)
  "Es lo mío" → general
  "No sé bien qué hace un diseñador gráfico" → no_sabe
  "Mi tío me dijo que la estudie, pero no sé por qué" → no_sabe (quién eligió y además no sabe)
  "Me angustia pensar que elegí mal" → emocional
REPREGUNTA
  general · QUÉ PEDIR: en qué momento de la carrera o de su trabajo aparecería la pieza.
    BASE: «¿En qué momento de {carrera} usarías lo que marcaste? Puede ser una tarea, un curso o algo del día a día de ese trabajo.»
    CÓMO ADAPTARLA: la pregunta une la pieza con la carrera: nombra la pieza por lo que
    dice (no por el test de donde viene, ni "eso que te gusta"); si la pieza es larga,
    nómbrala en dos o tres palabras. Pregunta en qué momento de la carrera aparecería, con
    dos o tres posibilidades cortas dentro de la misma pregunta (con "te pones en el lugar
    del otro" en Enfermería: "¿en qué momento de Enfermería te tocaría ponerte en el lugar
    del otro: con un paciente asustado, con su familia, en una guardia?"). Con una pieza de
    la niñez, toma el tipo de actividad, no la escena (no "cocinar con tu abuela"). No
    preguntes por partes de la carrera sueltas ("¿qué parte de ser abogado usarías más?").
    Las posibilidades son momentos de la carrera, nunca la pieza misma. Si nombró algo de
    la carrera sin relación con la pieza, retoma eso con sus palabras y pregunta qué tiene
    que ver con la pieza ("Dijiste que …: ¿qué tiene que ver eso con …?"). Con un valor
    que se cumple en el trabajo mismo, pregunta en qué tarea lo encontraría; con un valor
    de condiciones, no preguntes por tareas: pregunta qué de ese trabajo se lo daría y
    ofrece tipos de condición (el horario, las vacaciones, el contrato, cómo se paga), no
    respuestas hechas; sin pedir cifras. Si dio una relación que vale para cualquier
    carrera, pregunta dónde se vería en esta. Si dijo algo negativo de sí, no repitas esas
    palabras: retoma la pieza. Si dijo quién eligió la carrera o lo que espera otra
    persona, no lo comentes ni preguntes por esa persona: pasa a él o ella ("Y tú…") y
    pregunta en qué momento de la carrera aparecería la pieza. No digas si la pieza encaja
    o no, no afirmes lo que pide la carrera ni la compares con otras.
  no_sabe / vacio · BASE: «Imagina a alguien que ya trabaja en {carrera}: ¿qué hace en un día normal que se parezca a lo que marcaste?»
  fuera_de_tema · BASE: «Volvamos a lo que marcaste: ¿qué tiene que ver con {carrera}?»''',
        'bases': {
            'general': '¿En qué momento de {carrera} usarías lo que marcaste? Puede ser una tarea, un curso o algo del día a día de ese trabajo.',
            'no_sabe': 'Imagina a alguien que ya trabaja en {carrera}: ¿qué hace en un día normal que se parezca a lo que marcaste?',
            'vacio': 'Imagina a alguien que ya trabaja en {carrera}: ¿qué hace en un día normal que se parezca a lo que marcaste?',
            'fuera_de_tema': 'Volvamos a lo que marcaste: ¿qué tiene que ver con {carrera}?',
        },
    },
    'b4-1-menos': {
        'filtrar_etiqueta': False,
        'tarjeta': '''NÚCLEO: algo concreto de la carrera o de su trabajo (un curso, una tarea, una situación o una
  condición de ese trabajo) que choca con la pieza que marcó. Si la pieza es algo que le
  cuesta, basta con dónde se notaría en la carrera. Si es algo que le gusta, que valora o
  que le sale bien, lo que choca es que la carrera no lo tiene o pide lo contrario.
NO EXIGIR: qué hará, qué piensa de eso, si le preocupa, cómo lo resolvería, ni que sea
  grave.
GENERAL SI:
  - repite la pieza sin nada de la carrera ("me cuesta exponer", "no soy bueno en mate");
  - vago, sin decir en qué ("no sé si soy buena para eso", "a veces no calza", "es
    difícil");
  - dice que sí calza o que no hay problema, sin nombrar nada ("normal, se puede");
  - una dificultad de su situación y no de él frente a la carrera (el costo, la distancia,
    lo que piensa su familia);
  - lo que otra persona opina de él, sin nada suyo frente a la carrera.
MATICES: solo las piezas con "(lo que te cuesta)" son cosas que le cuestan; las demás son
  cosas que le gustan, valora o le salen bien: no las presentes como algo que le cuesta.
  "No sé qué tanto se usa eso en esa carrera" o "no sé cómo es eso en esa carrera" =
  no_sabe. Una autovaloración negativa ("soy malo para todo") = general: no la contradigas.
  Si cuenta lo que dice otra persona y eso dice algo concreto de la carrera que choca con
  la pieza = propio. Si marcó la misma pieza que en lo que respalda, no se cuestiona. Que
  algo no calce no es un problema ni un límite: no sugieras que la carrera no es para él.
  Si expresa sobre todo miedo o angustia sin nombrar nada de la carrera = emocional.
EJEMPLOS:
  "Un abogado tiene que hablar en audiencias y yo me pongo rojo apenas hablo" → propio (pieza: Exponer, lo que te cuesta)
  "En diseño cada cliente pide algo distinto y a mí me gusta tener pasos fijos" → propio (pieza: ordenar y seguir procedimientos; la carrera pide lo contrario)
  "Contabilidad es puro número todo el día" → propio (pieza: Matemática, lo que te cuesta)
  "En contabilidad se siguen normas fijas y casi no hay espacio para inventar" → propio (pieza: Crear; la carrera no lo tiene)
  "Me cuesta la química" → general (repite la pieza)
  "No sé si soy buena para eso" → general (vago)
  "Es muy cara la universidad" → general (su situación, no él frente a la carrera)
  "No sé cuánta química lleva Enfermería" → no_sabe
REPREGUNTA
  general · QUÉ PEDIR: qué de la carrera va menos con esa pieza.
    BASE: «¿Qué de {carrera} no va del todo con eso? Puede ser un curso, una tarea o algo del día a día de ese trabajo.»
    CÓMO ADAPTARLA: nombra la carrera y retoma la pieza por lo que dice, no por el test de
    donde viene. Si la pieza es algo que le cuesta, pregunta en qué parte de la carrera se
    notaría. Si es algo que le gusta, valora o le sale bien, pregunta qué de la carrera no
    tiene eso o pide lo contrario (con un valor: el horario, los viajes, cómo se paga, la
    forma de trabajar). Ofrece dos o tres posibilidades dentro de la misma pregunta: son
    partes de la carrera, nunca la pieza misma (con Exponer en Derecho: una audiencia,
    atender a un cliente, defender un caso). Si dijo algo negativo de sí ("no sirvo", "soy
    malo"), no repitas esas palabras: retoma la pieza. Si habló del costo, la distancia o
    su familia, reconócelo en pocas palabras y vuelve a lo que marcó. Si cuenta lo que dice
    otra persona, no la discutas ni preguntes por ella: pregunta qué piensa él o ella. Si
    dijo que sí calza, no lo contradigas: pregunta qué parte de la carrera va menos con esa
    pieza. No preguntes qué hará, si le preocupa ni cómo lo resolvería, y no sugieras que
    la carrera no es para él.
  no_sabe / vacio · BASE: «Imagina tu primer año en {carrera}: ¿qué momento crees que chocaría con lo que marcaste?»
  fuera_de_tema · BASE: «Volvamos a lo que marcaste: ¿qué de {carrera} no calza del todo con eso?»''',
        'bases': {
            'general': '¿Qué de {carrera} no va del todo con eso? Puede ser un curso, una tarea o algo del día a día de ese trabajo.',
            'no_sabe': 'Imagina tu primer año en {carrera}: ¿qué momento crees que chocaría con lo que marcaste?',
            'vacio': 'Imagina tu primer año en {carrera}: ¿qué momento crees que chocaría con lo que marcaste?',
            'fuera_de_tema': 'Volvamos a lo que marcaste: ¿qué de {carrera} no calza del todo con eso?',
        },
        'por_opcion': {
            'TODO': {
                'filtrar_etiqueta': False,
                'tarjeta': '''NÚCLEO: una parte concreta de la carrera que le costaría: un curso, una tarea, una situación
  del trabajo o un momento de la carrera.
NO EXIGIR: por qué le costaría, que le preocupe, qué hará, ni que deje de pensar que todo va.
GENERAL SI:
  - "nada" o que no le costaría nada;
  - algo que vale para cualquier carrera ("estudiar mucho", "el esfuerzo", "todo se puede");
  - solo su situación (el costo, la distancia).
MATICES: "no sé qué cursos lleva" = no_sabe. No le discutas que todo vaya ni le sugieras que
  debería costarle algo.
EJEMPLOS:
  "Las guardias de noche" → propio (Medicina)
  "Las entregas de maquetas con amanecidas" → propio (Arquitectura)
  "Nada, todo bien" → general
  "Estudiar harto" → general
  "Ni idea de qué lleva" → no_sabe
REPREGUNTA
  general / no_sabe / vacio · QUÉ PEDIR: una parte concreta de la carrera que le exigiría más.
    BASE: «Puede ser algo pequeño: un curso, una tarea o un momento de {carrera} que te pediría más. ¿Cuál sería?»
    CÓMO ADAPTARLA: ofrece dos o tres partes posibles de esa carrera dentro de la misma
    pregunta. Si dijo "nada", no lo contradigas. En el seguimiento, si insiste en "nada",
    no insistas: usa la base.''',
                'bases': {
                    'general': 'Puede ser algo pequeño: un curso, una tarea o un momento de {carrera} que te pediría más. ¿Cuál sería?',
                    'no_sabe': 'Puede ser algo pequeño: un curso, una tarea o un momento de {carrera} que te pediría más. ¿Cuál sería?',
                    'vacio': 'Puede ser algo pequeño: un curso, una tarea o un momento de {carrera} que te pediría más. ¿Cuál sería?',
                },
            },
        },
    },
}
