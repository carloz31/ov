import { Archive, Check } from 'lucide-react'
import type { CartaLumi } from '@/lib/servidor/adaptadoresDiario'
import { fechaServidor } from '@/lib/servidor/fechas'

const fecha = (iso: string) =>
  fechaServidor(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', timeZone: 'America/Lima' })

// Ajuste del diario (F05): una carta respondida («Leer en el cuaderno») o archivada («Desarchivar»), compacta.
export function FilaCartaCompacta({
  carta,
  onLeer,
  onDesarchivar,
}: {
  carta: CartaLumi
  onLeer?: (carta: CartaLumi) => void
  onDesarchivar?: (carta: CartaLumi) => void
}) {
  const archivada = carta.bandeja === 'ARCHIVADA'
  const cuando = archivada ? carta.archivadaEn : carta.respondidaEn
  const meta = [
    carta.remitente && `De: ${carta.remitente.titulo}`,
    cuando && `${archivada ? 'archivada el' : 'respondida el'} ${fecha(cuando)}`,
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <li className="sx-j-carta sx-j-carta-compacta" data-bandeja={carta.bandeja}>
      <span className="sx-j-carta-icon" aria-hidden="true">
        {archivada ? <Archive size={16} /> : <Check size={16} />}
      </span>
      <div className="sx-j-carta-body">
        {meta && <p className="sx-j-carta-meta">{meta}</p>}
        <p className="sx-j-carta-question">{carta.texto}</p>
      </div>
      {onLeer && (
        <button type="button" className="sx-j-carta-link" onClick={() => onLeer(carta)}>
          Leer en el cuaderno
        </button>
      )}
      {onDesarchivar && (
        <button type="button" className="sx-j-carta-link" onClick={() => onDesarchivar(carta)}>
          Desarchivar
        </button>
      )}
    </li>
  )
}
