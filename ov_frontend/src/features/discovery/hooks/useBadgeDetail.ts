import { useLogrosServidor } from '@/store/servidor/secciones'
import { useEffect, useMemo, useState } from 'react'
import { modoApi } from '@/config/env'
import { mensajeErrorServidor, useEstadoServidor } from '@/store/servidor/sesion'
import { consultarProgreso } from '@/store/servidor/consultas'
import { guardarVitrina } from '@/store/servidor/operaciones'
import { condicionesObjetivo, insigniasServidor } from '@/lib/servidor/adaptadores'

import { Sparkles } from 'lucide-react'
import { useAdventure } from '@/store/adventureStore'
import { useJourney } from '@/store/journeyStore'
import { updateDiscovery, useDiscovery } from '@/store/discoveryStore'
import { useReturnFocus } from '@/hooks/useReturnFocus'
import {
  achievementIcons,
  badgeDestinations,
  toggleProfileBadge,
  vitrinaPasaporte,
} from '@/features/discovery/lib/passport'
import type { CondicionesPasaporte, PassportBadge } from '@/types/profile'

// Ajuste pasaporte-perfil: el modal en tres estados (secreta, por descubrir, obtenida). En api, las condiciones
// salen de `/progreso/INSIGNIA` y la vitrina se guarda en el servidor; en local, una condición con el requisito.
export function useBadgeDetail(badge?: PassportBadge) {
  const adventure = useAdventure(),
    journey = useJourney(),
    discovery = useDiscovery(),
    returnFocus = useReturnFocus()
  useLogrosServidor(!!badge)
  const servidor = useEstadoServidor()
  const logros = servidor.logros.datos
  const gruposApi = useMemo(() => (modoApi ? insigniasServidor(logros) : undefined), [logros])
  const secreta = !!badge?.hidden && !badge.done
  const [remotas, setRemotas] = useState<CondicionesPasaporte | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [errorVitrina, setErrorVitrina] = useState('')
  // F5: depende del código y del estado, no del objeto (se recrea en cada render): una sola consulta por insignia.
  const codigo = badge?.code,
    respaldo = badge?.description,
    consultable = modoApi && !!badge && !badge.done && !badge.hidden
  useEffect(() => {
    if (!consultable || !codigo) return
    let vigente = true
    setRemotas(null)
    void consultarProgreso('INSIGNIA', codigo).then((r) => {
      if (vigente) setRemotas(r.tipo === 'ok' ? condicionesObjetivo(r.datos, respaldo) : null)
    })
    return () => {
      vigente = false
    }
  }, [consultable, codigo, respaldo])
  useEffect(() => setErrorVitrina(''), [codigo])
  const vitrina = vitrinaPasaporte(adventure, discovery, journey, gruposApi, logros?.vitrina),
    enVitrina = vitrina.some((b) => b.code === badge?.code)
  const condiciones = modoApi
    ? remotas
    : badge && { bloques: [[{ texto: badge.description, cumplida: false }]], cumplidas: 0, total: 1, mejor: 0 }
  const fecha = modoApi
    ? badge?.obtenidaEn
    : badge
      ? (discovery.badgeFirstSeenAt[badge.code] ??
        journey.challengeResults?.find((r) => r.logroOculto === badge.code)?.fechaHora)
      : undefined
  function alternarVitrina() {
    if (!badge) return
    if (!modoApi) {
      updateDiscovery((current) => toggleProfileBadge(current, adventure, badge.code, journey))
      return
    }
    const codigos = vitrina.map((b) => b.code as string)
    setGuardando(true)
    setErrorVitrina('')
    void guardarVitrina(enVitrina ? codigos.filter((c) => c !== badge.code) : [...codigos, badge.code]).then((r) => {
      setGuardando(false)
      if (r.tipo !== 'ok') setErrorVitrina(mensajeErrorServidor(r))
    })
  }
  return {
    returnFocus,
    estado: !badge ? undefined : badge.done ? 'obtenida' : secreta ? 'secreta' : 'pendiente',
    condiciones,
    destination: badge ? badgeDestinations[badge.code] : undefined,
    Icon: (badge && achievementIcons[badge.icon]) ?? Sparkles,
    fecha,
    enVitrina,
    enUso: vitrina.length,
    vitrinaLlena: !enVitrina && vitrina.length >= 3,
    guardando,
    errorVitrina: modoApi ? errorVitrina : '',
    alternarVitrina,
  }
}
