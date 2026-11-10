"""Tarjetas de b5-3. Solo datos: las dos son provisionales y vienen de la spec v7.12b (§2), que reemplazan a las de v7.12, copiadas tal cual, con el bloque `general` de REPREGUNTA de las piezas reemplazado por el de la spec v7.12c (§2) y, en piloto-claude-3, por el de §2 de su spec (la forma (1) es frase + BASE); al cerrar b5-3 pasan a `claude/tarjetas-registros-3.md`.

`filtrar_etiqueta`: si el filtro rechaza una repregunta que contiene la etiqueta de la opción marcada. `por_opcion`: la exclusiva «Lo veo todo igual» (`IGUAL`) tiene pregunta y tarjeta propias. `ecos`: ninguno (la variante B de v7.12 mostró que el eco «Hoy» no suma); `lineas_ecos` lo sigue admitiendo. Las bases se leen de las líneas `BASE:` de la tarjeta.
"""

TARJETAS = {
    'b5-3-cambio': {
        'filtrar_etiqueta': False,
        'pregunta': '¿Qué te hizo verlo distinto? Puede ser algo que viste, que supiste o que te pasó.',
        'ecos': {'hoy': {'nombre': 'Hoy', 'ordenado': False}},
        'tarjeta': '''NÚCLEO: qué lo hizo ver distinto lo que marcó: algo que vio, supo, vivió o de lo que se dio
  cuenta. Puede ser un dato, una actividad o un resultado de la plataforma, una
  conversación, una persona, una visita, una nota, algo que pasó en su casa, o darse
  cuenta de algo suyo o de dónde le venía esa idea. Vale algo de dentro o de fuera de la
  plataforma. Basta con una cosa, y basta con que se entienda. Si dice que no cambió,
  también cumple contar por qué no cambió.
NO EXIGIR: que el cambio sea para bien, que cuente cómo lo veía antes (está a la vista), que
  diga además lo que piensa hoy, más detalle (cuál actividad, cuándo, con quién), qué
  hará, ni más de una cosa.
GENERAL SI:
  - solo dice lo que piensa o quiere hoy, sin qué lo llevó ahí ("hoy diría Gastronomía",
    "ahora creo que depende de la carrera");
  - solo dice que cambió, o cuánto ("ahora lo veo distinto", "ya no pienso igual");
  - repite lo que marcó, o dice que sigue igual, que sigue pensando lo mismo o que sigue
    sin saber, sin decir por qué ("sigo igual de perdido", "sigo pensando igual");
  - da una razón que no nombra nada ("porque maduré", "con el tiempo", "por todo lo que
    vi"), o dice que se dio cuenta sin decir de qué.
FUERA_DE_TEMA SI:
  - solo dice lo que hará o piensa hacer ("voy a estudiar más").
MATICES: ante la duda entre propio y general, propio. Si dice lo que piensa hoy y dentro va
  algo que supo o averiguó, es propio ("con la beca sí se puede" trae lo que supo). Una
  razón pequeña que nombra lo que lo movió (el costo, la distancia, el tiempo que dura)
  es propio. Darse cuenta de algo y decir de qué es propio ("era idea de mi papá"). Un
  cambio hacia más dudas es propio si dice qué lo causó. Si marcó una pieza y cuenta por
  qué en realidad no cambió, es propio, sobre todo si nombra algo que vio o le pasó: no
  se corrige lo que marcó ni se discute lo que sigue pensando. Decir con honestidad que
  no le sirvió, o que lo hizo por cumplir, y por qué, es propio: no se discute ni se
  defiende la plataforma. Hablar de su familia nunca es fuera_de_tema, y no se comenta ni
  se juzga. Nombrar un miedo o una preocupación con lo que la causó es propio; una
  angustia que lo desborda (no duerme, llora, se bloquea, siente que no puede con nada) =
  emocional. Una autovaloración negativa sin qué la causó ("ya no sirvo para eso") =
  general. "No sé" = no_sabe. No se juzga el cambio, ni la idea de antes, ni la de hoy.
EJEMPLOS:
  "Supe que con Beca 18 se puede; ahora lo que me preocupa es el examen" → propio (lo que supo)
  "Ya no la diría, era idea de mi papá" → propio (de eso se dio cuenta)
  "Vi cuánta matemática lleva y no sé si me da" → propio (cambió hacia más dudas)
  "En el test vi que soy bueno escuchando, yo creía que era malo para todo" → propio
  "Hablé con mi prima que estudió en instituto y ya trabaja" → propio
  "La verdad no cambió, hice las actividades por cumplir" → propio (dice por qué no cambió)
  "El test me salió artista y yo quiero sistemas, así que sigo sin creerle" → propio (no cambió, y cuenta qué vio)
  "Antes Administración y ahora también, pero en otra universidad porque es más barata" → propio (una razón pequeña)
  "Hoy diría un instituto, algo corto de computación" → general (solo lo de hoy)
  "Hoy diría Gastronomía" → general (solo lo de hoy)
  "Ahora creo que depende de la carrera" → general (solo lo de hoy)
  "Ahora lo veo distinto" → general
  "Estudiar en una universidad" → general (repite lo que marcó)
  "Sigo igual de perdido, no sé qué estudiar" → general (sigue igual, sin por qué)
  "Sigo pensando igual" → general (sigue igual, sin por qué)
  "Porque maduré" → general
  "Voy a estudiar más" → fuera_de_tema (solo lo que hará)
  "No sé qué cambió" → no_sabe
  "Ahora no duermo pensando en el examen, antes ni me preocupaba" → emocional
REPREGUNTA
  general · QUÉ PEDIR: una cosa que vio, supo o le pasó que lo hizo ver distinto lo que marcó, o por qué sigue igual.
    BASE: «¿Recuerdas cuándo empezaste a verlo distinto? Cuéntame qué pasó: algo que viste, que supiste o que te dijeron.»
    CÓMO ADAPTARLA: hay tres formas y ninguna otra. (1) Si dijo lo que piensa o quiere hoy,
    escribe una sola frase corta y afirmativa que lo retome con sus palabras ("Hoy piensas
    en un instituto.") y después la base, tal cual. (2) Si dijo que sigue igual, que sigue
    pensando lo mismo, que sigue sin saber, o repitió lo que marcó, devuelve solo: «¿Qué
    crees que hizo que siga igual?». (3) En todo lo demás (solo dijo que cambió, dio una
    razón que no nombra nada, dijo que se dio cuenta sin decir de qué, dijo algo negativo de
    sí o nombró una emoción), devuelve la base tal cual, sin retomar nada y sin cambiarle
    una palabra. Nunca preguntes por qué piensa lo de hoy, ni cuál actividad fue, ni pidas
    algo "exacto". No des por hecho que la plataforma le sirvió, no califiques el cambio, no
    sugieras que debió cambiar, no comentes a su familia y no ofrezcas respuestas hechas.
  no_sabe / vacio · BASE: «Mira lo que marcaste: ¿recuerdas algo que viste, supiste o te pasó que te hizo verlo distinto?»
  fuera_de_tema · BASE: «Piensa en lo que marcaste: ¿qué viste, supiste o te pasó que te hizo verlo distinto?»
SEGUIMIENTO: el conjunto es propio si la segunda respuesta nombra algo que lo hizo cambiar, o
  por qué no cambió. Si insiste en lo que piensa hoy, en que cambió, en que sigue igual o
  en una razón que no nombra nada, queda general sin insistir. Si insiste en lo que hará,
  queda fuera_de_tema. Si sigue sin saber, queda no_sabe (el ítem admite abierto).''',
        'por_opcion': {
            'IGUAL': {
                'filtrar_etiqueta': False,
                'pregunta': '¿Qué viste o supiste que te lo confirmó?',
                'tarjeta': '''NÚCLEO: algo que vio, supo o vivió que le confirmó lo que ya pensaba, o por qué no cambió.
  Lo que confirma puede ser un dato, una actividad o un resultado de la plataforma, una
  conversación, una persona o una experiencia, de dentro o de fuera de la plataforma. Por
  qué no cambió puede ser que ya lo tenía decidido desde antes, que ya sabía lo que vio,
  que hizo las actividades por cumplir o que no le sirvieron, si dice por qué. Basta con
  una cosa.
NO EXIGIR: que algo haya cambiado, que la plataforma le haya servido, más detalle (cuál
  actividad, cuándo), qué hará, ni más de una cosa.
GENERAL SI:
  - solo dice que todo sigue igual, que nada cambió o que nada se lo confirmó ("todo sigue
    igual", "nada");
  - solo dice que está seguro o que es lo suyo ("estoy seguro de lo mío");
  - dice que sigue perdido o sin saber, sin decir por qué ("sigo igual de perdido que al
    inicio");
  - dice que no le sirvió, sin decir por qué.
FUERA_DE_TEMA SI:
  - solo dice lo que hará o piensa hacer ("voy a postular en marzo").
MATICES: ante la duda entre propio y general, propio. Decir que lo tenía decidido desde
  antes de empezar, o desde hace años, es propio: por eso no cambió. Decir con honestidad
  que lo hizo por cumplir o que no le sirvió, y por qué, es propio: no se discute ni se
  defiende la plataforma. Una respuesta corta que contesta la pregunta ("nada", "igual
  nomás") es general, no vacio: vacio es solo cuando no escribe nada con sentido. Hablar
  de su familia nunca es fuera_de_tema, y no se comenta ni se juzga. Una angustia que lo
  desborda = emocional. "No sé" = no_sabe. No se juzga que no haya cambiado.
EJEMPLOS:
  "Hablé con la enfermera de la posta, me contó sus turnos y igual quiero" → propio
  "Nada me lo confirmó, ya lo tenía decidido antes de entrar aquí" → propio (por qué no cambió)
  "Hice las actividades por cumplir, no cambió nada" → propio (por qué no cambió)
  "El test me salió lo mismo que yo pensaba" → propio
  "Todo sigue igual" → general
  "Nada" → general (contesta que nada se lo confirmó)
  "Sigo igual de perdido que al inicio" → general (sigue igual, sin por qué)
  "Estoy seguro de lo mío" → general
  "Voy a postular en marzo" → fuera_de_tema (solo lo que hará)
  "No sé" → no_sabe
REPREGUNTA
  general · QUÉ PEDIR: una cosa que vio o supo que se lo confirmó, o por qué no cambió.
    BASE: «¿Qué viste o supiste en este tiempo que te lo confirmó? Si nada cambió, cuéntame por qué crees que fue así.»
    CÓMO ADAPTARLA: devuelve la base tal cual, sin retomar lo que escribió. Solo si dijo que
    sigue perdido o sin saber, devuelve en su lugar: «¿Qué crees que hizo que siga igual?».
    Nunca des por hecho que algo cambió ni que la plataforma le sirvió, no califiques que
    siga igual, no repitas sus palabras negativas y no comentes a su familia.
  no_sabe / vacio · BASE: «Piensa en algo que viste, leíste o conversaste en este tiempo: ¿hubo algo que te confirmó lo que ya pensabas?»
  fuera_de_tema · BASE: «Mira lo que dijiste al llegar: ¿qué viste o supiste que te lo confirmó?»
SEGUIMIENTO: el conjunto es propio si la segunda respuesta nombra algo que se lo confirmó, o
  por qué no cambió. Si insiste en que todo sigue igual o en que está seguro, queda general
  sin insistir. Si insiste en lo que hará, queda fuera_de_tema. Si sigue sin saber, queda
  no_sabe (el ítem admite abierto).''',
            },
        },
    },
}
