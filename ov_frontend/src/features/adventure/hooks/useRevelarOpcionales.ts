import { useEffect } from 'react'
import { modoApi } from '@/config/env'
import { quitarPorRevelar } from '@/store/servidor/revelado'
import type { StudentMapPoint } from '../lib/mapPoints'

// Solo api: al volver al Camino, las opcionales recién desbloqueadas se revelan una por una con la
// animación de las misiones adicionales (punto y línea) y se desmarcan. Nada se guarda en el navegador.
export function useRevelarOpcionales({
  zone,
  points,
  enabled,
  onFrame,
}: {
  zone: 'missions' | 'central'
  points: StudentMapPoint[]
  enabled: boolean
  onFrame: (ids: string[]) => void
}) {
  const primera = points.find((p) => p.revealing)
  const id = primera?.specActivityId
  const origen = primera?.originId
  const camino = modoApi && zone === 'missions'
  const dibujables = points.filter((p) => p.additional).map((p) => p.specActivityId ?? '')
  const claveDibujables = dibujables.join('|')
  useEffect(() => {
    // Lo que el Camino no dibuja como opcional (una requerida, otra zona) no espera animación.
    if (camino) quitarPorRevelar((codigo) => !claveDibujables.split('|').includes(codigo))
  }, [camino, claveDibujables])
  useEffect(() => {
    if (!camino || !enabled || !id || !origen) return
    onFrame([origen, id])
    const espera = setTimeout(
      () => quitarPorRevelar((codigo) => codigo === id),
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 2700,
    )
    return () => clearTimeout(espera)
  }, [camino, enabled, id, origen, onFrame])
}
