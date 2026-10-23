import { useState } from 'react'
import type { JournalEntry } from '@/types/adventure'

// Ajuste del diario (F05): el cuaderno filtra en el cliente por tipo (origen) y por título o pregunta, en el orden
// elegido; la portada muestra solo las 3 primeras y `?cuaderno=completo`, todas.
export type FiltroCuaderno = 'todas' | 'libres' | 'del_dia' | 'cartas'
export type OrdenCuaderno = 'recientes' | 'antiguas'
export const PORTADA_CUADERNO = 3

export function tipoEntrada(entry: JournalEntry): Exclude<FiltroCuaderno, 'todas'> {
  // En api, la etiqueta del servidor; en local, el mismo criterio que la tarjeta.
  if (entry.etiqueta)
    return entry.etiqueta === 'Libre'
      ? 'libres'
      : entry.etiqueta === 'Pregunta del día'
        ? 'del_dia'
        : 'cartas'
  if (entry.linkedActivityId?.startsWith('daily-prompt-')) return 'del_dia'
  return entry.kind === 'open' ? 'libres' : 'cartas'
}

export function useJournalHome({ entries, completo }: { entries: JournalEntry[]; completo: boolean }) {
  const [query, setQuery] = useState('')
  const [orden, setOrden] = useState<OrdenCuaderno>('recientes')
  const [filtro, setFiltro] = useState<FiltroCuaderno>('todas')
  const buscado = query.trim().toLocaleLowerCase('es-PE')
  const filtradas = [...entries]
    .sort((a, b) => (orden === 'recientes' ? -1 : 1) * a.createdAt.localeCompare(b.createdAt))
    .filter((e) => filtro === 'todas' || tipoEntrada(e) === filtro)
    .filter(
      (e) => !buscado || `${e.title} ${e.promptShown ?? ''}`.toLocaleLowerCase('es-PE').includes(buscado),
    )
  const primera = entries.reduce<string | undefined>(
    (min, e) => (min === undefined || e.createdAt < min ? e.createdAt : min),
    undefined,
  )
  return {
    query,
    setQuery,
    orden,
    alternarOrden: () => setOrden((actual) => (actual === 'recientes' ? 'antiguas' : 'recientes')),
    filtro,
    setFiltro,
    visibles: completo ? filtradas : filtradas.slice(0, PORTADA_CUADERNO),
    total: entries.length,
    hayMas: !completo && filtradas.length > PORTADA_CUADERNO,
    primera,
  }
}
