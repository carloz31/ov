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
