import { useEffect, useState } from 'react'
import { modoApi } from '@/config/env'
import { actividadDeCaso } from '@/lib/servidor/contenidos'
import { estadoCaso } from '@/lib/servidor/adaptadoresCasos'
import { consultarCasos } from '@/store/servidor/casos'
import { mensajeErrorServidor, useEstadoServidor } from '@/store/servidor/sesion'
import { canAccessCity, useAdventure } from '@/store/adventureStore'
import type { CasoCuenta } from '@/types/servidor'

// F04: el caso del front que juega una actividad CASO del servidor. En api, el acceso lo decide esa
// actividad (no la Ciudad) y la intro muestra intentos y mejor puntaje; en local, como antes.
// Ajuste carga-casos: también el `CasoCuenta` (título y escala del caso), o el error si no se pudo leer.
export function useCasoServidor(casoId: string) {
  const servidor = useEstadoServidor()
  const adventure = useAdventure()
  const actividad = modoApi ? actividadDeCaso(servidor.actividades.datos, casoId) : undefined
  const [caso, setCaso] = useState<CasoCuenta>()
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)
  useEffect(() => {
    if (!actividad) return
    let vigente = true
    setError('')
    void consultarCasos().then((respuesta) => {
      if (!vigente) return
      if (respuesta.tipo !== 'ok') setError(mensajeErrorServidor(respuesta))
      else {
        const fila = respuesta.datos.find((c) => c.actividad === actividad)
        if (fila) setCaso(fila)
        else setError('No se encontró el caso.')
      }
    })
    return () => {
      vigente = false
    }
  }, [actividad, intento])
  const acceso: 'cargando' | 'permitido' | 'denegado' = !modoApi
    ? canAccessCity(adventure)
      ? 'permitido'
      : 'denegado'
    : servidor.actividades.estado !== 'listo' && !servidor.actividades.datos
      ? 'cargando'
      : actividad
        ? 'permitido'
        : 'denegado'
  return {
    acceso,
    actividad,
    intentos: estadoCaso(caso).intentos,
    cuenta: caso,
    error,
    reintentar: () => setIntento((n) => n + 1),
  }
}
