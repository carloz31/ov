import { progresoBloque } from '@/lib/servidor/contenidos'
import { useEffect, useState } from 'react'
import { modoApi } from '@/config/env'
import { useEstadoServidor, mensajeErrorServidor } from '@/store/servidor/sesion'
import { consultarProgreso } from '@/store/servidor/consultas'
import { textoRequisito } from '@/lib/servidor/adaptadores'

import { fieldMissions } from '@/data/content/adventure'
import type { AdventureState } from '@/types/adventure'

export function useCityRequirement(adventure: AdventureState) {
  const servidor = useEstadoServidor()
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
        r.tipo === 'ok' ? textoRequisito(r.datos, servidor.actividades.datos) : mensajeErrorServidor(r),
      )
    })
    return () => {
      vigente = false
    }
  }, [servidor.actividades.datos, intento])
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
