# Fragmento para ov_backend/datos/contenido.py (tanda 1: Bloques 0 y 1).
# Mismo formato de tuplas que datos/ruta.py. Contenido real, no DATO DE PRUEBA.
# Códigos: b<bloque>-<n> para el camino (clave de contenido = código con guiones bajos: b0_1).
# Las fichas F01–F06 ya están definidas en claude/fichas-plataforma.md; aquí solo se referencian.

# (código, número, nombre, espacio, audiencia). Nombres de tramo: los de la ruta base.
BLOQUES = (('B0', 1, 'Inicio', 'MISIONES_CAMPO', 'ESTUDIANTE'),
           ('B1', 2, 'Mi historia y mis aspiraciones', 'MISIONES_CAMPO', 'ESTUDIANTE'),
           ('B2', 3, 'Me conozco', 'MISIONES_CAMPO', 'ESTUDIANTE'),
           ('B3', 4, 'Exploro el mundo profesional', 'MISIONES_CAMPO', 'ESTUDIANTE'),
           ('B4', 5, 'Mis opciones', 'MISIONES_CAMPO', 'ESTUDIANTE'),
           ('B5', 6, 'Mi decisión', 'MISIONES_CAMPO', 'ESTUDIANTE'),
           ('CIUDAD', 7, 'La ciudad', 'CIUDAD', 'ESTUDIANTE'),
           ('FAMILIA', 1, 'Actividades para familias', 'PORTAL_FAMILIA', 'APODERADO'),
           ('LUMI', 8, 'La historia de Lumi', 'LUMI', 'ESTUDIANTE'))

# (código, bloque, título, tipo, puntaje mínimo CASO, duración min). Orden = posición en la tupla.
ACTIVIDADES = (
    ('b0-1', 'B0', 'Bienvenida: la vocación se construye', 'INFORMATIVA', None, 5),
    ('b0-2', 'B0', 'Lo que siento al terminar el colegio y mi diario', 'INFORMATIVA', None, 5),
    ('b0-3', 'B0', 'Mi punto de partida', 'CUESTIONARIO', None, 10),
    ('b0-4', 'B0', '¿Tienes una opción en mente?', 'INFORMATIVA', None, 5),
    ('b0-5', 'B0', 'Decidir con información: el caso de Alejandra', 'INFORMATIVA', None, 8),
    ('b0-6', 'B0', 'Dudar también es avanzar', 'INFORMATIVA', None, 8),
    ('b1-1', 'B1', 'Mi historia personal', 'REGISTRO', None, 10),
    ('b1-2', 'B1', 'Mis deseos para el futuro', 'INFORMATIVA', None, 5),
    ('b1-3', 'B1', 'Lo que esperan de mí', 'REGISTRO', None, 10),
    ('b1-4', 'B1', 'Mitos sobre el futuro profesional', 'INFORMATIVA', None, 12),
    ('b1-5', 'B1', 'Batalla: el puente de los mitos', 'BATALLA', None, 8),
    ('b1-6', 'B1', 'Mi postura frente a los mitos', 'REGISTRO', None, 8),
    ('b1-7', 'B1', 'Mi línea de tiempo', 'REGISTRO', None, 10),
)

# Todas requeridas y SIEMPRE visibles (son el camino). Sin entradas en PROPIEDADES para esta tanda.
PROPIEDADES = {}

# Texto del drawer del mapa.
DESCRIPCIONES = {
    'b0-1': 'Llegas al muelle, conoces a Lumi y aclaras tres palabras que todos confunden: vocación, profesión y ocupación.',
    'b0-2': 'En el bosque de las voces, Lumi te cuenta cómo llegó a la isla y te abre tu diario: cartas que solo ella lee.',
    'b0-3': 'Helena abre el primer capítulo de tu libro con unas preguntas sobre cómo ves hoy tu futuro. No es un examen.',
    'b0-4': 'En la piedra de los caminos, Lumi te pregunta si ya tienes una opción y te enseña a guardarla como plan.',
    'b0-5': 'Mara te cuenta el caso de su sobrina Alejandra: qué factores pesan en una decisión y cuáles se le olvidaron.',
    'b0-6': 'Nico lleva siete meses acampando porque «todavía no sabe». Aprende de dónde viene una duda y qué hacer con ella.',
    'b1-1': 'Nadia, la cartógrafa, traza tu punto de origen: lo que te gustaba, un logro y una dificultad superada.',
    'b1-2': 'Desde el mirador del nevado, Nadia cuenta la primera vez que miró su futuro y cómo el miedo se volvió curiosidad.',
    'b1-3': 'Llegas a la ciudad. Iván te muestra su artefacto y, para calibrarlo, separa lo que esperan de ti y lo que esperas tú.',
    'b1-4': 'En el oasis, Aurelio pregona mitos sobre el futuro. Revísalos con datos antes de cruzar el puente.',
    'b1-5': 'Aurelio pregona desde la otra orilla: cada mito que aceptes rompe una tabla. Cruza con argumentos.',
    'b1-6': 'Del otro lado del puente, elige el mito que más has escuchado y toma postura.',
    'b1-7': 'El artefacto se apaga y aparece el primer guardián: no te deja pasar sin un plan a cinco años.',
}

# (vidas del enemigo, destellos, preguntas por intento). Pool ≥ 2 × preguntas por intento.
CONFIGURACION_BATALLAS = {'b1-5': (5, 3, 7)}

# (código, batalla, ficha, enunciado, opciones, índice de la correcta, explicación).
# Las preguntas de b1-5 mezclan dos estilos: «¿mito o con sustento?» y «elige el argumento que lo desarma».
# La explicación se muestra igual al acertar o fallar (F04b), por eso cierra la idea en ambos casos.
PREGUNTAS_BATALLA = (
    ('b1-5-p01', 'b1-5', 'F05', 'Aurelio pregona: «Mis padres saben qué me conviene estudiar». ¿Qué es esta frase?',
     ('Un mito: su experiencia vale, pero su información del mercado suele ser de cuando ellos eligieron', 'Una afirmación con sustento: los padres conocen el mercado mejor que los hijos', 'Una afirmación con sustento: el MINEDU dice que la familia decide', 'Un mito: los padres nunca saben nada del tema'), 0,
     'La familia acompaña, informa y respeta; la decisión es tuya. Su experiencia vale, pero describe el mercado de otra época.'),
    ('b1-5-p02', 'b1-5', 'F05', 'Aurelio pregona: «El test me dirá qué estudiar». ¿Qué argumento lo desarma?',
     ('Los tests están mal hechos y no sirven para nada', 'Un test ordena lo que ya sabes de ti y sugiere áreas; no conoce tu contexto ni la oferta de tu ciudad', 'Solo los tests de pago dicen qué estudiar', 'El test sí lo dice, pero solo si respondes rápido'), 1,
     'Un resultado es una hipótesis para explorar, no una sentencia. El test no conoce tu esfuerzo, tu contexto ni lo que no has vivido.'),
    ('b1-5-p03', 'b1-5', 'F05', 'Aurelio pregona: «Solo la universidad da futuro». ¿Qué dato lo discute?',
     ('Nadie que estudió en un instituto consigue trabajo', 'La universidad es gratis y el instituto no', 'Mi Carrera (MTPE) muestra técnicos en minería con un promedio cercano a S/ 5 600, por encima de muchas universitarias', 'Los institutos no dan título'), 2,
     'Varias familias técnicas superan al promedio universitario al inicio, duran menos y cuestan menos. Hay varias rutas válidas.'),
    ('b1-5-p04', 'b1-5', 'F05', '«Si estudio lo que me gusta voy a ganar poco.» ¿Mito o con sustento?',
     ('Con sustento: las carreras «bonitas» pagan menos', 'Con sustento: lo que gusta nunca tiene demanda', 'Mito: todo el mundo gana lo mismo', 'Mito: el ingreso depende de la ocupación, la institución, la experiencia y la ciudad, no del nombre de la carrera'), 3,
     'Dentro de una misma carrera el rango entre quien gana menos y quien gana más es enorme. Lo documentado es que abandonar una carrera que no interesa cuesta tiempo y dinero.'),
    ('b1-5-p05', 'b1-5', 'F05', 'Aurelio pregona: «La carrera decide toda tu vida». ¿Qué dato lo discute?',
     ('Nadie cambia de carrera en el Perú', 'Siete de cada diez peruanos con estudios superiores trabajan en algo distinto a lo que estudiaron (MTPE, 2022)', 'La ley prohíbe estudiar dos carreras', 'Las empresas solo contratan por el título'), 1,
     'Las trayectorias cambian: se cambia de carrera, se combinan áreas, se estudia otra cosa. Elegir es un primer paso que se puede corregir.'),
    ('b1-5-p06', 'b1-5', 'F05', '«Hay trabajos de hombres y trabajos de mujeres.» ¿Mito o con sustento?',
     ('Con sustento: basta mirar quién hace qué', 'Con sustento: las mujeres son minoría en la universidad', 'Mito: todas las carreras tienen mitad hombres y mitad mujeres', 'Mito: el único requisito para ejercer una profesión son las habilidades, los conocimientos y el interés'), 3,
     'Lo que existe es una costumbre social, no una capacidad. Las mujeres son el 54 % de los egresados universitarios; lo que cambia es qué opciones se descartan sin mirarlas.'),
    ('b1-5-p07', 'b1-5', 'F05', 'En mecánica, metalurgia y electrónica hay menos de una mujer por cada diez estudiantes (Sunedu, 2023). ¿Qué muestra ese dato?',
     ('Qué opciones se descartan por estereotipo, no qué puede hacer cada quien', 'Que a las mujeres no les interesan las máquinas', 'Que esas carreras exigen fuerza física', 'Que las mujeres rinden menos en ingeniería'), 0,
     'La investigación muestra que hombres y mujeres eligen lo que menos contradice los estereotipos. El número describe la costumbre, no la capacidad.'),
    ('b1-5-p08', 'b1-5', 'F05', '«Las mujeres tienen la misma capacidad que los hombres para ser excelentes profesionales.» ¿Mito o con sustento?',
     ('Mito: depende de la carrera', 'Mito: la brecha salarial demuestra lo contrario', 'Con sustento: nada en una ocupación exige un sexo para ejercerla', 'Con sustento, pero solo en carreras de cuidado'), 2,
     'Es una afirmación con sustento. La brecha salarial (20 % a 22 % menos en la misma carrera) muestra una desigualdad, no una diferencia de capacidad.'),
    ('b1-5-p09', 'b1-5', 'F05', '«Existen varias rutas válidas después del colegio: universidad, instituto, oficios, Fuerzas Armadas y emprendimiento.» ¿Mito o con sustento?',
     ('Mito: solo cuentan la universidad y el instituto', 'Con sustento: cada ruta tiene duración, costo e ingresos documentados', 'Mito: el emprendimiento no es una ruta', 'Con sustento solo para quien no ingresa a la universidad'), 1,
     'Las rutas son reales y se pueden encadenar: un técnico puede continuar en la universidad convalidando. Ninguna es «la opción de consuelo».'),
    ('b1-5-p10', 'b1-5', 'F05', 'Una viajera dice: «Combino lo que me gusta con datos reales de ingresos y empleo antes de decidir». ¿Qué es eso?',
     ('Un mito: los datos no sirven si hay interés', 'Un mito: el interés no cuenta si hay datos', 'Una afirmación con sustento: mirar las dos cosas da mejores decisiones que mirar solo una', 'Una pérdida de tiempo'), 2,
     'Decidir solo con el interés ignora el mercado; decidir solo con el mercado es lo que le pasó a Alejandra. Combinar los dos es lo que se sostiene.'),
    ('b1-5-p11', 'b1-5', 'F05', '«Las habilidades que desarrollas sirven aunque cambies de campo.» ¿Mito o con sustento?',
     ('Mito: cada carrera tiene habilidades que no sirven en otra', 'Mito: al cambiar de campo se empieza de cero', 'Con sustento solo en carreras de letras', 'Con sustento: comunicarte, resolver problemas y trabajar en equipo se llevan a cualquier trabajo'), 3,
     'Es una de las razones por las que cambiar de rumbo no es empezar de cero: parte de lo aprendido se transfiere.'),
    ('b1-5-p12', 'b1-5', 'F05', '«Estar satisfecho con el trabajo pesa tanto o más que ganar mucho dinero en cómo la gente evalúa su vida.» ¿Mito o con sustento?',
     ('Con sustento: la satisfacción con el trabajo es un factor documentado del bienestar', 'Mito: el dinero lo es todo', 'Mito: la satisfacción no se puede medir', 'Con sustento solo para quien ya gana bien'), 0,
     'El ingreso importa, pero no es el único factor. Por eso un criterio de decisión que solo mira el sueldo se sostiene poco cuando la carrera se pone difícil.'),
    ('b1-5-p13', 'b1-5', 'F05', 'Un comerciante dice: «Mi primo estudió Turismo en 2006 y nunca encontró trabajo, así que Turismo no tiene futuro». ¿Qué pregunta desarma mejor la frase?',
     ('¿Quién lo dice? Si lo dice un comerciante, no cuenta', 'Ninguna: si le pasó a su primo, aplica a todos', '¿De qué año es ese dato? Una experiencia de hace veinte años describe otro mercado', '¿Cuánto ganaba el primo?'), 2,
     'Un mito suele ser una experiencia real convertida en regla general. La fecha y el «¿aplica a mi caso?» separan las dos cosas.'),
    ('b1-5-p14', 'b1-5', 'F05', 'Aurelio pregona: «Un promedio nacional de S/ 4 000 significa que tú vas a ganar eso». ¿Qué pregunta lo desarma?',
     ('¿Quién lo dice? Los promedios siempre mienten', '¿Aplica a mi caso? Un promedio nacional no es tu situación: depende de la ocupación, la ciudad y la experiencia', 'Ninguna: los promedios son datos y los datos no se discuten', '¿De qué año es? Los promedios no cambian'), 1,
     'Un dato puede ser cierto y aun así no describir tu situación. Un promedio es información de otras personas; lo tuyo depende de dónde, cómo y cuánto te preparas.'),
)

# Reglas de desbloqueo de la tanda (misma forma que ruta.py). El Bloque 0 se abre con el primer ingreso.
REGLAS = (
    ('R-b0-2', 'ACTIVIDAD', 'b0-2', 'Primero conoce a Lumi en el muelle.', (('COMPLETA_ACTIVIDAD', 'b0-1', 'EVENTOS', 1),)),
    ('R-b0-3', 'ACTIVIDAD', 'b0-3', 'Sube por el bosque hasta la cabaña de Helena.', (('COMPLETA_ACTIVIDAD', 'b0-2', 'EVENTOS', 1),)),
    ('R-b0-4', 'ACTIVIDAD', 'b0-4', 'Helena todavía no te ha recibido.', (('COMPLETA_ACTIVIDAD', 'b0-3', 'EVENTOS', 1),)),
    ('R-b0-5', 'ACTIVIDAD', 'b0-5', 'Pasa primero por la piedra de los caminos.', (('COMPLETA_ACTIVIDAD', 'b0-4', 'EVENTOS', 1),)),
    ('R-b0-6', 'ACTIVIDAD', 'b0-6', 'Mara tiene algo que contarte antes.', (('COMPLETA_ACTIVIDAD', 'b0-5', 'EVENTOS', 1),)),
    ('R-B1', 'BLOQUE', 'B1', 'Termina el primer tramo para subir al nevado.', (('COMPLETA_BLOQUE', 'B0', 'EVENTOS', 1),)),
    ('R-b1-1', 'ACTIVIDAD', 'b1-1', 'Termina el primer tramo para subir al nevado.', (('COMPLETA_BLOQUE', 'B0', 'EVENTOS', 1),)),
    ('R-b1-2', 'ACTIVIDAD', 'b1-2', 'Nadia necesita tu punto de origen antes del mirador.', (('COMPLETA_ACTIVIDAD', 'b1-1', 'EVENTOS', 1),)),
    ('R-b1-3', 'ACTIVIDAD', 'b1-3', 'Baja del nevado para llegar a la ciudad.', (('COMPLETA_ACTIVIDAD', 'b1-2', 'EVENTOS', 1),)),
    ('R-b1-4', 'ACTIVIDAD', 'b1-4', 'Iván tiene que calibrar el artefacto primero.', (('COMPLETA_ACTIVIDAD', 'b1-3', 'EVENTOS', 1),)),
    ('R-b1-5', 'ACTIVIDAD', 'b1-5', 'Escucha a Aurelio en el oasis antes de cruzar el puente.', (('COMPLETA_ACTIVIDAD', 'b1-4', 'EVENTOS', 1),)),
    ('R-b1-6', 'ACTIVIDAD', 'b1-6', 'Cruza el puente de los mitos.', (('SUPERA_BATALLA', 'b1-5', 'EVENTOS', 1),)),
    ('R-b1-7', 'ACTIVIDAD', 'b1-7', 'Toma postura frente a los mitos antes de seguir.', (('COMPLETA_ACTIVIDAD', 'b1-6', 'EVENTOS', 1),)),
    # Fichas (una regla por ficha, como indica claude/fichas-plataforma.md).
    ('R-F01', 'FICHA', 'F01', 'Conoce a Lumi en el muelle.', (('COMPLETA_ACTIVIDAD', 'b0-1', 'EVENTOS', 1),)),
    ('R-F02', 'FICHA', 'F02', 'Escucha el caso de Alejandra en el molino.', (('COMPLETA_ACTIVIDAD', 'b0-5', 'EVENTOS', 1),)),
    ('R-F03', 'FICHA', 'F03', 'Pasa por el campamento de Nico.', (('COMPLETA_ACTIVIDAD', 'b0-6', 'EVENTOS', 1),)),
    ('R-F04', 'FICHA', 'F04', 'Traza tu punto de origen con Nadia.', (('COMPLETA_ACTIVIDAD', 'b1-1', 'EVENTOS', 1),)),
    ('R-F05', 'FICHA', 'F05', 'Escucha los pregones de Aurelio en el oasis.', (('COMPLETA_ACTIVIDAD', 'b1-4', 'EVENTOS', 1),)),
    ('R-F06', 'FICHA', 'F06', 'Responde al primer guardián del pergamino.', (('COMPLETA_ACTIVIDAD', 'b1-7', 'EVENTOS', 1),)),
    # Secciones y ciudad, según la ruta base (los códigos de sección son los que ya usa ruta.py).
    ('R-SEC-DIARIO', 'SECCION', 'DIARIO', 'Lumi te abre el diario en el bosque de las voces.', (('COMPLETA_ACTIVIDAD', 'b0-2', 'EVENTOS', 1),)),
    ('R-SEC-PLANES', 'SECCION', 'PLANES', 'Lumi te explica los planes en la piedra de los caminos.', (('COMPLETA_ACTIVIDAD', 'b0-4', 'EVENTOS', 1),)),
    ('R-SEC-CHECK_IN', 'SECCION', 'CHECK_IN', 'El check-in se abre al cerrar el primer tramo.', (('COMPLETA_ACTIVIDAD', 'b0-6', 'EVENTOS', 1),)),
    ('R-SEC-CIUDAD', 'SECCION', 'CIUDAD', 'La ciudad se abre cuando Iván calibra el artefacto.', (('COMPLETA_ACTIVIDAD', 'b1-3', 'EVENTOS', 1),)),
    ('R-SEC-FAMILIA', 'SECCION', 'FAMILIA', 'Tu sección de familia se abre al llegar a la ciudad.', (('COMPLETA_ACTIVIDAD', 'b1-3', 'EVENTOS', 1),)),
)

# Entradas de diario que abre esta tanda (PREGUNTAS_DIARIO + regla), según la tabla de la ruta base.
# (código, nombre, pregunta, uso, personalizada, dimensión). Se detallan con los registros; aquí solo el nombre.
PREGUNTAS_DIARIO_TANDA1 = (
    ('d-llego', 'Cómo llego a este mundo', 'b0-2'),
    ('d-decision', 'Lo que siento ante la decisión', 'b0-6'),
    ('d-pasado', 'Lo que me mueve del pasado', 'b1-1'),
    ('d-futuro', 'Lo que siento al pensar en mi futuro', 'b1-2'),
    ('d-comparar', 'Después de comparar', 'b1-3'),        # personalizada con LLM
    ('d-mitos', 'Mitos que me tocaron', 'b1-4'),          # también la cita b1-6
)


# ============================== TANDA 2 ==============================

# Fragmento para ov_backend/datos/contenido.py (tanda 2: Bloque 2 y misiones de Helena en la ciudad).
# Se suma a contenido_tanda1.py (mismos BLOQUES). Las misiones de Helena van partidas: habilidades en 4,
# inteligencias en 5 e intereses en 6 (ver ITEMS_ACTIVIDADES).

# (código, bloque, título, tipo, puntaje mínimo CASO, duración min). Orden = posición en la tupla.
ACTIVIDADES = (
    ('b2-1', 'B2', 'Las habilidades sociales', 'INFORMATIVA', None, 12),
    ('b2-2', 'B2', 'Muchas formas de ser inteligente', 'INFORMATIVA', None, 10),
    ('b2-3', 'B2', 'Lo que valoro en un trabajo', 'REGISTRO', None, 8),
    ('b2-4', 'B2', 'Lo que se me da bien y lo que me cuesta', 'REGISTRO', None, 8),
    ('b2-5', 'B2', 'Intereses y ambientes de trabajo', 'INFORMATIVA', None, 12),
    ('b2-6', 'B2', 'Cómo me describo', 'REGISTRO', None, 8),
    ('h-habilidades-1', 'CIUDAD', 'Misión de Helena: mi comportamiento con los demás, 1 de 4', 'CUESTIONARIO', None, 4),
    ('h-habilidades-2', 'CIUDAD', 'Misión de Helena: mi comportamiento con los demás, 2 de 4', 'CUESTIONARIO', None, 4),
    ('h-habilidades-3', 'CIUDAD', 'Misión de Helena: mi comportamiento con los demás, 3 de 4', 'CUESTIONARIO', None, 4),
    ('h-habilidades-4', 'CIUDAD', 'Misión de Helena: mi comportamiento con los demás, 4 de 4', 'CUESTIONARIO', None, 4),
    ('h-inteligencias-1', 'CIUDAD', 'Misión de Helena: explorando mis inteligencias, 1 de 5', 'CUESTIONARIO', None, 4),
    ('h-inteligencias-2', 'CIUDAD', 'Misión de Helena: explorando mis inteligencias, 2 de 5', 'CUESTIONARIO', None, 4),
    ('h-inteligencias-3', 'CIUDAD', 'Misión de Helena: explorando mis inteligencias, 3 de 5', 'CUESTIONARIO', None, 4),
    ('h-inteligencias-4', 'CIUDAD', 'Misión de Helena: explorando mis inteligencias, 4 de 5', 'CUESTIONARIO', None, 4),
    ('h-inteligencias-5', 'CIUDAD', 'Misión de Helena: explorando mis inteligencias, 5 de 5', 'CUESTIONARIO', None, 4),
    ('h-intereses-1', 'CIUDAD', 'Misión de Helena: mis intereses, 1 de 6', 'CUESTIONARIO', None, 4),
    ('h-intereses-2', 'CIUDAD', 'Misión de Helena: mis intereses, 2 de 6', 'CUESTIONARIO', None, 4),
    ('h-intereses-3', 'CIUDAD', 'Misión de Helena: mis intereses, 3 de 6', 'CUESTIONARIO', None, 4),
    ('h-intereses-4', 'CIUDAD', 'Misión de Helena: mis intereses, 4 de 6', 'CUESTIONARIO', None, 4),
    ('h-intereses-5', 'CIUDAD', 'Misión de Helena: mis intereses, 5 de 6', 'CUESTIONARIO', None, 4),
    ('h-intereses-6', 'CIUDAD', 'Misión de Helena: mis intereses, 6 de 6', 'CUESTIONARIO', None, 4),
    ('h1', 'CIUDAD', 'Mi plan para fortalecer una habilidad', 'REGISTRO', None, 8),
    ('h2', 'CIUDAD', '¿Me reconozco en mis inteligencias?', 'REGISTRO', None, 8),
    ('h3', 'CIUDAD', 'Lo que dicen mis intereses', 'REGISTRO', None, 10),
)

PROPIEDADES = {
    'b2-6': {'requerida': False, 'visibilidad': 'AL_DESBLOQUEAR'},   # opcional, se dibuja desde b2-5
    'h-habilidades-1': {'requerida': False},
    'h-habilidades-2': {'requerida': False},
    'h-habilidades-3': {'requerida': False},
    'h-habilidades-4': {'requerida': False},
    'h-inteligencias-1': {'requerida': False},
    'h-inteligencias-2': {'requerida': False},
    'h-inteligencias-3': {'requerida': False},
    'h-inteligencias-4': {'requerida': False},
    'h-inteligencias-5': {'requerida': False},
    'h-intereses-1': {'requerida': False},
    'h-intereses-2': {'requerida': False},
    'h-intereses-3': {'requerida': False},
    'h-intereses-4': {'requerida': False},
    'h-intereses-5': {'requerida': False},
    'h-intereses-6': {'requerida': False},
    'h1': {'requerida': False, 'visibilidad': 'AL_DESBLOQUEAR'},
    'h2': {'requerida': False, 'visibilidad': 'AL_DESBLOQUEAR'},
    'h3': {'requerida': False, 'visibilidad': 'AL_DESBLOQUEAR'},
}

DESCRIPCIONES = {
    'b2-1': 'Rosa, jefa de la brigada del volcán, busca brigadista: liderazgo, iniciativa, trabajo en equipo. Descubre qué son las habilidades sociales.',
    'b2-2': 'Ayuda a Rosa a repartir las tareas de la semana entre seis brigadistas que son inteligentes de formas distintas.',
    'b2-3': 'Rosa se quedó en el volcán y su hermano se fue a la mina: valoran cosas distintas. Ordena lo que valoras tú.',
    'b2-4': 'Nico reapareció en el taller y descubrió que querer y poder no siempre van juntos. Separa lo que se te da bien de lo que te gusta.',
    'b2-5': 'La ronda de los seis refugios del volcán: seis ambientes de trabajo y el código de tres letras.',
    'b2-6': 'Antes de bajar al puerto, Helena quiere saber cómo te describes con tus propias palabras.',
    'h-habilidades-1': 'Dora, la tabernera, conserva las preguntas sobre cómo te comportas con los demás. Primera visita de cuatro.',
    'h-habilidades-2': 'Segunda visita a la taberna de Dora.',
    'h-habilidades-3': 'Tercera visita a la taberna de Dora.',
    'h-habilidades-4': 'Última visita a Dora: al terminar, la página de habilidades se puede abrir.',
    'h-inteligencias-1': 'El maestro Bruno guarda las preguntas sobre tus inteligencias, en cinco clases cortas. Primera clase.',
    'h-inteligencias-2': 'Segunda clase con el maestro Bruno.',
    'h-inteligencias-3': 'Tercera clase con el maestro Bruno.',
    'h-inteligencias-4': 'Cuarta clase con el maestro Bruno.',
    'h-inteligencias-5': 'Última clase: al terminar, la página de inteligencias se puede abrir.',
    'h-intereses-1': 'Sol, la bibliotecaria, tiene las sesenta preguntas de intereses en seis estantes de diez. Primer estante.',
    'h-intereses-2': 'Segundo estante de Sol.',
    'h-intereses-3': 'Tercer estante de Sol: mitad del camino.',
    'h-intereses-4': 'Cuarto estante de Sol.',
    'h-intereses-5': 'Quinto estante de Sol.',
    'h-intereses-6': 'Último estante: al terminar, la página de intereses se puede abrir.',
    'h1': 'Con tu página de habilidades abierta, elige una con menos desarrollo y decide cómo practicarla.',
    'h2': 'El maestro Bruno te pregunta si te reconoces en tus inteligencias.',
    'h3': 'Sol te pide contrastar tus ocupaciones afines con tu opción inicial.',
}

# Lo que cada misión de Helena responde (como ITEMS_ACTIVIDADES / APLICACIONES_ACTIVIDADES en ruta.py).
# Rangos de ítems por misión. Habilidades: 24 ítems en 4 de 6. Inteligencias: 48 ítems (ajuste carga-instrumentos,
# 8 dimensiones intercaladas) en 5 de 10, 10, 10, 9, 9; si el instrumento cargado tiene otro total, se reparte igual.
# Intereses: 60 ítems en 6 de 10.
ITEMS_ACTIVIDADES = (
    ('h-habilidades-1', 'TEST-HABILIDADES', 1, 6),
    ('h-habilidades-2', 'TEST-HABILIDADES', 7, 12),
    ('h-habilidades-3', 'TEST-HABILIDADES', 13, 18),
    ('h-habilidades-4', 'TEST-HABILIDADES', 19, 24),
    ('h-inteligencias-1', 'TEST-INTELIGENCIAS', 1, 10),
    ('h-inteligencias-2', 'TEST-INTELIGENCIAS', 11, 20),
    ('h-inteligencias-3', 'TEST-INTELIGENCIAS', 21, 30),
    ('h-inteligencias-4', 'TEST-INTELIGENCIAS', 31, 39),
    ('h-inteligencias-5', 'TEST-INTELIGENCIAS', 40, 48),
    ('h-intereses-1', 'TEST-RIASEC', 1, 10),
    ('h-intereses-2', 'TEST-RIASEC', 11, 20),
    ('h-intereses-3', 'TEST-RIASEC', 21, 30),
    ('h-intereses-4', 'TEST-RIASEC', 31, 40),
    ('h-intereses-5', 'TEST-RIASEC', 41, 50),
    ('h-intereses-6', 'TEST-RIASEC', 51, 60),
)
APLICACIONES_ACTIVIDADES = tuple(
    [('APL-HABILIDADES', f'h-habilidades-{n}') for n in range(1, 5)]
    + [('APL-INTELIGENCIAS', f'h-inteligencias-{n}') for n in range(1, 6)]
    + [('APL-RIASEC', f'h-intereses-{n}') for n in range(1, 7)])

# Referencias que citan los registros de cierre (misma forma que REFERENCIAS en ruta.py).
REFERENCIAS = (
    ('h1-ref-resultado', ('ACTIVIDAD', 'h1'), 'RESULTADO', 'APL-HABILIDADES'),
    ('h2-ref-resultado', ('ACTIVIDAD', 'h2'), 'RESULTADO', 'APL-INTELIGENCIAS'),
    ('h3-ref-resultado', ('ACTIVIDAD', 'h3'), 'RESULTADO', 'APL-RIASEC'),
    ('h3-ref-coincidencias', ('ACTIVIDAD', 'h3'), 'COINCIDENCIAS', 'APL-RIASEC'),
    ('h3-ref-plan', ('ACTIVIDAD', 'h3'), 'OPCION_INICIAL', None),
    ('b2-6-ref-gustos', ('ACTIVIDAD', 'b2-6'), 'TEXTO', 'b1-1-gustos'),
)

REGLAS = (
    ('R-B2', 'BLOQUE', 'B2', 'Responde al guardián del desierto para entrar al bosque del volcán.', (('COMPLETA_BLOQUE', 'B1', 'EVENTOS', 1),)),
    ('R-b2-1', 'ACTIVIDAD', 'b2-1', 'Termina el tramo del desierto.', (('COMPLETA_BLOQUE', 'B1', 'EVENTOS', 1),)),
    ('R-b2-2', 'ACTIVIDAD', 'b2-2', 'Rosa quiere verte pasar su prueba primero.', (('COMPLETA_ACTIVIDAD', 'b2-1', 'EVENTOS', 1),)),
    ('R-b2-3', 'ACTIVIDAD', 'b2-3', 'Ayuda con el reparto de tareas antes.', (('COMPLETA_ACTIVIDAD', 'b2-2', 'EVENTOS', 1),)),
    ('R-b2-4', 'ACTIVIDAD', 'b2-4', 'Ordena lo que valoras antes de pasar por el taller.', (('COMPLETA_ACTIVIDAD', 'b2-3', 'EVENTOS', 1),)),
    ('R-b2-5', 'ACTIVIDAD', 'b2-5', 'Nico te espera en el taller.', (('COMPLETA_ACTIVIDAD', 'b2-4', 'EVENTOS', 1),)),
    ('R-b2-6', 'ACTIVIDAD', 'b2-6', 'Se abre al terminar la ronda de los refugios.', (('COMPLETA_ACTIVIDAD', 'b2-5', 'EVENTOS', 1),)),
    # Misiones de Helena: la primera parte se abre con la informativa que presenta el tema; cada parte, con la anterior.
    ('R-h-habilidades-1', 'ACTIVIDAD', 'h-habilidades-1', 'Rosa te dirá quién conserva estas preguntas.', (('COMPLETA_ACTIVIDAD', 'b2-1', 'EVENTOS', 1),)),
    ('R-h-habilidades-2', 'ACTIVIDAD', 'h-habilidades-2', 'Primero la visita anterior a Dora.', (('COMPLETA_ACTIVIDAD', 'h-habilidades-1', 'EVENTOS', 1),)),
    ('R-h-habilidades-3', 'ACTIVIDAD', 'h-habilidades-3', 'Primero la visita anterior a Dora.', (('COMPLETA_ACTIVIDAD', 'h-habilidades-2', 'EVENTOS', 1),)),
    ('R-h-habilidades-4', 'ACTIVIDAD', 'h-habilidades-4', 'Primero la visita anterior a Dora.', (('COMPLETA_ACTIVIDAD', 'h-habilidades-3', 'EVENTOS', 1),)),
    ('R-h-inteligencias-1', 'ACTIVIDAD', 'h-inteligencias-1', 'Primero el reparto de tareas con Rosa.', (('COMPLETA_ACTIVIDAD', 'b2-2', 'EVENTOS', 1),)),
    ('R-h-inteligencias-2', 'ACTIVIDAD', 'h-inteligencias-2', 'Primero la visita anterior a el maestro Bruno.', (('COMPLETA_ACTIVIDAD', 'h-inteligencias-1', 'EVENTOS', 1),)),
    ('R-h-inteligencias-3', 'ACTIVIDAD', 'h-inteligencias-3', 'Primero la visita anterior a el maestro Bruno.', (('COMPLETA_ACTIVIDAD', 'h-inteligencias-2', 'EVENTOS', 1),)),
    ('R-h-inteligencias-4', 'ACTIVIDAD', 'h-inteligencias-4', 'Primero la visita anterior a el maestro Bruno.', (('COMPLETA_ACTIVIDAD', 'h-inteligencias-3', 'EVENTOS', 1),)),
    ('R-h-inteligencias-5', 'ACTIVIDAD', 'h-inteligencias-5', 'Primero la visita anterior a el maestro Bruno.', (('COMPLETA_ACTIVIDAD', 'h-inteligencias-4', 'EVENTOS', 1),)),
    ('R-h-intereses-1', 'ACTIVIDAD', 'h-intereses-1', 'Primero la ronda de los seis refugios.', (('COMPLETA_ACTIVIDAD', 'b2-5', 'EVENTOS', 1),)),
    ('R-h-intereses-2', 'ACTIVIDAD', 'h-intereses-2', 'Primero la visita anterior a Sol.', (('COMPLETA_ACTIVIDAD', 'h-intereses-1', 'EVENTOS', 1),)),
    ('R-h-intereses-3', 'ACTIVIDAD', 'h-intereses-3', 'Primero la visita anterior a Sol.', (('COMPLETA_ACTIVIDAD', 'h-intereses-2', 'EVENTOS', 1),)),
    ('R-h-intereses-4', 'ACTIVIDAD', 'h-intereses-4', 'Primero la visita anterior a Sol.', (('COMPLETA_ACTIVIDAD', 'h-intereses-3', 'EVENTOS', 1),)),
    ('R-h-intereses-5', 'ACTIVIDAD', 'h-intereses-5', 'Primero la visita anterior a Sol.', (('COMPLETA_ACTIVIDAD', 'h-intereses-4', 'EVENTOS', 1),)),
    ('R-h-intereses-6', 'ACTIVIDAD', 'h-intereses-6', 'Primero la visita anterior a Sol.', (('COMPLETA_ACTIVIDAD', 'h-intereses-5', 'EVENTOS', 1),)),
    # Registros de cierre: se abren al revelar la página (evento de revelado, como hoy t-contraste).
    ('R-h1', 'ACTIVIDAD', 'h1', 'Rompe el sello de tu página de habilidades en el libro de Helena.', (('REVELA_RESULTADO', 'APL-HABILIDADES', 'EVENTOS', 1),)),
    ('R-h2', 'ACTIVIDAD', 'h2', 'Rompe el sello de tu página de inteligencias.', (('REVELA_RESULTADO', 'APL-INTELIGENCIAS', 'EVENTOS', 1),)),
    ('R-h3', 'ACTIVIDAD', 'h3', 'Rompe el sello de tu página de intereses.', (('REVELA_RESULTADO', 'APL-RIASEC', 'EVENTOS', 1),)),
    # Fichas.
    ('R-F07', 'FICHA', 'F07', 'Pasa la prueba de la brigada.', (('COMPLETA_ACTIVIDAD', 'b2-1', 'EVENTOS', 1),)),
    ('R-F08', 'FICHA', 'F08', 'Pasa la prueba de la brigada.', (('COMPLETA_ACTIVIDAD', 'b2-1', 'EVENTOS', 1),)),
    ('R-F09', 'FICHA', 'F09', 'Ayuda a Rosa con el reparto de tareas.', (('COMPLETA_ACTIVIDAD', 'b2-2', 'EVENTOS', 1),)),
    ('R-F10', 'FICHA', 'F10', 'Haz la ronda de los seis refugios.', (('COMPLETA_ACTIVIDAD', 'b2-5', 'EVENTOS', 1),)),
    # Conversación 2 se abre con h2 (ruta base).
    ('R-CONV-2', 'CONVERSACION', 'CONV-2', 'Se abre al responder si te reconoces en tus inteligencias.', (('COMPLETA_ACTIVIDAD', 'h2', 'EVENTOS', 1),)),
)

# Entradas de diario de la tanda (nombre y actividad que la abre). «Lo que me dijo Helena» es personalizada con LLM
# y la abren H1, H2 y H3 (una entrada por instrumento o una común: a definir con los registros).
PREGUNTAS_DIARIO_TANDA2 = (
    ('d-helena', 'Lo que me dijo Helena', ('h1', 'h2', 'h3')),
)

# Nota: el nombre exacto del evento de revelado (REVELA_RESULTADO) y la referencia OPCION_INICIAL deben alinearse con
# los que ya usa ruta.py para t-contraste; se ajustan al armar contenido.py.


# ============================== TANDA 3 ==============================

# Fragmento para ov_backend/datos/contenido.py (tanda 3: Bloque 3, el puerto). Se suma a las tandas 1 y 2.

ACTIVIDADES = (
    ('b3-1', 'B3', 'Caminos después del colegio', 'INFORMATIVA', None, 10),
    ('b3-2', 'B3', 'Mis intereses en el catálogo', 'INFORMATIVA', None, 10),
    ('b3-3', 'B3', 'El mercado laboral', 'INFORMATIVA', None, 12),
    ('b3-4', 'B3', 'Lo que no sabía del mercado', 'REGISTRO', None, 8),
    ('b3-5', 'B3', 'Batalla: el mercado y las rutas', 'BATALLA', None, 8),
    ('b3-6', 'B3', 'Elegir una institución', 'INFORMATIVA', None, 12),
    ('b3-7', 'B3', 'Batalla de las instituciones', 'BATALLA', None, 8),
    ('b3-8', 'B3', 'Cuánto cuesta estudiar', 'INFORMATIVA', None, 12),
    ('b3-9', 'B3', 'Batalla de los costos', 'BATALLA', None, 8),
    ('b3-10', 'B3', 'Caminos que no van en línea recta', 'INFORMATIVA', None, 10),
    ('b3-a', 'B3', 'Lo que aprendí de una trayectoria', 'REGISTRO', None, 8),
    ('b3-b', 'B3', 'Batalla de las rutas (repaso)', 'BATALLA', None, 5),
)

PROPIEDADES = {
    'b3-a': {'requerida': False, 'visibilidad': 'AL_DESBLOQUEAR'},
    'b3-b': {'requerida': False, 'visibilidad': 'AL_DESBLOQUEAR'},
}

DESCRIPCIONES = {
    'b3-1': 'Ulises, el práctico del puerto, te muestra los cinco embarcaderos: las cinco rutas después del colegio.',
    'b3-2': 'En la sala del atlas aprendes a leer una ficha del catálogo. Al salir, marca al menos tres favoritos.',
    'b3-3': 'Doña Cifra lee el futuro en los números del mercado. Aprende a leerlos tú: salarios, demanda e informalidad.',
    'b3-4': 'Con tus favoritos marcados, elige el dato del mercado que te sorprendió y qué cambia para tu opción.',
    'b3-5': 'Doña Cifra abre su puesto en la plaza: lee bien las fichas y manda a cada viajero a su embarcadero.',
    'b3-6': 'El stand de la Universidad del Faro Dorado promete de todo. Aprende qué verificar y cómo se ingresa.',
    'b3-7': 'Desmonta los anuncios del Feriante uno por uno: qué verificar, qué promesa es dudosa, qué admisión aplica.',
    'b3-8': 'Clotilde presta «fácil, rápido y sin preguntas». Antes de firmar, todo lo que cuesta estudiar y cómo pagarlo.',
    'b3-9': 'Encuentra el hueco en cada presupuesto de la pila de Clotilde.',
    'b3-10': 'Alejandra baja del barco. Dos giros, lo que cuestan y cómo escuchar un testimonio. Cierra el tramo.',
    'b3-a': 'Pon una voz de tu mochila al lado de tu propia decisión.',
    'b3-b': 'Doña Cifra reabre el puesto solo con un pregón: que una sola ruta vale. Repaso opcional.',
}

# (vidas del enemigo, destellos, preguntas por intento). Pool ≥ 2 × preguntas por intento; preguntas ≥ vidas + destellos − 1.
CONFIGURACION_BATALLAS = {'b3-5': (5, 3, 7), 'b3-7': (5, 3, 7), 'b3-9': (5, 3, 7), 'b3-b': (3, 3, 5)}

REFERENCIAS = (
    ('b3-2-ref-codigo', ('ACTIVIDAD', 'b3-2'), 'RESULTADO', 'APL-RIASEC'),
    ('b3-4-ref-datos', ('ACTIVIDAD', 'b3-4'), 'PLAN', None),           # datos de la familia del primer plan o de los favoritos
    ('b3-8-ref-costos', ('ACTIVIDAD', 'b3-8'), 'RESPUESTA_CUESTIONARIO', 'C4'),  # ítem «sé cuánto cuesta estudiar» de b0-3
)

REGLAS = (
    ('R-B3', 'BLOQUE', 'B3', 'Haz la ronda de los refugios para bajar al puerto.', (('COMPLETA_BLOQUE', 'B2', 'EVENTOS', 1),)),
    ('R-b3-1', 'ACTIVIDAD', 'b3-1', 'Termina el tramo del volcán.', (('COMPLETA_BLOQUE', 'B2', 'EVENTOS', 1),)),
    ('R-b3-2', 'ACTIVIDAD', 'b3-2', 'Ulises te espera en los embarcaderos.', (('COMPLETA_ACTIVIDAD', 'b3-1', 'EVENTOS', 1),)),
    ('R-b3-3', 'ACTIVIDAD', 'b3-3', 'Pasa por la sala del atlas primero.', (('COMPLETA_ACTIVIDAD', 'b3-2', 'EVENTOS', 1),)),
    # 3.4: b3-3 completada y al menos 3 favoritos, uno fuera del tipo principal (evaluador propio, como instituciones_tipos_distintos).
    ('R-b3-4', 'ACTIVIDAD', 'b3-4', 'Marca al menos tres favoritos en el catálogo, uno fuera de tu tipo principal.',
     (('COMPLETA_ACTIVIDAD', 'b3-3', 'EVENTOS', 1), ('MARCA_FAVORITO', None, 'EVENTOS', 3))),
    ('R-b3-5', 'ACTIVIDAD', 'b3-5', 'Anota qué dato te sorprendió antes de enfrentar a Doña Cifra.', (('COMPLETA_ACTIVIDAD', 'b3-4', 'EVENTOS', 1),)),
    ('R-b3-6', 'ACTIVIDAD', 'b3-6', 'Cierra el puesto de Doña Cifra.', (('SUPERA_BATALLA', 'b3-5', 'EVENTOS', 1),)),
    ('R-b3-7', 'ACTIVIDAD', 'b3-7', 'Escucha al Feriante en el malecón.', (('COMPLETA_ACTIVIDAD', 'b3-6', 'EVENTOS', 1),)),
    ('R-b3-8', 'ACTIVIDAD', 'b3-8', 'Desmonta el stand del Faro Dorado.', (('SUPERA_BATALLA', 'b3-7', 'EVENTOS', 1),)),
    ('R-b3-9', 'ACTIVIDAD', 'b3-9', 'Pasa por la caseta de Clotilde.', (('COMPLETA_ACTIVIDAD', 'b3-8', 'EVENTOS', 1),)),
    ('R-b3-10', 'ACTIVIDAD', 'b3-10', 'Cierra la caseta de Clotilde.', (('SUPERA_BATALLA', 'b3-9', 'EVENTOS', 1),)),
    ('R-b3-a', 'ACTIVIDAD', 'b3-a', 'Se abre al escuchar a Alejandra.', (('COMPLETA_ACTIVIDAD', 'b3-10', 'EVENTOS', 1),)),
    ('R-b3-b', 'ACTIVIDAD', 'b3-b', 'Se abre al cerrar el puesto de Doña Cifra.', (('SUPERA_BATALLA', 'b3-5', 'EVENTOS', 1),)),
    # Fichas.
    ('R-F11', 'FICHA', 'F11', 'Conoce los cinco embarcaderos con Ulises.', (('COMPLETA_ACTIVIDAD', 'b3-1', 'EVENTOS', 1),)),
    ('R-F12', 'FICHA', 'F12', 'Pasa por la sala del atlas.', (('COMPLETA_ACTIVIDAD', 'b3-2', 'EVENTOS', 1),)),
    ('R-F13', 'FICHA', 'F13', 'Escucha a Doña Cifra en el mercado.', (('COMPLETA_ACTIVIDAD', 'b3-3', 'EVENTOS', 1),)),
    ('R-F14', 'FICHA', 'F14', 'Pasa por el stand del Faro Dorado.', (('COMPLETA_ACTIVIDAD', 'b3-6', 'EVENTOS', 1),)),
    ('R-F15', 'FICHA', 'F15', 'Pasa por el stand del Faro Dorado.', (('COMPLETA_ACTIVIDAD', 'b3-6', 'EVENTOS', 1),)),
    ('R-F16', 'FICHA', 'F16', 'Pasa por la caseta de Clotilde.', (('COMPLETA_ACTIVIDAD', 'b3-8', 'EVENTOS', 1),)),
    ('R-F17', 'FICHA', 'F17', 'Escucha a Alejandra en el malecón.', (('COMPLETA_ACTIVIDAD', 'b3-10', 'EVENTOS', 1),)),
    # Testimonio T05 (para todos), conversación 3, feria de la ciudad y campos de la tarjeta de plan.
    ('R-T05', 'TESTIMONIO', 'T05', 'Escucha a Alejandra en el malecón.', (('COMPLETA_ACTIVIDAD', 'b3-10', 'EVENTOS', 1),)),
    ('R-CONV-3', 'CONVERSACION', 'CONV-3', 'Se abre al cerrar el tramo del puerto.', (('COMPLETA_ACTIVIDAD', 'b3-10', 'EVENTOS', 1),)),
    ('R-feria', 'ACTIVIDAD', 'feria', 'Se abre al pasar por la feria del malecón.', (('COMPLETA_ACTIVIDAD', 'b3-6', 'EVENTOS', 1),)),
    ('R-PLAN-TRAYECTO', 'SECCION_PLAN', 'TRAYECTO', 'Se abre con las rutas y las instituciones.',
     (('COMPLETA_ACTIVIDAD', 'b3-1', 'EVENTOS', 1), ('COMPLETA_ACTIVIDAD', 'b3-6', 'EVENTOS', 1))),
    ('R-PLAN-REALIDAD', 'SECCION_PLAN', 'REALIDAD', 'Se abre al conocer lo que cuesta estudiar.', (('COMPLETA_ACTIVIDAD', 'b3-8', 'EVENTOS', 1),)),
)

PREGUNTAS_DIARIO_TANDA3 = (
    ('d-dato', 'Cuando el dato no ayuda', 'b3-4'),          # personalizada con LLM
    ('d-viajero', 'Un viajero que ya pasó por aquí', 'b3-10'),
)

# (código, batalla, ficha, enunciado, opciones, índice de la correcta, explicación).
PREGUNTAS_BATALLA = (
    ('b3-5-p01', 'b3-5', 'F13', 'Doña Cifra lee: «Promedio S/ 3 200. Tú vas a ganar 3 200 al salir». ¿Qué le falta leer?',
     ('El mínimo: quien empieza suele estar mucho más cerca del mínimo que del promedio', 'Nada: el promedio es lo que gana la gente', 'El máximo: hay que apuntar alto', 'La demanda: con demanda alta se gana el promedio'), 0,
     'Promedio, mínimo y máximo van juntos. El rango de jóvenes sirve para pensar el primer año; el promedio es el centro de personas con distinta experiencia.'),
    ('b3-5-p02', 'b3-5', 'F13', 'Una ficha muestra Geología: jóvenes S/ 4 200, adultos S/ 10 800; Obstetricia: jóvenes S/ 4 500, adultos S/ 5 300. ¿Qué dice la diferencia entre jóvenes y adultos?',
     ('Que los adultos trabajan más horas', 'Que Obstetricia paga peor que Geología desde el inicio', 'El crecimiento típico del ingreso en esa carrera con la experiencia', 'Nada: son datos de personas distintas'), 2,
     'Jóvenes son egresados recientes; adultos, personas con experiencia. La diferencia es cuánto suele crecer el ingreso en esa carrera: Geología crece mucho, Obstetricia casi nada.'),
    ('b3-5-p03', 'b3-5', 'F13', '«Los datos de salario del catálogo son de cada carrera exacta y de cada institución.» ¿Es así?',
     ('Sí: son por carrera e institución', 'No: son de la familia de carreras y del tipo de institución, y por departamento', 'Son solo de Lima', 'Son de todos los trabajadores, formales e informales'), 1,
     'Los ingresos son por familia de carreras y tipo de institución, no por carrera exacta; además varían por departamento, y solo incluyen empleo formal en planilla.'),
    ('b3-5-p04', 'b3-5', 'F13', 'Doña Cifra: «Contabilidad es la más solicitada; trabajo seguro». ¿Qué omite?',
     ('Que Contabilidad no tiene demanda', 'Que la demanda garantiza salario alto', 'Que la demanda es igual en todas las regiones', 'Que una demanda alta con muchísimos egresados significa competencia, no empleo asegurado'), 3,
     'La demanda se lee contra la cantidad de egresados, en el tiempo y por región. Contabilidad y Administración son los ejemplos clásicos de demanda alta con mucha competencia.'),
    ('b3-5-p05', 'b3-5', 'F13', '«Si una carrera tiene demanda hoy, tendrá demanda cuando yo egrese.» ¿Qué conviene hacer con esa idea?',
     ('Aceptarla: la demanda no cambia', 'Mirar la tendencia, no la foto: la demanda de hoy no es la de dentro de cinco años', 'Ignorar la demanda por completo', 'Elegir la carrera con más demanda en Lima'), 1,
     'La demanda es por región y cambia en el tiempo. Lo útil es la tendencia, y recordar que demanda no es salario.'),
    ('b3-5-p06', 'b3-5', 'F13', 'En el Perú, más del 85 % de los menores de 25 años trabaja de manera informal. ¿Qué implica para leer las tablas de salario?',
     ('Que esos salarios son de la minoría formal, y un título que te abre esa puerta vale más que la diferencia de sueldo que muestre', 'Que las tablas están infladas y no sirven', 'Que estudiar no cambia nada', 'Que el 85 % gana el promedio de la tabla'), 0,
     'Informal es sin contrato, sin seguro, sin pensión ni vacaciones. Las tablas describen a la minoría formal; llegar a ella es parte de lo que se gana con un título.'),
    ('b3-5-p07', 'b3-5', 'F13', 'Entre las familias con mayor ingreso de egresados jóvenes están Medicina (S/ 7 030) y la técnica de minería, metalurgia y petróleo (S/ 6 804). ¿Qué muestra eso?',
     ('Que la universidad siempre paga más', 'Que todas las carreras técnicas pagan S/ 6 800', 'Que Medicina es la mejor decisión para cualquiera', 'Que varias familias técnicas compiten con las universitarias al inicio, y que el top es excepción: la mitad de las familias está muy por debajo'), 3,
     'El top es excepción, no promedio: la mitad de las universitarias está por debajo de S/ 3 030 y la mitad de las técnicas, de S/ 2 630. Y Medicina dura siete años: el salario no dice el costo de llegar.'),
    ('b3-5-p08', 'b3-5', 'F13', '«Cerca de siete de cada diez personas con estudios superiores no trabajan en lo que estudiaron.» ¿Qué conviene concluir?',
     ('Que estudiar es inútil', 'Que todos deberían estudiar lo mismo', 'Que elegir con información sobre dónde hay trabajo reduce ese riesgo, y que las trayectorias cambian', 'Que es un dato falso'), 2,
     'Parte es inadecuación por elegir sin saber dónde hay trabajo; parte son giros a propósito. En los dos casos, la información y la posibilidad de corregir importan.'),
    ('b3-5-p09', 'b3-5', 'F11', 'Viajero: «Quiero ser enfermero técnico y empezar a trabajar en dos años». ¿Qué ruta le calza?',
     ('Formación técnica: un instituto licenciado, dos o tres años, con título técnico', 'Universidad: cinco años', 'Fuerzas Armadas: tres años', 'Trabajar directamente, sin estudiar'), 0,
     'La ocupación que busca se ejerce con título técnico; dura dos o tres años y, si luego quiere, puede continuar en la universidad convalidando.'),
    ('b3-5-p10', 'b3-5', 'F11', 'Viajera: «Me atraen el servicio y la disciplina, y necesito un sueldo desde el primer año». ¿Qué ruta mirar?',
     ('Universidad privada', 'Estudiar y trabajar', 'Fuerzas Armadas y Policía: escuelas de oficiales o suboficiales, con asignación durante la formación y requisitos de edad y físicos', 'Un CETPRO de pocos meses'), 2,
     'Las escuelas de FF. AA. y PNP pagan una asignación durante la formación y tienen una carrera con escalafón; conviene revisar antes los requisitos de edad, estatura y salud.'),
    ('b3-5-p11', 'b3-5', 'F11', 'Un técnico en electricidad quiere después el título de ingeniero. ¿Es posible?',
     ('No: hay que empezar de cero', 'Sí: la ley permite que un profesional técnico continúe en la universidad convalidando parte de lo cursado', 'Solo si estudió en Lima', 'Solo en universidades privadas'), 1,
     'Las rutas se encadenan. Instituto primero y universidad después es una ruta por etapas, no un desvío.'),
    ('b3-5-p12', 'b3-5', 'F11', 'Doña Cifra: «Solo la universidad es un camino de verdad; lo demás es consuelo». ¿Qué dato lo discute?',
     ('Que la universidad es gratis', 'Que los institutos no existen en regiones', 'Que todos los universitarios consiguen trabajo', 'Que solo tres de cada diez jóvenes pasan a educación superior y que varias familias técnicas pagan más al inicio que muchas universitarias'), 3,
     'Hay cinco rutas válidas, con duración, costo e ingresos documentados. Las técnicas no son «la opción B» ni en ingreso ni en tiempo.'),
    ('b3-5-p13', 'b3-5', 'F11', 'Viajero: «Necesito aportar en casa, pero quiero una carrera universitaria». ¿Qué ruta combina las dos cosas?',
     ('Dejar de aportar en casa', 'Estudiar y trabajar: la carrera en horario nocturno, semipresencial o a distancia', 'Renunciar a la universidad para siempre', 'Esperar a tener ahorros'), 1,
     'Estudiar y trabajar alarga la carrera y da experiencia; es una ruta en sí misma, hecha para quien no puede dejar de generar ingresos.'),
    ('b3-5-p14', 'b3-5', 'F11', 'Para elegir una ruta, la ficha dice que se miran cuatro cosas. ¿Cuáles?',
     ('La ocupación que buscas, el tiempo que puedes invertir, el dinero disponible y tu situación hoy', 'El prestigio, los amigos, la moda y la ciudad', 'Solo el salario y la demanda', 'Lo que diga el test y lo que diga tu familia'), 0,
     'Cada perfil responde distinto a esas cuatro preguntas; por eso no hay una ruta mejor en general, sino la que calza con lo que quieres y lo que puedes.'),
    ('b3-7-p01', 'b3-7', 'F14', 'Anuncio: «Acreditados internacionalmente». ¿Qué le preguntas al feriante?',
     ('Nada: acreditación internacional es suficiente', '¿Cuánto cuesta la acreditación?', '¿Qué país la dio? Con eso basta', '¿Por qué entidad, qué programas y hasta cuándo? Y, antes, ¿está licenciada la institución?'), 3,
     'La acreditación es voluntaria, por programa y la otorga el Sineace o una entidad nombrable; sin licencia previa, no importa. Una etiqueta sin entidad no se puede verificar.'),
    ('b3-7-p02', 'b3-7', 'F14', '¿Cuál es la diferencia central entre licenciamiento y acreditación?',
     ('Son lo mismo con distinto nombre', 'La acreditación es obligatoria y el licenciamiento voluntario', 'El licenciamiento es obligatorio y se aplica a la institución; la acreditación es voluntaria y por programa', 'El licenciamiento lo da cada universidad a sí misma'), 2,
     'Sin licencia no hay títulos válidos: es el filtro mínimo. La acreditación es un plus que pocos programas tienen y que no invalida a los demás.'),
    ('b3-7-p03', 'b3-7', 'F14', 'Anuncio: «Universidad en proceso de licenciamiento, matricúlate ahora». ¿Qué haces?',
     ('Descartarla: sin licencia no puede dar títulos válidos, y los estudiantes de las 46 que no la obtuvieron tuvieron que trasladarse', 'Matricularme y esperar', 'Pedir un descuento', 'Verificar la acreditación en vez de la licencia'), 0,
     '«En proceso» es una etiqueta vaga. El licenciamiento es la condición para empezar a comparar; sin él no hay comparación.'),
    ('b3-7-p04', 'b3-7', 'F14', '¿Quién licencia a cada tipo de institución?',
     ('Todas: el Sineace', 'Universidades: Minedu; institutos: Sunedu', 'Universidades: Sunedu (Ley 30220); institutos y escuelas: Minedu (Ley 30512)', 'Cada municipalidad'), 2,
     'Sunedu para universidades y Minedu para institutos y escuelas de educación superior; el Sineace se ocupa de la acreditación de programas.'),
    ('b3-7-p05', 'b3-7', 'F14', 'Una universidad está licenciada en Lima y el feriante vende una sede nueva en tu región. ¿Qué verificas?',
     ('Nada: si Lima está licenciada, todas sus sedes lo están', 'Que la sede o filial también esté licenciada: la licencia cubre locales específicos', 'Que la sede tenga piscina', 'Que el feriante tenga carné'), 1,
     'El licenciamiento se aplica a la institución y a sus locales. Una filial puede no estar autorizada aunque la sede principal sí.'),
    ('b3-7-p06', 'b3-7', 'F14', 'Anuncio: «Reconocida por el Estado». ¿Es verificable?',
     ('Sí: todas las universidades son reconocidas', 'No hace falta verificarlo', 'Sí, si tiene página web', 'Solo si nombra la resolución y se puede consultar en gob.pe; sin eso, es una etiqueta vaga'), 3,
     'Un dato se verifica en una fuente que no es la propia institución: la Sunedu, el Minedu, el Sineace. Una frase sin resolución no es un dato.'),
    ('b3-7-p07', 'b3-7', 'F14', 'Que una institución esté licenciada significa que…',
     ('Es la mejor en todas sus carreras', 'Cumple lo mínimo para funcionar; para saber si es buena en tu carrera miras plan de estudios, docentes, prácticas e ingreso de egresados', 'Sus egresados consiguen trabajo seguro', 'Está acreditada en todos sus programas'), 1,
     'Licenciada es la condición para empezar a comparar, no el resultado de la comparación.'),
    ('b3-7-p08', 'b3-7', 'F15', 'Anuncio: «Ingreso directo, sin examen, a la universidad pública». ¿Qué pasa con esa frase?',
     ('No existe: la Ley Universitaria establece el ingreso por concurso público de admisión', 'Es cierta en las públicas más grandes', 'Es cierta si pagas la inscripción', 'Es cierta para quien viene de un CETPRO'), 0,
     'El ingreso es por concurso; lo que cada universidad define son modalidades de exoneración (CEPRE, primeros puestos, deportistas…), siempre con una evaluación o documentos.'),
    ('b3-7-p09', 'b3-7', 'F15', 'Una viajera terminó en los primeros puestos de su promoción. ¿Qué modalidad conviene que revise?',
     ('Traslado externo', 'Deportista calificado', 'Ninguna: solo existe el examen ordinario', 'Primeros puestos: con el certificado del colegio, a veces con evaluación adicional, según el reglamento de cada universidad'), 3,
     'Cada universidad fija sus modalidades en su reglamento; primeros puestos es de las más frecuentes, pero no es automática.'),
    ('b3-7-p10', 'b3-7', 'F15', '¿Qué diferencia suele haber entre la admisión de una pública y una privada?',
     ('Ninguna: todas toman el mismo examen', 'Las públicas no toman examen', 'Públicas: examen muy competitivo, pocas vacantes, una o dos veces al año; privadas: varias convocatorias, evaluaciones distintas, menos competencia pero con pensión', 'Las privadas solo admiten por CEPRE'), 2,
     'Conviene conocer las dos para armar un plan A y un plan B: la pública exige preparación larga; la privada abre más veces pero cuesta.'),
    ('b3-7-p11', 'b3-7', 'F15', '¿Qué etapas tiene el concurso de una escuela de las FF. AA. o la PNP?',
     ('Examen de conocimientos, evaluación física, psicológica y médica y revisión de documentos, con requisitos de edad, estatura y salud', 'Solo un examen escrito', 'Solo una entrevista', 'Ninguna: se ingresa por recomendación'), 0,
     'Son concursos anuales con varias etapas y requisitos previos; conviene revisarlos antes de prepararse. Durante la formación se recibe una asignación mensual.'),
    ('b3-7-p12', 'b3-7', 'F15', 'Anuncio: «Bolsa de trabajo garantizada y convenios con las mejores empresas». ¿Qué le falta?',
     ('Nada: la bolsa de trabajo es un dato', 'Decir el sueldo que pagan', 'Nombrar las empresas y dónde verificarlo: una promesa de empleo sin nombres es una señal de alerta', 'Mostrar fotos de las empresas'), 2,
     'Un dato se puede verificar en una fuente externa; una promesa no. «¿Dónde puedo verificarlo?» es la pregunta que desarma el stand.'),
    ('b3-7-p13', 'b3-7', 'F15', 'No ingresaste a la primera a una universidad pública demandada. ¿Qué dice la ficha?',
     ('Que esa carrera no es para ti', 'Que es frecuente, no un veredicto: prevé más de un intento y ten un plan B con otra modalidad o institución mientras postulas de nuevo', 'Que debes cambiar de carrera', 'Que debes pagar una academia más cara'), 1,
     'Las públicas más demandadas admiten a una fracción pequeña de postulantes. El plan B y la preparación con calendario son parte del proceso.'),
    ('b3-7-p14', 'b3-7', 'F15', 'Antes de postular, ¿dónde averiguas calendario, modalidades y costo de inscripción?',
     ('En el stand de la feria', 'En un video de redes', 'Preguntándole a un amigo que postuló hace cinco años', 'En la página oficial y el prospecto de admisión de la institución; un anuncio o un stand no los reemplaza'), 3,
     'Postular es un proceso con reglas publicadas. Si no encuentras las reglas, no confíes en la promesa.'),
    ('b3-9-p01', 'b3-9', 'F16', 'Presupuesto de Paola: pensión S/ 900 × 10 = S/ 9 000. Estudia en otra ciudad. ¿Qué hueco tiene?',
     ('Ninguno', 'Le faltan matrícula, materiales, transporte, alimentación y, sobre todo, vivienda', 'Solo el transporte', 'Solo la matrícula'), 1,
     'Un presupuesto tiene ocho rubros. La vivienda aparece solo si te mudas, pero entonces suele ser el mayor gasto.'),
    ('b3-9-p02', 'b3-9', 'F16', 'Presupuesto de Marco: calculó con detalle su primer año, S/ 18 000, y firmó por los cinco. ¿Qué hueco?',
     ('Planeó solo el primer año: una carrera de cinco años son diez ciclos de pensión y matrícula', 'Ninguno: el primer año es lo que importa', 'Le faltó la preparación', 'Le sobraron rubros'), 0,
     'Error 2: el primer año no es el costo de la carrera. El total puede pasar los S/ 100 000 en una privada; la tarjeta de plan calcula los dos.'),
    ('b3-9-p03', 'b3-9', 'F16', 'Renzo: crédito de S/ 60 000; egresados jóvenes de su familia de carreras ganan S/ 1 900. Calculó la cuota con los S/ 5 000 de los adultos. ¿Qué hueco?',
     ('Ninguno: de adulto ganará S/ 5 000', 'El crédito es muy pequeño', 'Debió pedir el crédito a Clotilde', 'La cuota se paga con el ingreso del inicio, no con el de los adultos: con S/ 1 900 la deuda es muy pesada'), 3,
     'Error 3: un crédito se paga desde el primer sueldo. La cuenta correcta es cuota contra ingreso de egresados jóvenes, que está en el catálogo.'),
    ('b3-9-p04', 'b3-9', 'F16', 'Milagros: buen promedio en 4.° y 5.°, familia en el Sisfoh, 17 años. Pidió un préstamo para una privada. ¿Qué hueco?',
     ('Ninguno: el préstamo es lo normal', 'Debió elegir una universidad más cara', 'No postuló a Beca 18: cumple los requisitos de la modalidad ordinaria y la postulación es gratuita', 'Debió esperar a cumplir 22 años'), 2,
     'Beca 18 es integral, con 20 000 becas en 2026; antes de endeudarse, se postula. Las opciones que no son deuda van primero.'),
    ('b3-9-p05', 'b3-9', 'F16', 'Presupuesto de Jimena para una universidad pública: pensión S/ 0, total S/ 0. ¿Qué hueco?',
     ('Las públicas no cobran pensión, pero sí hay trámites, matrícula baja, materiales, transporte y alimentación: unos S/ 3 000 a S/ 5 000 al año', 'Ninguno: la pública es gratis del todo', 'La pensión de las públicas es S/ 900', 'Le faltó la vivienda, aunque viva en su ciudad'), 0,
     'Gratuita no es sin costo: el primer año en una pública cuesta lo que sumen materiales, transporte y trámites. Es un orden de magnitud menos, no cero.'),
    ('b3-9-p06', 'b3-9', 'F16', 'Diego dice: «Estudiar cinco años a tiempo completo no me cuesta nada aparte de la pensión, porque vivo con mis papás». ¿Qué no está contando?',
     ('La matrícula', 'Nada: tiene razón', 'El costo de oportunidad: cinco años sin un sueldo que, sin estudios superiores, podría ser de S/ 1 000 a S/ 1 300 al mes', 'El uniforme'), 2,
     'El costo de oportunidad no es un argumento contra estudiar (la mayoría de las carreras lo recupera con creces), sino para elegir con cuidado y terminar.'),
    ('b3-9-p07', 'b3-9', 'F16', 'Una universidad le ofrece a Luis una beca por rendimiento del 50 %. ¿Qué conviene preguntar antes de contar con ella?',
     ('Nada: una beca es una beca', 'Qué promedio exige mantenerla y cuántos la conservan: muchas se pierden si bajas el promedio', 'Si cubre la vivienda', 'Si es de Pronabec'), 1,
     'Las becas de las instituciones tienen condiciones; perderla a mitad de carrera deja un hueco de la mitad de la pensión.'),
    ('b3-9-p08', 'b3-9', 'F16', 'Ana no puede dejar de generar ingresos y no quiere endeudarse. ¿Qué opción de financiamiento es?',
     ('Crédito educativo', 'Esperar a tener todo el dinero', 'Beca 18, aunque no cumpla los requisitos', 'Estudiar y trabajar: medio tiempo o la carrera en horario nocturno o a distancia; alarga la carrera, pero evita deuda y da experiencia'), 3,
     'Estudiar y trabajar es una forma de financiar la carrera, no solo una ruta: cuesta tiempo libre, no deuda.'),
    ('b3-9-p09', 'b3-9', 'F16', 'Presupuesto de Karla: pensión, matrícula, materiales, transporte. Le falta un rubro mensual que casi todos olvidan. ¿Cuál?',
     ('Preparación', 'Alimentación: lo que comas fuera de casa todos los días de clase', 'Inscripción', 'Vivienda, aunque no se mude'), 1,
     'Alimentación y transporte son mensuales y se descubren en el segundo mes. Un presupuesto que solo mira la pensión se queda corto.'),
    ('b3-9-p10', 'b3-9', 'F16', 'Clotilde: «Firma hoy, ya veremos después cómo pagas». ¿Qué debería saber el joven antes de firmar cualquier crédito?',
     ('El total a devolver, la cuota mensual y el ingreso de egresados jóvenes de su familia de carreras, para ver si la cuota cabe', 'Solo la pensión del primer mes', 'Nada: todo el mundo lo hace', 'El sueldo de los adultos de esa carrera'), 0,
     'Un crédito es deuda que se paga con el ingreso del inicio. Sin esos tres datos, no es una decisión: es una apuesta.'),
    ('b3-9-p11', 'b3-9', 'F16', '¿En qué se diferencian Beca 18 y el crédito educativo de Pronabec?',
     ('Son lo mismo', 'El crédito no se devuelve', 'La beca es solo para universidades privadas', 'La beca no se devuelve y tiene requisitos (rendimiento, Sisfoh, edad); el crédito es un préstamo que se paga después de egresar'), 3,
     'Beca 18 es integral y gratuita de postular; el crédito es deuda. El orden de revisión es becas primero, crédito al final y con la cuota calculada.'),
    ('b3-9-p12', 'b3-9', 'F16', 'Un presupuesto marca «preparación: S/ 0» para postular a una pública muy demandada. ¿Qué hueco?',
     ('Ninguno: la preparación es gratis', 'La preparación la paga la universidad', 'La preparación (academia o CEPRE) toma de tres meses a un año y tiene un costo que entra en el presupuesto', 'La preparación no es necesaria en públicas'), 2,
     'Preparación e inscripción son rubros que se pagan una vez, antes de empezar, y suelen faltar en los presupuestos.'),
    ('b3-9-p13', 'b3-9', 'F16', 'Con pensión de S/ 1 800, matrícula de S/ 600 por ciclo, materiales de S/ 300 por ciclo y transporte de S/ 150 al mes, ¿de qué orden es el costo del primer año?',
     ('Cerca de S/ 21 600; y más de S/ 100 000 en toda la carrera de cinco años', 'Unos S/ 9 000', 'Unos S/ 50 000', 'Igual que en una pública'), 0,
     'Es el ejemplo de la ficha. La diferencia con una pública (S/ 3 000 a S/ 5 000 el primer año) es de un orden de magnitud, no de porcentaje.'),
    ('b3-9-p14', 'b3-9', 'F16', '¿Dónde están los costos exactos de una institución?',
     ('En el catálogo de la plataforma', 'En la caseta de Clotilde', 'En su página web o su prospecto; el catálogo de la plataforma no los tiene', 'En el promedio de Mi Carrera'), 2,
     'El catálogo da ingresos, rutas y licenciamiento; los costos y la admisión se consultan en la fuente oficial de cada institución.'),
    ('b3-b-p01', 'b3-b', 'F11', 'Viajera: «Quiero ser abogada». ¿Qué ruta?',
     ('Formación técnica', 'Universidad: la ocupación exige grado universitario', 'Trabajar directamente', 'CETPRO'), 1,
     'Médico, abogado y docente de colegio exigen grado universitario; ahí la ocupación fija la ruta.'),
    ('b3-b-p02', 'b3-b', 'F11', 'Viajero: «Me gusta arreglar motos y quiero trabajar pronto». ¿Qué ruta?',
     ('Universidad de cinco años', 'Policía', 'Esperar', 'Formación técnica en mecánica, dos o tres años, con título'), 3,
     'Una ocupación práctica, con ruta corta y buen ingreso de egresados jóvenes; después puede profesionalizarse más.'),
    ('b3-b-p03', 'b3-b', 'F11', 'Viajera: «Necesito ingresos ya y quiero probar un campo antes de invertir en estudios largos». ¿Qué ruta?',
     ('Universidad', 'Trabajar directamente, con una capacitación corta (CETPRO o cursos de meses)', 'Fuerzas Armadas', 'Ninguna: sin estudios no hay trabajo'), 1,
     'Trabajar es una ruta válida: da experiencia e ingresos y, si eliges bien, un oficio. Toda ocupación puede profesionalizarse después.'),
    ('b3-b-p04', 'b3-b', 'F11', '¿Cuánto dura, en referencia, una carrera universitaria y una técnica profesional?',
     ('Universitaria: 5 años (Medicina, 7); técnica profesional: 3 años; técnica: 2', 'Las dos duran 5 años', 'Universitaria: 3 años; técnica: 5', 'Depende solo de la institución'), 0,
     'La duración es uno de los cuatro criterios para elegir ruta: cinco años no es lo mismo que dos, ni en dinero ni en vida.'),
    ('b3-b-p05', 'b3-b', 'F11', '¿Qué ruta paga un sueldo durante la formación?',
     ('La universidad pública', 'Los institutos', 'Ninguna', 'Fuerzas Armadas y Policía: escuelas de oficiales y suboficiales, con asignación mensual'), 3,
     'Las escuelas militares y policiales dan una asignación durante la formación; tienen requisitos de edad, estatura y salud.'),
    ('b3-b-p06', 'b3-b', 'F11', 'Una técnica quiere el título universitario. Según la ley…',
     ('Debe empezar de cero', 'No puede', 'Puede continuar en la universidad convalidando parte de lo cursado', 'Solo con una beca'), 2,
     'Las rutas se encadenan: instituto primero y universidad después es una ruta por etapas.'),
    ('b3-b-p07', 'b3-b', 'F11', '«Las rutas técnicas son la opción B de los que no ingresan a la universidad.» ¿Mito o dato?',
     ('Mito: varias familias técnicas tienen ingresos de egresados jóvenes por encima de muchas universitarias', 'Dato', 'Mito: los institutos no dan título', 'Dato: solo pagan menos'), 0,
     'Minería, electricidad e hidrografía técnicas superan en ingreso inicial a la mitad de las familias universitarias. No es consuelo: es otra ruta.'),
    ('b3-b-p08', 'b3-b', 'F11', 'Solo tres de cada diez jóvenes pasan a la educación superior al terminar el colegio. ¿Qué significa para las rutas?',
     ('Que siete de cada diez fracasan', 'Que la universidad es imposible', 'Que combinar estudio y trabajo o empezar por una ruta corta es una decisión frecuente y razonable, no un fracaso', 'Que no vale la pena planear'), 2,
     'La ruta se elige con la ocupación, el tiempo, el dinero y la situación de hoy. Muchas trayectorias llegan a la universidad por etapas.'),
    ('b3-b-p09', 'b3-b', 'F11', 'Viajero: «Puedo dejar de trabajar dos años, no cinco, y mi campo es muy práctico». ¿Qué ruta?',
     ('Universidad', 'Formación técnica', 'Policía', 'Estudiar y trabajar en una universitaria de cinco años'), 1,
     'Tiempo disponible y campo práctico apuntan a la ruta técnica; después puede continuar si quiere.'),
    ('b3-b-p10', 'b3-b', 'F11', '¿Qué dice el catálogo de cada carrera para ayudarte con la ruta?',
     ('Cuánto cuesta en cada institución', 'Qué día es el examen', 'Si es fácil o difícil', 'Si es universitaria, técnica o de las FF. AA. y PNP, y su duración referencial'), 3,
     'En la tarjeta de plan eliges luego el trayecto: postular directo, prepararte, estudiar y trabajar o empezar por una técnica.'),
)


# ============================== TANDA 4 ==============================

# Fragmento para ov_backend/datos/contenido.py (tanda 4: Bloques 4 y 5, y la ciudad). Se suma a las tandas 1 a 3.

ACTIVIDADES = (
    ('b4-1', 'B4', 'Mi perfil y mis carreras afines', 'REGISTRO', None, 12),
    ('b4-2', 'B4', 'Mis criterios para decidir', 'REGISTRO', None, 10),
    ('b4-3', 'B4', 'Tres rutas sobre la mesa', 'INFORMATIVA', None, 8),
    ('b4-4', 'B4', 'Batalla: decidir con criterio', 'BATALLA', None, 8),
    ('b4-5', 'B4', 'Comparo mis planes', 'REGISTRO', None, 12),
    ('b4-a', 'B4', 'Lo que otros ven en mí', 'REGISTRO', None, 8),
    ('b5-1', 'B5', 'Mi proyecto vocacional', 'REGISTRO', None, 12),
    ('b5-2', 'B5', 'Mi punto de llegada', 'CUESTIONARIO', None, 10),
    ('b5-3', 'B5', 'Mirar el camino', 'REGISTRO', None, 8),
    ('b5-4', 'B5', 'La sala de la luz', 'INFORMATIVA', None, 6),
    ('b5-5', 'B5', 'Mi informe de viaje', 'INFORMATIVA', None, 8),
    # Ciudad
    ('investigador', 'CIUDAD', 'Misión del investigador: necesita tu ayuda', 'INFORMATIVA', None, 10),
    ('investigador-cierre', 'CIUDAD', 'El investigador agradece', 'INFORMATIVA', None, 6),
    ('feria', 'CIUDAD', 'La feria vocacional', 'INFORMATIVA', None, 8),
    # Misiones adicionales (se revelan cuando el registro indicado queda adecuado; se dibujan desde él)
    ('ma1', 'B1', 'Carta al niño que fui', 'INFORMATIVA', None, 4),
    ('ma2', 'B1', 'Batalla: profesiones sin género', 'BATALLA', None, 5),
    ('ma3', 'B1', 'De la meta a los pasos', 'REGISTRO', None, 6),
    ('ma4', 'CIUDAD', 'El reto de la semana', 'REGISTRO', None, 6),
    ('ma5', 'CIUDAD', 'Ocupaciones nuevas y emprender', 'INFORMATIVA', None, 8),
    ('ma6', 'B4', 'Dos mundos', 'REGISTRO', None, 8),
    ('ma7', 'B3', 'Más allá del promedio', 'INFORMATIVA', None, 6),
    ('ma7-b', 'B3', 'Batalla: más allá del promedio', 'BATALLA', None, 5),
    ('ma8', 'B4', 'El abogado del diablo', 'REGISTRO', None, 8),
    ('ma9', 'B4', 'Mi presupuesto real', 'REGISTRO', None, 10),
)

_OPCIONAL = {'requerida': False, 'visibilidad': 'AL_DESBLOQUEAR'}
PROPIEDADES = {
    'b4-a': _OPCIONAL,
    'investigador': {'requerida': False},
    'investigador-cierre': _OPCIONAL,
    'feria': {'requerida': False},
    **{c: _OPCIONAL for c in ('ma1', 'ma2', 'ma3', 'ma4', 'ma5', 'ma6', 'ma7', 'ma7-b', 'ma8', 'ma9')},
}

DESCRIPCIONES = {
    'b4-1': 'Helena sube al acantilado con el libro abierto: tu perfil frente a tus opciones, fila por fila.',
    'b4-2': 'El viento del acantilado devuelve las voces de casa. Antes de enfrentarlas, escribe tus propias reglas.',
    'b4-3': 'Iván sube con la mesa de mapas: todo lo que el camino le dio a tu tarjeta y por qué un Plan B en otra área.',
    'b4-4': 'El Eco repite lo que trajiste de casa. Reconoce el criterio débil de cada compañero y la información que le faltó.',
    'b4-5': 'Con el guardián y con Iván: cada plan contra cada criterio tuyo. Toma posición, sabiendo que no es definitiva.',
    'b4-a': 'Helena quiere saber lo que ven de ti quienes te conocen.',
    'b5-1': 'Teresa, la vigía del faro: tu ruta, por ahora, con dificultades, estrategias y tres pasos con plazo.',
    'b5-2': 'Lumi recuerda las preguntas de Helena. Tu punto de llegada, con el mismo instrumento del primer día.',
    'b5-3': 'Desde el balcón del faro se ve todo el camino. Qué te aportó y qué te falta.',
    'b5-4': 'La última escalera del faro. En la sala de la luz, sobre un atril, el pergamino con tu nombre.',
    'b5-5': 'Abres el pergamino: está escrito con tu letra. Helena explica por qué nunca dijo dónde estaba.',
    'investigador': 'Anselmo, el investigador de la ciudad, tiene el techo caído. Aprende a entrevistar a un profesional y ayúdalo con la colecta.',
    'investigador-cierre': 'Tu entrevista entró al archivo. Anselmo agradece y te enseña a contrastar lo que escuchaste.',
    'feria': 'Marina abre la feria de la plaza. Qué preguntar y cómo separar un dato de una promesa.',
    'ma1': 'Nadia te propone escribirle una carta al niño o la niña que fuiste.',
    'ma2': 'Aurelio volvió con su pregón favorito. Déjalo sin público.',
    'ma3': 'El guardián vuelve: parte tu hito a un año en pasos mensuales.',
    'ma4': 'Dora apunta la fecha: practica tu habilidad siete días y vuelve a contar qué pasó.',
    'ma5': 'Iván, después de hora: hacia dónde se mueve el trabajo y qué es emprender de verdad.',
    'ma6': 'Helena te pide mirar una ocupación del tipo opuesto al tuyo.',
    'ma7': 'Doña Cifra muestra lo que nunca muestra: los números por región, edad y formalidad.',
    'ma7-b': 'La revancha con las brechas.',
    'ma8': 'El Eco te reta a discutir contra tu propio plan.',
    'ma9': 'Iván: el costo total de tu plan principal y de dónde sale cada sol.',
}

ITEMS_ACTIVIDADES = (('b5-2', 'TEST-PARTIDA-LLEGADA', 1, 19),)
APLICACIONES_ACTIVIDADES = (('APL-LLEGADA', 'b5-2'),)

CONFIGURACION_BATALLAS = {'b4-4': (5, 3, 7), 'ma2': (3, 3, 5), 'ma7-b': (3, 3, 5)}

REFERENCIAS = (
    # b4-1: cuadro de afinidad precargado
    ('b4-1-ref-historia', ('ACTIVIDAD', 'b4-1'), 'TEXTO', 'b1-1-gustos'),
    ('b4-1-ref-codigo', ('ACTIVIDAD', 'b4-1'), 'RESULTADO', 'APL-RIASEC'),
    ('b4-1-ref-h1', ('ACTIVIDAD', 'b4-1'), 'TEXTO', 'h1-accion'),
    ('b4-1-ref-h2', ('ACTIVIDAD', 'b4-1'), 'TEXTO', 'h2-no-refleja'),
    ('b4-1-ref-bien', ('ACTIVIDAD', 'b4-1'), 'TEXTO', 'b2-4-bien'),
    # b4-2: criterios
    ('b4-2-ref-valor', ('ACTIVIDAD', 'b4-2'), 'ELECCION', 'b2-3-valores'),
    ('b4-2-ref-familia', ('ACTIVIDAD', 'b4-2'), 'TEXTO', 'b1-3-expectativas'),
    ('b4-2-ref-mito', ('ACTIVIDAD', 'b4-2'), 'TEXTO', 'b1-6-mito'),
    ('b4-2-ref-decision', ('ACTIVIDAD', 'b4-2'), 'RESPUESTA_CUESTIONARIO', 'D1'),
    # b4-5: comparar planes
    ('b4-5-ref-criterios', ('ACTIVIDAD', 'b4-5'), 'ELECCION', 'b4-2-criterios'),
    ('b4-5-ref-afinidad', ('ACTIVIDAD', 'b4-5'), 'TEXTO', 'b4-1-no-resuelve'),
    # b5-1: proyecto
    ('b5-1-ref-inicial', ('ACTIVIDAD', 'b5-1'), 'OPCION_INICIAL', None),
    ('b5-1-ref-orden', ('ACTIVIDAD', 'b5-1'), 'TEXTO', 'b4-5-primero'),
    ('b5-1-ref-valores', ('ACTIVIDAD', 'b5-1'), 'ELECCION', 'b2-3-valores'),
    ('b5-1-ref-dato', ('ACTIVIDAD', 'b5-1'), 'TEXTO', 'b3-4-cambia'),
    # b5-3
    ('b5-3-ref-inicial', ('ACTIVIDAD', 'b5-3'), 'OPCION_INICIAL', None),
    # misiones adicionales
    ('ma3-ref-hito', ('ACTIVIDAD', 'ma3'), 'TEXTO', 'b1-7-hitos'),
    ('ma4-ref-accion', ('ACTIVIDAD', 'ma4'), 'TEXTO', 'h1-accion'),
    ('ma6-ref-codigo', ('ACTIVIDAD', 'ma6'), 'RESULTADO', 'APL-RIASEC'),
    ('ma8-ref-plan', ('ACTIVIDAD', 'ma8'), 'PLAN', None),
    ('ma9-ref-presupuesto', ('ACTIVIDAD', 'ma9'), 'PLAN', None),
)

REGLAS = (
    # Bloque 4: B3 completo + instrumentos prioritarios (evaluador instrumentos_prioritarios, ya existe en ruta.py).
    ('R-B4', 'BLOQUE', 'B4', 'Termina el puerto y abre las páginas del libro de Helena que marcó tu orientadora.',
     (('COMPLETA_BLOQUE', 'B3', 'EVENTOS', 1), ('REVELA_RESULTADO', None, 'EVENTOS', 1))),
    ('R-b4-1', 'ACTIVIDAD', 'b4-1', 'Termina el puerto y abre las páginas que marcó tu orientadora.', (('COMPLETA_BLOQUE', 'B3', 'EVENTOS', 1), ('REVELA_RESULTADO', None, 'EVENTOS', 1))),
    ('R-b4-2', 'ACTIVIDAD', 'b4-2', 'Primero el cuadro de afinidad con Helena.', (('COMPLETA_ACTIVIDAD', 'b4-1', 'EVENTOS', 1),)),
    ('R-b4-3', 'ACTIVIDAD', 'b4-3', 'Escribe tus criterios antes de poner las rutas sobre la mesa.', (('COMPLETA_ACTIVIDAD', 'b4-2', 'EVENTOS', 1),)),
    ('R-b4-4', 'ACTIVIDAD', 'b4-4', 'Iván te espera en la mesa de mapas.', (('COMPLETA_ACTIVIDAD', 'b4-3', 'EVENTOS', 1),)),
    # 4.5: batalla superada + Plan A a la mitad + Plan B iniciado (evaluador planes_listos_para_comparar, ya existe).
    ('R-b4-5', 'ACTIVIDAD', 'b4-5', 'Calla al Eco, llena al menos la mitad de tu Plan A e inicia un Plan B.', (('SUPERA_BATALLA', 'b4-4', 'EVENTOS', 1),)),
    ('R-b4-a', 'ACTIVIDAD', 'b4-a', 'Se abre al comparar tus planes.', (('COMPLETA_ACTIVIDAD', 'b4-5', 'EVENTOS', 1),)),
    ('R-B5', 'BLOQUE', 'B5', 'Compara tus planes para bajar al faro.', (('COMPLETA_ACTIVIDAD', 'b4-5', 'EVENTOS', 1),)),
    ('R-b5-1', 'ACTIVIDAD', 'b5-1', 'Compara tus planes para bajar al faro.', (('COMPLETA_ACTIVIDAD', 'b4-5', 'EVENTOS', 1),)),
    ('R-b5-2', 'ACTIVIDAD', 'b5-2', 'Escribe tu proyecto con la vigía.', (('COMPLETA_ACTIVIDAD', 'b5-1', 'EVENTOS', 1),)),
    ('R-b5-3', 'ACTIVIDAD', 'b5-3', 'Responde tu punto de llegada.', (('COMPLETA_ACTIVIDAD', 'b5-2', 'EVENTOS', 1),)),
    ('R-b5-4', 'ACTIVIDAD', 'b5-4', 'Mira el camino desde el balcón antes de subir.', (('COMPLETA_ACTIVIDAD', 'b5-3', 'EVENTOS', 1),)),
    ('R-b5-5', 'ACTIVIDAD', 'b5-5', 'Sube a la sala de la luz.', (('COMPLETA_ACTIVIDAD', 'b5-4', 'EVENTOS', 1),)),
    # Ciudad
    ('R-investigador', 'ACTIVIDAD', 'investigador', 'Se abre al cerrar el puerto.', (('COMPLETA_ACTIVIDAD', 'b3-10', 'EVENTOS', 1),)),
    ('R-investigador-cierre', 'ACTIVIDAD', 'investigador-cierre', 'Publica una entrevista para que Anselmo vuelva.', (('PUBLICA_ENTREVISTA', None, 'EVENTOS', 1),)),
    ('R-SEC-INVESTIGACIONES', 'SECCION', 'INVESTIGACIONES', 'Anselmo te explica cómo investigar.', (('COMPLETA_ACTIVIDAD', 'investigador', 'EVENTOS', 1),)),
    # Misiones adicionales: REGISTRO_ADECUADO del registro que las revela (ruta base, sección 8).
    ('R-ma1', 'ACTIVIDAD', 'ma1', 'Cuenta tu historia con ejemplos.', (('REGISTRO_ADECUADO', 'b1-1', 'EVENTOS', 1),)),
    ('R-ma2', 'ACTIVIDAD', 'ma2', 'Toma postura frente a un mito.', (('REGISTRO_ADECUADO', 'b1-6', 'EVENTOS', 1),)),
    ('R-ma3', 'ACTIVIDAD', 'ma3', 'Escribe hitos de verdad en tu línea de tiempo.', (('REGISTRO_ADECUADO', 'b1-7', 'EVENTOS', 1),)),
    ('R-ma4', 'ACTIVIDAD', 'ma4', 'Elige una habilidad y una acción concreta con Dora.', (('REGISTRO_ADECUADO', 'h1', 'EVENTOS', 1),)),
    ('R-ma5', 'ACTIVIDAD', 'ma5', 'Contrasta tus intereses con Sol.', (('REGISTRO_ADECUADO', 'h3', 'EVENTOS', 1),)),
    ('R-ma6', 'ACTIVIDAD', 'ma6', 'Completa el cuadro de afinidad.', (('REGISTRO_ADECUADO', 'b4-1', 'EVENTOS', 1),)),
    ('R-ma7', 'ACTIVIDAD', 'ma7', 'Anota qué dato del mercado te sorprendió.', (('REGISTRO_ADECUADO', 'b3-4', 'EVENTOS', 1),)),
    ('R-ma7-b', 'ACTIVIDAD', 'ma7-b', 'Escucha a Doña Cifra sobre las brechas.', (('COMPLETA_ACTIVIDAD', 'ma7', 'EVENTOS', 1),)),
    ('R-ma8', 'ACTIVIDAD', 'ma8', 'Escribe tus criterios.', (('REGISTRO_ADECUADO', 'b4-2', 'EVENTOS', 1),)),
    ('R-ma9', 'ACTIVIDAD', 'ma9', 'Compara tus planes.', (('REGISTRO_ADECUADO', 'b4-5', 'EVENTOS', 1),)),
    # Fichas
    ('R-F18', 'FICHA', 'F18', 'Visita el centro de investigación.', (('COMPLETA_ACTIVIDAD', 'investigador', 'EVENTOS', 1),)),
    ('R-F19', 'FICHA', 'F19', 'Cruza tu perfil con Helena.', (('COMPLETA_ACTIVIDAD', 'b4-1', 'EVENTOS', 1),)),
    ('R-F20', 'FICHA', 'F20', 'Calla al Eco.', (('SUPERA_BATALLA', 'b4-4', 'EVENTOS', 1),)),
    ('R-F21', 'FICHA', 'F21', 'Escribe tu proyecto con la vigía.', (('COMPLETA_ACTIVIDAD', 'b5-1', 'EVENTOS', 1),)),
    ('R-F22', 'FICHA', 'F22', 'Prueba la guía de Marina.', (('COMPLETA_ACTIVIDAD', 'feria', 'EVENTOS', 1),)),
    ('R-F23', 'FICHA', 'F23', 'Visita a Iván después de hora.', (('COMPLETA_ACTIVIDAD', 'ma5', 'EVENTOS', 1),)),
    # Conversaciones y secciones de la tarjeta de plan (ruta base)
    ('R-CONV-4', 'CONVERSACION', 'CONV-4', 'Se abre al llegar al acantilado.', (('COMPLETA_BLOQUE', 'B3', 'EVENTOS', 1), ('REVELA_RESULTADO', None, 'EVENTOS', 1))),
    ('R-CONV-5', 'CONVERSACION', 'CONV-5', 'Se abre al comparar tus planes.', (('COMPLETA_ACTIVIDAD', 'b4-5', 'EVENTOS', 1),)),
    ('R-CONV-6', 'CONVERSACION', 'CONV-6', 'Se abre al escribir tu proyecto.', (('COMPLETA_ACTIVIDAD', 'b5-1', 'EVENTOS', 1),)),
    ('R-PLAN-FODA', 'SECCION_PLAN', 'FODA', 'Se abre con el cuadro de afinidad.', (('COMPLETA_ACTIVIDAD', 'b4-1', 'EVENTOS', 1),)),
    ('R-PLAN-PASOS', 'SECCION_PLAN', 'PASOS', 'Se abre con tus criterios.', (('COMPLETA_ACTIVIDAD', 'b4-2', 'EVENTOS', 1),)),
)

PREGUNTAS_DIARIO_TANDA4 = (
    ('d-elegir', 'Después de elegir', 'b4-5'),            # personalizada con LLM
    ('d-proyecto', 'Mi proyecto, en voz baja', 'b5-1'),  # personalizada con LLM
    ('d-ahora', 'Cómo me siento ahora', 'b5-3'),
    ('d-nino', 'Carta al niño que fui', 'ma1'),
    ('d-feria', 'Después de la feria', 'feria'),
)

# (código, batalla, ficha, enunciado, opciones, índice de la correcta, explicación).
PREGUNTAS_BATALLA = (
    ('b4-4-p01', 'b4-4', 'F20', 'Eco: «Mateo eligió Medicina porque es la carrera más respetada de su familia». ¿Cuál es el criterio débil y qué le faltó?',
     ('Ningún criterio débil: el prestigio es un buen criterio', 'Prestigio como único criterio; le faltó saber si le gusta el trabajo diario y si puede con siete años de estudio', 'Le faltó un test', 'Le faltó dinero'), 1,
     '«Es respetada» no dice nada sobre si te gustará ni si tendrás trabajo. Puede acompañar a otros criterios; lo que falla es que sea el único.'),
    ('b4-4-p02', 'b4-4', 'F20', 'Eco: «Fabiola va a estudiar Ingeniería de Minas porque es donde más se gana». ¿Qué falla?',
     ('Nada: el ingreso es el criterio más importante', 'Minería no paga bien', 'Le faltó preguntarle a sus amigas', 'Dinero sin más: el salario promedio es de otras personas con experiencia; le faltó interés, capacidad y el rango de jóvenes'), 3,
     'Como único criterio, el dinero lleva a carreras que se abandonan. Y el dato que usó es el de los adultos, no el del inicio.'),
    ('b4-4-p03', 'b4-4', 'F20', 'Eco: «Diego postuló a Administración porque sus tres mejores amigos van ahí». ¿Qué le dirías?',
     ('Es el criterio de Alejandra: sus amigos van a estar en otros lugares dentro de tres años; le faltó mirar su propio interés', 'Buena idea: estudiar con amigos ayuda', 'Debió elegir la carrera de sus padres', 'Administración es mala'), 0,
     'Los amigos pueden acompañar; como criterio principal no se sostiene cuando la carrera se pone difícil y ellos ya no están.'),
    ('b4-4-p04', 'b4-4', 'F20', 'Eco: «Lucía eligió Derecho para que sus papás dejen de pelear con ella». ¿Qué falla?',
     ('Nada: la familia sabe', 'Debió ignorar a sus papás por completo', 'La presión: elegir para calmar a la familia resuelve hoy y cuesta después; la presión se conversa, no se obedece ni se ignora', 'Derecho no tiene demanda'), 2,
     'La presión familiar es un factor externo real. La salida no es obedecer ni ignorar: es conversar, con criterios propios sobre la mesa.'),
    ('b4-4-p05', 'b4-4', 'F20', 'Un compañero ordena sus criterios así: 1. prestigio, 2. ingresos, 3. interés. ¿Qué dice la regla rápida?',
     ('Que está perfecto', 'Que el interés no debería estar', 'Que los dos primeros son extrínsecos; una decisión que se sostiene tiene al menos un criterio intrínseco arriba', 'Que faltan los amigos'), 2,
     'Interés, capacidad y valores hablan de la actividad en sí; dinero, prestigio y aprobación, de lo que viene después. Los extrínsecos sostienen poco cuando la carrera se pone difícil.'),
    ('b4-4-p06', 'b4-4', 'F20', '¿Qué hace que algo sea un criterio y no una excusa?',
     ('Que se pueda aplicar a todas tus opciones por igual, fijado antes de mirarlas', 'Que lo diga tu familia', 'Que justifique la opción que ya querías', 'Que sea sobre dinero'), 0,
     'Un criterio es una regla que fijas antes de mirar las opciones, para que todas se midan igual. Si solo sirve para justificar una, es una excusa.'),
    ('b4-4-p07', 'b4-4', 'F19', 'Eco: «Mi código coincide con Arquitectura, así que es mi carrera». ¿Qué le falta?',
     ('Nada: el código decide', 'Un segundo test', 'Preguntarle al Eco', 'Coincidir en dos aspectos, no en uno: también lo que se le da bien y sus valores; si solo calza con el código, es atractiva, no afín'), 3,
     'El cruce no elige: muestra coincidencia y fricción. Una opción que calza con el código pero choca con capacidad y valores todavía no es afín.'),
    ('b4-4-p08', 'b4-4', 'F19', 'Eco: «Mi perfil no coincide con lo que quiero, así que lo descarto». ¿Es así?',
     ('Sí: el perfil manda', 'No: dice que tendrás que esforzarte en algo o que te gusta por razones que el cuestionario no mide; es información, no sentencia', 'Sí, salvo que tus papás digan lo contrario', 'No: el perfil no sirve para nada'), 1,
     'Un perfil que no coincide no prohíbe. Tampoco uno que coincide garantiza: ingresar, pagar y terminar siguen en pie.'),
    ('b4-4-p09', 'b4-4', 'F19', 'Eco: «Descarté Enfermería sin pensar; no sé por qué, simplemente no». ¿Qué le propone el cuadro de afinidad?',
     ('Olvidarla', 'Justificar también la opción de menor afinidad: a veces aclara qué sí buscas, o descubre que la descartaste por un prejuicio', 'Elegirla por obligación', 'Hacerle el test a su mamá'), 1,
     'La menor afinidad también enseña. Una razón corta para descartar vale tanto como una para elegir.'),
    ('b4-4-p10', 'b4-4', 'F19', 'Una compañera cruzó su perfil y todo coincide con su plan. Dice: «Listo, ya decidí». ¿Qué no resuelve el cruce?',
     ('Nada: si coincide, está decidido', 'El nombre de la carrera', 'Su código RIASEC', 'Costos, distancia, oferta en su ciudad y lo que piensa su familia: nada de eso sale del perfil, y todo pesa'), 3,
     'Anotar lo que el perfil no resuelve es la agenda de lo que sigue. El cruce muestra compatibilidad; la realidad se revisa aparte.'),
    ('b4-4-p11', 'b4-4', 'F02', 'Eco: «Rafael eligió por un video viral de «un día en la vida» de un piloto». ¿Qué factor le faltó?',
     ('Verificar: las redes muestran la parte vistosa; le faltó saber el día a día real, el costo y la ruta de admisión', 'Nada: dos millones de vistas no mienten', 'Un test de intereses', 'Preguntarle a sus amigos'), 0,
     'Los influencers de carreras sirven para descubrir que una ocupación existe. Son una pista que hay que verificar, no una prueba.'),
    ('b4-4-p12', 'b4-4', 'F02', 'Eco: «Carla descartó Mecánica porque «eso es de hombres»». ¿Qué señal de decisión apurada es?',
     ('Elegir por el sueldo', 'Conocer solo el nombre', 'Descartar por un prejuicio sin un dato: un estereotipo de género es un factor externo que cierra opciones antes de mirarlas', 'Ninguna: tiene razón'), 2,
     'El único requisito para ejercer una profesión son las habilidades, los conocimientos y el interés. Descartar sin dato es una de las cinco señales.'),
    ('b4-4-p13', 'b4-4', 'F02', 'Eco: «Jorge va a estudiar Psicología; solo conoce el nombre y que «ayuda a la gente»». ¿Qué le falta?',
     ('Nada: ayudar a la gente es suficiente', 'Un video viral', 'Saber qué se hace en la carrera día a día: la señal 2 de una decisión apurada', 'Que sus amigos también vayan'), 2,
     'Conocer solo el nombre es una señal de decisión apurada. La ficha de la ocupación y una entrevista a quien la ejerce resuelven ese vacío.'),
    ('b4-4-p14', 'b4-4', 'F02', '¿Cuál de estas decisiones combina factores internos y externos?',
     ('«Me gusta analizar datos, se me dan bien los números, y vi que hay empleo formal y un instituto licenciado en mi ciudad»', '«Mis papás dicen que Contabilidad es segura»', '«Me gusta dibujar, con eso basta»', '«Es la carrera mejor pagada»'), 0,
     'Una buena decisión no es la que acierta: es la que consideró los factores que importaban, de adentro y de afuera.'),
    ('ma2-p01', 'ma2', 'F05', 'Aurelio: «En el Perú hay más hombres que mujeres en la universidad; por eso ellas no están en ingeniería». ¿Qué dice el dato?',
     ('Es cierto', 'Son mitad y mitad', 'No hay datos', 'Al revés: las mujeres son el 54 % de los egresados universitarios; lo que cambia es qué carreras eligen'), 3,
     'La mayoría de egresados universitarios son mujeres (Sunedu, 2023). La brecha no es de acceso: es de qué opciones se descartan.'),
    ('ma2-p02', 'ma2', 'F05', 'En educación inicial y obstetricia hay 0,5 hombres por cada 100 estudiantes. ¿Qué muestra?',
     ('Que los hombres no sirven para cuidar', 'Que el estereotipo también cierra opciones a los hombres: se descarta antes de mirar', 'Que esas carreras prohíben hombres', 'Nada'), 1,
     'Hombres y mujeres tienden a elegir lo que menos contradice los estereotipos. El dato describe la costumbre, no la capacidad.'),
    ('ma2-p03', 'ma2', 'F05', 'Las mujeres con educación superior ganan entre 20 % y 22 % menos que los hombres de la misma carrera. ¿Qué es eso?',
     ('Una prueba de que rinden menos', 'Una desigualdad documentada, no una diferencia de capacidad', 'Un invento', 'Una razón para no estudiar'), 1,
     'La brecha salarial es un dato sobre el mercado, no sobre las personas. La capacidad para ser excelentes profesionales es la misma.'),
    ('ma2-p04', 'ma2', 'F05', 'Aurelio: «Las mujeres abandonan más las ingenierías; no es lo suyo». ¿Qué dice la investigación (Fouad, 2007)?',
     ('Que tiene razón', 'Que los hombres abandonan más', 'Que nadie abandona', 'Que persisten menos en carreras «no femeninas» aunque tengan la capacidad: pesa el entorno, no la aptitud'), 3,
     'La persistencia menor se explica por el estereotipo y el ambiente, no por la capacidad. Eso es lo que un mito convierte en «no es lo suyo».'),
    ('ma2-p05', 'ma2', 'F05', 'En tecnologías de la información hay 14 mujeres por cada 100 estudiantes. Una chica con código IRC quiere Sistemas. ¿Qué le dices?',
     ('Que el único requisito es habilidad, conocimiento e interés, y que su código apunta justo ahí; el 14 % describe quién se anima, no quién puede', 'Que mejor elija algo «más de mujeres»', 'Que va a ser difícil por ser mujer', 'Que espere a que cambie el porcentaje'), 0,
     'El dato dice qué opciones la gente descarta sin mirarlas. Su código y su interés son los datos que sí hablan de ella.'),
    ('ma2-p06', 'ma2', 'F05', '¿Qué es la T02 de tu mochila, «un oficio que no era para ella»?',
     ('Un mito', 'Una carrera prohibida', 'La voz de una mujer mecánica de mantenimiento industrial: una ocupación no tradicional elegida por interés y habilidad', 'Una historia inventada por Aurelio'), 2,
     'Los testimonios de la mochila muestran mujeres y hombres en ocupaciones no tradicionales; se abren al resolver los casos de la Central.'),
    ('ma2-p07', 'ma2', 'F05', 'Aurelio: «Un hombre enfermero es raro; mejor que estudie Medicina». ¿Qué falla?',
     ('Nada: es raro', 'Medicina es lo mismo', 'Confunde costumbre con requisito: Enfermería es una profesión de cuidado abierta a cualquiera, y «raro» no es un dato', 'Los hombres no pueden ser enfermeros'), 2,
     'Hay una voz en tu mochila, T08, de un enfermero. «Raro» describe la costumbre; la ocupación exige habilidad e interés, no un sexo.'),
    ('ma2-p08', 'ma2', 'F05', '¿Cómo desarmas el pregón de Aurelio con las cuatro preguntas?',
     ('¿Con qué dato? Ninguno. ¿Aplica a mi caso? No: mi capacidad y mi interés no dependen de un porcentaje', 'Repitiéndolo más fuerte', 'Preguntándole a Aurelio su opinión', 'Haciéndole caso a la mayoría'), 0,
     'Sin dato es opinión; y un porcentaje nacional de quién elige qué no describe lo que tú puedes hacer.'),
    ('ma2-p09', 'ma2', 'F05', 'Una afirmación con sustento sobre género es…',
     ('«Hay trabajos de hombres y trabajos de mujeres»', '«Las ingenierías no son para mujeres»', '«Los hombres no sirven para educación inicial»', '«Las mujeres tienen la misma capacidad que los hombres para ser excelentes profesionales»'), 3,
     'Es la primera de las afirmaciones con sustento de la ficha de mitos. Las otras tres son pregones.'),
    ('ma2-p10', 'ma2', 'F05', 'Aurelio: «Hace veinte años no había mujeres en minería, así que no es para ellas». ¿Qué pregunta lo desarma?',
     ('¿Cuánto ganaba Aurelio?', '¿De qué año es ese dato? Describe otra época; hoy las hay, pocas, y la ocupación no exige un sexo', 'Ninguna: si no había, es porque no se puede', '¿Quién lo dice? Si lo dice Aurelio, es cierto'), 1,
     'Un mito suele ser una costumbre de otra época convertida en regla. La fecha y el «¿aplica a mi caso?» lo separan de un dato.'),
    ('ma7-b-p01', 'ma7-b', 'F13', 'Doña Cifra: «El promedio nacional de tu familia es S/ 3 500; eso ganarás en tu ciudad». ¿Qué brecha esconde?',
     ('Ninguna', 'La regional: una misma familia paga distinto por departamento; hay que mirar el del lugar donde trabajarás', 'La de género', 'La de la universidad'), 1,
     'Lima no es el Perú. El catálogo muestra el ingreso por departamento; el nacional es una mezcla.'),
    ('ma7-b-p02', 'ma7-b', 'F13', 'Geología: jóvenes S/ 4 200, adultos S/ 10 800. Obstetricia: jóvenes S/ 4 500, adultos S/ 5 300. Si piensas en tu primer año, ¿cuál paga más?',
     ('Geología, por mucho', 'Las dos igual', 'Ninguna: hay que mirar el nacional', 'Obstetricia, por poco: el dato de jóvenes es el del inicio; el de adultos dice cuánto crece cada carrera'), 3,
     'Jóvenes para pensar el primer año; adultos para pensar a diez. Geología crece mucho más, pero no empieza más alto.'),
    ('ma7-b-p03', 'ma7-b', 'F13', 'Un promedio de S/ 3 000 «de todos los trabajadores de esa familia». ¿Qué le falta a esa frase?',
     ('Decir que solo incluye a los formales en planilla: los informales, la mayoría de los jóvenes, no están', 'Nada', 'Decir que incluye a los informales', 'El nombre de la universidad'), 0,
     'Las tablas son de la minoría formal. Entre los menores de 25, más del 85 % trabaja informal.'),
    ('ma7-b-p04', 'ma7-b', 'F13', 'Doña Cifra: «Si el promedio de jóvenes es S/ 2 800, ganarás eso al salir». ¿Qué le falta?',
     ('Nada', 'El máximo, que es lo que deberías esperar', 'El rango: con un mínimo de S/ 1 100, muchos empiezan bastante por debajo del promedio', 'El promedio de adultos'), 2,
     'Promedio, mínimo y máximo van juntos. En casi todas las familias, quien empieza está más cerca del mínimo.'),
    ('ma7-b-p05', 'ma7-b', 'F13', '¿Qué quiere decir que un ingreso sea «por familia de carreras y tipo de institución»?',
     ('Que es de cada carrera', 'Que es de cada universidad', 'Que agrupa carreras parecidas y separa universidad de técnica; no es de tu carrera exacta ni de una institución', 'Que incluye a la familia del estudiante'), 2,
     'El catálogo muestra el ingreso de la familia por lugar y, por institución, el promedio de sus egresados de esa familia.'),
    ('ma7-b-p06', 'ma7-b', 'F13', 'Una carrera «muy solicitada» en Lima. ¿Qué pasa en una región?',
     ('Puede faltar o sobrar: la demanda es por región, y una carrera saturada en Lima puede faltar en otra', 'Es igual en todo el Perú', 'Siempre sobra', 'La demanda no existe fuera de Lima'), 0,
     'La demanda se lee por región y en el tiempo. Mi Carrera la muestra por grupos; el lugar donde trabajarás es el que importa.'),
    ('ma7-b-p07', 'ma7-b', 'F13', 'Un título abre la puerta al empleo formal. ¿Qué significa «formal»?',
     ('Trabajar en Lima', 'Ganar el promedio', 'Tener un jefe', 'Contrato, seguro de salud, aporte para pensión y vacaciones pagadas'), 3,
     'Formal es lo que el 85 % de los jóvenes no tiene. Por eso el título vale más que la diferencia de sueldo que muestre la tabla.'),
    ('ma7-b-p08', 'ma7-b', 'F13', 'Para pensar tu ingreso a diez años, ¿qué dato usas?',
     ('El de jóvenes', 'El rango de adultos de tu familia de carreras, en el departamento donde trabajarías', 'El máximo nacional', 'El de Doña Cifra'), 1,
     'Jóvenes para el primer año; adultos para el largo plazo. Y siempre por lugar.'),
    ('ma7-b-p09', 'ma7-b', 'F13', '¿Por qué «un promedio nacional es cuatro promedios mezclados»?',
     ('Porque hay cuatro universidades', 'Porque junta Lima y regiones, jóvenes y adultos, y solo cuenta a los formales', 'Porque se calcula cuatro veces', 'No es cierto'), 1,
     'Leerlo por partes (lugar, edad, formalidad) es lo que convierte un número en información sobre tu caso.'),
    ('ma7-b-p10', 'ma7-b', 'F13', 'Doña Cifra: «Las técnicas pagan menos que las universitarias, siempre». ¿Qué dice el top de jóvenes?',
     ('Que tiene razón', 'Que las técnicas no aparecen', 'Que todas pagan igual', 'Que la técnica de minería (S/ 6 804) y la de ingeniería eléctrica (S/ 3 757) superan a la mitad de las familias universitarias'), 3,
     'El top es excepción en los dos lados, pero muestra que «técnica» no significa «menos». Lo que paga es la familia y el lugar, no la etiqueta.'),
)


# ============================== TANDA 5 ==============================

# Fragmento para ov_backend/datos/contenido.py (tanda 5: ruta del apoderado). Se suma a las tandas 1 a 4.
# Bloque FAMILIA (PORTAL_FAMILIA, APODERADO) ya definido en contenido_tanda1.py.

ACTIVIDADES = (
    ('p1', 'FAMILIA', 'Acompañar no es decidir', 'INFORMATIVA', None, 8),
    ('p2', 'FAMILIA', 'Mis expectativas y temores', 'INFORMATIVA', None, 8),
    ('p3', 'FAMILIA', 'Acompañar o presionar', 'INFORMATIVA', None, 8),
    ('p4', 'FAMILIA', 'El sueño del chef', 'INFORMATIVA', None, 8),
    ('p5', 'FAMILIA', 'El panorama de hoy', 'INFORMATIVA', None, 10),
    ('p6', 'FAMILIA', 'Cómo conversar con mi hijo', 'INFORMATIVA', None, 8),
    ('p7', 'FAMILIA', 'Cuando mi hijo duda o cambia de opinión', 'INFORMATIVA', None, 8),
    ('p8', 'FAMILIA', 'Mi carta para mi hijo', 'INFORMATIVA', None, 8),
)

PROPIEDADES = {}  # todas requeridas y visibles

DESCRIPCIONES = {
    'p1': 'El rol de la familia según el programa de orientación: acompañar, informar y respetar. La decisión es de su hijo o hija.',
    'p2': 'Un ejercicio de seis minutos para reconocer qué espera y qué teme del futuro de su hijo o hija, y de dónde vienen esas ideas.',
    'p3': 'Situaciones de presión que no parece presión, y la actitud que sí ayuda.',
    'p4': 'La historia de Gastón Acurio y el papel de su familia: por qué los hijos esconden lo que quieren y cómo notarlo.',
    'p5': 'Lo que cambió desde que usted eligió: rutas, mercado, licenciamiento, costos y becas, con datos de hoy.',
    'p6': 'Preguntas que abren y preguntas que cierran, y cómo funcionan las conversaciones guiadas.',
    'p7': 'Por qué dudar o cambiar de opinión es parte del proceso, y cómo acompañar cuatro situaciones frecuentes.',
    'p8': 'Cómo escribir una carta que sirva, y qué sigue al terminar su ruta.',
}

REGLAS = (
    ('R-p2', 'ACTIVIDAD', 'p2', 'Complete la actividad anterior.', (('COMPLETA_ACTIVIDAD', 'p1', 'EVENTOS', 1),)),
    ('R-p3', 'ACTIVIDAD', 'p3', 'Complete la actividad anterior.', (('COMPLETA_ACTIVIDAD', 'p2', 'EVENTOS', 1),)),
    ('R-p4', 'ACTIVIDAD', 'p4', 'Complete la actividad anterior.', (('COMPLETA_ACTIVIDAD', 'p3', 'EVENTOS', 1),)),
    ('R-p5', 'ACTIVIDAD', 'p5', 'Complete la actividad anterior.', (('COMPLETA_ACTIVIDAD', 'p4', 'EVENTOS', 1),)),
    ('R-p6', 'ACTIVIDAD', 'p6', 'Complete la actividad anterior.', (('COMPLETA_ACTIVIDAD', 'p5', 'EVENTOS', 1),)),
    ('R-p7', 'ACTIVIDAD', 'p7', 'Complete la actividad anterior.', (('COMPLETA_ACTIVIDAD', 'p6', 'EVENTOS', 1),)),
    ('R-p8', 'ACTIVIDAD', 'p8', 'Complete la actividad anterior.', (('COMPLETA_ACTIVIDAD', 'p7', 'EVENTOS', 1),)),
    # Fichas del apoderado, una por actividad.
    *[(f'R-FP0{n}', 'FICHA', f'FP0{n}', 'Complete la actividad que la entrega.', (('COMPLETA_ACTIVIDAD', f'p{n}', 'EVENTOS', 1),)) for n in range(1, 9)],
    # Conversaciones del apoderado: ruta completa (regla existente R-SEC-CONVERSACIONES usa COMPLETA_BLOQUE FAMILIA); la carta es
    # requisito dentro de la sección (regla de eventos de B12).
    ('R-SEC-CONVERSACIONES', 'SECCION', 'CONVERSACIONES', 'Complete su ruta de actividades.', (('COMPLETA_BLOQUE', 'FAMILIA', 'EVENTOS', 1),)),
)

# Nota de carga: las actividades del apoderado hoy apuntan a recursoIds del catálogo local (ficha-pad-rol, ficha-pad-info);
# aquí recompensa.recursoIds ya usa FP01–FP08 (ver claude/fichas-plataforma.md, «Notas para datos/contenido.py»).
