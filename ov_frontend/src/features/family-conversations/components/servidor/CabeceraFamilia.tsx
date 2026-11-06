import type { ReactNode } from 'react'

// F08: kicker, título y subtítulo de las pantallas de Familia; a la derecha, una acción opcional.
export function CabeceraFamilia({
  kicker,
  titulo,
  subtitulo,
  accion,
}: {
  kicker: string
  titulo: string
  subtitulo?: string
  accion?: ReactNode
}) {
  return (
    <header className="fam-header">
      <div>
        <p className="fam-kicker">{kicker}</p>
        <h1>{titulo}</h1>
        {subtitulo && <p>{subtitulo}</p>}
      </div>
      {accion}
    </header>
  )
}
