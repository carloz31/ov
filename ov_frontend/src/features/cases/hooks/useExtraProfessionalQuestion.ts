import { useState } from 'react'
import { occupationCatalog } from '@/data/catalog/occupations'
import type { Occupation } from '@/types/catalog'
const FOREST_FIRE_ROLE_OCCUPATION_IDS = new Set([
  'firefighter',
  'meteorologist',
  'municipal-police',
  'paramedic',
  'medical-specialist',
  'veterinarian',
  'biologist',
  'environmental-engineer',
  'civil-engineer',
  'machinery-operator',
  'social-worker',
  'journalist',
])
const forestFireReflectionOccupations = occupationCatalog.filter(
  (occupation) => !FOREST_FIRE_ROLE_OCCUPATION_IDS.has(occupation.id),
)
export function useExtraProfessionalQuestion(selectedProfessionalId: string) {
  const [search, setSearch] = useState('')
  const [detailOccupation, setDetailOccupation] = useState<Occupation>()
  const normalizedSearch = search.trim().toLocaleLowerCase('es')
  const filteredOccupations = forestFireReflectionOccupations.filter(
    (occupation) =>
      !normalizedSearch ||
      [
        occupation.name,
        occupation.sector,
        occupation.shortDescription,
        occupation.contextualDescription,
        ...occupation.skills,
      ].some((value) => value.toLocaleLowerCase('es').includes(normalizedSearch)),
  )
  const selectedOccupation = occupationCatalog.find((occupation) => occupation.id === selectedProfessionalId)

  return { search, setSearch, detailOccupation, setDetailOccupation, filteredOccupations, selectedOccupation }
}
