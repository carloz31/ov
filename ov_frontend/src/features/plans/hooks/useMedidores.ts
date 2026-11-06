import { useState } from 'react'
import { fijarMedidores } from '@/store/servidor/planes'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import type { ErrorServidor, Medidores, PlanCarrera } from '@/types/servidor'
import type { AvisoPlan } from './useAccionesPlanes'

// F07b (§10): «Cómo me siento». Cada clic envía `medidores` con los tres valores (el nuevo y los dos actuales),
// sin «Guardar»; el botón pulsado queda ocupado hasta la respuesta. Solo un error deja aviso.
export function useMedidores(plan: PlanCarrera | null, avisar: (a: Omit<AvisoPlan, 'id'>) => void) {
  const [ocupado, setOcupado] = useState<{ codigo: keyof Medidores; valor: number } | null>(null)

  async function fijar(codigo: keyof Medidores, valor: number) {
    if (!plan || ocupado) return
    setOcupado({ codigo, valor })
    const respuesta = await fijarMedidores(plan.carrera.codigo, { ...plan.medidores, [codigo]: valor })
    setOcupado(null)
    if (respuesta.tipo !== 'ok' && respuesta.tipo !== 'guardado_sin_refrescar')
      avisar({
        titulo: 'No se pudo guardar',
        descripcion: mensajeErrorServidor(respuesta as ErrorServidor),
        error: true,
      })
  }

  return { ocupado, fijar }
}
