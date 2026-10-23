import { modoApi } from '@/config/env'
import { cerrarRecurso, useRecursoAbierto } from '@/store/visorRecursoStore'
import { useFichasServidor } from '@/store/servidor/secciones'
import { useEstadoServidor } from '@/store/servidor/sesion'
import { recursoDeFicha } from '../lib/travelerResources'
import { useRequisitoRecurso } from './useRequisitoRecurso'

// F04d: lo que abre el visor sobre una actividad. En api, una ficha bloqueada abre el pop up de requisito;
// el título y el estado los da el servidor y el contenido, el catálogo del front.
export function useVisorRecursoHost() {
  const abierto = useRecursoAbierto()
  useFichasServidor(!!abierto)
  const servidor = useEstadoServidor()
  const ficha = modoApi ? servidor.fichas.datos?.find((f) => f.codigo === abierto?.codigo) : undefined
  const bloqueada = ficha?.estado === 'BLOQUEADA'
  const requisito = useRequisitoRecurso(abierto && bloqueada ? abierto.codigo : null)
  return {
    cerrar: cerrarRecurso,
    modo: abierto?.modo ?? 'mochila',
    recurso: abierto && !bloqueada ? recursoDeFicha(abierto.codigo, ficha?.titulo) : undefined,
    requisito: { ...requisito, abierto: !!abierto && bloqueada },
  }
}
