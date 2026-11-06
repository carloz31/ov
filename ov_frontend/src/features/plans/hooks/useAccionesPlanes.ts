import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { appPaths } from '@/routes/paths'
import { seccionSiguiente } from '@/lib/servidor/adaptadoresPlanes'
import { crearPlan, eliminarPlan, ordenarPlanes, planesRefrescados } from '@/store/servidor/planes'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import type { ErrorServidor, PlanCarrera } from '@/types/servidor'

// F07b: `etiqueta` y `destacado` (estrella) para el aviso de sugerencias al guardar 2 y 3.
export type AvisoPlan = {
  id: number
  titulo: string
  descripcion?: string
  error: boolean
  etiqueta?: string
  destacado?: boolean
}
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
  const fallo = (r: { tipo: string }) =>
    avisar({ titulo: 'No se pudo guardar', descripcion: mensajeDe(r), error: true })

  async function crear(carrera: string) {
    setOcupado(`crear:${carrera}`)
    const respuesta = await crearPlan(carrera)
    if (!respondio(respuesta)) {
      setOcupado(null)
      return fallo(respuesta)
    }
    // Ajuste F07b: si la carrera tuvo un plan eliminado, vuelve con lo suyo y se abre donde iba.
    const plan = (await planesRefrescados())?.planes.find((p) => p.carrera.codigo === carrera)
    setOcupado(null)
    const recuperado = !!plan?.secciones.some((s) => s.guardada_en)
    const estado: EstadoNavegacionPlan = {
      aviso: recuperado
        ? { titulo: 'Plan recuperado.', descripcion: 'Volvió con lo que habías escrito.', error: false }
        : { titulo: 'Plan creado.', descripcion: 'Empieza por contar por qué la eliges.', error: false },
    }
    navigate(appPaths.student.plan(carrera, recuperado && plan ? seccionSiguiente(plan) : 'POR_QUE'), {
      state: estado,
    })
  }

  // Ajuste de Mis planes: «Subir prioridad» cambia el plan con el de arriba (C sube a B, B sube a A).
  async function subir(planes: PlanCarrera[], carrera: string) {
    const i = planes.findIndex((p) => p.carrera.codigo === carrera)
    if (i < 1) return
    const carreras = planes.map((p) => p.carrera.codigo)
    ;[carreras[i - 1], carreras[i]] = [carreras[i], carreras[i - 1]]
    setOcupado(`ordenar:${carrera}`)
    const respuesta = await ordenarPlanes(carreras)
    setOcupado(null)
    if (!respondio(respuesta)) return fallo(respuesta)
    avisar({ titulo: `${planes[i].carrera.nombre} ahora es tu plan ${'ABC'[i - 1]}`, error: false })
  }

  async function eliminar(carrera: string) {
    setOcupado(`eliminar:${carrera}`)
    const respuesta = await eliminarPlan(carrera)
    setOcupado(null)
    if (!respondio(respuesta)) return fallo(respuesta)
    avisar({
      titulo: 'Plan eliminado',
      descripcion: 'Si lo vuelves a crear, recuperas lo que escribiste.',
      error: false,
    })
  }

  return { ocupado, aviso, cerrarAviso: () => setAviso(null), avisar, crear, subir, eliminar }
}
