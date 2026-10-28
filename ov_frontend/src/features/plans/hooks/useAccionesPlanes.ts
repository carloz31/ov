import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { appPaths } from '@/routes/paths'
import { crearPlan, eliminarPlan, ordenarPlanes } from '@/store/servidor/planes'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import type { ErrorServidor, PlanCarrera } from '@/types/servidor'

export type AvisoPlan = { id: number; titulo: string; descripcion?: string; error: boolean }
// El aviso que el plan abierto muestra al llegar (crear navega a él; el de Mis planes se desmonta).
export type EstadoNavegacionPlan = { aviso?: Omit<AvisoPlan, 'id'> }

const respondio = (r: { tipo: string }) => r.tipo === 'ok' || r.tipo === 'guardado_sin_refrescar'
const mensajeDe = (r: { tipo: string }) => mensajeErrorServidor(r as ErrorServidor)

// F07a: crear, ordenar y eliminar planes, con el botón ocupado mientras la acción está en vuelo y un aviso al
// terminar (los 409 y 422 traen el mensaje del servidor). El aviso inicial es el que dejó la navegación (un plan
// que ya no existe).
export function useAccionesPlanes() {
  const navigate = useNavigate()
  const inicial = (useLocation().state as EstadoNavegacionPlan | null)?.aviso
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [aviso, setAviso] = useState<AvisoPlan | null>(() => (inicial ? { ...inicial, id: 0 } : null))
  const avisar = (a: Omit<AvisoPlan, 'id'>) => setAviso({ ...a, id: Date.now() })
  const fallo = (r: { tipo: string }) => avisar({ titulo: 'No se pudo guardar', descripcion: mensajeDe(r), error: true })

  async function crear(carrera: string) {
    setOcupado(`crear:${carrera}`)
    const respuesta = await crearPlan(carrera)
    setOcupado(null)
    if (!respondio(respuesta)) return fallo(respuesta)
    const estado: EstadoNavegacionPlan = {
      aviso: { titulo: 'Plan creado.', descripcion: 'Empieza por contar por qué la eliges.', error: false },
    }
    navigate(appPaths.student.plan(carrera, 'POR_QUE'), { state: estado })
  }

  // Sube o baja un plan: envía la permutación completa de carreras (A, B, C).
  async function mover(planes: PlanCarrera[], indice: number, direccion: -1 | 1) {
    const destino = indice + direccion
    if (destino < 0 || destino >= planes.length) return
    const carreras = planes.map((p) => p.carrera.codigo)
    ;[carreras[indice], carreras[destino]] = [carreras[destino], carreras[indice]]
    setOcupado(`mover:${planes[indice].carrera.codigo}`)
    const respuesta = await ordenarPlanes(carreras)
    setOcupado(null)
    if (!respondio(respuesta)) fallo(respuesta)
  }

  async function eliminar(carrera: string) {
    setOcupado(`eliminar:${carrera}`)
    const respuesta = await eliminarPlan(carrera)
    setOcupado(null)
    if (!respondio(respuesta)) return fallo(respuesta)
    avisar({ titulo: 'Plan eliminado', error: false })
  }

  return { ocupado, aviso, cerrarAviso: () => setAviso(null), avisar, crear, mover, eliminar }
}
