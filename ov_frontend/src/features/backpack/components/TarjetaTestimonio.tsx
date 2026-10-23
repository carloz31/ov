import { Play } from 'lucide-react'

// Testimonio desbloqueado de la mochila, local y del servidor (ajustes Central, 7). Va dentro de un
// `article.sx-b-card.sx-b-voice.sx-b-unlocked`.
export function TarjetaTestimonio({
  nombre,
  rol,
  titulo,
  cita,
  regalo,
  onEscuchar,
}: {
  nombre?: string
  rol?: string
  titulo: string
  cita: string
  // El llamado (caso) que lo regaló.
  regalo: string
  onEscuchar: () => void
}) {
  return (
    <>
      <div className="sx-b-author">
        <span>
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
      </div>
      <h3>{titulo}</h3>
      <blockquote>“{cita}”</blockquote>
      <p>
        Te la regaló el llamado <strong>{regalo}</strong>
      </p>
      <button type="button" className="sx-d-action sx-d-action-gold" onClick={onEscuchar}>
        <Play aria-hidden="true" size={18} />
        Escuchar su historia
      </button>
    </>
  )
}
