import type { TravelResource } from './travelerResources'

// Ajuste mochila: lo que cada compartimento muestra, sin estado ni modo (la mochila le pasa sus funciones).
type Criterio = {
  query: string
  favoritesOnly: boolean
  esFavorita: (r: TravelResource) => boolean
  isUnlocked: (r: TravelResource) => boolean
}

// Fichas: título, descripción y tema. Voces: nombre y ocupación (solo abiertas) y título.
export function textoBuscable(r: TravelResource, abierto: boolean) {
  return r.kind === 'sheet'
    ? `${r.title} ${r.summary} ${r.ficha?.tema ?? ''}`
    : `${abierto ? (r.author ?? '') : ''} ${r.title}`
}

export function filtrar(items: TravelResource[], { query, favoritesOnly, esFavorita, isUnlocked }: Criterio) {
  const buscado = query.trim().toLocaleLowerCase()
  return items.filter(
    (item) =>
      (!favoritesOnly || (isUnlocked(item) && esFavorita(item))) &&
      textoBuscable(item, isUnlocked(item)).toLocaleLowerCase().includes(buscado),
  )
}

// Las voces que se listan: las abiertas y las bloqueadas cuyo llamado ya está disponible. El resto solo se
// cuenta en la tarjeta de cierre.
export function vocesListadas(
  voces: TravelResource[],
  isUnlocked: (r: TravelResource) => boolean,
  casoDisponible: (r: TravelResource) => boolean,
) {
  const abiertas = voces.filter(isUnlocked),
    porDescubrir = voces.filter((v) => !isUnlocked(v) && casoDisponible(v))
  return { abiertas, porDescubrir, pendientes: voces.length - abiertas.length - porDescubrir.length }
}
