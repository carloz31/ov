import { useState } from 'react'
import {
  borradorConocimiento,
  borradorPorQue,
  datosConocimiento,
  datosPorQue,
  type BorradorConocimiento,
  type BorradorPorQue,
} from '@/lib/servidor/adaptadoresPlanes'
import { guardarSeccionPlan } from '@/store/servidor/planes'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import type { CodigoSeccionPlan, ErrorServidor, PlanCarrera } from '@/types/servidor'
import type { AvisoPlan } from './useAccionesPlanes'

const AVISOS: Partial<Record<CodigoSeccionPlan, Omit<AvisoPlan, 'id'>>> = {
  POR_QUE: { titulo: 'Lo anoté.', descripcion: 'Volverá cuando compares tus planes.', error: false },
  CONOCIMIENTO: { titulo: 'Guardado.', descripcion: 'Tus dudas quedaron anotadas.', error: false },
}

// F07a: una sección del plan abierto, en lectura o en edición. Los cambios viven en memoria hasta «Guardar
// sección», que envía la sección entera; «Cancelar» los descarta. Al guardar vuelve a lectura y la sección
// `planes` se vence (llega refrescada). Un 409 de sección bloqueada también vuelve a lectura.
export function useSeccionPlan(plan: PlanCarrera | null, avisar: (a: Omit<AvisoPlan, 'id'>) => void) {
  const [editando, setEditando] = useState<CodigoSeccionPlan | null>(null)
  const [porQue, setPorQue] = useState<BorradorPorQue | null>(null)
  const [conocimiento, setConocimiento] = useState<BorradorConocimiento | null>(null)
  const [guardando, setGuardando] = useState(false)

  function editar(codigo: CodigoSeccionPlan) {
    if (!plan) return
    if (codigo === 'POR_QUE') setPorQue(borradorPorQue(plan))
    if (codigo === 'CONOCIMIENTO') setConocimiento(borradorConocimiento(plan))
    setEditando(codigo)
  }

  async function guardar() {
    if (!plan || !editando || guardando) return
    const seccion =
      editando === 'POR_QUE' && porQue
        ? ({ seccion: 'POR_QUE', datos: datosPorQue(porQue) } as const)
        : editando === 'CONOCIMIENTO' && conocimiento
          ? ({ seccion: 'CONOCIMIENTO', datos: datosConocimiento(conocimiento) } as const)
          : null
    if (!seccion) return
    setGuardando(true)
    const respuesta = await guardarSeccionPlan(plan.carrera.codigo, seccion)
    setGuardando(false)
    if (respuesta.tipo === 'ok' || respuesta.tipo === 'guardado_sin_refrescar') {
      setEditando(null)
      const aviso = AVISOS[seccion.seccion]
      if (aviso) avisar(aviso)
      return
    }
    avisar({ titulo: 'No se pudo guardar', descripcion: mensajeErrorServidor(respuesta as ErrorServidor), error: true })
    if (respuesta.tipo === 'bloqueado') setEditando(null)
  }

  return {
    editando,
    guardando,
    porQue,
    conocimiento,
    cambiarPorQue: (cambio: (b: BorradorPorQue) => BorradorPorQue) => setPorQue((b) => b && cambio(b)),
    cambiarConocimiento: (cambio: (b: BorradorConocimiento) => BorradorConocimiento) =>
      setConocimiento((b) => b && cambio(b)),
    editar,
    cancelar: () => setEditando(null),
    guardar,
  }
}
