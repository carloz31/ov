import type { CartaLumi } from '@/lib/servidor/adaptadoresDiario'

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', timeZone: 'America/Lima' })

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
  const cuando = carta.bandeja === 'ARCHIVADA' ? carta.archivadaEn : carta.respondidaEn
  return (
    <li className="sx-j-carta sx-j-carta-compacta" data-bandeja={carta.bandeja}>
      {cuando && (
        <p className="sx-j-carta-meta">
          <span>{`${carta.bandeja === 'ARCHIVADA' ? 'Archivada el' : 'Respondida el'} ${fecha(cuando)}`}</span>
        </p>
      )}
      <p className="sx-j-carta-question">“{carta.texto}”</p>
      {onLeer && (
        <button type="button" className="sx-d-action sx-d-action-ghost" onClick={() => onLeer(carta)}>
          Leer en el cuaderno
        </button>
      )}
      {onDesarchivar && (
        <button type="button" className="sx-d-action sx-d-action-ghost" onClick={() => onDesarchivar(carta)}>
          Desarchivar
        </button>
      )}
    </li>
  )
}
