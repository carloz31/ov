import { ESTADOS_SECCION } from '@/lib/servidor/adaptadoresPlanes'
import type { EstadoSeccionPlan } from '@/types/servidor'

// F07a: el estado de una sección, siempre con la misma píldora (Bloqueada, Por empezar, En proceso, Lista).
export function PildoraEstado({ estado }: { estado: EstadoSeccionPlan }) {
  return (
    <span className="sx-p-pildora" data-estado={estado}>
      {ESTADOS_SECCION[estado]}
    </span>
  )
}
