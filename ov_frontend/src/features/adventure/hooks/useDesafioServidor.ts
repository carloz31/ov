import { modoApi } from '@/config/env'
import { challenges } from '@/data/content/challenges'
import { escenarioDeActividad, reproductorPorTipo } from '@/lib/servidor/contenidos'
import { fondoEscenario } from '@/lib/activities/escenario'
import { useEstadoServidor } from '@/store/servidor/sesion'

// F04: una BATALLA del servidor abre el reproductor de desafíos desde cualquier pantalla del mapa.
export function useDesafioServidor(codigo: string) {
  const servidor = useEstadoServidor()
  const reproductor = modoApi ? reproductorPorTipo(servidor.actividades.datos, codigo) : undefined
  if (reproductor?.tipo !== 'desafio') return undefined
  const challenge = challenges.find((c) => c.id === reproductor.desafio)
  return challenge
    ? {
        challenge,
        servidor: { actividad: reproductor.actividad },
        imageUrl: fondoEscenario(escenarioDeActividad(servidor.actividades.datos, codigo)),
      }
    : undefined
}
