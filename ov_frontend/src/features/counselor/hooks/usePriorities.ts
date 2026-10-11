import { useEffect, useState } from 'react'

import { useSearchParams } from 'react-router'

import { questionnaires } from '@/data/demo/studentProfiles'

import { normalizeSearch } from '@/features/student-tracking/lib/selectors'
import {
  prioritySettingsStore,
  prioritySettingsReducer,
  type PrioritySettings,
  recordActivities,
  type PriorityAction,
} from '@/features/counselor/store/prioritySettings'
import { usePrioritySettings } from '@/features/counselor/hooks/usePrioritySettings'

type Confirmation = { kind: 'sharing'; id: string } | { kind: 'clear' } | { kind: 'save' }

export function usePriorities() {
  const savedSettings = usePrioritySettings()
  const [draft, setDraft] = useState<PrioritySettings | null>(null)
  const settings = draft ?? savedSettings
  const editing = draft !== null
  const dirty = editing && JSON.stringify(draft) !== JSON.stringify(savedSettings)
  const [section, setSection] = useState('tools')
  const [params] = useSearchParams()
  const [query, setQuery] = useState('')
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [saveCount, setSaveCount] = useState(0)
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    if (!saveCount) return
    setSaved(true)
    const timeout = setTimeout(() => setSaved(false), 2400)
    return () => clearTimeout(timeout)
  }, [saveCount])
  const changeDraft = (action: PriorityAction) => {
    setDraft((current) => (current ? prioritySettingsReducer(current, action) : null))
  }

  const visible = recordActivities.filter((activity) =>
    normalizeSearch(activity.title).includes(normalizeSearch(query)),
  )
  const sharingName =
    confirmation?.kind === 'sharing' ? questionnaires.find((q) => q.id === confirmation.id)?.name : ''
  const confirm = () => {
    if (confirmation?.kind === 'sharing') changeDraft({ type: 'sharing', id: confirmation.id, checked: true })
    if (confirmation?.kind === 'clear') changeDraft({ type: 'all-records', checked: false })
    if (confirmation?.kind === 'save' && draft) {
      if (prioritySettingsStore.dispatch({ type: 'replace', settings: draft }))
        setSaveCount((count) => count + 1)
      setDraft(null)
    }
    setConfirmation(null)
  }
  return {
    savedSettings,
    setDraft,
    settings,
    editing,
    dirty,
    section,
    setSection,
    params,
    query,
    setQuery,
    confirmation,
    setConfirmation,
    saved,
    setSaved,
    changeDraft,
    visible,
    sharingName,
    confirm,
  }
}
