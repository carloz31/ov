import { colorTema } from '../lib/fichaLectura'

// Ajuste mochila: el tema de una ficha, con su color de la paleta fija.
export function ChipTema({ tema }: { tema: string }) {
  const { fondo, tinta } = colorTema(tema)
  return (
    <span className="sx-chip-tema" style={{ backgroundColor: fondo, color: tinta }}>
      {tema}
    </span>
  )
}
