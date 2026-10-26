import { Loader2, Play, Star } from 'lucide-react'

// Testimonio abierto de la mochila, local y del servidor (ajustes Central, 7; ajuste mochila): iniciales,
// nombre y ocupación, estrella, título, cita, el llamado que lo regaló y «Escuchar su historia».
export function TarjetaTestimonio({
  nombre,
  rol,
  titulo,
  cita,
  regalo,
  nueva,
  favorita,
  pendiente = false,
  onEscuchar,
  onFavorite,
}: {
  nombre?: string
  rol?: string
  titulo: string
  cita: string
  // El llamado (caso) que lo regaló.
  regalo: string
  nueva: boolean
  favorita: boolean
  // Ajuste mochila: el POST del favorito está en curso.
  pendiente?: boolean
  onEscuchar: () => void
  onFavorite: () => void
}) {
  return (
    <article className="sx-b-voz">
      <div className="sx-b-voz-autor">
        <span aria-hidden="true">
          {nombre
            ?.split(' ')
            .slice(0, 2)
            .map((n) => n[0])
            .join('') ?? 'VO'}
        </span>
        <div>
          <strong>{nombre}</strong>
          <p>{rol}</p>
        </div>
        <button
          type="button"
          className="sx-b-estrella"
          aria-label={favorita ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          aria-pressed={favorita}
          aria-busy={pendiente}
          onClick={onFavorite}
        >
          {pendiente ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <Star aria-hidden="true" fill={favorita ? 'currentColor' : 'none'} />
          )}
        </button>
      </div>
      <h3>{titulo}</h3>
      {cita && <blockquote>«{cita}»</blockquote>}
      <p className="sx-b-voz-regalo">
        Te la regaló el llamado <strong>{regalo}</strong>
      </p>
      <footer>
        <button type="button" className="sx-b-escuchar" onClick={onEscuchar}>
          <Play aria-hidden="true" size={16} fill="currentColor" />
          Escuchar su historia
        </button>
        {nueva && <span className="sx-b-nueva">Nueva</span>}
      </footer>
    </article>
  )
}
