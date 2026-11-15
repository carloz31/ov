import { useLocation, useParams, useSearchParams } from 'react-router'
import { appPaths } from '@/routes/paths'
import { usePerfilEstudiante as usePerfilServidor } from '@/store/servidor/panelEstudiante'
import type { DestinoPerfil } from '@/types/servidor'

export const PESTANAS_PERFIL = ['resumen', 'tests', 'planes', 'respuestas', 'avance'] as const
export type PestanaPerfil = (typeof PESTANAS_PERFIL)[number]
const DE_DESTINO: Record<DestinoPerfil, PestanaPerfil> = {
  TESTS: 'tests',
  PLANES: 'planes',
  RESPUESTAS: 'respuestas',
  AVANCE: 'avance',
}

// Ajuste panel-estudiantes §5 (api): el perfil del estudiante. La pestaña (`?tab=`), el plan abierto (`?plan=`),
// el resultado completo (`?resultado=`) y todas las respuestas de partida y llegada (`?todas=1`) van en la URL;
// «Volver» regresa a la lista con sus filtros y orden.
export function usePerfilEstudiante() {
  const { studentId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const { carga, reintentar } = usePerfilServidor(studentId)
  const pedida = params.get('tab') as PestanaPerfil | null
  const pestana: PestanaPerfil = pedida && PESTANAS_PERFIL.includes(pedida) ? pedida : 'resumen'
  const lista = (location.state as { lista?: string } | null)?.lista

  const ir = (cambios: Record<string, string | null>) =>
    setParams(
      (actuales) => {
        const siguientes = new URLSearchParams(actuales)
        Object.entries(cambios).forEach(([clave, valor]) =>
          valor === null ? siguientes.delete(clave) : siguientes.set(clave, valor),
        )
        return siguientes
      },
      { state: location.state },
    )
  return {
    estudiante: studentId,
    carga,
    reintentar,
    pestana,
    elegirPestana: (valor: string) =>
      ir({ tab: valor === 'resumen' ? null : valor, plan: null, resultado: null, todas: null }),
    irADestino: (destino: DestinoPerfil) =>
      ir({ tab: DE_DESTINO[destino], plan: null, resultado: null, todas: null }),
    plan: Number(params.get('plan')) || null,
    abrirPlan: (prioridad: number | null) => ir({ plan: prioridad ? String(prioridad) : null }),
    resultado: params.get('resultado'),
    abrirResultado: (aplicacion: string | null) => ir({ resultado: aplicacion }),
    todas: params.get('todas') === '1',
    verTodas: (ver: boolean) => ir({ todas: ver ? '1' : null }),
    volver: lista ? `${appPaths.counselor.students}?${lista}` : appPaths.counselor.students,
  }
}
export type ModeloPerfilEstudiante = ReturnType<typeof usePerfilEstudiante>
