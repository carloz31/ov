import { modoApi } from '@/config/env'
import { sectionIntros } from '@/data/content/guideTexts'
import { canAccessFamilyConversations } from '@/store/adventureStore'
import { useSeccionesServidor } from '@/store/servidor/secciones'
import type { StudentView } from '@/lib/studentViews'
import type { AdventureState } from '@/types/adventure'
import { useStudentOverlays } from '../context/overlayContext'

export type CodigoSeccion = 'DIARIO' | 'CHECK_IN' | 'CATALOGO' | 'PLANES' | 'FAMILIA'
export type AccesoSeccion = {
  bloqueada: boolean
  mensaje?: string
  // Título de la sección para la tarjeta de bloqueo (api).
  nombre?: string
  // Solo api: en lugar de navegar, Lumi explica por qué la sección sigue cerrada.
  explicar?: () => void
}

const presentaciones: Record<CodigoSeccion, StudentView> = {
  DIARIO: 'journal',
  CHECK_IN: 'journal-signals',
  CATALOGO: 'catalog-professions',
  PLANES: 'profile-decisions',
  FAMILIA: 'conversations',
}

// En local, como antes: todo abierto salvo «En familia», que se abre al llegar a la ciudad. No usa hooks.
function useSeccionesLocal(adventure?: AdventureState) {
  return (codigo: CodigoSeccion): AccesoSeccion =>
    codigo === 'FAMILIA' && adventure && !canAccessFamilyConversations(adventure)
      ? { bloqueada: true, mensaje: 'Se abre al llegar a la ciudad' }
      : { bloqueada: false }
}

// En api, el estado sale de GET /cuentas/{c}/secciones.
function useSeccionesApi(_adventure?: AdventureState) {
  const secciones = useSeccionesServidor()
  const { openGuide } = useStudentOverlays()
  return (codigo: CodigoSeccion): AccesoSeccion => {
    const seccion = secciones.datos?.find((s) => s.codigo === codigo)
    if (seccion?.estado !== 'BLOQUEADA') return { bloqueada: false, nombre: seccion?.nombre }
    const mensaje = seccion.bloqueo?.[0]?.mensaje ?? ''
    return {
      bloqueada: true,
      mensaje,
      nombre: seccion.nombre,
      explicar: () =>
        openGuide([...sectionIntros[presentaciones[codigo]], `Todavía no puedes entrar. ${mensaje}`]),
    }
  }
}

// El modo no cambia durante la ejecución: se elige una sola vez, sin hooks condicionales.
export const useSeccionesAcceso = modoApi ? useSeccionesApi : useSeccionesLocal
