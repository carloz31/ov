import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { appPaths } from '@/routes/paths'
import { cuentaActiva } from '@/store/servidor/cuenta'
import { cargarDetalleEntrevista, useDetalleEntrevista } from '@/store/servidor/entrevistas'
import {
  alternarFavoritoEntrevista,
  eliminarReaccion,
  reaccionarEntrevista,
  reportarContenido,
  retirarEntrevista,
  verEntrevista,
} from '@/store/servidor/investigaciones'
import { useInvestigacionesServidorSeccion } from '@/store/servidor/secciones'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import type { MotivoReporte, ReaccionPublica } from '@/types/servidor'
import { mostrarAvisoInvestigacion } from '../store/avisoInvestigaciones'

export type Reportando = { tipo: 'entrevista' } | { tipo: 'reaccion'; reaccion: ReaccionPublica }
const confirmada = (r: { tipo: string }) => r.tipo === 'ok' || r.tipo === 'guardado_sin_refrescar'

// F09 (bocetos 05–08): el detalle de una entrevista. Abrirlo registra la vista; la propia no lleva estrella ni
// reacción y se puede retirar; reaccionar, reportar y retirar van en pop ups.
export function useEntrevistaDetalle() {
  const { entrevista: codigo = '' } = useParams()
  const [params] = useSearchParams()
  const navegar = useNavigate()
  const detalle = useDetalleEntrevista('entrevista', codigo)
  const seccion = useInvestigacionesServidorSeccion(true)
  const datos = detalle?.datos ?? null
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [reaccionando, setReaccionando] = useState<ReaccionPublica | 'nueva' | null>(null)
  const [reportando, setReportando] = useState<Reportando | null>(null)
  const [eliminando, setEliminando] = useState<ReaccionPublica | null>(null)
  const [retirando, setRetirando] = useState(false)
  const [mostradas, setMostradas] = useState(10)
  const vista = useRef<string | null>(null)
  useEffect(() => {
    if (!datos || datos.propia || datos.vista || vista.current === datos.codigo) return
    vista.current = datos.codigo
    void verEntrevista(datos.codigo)
  }, [datos])

  async function correr<T extends { tipo: string }>(
    clave: string,
    accion: () => Promise<T>,
    exito: string,
    error: string,
  ) {
    setOcupado(clave)
    const respuesta = await accion()
    setOcupado(null)
    if (confirmada(respuesta)) {
      mostrarAvisoInvestigacion(exito)
      return true
    }
    // Retirada o eliminada mientras estaba abierta: ya no existe para nadie.
    if ((respuesta as { tipo: string; estado?: number }).estado === 404) {
      setReaccionando(null)
      setReportando(null)
      setEliminando(null)
      mostrarAvisoInvestigacion(error, 'Esta entrevista ya no está disponible.', true)
      void navegar(appPaths.student.investigations)
      return false
    }
    mostrarAvisoInvestigacion(error, mensajeErrorServidor(respuesta as never), true)
    return false
  }
  const propia = datos?.lista_reacciones.find((r) => r.propia && r.tipo) ?? null
  return {
    codigo,
    cuenta: cuentaActiva(),
    desdeMias: params.get('desde') === 'mias',
    estado: detalle?.estado ?? 'cargando',
    error: detalle?.error ?? null,
    reintentar: () => void cargarDetalleEntrevista('entrevista', codigo),
    datos,
    tipos: seccion.datos?.tipos_reaccion ?? [],
    reaccionPropia: propia,
    reacciones: datos?.lista_reacciones.slice(0, mostradas) ?? [],
    hayMas: (datos?.lista_reacciones.length ?? 0) > mostradas,
    mostrarMas: () => setMostradas((n) => n + 10),
    ocupado,
    alternarFavorito: () =>
      datos &&
      void correr(
        'favorito',
        () => alternarFavoritoEntrevista(datos.codigo, !datos.favorita),
        datos.favorita ? 'Quitada de tus favoritas' : 'Guardada en tus favoritas',
        'No se pudo guardar',
      ),
    reaccionando,
    abrirReaccion: (reaccion?: ReaccionPublica) => setReaccionando(reaccion ?? 'nueva'),
    cerrarReaccion: () => setReaccionando(null),
    reaccionar: async (tipo: string, comentario: string | null) => {
      const ok = await correr(
        'reaccion',
        () => reaccionarEntrevista(codigo, tipo, comentario),
        reaccionando === 'nueva' ? 'Publicaste tu reacción' : 'Reacción actualizada',
        'No se pudo publicar tu reacción',
      )
      if (ok) setReaccionando(null)
    },
    eliminando,
    pedirEliminar: (r: ReaccionPublica | null) => setEliminando(r),
    eliminar: async () => {
      if (!eliminando) return
      if (
        await correr(
          'eliminar',
          () => eliminarReaccion(eliminando.codigo),
          'Reacción eliminada',
          'No se pudo eliminar',
        )
      )
        setEliminando(null)
    },
    reportando,
    abrirReporte: (r: Reportando | null) => setReportando(r),
    reportar: async (motivo: MotivoReporte, detalleTexto: string | null) => {
      if (!reportando) return
      const contenido =
        reportando.tipo === 'entrevista' ? { entrevista: codigo } : { reaccion: reportando.reaccion.codigo }
      const ok = await correr(
        'reporte',
        () => reportarContenido(contenido, motivo, detalleTexto),
        'Reporte enviado',
        'No se pudo enviar el reporte',
      )
      if (ok) setReportando(null)
    },
    retirando,
    setRetirando,
    retirar: async () => {
      const ok = await correr(
        'retirar',
        () => retirarEntrevista(codigo),
        'Entrevista retirada',
        'No se pudo retirar',
      )
      if (!ok) return
      setRetirando(false)
      void navegar(`${appPaths.student.investigations}?vista=mias`)
    },
  }
}
export type ModeloDetalle = ReturnType<typeof useEntrevistaDetalle>
