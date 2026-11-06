import { modoApi } from '@/config/env'
import { pasosBloqueo } from '@/data/content/guideTexts'
import { canAccessFamilyConversations } from '@/store/adventureStore'
import { useEstadoServidor } from '@/store/servidor/sesion'
import type { AdventureState } from '@/types/adventure'

export type CodigoSeccion = 'DIARIO' | 'CHECK_IN' | 'CATALOGO' | 'PLANES' | 'FAMILIA' | 'INVESTIGACIONES'
export type AccesoSeccion = {
  bloqueada: boolean
  mensaje?: string
  // Título de la sección para la tarjeta de bloqueo (api).
  nombre?: string
  // Solo api: en lugar de navegar, la ayuda de Lumi con estos pasos explica qué falta.
  pasos?: string[]
}

// Estado de las secciones del perfil. El modo se decide al llamar, con los mismos hooks en ambos:
// en api sale de GET /cuentas/{c}/secciones (se carga al ingresar, con el resumen y las actividades);
// en local, como antes, todo abierto salvo «En familia», que se abre al llegar a la ciudad.
export function useSeccionesAcceso(adventure?: AdventureState) {
  const secciones = useEstadoServidor().secciones
  return (codigo: CodigoSeccion): AccesoSeccion => {
    if (!modoApi)
      return codigo === 'FAMILIA' && adventure && !canAccessFamilyConversations(adventure)
        ? { bloqueada: true, mensaje: 'Se abre al llegar a la ciudad' }
        : { bloqueada: false }
    const seccion = secciones.datos?.find((s) => s.codigo === codigo)
    if (seccion?.estado !== 'BLOQUEADA') return { bloqueada: false, nombre: seccion?.nombre }
    const mensaje = seccion.bloqueo?.[0]?.mensaje ?? ''
    return { bloqueada: true, mensaje, nombre: seccion.nombre, pasos: pasosBloqueo(codigo, mensaje) }
  }
}
