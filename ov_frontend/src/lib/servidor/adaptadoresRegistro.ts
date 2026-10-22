import type { ItemRegistroPublico, ReferenciaResuelta } from '@/types/servidor'

// F02: un ítem que elige por referencia recibe como opciones lo elegido antes (incluida la «otra» de la
// fuente, con su texto). Sin dato, no hay opciones. El resto del reproductor lo trata como una lista.
export function itemConReferencia(
  item: ItemRegistroPublico,
  referencias: ReferenciaResuelta[],
): ItemRegistroPublico {
  const codigo = item.eleccion?.referencia
  if (!item.eleccion || !codigo) return item
  const referencia = referencias.find((r) => r.codigo === codigo)
  const opciones = referencia?.estado === 'DISPONIBLE' ? (referencia.opciones ?? []) : []
  return { ...item, eleccion: { ...item.eleccion, opciones } }
}

// Las referencias que pide un registro: las de sus elecciones y las que citan sus consignas.
export function necesitaReferencias(items: ItemRegistroPublico[], ecos: (string | undefined)[]) {
  return items.some((i) => !!i.eleccion?.referencia) || ecos.some(Boolean)
}
