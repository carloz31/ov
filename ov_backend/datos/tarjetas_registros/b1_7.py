"""Tarjetas de b1-7. Solo datos: el texto de cada tarjeta es el de `claude/tarjetas-registros*.md`,
copiado carácter por carácter. `bases` repite, separadas, las líneas `BASE:` de la tarjeta (sin reemplazar los
marcadores); la prueba `test_llm_tarjetas.py` comprueba que están dentro del texto.
"""

TARJETAS = {
    'b1-7-dia': {
        'filtrar_etiqueta': False,
        'pregunta': 'Cuéntalo como una escena: ¿dónde estás, qué haces o qué eres?',
        'tarjeta': '''NÚCLEO: al menos un elemento concreto de ese día: un lugar (dónde vive o está), algo que
  hace en algún momento o lo que es (una profesión, un oficio, un rol).
NO EXIGIR: el día completo, con quién está, que sea realista ni que tenga que ver con una
  carrera.
GENERAL SI:
  - solo deseos o estados ("ser feliz", "con plata y mi familia", "teniendo éxito");
  - una actividad sola, sin qué ni dónde (solo trabajar o estudiar);
  - solo con quién está, sin dónde ni qué hace;
  - un lugar definido solo por lo que quiere evitar ("lejos de aquí", "donde nadie me
    moleste").
MATICES: "no sé" o "no me lo imagino" = no_sabe. Querer estar lejos de su casa o de
  alguien, sin violencia ni riesgo, NO es sensible.
EJEMPLOS:
  "Me levanto en mi depa en Miraflores y me voy a la oficina" → propio (lugar, qué hace)
  "Soy profesora de primaria" → propio (lo que es)
  "En un taller arreglando motos" → propio
  "Feliz y con estabilidad" → general (estados)
  "Trabajando nomás" → general (sin qué ni dónde)
  "Con mi familia" → general (solo con quién)
  "Ni idea" → no_sabe
REPREGUNTA
  general · QUÉ PEDIR: un momento concreto de ese día.
    BASE: «Elige un momento de ese día, por ejemplo a media mañana: ¿dónde estás y qué estás haciendo?»
    CÓMO ADAPTARLA: si dijo un deseo o un estado, reconócelo en pocas palabras y pregunta
    dónde está o qué hace ese día. Si dijo que trabaja o estudia, pregunta en qué o
    dónde. Si dijo con quién está, pregunta dónde están o qué hacen. Si habló de lo que
    quiere evitar, no lo cuestiones ni preguntes por qué: pregunta dónde le gustaría
    estar o qué estaría haciendo ahí.
  no_sabe / vacio · BASE: «Puedes pensar en el día de alguien que admiras y cambiar lo que quieras: ¿dónde estarías tú?»
  fuera_de_tema · BASE: «Volvamos a ese día a tus 23 años: ¿dónde estás y qué estás haciendo?»''',
        'bases': {
            'general': 'Elige un momento de ese día, por ejemplo a media mañana: ¿dónde estás y qué estás haciendo?',
            'no_sabe': 'Puedes pensar en el día de alguien que admiras y cambiar lo que quieras: ¿dónde estarías tú?',
            'vacio': 'Puedes pensar en el día de alguien que admiras y cambiar lo que quieras: ¿dónde estarías tú?',
            'fuera_de_tema': 'Volvamos a ese día a tus 23 años: ¿dónde estás y qué estás haciendo?',
        },
        'por_opcion': {
            'CUESTA': {
                'filtrar_etiqueta': False,
                'pregunta': 'Está bien. Cuéntame una sola cosa que te gustaría que esté en ese día: un lugar, algo que haces o alguien con quien estás.',
                'tarjeta': '''NÚCLEO: una sola cosa concreta que le gustaría en ese día: un lugar, algo que hace, lo
  que es o alguien con quien está.
NO EXIGIR: una escena, que esté seguro ni que tenga que ver con estudios o trabajo.
GENERAL SI: solo un estado o un deseo sin nada concreto ("estar bien", "ser feliz",
  "tener plata").
MATICES: "no sé" o que no se le ocurre nada = no_sabe; es válido que le cueste. Si
  expresa sobre todo un malestar fuerte al pensar en el futuro (angustia, miedo, pena)
  sin nombrar nada = emocional.
EJEMPLOS:
  "Con mi perro en una casa con jardín" → propio (lugar, con quién)
  "Cocinando para mi familia" → propio (algo que hace)
  "Con mi abuela" → propio (alguien con quien está)
  "Estar tranquilo" → general (estado)
REPREGUNTA
  general / no_sabe / vacio · QUÉ PEDIR: una sola cosa concreta.
    BASE: «Puede ser algo muy simple: un lugar donde te gustaría vivir, algo que te gustaría hacer o alguien con quien te gustaría estar. ¿Qué sería?»
    CÓMO ADAPTARLA: no lo apures ni le digas que debería saberlo. Si dijo un estado
    ("estar tranquilo"), pregunta qué haría o dónde estaría para sentirse así.''',
                'bases': {
                    'general': 'Puede ser algo muy simple: un lugar donde te gustaría vivir, algo que te gustaría hacer o alguien con quien te gustaría estar. ¿Qué sería?',
                    'no_sabe': 'Puede ser algo muy simple: un lugar donde te gustaría vivir, algo que te gustaría hacer o alguien con quien te gustaría estar. ¿Qué sería?',
                    'vacio': 'Puede ser algo muy simple: un lugar donde te gustaría vivir, algo que te gustaría hacer o alguien con quien te gustaría estar. ¿Qué sería?',
                },
            },
        },
    },
    'b1-7-hito': {
        'filtrar_etiqueta': False,
        'pregunta': '¿Qué estarás haciendo dentro de un año para acercarte a ese día? Por ejemplo: en una academia, estudiando algo, trabajando o postulando.',
        'tarjeta': '''NÚCLEO: qué estará haciendo dentro de un año, con a qué, para qué, qué o dónde: preparándose
  para algo, postulando a algo, estudiando algo o en algún lugar, trabajando en algo o en
  algún lugar, terminando el colegio.
NO EXIGIR: certeza, que ya lo tenga decidido, el nombre de una universidad, carrera o
  lugar (basta "a una universidad", "para una pública"), la relación con el día a los 23,
  ni que sea estudiar.
GENERAL SI:
  - un estado o un sentimiento ("estaré bien", "más tranquilo");
  - solo estudiar o trabajar, sin qué ni dónde;
  - un lugar o una acción sola, sin a qué ni para qué (solo la academia, solo postular);
  - la meta final sin el año ("ser enfermera", "tener mi negocio").
MATICES: "no sé" o "depende" sin más = no_sabe. Si plantea dos posibilidades ("si
  ingreso, en la universidad; si no, en una academia") = propio.
EJEMPLOS:
  "Preparándome en una academia para la UNI" → propio
  "Postulando a Medicina" → propio
  "Postulando a alguna universidad" → propio (no exige el nombre)
  "En la tienda de mi tía, ayudándola" → propio
  "Estaré bien" → general (estado)
  "Estudiando, supongo" → general (sin qué ni dónde)
  "Ser policía" → general (meta, no el año)
  "Depende de si ingreso" → no_sabe
REPREGUNTA
  general · QUÉ PEDIR: qué estará haciendo en concreto dentro de un año.
    BASE: «¿Qué estarías haciendo un martes cualquiera dentro de un año? Puede ser estudiar, trabajar o prepararte para algo.»
    CÓMO ADAPTARLA: si dijo que estudiará o trabajará, pregunta qué o dónde. Si dijo un
    lugar o una acción sola (la academia, postular), pregunta para qué o a qué, sin pedir
    un nombre: una respuesta general ("a una universidad") basta. Si habló de la meta
    final, reconócela y pregunta qué estaría haciendo el próximo año para acercarse. Si
    dijo un estado, pregunta qué estaría haciendo.
  no_sabe / vacio · BASE: «Está bien si depende de cosas que aún no sabes. Si todo saliera como esperas, ¿qué estarías haciendo dentro de un año?»
  fuera_de_tema · BASE: «Volvamos al próximo año: ¿qué estarás haciendo para acercarte a ese día?»''',
        'bases': {
            'general': '¿Qué estarías haciendo un martes cualquiera dentro de un año? Puede ser estudiar, trabajar o prepararte para algo.',
            'no_sabe': 'Está bien si depende de cosas que aún no sabes. Si todo saliera como esperas, ¿qué estarías haciendo dentro de un año?',
            'vacio': 'Está bien si depende de cosas que aún no sabes. Si todo saliera como esperas, ¿qué estarías haciendo dentro de un año?',
            'fuera_de_tema': 'Volvamos al próximo año: ¿qué estarás haciendo para acercarte a ese día?',
        },
    },
    'b1-7-freno': {
        'filtrar_etiqueta': False,
        'pregunta': '¿Qué podría frenarte en el camino a ese día? Puede ser algo de dinero, de tu familia, de los estudios o algo que no depende de ti.',
        'tarjeta': '''NÚCLEO: un freno concreto en su situación: qué podría pasar o qué le preocupa. Puede ser
  algo suyo o algo externo (la familia, el país, la economía de la casa).
NO EXIGIR: que sea probable o grave, que diga qué haría, ni que tenga solución.
GENERAL SI:
  - una categoría sola, sin decir en qué aspecto lo podría complicar (la plata, la
    familia, los estudios, "problemas");
  - algo vago ("muchas cosas", "la vida");
  - dice que nada lo frenaría.
MATICES: "no sé qué me podría frenar" = no_sabe. Algo doloroso sin riesgo (la enfermedad
  de alguien, una pérdida) = propio. Violencia, abuso o riesgo = sensible.
EJEMPLOS:
  "Que no me alcance para pagar la pensión de una privada" → propio
  "Que mi papá quiera que me quede trabajando con él" → propio
  "No ingresar a la UNSA" → propio
  "La economía" → general (categoría)
  "Cosas de familia" → general (categoría)
  "Nada, yo puedo con todo" → general (nada lo frenaría)
  "Ni idea de qué podría ser" → no_sabe
REPREGUNTA
  general · QUÉ PEDIR: en qué aspecto concreto eso podría complicarle el camino.
    BASE: «¿Qué de eso podría complicarte el camino? Aunque sea algo pequeño.»
    CÓMO ADAPTARLA: si nombró una categoría, retómala y pregunta en qué aspecto lo podría
    complicar, con dos o tres posibilidades (lo económico: que no alcance para la
    pensión, que haya que trabajar o que suban los costos). No supongas que le toca a él
    pagarlo o resolverlo. Si dijo que nada lo frenaría, no lo contradigas: pregunta qué
    podría complicarlo, aunque sea algo pequeño. No pidas qué haría ni cómo lo
    resolvería.
  no_sabe / vacio · BASE: «Piensa en lo que pasa a tu alrededor: el dinero, tu familia, los estudios o algo que no depende de ti. ¿Qué de eso podría complicarte?»
  fuera_de_tema · BASE: «Volvamos a tu camino hacia ese día: ¿qué podría frenarte?»''',
        'bases': {
            'general': '¿Qué de eso podría complicarte el camino? Aunque sea algo pequeño.',
            'no_sabe': 'Piensa en lo que pasa a tu alrededor: el dinero, tu familia, los estudios o algo que no depende de ti. ¿Qué de eso podría complicarte?',
            'vacio': 'Piensa en lo que pasa a tu alrededor: el dinero, tu familia, los estudios o algo que no depende de ti. ¿Qué de eso podría complicarte?',
            'fuera_de_tema': 'Volvamos a tu camino hacia ese día: ¿qué podría frenarte?',
        },
    },
}
