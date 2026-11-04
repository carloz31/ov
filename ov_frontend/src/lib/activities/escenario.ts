import type { Escenario } from '@/types/activities'

// Ajuste carga-actividades: el fondo del reproductor sale del `escenario` del contenido; sin él, la imagen que
// la pantalla usa como respaldo.
export const fondoEscenario = (escenario: Escenario | undefined, respaldo?: string) =>
  escenario ? `/images/background/${escenario}.png` : respaldo
