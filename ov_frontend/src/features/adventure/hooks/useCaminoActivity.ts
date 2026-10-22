import { modoApi } from '@/config/env'
import { activityById } from '@/data/activities/content'
import { actividadPorContenido, plantillaCuestionario } from '@/lib/servidor/contenidos'
import { useEstadoServidor } from '@/store/servidor/sesion'

export function useCaminoActivity(codigo: string) {
  const servidor = useEstadoServidor()
  const activity = modoApi ? actividadPorContenido(servidor.actividades.datos, codigo) : activityById(codigo)
  // Un cuestionario del servidor se responde con el reproductor de encuentros, como en la ciudad.
  return {
    activity,
    cuestionario: modoApi && !!activity && !!plantillaCuestionario(activity),
    // F01: un registro del servidor se abre con sus ítems y lo guardado.
    registro: modoApi && activity?.tipo === 'registro',
  }
}
