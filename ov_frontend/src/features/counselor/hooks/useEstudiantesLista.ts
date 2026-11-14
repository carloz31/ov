import { useSearchParams } from 'react-router'
import { appPaths } from '@/routes/paths'
import { datosSesion } from '@/store/accesoStore'
import { useListaEstudiantes } from '@/store/servidor/panelEstudiante'
import { TODOS_LOS_SALONES } from './usePanelSalon'

export type ColumnaLista = 'estudiante' | 'tramo' | 'test' | 'plan_a' | 'ingreso' | 'avisos'
export const COLUMNAS_LISTA: ColumnaLista[] = ['estudiante', 'tramo', 'test', 'plan_a', 'ingreso', 'avisos']

// Ajuste panel-estudiantes §4 (api): la lista «Estudiantes». Salón (`?salon=`, «all» para todos), buscador
// (`?q=`), aviso, estado del test, acceso rápido y orden viven en la URL; el perfil la recibe para «Volver».
export function useEstudiantesLista() {
  const [params, setParams] = useSearchParams()
  const salones = datosSesion().salones
  const principal = salones.find((s) => s.es_principal)?.codigo ?? salones[0]?.codigo ?? TODOS_LOS_SALONES
  const pedido = params.get('salon')
  const salon = pedido === TODOS_LOS_SALONES || salones.some((s) => s.codigo === pedido) ? pedido! : principal
  const orden = params.get('orden') ?? ''
  const filtros = {
    salon: salon === TODOS_LOS_SALONES ? '' : salon,
    buscar: params.get('q') ?? '',
    aviso: params.get('aviso') ?? '',
    test: params.get('test') ?? '',
    acceso: params.get('acceso') ?? '',
    orden,
  }
  const { lista, mostrarMas, reintentar } = useListaEstudiantes(filtros)

  const cambiar = (cambios: Record<string, string>) =>
    setParams(
      (actuales) => {
        const siguientes = new URLSearchParams(actuales)
        Object.entries(cambios).forEach(([clave, valor]) =>
          valor ? siguientes.set(clave, valor) : siguientes.delete(clave),
        )
        return siguientes
      },
      { replace: true },
    )
  const columnaActiva = (orden.replace(/^-/, '') || 'avisos') as ColumnaLista
  return {
    salones,
    salon,
    nombreSalon:
      salon === TODOS_LOS_SALONES
        ? 'Todos mis salones'
        : (salones.find((s) => s.codigo === salon)?.nombre ?? salon),
    filtros,
    lista,
    mostrarMas,
    reintentar,
    elegirSalon: (codigo: string) => cambiar({ salon: codigo }),
    buscar: (texto: string) => cambiar({ q: texto }),
    elegirAviso: (codigo: string) => cambiar({ aviso: codigo }),
    elegirTest: (estado: string) => cambiar({ test: estado }),
    elegirAcceso: (codigo: string) => cambiar({ acceso: codigo === 'todos' ? '' : codigo }),
    columnaActiva,
    descendente: orden.startsWith('-'),
    // Pulsar una cabecera ordena por ella; otra vez, invierte.
    ordenar: (columna: ColumnaLista) =>
      cambiar({ orden: columnaActiva === columna && !orden.startsWith('-') ? `-${columna}` : columna }),
    enlacePerfil: (codigo: string) => appPaths.counselor.student(codigo),
    // Lo que el perfil necesita para volver a esta misma lista.
    consulta: params.toString(),
  }
}
export type ModeloEstudiantesLista = ReturnType<typeof useEstudiantesLista>
