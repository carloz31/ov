import { progresoBloque } from '@/lib/servidor/contenidos'
import { useEffect, useState } from 'react'
import { modoApi } from '@/config/env'
import { mensajeErrorServidor, obtenerEstadoServidor, useEstadoServidor } from '@/store/servidor/sesion'
import { consultarProgreso } from '@/store/servidor/consultas'
import { useRevisionAcciones } from '@/store/servidor/refresco'
import { textoRequisito } from '@/lib/servidor/adaptadores'

import { fieldMissions } from '@/data/content/adventure'
import type { AdventureState } from '@/types/adventure'

export function useCityRequirement(adventure: AdventureState) {
  const servidor = useEstadoServidor()
  // Auditoría plataforma (F2b): el conteo «actual de requerido» cambia con los eventos de cada acción, refresque o no
  // el camino; se vuelve a pedir con la revisión de acciones, no con cada recarga de actividades.
  const revisionAcciones = useRevisionAcciones()
  const [requisito, setRequisito] = useState('Consultando el requisito en el servidor…')
  const [error, setError] = useState(false)
  const [intento, setIntento] = useState(0)
  useEffect(() => {
    if (!modoApi) return
    let vigente = true
    setRequisito('Consultando el requisito en el servidor…')
    setError(false)
    void consultarProgreso('BLOQUE', 'CIUDAD').then((r) => {
      if (!vigente) return
      setError(r.tipo !== 'ok')
      setRequisito(
        r.tipo === 'ok' ? textoRequisito(r.datos, obtenerEstadoServidor().actividades.datos) : mensajeErrorServidor(r),
      )
    })
    return () => {
      vigente = false
    }
  }, [revisionAcciones, intento])
  return {
    requisito,
    error,
    setIntento,
    mostrarRequisito: modoApi,
    progreso: modoApi
      ? progresoBloque(servidor.actividades.datos).porcentaje
      : (fieldMissions.filter((item) => adventure.completedMissionIds.includes(item.id)).length /
          fieldMissions.length) *
        100,
  }
}
