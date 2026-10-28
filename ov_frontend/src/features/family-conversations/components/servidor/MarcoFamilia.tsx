import type { ReactNode } from 'react'
import type { ModeloFamilia } from '../../types'
import '../../styles/familia.css'

// F08: el contenedor de cada pantalla de Familia con el estilo del rol. Mientras no hay datos muestra la carga o
// el error que le pasa la vista (cada portal tiene la suya); el aviso de la última acción va encima.
export function MarcoFamilia({
  m,
  carga,
  aviso,
  regalo = false,
  children,
}: {
  m: ModeloFamilia
  carga: ReactNode
  aviso: ReactNode
  regalo?: boolean
  children: ReactNode
}) {
  if (!m.datos) return carga
  return (
    <div className={`fam fam--${m.rol}${regalo ? ' fam--regalo' : ''}`}>
      {aviso}
      {children}
    </div>
  )
}
