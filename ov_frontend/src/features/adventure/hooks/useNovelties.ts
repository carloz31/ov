import { useState } from 'react'
import { modoApi } from '@/config/env'

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

  // Ajuste notificaciones: en api, la campana lista las notificaciones del servidor.
  return { ordered, open, setOpen, unread, campanaServidor: modoApi }
}
