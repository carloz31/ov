import { Mail, PenLine } from 'lucide-react'
import { fechaRelativa, type CartaLumi } from '@/lib/servidor/adaptadoresDiario'
import type { AccionesCarta } from '@/features/journal/components/BuzonLumi'
import { fechaServidor } from '@/lib/servidor/fechas'

const fechaLarga = (iso: string) =>
  fechaServidor(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', timeZone: 'America/Lima' })

// Una carta del buzón: sellada (solo «Abrir»), en redacción (sin acciones) o lista para responder. En la portada es
// una fila con una sola acción a la derecha; `completa` («Cartas de Lumi») suma la explicación de cada estado y, en
// la lista, «Archivar sin responder».
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
  const relativa = carta.recibidaEn && fechaRelativa(carta.recibidaEn, ahora)
  const recibida =
    carta.recibidaEn &&
    (completa
      ? relativa === 'hoy'
        ? 'Recibida hoy'
        : `Recibida el ${fechaLarga(carta.recibidaEn)}`
      : relativa)
  const meta = [carta.remitente && `De: ${carta.remitente.titulo}`, recibida].filter(Boolean).join(' · ')
  const abrir = estado === 'sellada' && acciones.onAbrir && (
    <button type="button" className="sx-d-action sx-j-carta-cta" onClick={() => acciones.onAbrir!(carta)}>
      Abrir
    </button>
  )
  return (
    <li className="sx-j-carta" data-estado={estado} data-completa={completa || undefined}>
      <span className="sx-j-carta-icon" aria-hidden="true">
        {estado === 'redaccion' ? <PenLine size={18} /> : <Mail size={18} />}
        {estado === 'sellada' && <span className="sx-j-carta-seal" />}
      </span>
      <div className="sx-j-carta-body">
        {meta && <p className="sx-j-carta-meta">{meta}</p>}
        {estado === 'redaccion' ? (
          <>
            <p className="sx-j-carta-text">Lumi está escribiendo tu carta…</p>
            {completa && (
              <p className="sx-j-carta-help">
                Está pensando en lo que le contaste en la actividad. Pulsa «Actualizar» en un momento para ver
                si ya terminó.
              </p>
            )}
          </>
        ) : estado === 'sellada' ? (
          <>
            <p className="sx-j-carta-text">Lumi tiene una carta para ti</p>
            {completa && (
              <p className="sx-j-carta-help">
                La escribirá pensando en lo que le contaste en la actividad. Ábrela cuando quieras.
              </p>
            )}
          </>
        ) : (
          <>
            <p className="sx-j-carta-question">“{carta.texto}”</p>
            {completa && (
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
            )}
          </>
        )}
      </div>
      {abrir}
      {!completa && estado === 'lista' && (
        <button
          type="button"
          className="sx-d-action sx-d-action-ghost sx-j-carta-cta"
          onClick={() => acciones.onResponder(carta)}
        >
          Responder
        </button>
      )}
    </li>
  )
}
