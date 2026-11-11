import { Mail } from 'lucide-react'
import { fechaRelativa, type CartaLumi } from '@/lib/servidor/adaptadoresDiario'
import type { AccionesCarta } from '@/features/journal/components/BuzonLumi'
import { fechaServidor } from '@/lib/servidor/fechas'

const fechaLarga = (iso: string) =>
  fechaServidor(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', timeZone: 'America/Lima' })

// Una carta del buzón, siempre con su pregunta (ajuste cartas-diario: no hay cartas por redactar). En la portada es
// una fila con «Responder» a la derecha; `completa` («Cartas de Lumi») suma «Responder» y «Archivar sin responder».
export function FilaCarta({
  carta,
  ahora,
  acciones,
  completa = false,
}: {
  carta: CartaLumi
  ahora: Date
  acciones: AccionesCarta
  completa?: boolean
}) {
  const relativa = carta.recibidaEn && fechaRelativa(carta.recibidaEn, ahora)
  const recibida =
    carta.recibidaEn &&
    (completa
      ? relativa === 'hoy'
        ? 'Recibida hoy'
        : `Recibida el ${fechaLarga(carta.recibidaEn)}`
      : relativa)
  const meta = [carta.remitente && `De: ${carta.remitente.titulo}`, recibida].filter(Boolean).join(' · ')
  return (
    <li className="sx-j-carta" data-completa={completa || undefined}>
      <span className="sx-j-carta-icon" aria-hidden="true">
        <Mail size={18} />
      </span>
      <div className="sx-j-carta-body">
        {meta && <p className="sx-j-carta-meta">{meta}</p>}
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
      </div>
      {!completa && (
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
