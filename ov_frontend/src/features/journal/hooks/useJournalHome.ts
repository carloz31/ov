import { useState } from 'react'
import { useAdventure } from '@/store/adventureStore'
import { getLumiSuggestions } from '@/features/journal/lib/lumiSuggestions'
import { useJourney } from '@/store/journeyStore'
import type { JournalEntry } from '@/types/adventure'
import { useStudentUi } from '@/store/studentUiStore'
import { type LumiBond } from '@/features/journal/lib/lumiBond'
type JournalGrouping = 'timeline' | 'topics'
export function useJournalHome({
  entries,
  grouping,
  bond,
}: {
  entries: JournalEntry[]
  grouping: JournalGrouping
  bond: LumiBond
}) {
  const adventure = useAdventure(),
    journey = useJourney(),
    ui = useStudentUi(),
    [topic, setTopic] = useState<string>()
  const suggestions = getLumiSuggestions(adventure, journey)
  const unread = Array.from({ length: bond.memoriesOpened }, (_, i) => i + 1).some(
    (n) => !ui.seenLumiMemories.includes(n),
  )
  const tags = [...new Set(entries.flatMap((e) => e.topicTags))]
  const shown = grouping === 'topics' && topic ? entries.filter((e) => e.topicTags.includes(topic)) : entries
  const months = shown.reduce<Record<string, JournalEntry[]>>((result, entry) => {
    const month = new Date(entry.createdAt).toLocaleDateString('es-PE', {
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Lima',
    })
    ;(result[month] ??= []).push(entry)
    return result
  }, {})
  return { topic, setTopic, suggestions, unread, tags, shown, months }
}
