import { useEffect, useMemo, useState } from 'react'

import { useSearchParams } from 'react-router'

import { getFamilyConversationTopic } from '@/data/content/familyConversations'
import { updateAdventure, useAdventure } from '@/store/adventureStore'
import { getLumiTags } from '@/features/journal/lib/lumiSuggestions'
import { useLumiNow } from '@/hooks/useLumiNow'
import type { JournalEntry } from '@/types/adventure'

import { useReturnFocus } from '@/hooks/useReturnFocus'
import { getLumiBond } from '@/features/journal/lib/lumiBond'
import { type DailyQuestionEditorContext } from '@/features/journal/components/DailyQuestionCard'

type JournalScreen = 'home' | 'write' | 'detail'
type JournalGrouping = 'timeline' | 'topics'
export function useJournalPage() {
  const state = useAdventure()
  const now = useLumiNow()
  const bond = getLumiBond(state.lumiRegistrations, now)
  const [searchParams] = useSearchParams()
  const conversationTopic = getFamilyConversationTopic(searchParams.get('conversation') ?? '')
  const eventTitle = searchParams.get('event')
  const eventOutcome = searchParams.get('outcome')
  const activityId = searchParams.get('activity') ?? undefined
  const activityPrompt = searchParams.get('prompt') ?? undefined
  const activityTitle = searchParams.get('title') ?? undefined
  const initialPrompt = eventTitle
    ? eventOutcome === 'attended'
      ? `Hoy fue ${eventTitle}, ¿qué aprendiste o qué te sorprendió de esta experiencia?`
      : `No asististe a ${eventTitle}. ¿Qué pasó y qué podrías hacer distinto si aparece una experiencia similar?`
    : conversationTopic
      ? `¿Qué te llevaste de esta conversación con tu familia sobre ${conversationTopic.title.toLocaleLowerCase('es-PE')}?`
      : activityPrompt
  const [screen, setScreen] = useState<JournalScreen>(
    conversationTopic || eventTitle || activityPrompt ? 'write' : 'home',
  )
  const [grouping, setGrouping] = useState<JournalGrouping>('timeline')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string>()
  const [editingId, setEditingId] = useState<string>()
  const [body, setBody] = useState('')
  const [tags, setTags] = useState<string[]>(
    eventTitle
      ? ['evento']
      : conversationTopic
        ? ['familia']
        : activityPrompt
          ? getLumiTags(activityId ?? '')
          : [],
  )
  const [lockedTags, setLockedTags] = useState<string[]>(activityPrompt ? getLumiTags(activityId ?? '') : [])
  const [tagDraft, setTagDraft] = useState('')
  const [promptShown, setPromptShown] = useState(initialPrompt)
  const [linkedActivityId, setLinkedActivityId] = useState(
    eventTitle ? `event-${eventTitle}` : conversationTopic ? `family-${conversationTopic.id}` : activityId,
  )
  const [entryTitle, setEntryTitle] = useState(
    eventTitle
      ? `Evento: ${eventTitle}`
      : conversationTopic
        ? `Conversación: ${conversationTopic.title}`
        : (activityTitle ?? 'Conversación libre con Lumi'),
  )
  const [deleteOpen, setDeleteOpen] = useState(false)
  const returnFocus = useReturnFocus()
  const [saveNotice, setSaveNotice] = useState('')
  const requestedMemory = Number(searchParams.get('memory'))
  useEffect(() => {
    if (Number.isInteger(requestedMemory) && requestedMemory >= 1 && requestedMemory <= bond.memoriesOpened)
      setScreen('home')
  }, [requestedMemory, bond.memoriesOpened])
  const entries = useMemo(
    () => [...state.journal].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.journal],
  )
  const filteredEntries = entries.filter((entry) => {
    const normalized = query.trim().toLocaleLowerCase('es-PE')
    if (!normalized) return true
    return `${entry.topicTags.join(' ')} ${entry.title} ${entry.promptShown ?? ''} ${entry.body}`
      .toLocaleLowerCase('es-PE')
      .includes(normalized)
  })
  const selected = state.journal.find((entry) => entry.id === selectedId)
  const usedTags = [...new Set(entries.flatMap((entry) => entry.topicTags))].sort()

  function openEditor({
    prompt,
    linkedActivityId,
    title,
    lockedTags: initialTags,
  }: DailyQuestionEditorContext) {
    setSaveNotice('')
    setEditingId(undefined)
    setBody('')
    setTags(initialTags)
    setLockedTags(initialTags)
    setTagDraft('')
    setPromptShown(prompt)
    setLinkedActivityId(linkedActivityId)
    setEntryTitle(title)
    setScreen('write')
  }

  function startBlankEntry() {
    setSaveNotice('')
    setEditingId(undefined)
    setBody('')
    setTags([])
    setLockedTags([])
    setTagDraft('')
    setPromptShown(undefined)
    setLinkedActivityId(undefined)
    setEntryTitle('Conversación libre con Lumi')
    setScreen('write')
  }

  function startOnboardingEntry() {
    updateAdventure((current) => ({ ...current, journalOnboardingSeen: true }))
    if (!initialPrompt) {
      setPromptShown('¿Cómo llegas al inicio de este proceso?')
      setLinkedActivityId('journal-onboarding')
      setEntryTitle('Al inicio del camino')
      setLockedTags([])
      setBody('')
      setScreen('write')
    }
  }

  function addTag(raw = tagDraft) {
    const next = raw.trim().replace(/^#/, '').toLocaleLowerCase('es-PE')
    if (!next || tags.includes(next)) return
    setTags((current) => [...current, next])
    setTagDraft('')
  }

  function saveEntry() {
    if (!body.trim() || !entryTitle.trim()) return
    const remaining = getLumiBond(state.lumiRegistrations).remainingToday
    updateAdventure((current) => {
      const existing = current.journal.find((entry) => entry.id === editingId)
      const entry: JournalEntry = {
        id: existing?.id ?? crypto.randomUUID(),
        title: entryTitle.trim(),
        body: body.trim(),
        kind: promptShown ? 'prompted' : 'open',
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        linkedActivityId,
        promptShown,
        topicTags: tags,
        lockedTopicTags: lockedTags,
        missionId: existing?.missionId,
      }
      return {
        ...current,
        journal: [...current.journal.filter((item) => item.id !== entry.id), entry],
      }
    })
    setSelectedId(editingId)
    setEditingId(undefined)
    setScreen(editingId ? 'detail' : 'home')
    setSaveNotice(
      editingId
        ? 'Conversación actualizada. Editar no suma conversaciones.'
        : remaining > 0
          ? '¡Conversación guardada! Tu amistad con Lumi suma una conversación.'
          : `Conversación guardada. Hoy ya contaron tus 3 conversaciones; esta igual se guarda.`,
    )
  }

  function editEntry(entry: JournalEntry) {
    setEditingId(entry.id)
    setBody(entry.body)
    setTags(entry.topicTags)
    setLockedTags(entry.lockedTopicTags ?? [])
    setTagDraft('')
    setPromptShown(entry.promptShown)
    setLinkedActivityId(entry.linkedActivityId)
    setEntryTitle(entry.title)
    setScreen('write')
  }

  function deleteEntry() {
    if (!selected) return
    updateAdventure((current) => ({
      ...current,
      journal: current.journal.filter((entry) => entry.id !== selected.id),
    }))
    setDeleteOpen(false)
    setSelectedId(undefined)
    setScreen('home')
  }

  return {
    state,
    now,
    bond,
    activityId,
    screen,
    setScreen,
    grouping,
    setGrouping,
    query,
    setQuery,
    setSelectedId,
    editingId,
    body,
    setBody,
    tags,
    setTags,
    lockedTags,
    tagDraft,
    setTagDraft,
    promptShown,
    linkedActivityId,
    entryTitle,
    setEntryTitle,
    deleteOpen,
    setDeleteOpen,
    returnFocus,
    saveNotice,
    setSaveNotice,
    entries,
    filteredEntries,
    selected,
    usedTags,
    openEditor,
    startBlankEntry,
    startOnboardingEntry,
    addTag,
    saveEntry,
    editEntry,
    deleteEntry,
  }
}
