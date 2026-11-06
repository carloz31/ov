import type { ZonaDimension } from '@/types/servidor'

// Ajuste perfil-capitulos: una tira con un segmento por dimensión, coloreado por su zona. Decorativa: el texto
// accesible es la frase del hallazgo.
export function ZoneStrip({ zonas }: { zonas: ZonaDimension[] }) {
  return (
    <span className="sx-d-zone-strip" aria-hidden="true">
      {zonas.map((zona, i) => (
        <span key={i} data-zona={zona} />
      ))}
    </span>
  )
}
