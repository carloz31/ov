import { ArrowLeft, Loader2, Star } from 'lucide-react'
import { Link } from 'react-router'
import { PantallaCargaPortal } from '@/components/staff/PantallaCargaPortal'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import type { ModeloPublicacion } from '../../hooks/usePublicacionDetalle'
import { EstadoPublicacionBadges } from './EstadoPublicacionBadges'
import { FichaPublicacion } from './FichaPublicacion'
import { ReaccionesModeradas } from './ReaccionesModeradas'

function Confirmar({
  abierto,
  titulo,
  descripcion,
  ocupado,
  onConfirmar,
  onCerrar,
}: {
  abierto: boolean
  titulo: string
  descripcion: string
  ocupado: boolean
  onConfirmar: () => void
  onCerrar: () => void
}) {
  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && !ocupado && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="outline" className="min-h-11" disabled={ocupado} onClick={onCerrar}>
            Cancelar
          </Button>
          <Button variant="destructive" className="min-h-11" disabled={ocupado} onClick={onConfirmar}>
            {ocupado && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} Eliminar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// F09 (api, boceto 12b): el detalle de una publicación para la orientadora.
export function DetallePublicacion({
  m,
  nombreSalon,
}: {
  m: ModeloPublicacion
  nombreSalon: (codigo: string | null) => string
}) {
  const d = m.datos
  const nombresTipos = Object.fromEntries((d?.tipos_reaccion ?? []).map((t) => [t.codigo, t.nombre]))
  const comentariosReportados = d?.reacciones.filter((r) => r.reportes.length).length ?? 0
  return (
    <div className="min-w-0 space-y-6 p-4 sm:p-6 lg:p-8">
      <Link
        to={m.volver}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Volver a Publicaciones
      </Link>
      {!d ? (
        <PantallaCargaPortal
          enSeccion
          estado={m.estado === 'error' ? 'error' : 'cargando'}
          mensaje={mensajeErrorServidor(m.error)}
          onReintentar={m.reintentar}
        />
      ) : (
        <>
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                Contenido · Publicación
              </p>
              <h1 className="text-2xl font-bold">{d.titulo}</h1>
              <div className="flex flex-wrap items-center gap-2">
                <EstadoPublicacionBadges
                  estado={d.estado}
                  reportes={d.reportes.length}
                  comentarios={comentariosReportados}
                />
                {d.estado !== 'LEYENDA' && (
                  <span className="text-sm text-muted-foreground">
                    Favoritos {d.favoritos} de {d.favoritos_leyenda} para Leyenda
                  </span>
                )}
                {!d.de_sus_salones && (
                  <span className="text-sm text-muted-foreground">Promoción anterior · solo lectura</span>
                )}
              </div>
            </div>
            {m.puedeActuar && (
              <div className="flex flex-wrap gap-3">
                <Button
                  className="min-h-11"
                  variant={m.destacada ? 'default' : 'outline'}
                  disabled={m.ocupado === 'destacar'}
                  onClick={m.destacar}
                >
                  {m.ocupado === 'destacar' ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Star className="size-4" aria-hidden="true" />
                  )}
                  {m.destacada ? 'Quitar destacado' : 'Destacar'}
                </Button>
                <Button
                  variant="outline"
                  className="min-h-11"
                  data-tono="peligro"
                  onClick={() => m.setEliminandoEntrevista(true)}
                >
                  Eliminar entrevista
                </Button>
              </div>
            )}
          </header>
          {d.reportes.length > 0 && m.puedeActuar && (
            <div
              className="flex flex-wrap items-center gap-3 rounded-xl border border-danger-soft bg-danger-soft/40 p-4"
              role="status"
            >
              <span className="font-semibold">
                {d.reportes.length === 1
                  ? 'La entrevista tiene 1 reporte'
                  : `La entrevista tiene ${d.reportes.length} reportes`}
              </span>
              {d.reportes.map((r) => (
                <Button
                  key={r.codigo}
                  variant="outline"
                  className="min-h-11"
                  disabled={m.ocupado === `descartar-${r.codigo}`}
                  onClick={() => m.descartar(r.codigo)}
                >
                  Descartar reporte
                </Button>
              ))}
            </div>
          )}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <FichaPublicacion datos={d} nombreSalon={nombreSalon} nombresTipos={nombresTipos} />
            <ReaccionesModeradas m={m} nombreSalon={nombreSalon} nombresTipos={nombresTipos} />
          </div>
          <p className="text-sm text-muted-foreground">
            Destacar es reversible. Eliminar (entrevista o comentario) pide confirmación; los autores no ven
            quién reportó.
          </p>
        </>
      )}
      <Confirmar
        abierto={m.eliminandoEntrevista}
        titulo="¿Eliminar esta entrevista?"
        descripcion="Dejará de verse para todos, también para sus autores. Si era Leyenda, deja de serlo."
        ocupado={m.ocupado === 'eliminar-entrevista'}
        onConfirmar={() => void m.eliminarEntrevista()}
        onCerrar={() => m.setEliminandoEntrevista(false)}
      />
      <Confirmar
        abierto={!!m.eliminandoComentario}
        titulo="¿Eliminar este comentario?"
        descripcion="Dejará de verse para los autores y el salón. Sus reportes pendientes quedan resueltos."
        ocupado={m.ocupado === 'eliminar-comentario'}
        onConfirmar={() => void m.eliminarComentario()}
        onCerrar={() => m.pedirEliminarComentario(null)}
      />
    </div>
  )
}
