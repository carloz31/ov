import { Ellipsis } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'

// F09: el menú «⋯» de una entrevista o un comentario (Reportar, Eliminar, Retirar).
export function MenuOpciones({
  etiqueta,
  opciones,
}: {
  etiqueta: string
  opciones: { texto: string; peligro?: boolean; onElegir: () => void }[]
}) {
  if (!opciones.length) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="sx-i-estrella" data-tono="menu" aria-label={etiqueta}>
          <Ellipsis aria-hidden="true" size={18} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="sx-i-menu">
        {opciones.map((o) => (
          <DropdownMenuItem key={o.texto} data-peligro={o.peligro || undefined} onSelect={o.onElegir}>
            {o.texto}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
