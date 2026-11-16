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

// Ajuste panel-orientadora-observaciones §2: la opción elegida de un selector del perfil, resaltada con el color
// principal (el `SegmentedControl` común no pinta `aria-pressed`, y también lo usa el estudiante).
export const SELECTOR_RESALTADO =
  'flex-wrap gap-2 [&>button]:min-h-11 [&>button]:font-semibold [&>button[aria-pressed=true]]:border-primary [&>button[aria-pressed=true]]:bg-primary [&>button[aria-pressed=true]]:text-primary-foreground [&>button[aria-pressed=true]]:hover:bg-primary'
