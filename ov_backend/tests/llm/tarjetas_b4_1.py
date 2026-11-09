"""Tarjetas de b4-1. Solo datos: respalda y menos vienen de §1 de la spec v7.8c (candidatas) y TODO de `tarjetas-registros.md`; se copian tal cual.

`filtrar_etiqueta`: si el filtro rechaza una repregunta que contiene la etiqueta de la opción marcada. `por_opcion`: una opción con pregunta y tarjeta propias reemplaza a las del ítem. `ecos`: cómo se nombra cada eco y si va ordenado. `{carrera}` en la pregunta y en la tarjeta es un marcador que declara cada caso. Las bases se leen de las líneas `BASE:` de la tarjeta.
"""

TARJETAS = {
    'b4-1-respalda': {
        'filtrar_etiqueta': False,
        'pregunta': '¿Qué tiene que ver eso con {carrera}?',
        'ecos': {'plan_a': {'nombre': 'Tu Plan A', 'ordenado': False}},
        'tarjeta': '''NÚCLEO: una relación concreta entre la pieza que marcó y algo de esa carrera o del trabajo
  al que lleva: una tarea, un curso, un lugar, algo que se hace o se produce, o una
  condición de ese trabajo (que haya empleo, el horario, el contrato, las vacaciones,
  trabajar por su cuenta, cómo se paga: por turnos, por proyecto, cómo sube con los años).
NO EXIGIR: que la relación sea correcta o completa, que sepa mucho de la carrera, que la
  diga con todas las palabras (basta que se entienda), una cifra, ni más de una relación.
GENERAL SI:
  - repite la pieza o habla solo de sí, sin nada de la carrera ("porque soy así", "se me
    da bien eso");
  - una relación que vale para cualquier carrera ("en todo trabajo se resuelven
    problemas", "toda carrera necesita esfuerzo");
  - solo que le gusta o que es lo suyo ("me gusta", "es lo mío");
  - con un valor, dice que la carrera le da eso, con esas u otras palabras ("porque da
    estabilidad", "paga bien", "deja tiempo libre"), sin qué de la carrera o de su trabajo
    se lo da.
MATICES: "no sé qué se hace en esa carrera" o "no sé cómo se relaciona" = no_sabe: le falta
  el dato para relacionarlo. Una duda sobre sí ("creo que no soy capaz", "no sé si me
  alcanza") = no_sabe: no ve nada suyo que vaya con la carrera; no la contradigas. No se
  juzga si la pieza de verdad respalda la carrera ni si la carrera le conviene. Con un
  valor, una condición del trabajo cuenta igual que una tarea. Si relaciona otra cosa suya
  y no la pieza marcada = propio (no le pidas la marcada). Lo escrito en "Otra" es una
  pieza más. Que la carrera la haya elegido su familia no se juzga ni se comenta. Una pieza
  no es una aptitud: no la presentes como algo que lo hace capaz o no.
EJEMPLOS:
  "En Enfermería pasas el día atendiendo pacientes y a mí me nace cuidar" → propio (pieza: ayudar, cuidar o acompañar)
  "Los contadores revisan que los números cuadren, como cuando ordeno las cuentas de la bodega" → propio
  "En mecánica se desarman motores" → propio (pieza: trabajar con las manos; relación implícita)
  "Todas las empresas necesitan un contador, hasta las chiquitas" → propio (pieza: Estabilidad; condición: hay empleo)
  "Un traductor puede trabajar desde su casa y acomodar sus horas" → propio (pieza: Tiempo para la familia; condición: horario)
  "Porque me gusta cuidar a las personas" → general (repite la pieza)
  "En cualquier trabajo hay que resolver problemas" → general (vale para cualquier carrera)
  "Porque da estabilidad" → general (solo el valor)
  "Es lo mío" → general
  "No sé bien qué hace un diseñador gráfico" → no_sabe
REPREGUNTA
  general · QUÉ PEDIR: algo de la carrera o de su trabajo que se parezca a la pieza, la necesite o se la dé.
    BASE: «¿Qué se hace en {carrera} que se parezca a eso? Puede ser una tarea, un curso o algo del día a día de ese trabajo.»
    CÓMO ADAPTARLA: nombra la carrera y retoma la pieza por lo que dice, no por el test de
    donde viene; si solo dijo que le gusta, nombra la pieza (no "eso que te gusta"). Si
    repitió la pieza o habló solo de sí, pregunta en qué parte de la carrera se usaría, con
    dos o tres posibilidades dentro de la misma pregunta. Las posibilidades son partes de
    la carrera (un curso, una tarea, el lugar donde se trabaja), nunca la pieza misma. Si la
    pieza es un valor, no preguntes por tareas: pregunta qué de ese trabajo se lo daría (que
    haya empleo, el horario, el contrato, cómo se paga), sin pedir cifras. Si dio una
    relación que vale para cualquier carrera, pregunta dónde se vería en esta. Si dijo algo
    negativo de sí, no repitas esas palabras: retoma la pieza. Si cuenta lo que dice otra
    persona, no la discutas ni preguntes por ella: pregunta qué piensa él o ella. No digas si
    la pieza encaja o no, no afirmes lo que pide la carrera ni la compares con otras.
  no_sabe / vacio · BASE: «Imagina a alguien que ya trabaja en {carrera}: ¿qué hace en un día normal que se parezca a lo que marcaste?»
  fuera_de_tema · BASE: «Volvamos a lo que marcaste: ¿qué tiene que ver con {carrera}?»''',
    },
    'b4-1-menos': {
        'filtrar_etiqueta': False,
        'pregunta': '¿Qué de {carrera} no calza del todo con eso?',
        'ecos': {'plan_a': {'nombre': 'Tu Plan A', 'ordenado': False}},
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
        'por_opcion': {
            'TODO': {
                'filtrar_etiqueta': False,
                'pregunta': 'Qué bueno que todo vaya. Aun así, ¿qué parte de {carrera} crees que te costaría más?',
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
            },
        },
    },
}
