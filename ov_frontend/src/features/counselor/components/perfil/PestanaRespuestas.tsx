import type { ModeloPerfilEstudiante } from '@/features/counselor/hooks/usePerfilEstudiante'
import { useRespuestasPerfil } from '@/store/servidor/panelEstudiante'
import { EsperaBloque } from './EsperaBloque'
import { ListaRespuestas } from './ListaRespuestas'

// Ajuste respuestas-orientadora §2 (bocetos 17 y 18): los registros por tramo, con su marca, ya ordenados por el
// servidor; los que requieren atención se abren solos y un aviso abre su registro en la pregunta marcada.
export function PestanaRespuestas({ modelo }: { modelo: ModeloPerfilEstudiante }) {
  const { carga, reintentar } = useRespuestasPerfil(modelo.estudiante)
  if (!carga?.datos) return <EsperaBloque carga={carga} onReintentar={reintentar} />
  return <ListaRespuestas datos={carga.datos} modelo={modelo} />
}
