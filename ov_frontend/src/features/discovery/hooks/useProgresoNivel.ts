import { useEffect, useState } from 'react'
import { modoApi } from '@/config/env'
import { condicionesObjetivo } from '@/lib/servidor/adaptadores'
import { consultarProgreso } from '@/store/servidor/consultas'
import { useEstadoServidor } from '@/store/servidor/sesion'
import type { CondicionesPasaporte } from '@/types/profile'

// Ajuste pasaporte-perfil: las condiciones del siguiente título (`/progreso/NIVEL/N{n}`). En local, una sola
// condición con el texto del nivel actual. `null` mientras consulta, si falla o si no hay siguiente.
export function useProgresoNivel(numero: number | undefined, textoLocal = ''): CondicionesPasaporte | null {
  const logros = useEstadoServidor().logros.datos
  const [condiciones, setCondiciones] = useState<CondicionesPasaporte | null>(null)
  useEffect(() => {
    if (!modoApi || numero === undefined) return
    let vigente = true
    setCondiciones(null)
    void consultarProgreso('NIVEL', `N${numero}`).then((r) => {
      if (vigente) setCondiciones(r.tipo === 'ok' ? condicionesObjetivo(r.datos) : null)
    })
    return () => {
      vigente = false
    }
  }, [numero, logros])
  if (numero === undefined) return null
  return modoApi ? condiciones : { bloques: [[{ texto: textoLocal, cumplida: false }]], cumplidas: 0, total: 1, mejor: 0 }
}
