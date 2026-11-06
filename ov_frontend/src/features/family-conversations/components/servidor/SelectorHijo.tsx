import { ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'

// F08 (A2–A4, A6): con varios hijos, «Con {nombre} ▾» cambia el vínculo activo. Con uno solo no se muestra.
export function SelectorHijo({
  hijos,
  activo,
  onElegir,
}: {
  hijos: { codigo: string; nombre: string }[]
  activo: string | null
  onElegir: (codigo: string) => void
}) {
  if (hijos.length < 2) return null
  const actual = hijos.find((h) => h.codigo === activo) ?? hijos[0]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="fam-selector">
        <span className="fam-selector-inicial">{actual.nombre.charAt(0).toUpperCase()}</span>
        Con {actual.nombre}
        <ChevronDown aria-hidden="true" size={18} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {hijos.map((h) => (
          <DropdownMenuItem key={h.codigo} onSelect={() => onElegir(h.codigo)}>
            Con {h.nombre}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
