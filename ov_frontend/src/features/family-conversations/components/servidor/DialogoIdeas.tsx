import { useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog'

// F08 (A3): las ideas de la carta del apoderado, una por paso (Anterior/Siguiente). Nada se inserta en el texto.
export function DialogoIdeas({
  abierto,
  titulo,
  pasos,
  onCerrar,
}: {
  abierto: boolean
  titulo: string
  pasos: string[]
  onCerrar: () => void
}) {
  const [paso, setPaso] = useState(0)
  const ultimo = paso === pasos.length - 1
  return (
    <Dialog
      open={abierto}
      onOpenChange={(open) => {
        if (!open) {
          setPaso(0)
          onCerrar()
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogTitle>{titulo}</DialogTitle>
        <p className="min-h-16 text-base leading-7">{pasos[paso]}</p>
        <div className="flex justify-between gap-3">
          <button
            className="fam-btn fam-btn--claro"
            disabled={paso === 0}
            type="button"
            onClick={() => setPaso(paso - 1)}
          >
            <ArrowLeft aria-hidden="true" size={18} />
            Anterior
          </button>
          <button
            className="fam-btn"
            type="button"
            onClick={() => {
              if (!ultimo) return setPaso(paso + 1)
              setPaso(0)
              onCerrar()
            }}
          >
            {ultimo ? 'Entendido' : 'Siguiente'}
            {!ultimo && <ArrowRight aria-hidden="true" size={18} />}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
