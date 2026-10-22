import { useNavigate } from 'react-router'
import { modoApi } from '@/config/env'
import { useEstadoServidor } from '@/store/servidor/sesion'
import { appPaths } from '@/routes/paths'

// En api se vuelve al mapa de la actividad: el Camino para sus bloques, la Ciudad para los suyos.
// (Ir siempre a la Ciudad, cerrada, abría la ayuda de «la ciudad todavía no abre sus puertas».)
export function useVolverAlMapa(actividad: string) {
  const servidor = useEstadoServidor()
  const navigate = useNavigate()
  return () =>
    navigate(
      modoApi &&
        servidor.actividades.datos?.some(
          (b) => b.espacio === 'MISIONES_CAMPO' && b.actividades.some((a) => a.codigo === actividad),
        )
        ? appPaths.student.missions
        : appPaths.student.exploration,
    )
}
