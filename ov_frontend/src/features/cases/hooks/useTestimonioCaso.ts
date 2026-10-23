import { useEffect, useState } from 'react'
import { modoApi } from '@/config/env'
import { testimonioLocal } from '@/features/backpack/lib/travelerResources'
import { professionalTestimonials } from '@/data/catalog/occupations'
import { consultarTestimonios } from '@/store/servidor/testimonios'
import type { AdventureState } from '@/types/adventure'

export type TestimonioCaso = {
  codigo: string
  nombre?: string
  rol?: string
  titulo: string
  cita: string
  regalo: string
}

// Ajustes Central (7): el testimonio que regala el caso, para su cierre. En api, el del servidor cuyo caso es esta
// actividad, si ya está disponible; en local, el del prototipo si el caso está superado. Sin testimonio, nada.
export function useTestimonioCaso(
  activo: boolean,
  adventure: Pick<AdventureState, 'solvedCaseIds'>,
  actividad?: string,
): TestimonioCaso | undefined {
  const [servidor, setServidor] = useState<TestimonioCaso>()
  useEffect(() => {
    if (!modoApi || !activo || !actividad) return
    let vigente = true
    void consultarTestimonios().then((respuesta) => {
      if (!vigente || respuesta.tipo !== 'ok') return
      const t = respuesta.datos.find((d) => d.caso?.codigo === actividad && d.estado === 'DISPONIBLE')
      setServidor(
        t && {
          codigo: t.codigo,
          nombre: t.persona ?? undefined,
          rol: t.ocupacion?.titulo,
          titulo: t.titulo,
          cita: t.cita ?? '',
          regalo: t.caso?.titulo ?? '',
        },
      )
    })
    return () => {
      vigente = false
    }
  }, [activo, actividad])
  if (modoApi) return activo ? servidor : undefined
  const local = professionalTestimonials.find((t) => t.unlockCaseId === 'forest-fire')
  const recurso = local && testimonioLocal(local.id)
  if (!activo || !local || !recurso || !adventure.solvedCaseIds.includes('forest-fire')) return undefined
  return {
    codigo: local.id,
    nombre: local.personName,
    rol: local.currentRole,
    titulo: recurso.title,
    cita: local.summary,
    regalo: 'Incendio forestal',
  }
}
