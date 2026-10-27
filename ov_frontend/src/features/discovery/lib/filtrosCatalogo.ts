// Ajuste catalogo-datos-reales (F6a): los filtros del catálogo del servidor viven en la URL (`?buscar=…&tipo=…`),
// para que los enlaces filtrados y el «atrás» del navegador restauren la lista. Lógica pura.

export type SeccionCatalogo = 'professions' | 'careers' | 'institutions'

// Los parámetros que admite cada pestaña. `afines` y `favoritos` son marcas (`1`), excluyentes entre sí.
export const PARAMETROS: Record<SeccionCatalogo, readonly string[]> = {
  careers: ['buscar', 'tipo', 'area', 'familia', 'riasec', 'afines', 'favoritos'],
  professions: ['buscar', 'grupo', 'riasec', 'afines', 'favoritos'],
  institutions: ['buscar', 'tipo', 'gestion', 'ubicacion', 'favoritos'],
}

export type FiltrosUrl = Partial<Record<string, string>>

export function leerFiltros(seccion: SeccionCatalogo, parametros: URLSearchParams): FiltrosUrl {
  const filtros: FiltrosUrl = {}
  for (const nombre of PARAMETROS[seccion]) {
    const valor = parametros.get(nombre)?.trim()
    if (valor) filtros[nombre] = valor
  }
  return filtros
}

// Los filtros como parámetros de búsqueda, en el orden de la pestaña (sin vacíos).
export function escribirFiltros(seccion: SeccionCatalogo, filtros: FiltrosUrl) {
  const parametros = new URLSearchParams()
  for (const nombre of PARAMETROS[seccion]) {
    const valor = filtros[nombre]?.trim()
    if (valor) parametros.set(nombre, valor)
  }
  return parametros
}

// Aplica un cambio de filtros: «afines» y «favoritos» se excluyen; «afines» reemplaza las letras elegidas a
// mano y elegir letras a mano lo quita; cambiar el área quita la familia.
export function cambiarFiltros(actuales: FiltrosUrl, cambios: FiltrosUrl): FiltrosUrl {
  const siguientes: FiltrosUrl = { ...actuales, ...cambios }
  if (cambios.afines) {
    delete siguientes.favoritos
    delete siguientes.riasec
  }
  if (cambios.favoritos) delete siguientes.afines
  if ('area' in cambios && cambios.area !== actuales.area) delete siguientes.familia
  if (cambios.riasec !== undefined && !cambios.afines) delete siguientes.afines
  for (const nombre of Object.keys(siguientes)) if (!siguientes[nombre]) delete siguientes[nombre]
  return siguientes
}

// Las letras de «Afines a mi resultado»: las dos primeras del código de interés (seguidas y en orden, como
// las busca el filtro `riasec`).
export const letrasAfines = (codigoInteres: string | null | undefined) => (codigoInteres ?? '').slice(0, 2)

// La última búsqueda de cada pestaña, para que cambiar de pestaña no pierda los filtros de las otras. Solo la
// escribe el catálogo del servidor; en local queda vacía y los enlaces de las pestañas no cambian.
const memoria: Partial<Record<SeccionCatalogo, string>> = {}
export const recordarBusqueda = (seccion: SeccionCatalogo, busqueda: string) => {
  memoria[seccion] = busqueda
}
export const busquedaRecordada = (seccion: SeccionCatalogo) =>
  memoria[seccion] ? `?${memoria[seccion]}` : ''
