import { modoApi } from '@/config/env'
import { activityById } from '@/data/activities/content'
import { actividadPorContenido } from '@/lib/servidor/contenidos'
import { useEstadoServidor } from '@/store/servidor/sesion'

export function useCaminoActivity(codigo: string) {
  const servidor = useEstadoServidor()
  return modoApi ? actividadPorContenido(servidor.actividades.datos, codigo) : activityById(codigo)
}
