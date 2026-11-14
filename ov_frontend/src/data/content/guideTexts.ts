import type { StudentView } from '@/lib/studentViews'

export const cityArrivalSteps = [
  '¡Llegamos a la ciudad! Desde ahora puedes volver cuando quieras: arriba del mapa pasas del camino a la ciudad.',
  'Aquí no hay un orden fijo. En la Central siempre hay algún problema del pueblo esperando ayuda, y algunos vecinos guardan preguntas para el libro de Helena.',
  'También se abrió «En familia» en tu panel. Y cuando quieras seguir, la aguja de Iván apunta al desierto.',
]

export const familyDetailGuide =
  'Las respuestas tienen el mismo valor. La guía sirve para escucharse y encontrar preguntas que quieran seguir explorando juntos.'

// F00 (solo api): lo que dice Lumi al pulsar algo cerrado. Un paso de adelanto y una frase final a la que
// se agrega el `mensaje` del servidor: el requisito siempre viene del servidor, nunca de estos textos.
export const textosBloqueo = {
  CIUDAD: {
    adelanto:
      'Más adelante en tu recorrido se abre la ciudad. Allí sus habitantes necesitan ayuda, y tú decides a quién ayudar primero.',
    final: 'Todavía no abre sus puertas.',
  },
  DIARIO: {
    adelanto:
      'Pronto tendrás un cuaderno solo para ti, donde podrás contarme lo que piensas y sientes en este viaje.',
    final: 'Todavía no puedes abrirlo.',
  },
  CHECK_IN: {
    adelanto:
      'Muy pronto vas a poder marcar tu señal de hoy: una vez al día, del 1 al 5, qué tanta seguridad sientes sobre tu próximo paso.',
    final: 'Todavía no puedes marcarla.',
  },
  CATALOGO: {
    adelanto:
      'Aquí se guarda un atlas de ocupaciones, carreras e instituciones. Te servirá para explorar lo que te llame la atención.',
    final: 'Todavía no puedes consultarlo.',
  },
  PLANES: {
    adelanto: 'Más adelante vas a poder guardar como plan las carreras que estás pensando seguir.',
    final: 'Todavía no puedes empezarlos.',
  },
  FAMILIA: {
    adelanto:
      'Este será un espacio para conversar con tu familia sobre lo que vas descubriendo: tú respondes desde tu lado y ellos desde el suyo.',
    final: 'Todavía no se abre.',
  },
  // F09
  INVESTIGACIONES: {
    adelanto:
      'Aquí podrás investigar una familia de carreras entrevistando a alguien que trabaja en ella, y ver las entrevistas de tu salón.',
    final: 'Todavía no puedes investigar.',
  },
  // Ajuste libro-helena-regreso
  LIBRO_HELENA: {
    adelanto:
      'Helena guarda un libro con lo que va descubriendo de ti. Se abre cuando respondes sus primeras preguntas.',
    final: 'Todavía no puedes abrirlo.',
  },
}
export type CodigoBloqueo = keyof typeof textosBloqueo
export const pasosBloqueo = (codigo: CodigoBloqueo, mensaje: string) => [
  textosBloqueo[codigo].adelanto,
  `${textosBloqueo[codigo].final} ${mensaje}`.trim(),
]

// F00 (solo api): en la ruta la ciudad se abre a mitad del camino, no al final. Desde el ajuste lumi-mensajes,
// la ayuda del mapa con b0-1 ya completada; antes es un aviso sin Lumi (`avisoAyudaMapa`).
export const guiaCaminoApi = [
  'Cada punto del mapa es una misión. Tócalo para ver de qué trata y cuánto toma. La que brilla es la que te recomiendo ahora.',
  'Las que tienen candado todavía no se abren: al tocarlas ves qué les falta. Las que llevan un signo de pregunta son misiones extra que se abrieron por algo que hiciste.',
  'A la izquierda está tu panel: tu siguiente paso, tu señal de hoy, cuánto llevas del camino y de la ciudad, y los accesos a Mis planes, Mi diario, En familia, Recursos, Investigaciones y Catálogo. Puedes plegarlo cuando quieras.',
  'Arriba del panel están tu nombre y tu título de viajero: tócalos para entrar a tu perfil. Ahí están tu pasaporte con tus sellos, el libro de Helena, tus planes y lo que guardaste en el catálogo.',
  'A mitad del camino se abre la ciudad. Desde ahí, arriba del mapa pasas del camino a la ciudad cuando quieras.',
  'Si en algún momento no sabes qué hacer, toca el botón de ayuda y vengo.',
]

// Ajuste lumi-mensajes (§1.1, solo api): el botón de ayuda del mapa antes de completar b0-1.
export const avisoAyudaMapa = 'Empieza por la misión que brilla en el mapa.'

// F09 (solo api): la ayuda del «?» en Investigaciones, con la sección abierta.
export const investigacionesGuideSteps = [
  'Aquí ves las entrevistas de tus compañeros a personas que trabajan en lo que les intriga. Elige una vista: «De mi salón», «Leyendas» o «Mis investigaciones».',
  'Para investigar, eliges una familia de carreras, anotas lo que piensas hoy de ese trabajo y armas tu guion de preguntas. Yo te sugiero algunas para empezar.',
  'La entrevista ocurre fuera de aquí. Súbela a YouTube como «No listado» y vuelve para publicarla, sola o con compañeros que investigaron la misma familia.',
  'Deja tu reacción en las entrevistas de otros y guarda en favoritos las que quieras volver a ver. Las mejores pueden llegar a ser Leyendas.',
]

export const guideSteps: Record<StudentView, string[]> = {
  'catalog-detail': [
    'Esta es una hoja del atlas. Guárdala en favoritos para encontrarla rápido. Si es una carrera, desde ahí puedes armar un plan con ella.',
  ],
  'research-guide': [
    'Antes de preguntar, anotemos lo que piensas hoy de esta ocupación. Cuando vuelvas de la entrevista será interesante ver qué cambió.',
    'Te dejé unas preguntas para empezar. Agrega las tuyas: lo que de verdad te da curiosidad saber.',
    'Lo más importante ocurre fuera de aquí: la conversación con esa persona.',
  ],
  'profile-helena': [
    'Este es el libro de Helena. Cada página se restaura cuando respondes sus preguntas.',
    'La primera la respondiste con Helena, en su cabaña. Las demás las guardan algunos vecinos de la ciudad.',
    'Cuando una página está lista, su sello brilla. Rómpelo cuando quieras verla.',
    'Ninguna página dice qué tienes que estudiar: muestran cómo eres hoy, no cuánto vales.',
  ],
  activities: [
    'Aquí están tus misiones del Camino y de la Ciudad, en «Disponibles» y «Realizadas». «Ver en el mapa» te lleva a su punto para empezarla, seguirla o volver a mirarla.',
  ],
  journal: [
    'En el buzón están las cartas que te dejo después de algunas misiones. Ábrelas y respóndelas cuando quieras.',
    'Cada día hay una pregunta nueva. Si un día no la respondes, no pasa nada: al día siguiente llega otra.',
    'Y si quieres contarme algo sin que yo pregunte, escribe una entrada libre. Todo queda en tu cuaderno, donde puedes releerlo, editarlo o borrarlo.',
    'Cada carta que me escribes suma a nuestra amistad, hasta tres por día, y nunca se pierde. Cuando sube, te cuento un pedazo de mi historia en «La historia de Lumi».',
  ],
  'journal-signals': [
    'Aquí está solo tu señal, día por día. Puedes marcar o cambiar la de hoy, y tocar un punto para ver su fecha y su valor. Lo que escribes en tu diario no aparece aquí.',
  ],
  community: [
    'Algunos descubrimientos crecen al compartirlos. Invita a quienes quieras caminar contigo: tu Crew puede tener hasta tres viajeros, contigo incluido.',
  ],
  investigations: [
    'Descubre investigaciones de tu salón y otros viajeros. Se abren al completar una misión de Central de Casos.',
  ],
  resources: [
    'Esta es tu mochila. Aquí se guarda lo que reúnes en el camino.',
    'Las fichas aparecen al completar algunas misiones y guardan lo que viste, por si quieres repasarlo.',
    'Las voces de la ciudad son personas reales que cuentan su historia. Se descubren al atender los llamados de la Central de Casos y en algunas misiones del camino.',
    'Marca con la estrella lo que quieras encontrar rápido, y usa «Solo favoritos» para verlo junto.',
  ],
  'catalog-professions': [
    'Busca por nombre o usa los filtros. Abre una ocupación para ver qué se hace en ella y cómo se llega. Guarda en favoritos las que te den curiosidad: no hace falta decidir nada todavía.',
  ],
  'catalog-careers': [
    'Busca por nombre o filtra por tipo, área y familia. En cada carrera ves qué se aprende, dónde se estudia y cuánto se gana en su familia. Si quieres armar un plan con una, primero guárdala en favoritos.',
  ],
  'catalog-institutions': [
    'Abre una institución para ver dónde están sus sedes y qué carreras ofrece. Guarda en favoritos las que podrían ser tu lugar.',
  ],
  'profile-general': [
    'Este es tu perfil de viajero. Aquí se reúne todo lo que vas descubriendo.',
    'En el primer capítulo ves lo que has logrado y qué te falta para tu siguiente nivel.',
    'En el segundo, lo que Helena va descifrando de ti. Cuando una página brilla, tiene algo nuevo que mostrarte.',
    'Y en el tercero, los caminos que estás considerando y lo que guardaste en el atlas.',
  ],
  'profile-decisions': [
    'Tus planes son las rutas que estás considerando. Puedes tener hasta tres: A, B y C.',
    'Cada carta se completa con tu motivación, tus fortalezas y obstáculos, un presupuesto y cómo te preparas.',
    'Puedes cambiar su prioridad cuando quieras. Lo que descubras en el camino puede confirmar un plan o abrir otro.',
  ],
  research: [
    'Aquí conoces el mundo profesional de cerca: entrevistando a alguien que ya trabaja en lo que te interesa.',
    'Primero armas tu guion conmigo. Luego haces la entrevista fuera de la plataforma y vuelves a compartirla.',
    'También puedes ver las entrevistas de tu salón y reaccionar a ellas.',
  ],
  conversations: [
    'Primero escribes una carta para tu familia. La van a leer en algún momento del camino, sin que sepas cuándo, y puedes editarla cuando quieras.',
    'Con tu carta guardada se abren los temas. Cada quien responde por separado; cuando están las dos respuestas, ves la de tu familia y una guía para conversar en casa.',
    'Los temas se van abriendo mientras avanzas en el camino. Cuando respondan todos, se rompe un sello.',
    'No hace falta estar de acuerdo en todo: lo que importa es escucharse.',
  ],
  missions: [
    'Cada punto del mapa es una misión. La que brilla es la que te recomiendo ahora. Las que muestran un signo de pregunta aún no están disponibles.',
    'A la izquierda está tu panel: tu siguiente paso, cómo te sientes hoy y los accesos a tu diario, tu familia y todo lo que vas reuniendo. Puedes plegarlo cuando quieras.',
    'Al final del camino está la ciudad, donde podrás elegir tus actividades y ayudar a sus habitantes. Arriba puedes cambiar entre el camino y la ciudad.',
    'Si en algún momento no sabes qué hacer, toca el botón de ayuda y vendré.',
  ],
  central: [
    'En la ciudad tú eliges el orden. Toca un punto para ver quién está ahí y qué necesita.',
    'En la Central de casos, un vecino te pide ayuda con un problema: armas un equipo con las personas del directorio y, si lo resuelves, conoces las voces de quienes hacen ese trabajo.',
    'Algunos vecinos guardan preguntas para las páginas del libro de Helena. En el camino te irán diciendo quiénes son.',
    'Cada misión que completas aquí suma a tu afinidad con la ciudad. La ves en el anillo «Ciudad» de tu panel.',
  ],
}

// Presentación de primera vez: para qué sirve cada sección, no cómo se usa (HU-019). La ayuda del botón está
// en guideSteps. Los textos marcados son DATO DE PRUEBA (desde el ajuste lumi-mensajes, solo los del modo local).
export const sectionIntros: Record<StudentView, string[]> = {
  // Ajuste lumi-mensajes: en api sale al volver de b0-1 (Lumi ya se presentó en el muelle).
  missions: [
    'Este es el mapa de la isla. Cada punto es una misión: tócalo para ver de qué trata y cuánto toma. La que brilla es la que te recomiendo ahora.',
    'Las que tienen candado todavía no se abren: al tocarlas ves qué les falta. Las que llevan un signo de pregunta son misiones extra que se abrieron por algo que hiciste.',
    'A la izquierda está tu panel: tu siguiente paso, cuánto llevas del camino y los accesos a Mis planes, Mi diario, En familia, Recursos, Investigaciones y Catálogo. Lo que todavía está cerrado te dice cuándo se abre, si lo tocas.',
    'Arriba del panel están tu nombre y tu título de viajero. Tócalos para entrar a tu perfil: ahí se va juntando todo lo que logras en el viaje.',
    'Puedes plegar el panel cuando quieras. Y si en algún momento te pierdes, toca el botón de ayuda y vengo.',
  ],
  central: [
    'Esta es la ciudad. Cada punto es alguien que necesita algo o que tiene algo que contarte, y tú eliges a quién ir primero.',
  ],
  activities: ['Aquí tienes a mano tus misiones: las que puedes hacer ahora y las que ya hiciste.'],
  // DATO DE PRUEBA
  community: [
    'Tu salón y tu Crew te acompañan en el viaje. Descubrir junto a otros te muestra caminos que quizá no habías imaginado.',
  ],
  conversations: [
    'En familia, las conversaciones ayudan a que quienes te quieren conozcan lo que estás descubriendo, y a que tú escuches su mirada.',
  ],
  'journal-signals': [
    'Aquí ves tu señal de hoy, día por día: qué tanta seguridad has sentido sobre tu próximo paso. Mirarla de vez en cuando ayuda a notar qué la mueve.',
  ],
  // Ajuste del diario: el contenido del antiguo cuadro «Un espacio para ti y Lumi», dicho por Lumi. Desde el
  // ajuste lumi-mensajes, dos pasos: la señal aún no existe al abrirse el diario y vive junto al mapa.
  journal: [
    'Este es nuestro diario. Lo que escribas aquí lo leo solo yo.',
    'Puedes responder las cartas que te dejo, la pregunta del día o escribirme sin que yo pregunte. Una frase basta.',
  ],
  // DATO DE PRUEBA
  research: [
    'Investigar es conocer una ocupación desde dentro, escuchando a alguien que vive de ella. Así comparas lo que imaginas con lo que realmente es.',
  ],
  // DATO DE PRUEBA
  'research-guide': [
    'Tu guion te prepara para la entrevista: llegar con buenas preguntas hace que la conversación te deje más respuestas.',
  ],
  investigations: [
    'Aquí están las entrevistas que hacen tú y tu salón a personas que trabajan en una familia de carreras. Escuchar a quien ya lo hace muestra lo que no sale en ninguna hoja del atlas.',
  ],
  resources: [
    'Esta es tu mochila. Aquí se guarda lo que reúnes en el camino.',
    'Tenerlo todo junto te ayuda a volver a lo que descubriste cuando tengas que decidir.',
  ],
  'catalog-professions': [
    'Este es el atlas de la isla. Aquí están las ocupaciones: lo que la gente hace en su trabajo. Cada hoja te cuenta en qué consiste y por qué carreras se llega.',
  ],
  'catalog-careers': [
    'Las carreras son lo que estudias para llegar a una ocupación. Están agrupadas en familias: carreras parecidas que llevan a trabajos parecidos.',
  ],
  'catalog-institutions': [
    'Aquí están las instituciones donde se estudia: universidades, institutos y escuelas.',
  ],
  'catalog-detail': [
    'Cada hoja del atlas reúne lo esencial de una ocupación, una carrera o una institución.',
  ],
  'profile-general': [
    'Tu perfil reúne todo lo que vas descubriendo de ti, para que veas cuánto has avanzado y hacia dónde te gustaría ir.',
  ],
  'profile-helena': [
    'El libro de Helena guarda lo que vas descubriendo de ti: cómo estás frente a tu decisión, tus intereses, tus habilidades con los demás y tus inteligencias.',
  ],
  'profile-decisions': [
    'Aquí guardas las carreras que estás pensando seguir. Un plan no es una promesa: puedes cambiarlo cuando quieras.',
  ],
}

// Guías del portal del apoderado (HU-018): qué se puede hacer en cada pantalla.
// DATO DE PRUEBA: textos provisionales hasta cargar el material definitivo.
export const parentGuides = {
  overview:
    'Aquí ves cómo avanza tu hijo o hija en su recorrido y qué conversaciones tienen pendientes. Cuando completes tus actividades, podrás abrir los resultados que comparte contigo.',
  activities:
    'Estas actividades te ayudan a acompañar el proceso. Ábrelas en orden: puedes pausarlas y retomarlas cuando quieras, y repasar las que ya completaste.',
  careers:
    'Esta guía reúne información para investigar en familia. Úsala para comparar alternativas y preparar preguntas, sin buscar una respuesta definitiva.',
  questionnaire:
    'Este es el resultado de un cuestionario que tu hijo o hija completó. Describe sus intereses o fortalezas, no lo que debe elegir: úsalo para conversar juntos.',
}

// F07a: la guía de Mis planes con la tarjeta v4 (api); en local sigue la de `profile-decisions`.
export const planesGuideSteps = [
  'Tus planes son las carreras que estás considerando. Puedes tener hasta tres: A, B y C.',
  'Un plan se crea desde una carrera que guardaste en favoritos: usa «Desde mis favoritos», o «Buscar en el catálogo» si todavía no guardaste ninguna.',
  'Cada tarjeta tiene cuatro secciones que se abren mientras avanzas en el camino: «Por qué la elijo», «Qué tanto la conozco», «Cómo lo haría realidad» y «Mis próximos pasos».',
  'Con «Subir prioridad» cambias cuál va primero, y puedes eliminar un plan cuando quieras: si lo vuelves a crear, recuperas lo que escribiste.',
]
export const passportGuideSteps = [
  'Este es tu pasaporte. Cada sello cuenta una parte de tu viaje.',
  'Arriba ves tu título de viajero y qué te falta para el siguiente.',
  'Toca un sello para ver qué lograste y cómo lo conseguiste. Los que aún no tienes te dicen cómo encontrarlos, y los secretos te dan una pista.',
  'Puedes elegir hasta tres sellos para mostrar en tu perfil a tus compañeros.',
]
