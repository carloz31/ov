import { ChevronUp, Loader2 } from 'lucide-react'
import { LIMITE_CATALOGO } from '@/store/servidor/catalogo'

// Ajuste catalogo-datos-reales (F6a): el pie de un listado paginado por acumulación: «Mostrando N de M», la
// barra de avance, «Mostrar 20 más» (con cargador mientras llega la página) y «Volver arriba».
export function PieListado({
  mostrados,
  total,
  cargando,
  hayMas,
  onMas,
}: {
  mostrados: number
  total: number
  cargando: boolean
  hayMas: boolean
  onMas: () => void
}) {
  return (
    <footer className="sx-c-pie">
      <p>
        Mostrando {mostrados.toLocaleString('es-PE')} de {total.toLocaleString('es-PE')}
      </p>
      <div
        className="sx-c-avance"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={mostrados}
      >
        <span style={{ width: `${(mostrados / Math.max(total, 1)) * 100}%` }} />
      </div>
      <div className="sx-c-pie-acciones">
        {(hayMas || cargando) && (
          <button
            type="button"
            className="sx-d-action sx-d-action-ghost"
            disabled={cargando}
            aria-busy={cargando || undefined}
            onClick={onMas}
          >
            {cargando && <Loader2 aria-hidden="true" size={18} className="animate-spin" />}
            Mostrar {Math.min(LIMITE_CATALOGO, total - mostrados) || LIMITE_CATALOGO} más
          </button>
        )}
        {mostrados > LIMITE_CATALOGO && (
          <a className="sx-c-arriba" href="#inicio-catalogo">
            <ChevronUp aria-hidden="true" size={18} /> Volver arriba
          </a>
        )}
      </div>
    </footer>
  )
}
