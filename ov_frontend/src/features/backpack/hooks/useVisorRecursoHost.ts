import { useEffect, useState } from 'react'
import { modoApi } from '@/config/env'
import { cerrarRecurso, useRecursoAbierto } from '@/store/visorRecursoStore'
import { useFichasServidor } from '@/store/servidor/secciones'
import { useEstadoServidor } from '@/store/servidor/sesion'
import { consultarTestimonios, verTestimonio } from '@/store/servidor/testimonios'
import type { TestimonioEstado } from '@/types/servidor'
import { recursoDeFicha, testimonioLocal, testimonioServidor } from '../lib/travelerResources'
import { useRequisitoRecurso } from './useRequisitoRecurso'

// F04d: lo que abre el visor sobre una actividad. En api, una ficha bloqueada abre el pop up de requisito;
// el título y el estado los da el servidor y el contenido, el catálogo del front.
export function useVisorRecursoHost() {
  const abierto = useRecursoAbierto()
  useFichasServidor(!!abierto && !abierto.testimonio)
  // Ajustes Central (7): un testimonio abierto desde el cierre del caso se lee del servidor y registra su vista.
  const codigoTestimonio = abierto?.testimonio ? abierto.codigo : undefined
  const [testimonio, setTestimonio] = useState<TestimonioEstado>()
  useEffect(() => {
    setTestimonio(undefined)
    if (!modoApi || !codigoTestimonio) return
    let vigente = true
    void consultarTestimonios().then((respuesta) => {
      if (!vigente || respuesta.tipo !== 'ok') return
      setTestimonio(respuesta.datos.find((t) => t.codigo === codigoTestimonio && t.estado === 'DISPONIBLE'))
    })
    void verTestimonio(codigoTestimonio)
    return () => {
      vigente = false
    }
  }, [codigoTestimonio])
  const servidor = useEstadoServidor()
  const ficha =
    modoApi && !codigoTestimonio
      ? servidor.fichas.datos?.find((f) => f.codigo === abierto?.codigo)
      : undefined
  const bloqueada = ficha?.estado === 'BLOQUEADA'
  const requisito = useRequisitoRecurso(abierto && bloqueada ? abierto.codigo : null)
  return {
    cerrar: cerrarRecurso,
    modo: abierto?.modo ?? 'mochila',
    recurso: codigoTestimonio
      ? modoApi
        ? testimonio && testimonioServidor(testimonio)
        : testimonioLocal(codigoTestimonio)
      : abierto && !bloqueada
        ? recursoDeFicha(abierto.codigo, ficha?.titulo)
        : undefined,
    requisito: { ...requisito, abierto: !!abierto && bloqueada },
  }
}
