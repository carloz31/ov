import { FileText, Star } from 'lucide-react'
import { colorTema } from '../lib/fichaLectura'
import type { TravelResource } from '../lib/travelerResources'
import { ChipTema } from './ChipTema'

// Ajuste mochila: una ficha obtenida. Toda la tarjeta abre el modal (el enlace del título se extiende sobre
// ella) y la estrella es un botón aparte, encima del enlace.
export function TarjetaFicha({
  resource,
  favorita,
  nueva,
  onOpen,
  onFavorite,
}: {
  resource: TravelResource
  favorita: boolean
  nueva: boolean
  onOpen: () => void
  onFavorite: () => void
}) {
  const tema = resource.ficha?.tema
  const actividad = resource.ficha?.actividad
  return (
    <article className="sx-b-ficha">
      <div className="sx-b-ficha-top">
        {tema ? <ChipTema tema={tema} /> : <span />}
        <button
          type="button"
          className="sx-b-estrella"
          aria-label={favorita ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          aria-pressed={favorita}
          onClick={(event) => {
            event.stopPropagation()
            onFavorite()
          }}
        >
          <Star aria-hidden="true" fill={favorita ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="sx-b-ficha-cuerpo">
        <span className="sx-b-ficha-doc" aria-hidden="true" style={tema ? { color: colorTema(tema).tinta } : undefined}>
          <FileText />
        </span>
        <div>
          <h3>
            <a
              href={`?kind=sheet&ficha=${encodeURIComponent(resource.id)}`}
              onClick={(event) => {
                event.preventDefault()
                onOpen()
              }}
            >
              {resource.title}
            </a>
          </h3>
          {resource.summary && <p>{resource.summary}</p>}
        </div>
      </div>
      <footer className="sx-b-ficha-pie">
        <p>{actividad && <>De la misión <strong>{actividad.titulo}</strong></>}</p>
        {nueva && <span className="sx-b-nueva">Nueva</span>}
      </footer>
    </article>
  )
}
