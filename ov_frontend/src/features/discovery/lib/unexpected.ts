import type { CatalogVisit } from '@/types/discovery'
import type { CareerDetail, OccupationDetail } from './catalogDetails'

export function chooseUnexpected({
  kind,
  currentId,
  careers,
  occupations,
  visits,
  excluded,
  random = Math.random,
}: {
  kind: 'career' | 'occupation'
  currentId: string
  careers: CareerDetail[]
  occupations: OccupationDetail[]
  visits: CatalogVisit[]
  excluded: string[]
  random?: () => number
}): { id: string; revisiting: boolean } | undefined {
  const type = kind === 'career' ? 'VISTA_CARRERA' : 'VISTA_OCUPACION'
  const exploredFamilies = new Set(
    visits
      .filter((v) => v.tipo === 'VISTA_CARRERA')
      .flatMap((v) => careers.filter((c) => c.id === v.referencia).map((c) => c.familyId)),
  )
  const candidates = (kind === 'career' ? careers : occupations).filter(
    (c) => c.id !== currentId && !excluded.includes(c.id),
  )
  const seen = new Set(visits.filter((v) => v.tipo === type).map((v) => v.referencia))
  const unseen = candidates.filter((c) => !seen.has(c.id))
  const preferred = unseen.filter((c) =>
    kind === 'career'
      ? !exploredFamilies.has((c as CareerDetail).familyId)
      : (c as OccupationDetail).careerIds.some((id) =>
          careers.some((career) => career.id === id && !exploredFamilies.has(career.familyId)),
        ),
  )
  const pool = preferred.length ? preferred : unseen
  if (pool.length)
    return { id: pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))].id, revisiting: false }
  const lastSeen = (id: string) =>
    Math.max(
      0,
      ...visits.filter((v) => v.tipo === type && v.referencia === id).map((v) => Date.parse(v.fechaHora)),
    )
  const oldest = [...candidates].sort((a, b) => lastSeen(a.id) - lastSeen(b.id))[0]
  return oldest
    ? {
        id: oldest.id,
        revisiting: (kind === 'career' ? careers : occupations).every(
          (c) => c.id === currentId || seen.has(c.id),
        ),
      }
    : undefined
}
