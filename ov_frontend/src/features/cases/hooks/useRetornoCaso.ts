import { useLocation } from 'react-router'
import { modoApi } from '@/config/env'
import { appPaths } from '@/routes/paths'
import { useEstadoServidor } from '@/store/servidor/sesion'

// El mapa que abrió el caso viaja en el `state` de la navegación (drawer → intro → Central).
type OrigenCaso = 'camino' | 'ciudad'

// Ajustes Central (5): se vuelve al mapa desde el que se abrió el caso. Sin `state` (URL directa),
// el de su bloque, como `useVolverAlMapa`. En local, la Ciudad, como antes.
export function useRetornoCaso(actividad?: string) {
  const location = useLocation()
  const servidor = useEstadoServidor()
  const desde = (location.state as { desde?: OrigenCaso } | null)?.desde
  const enCamino = servidor.actividades.datos?.some(
    (b) => b.espacio === 'MISIONES_CAMPO' && b.actividades.some((a) => a.codigo === actividad),
  )
  const origen: OrigenCaso = desde ?? (enCamino ? 'camino' : 'ciudad')
  if (!modoApi) return { origen, etiqueta: 'Volver a la ciudad', ruta: appPaths.student.exploration }
  return origen === 'camino'
    ? { origen, etiqueta: 'Volver al mapa', ruta: appPaths.student.missions }
    : { origen, etiqueta: 'Volver a la Ciudad', ruta: appPaths.student.exploration }
}
