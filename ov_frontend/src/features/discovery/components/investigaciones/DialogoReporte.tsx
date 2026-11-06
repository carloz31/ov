import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { useReturnFocus } from '@/hooks/useReturnFocus'
import { MOTIVOS_REPORTE } from '@/lib/servidor/adaptadoresInvestigaciones'
import type { MotivoReporte } from '@/types/servidor'

// F09 (boceto 08): reportar una entrevista o un comentario, con motivo y detalle opcional. Nadie más sabe quién
// reportó.
export function DialogoReporte({
  abierto,
  contexto,
  ocupado,
  onEnviar,
  onCerrar,
}: {
  abierto: boolean
  contexto: string
  ocupado: boolean
  onEnviar: (motivo: MotivoReporte, detalle: string | null) => void
  onCerrar: () => void
}) {
  const focus = useReturnFocus()
  const [motivo, setMotivo] = useState<MotivoReporte>('OFENSIVO')
  const [detalle, setDetalle] = useState('')
  useEffect(() => {
    if (!abierto) return
    setMotivo('OFENSIVO')
    setDetalle('')
  }, [abierto])
  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && !ocupado && onCerrar()}>
      <DialogContent {...focus} className="sx-root sx-d-dialog sx-i-dialogo">
        <DialogHeader>
          <p className="sx-i-kicker">{contexto}</p>
          <DialogTitle>¿Qué no está bien?</DialogTitle>
          <DialogDescription>
            Tu orientadora revisará el reporte. Nadie más sabrá que lo enviaste.
          </DialogDescription>
        </DialogHeader>
        <fieldset className="sx-i-fieldset" data-guardando={ocupado || undefined} disabled={ocupado}>
          <div className="sx-i-motivos" role="radiogroup" aria-label="Motivo">
            {MOTIVOS_REPORTE.map((m) => (
              <label key={m.motivo} className="sx-i-motivo">
                <input
                  type="radio"
                  name="motivo-reporte"
                  checked={motivo === m.motivo}
                  onChange={() => setMotivo(m.motivo)}
                />
                {m.texto}
              </label>
            ))}
          </div>
          <label className="sx-i-campo">
            <span className="sx-i-etiqueta">
              Cuéntanos un poco más <span className="sx-i-meta">(opcional)</span>
            </span>
            <textarea
              className="sx-d-input"
              rows={2}
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
            />
          </label>
        </fieldset>
        <div className="sx-i-dialogo-pie" data-alineado="fin">
          <span className="sx-i-acciones">
            <button
              type="button"
              className="sx-i-boton"
              data-tono="claro"
              disabled={ocupado}
              onClick={onCerrar}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="sx-i-boton"
              disabled={ocupado}
              aria-busy={ocupado || undefined}
              onClick={() => onEnviar(motivo, detalle.trim() || null)}
            >
              {ocupado && <Loader2 aria-hidden="true" size={18} className="animate-spin" />}
              Enviar reporte
            </button>
          </span>
        </div>
        <small className="sx-i-meta">
          Un reporte por persona y contenido. Al enviarlo, el elemento muestra «Reportado» solo para ti.
        </small>
      </DialogContent>
    </Dialog>
  )
}
