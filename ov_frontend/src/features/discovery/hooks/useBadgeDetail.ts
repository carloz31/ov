import { useLogrosServidor } from '@/store/servidor/secciones'
import { useEffect, useState } from 'react'
import { modoApi } from '@/config/env'
import { mensajeErrorServidor, useEstadoServidor } from '@/store/servidor/sesion'
import { consultarProgreso } from '@/store/servidor/consultas'
import { insigniasServidor, textoRequisitoInsignia } from '@/lib/servidor/adaptadores'
import { getAchievementPresentations } from '@/features/discovery/lib/achievements'

import { Eye } from 'lucide-react'
import { useAdventure } from '@/store/adventureStore'
import { useJourney } from '@/store/journeyStore'
import { updateDiscovery, useDiscovery } from '@/store/discoveryStore'
import { useReturnFocus } from '@/hooks/useReturnFocus'
import {
  achievementIcons,
  badgeDestinations,
  getProfileBadges,
  toggleProfileBadge,
} from '@/features/discovery/lib/passport'
import type { PassportBadge } from '@/types/profile'

export function useBadgeDetail(badge?: PassportBadge) {
  const adventure = useAdventure(),
    journey = useJourney(),
    discovery = useDiscovery(),
    returnFocus = useReturnFocus()
  useLogrosServidor(!!badge)
  const servidor = useEstadoServidor()
  const api = modoApi
    ? {
        grupos: insigniasServidor(servidor.logros.datos, getAchievementPresentations()),
        cuenta: servidor.resumen.datos?.cuenta.codigo ?? '',
      }
    : undefined
  const [requisito, setRequisito] = useState('Consultando el requisito en el servidor…')
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)
  useEffect(() => {
    if (!modoApi || !badge || badge.done) return
    let vigente = true
    setRequisito('Consultando el requisito en el servidor…')
    setError('')
    void consultarProgreso('INSIGNIA', badge.code).then((r) => {
      if (!vigente) return
      if (r.tipo === 'ok')
        setRequisito(
          textoRequisitoInsignia(r.datos, servidor.actividades.datos, badge.code, servidor.logros.datos),
        )
      else {
        setRequisito('')
        setError(mensajeErrorServidor(r))
      }
    })
    return () => {
      vigente = false
    }
  }, [badge, servidor.actividades.datos, servidor.logros.datos, intento])
  const selected = getProfileBadges(adventure, discovery, journey, api),
    visible = selected.some((b) => b.code === badge?.code)
  const hidden = badge?.hidden && !badge.done
  const destination = badge ? badgeDestinations[badge.code] : undefined
  const Icon = badge ? achievementIcons[badge.icon] : Eye
  const date = modoApi
    ? badge
      ? servidor.fechasInsignias[badge.code]
      : undefined
    : badge
      ? (discovery.badgeFirstSeenAt[badge.code] ??
        journey.challengeResults?.find((r) => r.logroOculto === badge.code)?.fechaHora)
      : undefined
  function alternarInsignia() {
    if (!badge) return
    updateDiscovery((current) => toggleProfileBadge(current, adventure, badge.code, journey, api))
  }
  return {
    returnFocus,
    error: modoApi ? error : '',
    setIntento,
    selected,
    visible,
    hidden,
    destination,
    Icon,
    date,
    notaFecha: !modoApi && ' · fecha aproximada del primer registro',
    descripcionRequisito: modoApi ? requisito : badge?.description,
    alternarInsignia,
  }
}
