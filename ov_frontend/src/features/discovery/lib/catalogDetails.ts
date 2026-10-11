import { careerCatalog } from '@/data/catalog/careersAndInstitutions'
import { occupationCatalog } from '@/data/catalog/occupations'
export type IncomeRange = { average: number; min: number; max: number }
export type CareerFamily = {
  id: string
  name: string
  incomes: Record<
    'LIMA' | 'NACIONAL',
    { rank: number; rankTotal: number; young?: IncomeRange; adult?: IncomeRange }
  >
  source: string
}
export type CareerDetail = {
  id: string
  name: string
  familyId: string
  description: string
  durationYears: number
  institutionIds: string[]
  occupationIds: string[]
}
export type RiasecDimension = 'R' | 'I' | 'A' | 'S' | 'E' | 'C'
export type OccupationDetail = {
  contentStatus?: 'pending'
  id: string
  onetCode: string
  name: string
  whatTheyDo: string
  knowledge: string[]
  skills: string[]
  interestScores: Record<RiasecDimension, number>
  highPoints: RiasecDimension[]
  careerIds: string[]
}
export type InstitutionType = 'UNIVERSITARIA' | 'TECNICA' | 'FFAA_POLICIA'
export type InstitutionDetail = {
  id: string
  name: string
  type: InstitutionType
  management: 'PUBLICA' | 'PRIVADA'
  description: string
  address: string
  location: { department: string; province: string; district: string }
  website: string
  careerIds: string[]
}
export const dimensionNames: Record<RiasecDimension, string> = {
  R: 'Realista',
  I: 'Investigador',
  A: 'Artístico',
  S: 'Social',
  E: 'Emprendedor',
  C: 'Convencional',
}
export const institutionTypeNames: Record<InstitutionType, string> = {
  UNIVERSITARIA: 'Universitaria',
  TECNICA: 'Técnica',
  FFAA_POLICIA: 'Fuerzas Armadas y Policía',
}

// DEMOSTRACIÓN: familias, ingresos, afinidad, vínculos educativos y perfiles RIASEC.
// No es el clasificador validado del INEI ni información salarial o institucional oficial.
const careerOccupationIds: Record<string, string[]> = {
  'environmental-engineering': ['agricultural-engineer', 'geologist', 'data-analyst', 'drone-operator'],
  journalism: ['documentary-filmmaker', 'photographer', 'community-manager', 'translator'],
  nursing: ['paramedic'],
  'civil-engineering': ['architect', 'urban-planner', 'geologist', 'drone-operator'],
  'veterinary-medicine': ['agricultural-engineer'],
  psychology: ['psychologist', 'teacher', 'sociologist'],
}
export const careerFamilies: CareerFamily[] = careerCatalog.map((c, i) => ({
  id: `family-${c.id}`,
  name: c.area,
  incomes: {
    LIMA: {
      rank: i + 1,
      rankTotal: 6,
      young: { average: 2800 + i * 100, min: 1500, max: 4800 + i * 200 },
      adult: { average: 4200 + i * 150, min: 2400, max: 7200 + i * 200 },
    },
    NACIONAL: {
      rank: i + 1,
      rankTotal: 6,
      young: { average: 2500 + i * 100, min: 1300, max: 4300 + i * 200 },
      adult: { average: 3800 + i * 150, min: 2000, max: 6500 + i * 200 },
    },
  },
  source: '[Fuente de datos salariales]',
}))
const institutionBase: InstitutionDetail[] = [
  {
    id: 'demo-horizonte-public',
    name: 'Universidad Pública Horizonte',
    type: 'UNIVERSITARIA',
    management: 'PUBLICA',
    description:
      'Institución ficticia para explorar distintas rutas de formación. Todos sus datos son de demostración.',
    address: 'Av. de ejemplo 100 (dirección ficticia)',
    location: { department: 'Lima', province: 'Lima', district: 'Lima' },
    website: '',
    careerIds: ['environmental-engineering', 'nursing', 'civil-engineering', 'psychology'],
  },
  {
    id: 'demo-nuevos-caminos',
    name: 'Universidad Nuevos Caminos',
    type: 'UNIVERSITARIA',
    management: 'PRIVADA',
    description:
      'Universidad ficticia que ilustra cómo comparar alternativas de estudio. No representa una oferta educativa real.',
    address: 'Jr. de ejemplo 200 (dirección ficticia)',
    location: { department: 'Cusco', province: 'Cusco', district: 'Cusco' },
    website: '',
    careerIds: ['journalism', 'psychology', 'veterinary-medicine'],
  },
  {
    id: 'demo-technological-trails',
    name: 'Instituto Técnico Senderos',
    type: 'TECNICA',
    management: 'PRIVADA',
    description:
      'Instituto ficticio de formación práctica. Las carreras técnicas de este ejemplo se incorporarán después.',
    address: 'Calle de ejemplo 300 (dirección ficticia)',
    location: { department: 'Lima', province: 'Lima', district: 'Lima' },
    website: '',
    careerIds: [],
  },
  {
    id: 'demo-military-horizon',
    name: 'Escuela Militar del Horizonte',
    type: 'FFAA_POLICIA',
    management: 'PUBLICA',
    description:
      'Escuela ficticia para representar otra alternativa de formación. Su relación con carreras es solo de demostración.',
    address: 'Av. de ejemplo 400 (dirección ficticia)',
    location: { department: 'Arequipa', province: 'Arequipa', district: 'Arequipa' },
    website: '',
    careerIds: ['civil-engineering'],
  },
]
export const institutionDetails = institutionBase
export const careerDetails: CareerDetail[] = careerCatalog.map((c) => ({
  id: c.id,
  name: c.name,
  familyId: `family-${c.id}`,
  description: c.description,
  durationYears: 5,
  institutionIds: institutionDetails.filter((i) => i.careerIds.includes(c.id)).map((i) => i.id),
  occupationIds: careerOccupationIds[c.id] ?? [],
}))
const codes: RiasecDimension[][] = [
  ['R', 'I', 'C'],
  ['S', 'I', 'A'],
  ['A', 'E', 'S'],
  ['E', 'C', 'S'],
]
export const occupationDetails: OccupationDetail[] = occupationCatalog.map((o, index) => {
  if (o.contentStatus === 'pending')
    return {
      id: o.id,
      name: o.name,
      contentStatus: 'pending',
      onetCode: '',
      whatTheyDo: o.typicalWork,
      knowledge: ['[Conocimientos: por completar desde O*NET]'],
      skills: o.skills,
      interestScores: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 },
      highPoints: [],
      careerIds: [],
    }

  const highPoints: RiasecDimension[] = ['psychologist', 'teacher', 'paramedic', 'sociologist'].includes(o.id)
    ? ['S', 'I', 'A']
    : codes[index % codes.length]
  const interestScores = Object.fromEntries(
    (Object.keys(dimensionNames) as RiasecDimension[]).map((d) => [
      d,
      highPoints.includes(d) ? 90 - highPoints.indexOf(d) * 12 : 28,
    ]),
  ) as Record<RiasecDimension, number>
  return {
    id: o.id,
    name: o.name,
    onetCode: '',
    whatTheyDo: o.typicalWork,
    knowledge: [
      `Conocimientos sobre ${o.sector.toLocaleLowerCase()}`,
      'Comunicación y colaboración',
      'Herramientas de su ámbito de trabajo',
    ],
    skills: [...o.skills],
    highPoints,
    interestScores,
    careerIds: careerDetails.filter((c) => c.occupationIds.includes(o.id)).map((c) => c.id),
  }
})
