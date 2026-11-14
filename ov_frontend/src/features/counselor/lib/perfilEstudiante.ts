import { textoInstitucion } from '@/lib/servidor/adaptadoresPanel'
import type { GestionPanel, InstitucionPlanPerfil, TipoFormacion, ZonaPerfil } from '@/types/servidor'
import type { TonoChip } from '../components/perfil/ChipPerfil'

// Ajuste panel-estudiantes · Tonos y textos que comparten los bloques del perfil del estudiante.
export const TONO_ZONA: Record<ZonaPerfil, TonoChip> = {
  FUERTE: 'exito',
  EN_CAMINO: 'neutro',
  POR_TRABAJAR: 'aviso',
}

// «UNMSM · universidad pública».
export function textoInstitucionPerfil(institucion: InstitucionPlanPerfil) {
  const tipo = textoInstitucion(institucion.tipo as TipoFormacion, institucion.gestion as GestionPanel | null)
  return `${institucion.nombre} · ${tipo.toLocaleLowerCase('es')}`
}
