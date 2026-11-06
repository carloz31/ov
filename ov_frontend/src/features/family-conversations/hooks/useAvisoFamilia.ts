import { useState } from 'react'
import { useLocation } from 'react-router'
import type { AvisoFamilia, EstadoNavegacionFamilia } from '../types'

// F08: el aviso de Familia; el inicial es el que dejó la navegación (guardar la carta vuelve a la lista).
export function useAvisoFamilia() {
  const inicial = (useLocation().state as EstadoNavegacionFamilia | null)?.aviso
  const [aviso, setAviso] = useState<AvisoFamilia | null>(() => (inicial ? { ...inicial, id: 0 } : null))
  return {
    aviso,
    avisar: (a: Omit<AvisoFamilia, 'id'>) => setAviso({ ...a, id: Date.now() }),
    cerrarAviso: () => setAviso(null),
  }
}
