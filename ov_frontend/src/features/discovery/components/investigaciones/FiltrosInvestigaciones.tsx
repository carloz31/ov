import { Crown, Search, Star } from 'lucide-react'
import type { ConteosEntrevistas, OrdenEntrevistas, VistaEntrevistas } from '@/types/servidor'
import type { Chip } from '../../hooks/useInvestigacionesListado'

const VISTAS: { vista: VistaEntrevistas; texto: string; conteo: keyof ConteosEntrevistas }[] = [
  { vista: 'SALON', texto: 'De mi salón', conteo: 'salon' },
  { vista: 'LEYENDAS', texto: 'Leyendas', conteo: 'leyendas' },
  { vista: 'MIAS', texto: 'Mis investigaciones', conteo: 'mias' },
]
const CHIPS: { chip: Chip; texto: string }[] = [
  { chip: 'favoritas', texto: 'Favoritas' },
  { chip: 'no_vistas', texto: 'No vistas' },
  { chip: 'destacadas', texto: 'Destacadas' },
]

// F09 (bocetos 01 y 02): un solo selector de vistas con su conteo, el buscador y, salvo en Mis investigaciones,
// los chips Favoritas · No vistas · Destacadas y el orden.
export function FiltrosInvestigaciones({
  vista,
  conteos,
  onVista,
  texto,
  onTexto,
  chips,
  onChip,
  orden,
  onOrden,
}: {
  vista: VistaEntrevistas
  conteos: ConteosEntrevistas | null
  onVista: (vista: VistaEntrevistas) => void
  texto: string
  onTexto: (texto: string) => void
  chips: Record<Chip, boolean>
  onChip: (chip: Chip) => void
  orden: OrdenEntrevistas
  onOrden: (orden: OrdenEntrevistas) => void
}) {
  const mias = vista === 'MIAS'
  const placeholder = mias ? 'Buscar en mis investigaciones…' : 'Buscar por título, ocupación o profesional…'
  return (
    <>
      <div className="sx-i-selector">
        <div className="sx-i-vistas" role="group" aria-label="Vista">
          {VISTAS.map((v) => (
            <button key={v.vista} type="button" aria-pressed={vista === v.vista} onClick={() => onVista(v.vista)}>
              {v.vista === 'LEYENDAS' && <Crown aria-hidden="true" size={16} />}
              {v.texto}
              {conteos && <small>· {conteos[v.conteo]}</small>}
            </button>
          ))}
        </div>
      </div>
      <div className="sx-i-filtros">
        <label className="sx-d-search-row sx-c-busqueda">
          <Search aria-hidden="true" />
          <span className="sr-only">{placeholder}</span>
          <input
            className="sx-d-input"
            placeholder={placeholder}
            value={texto}
            onChange={(e) => onTexto(e.target.value)}
          />
        </label>
        {!mias && (
          <>
            {CHIPS.map((c) => (
              <button
                key={c.chip}
                type="button"
                className="sx-c-chip"
                aria-pressed={chips[c.chip]}
                onClick={() => onChip(c.chip)}
              >
                {c.chip === 'favoritas' && <Star aria-hidden="true" size={16} />}
                {c.texto}
              </button>
            ))}
            <label className="sx-i-orden">
              Orden
              <select value={orden} onChange={(e) => onOrden(e.target.value as OrdenEntrevistas)}>
                <option value="RECIENTES">Recientes</option>
                <option value="REACCIONADAS">Más reaccionadas</option>
              </select>
            </label>
          </>
        )}
      </div>
    </>
  )
}
