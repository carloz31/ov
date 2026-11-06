import hiddenPlaza from './plataforma/hidden-plaza.json'
import scholarshipMystery from './plataforma/scholarship-mystery.json'
import harvestRace from './plataforma/harvest-race.json'
import thousandVoicesFestival from './plataforma/thousand-voices-festival.json'
import impossibleTeamsTournament from './plataforma/impossible-teams-tournament.json'
import silentLagoon from './plataforma/silent-lagoon.json'
import type { CasoJson } from '@/types/cases'

// Ajuste carga-casos: los casos de la Central como JSON, por su `id` (el `caso` que nombra la actividad CASO).
// Un caso nuevo se agrega aquí con un import explícito.
export const casos: Record<string, CasoJson> = Object.fromEntries(
  [
    hiddenPlaza,
    scholarshipMystery,
    harvestRace,
    thousandVoicesFestival,
    impossibleTeamsTournament,
    silentLagoon,
  ].map((caso) => [caso.id, caso]),
)

export function casoPorId(id: string): CasoJson | undefined {
  return Object.hasOwn(casos, id) ? casos[id] : undefined
}
