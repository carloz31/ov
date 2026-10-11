import type { HelenaPageState, HelenaResult, HelenaPage } from '@/types/profile'
export type { HelenaPageState, HelenaResult, HelenaPage } from '@/types/profile'
import { catalog, tipActivityIds } from '@/data/activities/content'
import { calculateResult } from '@/lib/activities/logic'
import type { JourneyState } from '@/types/activities'
import type { InstrumentPageId, StudentDiscoveryState } from '@/types/discovery'
import { descripcionesLocales, descripcionesInteligenciasDemo } from '../data/dimensionExamples'
export function getHelenaPagesApi(intereses: HelenaPage, reveladas: InstrumentPageId[]): HelenaPage[] {
  // Se conservan los ejemplos de los otros instrumentos; sus misiones aún no existen en la API.
  const ejemplos: HelenaPage[] = [
    {
      id: 'inteligencias',
      numeral: 'II',
      title: 'Tus formas de ser inteligente',
      subtitle: 'Tus inteligencias',
      required: false,
      state: getHelenaPageState(true, reveladas.includes('inteligencias')),
      missions: { done: 1, total: 1 },
      teaser: 'Esta página guarda formas de aprender y resolver.',
      demo: true,
      result: reveladas.includes('inteligencias') ? demoIntelligences : undefined,
    },
    {
      id: 'habilidades',
      numeral: 'III',
      title: 'Cómo te relacionas',
      subtitle: 'Tus habilidades sociales',
      required: true,
      state: 'sealed',
      missions: { done: 2, total: 4 },
      teaser: 'Esta página aún guarda algo sobre cómo te relacionas con los demás.',
      demo: true,
    },
  ]
  return [intereses, ...ejemplos]
}
export function getHelenaPageState(complete: boolean, revealed: boolean): HelenaPageState {
  return !complete ? 'sealed' : revealed ? 'revealed' : 'ready'
}

// Demostraciones: se reemplazan cuando existan las 14 interacciones y los instrumentos completos.
// DATO DE PRUEBA: Intereses de ejemplo de Helena; los reemplazarán resultados del servidor.
export const demoInterests: HelenaResult = {
  source: 'demo',
  // DATO DE PRUEBA: perfil completo del ejemplo; S/I/A conservan sus valores anteriores.
  dimensiones: [
    ['R', 'Realista', 50],
    ['I', 'Investigador', 72],
    ['A', 'Artístico', 66],
    ['S', 'Social', 78],
    ['E', 'Emprendedor', 45],
    ['C', 'Convencional', 35],
  ].map(([code, name, score]) => ({
    code: String(code),
    name: String(name),
    score: Number(score),
    description: descripcionesLocales[String(code)],
  })),
  areas: [
    {
      code: 'S',
      name: 'Social',
      score: 78,
      description: descripcionesLocales.S,
    },
    {
      code: 'I',
      name: 'Investigador',
      score: 72,
      description: descripcionesLocales.I,
    },
    {
      code: 'A',
      name: 'Artístico',
      score: 66,
      description: descripcionesLocales.A,
    },
  ],
}
const demoIntelligences: HelenaResult = {
  source: 'demo',
  // DATO DE PRUEBA: siete dimensiones de F4, en el orden del instrumento TEST-INT.
  dimensiones: [
    ['INT-LIN', 'Lingüística', 75],
    ['INT-LOG', 'Lógico-matemática', 43],
    ['INT-ESP', 'Espacial', 50],
    ['INT-CIN', 'Cinestésico-corporal', 40],
    ['INT-MUS', 'Musical', 50],
    ['INT-INTER', 'Interpersonal', 75],
    ['INT-INTRA', 'Intrapersonal', 63],
  ].map(([code, name, score]) => ({
    code: String(code),
    name: String(name),
    score: Number(score),
    description: descripcionesInteligenciasDemo[String(code)],
  })),
  areas: [
    {
      code: 'L',
      name: 'Lingüística',
      score: 75,
      description: 'Explorar ideas mediante palabras, relatos y conversaciones.',
    },
    {
      code: 'P',
      name: 'Interpersonal',
      score: 75,
      description: 'Aprender con otras personas y comprender sus puntos de vista.',
    },
  ],
}
export function getHelenaPages(journey: JourneyState, discovery: StudentDiscoveryState): HelenaPage[] {
  const done = tipActivityIds.filter((id) => journey.progress[id]?.estado === 'completada').length
  const instrument = catalog.instrumentos.find((i) => i.id === 'tip')
  const validReal = (candidate: (typeof journey.results)[number] | undefined) =>
    !!instrument &&
    !!candidate &&
    done === 14 &&
    instrument.clave.dimensiones.length > 0 &&
    candidate.puntajes.length === instrument.clave.dimensiones.length &&
    new Set(candidate.puntajes.map((score) => score.dimensionId)).size === candidate.puntajes.length &&
    candidate.puntajes.every(
      (score) =>
        Number.isFinite(score.puntaje) &&
        instrument.clave.dimensiones.some(
          (dimension) => dimension.id === score.dimensionId && !dimension.nombre.includes('['),
        ),
    )
  const stored = journey.results.find((result) => result.instrumentoId === 'tip' && validReal(result))
  const calculated = stored
    ? undefined
    : instrument
      ? calculateResult(instrument, journey, tipActivityIds)
      : undefined
  const raw = stored ?? (validReal(calculated) ? calculated : undefined)
  const valid = !!raw
  const real: HelenaResult | undefined = valid
    ? {
        source: 'real',
        dimensiones: raw!.puntajes.map((s) => ({
          code: s.dimensionId,
          name: instrument!.clave.dimensiones.find((d) => d.id === s.dimensionId)!.nombre,
          score: s.puntaje,
          description: descripcionesLocales[s.dimensionId],
        })),
        areas: raw!.puntajes
          .map((s) => {
            const name = instrument!.clave.dimensiones.find((d) => d.id === s.dimensionId)!.nombre
            return {
              code: name[0],
              name,
              score: s.puntaje,
              description: descripcionesLocales[s.dimensionId],
            }
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 3),
      }
    : undefined
  const result = real ?? demoInterests
  const firstComplete = journey.progress['act-tip-01']?.estado === 'completada'
  const pages = [
    {
      id: 'intereses' as const,
      numeral: 'I' as const,
      title: 'Lo que te atrae hacer',
      subtitle: 'Tus intereses',
      required: true,
      missions: { done, total: 14 },
      complete: !!real || firstComplete,
      demo: !real,
      result,
      teaser: 'Esta página aún guarda pistas sobre lo que te atrae hacer.',
      activityHref: '/student/exploration?actividad=act-tip-01',
    },
    {
      id: 'inteligencias' as const,
      numeral: 'II' as const,
      title: 'Tus formas de ser inteligente',
      subtitle: 'Tus inteligencias',
      required: false,
      missions: { done: 1, total: 1 },
      complete: true,
      demo: true,
      result: demoIntelligences,
      teaser: 'Esta página guarda formas de aprender y resolver.',
    },
    {
      id: 'habilidades' as const,
      numeral: 'III' as const,
      title: 'Cómo te relacionas',
      subtitle: 'Tus habilidades sociales',
      required: true,
      missions: { done: 2, total: 4 },
      complete: false,
      demo: true,
      result: {
        source: 'demo' as const,
        areas: [
          {
            code: 'E',
            name: 'Escucha',
            score: 65,
            description: 'Encontrar espacio para la mirada de otras personas.',
          },
        ],
      },
      teaser: 'Esta página aún guarda algo sobre cómo te relacionas con los demás.',
    },
  ]
  return pages.map(({ complete, ...p }) => {
    const state = getHelenaPageState(complete, discovery.revealedPages.includes(p.id))
    return { ...p, state, result: state === 'revealed' ? p.result : undefined }
  })
}
