import { useState } from 'react'
import { useNavigate } from 'react-router'
import { appPaths } from '@/routes/paths'
import type { FichaCuenta } from '@/types/servidor'
import type { Actividad } from '@/types/activities'
import { useParentPortalContext } from '../context/parentPortalContext'
import { useFichaApoderadoAbierta } from './useFichaApoderadoAbierta'

export type EstadoFilaActividad = 'completada' | 'disponible' | 'bloqueada'
export type FilaActividadServidor = {
  actividad: Actividad
  estado: EstadoFilaActividad
  // «Se abre después de la anterior» o el mensaje del servidor.
  bloqueo: string | null
  // Obtenidas (chips) y cuántas da al completarla (chip punteado).
  fichas: FichaCuenta[]
  porObtener: number
}

// F08 (A7): Mis actividades del apoderado en api: avance, diploma, filas con sus fichas y el modal de ficha con su
// contenido bajo demanda. «Comenzar/Repasar» queda ocupado hasta abrir la actividad.
export function useMisActividadesServidor() {
  const portal = useParentPortalContext()
  const navigate = useNavigate()
  const { fichas, ...ficha } = useFichaApoderadoAbierta()
  const [abriendo, setAbriendo] = useState<string | null>(null)
  const filas: FilaActividadServidor[] = portal.activities.map((actividad) => {
    const completada = portal.completedActivityIds.includes(actividad.id)
    const propias = fichas.filter((f) => f.actividad?.codigo === actividad.id)
    return {
      actividad,
      estado: completada ? 'completada' : portal.available(actividad) ? 'disponible' : 'bloqueada',
      bloqueo: portal.motivoBloqueo(actividad) ?? 'Se abre después de la anterior',
      fichas: propias.filter((f) => f.estado === 'DISPONIBLE'),
      porObtener: completada ? 0 : propias.filter((f) => f.estado === 'BLOQUEADA').length,
    }
  })
  return {
    filas,
    avance: portal.familia?.avance ?? null,
    diploma: portal.familia?.diploma ?? null,
    abriendo,
    comenzar: (fila: FilaActividadServidor) => {
      setAbriendo(fila.actividad.id)
      navigate(
        `${appPaths.parent.activity(fila.actividad.id)}${fila.estado === 'completada' ? '?repasar=1' : ''}`,
      )
    },
    verDiploma: () => navigate(appPaths.parent.diploma),
    ...ficha,
  }
}
