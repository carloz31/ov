import { modoApi } from '@/config/env'
import { cerrarRecurso, useRecursoAbierto } from '@/store/visorRecursoStore'
import { useFichasServidor } from '@/store/servidor/secciones'
import { useEstadoServidor } from '@/store/servidor/sesion'
import { fichaServidor, recursoDeFicha } from '../lib/travelerResources'
import { useRequisitoRecurso } from './useRequisitoRecurso'

// F04d: lo que abre el modal de ficha sobre una actividad. En api, una ficha bloqueada abre el pop up de
// requisito y una obtenida trae su contenido del servidor (ajuste mochila); mientras se piden las fichas, el
// modal muestra su esqueleto. Una ficha que el servidor no lista sale del catálogo del front.
export function useVisorRecursoHost() {
  const abierto = useRecursoAbierto()
  const fichas = useFichasServidor(!!abierto)
  const servidor = useEstadoServidor()
  const ficha = modoApi ? servidor.fichas.datos?.find((f) => f.codigo === abierto?.codigo) : undefined
  const bloqueada = ficha?.estado === 'BLOQUEADA'
  const cargando = modoApi && !ficha && (fichas.estado === 'sin_cargar' || fichas.estado === 'cargando')
  const requisito = useRequisitoRecurso(abierto && bloqueada ? abierto.codigo : null)
  return {
    cerrar: cerrarRecurso,
    abierto: !!abierto && !bloqueada,
    cargando,
    recurso: !abierto || bloqueada ? undefined : ficha ? fichaServidor(ficha) : recursoDeFicha(abierto.codigo),
    requisito: { ...requisito, abierto: !!abierto && bloqueada },
  }
}
