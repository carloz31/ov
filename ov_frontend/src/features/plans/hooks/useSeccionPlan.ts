import { useState } from 'react'
import {
  avisoGuardado,
  borradorConocimiento,
  borradorPorQue,
  datosConocimiento,
  datosPorQue,
  origenPaso,
  type BorradorConocimiento,
  type BorradorPorQue,
} from '@/lib/servidor/adaptadoresPlanes'
import {
  borradorPasos,
  borradorRealidad,
  datosPasos,
  datosRealidad,
  type BorradorPasos,
  type BorradorRealidad,
} from '@/lib/servidor/adaptadoresPlanesEdicion'
import { guardarSeccionPlan, planesRefrescados } from '@/store/servidor/planes'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import type {
  CodigoSeccionPlan,
  ErrorServidor,
  GuardarSeccionPlan,
  OpcionesTarjeta,
  PlanCarrera,
} from '@/types/servidor'
import type { AvisoPlan } from './useAccionesPlanes'

// F07a: una sección del plan abierto, en lectura o en edición. Los cambios viven en memoria hasta «Guardar
// sección», que envía la sección entera; «Cancelar» los descarta. Al guardar vuelve a lectura y la sección
// `planes` se vence (llega refrescada). Un 409 de sección bloqueada también vuelve a lectura.
// F07b: REALIDAD y PASOS; el aviso se arma con los planes ya refrescados (§9: sugerencias que esperan).
export function useSeccionPlan(
  plan: PlanCarrera | null,
  opciones: OpcionesTarjeta | null,
  avisar: (a: Omit<AvisoPlan, 'id'>) => void,
) {
  const [editando, setEditando] = useState<CodigoSeccionPlan | null>(null)
  const [porQue, setPorQue] = useState<BorradorPorQue | null>(null)
  const [conocimiento, setConocimiento] = useState<BorradorConocimiento | null>(null)
  const [realidad, setRealidad] = useState<BorradorRealidad | null>(null)
  const [pasos, setPasos] = useState<BorradorPasos | null>(null)
  const [guardando, setGuardando] = useState(false)

  function editar(codigo: CodigoSeccionPlan) {
    if (!plan || !opciones) return
    if (codigo === 'POR_QUE') setPorQue(borradorPorQue(plan))
    if (codigo === 'CONOCIMIENTO') setConocimiento(borradorConocimiento(plan))
    if (codigo === 'REALIDAD') setRealidad(borradorRealidad(plan, opciones))
    if (codigo === 'PASOS') {
      const paso = (numero: number) => plan.pasos.find((p) => p.numero === numero)
      setPasos(borradorPasos(plan, (n) => (paso(n) ? origenPaso(plan, paso(n)!, opciones) : null)))
    }
    setEditando(codigo)
  }

  function cuerpo(): GuardarSeccionPlan | null {
    if (editando === 'POR_QUE' && porQue) return { seccion: 'POR_QUE', datos: datosPorQue(porQue) }
    if (editando === 'CONOCIMIENTO' && conocimiento)
      return { seccion: 'CONOCIMIENTO', datos: datosConocimiento(conocimiento) }
    if (editando === 'REALIDAD' && realidad) return { seccion: 'REALIDAD', datos: datosRealidad(realidad) }
    if (editando === 'PASOS' && pasos) return { seccion: 'PASOS', datos: datosPasos(pasos) }
    return null
  }

  async function guardar() {
    if (!plan || !editando || guardando) return
    const seccion = cuerpo()
    if (!seccion) return
    setGuardando(true)
    const respuesta = await guardarSeccionPlan(plan.carrera.codigo, seccion)
    if (respuesta.tipo === 'ok' || respuesta.tipo === 'guardado_sin_refrescar') {
      const refrescados = await planesRefrescados()
      setGuardando(false)
      setEditando(null)
      const actual = refrescados?.planes.find((p) => p.carrera.codigo === plan.carrera.codigo) ?? null
      avisar({ ...avisoGuardado(seccion.seccion, actual), error: false })
      return
    }
    setGuardando(false)
    avisar({
      titulo: 'No se pudo guardar',
      descripcion: mensajeErrorServidor(respuesta as ErrorServidor),
      error: true,
    })
    if (respuesta.tipo === 'bloqueado') setEditando(null)
  }

  return {
    editando,
    guardando,
    porQue,
    conocimiento,
    realidad,
    pasos,
    cambiarPorQue: (cambio: (b: BorradorPorQue) => BorradorPorQue) => setPorQue((b) => b && cambio(b)),
    cambiarConocimiento: (cambio: (b: BorradorConocimiento) => BorradorConocimiento) =>
      setConocimiento((b) => b && cambio(b)),
    cambiarRealidad: (cambio: (b: BorradorRealidad) => BorradorRealidad) =>
      setRealidad((b) => b && cambio(b)),
    cambiarPasos: (cambio: (b: BorradorPasos) => BorradorPasos) => setPasos((b) => b && cambio(b)),
    editar,
    cancelar: () => setEditando(null),
    guardar,
  }
}
