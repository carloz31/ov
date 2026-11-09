"""Tarjetas de b1-1 para la prueba v7. Solo las usa `evaluar_tarjetas.py`.

`pregunta` es la consigna nueva de cada ítem, no la del JSON del front. El texto fijo de cada `tipo` (método A y respaldo
del B) se lee de la línea `BASE:` de la tarjeta, para que no haya dos copias. `{opción}` lo reemplaza el runner.
"""

TARJETAS = {
    'b1-1-gustos': {
        'pregunta': '¿Qué te encantaba hacer de niño o niña? Puede ser un juego, algo que armabas o algo que hacías con alguien.',
        'tarjeta': '''NÚCLEO: nombra al menos una actividad que hacía o le gustaba hacer de niño. Vale aunque
  la nombre con una sola palabra o un sustantivo: un juego, un deporte en particular,
  algo que armaba, dibujaba, cuidaba o hacía con alguien.
NO EXIGIR: con quién, dónde, detalles ni una escena.
GENERAL SI:
  - nombra un CAMPO que abarca muchas actividades distintas, sin decir cuál hacía
    ("el arte", "la música", "los deportes", "la creatividad", "jugar");
  - nombra solo una necesidad o rutina que hace todo el mundo, sin nada propio
    ("dormir", "comer", "descansar");
  - habla de su niñez sin decir algo que hacía (lo que quería ser, cómo era).
MATICES: si a una rutina le agrega algo suyo, es propio ("comer los dulces que hacía
  mi abuela"). "No me acuerdo" = no_sabe.
EJEMPLOS:
  "Montar bicicleta" → propio (actividad)
  "Las canicas" → propio (un juego nombrado con un sustantivo)
  "Todo lo artístico" → general (campo)
  "Las cosas de deporte" → general (campo)
  "Comer" → general (rutina sin nada propio)
  "Ver dibujos de dinosaurios" → propio (algo suyo)
  "Quería ser policía" → general (aspiración)
  "Quería ser profesora y les enseñaba a mis peluches" → propio
  "No me acuerdo de chiquito" → no_sabe
  "Cosas de niños" → vacio
REPREGUNTA
  general · QUÉ PEDIR: una actividad que hacía.
    BASE: «Cuéntame una cosa que hacías, aunque sea muy simple: un juego, algo que armabas o algo que hacías con alguien.»
    CÓMO ADAPTARLA:
      - si nombró un campo (arte, música, deportes), pregunta qué hacía relacionado con
        ese campo (por ejemplo, para la música: cantar, tocar algo, bailar), sin
        "a qué jugabas";
      - si dijo "jugar", pregunta a qué y, si encaja, con quién;
      - si nombró una rutina (dormir, comer), tómalo con naturalidad, sin corregir, y
        pregunta qué más le encantaba hacer, algo que hiciera porque le gustaba;
      - si habló de lo que quería ser, reconócelo en pocas palabras y pregunta qué le
        encantaba hacer en esa época.
  no_sabe · BASE: «Está bien si no te acuerdas mucho. A veces ayuda lo que te cuentan en casa o alguna foto. ¿Qué te dicen que hacías?»
    CÓMO ADAPTARLA: no repitas que no se acuerda; ofrece lo que cuentan en casa o las fotos.
  vacio · BASE: «Piensa en una tarde cualquiera cuando tenías unos ocho años. ¿Qué estabas haciendo?»
  fuera_de_tema · BASE: «Volvamos a cuando eras niño o niña: ¿qué te encantaba hacer?»
    CÓMO ADAPTARLA: no menciones lo que escribió.''',
    },
    'b1-1-logro': {
        'pregunta': 'Cuenta un logro tuyo: algo que pasó, no algo que eres.',
        'tarjeta': '''NÚCLEO: cuenta algo que pasó o que hizo (un hecho), por pequeño que sea: aprendió algo,
  ganó, organizó, terminó, ayudó a alguien una vez, pasó de año, armó algo.
NO EXIGIR: que sea importante, que tenga un resultado medible, que se relacione con la
  habilidad marcada, ni cuándo fue.
GENERAL SI: una cualidad u opinión sobre sí ("soy responsable", "soy bueno en mate",
  "ser buena persona"), algo que hace siempre sin una vez concreta ("siempre ayudo"),
  o logros afirmados sin nombrar ninguno ("he logrado muchas cosas").
MATICES: la habilidad marcada NO es un hecho. Marcar "No se me ocurre ninguno", o escribir
  que no se le ocurre, = no_sabe.
EJEMPLOS:
  "Saqué 17 en la exposición de ciencias" → propio (hecho)
  "Soy buena en inglés" → general (opinión)
  "Le enseñé a mi abuela a usar el celular" → propio
  "Soy muy responsable" → general (cualidad)
  "Siempre ayudo en mi casa" → general (sin una vez concreta)
  "No soy buena en nada" → no_sabe
REPREGUNTA
  general · QUÉ PEDIR: una vez concreta en que eso se vio.
    BASE: «¿Qué pasó una vez que lo muestre? Puede ser algo pequeño, del colegio, de tu casa o de tu barrio.»
    CÓMO ADAPTARLA: retoma lo que dijo (la materia, ayudar, ser responsable) y pregunta
    por una vez concreta. No uses la etiqueta de la habilidad como si él la hubiera
    contado (no "resolviste ese problema"). Si dijo "muchas cosas", pide una.
  no_sabe / vacio · QUÉ PEDIR: un hecho pequeño.
    BASE: «Puede ser algo pequeño: algo que aprendiste solo, algo que antes no te salía y ahora sí, o alguien a quien ayudaste. Cuéntame uno, aunque te parezca poca cosa.»
    CÓMO ADAPTARLA: no uses la palabra "logro" ni contradigas una autovaloración
    negativa; ofrece las pistas.
  fuera_de_tema · BASE: «Volvamos a lo que marcaste, {opción}: cuéntame algo que lograste en que se haya notado.»
    CÓMO ADAPTARLA: no menciones lo que escribió; puedes nombrar la habilidad como
    "lo que marcaste".''',
    },
    'b1-1-dificultad': {
        'pregunta': 'Cuenta algo que te costó y cómo lo fuiste superando: lo que hiciste o quién te ayudó.',
        'tarjeta': '''NÚCLEO: dice cómo la atravesó: algo que hizo (verbo de acción) o una ayuda que tuvo.
NO EXIGIR: que nombre qué fue lo difícil, que la haya superado del todo, ni que lo
  hiciera solo. Apoyarse en otros es una forma válida.
GENERAL SI: nombra la dificultad sin el cómo ("me costaba matemática"), o dice que la
  superó sin decir cómo ("fue difícil pero salí adelante", "le puse ganas y salí").
MATICES: "no he tenido dificultades" = no_sabe. "Me tocó solo" o "lo hice solo" cuenta
  como cómo. Algo doloroso sin riesgo ("fue horrible, todavía me afecta") = emocional.
EJEMPLOS:
  "Mi hermana me explicaba en las noches" → propio (ayuda)
  "Me costaba inglés y empecé a ver series en inglés" → propio (acción)
  "Me costaba matemática" → general (sin el cómo)
  "Le puse ganas y salí" → general (sin cómo concreto)
  "Nadie me ayudó, lo saqué solo" → propio
  "No he tenido problemas" → no_sabe
REPREGUNTA
  general · QUÉ PEDIR: cómo la fue superando (lo que hizo o quién le ayudó).
    BASE: «¿Cómo la fuiste superando? Puede ser algo que hiciste tú o alguien que te ayudó.»
    CÓMO ADAPTARLA: si nombró la dificultad, retómala (hablar en público, el cambio de
    colegio) y pregunta cómo la fue superando. Si dijo que se esforzó, pregunta en qué
    se notó ese esfuerzo o qué empezó a hacer distinto. Si mencionó ayuda, no le
    reclames "qué hiciste tú".
  no_sabe / vacio · QUÉ PEDIR: algo pequeño que no salió a la primera.
    BASE: «Puede ser algo pequeño que no te salió a la primera, en el colegio o en tu casa. ¿Qué pasó y cómo siguió?»
    CÓMO ADAPTARLA: no insistas con la palabra "dificultad".
  fuera_de_tema · BASE: «Volvamos a esto: piensa en algo que te costó. ¿Cómo lo fuiste superando?»''',
    },
}
