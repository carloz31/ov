import type { ItemRegistroPublico, OpcionElegida, ReferenciaResuelta } from '@/types/servidor'

// F02: un ítem que retoma una elección elige de su propia lista; su referencia ELECCION solo dice qué se
// eligió la vez pasada (la «otra», con su texto). Sin dato, nada.
export function anterioresDe(item: ItemRegistroPublico, referencias: ReferenciaResuelta[]): OpcionElegida[] {
  const codigo = item.eleccion?.referencia
  const referencia = codigo ? referencias.find((r) => r.codigo === codigo) : undefined
  if (referencia?.estado !== 'DISPONIBLE') return []
  return (referencia.opciones ?? []).map((o) =>
    o.codigo === 'OTRA' ? { codigo: 'OTRA', texto: o.texto } : { codigo: o.codigo },
  )
}

// Las referencias que pide un registro: las de sus elecciones que retoman otra y las que citan sus consignas.
export function necesitaReferencias(items: ItemRegistroPublico[], ecos: (string | undefined)[]) {
  return items.some((i) => !!i.eleccion?.referencia) || ecos.some(Boolean)
}
