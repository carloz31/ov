import { useState } from 'react'
import { recortar } from '../../lib/formasEco'

// Ajuste front de registros (lote 2): un texto que se recorta con «…» y se abre con un enlace («ver completo» en los
// ecos). Corto, va tal cual.
export function TextoRecortable({
  texto,
  maximo,
  enlace,
  className,
}: {
  texto: string
  maximo: number
  enlace: string
  className?: string
}) {
  const [abierto, setAbierto] = useState(false)
  const { corto, recortado } = recortar(texto, maximo)
  return (
    <p className={className}>
      {abierto || !recortado ? texto : corto}
      {recortado && !abierto && (
        <>
          {' '}
          <button type="button" className="sx-eco-enlace" onClick={() => setAbierto(true)}>
            {enlace}
          </button>
        </>
      )}
    </p>
  )
}
