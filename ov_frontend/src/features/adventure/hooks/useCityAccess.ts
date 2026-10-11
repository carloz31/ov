import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { modoApi } from '@/config/env'
import { useEstadoServidor } from '@/store/servidor/sesion'
import { actividadServidor, ciudadDisponible } from '@/lib/servidor/adaptadores'

import { actividadPorContenido } from '@/lib/servidor/contenidos'
import { idPuntoContenido } from '../lib/puntosServidor'
import { challenges } from '@/data/content/challenges'

import { activityById } from '@/data/activities/content'

import { useJourney } from '@/store/journeyStore'
import { canAccessCity, useAdventure } from '@/store/adventureStore'

export function useCityAccess() {
  const servidor = useEstadoServidor()
  const adventure = useAdventure()
  const journey = useJourney()
  const [params, setParams] = useSearchParams()
  const codigo = params.get('actividad') ?? ''
  const actividadApi = actividadServidor(servidor.actividades.datos, codigo)
  const contenidoApi = actividadPorContenido(servidor.actividades.datos, codigo)
  const esEncuentro = contenidoApi?.nodos.some((n) => n.tipo === 'item' || n.tipo === 'resultado')
  const permitido =
    ciudadDisponible(servidor.actividades.datos) &&
    servidor.actividades.datos?.some(
      (b) => b.codigo === 'CIUDAD' && b.actividades.some((a) => a.codigo === codigo),
    ) &&
    actividadApi &&
    actividadApi.visible &&
    actividadApi.estado !== 'BLOQUEADA' &&
    !!actividadPorContenido(servidor.actividades.datos, codigo)
  useEffect(() => {
    if (!modoApi || !params.has('actividad') || permitido) return
    const next = new URLSearchParams(params)
    const codigo = params.get('actividad') ?? ''
    next.delete('actividad')
    next.delete('revision')
    next.delete('modo')
    next.set('punto', actividadApi ? idPuntoContenido(actividadApi.contenido, codigo) : codigo)
    setParams(next, { replace: true })
  }, [params, setParams, permitido, actividadApi])

  const challenge = challenges.find((c) => c.id === params.get('actividad'))
  const activity = activityById('act-tip-01')
  return {
    adventure,
    journey,
    params,
    setParams,
    interaccion:
      modoApi && permitido && esEncuentro
        ? { codigo, clave: `${servidor.resumen.datos?.cuenta.codigo}/${codigo}/${params.get('revision')}` }
        : undefined,
    challenge: !modoApi && canAccessCity(adventure) ? challenge : undefined,
    activity: modoApi
      ? permitido && !esEncuentro
        ? contenidoApi
        : undefined
      : !modoApi && canAccessCity(adventure) && activity && params.get('actividad') === activity.id
        ? activity
        : undefined,
  }
}
