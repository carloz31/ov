import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { alternarOrden, ordenValido } from '@/lib/servidor/adaptadoresPanel'
import { appPaths } from '@/routes/paths'
import { datosSesion } from '@/store/accesoStore'
import type { ColumnaInteres, ConjuntoPanel } from '@/types/servidor'

export const TODOS_LOS_SALONES = 'all'
export type SeccionPanel = 'tracking' | 'interests'
export type TablaInteres = 'areas' | 'instituciones'
export type PedidoVer = { titulo: string; conjunto: ConjuntoPanel; valor?: string }

// Ajuste panel-salon (api): el salón (`?salon=`, «all» para todos; sin él, el principal), la pestaña
// (`?section=`) y el orden de cada tabla de intereses (`?orden_areas=`, `?orden_instituciones=`) viven en la URL,
// así las listas completas heredan el orden y «Volver» regresa a la misma pestaña y salón.
export function usePanelSalon() {
  const [params, setParams] = useSearchParams()
  const salones = datosSesion().salones
  const principal = salones.find((s) => s.es_principal)?.codigo ?? salones[0]?.codigo ?? TODOS_LOS_SALONES
  const pedido = params.get('salon')
  const salon = pedido === TODOS_LOS_SALONES || salones.some((s) => s.codigo === pedido) ? pedido! : principal
  const seccion: SeccionPanel = params.get('section') === 'interests' ? 'interests' : 'tracking'
  const ordenAreas = ordenValido(params.get('orden_areas'))
  const ordenInstituciones = ordenValido(params.get('orden_instituciones'))
  const [ver, setVer] = useState<PedidoVer | null>(null)

  const cambiar = (cambios: Record<string, string>) =>
    setParams(
      (actuales) => {
        const siguientes = new URLSearchParams(actuales)
        Object.entries(cambios).forEach(([clave, valor]) => siguientes.set(clave, valor))
        return siguientes
      },
      { replace: true },
    )
  const consulta = new URLSearchParams({
    salon,
    section: 'interests',
    orden_areas: ordenAreas,
    orden_instituciones: ordenInstituciones,
  }).toString()

  return {
    salones,
    salon,
    // Lo que se envía al servidor: vacío para «Todos mis salones».
    salonServidor: salon === TODOS_LOS_SALONES ? '' : salon,
    nombreSalon:
      salon === TODOS_LOS_SALONES
        ? 'Todos mis salones'
        : (salones.find((s) => s.codigo === salon)?.nombre ?? salon),
    elegirSalon: (codigo: string) => cambiar({ salon: codigo }),
    seccion,
    elegirSeccion: (valor: string) => cambiar({ section: valor === 'interests' ? 'interests' : 'tracking' }),
    ordenAreas,
    ordenInstituciones,
    ordenar: (tabla: TablaInteres, columna: ColumnaInteres) =>
      tabla === 'areas'
        ? cambiar({ orden_areas: alternarOrden(ordenAreas, columna) })
        : cambiar({ orden_instituciones: alternarOrden(ordenInstituciones, columna) }),
    enlaceLista: (tabla: TablaInteres) =>
      `${tabla === 'areas' ? appPaths.counselor.homeAreas : appPaths.counselor.homeInstituciones}?${consulta}`,
    enlaceVolver: `${appPaths.counselor.home}?${consulta}`,
    ver,
    abrirVer: setVer,
    cerrarVer: () => setVer(null),
  }
}
export type ModeloPanelSalon = ReturnType<typeof usePanelSalon>
