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
// F05: en api se abre un recuerdo por nivel de amistad del servidor (cinco). Sus umbrales no se copian del
// servidor: el panel solo muestra el del siguiente recuerdo (`siguiente_en`).
// DATO DE PRUEBA: el quinto recuerdo; lo reemplazará el texto definitivo de los recuerdos de Lumi.
export const lumiMemoriesServidor: LumiMemory[] = [
  ...lumiMemories,
  { threshold: 0, title: '[Título del recuerdo 5 pendiente]', text: '[Texto del recuerdo 5 pendiente.]' },
]
