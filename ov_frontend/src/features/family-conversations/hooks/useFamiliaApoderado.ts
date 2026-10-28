import { appPaths } from '@/routes/paths'
import {
  elegirHijo,
  guardarCartaApoderado,
  hijosApoderado,
  reintentarConversacionesApoderado,
  responderConversacionApoderado,
  useConversacionesApoderadoSeccion,
} from '@/store/servidor/apoderadoConversaciones'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import type { ErrorServidor, RespuestaServidor } from '@/types/servidor'
import { useState } from 'react'
import { textosApoderado } from '../data/textosFamilia'
import { usaFamiliaServidor } from '../lib/familiaServidor'
import type { ModeloFamilia, ResultadoAccionFamilia } from '../types'
import { useAvisoFamilia } from './useAvisoFamilia'

const rutas = {
  lista: appPaths.parent.conversations,
  carta: appPaths.parent.conversationLetter,
  regalo: appPaths.parent.conversationGift,
  conversacion: appPaths.parent.conversation,
}

const resultado = (respuesta: RespuestaServidor<unknown>): ResultadoAccionFamilia =>
  respuesta.tipo === 'ok'
    ? { ok: true }
    : { ok: false, mensaje: mensajeErrorServidor(respuesta as ErrorServidor) }

// F08: Conversaciones del apoderado en api, por hijo (el activo se conserva al navegar). Con la sección cerrada,
// el servidor responde 409 y la vista muestra el bloqueo (A1). Las ideas de la carta se abren en la guía para familias.
export function useFamiliaApoderado() {
  const { hijo, seccion, enviando } = useConversacionesApoderadoSeccion(usaFamiliaServidor())
  const hijos = hijosApoderado()
  const nombre = hijos.find((h) => h.codigo === hijo)?.nombre ?? ''
  const avisos = useAvisoFamilia()
  const [ideasAbiertas, setIdeasAbiertas] = useState(false)
  const bloqueada = seccion.estado === 'error' && seccion.error?.tipo === 'bloqueado'
  const modelo: ModeloFamilia = {
    rol: 'apoderado',
    textos: textosApoderado(nombre),
    datos: seccion.datos,
    estado: seccion.datos ? 'listo' : seccion.estado === 'error' ? 'error' : 'cargando',
    mensajeError: seccion.estado === 'error' ? mensajeErrorServidor(seccion.error) : undefined,
    reintentar: () => void reintentarConversacionesApoderado(),
    enviando,
    guardarCarta: async (texto) => resultado(await guardarCartaApoderado(texto)),
    responder: async (codigo, texto) => resultado(await responderConversacionApoderado(codigo, texto)),
    rutas,
    abrirAyuda: null,
    abrirIdeas: () => setIdeasAbiertas(true),
    ...avisos,
  }
  return {
    m: modelo,
    bloqueada,
    hijos,
    hijo,
    elegirHijo,
    ideasAbiertas,
    cerrarIdeas: () => setIdeasAbiertas(false),
  }
}
