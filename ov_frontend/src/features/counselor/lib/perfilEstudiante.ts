import { textoInstitucion } from '@/lib/servidor/adaptadoresPanel'
import type {
  CambioAfirmacion,
  CambioPerfil,
  GestionPanel,
  InstitucionPlanPerfil,
  TipoFormacion,
  ZonaPerfil,
} from '@/types/servidor'
import type { TonoChip } from '../components/perfil/ChipPerfil'

// Ajuste panel-estudiantes · Tonos y textos que comparten los bloques del perfil del estudiante.
export const TONO_ZONA: Record<ZonaPerfil, TonoChip> = {
  FUERTE: 'exito',
  EN_CAMINO: 'neutro',
  POR_TRABAJAR: 'aviso',
}
export const TONO_CAMBIO: Record<CambioPerfil, TonoChip> = { SUBIO: 'exito', IGUAL: 'neutro', BAJO: 'aviso' }
// Ajuste color-partida-llegada: bajó y sigue baja en ámbar; mejoró en verde; igual, neutro.
export const TONO_CAMBIO_AFIRMACION: Record<CambioAfirmacion, TonoChip> = {
  BAJO: 'aviso',
  SIGUE_BAJA: 'aviso',
  MEJORO: 'exito',
  IGUAL: 'neutro',
}

// «UNMSM · universidad pública».
export function textoInstitucionPerfil(institucion: InstitucionPlanPerfil) {
  const tipo = textoInstitucion(institucion.tipo as TipoFormacion, institucion.gestion as GestionPanel | null)
  return `${institucion.nombre} · ${tipo.toLocaleLowerCase('es')}`
}
