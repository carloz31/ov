import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import type { OpcionesTarjeta } from '@/types/servidor'

// F07b (lienzo de la sección 4): el tipo de un paso (`opciones.pasos`); vacío muestra «Tipo…».
export function SelectTipoPaso({
  valor,
  opciones,
  etiqueta,
  onCambiar,
}: {
  valor: string
  opciones: OpcionesTarjeta
  etiqueta: string
  onCambiar: (tipo: string) => void
}) {
  return (
    <Select value={valor || undefined} onValueChange={onCambiar}>
      <SelectTrigger aria-label={etiqueta} className="sx-p-select-tipo">
        <SelectValue placeholder="Tipo…" />
      </SelectTrigger>
      <SelectContent>
        {opciones.pasos.map((p) => (
          <SelectItem key={p.codigo} value={p.codigo}>
            {p.texto}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
