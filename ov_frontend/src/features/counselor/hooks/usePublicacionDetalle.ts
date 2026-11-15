import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { appPaths } from '@/routes/paths'
import { cargarDetalleEntrevista, useDetalleEntrevista } from '@/store/servidor/entrevistas'
import {
  comentarEntrevista,
  descartarReporte,
  destacarEntrevista,
  eliminarReaccion,
  mostrarEntrevista,
  ocultarEntrevista,
} from '@/store/servidor/investigaciones'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import type { ReaccionModerada, RespuestaAccion, RespuestaServidor } from '@/types/servidor'
import { mostrarAvisoPublicacion } from '../store/avisoPublicaciones'

// F09 (api, boceto 12b · HU-064): el detalle de una publicación para la orientadora. Destacar es reversible;
// eliminar un comentario pide confirmación; descartar un reporte lo cierra sin tocar el contenido. Ajuste
// panel-entrevistas-configuracion: ocultar (con confirmación) y volver a mostrar reemplazan a eliminar la entrevista;
// mientras está oculta solo se puede leer y volver a mostrar.
export function usePublicacionDetalle() {
  const { interviewId: codigo = '' } = useParams()
  const [params] = useSearchParams()
  const detalle = useDetalleEntrevista('publicacion', codigo)
  const datos = detalle?.datos ?? null
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [comentario, setComentario] = useState('')
  const [editando, setEditando] = useState<ReaccionModerada | null>(null)
  const [eliminandoComentario, setEliminandoComentario] = useState<ReaccionModerada | null>(null)
  const [ocultandoEntrevista, setOcultandoEntrevista] = useState(false)
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
  const oculta = datos?.estado === 'OCULTA'
  return {
    codigo,
    volver,
    estado: detalle?.estado ?? 'cargando',
    error: detalle?.error ?? null,
    reintentar: () => void cargarDetalleEntrevista('publicacion', codigo),
    datos,
    destacada,
    oculta,
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
    ocultandoEntrevista,
    setOcultandoEntrevista,
    // Se queda en el detalle: la orientadora la sigue viendo y puede volver a mostrarla.
    ocultarEntrevista: async () => {
      if (
        await correr(
          'ocultar-entrevista',
          () => ocultarEntrevista(codigo),
          'Entrevista oculta',
          'Los estudiantes ya no la ven.',
        )
      )
        setOcultandoEntrevista(false)
    },
    mostrar: () =>
      void correr(
        'mostrar-entrevista',
        () => mostrarEntrevista(codigo),
        'Entrevista visible otra vez',
        'Vuelve sin destacar, con sus favoritos y reacciones.',
      ),
    eliminandoComentario,
    pedirEliminarComentario: (r: ReaccionModerada | null) => setEliminandoComentario(r),
    eliminarComentario: async () => {
      if (!eliminandoComentario) return
      if (
        await correr(
          'eliminar-comentario',
          () => eliminarReaccion(eliminandoComentario.codigo),
          'Comentario eliminado',
        )
      )
        setEliminandoComentario(null)
    },
    descartar: (reporte: string) =>
      void correr(`descartar-${reporte}`, () => descartarReporte(reporte), 'Reporte descartado'),
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
