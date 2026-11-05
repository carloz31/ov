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

// Ajuste testimonios: en api, las voces también llegan por misiones del camino; local conserva sus textos.
export function textosVoces(servidor: boolean, total: number, pendientes: number) {
  const cuantas = `${pendientes} ${pendientes === 1 ? 'voz más espera' : 'voces más esperan'}`
  return {
    encabezado: servidor
      ? 'Personas reales que cuentan cómo llegaron a lo que hacen. Las encuentras al resolver llamados en la Central de Casos y en algunas misiones del camino.'
      : 'Personas reales que cuentan cómo llegaron a lo que hacen. Cada llamado que atiendes en la Central de Casos te acerca a una.',
    vacio: servidor
      ? `Cada llamado que superas en la Central de Casos, y algunas misiones del camino, te presentan a alguien que ya recorrió un camino. Hay ${total} voces en la ciudad.`
      : `Cada llamado que superas en la Central de Casos te presenta a alguien que ya recorrió un camino. Hay ${total} voces en la ciudad.`,
    cierre: !(pendientes > 0)
      ? 'Con cada nuevo llamado aparecerán otras historias.'
      : servidor
        ? `${cuantas} en el camino y en llamados que aún no se abren.`
        : `${cuantas} en llamados que aún no se abren. Aparecerán aquí cuando la Central los publique.`,
  }
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
