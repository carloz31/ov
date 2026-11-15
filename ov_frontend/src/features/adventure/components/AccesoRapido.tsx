import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { LockKeyhole } from 'lucide-react'
import type { AccesoSeccion } from '../hooks/useSeccionesAcceso'

// Acceso rápido a una sección: cerrada, lleva candado, se ve atenuada y, en api, Lumi explica qué falta. Ajuste
// desbloqueos: abierta y sin entrar todavía (`nuevo`, solo api), un punto en el lugar del candado.
export function AccesoRapido({
  className,
  to,
  acceso,
  nuevo = false,
  onGuide,
  children,
}: {
  className?: string
  to: string
  acceso: AccesoSeccion
  nuevo?: boolean
  onGuide?: (pasos: string[]) => void
  children: ReactNode
}) {
  const pasos = acceso.pasos
  return (
    <Link
      className={className}
      to={to}
      title={acceso.bloqueada ? acceso.mensaje : undefined}
      data-bloqueada={acceso.bloqueada || undefined}
      onClick={
        pasos && onGuide
          ? (event) => {
              event.preventDefault()
              onGuide(pasos)
            }
          : undefined
      }
    >
      {children}
      {acceso.bloqueada && <LockKeyhole className="sx-quick-lock" size={12} aria-hidden="true" />}
      {nuevo && !acceso.bloqueada && (
        <>
          <span className="sx-quick-new" aria-hidden="true" />
          <small className="sr-only">Nuevo: aún no has entrado</small>
        </>
      )}
    </Link>
  )
}
