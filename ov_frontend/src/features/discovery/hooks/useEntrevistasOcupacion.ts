import { useEstadoServidor } from '@/store/servidor/sesion'
import { useListaEntrevistas } from '@/store/servidor/entrevistas'

// F09 (api): las entrevistas del salón sobre una ocupación del catálogo, solo con Investigaciones abierta.
export function useEntrevistasOcupacion(codigo: string) {
  const secciones = useEstadoServidor().secciones.datos
  const abierta = !!secciones?.some((s) => s.codigo === 'INVESTIGACIONES' && s.estado === 'DISPONIBLE')
  const lista = useListaEntrevistas('ocupacion', { vista: 'SALON', ocupacion: codigo }, abierta)
  return { abierta, lista }
}
