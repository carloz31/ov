import { useEffect, useState } from 'react'
import { CircleHelp, Lightbulb, Loader2, Signpost, Star, type LucideIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { useReturnFocus } from '@/hooks/useReturnFocus'
import type { ReaccionPublica, TipoReaccionPublico } from '@/types/servidor'

// Los íconos del catálogo, por nombre (spec §10); uno nuevo sin traducir usa la bombilla.
const ICONOS: Record<string, LucideIcon> = {
  bombilla: Lightbulb,
  estrella: Star,
  pregunta: CircleHelp,
  caminos: Signpost,
}

// F09 (boceto 07): dejar o editar la reacción. La grilla sale del catálogo; al elegir, el comentario muestra su
// pregunta y si es obligatorio.
export function DialogoReaccion({
  abierto,
  titulo,
  tipos,
  inicial,
  ocupado,
  onPublicar,
  onCerrar,
}: {
  abierto: boolean
  titulo: string
  tipos: TipoReaccionPublico[]
  inicial: ReaccionPublica | null
  ocupado: boolean
  onPublicar: (tipo: string, comentario: string | null) => void
  onCerrar: () => void
}) {
  const focus = useReturnFocus()
  const [tipo, setTipo] = useState<string | null>(null)
  const [comentario, setComentario] = useState('')
  useEffect(() => {
    if (!abierto) return
    setTipo(inicial?.tipo ?? null)
    setComentario(inicial?.comentario ?? '')
  }, [abierto, inicial])
  const elegido = tipos.find((t) => t.codigo === tipo)
  const valido = !!elegido && (!elegido.comentario_obligatorio || !!comentario.trim())
  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && !ocupado && onCerrar()}>
      <DialogContent {...focus} className="sx-root sx-d-dialog sx-i-dialogo">
        <DialogHeader>
          <p className="sx-i-kicker">{titulo}</p>
          <DialogTitle>¿Qué te dejó esta entrevista?</DialogTitle>
          <DialogDescription className="sr-only">
            Elige una reacción y escribe tu comentario.
          </DialogDescription>
        </DialogHeader>
        <fieldset className="sx-i-fieldset" data-guardando={ocupado || undefined} disabled={ocupado}>
          <div className="sx-i-tipos" role="radiogroup" aria-label="Tu reacción">
            {tipos.map((t) => {
              const Icono = ICONOS[t.icono] ?? Lightbulb
              return (
                <button
                  key={t.codigo}
                  type="button"
                  role="radio"
                  aria-checked={tipo === t.codigo}
                  className="sx-i-tipo"
                  onClick={() => setTipo(t.codigo)}
                >
                  <strong>
                    <Icono aria-hidden="true" size={18} /> {t.nombre}
                  </strong>
                  <small>{t.descripcion}</small>
                </button>
              )
            })}
          </div>
          {elegido && (
            <label className="sx-i-campo">
              <span className="sx-i-etiqueta">
                {elegido.pregunta}{' '}
                <span className="sx-i-obligatorio">
                  {elegido.comentario_obligatorio ? '(obligatorio)' : '(opcional)'}
                </span>
              </span>
              <textarea
                className="sx-d-input"
                rows={3}
                placeholder="Una o dos frases. Lo verán los autores y tu salón."
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
              />
            </label>
          )}
        </fieldset>
        <div className="sx-i-dialogo-pie">
          <small className="sx-i-meta">Puedes editar o borrar tu reacción después.</small>
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
              disabled={!valido || ocupado}
              aria-busy={ocupado || undefined}
              onClick={() => elegido && onPublicar(elegido.codigo, comentario.trim() || null)}
            >
              {ocupado && <Loader2 aria-hidden="true" size={18} className="animate-spin" />}
              {inicial ? 'Guardar reacción' : 'Publicar reacción'}
            </button>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
