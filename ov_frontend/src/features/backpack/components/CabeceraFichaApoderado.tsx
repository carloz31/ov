import { FileText, X } from 'lucide-react'
import { DialogClose, DialogDescription, DialogTitle } from '@/components/ui/Dialog'

// F08 (A8): la cabecera del modal de ficha para el apoderado: ícono, kicker con el tema, título y «Lectura de N min
// · Obtenida en {actividad}» como texto, sin enlace.
export function CabeceraFichaApoderado({
  titulo,
  tema,
  actividad,
  minutos,
}: {
  titulo: string
  tema: string | null
  actividad?: string
  minutos: number | null
}) {
  const detalle = [minutos !== null && `Lectura de ${minutos} min`, actividad && `Obtenida en ${actividad}`]
    .filter(Boolean)
    .join(' · ')
  return (
    <header className="sx-ficha-modal__cabecera sx-ficha-modal__cabecera--apoderado">
      <span aria-hidden="true" className="sx-ficha-modal__icono">
        <FileText />
      </span>
      <div>
        <p className="sx-ficha-modal__kicker">{tema ? `Ficha · ${tema}` : 'Ficha'}</p>
        <DialogTitle>{titulo}</DialogTitle>
        <DialogDescription>{detalle || 'Ficha de sus actividades'}</DialogDescription>
      </div>
      <DialogClose asChild>
        <button type="button" className="sx-ficha-modal__cerrar" aria-label="Cerrar">
          <X aria-hidden="true" />
        </button>
      </DialogClose>
    </header>
  )
}
