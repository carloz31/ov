import { Mail } from 'lucide-react'
import { Link } from 'react-router'
import { appPaths } from '@/routes/paths'
import type { CartaLumi } from '@/lib/servidor/adaptadoresDiario'
import { BotonActualizar } from '@/features/journal/components/BotonActualizar'
import { FilaCarta } from '@/features/journal/components/FilaCarta'

export type AccionesCarta = {
  onResponder: (carta: CartaLumi) => void
  // «Abrir» de una carta sellada: pide su redacción sin abrir el editor (solo api).
  onAbrir?: (carta: CartaLumi) => void
  onArchivar?: (carta: CartaLumi) => void
}

// Ajuste del diario (F05): las cartas de Lumi por responder, en la portada (hasta `limite`) y en «Cartas de Lumi».
export function BuzonLumi({
  cartas,
  ahora,
  enRedaccion,
  acciones,
  limite,
  verTodas = false,
  actualizar,
}: {
  cartas: CartaLumi[]
  ahora: Date
  enRedaccion: string[]
  acciones: AccionesCarta
  limite?: number
  verTodas?: boolean
  actualizar?: { onClick: () => void; cargando: boolean }
}) {
  const pendientes = cartas.filter((c) => c.bandeja === 'PENDIENTE')
  const visibles = limite ? pendientes.slice(0, limite) : pendientes
  return (
    <section aria-labelledby="buzon-lumi" className="sx-j-buzon">
      <header className="sx-j-buzon-header">
        <Mail aria-hidden="true" size={20} />
        <h2 id="buzon-lumi">Buzón</h2>
        <span className="sx-j-chip">{pendientes.length} por responder</span>
        {actualizar && <BotonActualizar {...actualizar} />}
        {verTodas && (
          <Link className="sx-j-buzon-all" to={appPaths.student.lumiLetters}>
            Ver todas las cartas de Lumi
          </Link>
        )}
      </header>
      <p className="sx-j-buzon-help">
        Cartas que Lumi te dejó al terminar una actividad. Responde cuando quieras.
      </p>
      {visibles.length ? (
        <ul className="sx-j-buzon-list">
          {visibles.map((carta) => (
            <FilaCarta
              key={carta.codigo}
              carta={carta}
              ahora={ahora}
              redactando={enRedaccion.includes(carta.codigo)}
              acciones={acciones}
            />
          ))}
        </ul>
      ) : (
        <p className="sx-j-empty">Lumi te dejará una carta al terminar tu próxima actividad.</p>
      )}
    </section>
  )
}
