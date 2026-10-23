import { Feather } from 'lucide-react'
import { fechaRelativa, type CartaLumi } from '@/lib/servidor/adaptadoresDiario'
import type { AccionesCarta } from '@/features/journal/components/BuzonLumi'

// Una carta del buzón: sellada (solo «Abrir»), en redacción (sin acciones) o lista para responder.
export function FilaCarta({
  carta,
  ahora,
  redactando,
  acciones,
  completa = false,
}: {
  carta: CartaLumi
  ahora: Date
  redactando: boolean
  acciones: AccionesCarta
  completa?: boolean
}) {
  const estado = redactando && carta.estado === 'sellada' ? 'redaccion' : carta.estado
  return (
    <li className="sx-j-carta" data-estado={estado} data-completa={completa || undefined}>
      <p className="sx-j-carta-meta">
        {carta.recibidaEn && <span>{fechaRelativa(carta.recibidaEn, ahora)}</span>}
        {carta.remitente && <span>De: {carta.remitente.titulo}</span>}
      </p>
      {estado === 'redaccion' ? (
        <p className="sx-j-carta-text">
          <Feather aria-hidden="true" size={16} /> Lumi está escribiendo tu carta…
        </p>
      ) : estado === 'sellada' ? (
        <>
          <p className="sx-j-carta-text">
            <span className="sx-j-carta-seal" aria-hidden="true" /> Lumi tiene una carta para ti
          </p>
          {acciones.onAbrir && (
            <button type="button" className="sx-d-action" onClick={() => acciones.onAbrir!(carta)}>
              Abrir
            </button>
          )}
        </>
      ) : (
        <>
          <p className="sx-j-carta-question">“{carta.texto}”</p>
          <div className="sx-j-carta-actions">
            <button type="button" className="sx-d-action" onClick={() => acciones.onResponder(carta)}>
              Responder
            </button>
            {acciones.onArchivar && (
              <button
                type="button"
                className="sx-d-action sx-d-action-ghost"
                onClick={() => acciones.onArchivar!(carta)}
              >
                Archivar sin responder
              </button>
            )}
          </div>
        </>
      )}
    </li>
  )
}
