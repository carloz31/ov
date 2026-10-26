// Ajuste mochila: las fichas obtenidas, agrupadas por el tramo de la actividad que las dio. Sin tramo pero con
// actividad, «Ciudad»; sin actividad conocida, «Otras fichas», al final. Si ninguna tiene tramo (modo local),
// un solo grupo sin rótulo. Dentro de cada grupo, de la más reciente a la más antigua.
export type OrigenFicha = {
  actividad?: { codigo: string; titulo: string }
  tramo?: { codigo: string; nombre: string; numero: number }
  obtenidaEn?: string
}
export type GrupoFichas<T> = { clave: string; rotulo: string | null; fichas: T[] }

export function agruparFichas<T>(fichas: T[], origen: (ficha: T) => OrigenFicha | undefined): GrupoFichas<T>[] {
  const recientes = [...fichas].sort((a, b) =>
    (origen(b)?.obtenidaEn ?? '').localeCompare(origen(a)?.obtenidaEn ?? ''),
  )
  if (!recientes.some((ficha) => origen(ficha)?.tramo)) return recientes.length ? [{ clave: 'todas', rotulo: null, fichas: recientes }] : []
  const grupos = new Map<string, GrupoFichas<T> & { orden: number }>()
  for (const ficha of recientes) {
    const { actividad, tramo } = origen(ficha) ?? {}
    const [clave, rotulo, orden] = tramo
      ? [tramo.codigo, `Tramo ${tramo.numero} · ${tramo.nombre}`, tramo.numero]
      : actividad
        ? ['ciudad', 'Ciudad', Number.MAX_SAFE_INTEGER - 1]
        : ['otras', 'Otras fichas', Number.MAX_SAFE_INTEGER]
    const grupo = grupos.get(clave) ?? { clave, rotulo, orden, fichas: [] }
    grupo.fichas.push(ficha)
    grupos.set(clave, grupo)
  }
  return [...grupos.values()].sort((a, b) => a.orden - b.orden).map(({ clave, rotulo, fichas }) => ({ clave, rotulo, fichas }))
}
