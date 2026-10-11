import type { StudentView } from '@/lib/studentViews'

export const cityArrivalSteps = [
  '¡Lo lograste! Las puertas de la ciudad se abrieron para ti.',
  'Aquí no hay un orden fijo. Puedes atender los llamados de sus habitantes, investigar una carrera de cerca o visitar el molino.',
  'Y desde ahora también puedes conversar con tu familia en «En familia».',
]

export const familyDetailGuide =
  'Las respuestas tienen el mismo valor. La guía sirve para escucharse y encontrar preguntas que quieran seguir explorando juntos.'

export const guideSteps: Record<StudentView, string[]> = {
  'catalog-detail': [
    'Esta es la página del atlas. Guárdala en favoritos para tenerla a mano cuando armes tus planes.',
  ],
  'research-guide': [
    'Antes de preguntar, anotemos lo que piensas hoy de esta ocupación. Cuando vuelvas de la entrevista será interesante ver qué cambió.',
    'Te dejé unas preguntas para empezar. Agrega las tuyas: lo que de verdad te da curiosidad saber.',
    'Lo más importante ocurre fuera de aquí: la conversación con esa persona.',
  ],
  'profile-helena': [
    'Este es el libro de Helena. Cada página guarda algo que ella descubre de ti.',
    'Una página sellada se abre cuando completas sus misiones en la ciudad.',
    'Cuando Helena termina de leer una página, el sello brilla. Rómpelo cuando quieras verla.',
    'Ninguna página es mejor que otra: describen cómo eres, no cuánto vales.',
  ],
  activities: [
    'Aquí encuentras tus actividades disponibles y realizadas, en Camino y Ciudad. Elige «Ver en el mapa» para abrir su ficha y continuar o revisar lo que descubriste.',
  ],
  journal: [
    'Este es nuestro cuaderno. Solo tú puedes leerlo: ni tu orientadora ni tu familia ven lo que escribes.',
    'Puedes contarme algo cuando quieras, o responder las cartas que te dejo después de cada actividad.',
    'Cada día te dejo también una pregunta nueva. Ábrela cuando quieras; si un día no la respondes, no pasa nada.',
    'Cada conversación hace crecer nuestra amistad, hasta tres por día. La amistad nunca se pierde, aunque pasen días sin escribir.',
    'Cuando nuestra amistad crece, recupero un recuerdo de mi viaje y te lo cuento.',
  ],
  'journal-signals': [
    'Este historial reúne únicamente tus señales. Puedes registrar o cambiar la señal de hoy y elegir un punto para consultar su fecha y valor. Tus entradas privadas permanecen en «Mi diario».',
  ],
  community: [
    'Algunos descubrimientos crecen al compartirlos. Invita a quienes quieras caminar contigo: tu Crew puede tener hasta tres viajeros, contigo incluido.',
  ],
  investigations: [
    'Descubre investigaciones de tu salón y otros viajeros. Se abren al completar una misión de Central de Casos.',
  ],
  resources: [
    'Esta es tu mochila. Aquí se guarda lo que reúnes en el camino.',
    'Las fichas aparecen cuando completas actividades. Puedes abrirlas también desde las actividades.',
    'Las voces de la ciudad son personas reales que cuentan su historia. Se descubren al atender los llamados de la Central de Casos.',
    'Marca con la estrella lo que quieras encontrar rápido.',
  ],
  'catalog-professions': [
    'Explora las profesiones sin buscar una respuesta definitiva. Guarda las que despierten tu curiosidad y vuelve a compararlas cuando descubras nuevas pistas.',
  ],
  'catalog-careers': [
    'Las carreras son caminos de formación. Revisa qué se aprende en cada una y guarda las opciones que quieras investigar con más calma.',
  ],
  'catalog-institutions': [
    'Cada institución ofrece una experiencia distinta. Observa sus características y guarda las alternativas que podrían encajar con tu camino.',
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
    'No hace falta estar de acuerdo en todo. Respondan desde su propia mirada y usen la guía cuando encuentren un momento tranquilo para escucharse.',
  ],
  missions: [
    '¡Hola! Soy Lumi. Yo también llegué a este mundo sin saber muy bien hacia dónde ir. Dicen que este camino despeja las dudas de quienes lo recorren.',
    'Cada punto del mapa es una misión. La que brilla es la que te recomiendo ahora. Las que muestran un signo de pregunta aún no están disponibles.',
    'A la izquierda está tu panel: tu siguiente paso, cómo te sientes hoy y los accesos a tu diario, tu familia y todo lo que vas reuniendo. Puedes plegarlo cuando quieras.',
    'Al final del camino está la ciudad, donde podrás elegir tus actividades y ayudar a sus habitantes. Arriba puedes cambiar entre el camino y la ciudad.',
    'Si en algún momento no sabes qué hacer, toca el botón de ayuda y vendré.',
  ],
  central: [
    'Bienvenido a la ciudad. Aquí tú decides el orden: cada llamado de sus habitantes es una oportunidad para descubrir cómo se complementan distintas profesiones.',
    'Puedes entrar a Investigaciones desde tu panel para conocer una ocupación de cerca, o pasar por el molino a conversar con Mara.',
    'Cada vez que ayudas, tu afinidad con la ciudad crece. La ves en tu panel.',
  ],
}

export const passportGuideSteps = [
  'Este es tu pasaporte. Cada sello cuenta una parte de tu viaje.',
  'Arriba ves tu título de viajero y qué te falta para el siguiente.',
  'Pulsa una insignia para ver qué lograste, cómo la descubriste y qué significa. Las que aún no tienes te dicen cómo encontrarlas.',
  'Puedes elegir hasta tres insignias para mostrar a tus compañeros.',
]
