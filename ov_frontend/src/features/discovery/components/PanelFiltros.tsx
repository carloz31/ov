import { useId, type ReactNode } from 'react'

export type FilaFiltro = { etiqueta: string; controles: ReactNode }

function Fila({ etiqueta, controles }: FilaFiltro) {
  const id = useId()
  return (
    <div className="sx-c-fila-filtro" role="group" aria-labelledby={id}>
      <span className="sx-c-etiqueta-filtro" id={id}>
        {etiqueta}
      </span>
      <div className="sx-c-controles">{controles}</div>
    </div>
  )
}

// Ajuste catalogo-datos-reales (revisión de F6a): el panel de filtros de un listado. Cada fila es un grupo con su
// etiqueta en una columna fija y sus controles a la derecha; en pantallas angostas la etiqueta va arriba.
export function PanelFiltros({ filas }: { filas: FilaFiltro[] }) {
  return (
    <div className="sx-c-panel-filtros">
      {filas.map((fila) => (
        <Fila key={fila.etiqueta} {...fila} />
      ))}
    </div>
  )
}
