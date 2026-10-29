import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { appPaths } from '@/routes/paths'
import { cargarDetalleEntrevista, useDetalleEntrevista } from '@/store/servidor/entrevistas'
import {
  comentarEntrevista,
  descartarReporte,
  destacarEntrevista,
  eliminarEntrevista,
  eliminarReaccion,
} from '@/store/servidor/investigaciones'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import type { ReaccionModerada, RespuestaAccion, RespuestaServidor } from '@/types/servidor'
import { mostrarAvisoPublicacion } from '../store/avisoPublicaciones'

// F09 (api, boceto 12b · HU-064): el detalle de una publicación para la orientadora. Destacar es reversible;
// eliminar (entrevista o comentario) pide confirmación; descartar un reporte lo cierra sin tocar el contenido.
export function usePublicacionDetalle() {
  const { interviewId: codigo = '' } = useParams()
  const [params] = useSearchParams()
  const navegar = useNavigate()
  const detalle = useDetalleEntrevista('publicacion', codigo)
  const datos = detalle?.datos ?? null
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [comentario, setComentario] = useState('')
  const [editando, setEditando] = useState<ReaccionModerada | null>(null)
  const [eliminandoComentario, setEliminandoComentario] = useState<ReaccionModerada | null>(null)
  const [eliminandoEntrevista, setEliminandoEntrevista] = useState(false)
  const salon = params.get('salon')
  const volver = `${appPaths.counselor.publications}${salon ? `?salon=${salon}` : ''}`

  async function correr(
    clave: string,
    accion: () => Promise<RespuestaServidor<RespuestaAccion>>,
    exito: string,
    descripcion?: string,
  ) {
    setOcupado(clave)
    const respuesta = await accion()
    setOcupado(null)
    if (respuesta.tipo === 'ok') mostrarAvisoPublicacion(exito, descripcion)
    else mostrarAvisoPublicacion('No se pudo completar', mensajeErrorServidor(respuesta), true)
    return respuesta.tipo === 'ok'
  }
  const destacada = datos?.estado === 'DESTACADA' || datos?.estado === 'LEYENDA'
  return {
    codigo,
    volver,
    estado: detalle?.estado ?? 'cargando',
    error: detalle?.error ?? null,
    reintentar: () => void cargarDetalleEntrevista('publicacion', codigo),
    datos,
    destacada,
    // Solo actúa sobre las de sus salones; una Leyenda de otro salón es de lectura.
    puedeActuar: !!datos?.de_sus_salones,
    ocupado,
    destacar: () =>
      void correr(
        'destacar',
        () => destacarEntrevista(codigo, !destacada),
        destacada ? 'Destacado quitado' : 'Entrevista destacada',
        destacada ? undefined : 'Sus autores lo verán en su camino a Leyenda.',
      ),
    eliminandoEntrevista,
    setEliminandoEntrevista,
    eliminarEntrevista: async () => {
      if (await correr('eliminar-entrevista', () => eliminarEntrevista(codigo), 'Entrevista eliminada')) {
        setEliminandoEntrevista(false)
        void navegar(volver)
      }
    },
    eliminandoComentario,
    pedirEliminarComentario: (r: ReaccionModerada | null) => setEliminandoComentario(r),
    eliminarComentario: async () => {
      if (!eliminandoComentario) return
      if (await correr('eliminar-comentario', () => eliminarReaccion(eliminandoComentario.codigo), 'Comentario eliminado'))
        setEliminandoComentario(null)
    },
    descartar: (reporte: string) => void correr(`descartar-${reporte}`, () => descartarReporte(reporte), 'Reporte descartado'),
    comentario,
    setComentario,
    editando,
    editar: (r: ReaccionModerada | null) => {
      setEditando(r)
      setComentario(r?.comentario ?? '')
    },
    comentar: async () => {
      if (!comentario.trim()) return
      const ok = await correr(
        'comentar',
        () => comentarEntrevista(codigo, comentario.trim(), editando?.codigo),
        editando ? 'Comentario actualizado' : 'Comentario publicado',
      )
      if (ok) {
        setComentario('')
        setEditando(null)
      }
    },
  }
}
export type ModeloPublicacion = ReturnType<typeof usePublicacionDetalle>
