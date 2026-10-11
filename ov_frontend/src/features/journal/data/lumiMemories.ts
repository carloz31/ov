import { lumiMemoryThresholds } from '../lib/lumiBond'
export type LumiMemory = { threshold: number; title: string; text: string }
export const lumiMemories: LumiMemory[] = lumiMemoryThresholds.map((threshold, index) => ({
  threshold,
  title: index === 0 ? 'Cómo llegué a este mundo' : `[Título del recuerdo ${index + 1} pendiente]`,
  text:
    index === 0
      ? 'Llegué aquí perdida, sin saber hacia dónde iba. Lo primero que aprendí fue que no hacía falta tener todo el mapa para dar el primer paso.'
      : `[Texto del recuerdo ${index + 1} pendiente.]`,
}))
