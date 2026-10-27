import { useOccupationExplorationContext } from '@/context/occupationExplorationContext'
import { useDiscovery } from '@/store/discoveryStore'
import { createPlanFromCareer, getOrderedPlans } from '../lib/plans'

const LETRAS = 'ABC'

// Ajuste catalogo-datos-reales (F6b): la carrera frente a los planes del estudiante (los que la pantalla ya
// tiene): ya es un plan, hay espacio para armarlo o los tres están ocupados por otras carreras.
export function usePlanesCarrera(codigo: string, nombre: string) {
  const context = useOccupationExplorationContext(),
    discovery = useDiscovery()
  const planes = getOrderedPlans(context.decisionSheets, discovery.planOrder)
  const posicion = planes.findIndex((p) => p.sourceId === codigo)
  return {
    letra: posicion >= 0 ? LETRAS[posicion] : null,
    libres: 3 - planes.length,
    ocupados: planes.map((p, i) => ({ letra: LETRAS[i], nombre: p.name })),
    armar: () => createPlanFromCareer(nombre, codigo),
  }
}
