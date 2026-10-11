import { getExplorationImagePath } from '@/lib/explorationAssets'
import type {
  ForestFirePhase,
  ForestFireProfessional,
  ForestFireWordCloudEntry,
} from '@/types/cases'

const forestFireProfessionals: ForestFireProfessional[] = [
  {
    id: 'firefighter',
    occupationId: 'firefighter',
    name: 'Bombero',
    personName: 'Mateo Salazar',
    description:
      'Combate incendios utilizando equipos de extinción y técnicas especializadas. También está entrenado para rescatar personas y animales en situaciones de peligro inminente.',
    skills: ['Control de incendios', 'Rescate', 'Trabajo bajo presión', 'Coordinación'],
  },
  {
    id: 'meteorologist',
    occupationId: 'meteorologist',
    name: 'Meteoróloga',
    personName: 'Valentina Rojas',
    description:
      'Estudia el clima y la atmósfera. Analiza variables como viento, humedad y temperatura para predecir cómo evolucionarán las condiciones ambientales en una zona.',
    skills: ['Análisis atmosférico', 'Pronóstico', 'Lectura de datos', 'Comunicación'],
  },
  {
    id: 'municipal-police',
    occupationId: 'municipal-police',
    name: 'Policía municipal',
    personName: 'Diego Navarro',
    description:
      'Mantiene el orden público, regula el tránsito y garantiza la seguridad de las personas en situaciones de riesgo o emergencia.',
    skills: ['Gestión del tránsito', 'Seguridad pública', 'Coordinación', 'Orientación'],
  },
  {
    id: 'paramedic',
    occupationId: 'paramedic',
    name: 'Paramédica',
    personName: 'Camila Torres',
    description:
      'Brinda atención médica inmediata a personas heridas o en situaciones de emergencia, estabilizando su estado antes de un traslado si es necesario.',
    skills: ['Primeros auxilios', 'Triaje', 'Estabilización', 'Comunicación'],
  },
  {
    id: 'medical-specialist',
    occupationId: 'medical-specialist',
    name: 'Médico especialista',
    personName: 'Andrés Paredes',
    description:
      'Trata casos médicos complejos —como heridas graves o intoxicaciones— que requieren un nivel de atención más profundo que los primeros auxilios.',
    skills: ['Diagnóstico clínico', 'Quemaduras', 'Toxicología', 'Toma de decisiones'],
  },
  {
    id: 'veterinarian',
    occupationId: 'veterinarian',
    name: 'Veterinaria',
    personName: 'Lucía Benavides',
    description:
      'Atiende la salud de los animales: cura heridas, trata enfermedades y brinda cuidados médicos especializados.',
    skills: ['Medicina animal', 'Curación de heridas', 'Bienestar animal', 'Manejo de fauna'],
  },
  {
    id: 'biologist',
    occupationId: 'biologist',
    name: 'Biólogo',
    personName: 'Martín Quiroz',
    description:
      'Estudia los seres vivos y los ecosistemas. Evalúa el estado de la fauna y flora de una zona y hace seguimiento de su evolución con el tiempo.',
    skills: ['Ecología', 'Monitoreo de fauna', 'Trabajo de campo', 'Análisis de datos'],
  },
  {
    id: 'environmental-engineer',
    occupationId: 'environmental-engineer',
    name: 'Ingeniera medioambiental',
    personName: 'Elena Cárdenas',
    description:
      'Analiza el impacto ambiental sobre el suelo y el agua, y diseña técnicas para reducir daños y ayudar a la recuperación de un entorno natural.',
    skills: ['Evaluación ambiental', 'Suelos y agua', 'Restauración', 'Gestión de riesgos'],
  },
  {
    id: 'civil-engineer',
    occupationId: 'civil-engineer',
    name: 'Ingeniero civil',
    personName: 'Javier Ramos',
    description:
      'Evalúa la seguridad de estructuras como caminos, puentes y edificaciones, y planifica su reparación.',
    skills: ['Evaluación estructural', 'Infraestructura', 'Planificación', 'Seguridad'],
  },
  {
    id: 'machinery-operator',
    occupationId: 'machinery-operator',
    name: 'Operadora de maquinaria',
    personName: 'Rosa Mendoza',
    description: 'Opera maquinaria pesada para remover escombros, tierra o materiales, y preparar terrenos.',
    skills: ['Maquinaria pesada', 'Remoción de escombros', 'Seguridad operativa', 'Preparación de terrenos'],
  },
  {
    id: 'social-worker',
    occupationId: 'social-worker',
    name: 'Trabajadora social',
    personName: 'Daniela Flores',
    description:
      'Conversa con personas y familias en situaciones vulnerables para identificar sus necesidades y conectarlas con instituciones de apoyo.',
    skills: ['Escucha activa', 'Evaluación social', 'Redes de apoyo', 'Gestión comunitaria'],
  },
  {
    id: 'photographer',
    occupationId: 'photographer',
    name: 'Fotógrafa',
    personName: 'Mariana Soto',
    description:
      'Registra historias y acontecimientos mediante imágenes, documentando momentos importantes para comunicarlos o conservarlos.',
    skills: ['Narrativa visual', 'Documentación', 'Observación', 'Edición fotográfica'],
  },
  {
    id: 'psychologist',
    occupationId: 'psychologist',
    name: 'Psicólogo',
    personName: 'Sebastián León',
    description:
      'Acompaña el bienestar emocional de personas y comunidades, ofreciendo escucha y estrategias para afrontar situaciones difíciles.',
    skills: ['Escucha activa', 'Contención emocional', 'Evaluación', 'Empatía'],
  },
  {
    id: 'logistics-coordinator',
    occupationId: 'logistics-coordinator',
    name: 'Coordinadora logística',
    personName: 'Andrea Campos',
    description:
      'Organiza recursos, rutas y entregas para que los suministros lleguen al lugar y momento adecuados.',
    skills: ['Organización', 'Inventarios', 'Coordinación', 'Abastecimiento'],
  },
  {
    id: 'journalist',
    occupationId: 'journalist',
    name: 'Periodista',
    personName: 'Nicolás Vega',
    description:
      'Investiga y comunica hechos relevantes a la población, dando a conocer situaciones y necesidades a una audiencia más amplia.',
    skills: ['Investigación', 'Entrevistas', 'Comunicación pública', 'Verificación'],
  },
]

const forestFirePhases: ForestFirePhase[] = [
  {
    id: 'emergency',
    listenPrompt:
      'Hay personas pidiendo ayuda en la escena. Arrastra la imagen para encontrarlas y toca cada punto para escucharlas. Necesitamos escuchar a todas antes de armar el equipo.',
    listenPromptMobile:
      'Hay personas pidiendo ayuda en la escena. Arrastra la imagen para encontrarlas y toca cada punto para escucharlas. Necesitamos escuchar a todas antes de armar el equipo.',
    number: 1,
    name: 'Emergencia',
    subtitle: 'El fuego avanza y la localidad necesita una respuesta inmediata.',
    backgroundImage: getExplorationImagePath('forest-fire-case-background.png'),
    backgroundPosition: '62% 50%',
    messages: [
      {
        id: 'changing-fire',
        position: { x: 44, y: 30 },
        summary: 'el fuego cambia de dirección',
        speaker: 'Vecino',
        context: 'Mirando el humo a lo lejos',
        message:
          'El fuego se mueve raro... a veces parece que avanza para un lado, y de la nada cambia. Nadie sabe bien por dónde va a llegar primero.',
      },
      {
        id: 'traffic-chaos',
        position: { x: 78, y: 56 },
        summary: 'caos en la salida del pueblo',
        speaker: 'Persona evacuando',
        context: 'Desde su auto',
        message:
          'En la salida del pueblo hay un caos total. Autos que no avanzan, gente que no sabe por dónde ir ni quién los está guiando.',
      },
      {
        id: 'grandmother-at-risk',
        position: { x: 52, y: 70 },
        summary: 'una abuela no puede salir sola',
        speaker: 'Familiar angustiado',
        context: 'Pidiendo ayuda urgente',
        message:
          'Mi abuela no puede salir sola de la casa, y el humo ya está llegando a esa zona. Alguien tiene que ir por ella.',
      },
      {
        id: 'outside-support',
        position: { x: 24, y: 76 },
        summary: 'afuera nadie sabe lo que pasa',
        speaker: 'Vecino',
        context: 'Con una radio portátil',
        message: 'Afuera del pueblo nadie sabe todavía lo que está pasando acá, ni que necesitamos ayuda.',
      },
    ],
    problems: [
      {
        id: 'fire-control',
        title: 'Control del fuego',
        detail:
          'Organizar acciones para comprender el avance del incendio, contener las llamas y reducir el peligro inmediato.',
        resultNarrative:
          'La respuesta permitió coordinar información sobre el avance del fuego y organizar las acciones de contención en los puntos más urgentes.',
        expectedProfessionalIds: ['firefighter', 'meteorologist'],
        professionalContributions: {
          firefighter:
            'El bombero combate las llamas directamente con mangueras, agua y técnicas de corte de vegetación para frenar el avance del fuego.',
          meteorologist:
            'El meteorólogo trabaja junto al bombero, informándole cómo puede cambiar el viento o la temperatura, para anticipar hacia dónde se moverá el fuego o el humo.',
        },
        missingContributionNarratives: {
          firefighter:
            'El fuego siguió expandiéndose durante más tiempo y alcanzó nuevas áreas antes de poder ser contenido.',
          meteorologist:
            'Los equipos tuvieron que enfrentar cambios en el viento con menor anticipación, dificultando decidir dónde concentrar los esfuerzos para contener el fuego.',
        },
      },
      {
        id: 'people-evacuation',
        title: 'Evacuación de personas',
        detail:
          'Guiar la salida de la localidad y brindar apoyo a quienes no pueden evacuar por sus propios medios.',
        resultNarrative:
          'La comunidad recibió orientación para salir de la zona y se organizaron apoyos para las personas que necesitaban asistencia adicional.',
        expectedProfessionalIds: ['firefighter', 'meteorologist', 'municipal-police'],
        professionalContributions: {
          firefighter:
            'El bombero ingresa a las zonas de riesgo para sacar a las personas y animales atrapados antes de que el fuego las alcance.',
          meteorologist:
            'El meteorólogo analiza el viento y la humedad para predecir hacia qué zonas puede extenderse el fuego, y con esa información se decide qué áreas evacuar primero.',
          'municipal-police':
            'El policía bloquea el acceso a las zonas de peligro, ordena el tránsito y ayuda a que la evacuación se haga de forma segura y sin caos.',
        },
        missingContributionNarratives: {
          firefighter:
            'Varias personas y animales permanecieron más tiempo en zonas de riesgo, al no contar con alguien que pudiera ingresar a rescatarlos directamente.',
          meteorologist:
            'Fue más difícil decidir qué zonas evacuar primero, al contar con menos información sobre hacia dónde podía avanzar el incendio.',
          'municipal-police':
            'Los accesos y rutas de evacuación se congestionaron, dificultando la salida ordenada de las personas y el ingreso de los equipos de emergencia.',
        },
      },
    ],
  },
  {
    id: 'stabilization',
    listenPrompt:
      'El peligro inmediato está contenido. Arrastra la imagen para encontrar a las personas y escucha qué necesitan ellas y los animales antes de armar el equipo.',
    listenPromptMobile:
      'Arrastra la imagen y escucha a todas las personas. Sus necesidades nos ayudarán a estabilizar la comunidad.',
    number: 2,
    name: 'Estabilización',
    subtitle: 'El frente inmediato está contenido, pero las personas y los animales necesitan atención.',
    backgroundImage: getExplorationImagePath('forest-fire-stabilization-background-v2.png?v=2'),
    backgroundPosition: '64% 55%',
    messages: [
      {
        id: 'minor-injuries',
        position: { x: 50, y: 68 },
        summary: 'Personas con heridas leves y tos',
        speaker: 'Voluntario',
        context: 'En el punto de encuentro',
        message:
          'Están llegando varias personas con heridas leves y tos por el humo, pero por suerte nada que no se pueda atender ahí mismo.',
      },
      {
        id: 'serious-burn',
        position: { x: 72, y: 70 },
        summary: 'Una quemadura necesita atención especializada',
        speaker: 'Familiar de un herido',
        context: 'Desde el centro de atención',
        message:
          'A mi hermano lo tuvieron que trasladar. La quemadura era más grave de lo que pensábamos al principio, necesitaba algo más que primeros auxilios.',
      },
      {
        id: 'lost-home-and-dog',
        position: { x: 82, y: 79 },
        summary: 'Una familia sin casa y perro herido',
        speaker: 'Vecina afectada',
        context: 'En el refugio temporal',
        message:
          'Perdimos la casa, no sabemos ni dónde vamos a dormir esta noche. Y mi perro también se quemó las patas, no sé quién puede revisarlo.',
      },
      {
        id: 'missing-donations',
        position: { x: 38, y: 55 },
        summary: 'Falta comunicar las necesidades de ayuda',
        speaker: 'Voluntario',
        context: 'Organizando donaciones',
        message:
          'Han llegado algunas cosas, pero la gente de otros lugares ni se ha enterado de todo lo que todavía falta.',
      },
    ],
    problems: [
      {
        id: 'affected-people-care',
        title: 'Atención a los afectados',
        detail:
          'Atender lesiones de distinta gravedad y acompañar a las familias que perdieron su vivienda o necesitan apoyo.',
        resultNarrative:
          'Se organizó la atención de las personas afectadas, diferenciando las necesidades médicas inmediatas del acompañamiento requerido por las familias.',
        expectedProfessionalIds: ['paramedic', 'medical-specialist', 'social-worker'],
        professionalContributions: {
          paramedic:
            'El paramédico atiende en el momento a las personas rescatadas, tratando heridas leves, quemaduras superficiales o malestar por inhalación de humo.',
          'medical-specialist':
            'El médico especialista atiende los casos más delicados —como quemaduras graves o intoxicaciones severas— que necesitan un tratamiento más profundo que los primeros auxilios.',
          'social-worker':
            'El trabajador social conversa con las familias afectadas para identificar qué necesitan —albergue, alimentos, atención— y las conecta con las instituciones que pueden ayudarlas.',
        },
        missingContributionNarratives: {
          paramedic:
            'Varias personas rescatadas no recibieron atención inmediata para sus heridas, quemaduras o malestar por inhalación de humo.',
          'medical-specialist':
            'Los casos más graves quedaron sin la atención especializada que requerían para tratar quemaduras profundas o intoxicaciones severas.',
          'social-worker':
            'Algunas familias tuvieron mayores dificultades para acceder a albergue, alimentos u otros apoyos que necesitaban después del incendio.',
        },
      },
      {
        id: 'animal-protection',
        title: 'Protección y recuperación ambiental',
        detail: 'Rescatar y brindar atención a los animales heridos o desplazados por el incendio.',
        resultNarrative:
          'Los animales encontrados recibieron una primera respuesta y se estableció un seguimiento para atender sus lesiones y necesidades de cuidado.',
        expectedProfessionalIds: ['veterinarian'],
        professionalContributions: {
          veterinarian:
            'El veterinario cura a los animales rescatados que presentan heridas, quemaduras o intoxicación por el humo.',
        },
        missingContributionNarratives: {
          veterinarian:
            'Los animales rescatados con heridas, quemaduras o efectos del humo no recibieron el tratamiento que necesitaban oportunamente.',
        },
      },
    ],
  },
  {
    id: 'recovery',
    listenPrompt:
      'La comunidad y el bosque necesitan recuperarse. Arrastra la imagen para encontrar a las personas y escucha qué quedó por atender antes de armar el equipo.',
    listenPromptMobile:
      'Arrastra la imagen y escucha a todas las personas para saber cómo ayudar a la comunidad y al bosque a recuperarse.',
    number: 3,
    name: 'Recuperación',
    subtitle: 'La emergencia terminó, pero la localidad y el bosque necesitan recuperarse.',
    backgroundImage: getExplorationImagePath('forest-fire-recovery-background-v2.png?v=2'),
    backgroundPosition: '62% 50%',
    messages: [
      {
        id: 'damaged-ecosystem',
        position: { x: 73, y: 72 },
        summary: 'El bosque y sus animales necesitan seguimiento',
        speaker: 'Vecino',
        context: 'Después de caminar por el bosque',
        message:
          'Quedó irreconocible. No sé qué animales lograron sobrevivir, ni si van a poder volver a vivir ahí con el tiempo.',
      },
      {
        id: 'unstable-soil',
        position: { x: 63, y: 39 },
        summary: 'La ladera podría deslizarse con las lluvias',
        speaker: 'Agricultor de la zona',
        context: 'Observando la ladera',
        message:
          'La tierra quedó suelta, sin nada que la sostenga. Con las lluvias que vienen, me preocupa que se venga toda la ladera abajo.',
      },
      {
        id: 'damaged-bridge',
        position: { x: 51, y: 66 },
        summary: 'El puente y los caminos están dañados',
        speaker: 'Vecino',
        context: 'Intentando volver a su casa',
        message:
          'El puente que conecta con el pueblo quedó todo negro, no sé si aguanta el peso de un auto. Y el camino sigue lleno de árboles caídos, ni pasar se puede.',
      },
      {
        id: 'forgotten-story',
        position: { x: 87, y: 57 },
        summary: 'Fuera del pueblo olvidaron el incendio',
        speaker: 'Vecino',
        context: 'Viendo las noticias',
        message:
          'Ya casi nadie habla del incendio afuera... como que todos se olvidaron rápido de lo que pasó acá.',
      },
    ],
    problems: [
      {
        id: 'infrastructure-recovery',
        title: 'Recuperación de zonas afectadas',
        detail: 'Revisar caminos, puentes y terrenos para recuperar accesos seguros a la localidad.',
        resultNarrative:
          'Se revisaron los accesos afectados y se organizaron tareas para retirar obstáculos, evaluar estructuras y planificar reparaciones seguras.',
        expectedProfessionalIds: ['civil-engineer', 'machinery-operator'],
        professionalContributions: {
          'civil-engineer':
            'El ingeniero civil revisa qué tan seguros quedaron los caminos, puentes y viviendas cercanas al incendio, y planifica cómo repararlos para que la gente pueda volver a usarlos con confianza.',
          'machinery-operator':
            'El operador de maquinaria retira escombros y árboles caídos que bloquean los caminos, ayudando a que las localidades vuelvan a tener acceso seguro.',
        },
        missingContributionNarratives: {
          'civil-engineer':
            'Caminos, puentes y viviendas volvieron a utilizarse sin una evaluación previa que permitiera saber si seguían siendo seguros.',
          'machinery-operator':
            'Los escombros y árboles caídos continuaron bloqueando algunos caminos, dificultando el acceso y el retorno a las zonas afectadas.',
        },
      },
      {
        id: 'ecosystem-follow-up',
        title: 'Protección y recuperación ambiental',
        detail:
          'Evaluar el estado del ecosistema y definir acciones de seguimiento para el suelo, el agua, la fauna y la flora.',
        resultNarrative:
          'Comenzó el seguimiento del ecosistema para reconocer los daños y orientar acciones que ayuden a recuperar el entorno con el tiempo.',
        expectedProfessionalIds: ['biologist', 'environmental-engineer', 'machinery-operator'],
        professionalContributions: {
          biologist:
            'El biólogo estudia cómo el incendio afectó a las plantas y animales de la zona, identifica qué especies quedaron en mayor riesgo y hace seguimiento de su recuperación con el tiempo.',
          'environmental-engineer':
            'El ingeniero medioambiental analiza los daños al suelo y al agua causados por el incendio —como la erosión— y diseña técnicas para reducirlos y ayudar a que el área se recupere.',
          'machinery-operator':
            'El operador de maquinaria retira árboles dañados y limpia el terreno quemado, preparando el área para las labores de recuperación del ecosistema.',
        },
        missingContributionNarratives: {
          biologist:
            'No se llegó a identificar con claridad qué especies habían sido más afectadas ni cuáles necesitaban mayor seguimiento durante su recuperación.',
          'environmental-engineer':
            'No se diseñaron medidas específicas para reducir los daños dejados por el incendio en el suelo y el agua y favorecer la recuperación del área.',
          'machinery-operator':
            'El terreno quemado permaneció con árboles dañados y otros restos que dificultaron iniciar las labores de recuperación del área.',
        },
      },
    ],
  },
]

const forestFireWordCloud: ForestFireWordCloudEntry[] = [
  {
    occupationId: 'psychologist',
    mentions: 24,
    comments: [
      'Podría acompañar emocionalmente a las familias que perdieron sus casas.',
      'Ayudaría a niñas y niños a procesar lo ocurrido sin sentirse solos.',
      'Podría reconocer a las personas que necesitan apoyo después de la emergencia.',
    ],
  },
  {
    occupationId: 'logistics-coordinator',
    mentions: 21,
    comments: [
      'Organizaría las donaciones para que lleguen a quienes más las necesitan.',
      'Podría controlar qué recursos quedan y dónde deben distribuirse.',
      'Ayudaría a coordinar vehículos, alimentos y medicinas sin desperdiciarlos.',
    ],
  },
  {
    occupationId: 'teacher',
    mentions: 18,
    comments: [
      'Podría enseñar a la comunidad cómo prevenir nuevos incendios.',
      'Ayudaría a preparar simulacros y rutas de evacuación con estudiantes.',
      'Convertiría lo ocurrido en aprendizajes para responder mejor en el futuro.',
    ],
  },
  {
    occupationId: 'geologist',
    mentions: 16,
    comments: [
      'Podría revisar si la ladera quedó expuesta a deslizamientos.',
      'Ayudaría a reconocer qué terrenos no son seguros después del incendio.',
      'Explicaría cómo puede cambiar el suelo cuando lleguen las lluvias.',
    ],
  },
  {
    occupationId: 'agricultural-engineer',
    mentions: 14,
    comments: [
      'Orientaría a las familias para recuperar sus cultivos dañados.',
      'Podría proponer formas de proteger el suelo agrícola.',
      'Ayudaría a decidir qué sembrar mientras se recupera la zona.',
    ],
  },
  {
    occupationId: 'public-administrator',
    mentions: 12,
    comments: [
      'Podría coordinar recursos de distintas instituciones públicas.',
      'Ayudaría a convertir las necesidades de la comunidad en programas concretos.',
      'Gestionaría apoyo para la reconstrucción durante los siguientes meses.',
    ],
  },
  {
    occupationId: 'drone-operator',
    mentions: 10,
    comments: [
      'Podría registrar desde el aire las zonas de difícil acceso.',
      'Ayudaría a comparar cómo cambia el bosque durante su recuperación.',
      'Permitiría observar riesgos sin enviar personas al terreno.',
    ],
  },
  {
    occupationId: 'photographer',
    mentions: 8,
    comments: [
      'Podría documentar los daños para que otras personas comprendan lo ocurrido.',
      'Sus imágenes servirían para conservar la memoria de la comunidad.',
      'Ayudaría a mostrar el proceso de recuperación del bosque.',
    ],
  },
  {
    occupationId: 'urban-planner',
    mentions: 7,
    comments: [
      'Podría planificar accesos y viviendas menos expuestos a futuros incendios.',
      'Ayudaría a pensar dónde ubicar servicios y rutas de evacuación.',
      'Propondría una recuperación ordenada de la localidad.',
    ],
  },
  {
    occupationId: 'data-analyst',
    mentions: 6,
    comments: [
      'Podría reunir datos para reconocer dónde se repiten los mayores riesgos.',
      'Ayudaría a visualizar qué recursos se utilizaron y cuáles faltaron.',
      'Compararía la respuesta para mejorar futuros planes de emergencia.',
    ],
  },
  {
    occupationId: 'documentary-filmmaker',
    mentions: 5,
    comments: [
      'Podría recoger testimonios y conservar la historia de la comunidad.',
      'Ayudaría a comunicar los aprendizajes del caso a otras localidades.',
      'Su documental podría mantener visible la recuperación a largo plazo.',
    ],
  },
]

export { forestFirePhases, forestFireProfessionals, forestFireWordCloud }
