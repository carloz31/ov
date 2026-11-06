import { textoTipoPaso } from '@/lib/servidor/adaptadoresPlanes'
import type { OpcionesTarjeta } from '@/types/servidor'

// F07b (lienzo de la sección 4): el tipo de un paso o una sugerencia, como insignia.
export function InsigniaPaso({ tipo, opciones }: { tipo: string; opciones: OpcionesTarjeta }) {
  return <span className="sx-p-tipo">{textoTipoPaso(tipo, opciones)}</span>
}
