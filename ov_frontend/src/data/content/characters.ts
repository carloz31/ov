import { catalog } from '@/data/activities/content'

const characterEmoji: Record<string, string> = {
  companero: '🌟',
  mara: '👩🏽‍🌾',
  helena: '👩🏽',
  aurelio: '👴🏽',
}

export function getCharacterVisual(id: string) {
  return {
    emoji: characterEmoji[id] ?? '🙂',
    name: id === 'companero' ? 'Lumi' : (catalog.personajes.find((person) => person.id === id)?.nombre ?? id),
  }
}
