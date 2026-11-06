import type { EstudianteVinculado, FamiliaApoderado } from '@/types/servidor'

type AvanceVista = { completed: number; total: number; percent: number; complete: boolean }

// En api, el avance hacia el diploma es el del servidor (GET /cuentas/{c}/familia), no el calculado en el front.
export function avanceConFamilia<T extends AvanceVista>(route: T, familia: FamiliaApoderado | null): T {
  if (!familia) return route
  const { completadas, total, porcentaje } = familia.avance
  return { ...route, completed: completadas, total, percent: porcentaje, complete: total > 0 && completadas >= total }
}

export function inicialesHijo(nombre: string) {
  const partes = nombre.trim().split(/\s+/)
  return (partes.length > 1 ? `${partes[0][0]}${partes[1][0]}` : nombre.slice(0, 2)).toUpperCase()
}

// Ajuste inicio-apoderado: el hijo elegido entre los vinculados (`codigo`); si no está, el primero.
export const hijoElegido = (
  familia: FamiliaApoderado | null | undefined,
  codigo?: string | null,
): EstudianteVinculado | null =>
  familia?.estudiantes.find((e) => e.codigo === codigo) ?? familia?.estudiantes[0] ?? null

// El nombre del hijo para los textos del portal: el del servidor en api, el de la demostración en local.
export const nombreHijo = (familia: FamiliaApoderado | null, demostracion?: string, codigo?: string | null) =>
  familia ? (hijoElegido(familia, codigo)?.nombre ?? 'tu hijo') : demostracion

// Partida y llegada traen un resultado por aplicación con el mismo instrumento, en ese orden: se usa el de
// llegada si existe y, si no, el de partida (el último del instrumento).
export const resultadoDeInstrumento = <T extends { instrumento: string }>(
  resultados: T[] | null | undefined,
  instrumento: string | undefined,
): T | undefined => resultados?.filter((r) => r.instrumento === instrumento).at(-1)
