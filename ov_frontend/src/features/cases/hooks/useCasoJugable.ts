import { useMemo } from 'react'
import { modoApi } from '@/config/env'
import { casoPorId } from '@/data/cases/casos'
import { casoDesdeJson } from '@/features/cases/lib/casoDesdeJson'
import { getExplorationImagePath } from '@/lib/explorationAssets'
import { cargarOcupacionesCaso, useOcupacionesCaso } from '@/store/servidor/casos'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import type { CasoJugable } from '@/types/cases'
import { useCasoServidor } from './useCasoServidor'

// Ajuste carga-casos: el caso que abre la Central. En api, el JSON del registro (por el id de la ruta) con el título
// y la escala de su actividad y las ocupaciones del directorio, pedidas una sola vez al entrar; sin esa respuesta,
// el caso no se muestra (`estado` cargando o error). En local, el incendio forestal, como antes (`caso` sin valor).
export function useCasoJugable(casoId: string) {
  const servidor = useCasoServidor(casoId)
  const json = modoApi && servidor.actividad ? casoPorId(casoId) : undefined
  const codigos = useMemo(() => json?.profesionales.map((p) => p.onet), [json])
  const directorio = useOcupacionesCaso(codigos)
  const cuenta = servidor.cuenta
  const caso = useMemo<CasoJugable | undefined>(
    () =>
      json && cuenta && directorio?.datos
        ? casoDesdeJson(
            json,
            { titulo: cuenta.titulo, minimo: cuenta.puntaje_minimo, maximo: cuenta.puntaje_maximo },
            directorio.datos,
            getExplorationImagePath,
          )
        : undefined,
    [json, cuenta, directorio?.datos],
  )
  // En local solo existe el incendio; en api, cualquier caso del registro que juegue una actividad.
  const existe = modoApi ? !!json : casoId === 'forest-fire'
  const error =
    servidor.error || (directorio?.estado === 'error' ? mensajeErrorServidor(directorio.error) : '')
  const estado: 'listo' | 'cargando' | 'error' = !modoApi || caso ? 'listo' : error ? 'error' : 'cargando'
  return {
    acceso: servidor.acceso,
    actividad: servidor.actividad,
    intentos: servidor.intentos,
    existe,
    caso,
    estado,
    error,
    reintentar: () => {
      if (servidor.error) servidor.reintentar()
      if (codigos && directorio?.estado === 'error') cargarOcupacionesCaso(codigos, true)
    },
  }
}
