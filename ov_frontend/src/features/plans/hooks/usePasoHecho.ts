import { useState } from 'react'
import { marcarPasoHecho } from '@/store/servidor/planes'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import type { ErrorServidor, PasoPublico } from '@/types/servidor'
import type { AvisoPlan } from './useAccionesPlanes'

// F07b (§8): «Lo hice» desde la lectura de PASOS. Abre el diálogo y envía `paso-hecho` al instante, sin pasar por
// «Guardar sección»; el diálogo queda ocupado hasta la respuesta.
export function usePasoHecho(carrera: string, avisar: (a: Omit<AvisoPlan, 'id'>) => void) {
  const [paso, setPaso] = useState<PasoPublico | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(hallazgo: string | null) {
    if (!paso || enviando) return
    setEnviando(true)
    const respuesta = await marcarPasoHecho(carrera, paso.numero, hallazgo)
    setEnviando(false)
    setPaso(null)
    if (respuesta.tipo === 'ok' || respuesta.tipo === 'guardado_sin_refrescar')
      avisar({ titulo: 'Paso hecho.', descripcion: 'Si tenía una duda, ya quedó resuelta.', error: false })
    else
      avisar({
        titulo: 'No se pudo guardar',
        descripcion: mensajeErrorServidor(respuesta as ErrorServidor),
        error: true,
      })
  }

  return { paso, enviando, abrir: setPaso, cerrar: () => setPaso(null), enviar }
}
