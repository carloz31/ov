import { useStudentOverlays } from '@/features/adventure/context/overlayContext'
import { guideSteps } from '@/data/content/guideTexts'
import { appPaths } from '@/routes/paths'
import { reintentarSeccion, useConversacionesServidorSeccion } from '@/store/servidor/secciones'
import { guardarCarta, responderConversacion } from '@/store/servidor/conversaciones'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import type { ErrorServidor } from '@/types/servidor'
import { useState } from 'react'
import { textosEstudiante } from '../data/textosFamilia'
import { usaFamiliaServidor } from '../lib/familiaServidor'
import { useAvisoFamilia } from './useAvisoFamilia'
import type { ModeloFamilia, ResultadoAccionFamilia } from '../types'

const rutas = {
  lista: appPaths.student.conversations,
  carta: appPaths.student.conversationLetter,
  regalo: appPaths.student.conversationGift,
  conversacion: appPaths.student.conversation,
  mapa: appPaths.student.missions,
  diario: appPaths.student.journal,
}

// F08: la sección Familia del estudiante en api. Se pide al montar y se revalida cada vez (la cambia el apoderado);
// mientras se vuelve a pedir se conserva lo último leído.
export function useFamiliaEstudiante(): ModeloFamilia {
  const seccion = useConversacionesServidorSeccion(usaFamiliaServidor())
  const { openGuide } = useStudentOverlays()
  const [enviando, setEnviando] = useState<string | null>(null)
  const avisos = useAvisoFamilia()
  const textos = textosEstudiante()

  async function ejecutar(clave: string, accion: () => Promise<{ tipo: string }>): Promise<ResultadoAccionFamilia> {
    setEnviando(clave)
    const respuesta = await accion()
    setEnviando(null)
    return respuesta.tipo === 'ok' || respuesta.tipo === 'guardado_sin_refrescar'
      ? { ok: true }
      : { ok: false, mensaje: mensajeErrorServidor(respuesta as ErrorServidor) }
  }

  return {
    rol: 'estudiante',
    textos,
    datos: seccion.datos,
    estado: seccion.datos ? 'listo' : seccion.estado === 'error' ? 'error' : 'cargando',
    mensajeError: seccion.estado === 'error' ? mensajeErrorServidor(seccion.error) : undefined,
    reintentar: () => void reintentarSeccion('conversaciones'),
    enviando,
    guardarCarta: (texto) => ejecutar('carta', () => guardarCarta(texto)),
    responder: (codigo, texto) => ejecutar(codigo, () => responderConversacion(codigo, texto)),
    rutas,
    abrirAyuda: () => openGuide(guideSteps.conversations),
    abrirIdeas: () => openGuide(textos.ideas),
    ...avisos,
  }
}
