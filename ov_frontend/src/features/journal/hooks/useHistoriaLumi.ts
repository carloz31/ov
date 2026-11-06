import { modoApi } from '@/config/env'
import { useEstadoServidor } from '@/store/servidor/sesion'
import { useStudentUi } from '@/store/studentUiStore'
import { actividadPorContenido } from '@/lib/servidor/contenidos'
import { capitulosLumi } from '@/features/journal/data/capitulosLumi'
import { lumiMemoryThresholds, type LumiBond } from '@/features/journal/lib/lumiBond'
import type { Actividad } from '@/types/activities'

export type CapituloLumi = {
  numero: number
  codigo: string
  titulo: string
  desbloqueado: boolean
  // Desbloqueado y todavía sin ver: la historia lo destaca hasta que el estudiante lo abre.
  nuevo: boolean
  // Cartas que lo abren: en api, el `requerido` de su condición de desbloqueo; en local, el umbral de la amistad.
  requisito?: number
}

// Ajuste del diario (F05): los capítulos de la historia de Lumi. En api son las actividades del bloque LUMI (sin
// efectos: `actividades` ya llega con el ingreso) y uno es nuevo mientras no esté completado; en local, los mismos
// contenidos con la amistad local, y uno es nuevo mientras no esté en `seenLumiMemories`.
export function useHistoriaLumi(bond: LumiBond) {
  const activo = modoApi
  const bloques = useEstadoServidor().actividades.datos
  const vistos = useStudentUi().seenLumiMemories
  const capitulos: CapituloLumi[] = activo
    ? (bloques?.find((b) => b.espacio === 'LUMI')?.actividades ?? []).map((a, indice) => ({
        numero: indice + 1,
        codigo: a.codigo,
        titulo: a.titulo,
        desbloqueado: a.estado !== 'BLOQUEADA',
        nuevo: a.estado === 'DISPONIBLE' || a.estado === 'EN_CURSO',
        requisito: a.bloqueo?.[0]?.condiciones_faltantes[0]?.requerido,
      }))
    : capitulosLumi.map((c, indice) => {
        const desbloqueado = bond.conversations >= lumiMemoryThresholds[indice]
        return {
          numero: indice + 1,
          codigo: c.id,
          titulo: c.titulo,
          desbloqueado,
          nuevo: desbloqueado && !vistos.includes(indice + 1),
          requisito: lumiMemoryThresholds[indice],
        }
      })
  return {
    capitulos,
    siguienteRecuerdo: capitulos.find((c) => !c.desbloqueado)?.titulo,
    actividad: (codigo: string): Actividad | undefined =>
      activo ? actividadPorContenido(bloques, codigo) : capitulosLumi.find((c) => c.id === codigo),
    esRecuerdo: (codigo: string) => capitulos.some((c) => c.codigo === codigo),
  }
}
