import { useState } from 'react'
import { useNavigate } from 'react-router'
import { modoApi } from '@/config/env'
import { useOccupationExplorationContext } from '@/context/occupationExplorationContext'
import { getDiscovery } from '@/store/discoveryStore'
import { pedirInesperada } from '@/store/servidor/catalogo'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import { discoveryPaths } from '@/routes/discoveryPaths'
import { careerDetails, occupationDetails } from '../lib/catalogDetails'
import { chooseUnexpected } from '../lib/unexpected'

// «Llévame a un lugar inesperado» (HU-042). En api (F06) elige el servidor entre lo no visto, sin excluir
// favoritos ni planes; en local, como antes, con las visitas del navegador.
export function useLugarInesperado(kind: 'career' | 'occupation', currentId: string) {
  const context = useOccupationExplorationContext()
  const navigate = useNavigate()
  const [pendiente, setPendiente] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const planIds = context.decisionSheets.flatMap((s) => (s.sourceId ? [s.sourceId] : []))
  const ir = (codigo: string, revisiting: boolean) =>
    navigate(kind === 'career' ? discoveryPaths.career(codigo) : discoveryPaths.occupation(codigo), {
      state: { revisitingCatalog: revisiting },
    })
  function go() {
    if (modoApi) {
      if (pendiente) return
      setPendiente(true)
      setError(null)
      void pedirInesperada(kind === 'career' ? 'carreras' : 'ocupaciones', currentId).then((respuesta) => {
        setPendiente(false)
        if (respuesta.tipo !== 'ok') return setError(mensajeErrorServidor(respuesta))
        if (respuesta.datos.codigo) ir(respuesta.datos.codigo, respuesta.datos.revisitando)
      })
      return
    }
    const excluded =
      kind === 'career'
        ? [...context.careerInterestIds, ...planIds]
        : [
            ...context.profiles.filter((p) => p.interested).map((p) => p.occupationId),
            ...occupationDetails.filter((o) => o.careerIds.some((id) => planIds.includes(id))).map((o) => o.id),
          ]
    const destination = chooseUnexpected({
      kind,
      currentId,
      careers: careerDetails,
      occupations: occupationDetails,
      visits: getDiscovery().catalogVisits,
      excluded,
    })
    if (destination) ir(destination.id, destination.revisiting)
  }
  const eligible =
    modoApi ||
    (kind === 'career' ? careerDetails : occupationDetails).some(
      (c) =>
        c.id !== currentId &&
        !(kind === 'career'
          ? [...context.careerInterestIds, ...planIds].includes(c.id)
          : context.profiles.some((p) => p.occupationId === c.id && p.interested) ||
            ('careerIds' in c && c.careerIds.some((id) => planIds.includes(id)))),
    )
  return { go, eligible, pendiente, error }
}
