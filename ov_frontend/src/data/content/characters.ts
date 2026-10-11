import { catalog } from '@/data/activities/content'

const characterEmoji: Record<string, string> = {
  companero: '🌟',
  mara: '👩🏽‍🌾',
  elena: '👩🏽',
  aurelio: '👴🏽',
}

export function getCharacterVisual(id: string) {
  return {
    emoji: characterEmoji[id] ?? '🙂',
    name: id === 'companero' ? 'Lumi' : (catalog.personajes.find((person) => person.id === id)?.nombre ?? id),
  }
}
