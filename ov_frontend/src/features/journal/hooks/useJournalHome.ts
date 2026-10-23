import { useState } from 'react'
import type { JournalEntry } from '@/types/adventure'
type JournalGrouping = 'timeline' | 'topics'
export function useJournalHome({
  entries,
  grouping,
}: {
  entries: JournalEntry[]
  grouping: JournalGrouping
}) {
  const [topic, setTopic] = useState<string>()
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
  return { topic, setTopic, tags, shown, months }
}
