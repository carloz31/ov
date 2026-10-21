import type { FamiliaApoderado } from '@/types/servidor'

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

// El nombre del hijo para los textos del portal: el del servidor en api, el de la demostración en local.
export const nombreHijo = (familia: FamiliaApoderado | null, demostracion?: string) =>
  familia ? (familia.estudiante?.nombre ?? 'tu hijo') : demostracion
