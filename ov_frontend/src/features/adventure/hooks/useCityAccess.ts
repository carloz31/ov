import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { modoApi } from '@/config/env'
import { useEstadoServidor } from '@/store/servidor/sesion'
import { actividadServidor, ciudadDisponible } from '@/lib/servidor/adaptadores'

import { actividadPorContenido } from '@/lib/servidor/contenidos'
import { idPuntoContenido } from '../lib/puntosServidor'
import { useDesafioServidor } from './useDesafioServidor'
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
  const ciudadAbierta = ciudadDisponible(servidor.actividades.datos)
  const permitido =
    ciudadAbierta &&
    servidor.actividades.datos?.some(
      (b) => b.codigo === 'CIUDAD' && b.actividades.some((a) => a.codigo === codigo),
    ) &&
    actividadApi &&
    actividadApi.visible &&
    actividadApi.estado !== 'BLOQUEADA' &&
    !!actividadPorContenido(servidor.actividades.datos, codigo)
  // Una batalla se abre por su tipo, sin exigir que la Ciudad esté abierta (F04).
  const desafio = useDesafioServidor(codigo)
  useEffect(() => {
    // Con la Ciudad cerrada no se toca la dirección: el mapa vuelve al Camino y Lumi explica qué falta. Si se
    // reescribiera aquí, este efecto (del padre) correría después y devolvería a la Ciudad.
    if (!modoApi || !params.has('actividad') || permitido || desafio || !ciudadAbierta) return
    const next = new URLSearchParams(params)
    const codigo = params.get('actividad') ?? ''
    next.delete('actividad')
    next.delete('revision')
    next.delete('modo')
    next.set('punto', actividadApi ? idPuntoContenido(actividadApi.contenido, codigo) : codigo)
    setParams(next, { replace: true })
  }, [params, setParams, permitido, actividadApi, desafio, ciudadAbierta])

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
    challenge: modoApi ? desafio?.challenge : canAccessCity(adventure) ? challenge : undefined,
    desafioServidor: desafio?.servidor,
    // Ajuste de F03: en api, reintentar una completada de la Ciudad la recorre desde el principio, con
    // «Anterior», como en el camino. En local no cambia.
    revision: modoApi && params.get('revision') === '1',
    // F03: un registro del servidor en la Ciudad (t-contraste) se abre con sus ítems, como en el camino.
    registro: modoApi && permitido && contenidoApi?.tipo === 'registro' ? codigo : undefined,
    activity: modoApi
      ? permitido && !esEncuentro && contenidoApi?.tipo !== 'registro'
        ? contenidoApi
        : undefined
      : !modoApi && canAccessCity(adventure) && activity && params.get('actividad') === activity.id
        ? activity
        : undefined,
  }
}
