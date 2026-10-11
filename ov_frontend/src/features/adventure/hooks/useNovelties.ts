import { useState } from 'react'
import { modoApi } from '@/config/env'
import { useEstadoServidor } from '@/store/servidor/sesion'
import { avisosPendientes } from '@/store/servidor/avisos'
import { useStudentOverlays } from '@/features/adventure/context/overlayContext'

import { useDiscovery } from '@/store/discoveryStore'

import { useJourney } from '@/store/journeyStore'
import { useAdventure } from '@/store/adventureStore'
import { useStudentUi } from '@/store/studentUiStore'
import { getUnlocks, orderUnlocks } from '@/features/adventure/lib/unlocks'

export function useNovelties() {
  const ui = useStudentUi()
  const adventure = useAdventure(),
    journey = useJourney(),
    discovery = useDiscovery()
  const items = modoApi ? [] : getUnlocks(adventure, journey, discovery)
  const ordered = ui.initialized
    ? orderUnlocks(items, ui).filter((item) => !ui.seenUnlockIds.includes(item.id))
    : []
  const [open, setOpen] = useState(false)
  const unread = ordered.length

  return { ordered, open, setOpen, unread, loteAvisos: modoApi ? avisosPendientes() : undefined }
}
export function useServerNovelties() {
  const [open, setOpen] = useState(false)
  const servidor = useEstadoServidor()
  const { openServerNotices } = useStudentOverlays()
  const pendientes = avisosPendientes().length
  return { open, setOpen, openServerNotices, pendientes, errorAvisos: servidor.errorAvisos }
}
