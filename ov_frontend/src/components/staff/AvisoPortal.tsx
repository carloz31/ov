import { useEffect, useRef } from 'react'
import { CircleCheck, TriangleAlert, X } from 'lucide-react'

const DURACION = 6000

// F09: aviso breve del portal del personal (tras destacar, eliminar o comentar), arriba a la derecha. Se cierra
// solo a los 6 s o con la X.
export function AvisoPortal({
  titulo,
  descripcion,
  error = false,
  onCerrar,
}: {
  titulo: string
  descripcion?: string
  error?: boolean
  onCerrar: () => void
}) {
  const cerrar = useRef(onCerrar)
  cerrar.current = onCerrar
  useEffect(() => {
    const temporizador = setTimeout(() => cerrar.current(), DURACION)
    return () => clearTimeout(temporizador)
  }, [])
  const Icono = error ? TriangleAlert : CircleCheck
  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed right-4 top-4 z-50 flex max-w-sm items-start gap-3 rounded-xl border bg-card p-4 shadow-lg"
    >
      <Icono className={`mt-0.5 size-5 shrink-0 ${error ? 'text-danger-text' : 'text-primary'}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{titulo}</p>
        {descripcion && <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p>}
      </div>
      <button type="button" className="min-h-8 min-w-8" aria-label="Cerrar aviso" onClick={onCerrar}>
        <X className="size-4" aria-hidden="true" />
      </button>
    </aside>
  )
}
