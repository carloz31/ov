import { useEstadoServidor } from '@/store/servidor/sesion'
import { useListaEntrevistas } from '@/store/servidor/entrevistas'

// Ajuste entrevistas por familia: las entrevistas de una familia de carreras que el estudiante puede ver (su salón y
// las Leyendas), solo con Investigaciones abierta.
export function useEntrevistasFamilia(codigo: string) {
  const secciones = useEstadoServidor().secciones.datos
  const abierta = !!secciones?.some((s) => s.codigo === 'INVESTIGACIONES' && s.estado === 'DISPONIBLE')
  const lista = useListaEntrevistas('familia', { vista: 'SALON_Y_LEYENDAS', familia: codigo }, abierta)
  return { abierta, lista }
}
