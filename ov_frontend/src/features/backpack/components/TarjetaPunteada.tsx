import type { ReactNode } from 'react'

// Ajuste mochila: la tarjeta punteada de los compartimentos (cierre «Más adelante», vacío y cierre de voces).
export function TarjetaPunteada({
  icono,
  titulo,
  texto,
  accion,
  variante = 'cierre',
}: {
  icono: ReactNode
  titulo?: string
  texto: string
  accion?: ReactNode
  variante?: 'cierre' | 'vacio' | 'centrada'
}) {
  return (
    <div className={`sx-b-punteada sx-b-punteada-${variante}`}>
      <span className="sx-b-punteada-icono" aria-hidden="true">
        {icono}
      </span>
      <div>
        {titulo && <h3>{titulo}</h3>}
        <p>{texto}</p>
        {accion}
      </div>
    </div>
  )
}
