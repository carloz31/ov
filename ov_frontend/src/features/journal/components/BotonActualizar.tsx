import { Loader2, RefreshCw } from 'lucide-react'

// «Actualizar» del buzón: vuelve a leer las cartas (sin polling); mientras pide, gira y queda deshabilitado.
export function BotonActualizar({ onClick, cargando }: { onClick: () => void; cargando: boolean }) {
  return (
    <button type="button" className="sx-j-buzon-refresh" onClick={onClick} disabled={cargando}>
      {cargando ? (
        <Loader2 aria-hidden="true" className="animate-spin" size={16} />
      ) : (
        <RefreshCw aria-hidden="true" size={16} />
      )}
      Actualizar
    </button>
  )
}
