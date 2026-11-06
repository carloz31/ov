import { catalog } from '@/data/activities/content'
import type { Challenge } from '@/types/challenges'
import { validateChallenge } from '@/lib/challenges'

// Demonstration enemy: every question is supported by the existing myths sheet.
const rows = [
  [
    '¿Qué convierte una frase en un mito vocacional?',
    ['Repetirla sin comprobarla', 'Buscar evidencia', 'Comparar fuentes', 'Revisar su fecha'],
    0,
    'Que una frase se repita no demuestra que sea cierta ni que aplique a todas las personas.',
  ],
  [
    '¿Qué conviene revisar ante un consejo de hace veinte años?',
    [
      'Cuántas veces se repitió',
      'Si aplica a la situación de hoy',
      'La popularidad del consejo',
      'Solo quién lo contó',
    ],
    1,
    'Una experiencia de otra época puede no describir el mercado laboral actual.',
  ],
  [
    '¿Qué rutas pueden conducir a un buen trabajo?',
    [
      'Solo la universidad',
      'Solo la formación técnica',
      'Universidad, técnica, oficios y emprendimiento',
      'Solo la ruta más popular',
    ],
    2,
    'Existen distintas rutas válidas, según tus objetivos y las condiciones de cada formación.',
  ],
  [
    '¿Qué determina si puedes ejercer una profesión?',
    [
      'Tu género',
      'Los estereotipos',
      'Lo que estudian tus amigos',
      'Tus habilidades, conocimientos e interés',
    ],
    3,
    'Las habilidades se desarrollan. Ninguna profesión exige un sexo para ejercerla.',
  ],
  [
    '¿Cómo considerar los ingresos al elegir?',
    [
      'Combinar interés y datos de ingresos y empleabilidad',
      'Ignorar tus intereses',
      'Ignorar el dinero',
      'Seguir el sueldo más alto sin investigar',
    ],
    0,
    'Lo sensato es combinar tus intereses con información real sobre las condiciones de trabajo.',
  ],
  [
    '¿Qué significa elegir una carrera?',
    [
      'Una sentencia para toda la vida',
      'Un primer paso que puede evolucionar',
      'Renunciar a aprender otras cosas',
      'Acertar una única respuesta perfecta',
    ],
    1,
    'Las trayectorias cambian: puedes especializarte, combinar áreas o cambiar de rumbo.',
  ],
  [
    '¿Qué conviene hacer antes de aceptar una creencia?',
    [
      'Repetirla',
      'Aceptar la más popular',
      'Preguntar por la evidencia a favor y en contra',
      'Buscar solo casos que la confirmen',
    ],
    2,
    'Buscar evidencia y contraejemplos ayuda a decidir con información.',
  ],
  [
    '¿De qué pueden depender los ingresos dentro de una carrera?',
    [
      'Solo del nombre de la carrera',
      'Solo de su prestigio',
      'Solo de su popularidad',
      'De la institución, experiencia y especialización',
    ],
    3,
    'Los ingresos varían dentro de una misma carrera y dependen de distintos factores.',
  ],
  [
    '¿Qué ocurre con las habilidades al cambiar de campo?',
    [
      'Algunas se transfieren a otras áreas',
      'Todas dejan de servir',
      'Nunca pueden desarrollarse',
      'Solo sirven en el primer empleo',
    ],
    0,
    'Comunicarte, resolver problemas y trabajar en equipo puede servirte en otras áreas.',
  ],
  [
    '¿Qué demuestra la experiencia de una sola persona?',
    [
      'Lo que pasará a todo el mundo',
      'Un caso que conviene contrastar',
      'Que no necesitas más información',
      'Que el mercado nunca cambia',
    ],
    1,
    'Una experiencia personal es valiosa, pero es un solo caso. Contrástala con otros datos.',
  ],
] as const

export const challenges: Challenge[] = [
  {
    id: 'desafio-rumor',
    codigo: 'DES-RUMOR',
    tipo: 'desafio',
    audiencia: 'estudiante',
    nombre: 'El Rumor',
    titulo: 'Luz entre los rumores',
    presentacionEnemigo:
      'El Rumor crece cuando repetimos ideas sin revisarlas. La información de tu ficha es nuestra luz. ¿Lo disipamos juntos?',
    ilustracion: '/images/student/rumor.svg',
    bloque: 3,
    orden: 20,
    obligatoria: false,
    ubicacion: 'Plaza de la ciudad',
    duracionEstimadaMin: 6,
    personajeIds: ['companero'],
    nodos: [],
    vidasEnemigo: 5,
    vidasEstudiante: 3,
    opcionesPorPregunta: 4,
    requisitos: [{ tipo: 'ficha', id: 'ficha-mitos', titulo: 'Mitos y realidades del futuro profesional' }],
    banco: rows.map(([enunciado, options, correct, explicacion], i) => ({
      id: `rumor-${i + 1}`,
      enunciado,
      opciones: options.map((texto, j) => ({ id: String(j), texto })),
      correcta: String(correct),
      explicacion,
    })),
    recompensa: {
      recursoIds: ['ficha-luz-rumor'],
      titulo: 'Preguntas que disipan rumores',
      lugar: 'el atlas de carreras',
      href: '/student/catalog/careers',
      mensajeFin: 'La información abre nuevas posibilidades.',
    },
    logroOculto: { codigo: 'I10', nombre: 'Luz sin fisuras' },
  },
]

export const challengeRewards = [
  {
    id: 'ficha-luz-rumor',
    titulo: 'Ficha: Preguntas que disipan rumores',
    tipo: 'ficha' as const,
    guardableEnRecursos: true,
    contenido:
      '## Preguntas que disipan rumores\n\nAntes de aceptar un consejo, pregunta:\n\n1. ¿Quién lo dice y desde qué experiencia?\n2. ¿Qué evidencia hay a favor y en contra?\n3. ¿Aplica a mi caso y a la situación de hoy?\n\nExplora distintas rutas. Combina tus intereses con información y recuerda que tu trayectoria puede cambiar.',
    fuente: 'Ficha de mitos y realidades del futuro profesional',
  },
]
for (const reward of challengeRewards)
  if (!catalog.recursos.some((r) => r.id === reward.id)) catalog.recursos.push(reward)
for (const c of challenges) {
  const errors = validateChallenge(c)
  if (errors.length) throw new Error(`${c.codigo}: ${errors.join(' ')}`)
  for (const r of c.requisitos)
    if (r.tipo === 'ficha' && !catalog.recursos.some((f) => f.id === r.id && f.tipo === 'ficha'))
      throw new Error(`Ficha desconocida: ${r.id}`)
}

// Ajuste carga-actividades: las batallas del contenido real (conjunto `contenido` del backend). Solo las abre el
// modo api (`desafioPorId`), con preguntas, vidas, destellos y fichas del servidor; no entran a `challenges` porque
// el mapa y la validación del modo local (congelado) recorren esa lista.
export const desafiosPlataforma: Challenge[] = [
  // Fragmento para ov_frontend/src/data/content/challenges.ts (tanda 1).
  // En api solo se usan nombre, titulo, presentacionEnemigo, ilustracion, personajeIds,
  // recompensa.titulo y recompensa.lugar; preguntas, vidas y destellos vienen del servidor.
  // `banco` y `requisitos` son los que exige el tipo Challenge para el modo local (congelado):
  // se dejan mínimos. Las fichas reales de la batalla se derivan de PREGUNTAS_BATALLA (F04b).

  {
    id: 'desafio-puente-mitos',
    codigo: 'DES-PUENTE-MITOS',
    tipo: 'desafio',
    audiencia: 'estudiante',
    nombre: 'El pregón de Aurelio',
    titulo: 'El puente de los mitos',
    presentacionEnemigo:
      'Aurelio pregona desde la otra orilla y cada frase que aceptes sin dato rompe una tabla del puente. ' +
      'Clasifica cada pregón como mito o como afirmación con sustento y elige el argumento que lo desarma. ' +
      'Si el puente aguanta, Aurelio se queda sin eco.',
    ilustracion: '/images/student/pregonero.svg',
    bloque: 1,
    orden: 5,
    obligatoria: true,
    ubicacion: 'Desierto, puente de los mitos',
    duracionEstimadaMin: 8,
    personajeIds: ['aurelio', 'companero'],
    nodos: [],
    vidasEnemigo: 5,
    vidasEstudiante: 3,
    opcionesPorPregunta: 4,
    requisitos: [{ tipo: 'ficha', id: 'F05', titulo: 'Mitos sobre el futuro profesional' }],
    banco: [],
    recompensa: {
      titulo: 'El puente aguantó',
      lugar: 'el otro lado del desierto',
      href: '/student/map',
      mensajeFin: 'Que una frase se repita mucho no la vuelve cierta; solo la vuelve conocida.',
    },
  },
  // Fragmento para ov_frontend/src/data/content/challenges.ts (tanda 3: batallas del puerto).
  // En api solo se usan nombre, titulo, presentacionEnemigo, ilustracion, personajeIds, recompensa.titulo y
  // recompensa.lugar; preguntas, vidas y destellos vienen del servidor (CONFIGURACION_BATALLAS y PREGUNTAS_BATALLA).

  {
    id: 'desafio-cifra',
    codigo: 'DES-CIFRA',
    tipo: 'desafio',
    audiencia: 'estudiante',
    nombre: 'Doña Cifra',
    titulo: 'El mercado y las rutas',
    presentacionEnemigo:
      'Doña Cifra lee los números del mercado como si fueran un horóscopo: un promedio es un destino, una demanda es un trabajo seguro ' +
      'y solo una ruta vale. Cada vez que leas bien una ficha o mandes a un viajero al embarcadero correcto, pierde un cliente. ' +
      'Si se queda sin clientes, cierra el puesto.',
    ilustracion: '/images/student/cifra.svg',
    bloque: 3, orden: 5, obligatoria: true,
    ubicacion: 'Puerto, plaza del mercado',
    duracionEstimadaMin: 8,
    personajeIds: ['cifra', 'companero'],
    nodos: [],
    vidasEnemigo: 5, vidasEstudiante: 3, opcionesPorPregunta: 4,
    requisitos: [
      { tipo: 'ficha', id: 'F11', titulo: 'Caminos después del colegio' },
      { tipo: 'ficha', id: 'F13', titulo: 'Salarios, demanda e informalidad' },
    ],
    banco: [],
    recompensa: { titulo: 'El puesto cerró', lugar: 'la feria del malecón', href: '/student/map',
      mensajeFin: 'Un salario promedio es un dato de otras personas. Lo que te toque dependerá de dónde, cómo y cuánto te preparas.' },
  },
  {
    id: 'desafio-feriante',
    codigo: 'DES-FERIANTE',
    tipo: 'desafio',
    audiencia: 'estudiante',
    nombre: 'El Feriante',
    titulo: 'El stand del Faro Dorado',
    presentacionEnemigo:
      'Don Próspero, el feriante, cuelga un anuncio tras otro: acreditación internacional, ingreso directo, bolsa de trabajo garantizada. ' +
      'Cada anuncio que desmontes (qué verificar, qué promesa es dudosa, qué modalidad de admisión aplica) le quita un banderín. ' +
      'Sin banderines, el stand se cierra.',
    ilustracion: '/images/student/feriante.svg',
    bloque: 3, orden: 7, obligatoria: true,
    ubicacion: 'Puerto, feria del malecón',
    duracionEstimadaMin: 8,
    personajeIds: ['feriante', 'companero'],
    nodos: [],
    vidasEnemigo: 5, vidasEstudiante: 3, opcionesPorPregunta: 4,
    requisitos: [
      { tipo: 'ficha', id: 'F14', titulo: 'Licenciamiento y acreditación' },
      { tipo: 'ficha', id: 'F15', titulo: 'Cómo se ingresa' },
    ],
    banco: [],
    recompensa: { titulo: 'El stand se cerró', lugar: 'la caseta de Clotilde', href: '/student/map',
      mensajeFin: 'Postular es un proceso con reglas publicadas. Si no encuentras las reglas, no confíes en la promesa.' },
  },
  {
    id: 'desafio-prestamista',
    codigo: 'DES-PRESTAMISTA',
    tipo: 'desafio',
    audiencia: 'estudiante',
    nombre: 'Clotilde, la prestamista',
    titulo: 'Los presupuestos con hueco',
    presentacionEnemigo:
      'Clotilde guarda una pila de presupuestos de jóvenes que firmaron sin mirar. Todos tienen un hueco: un rubro que falta, un año ' +
      'que no se contó, un crédito calculado con el sueldo equivocado o una beca que nadie pidió. Cada hueco que encuentres es un ' +
      'contrato que no se firma. Sin contratos, Clotilde cierra la caseta.',
    ilustracion: '/images/student/prestamista.svg',
    bloque: 3, orden: 9, obligatoria: true,
    ubicacion: 'Puerto, caseta junto al muelle',
    duracionEstimadaMin: 8,
    personajeIds: ['prestamista', 'companero'],
    nodos: [],
    vidasEnemigo: 5, vidasEstudiante: 3, opcionesPorPregunta: 4,
    requisitos: [{ tipo: 'ficha', id: 'F16', titulo: 'Cuánto cuesta y cómo pagarlo' }],
    banco: [],
    recompensa: { titulo: 'La caseta cerró', lugar: 'el malecón al atardecer', href: '/student/map',
      mensajeFin: 'Antes de decidir dónde, calcula cuánto cuesta todo el camino y de dónde saldría cada sol.' },
  },
  {
    id: 'desafio-cifra-rutas',
    codigo: 'DES-CIFRA-RUTAS',
    tipo: 'desafio',
    audiencia: 'estudiante',
    nombre: 'Doña Cifra (revancha)',
    titulo: 'Las rutas, otra vez',
    presentacionEnemigo:
      'Doña Cifra volvió a abrir el puesto, esta vez solo con un pregón: que únicamente una ruta sirve. Un repaso corto: viajeros ' +
      'con situaciones distintas y el embarcadero que les calza. Opcional, para quien quiera asegurar lo aprendido.',
    ilustracion: '/images/student/cifra.svg',
    bloque: 3, orden: 12, obligatoria: false,
    ubicacion: 'Puerto, plaza del mercado',
    duracionEstimadaMin: 5,
    personajeIds: ['cifra', 'companero'],
    nodos: [],
    vidasEnemigo: 3, vidasEstudiante: 3, opcionesPorPregunta: 4,
    requisitos: [{ tipo: 'ficha', id: 'F11', titulo: 'Caminos después del colegio' }],
    banco: [],
    recompensa: { titulo: 'Repaso superado', lugar: 'el puerto', href: '/student/map',
      mensajeFin: 'No hay una ruta «de verdad» y otras de consuelo. Hay rutas que calzan con lo que quieres y lo que puedes hoy.' },
  },
  // Fragmento para ov_frontend/src/data/content/challenges.ts (tanda 4: el Eco y las batallas de las misiones adicionales).

  {
    id: 'desafio-eco',
    codigo: 'DES-ECO',
    tipo: 'desafio',
    audiencia: 'estudiante',
    nombre: 'El Eco',
    titulo: 'Decidir con criterio',
    presentacionEnemigo:
      'El Eco vive en el borde del acantilado y no tiene voz propia: repite lo que los viajeros trajeron de casa. «Estudia lo que da plata.» ' +
      '«Tus amigos van a estar ahí.» «Esa carrera es respetada.» Te va a mostrar compañeros que eligieron así; cada vez que reconozcas ' +
      'el criterio débil y la información que les faltó, el Eco pierde una voz. Sin voces, se calla.',
    ilustracion: '/images/student/eco.svg',
    bloque: 4, orden: 4, obligatoria: true,
    ubicacion: 'Acantilado, el borde',
    duracionEstimadaMin: 8,
    personajeIds: ['eco', 'companero'],
    nodos: [],
    vidasEnemigo: 5, vidasEstudiante: 3, opcionesPorPregunta: 4,
    requisitos: [
      { tipo: 'ficha', id: 'F20', titulo: 'Criterios para decidir' },
      { tipo: 'ficha', id: 'F19', titulo: 'Cruzar tu perfil con tus opciones' },
      { tipo: 'ficha', id: 'F02', titulo: 'Lo que pesa cuando decides' },
    ],
    banco: [],
    recompensa: { titulo: 'El Eco se calló', lugar: 'la mesa de mapas', href: '/student/map',
      mensajeFin: 'Un buen criterio se puede aplicar a todas tus opciones por igual. Si solo sirve para justificar una, no es un criterio: es una excusa.' },
  },
  {
    id: 'desafio-aurelio-genero',
    codigo: 'DES-AURELIO-GENERO',
    tipo: 'desafio',
    audiencia: 'estudiante',
    nombre: 'Aurelio, otra vez',
    titulo: 'Profesiones sin género',
    presentacionEnemigo:
      'Aurelio volvió con un solo pregón, el que más aplausos le daba: «hay trabajos de hombres y trabajos de mujeres». Esta vez trae ' +
      'números a medias. Responde con los datos completos y el pregón se queda sin público. Corta y opcional.',
    ilustracion: '/images/student/pregonero.svg',
    bloque: 1, orden: 39, obligatoria: false,
    ubicacion: 'Desierto, el oasis',
    duracionEstimadaMin: 5,
    personajeIds: ['aurelio', 'companero'],
    nodos: [],
    vidasEnemigo: 3, vidasEstudiante: 3, opcionesPorPregunta: 4,
    requisitos: [{ tipo: 'ficha', id: 'F05', titulo: 'Mitos sobre el futuro profesional' }],
    banco: [],
    recompensa: { titulo: 'Sin público', lugar: 'el desierto', href: '/student/map',
      mensajeFin: 'El único requisito para ejercer una profesión son las habilidades, los conocimientos y el interés.' },
  },
  {
    id: 'desafio-cifra-brechas',
    codigo: 'DES-CIFRA-BRECHAS',
    tipo: 'desafio',
    audiencia: 'estudiante',
    nombre: 'Doña Cifra (brechas)',
    titulo: 'Más allá del promedio',
    presentacionEnemigo:
      'Doña Cifra saca los números que nunca muestra: por región, por edad y por formalidad. Cada brecha que leas bien es un promedio ' +
      'que deja de engañar. Corta y opcional.',
    ilustracion: '/images/student/cifra.svg',
    bloque: 3, orden: 38, obligatoria: false,
    ubicacion: 'Puerto, plaza del mercado',
    duracionEstimadaMin: 5,
    personajeIds: ['cifra', 'companero'],
    nodos: [],
    vidasEnemigo: 3, vidasEstudiante: 3, opcionesPorPregunta: 4,
    requisitos: [{ tipo: 'ficha', id: 'F13', titulo: 'Salarios, demanda e informalidad' }],
    banco: [],
    recompensa: { titulo: 'Las brechas, leídas', lugar: 'el puerto', href: '/student/map',
      mensajeFin: 'Un promedio nacional es cuatro promedios mezclados. Léelo por partes.' },
  },
]

export const desafioPorId = (id: string) => [...challenges, ...desafiosPlataforma].find((c) => c.id === id)
