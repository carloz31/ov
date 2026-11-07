import type { ReactNode } from 'react'

// Ajuste vista del ítem de registro: el bloque de elección. Numeral (solo con dos bloques), la pregunta y, a la
// derecha, el indicador de cantidad; debajo, las opciones y la reacción del personaje.
export function RegistroBloqueEleccion({
  numeral,
  pregunta,
  indicador,
  children,
}: {
  numeral?: number
  pregunta: string
  indicador: string
  children: ReactNode
}) {
  return (
    <div className="sx-item-bloque" role="group" aria-label={pregunta}>
      <div className="sx-item-cabeza">
        <span className="sx-item-pregunta">
          {numeral && <span className="sx-item-numeral">{numeral}</span>}
          {pregunta}
        </span>
        <span className="sx-item-indicador">{indicador}</span>
      </div>
      {children}
    </div>
  )
}
