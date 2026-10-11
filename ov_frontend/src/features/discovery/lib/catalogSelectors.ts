import type { InstrumentPageId } from '@/types/discovery'
import { careerDetails, occupationDetails, institutionDetails, careerFamilies } from './catalogDetails'
import { coincidenciasRiasec, textoAjuste } from '@/lib/servidor/adaptadores'
import type { ResultadoPublico } from '@/types/servidor'
export const getCareer = (id: string) => careerDetails.find((c) => c.id === id)
export const getOccupation = (id: string) => occupationDetails.find((o) => o.id === id)
export const getInstitution = (id: string) => institutionDetails.find((i) => i.id === id)
export const getFamily = (id: string) => careerFamilies.find((f) => f.id === id)
export const careersOfOccupation = (id: string) =>
  careerDetails.filter((c) => getOccupation(id)?.careerIds.includes(c.id))
export const occupationsOfCareer = (id: string) =>
  occupationDetails.filter((o) => getCareer(id)?.occupationIds.includes(o.id))
export const institutionsOfCareer = (id: string) =>
  institutionDetails.filter((i) => getCareer(id)?.institutionIds.includes(i.id))
export const careersOfInstitution = (id: string) =>
  careerDetails.filter((c) => getInstitution(id)?.careerIds.includes(c.id))
// Tabla de afinidad de demostración: no evalúa las respuestas del estudiante.
const demoAffinity: Record<string, 'Gran ajuste' | 'Buen ajuste'> = {
  psychologist: 'Gran ajuste',
  teacher: 'Gran ajuste',
  paramedic: 'Gran ajuste',
  sociologist: 'Buen ajuste',
  'documentary-filmmaker': 'Buen ajuste',
  'community-manager': 'Buen ajuste',
  photographer: 'Buen ajuste',
}
export const isAffine = (
  id: string,
  revealedPages: InstrumentPageId[],
  resultadoServidor?: { resultado: ResultadoPublico | null; revelado: boolean },
) => {
  if (resultadoServidor) {
    const coincidencia = resultadoServidor.revelado
      ? coincidenciasRiasec(resultadoServidor.resultado).find((c) => c.codigo === id)
      : undefined
    return coincidencia ? textoAjuste(coincidencia.ajuste) : undefined
  }
  return revealedPages.includes('intereses') && getOccupation(id)?.contentStatus !== 'pending'
    ? demoAffinity[id]
    : undefined
}
export function matchesName(name: string, query: string) {
  const normalizedQuery = normalizeSearchText(query.trim())
  return normalizedQuery.length === 0 || normalizeSearchText(name).includes(normalizedQuery)
}
export function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
}
