import type { ResumenPagina } from '../types'
import { DimensionSummaryRow } from './DimensionSummaryRow'

export function HelenaPageSummary({ resumen, plano }: { resumen: ResumenPagina; plano?: boolean }) {
  return (
    <div className={`sx-d-helena-summary${plano ? ' sx-d-helena-flat' : ''}`}>
      <p className="sx-d-helena-label">{resumen.rotulo}</p>
      {resumen.titulo && <h3>{resumen.titulo}</h3>}
      {resumen.filas.map((fila) => (
        <DimensionSummaryRow key={fila.codigo} fila={fila} />
      ))}
      <p className="sx-d-helena-closure">{resumen.cierre}</p>
    </div>
  )
}
