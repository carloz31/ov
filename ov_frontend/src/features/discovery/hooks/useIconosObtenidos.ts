import { useEffect, useState } from 'react'
import { modoApi } from '@/config/env'
import { useOccupationExplorationContext } from '@/context/occupationExplorationContext'
import { ocupacionesObtenidas } from '@/lib/servidor/adaptadoresCasos'
import { consultarColeccion } from '@/store/servidor/casos'
import type { OcupacionColeccion } from '@/types/servidor'

// HU-055: ocupaciones cuyo ícono se obtuvo en la Central de Casos. En api, la colección del servidor, con
// cuántas son (ajuste catalogo-datos-reales: «N de M íconos revelados»).
export function useColeccionIconos() {
  const context = useOccupationExplorationContext()
  const [coleccion, setColeccion] = useState<OcupacionColeccion[] | null>(null)
  useEffect(() => {
    if (!modoApi) return
    let vigente = true
    void consultarColeccion().then((respuesta) => {
      if (vigente && respuesta.tipo === 'ok') setColeccion(respuesta.datos)
    })
    return () => {
      vigente = false
    }
  }, [])
  const obtenidas = ocupacionesObtenidas(coleccion)
  return {
    obtenido: (id: string) =>
      modoApi
        ? obtenidas.has(id)
        : context.profiles.some((p) => p.occupationId === id && p.discoveryState !== 'unused'),
    cantidad: coleccion === null ? null : obtenidas.size,
    coleccion,
  }
}

export function useIconosObtenidos() {
  return useColeccionIconos().obtenido
}
