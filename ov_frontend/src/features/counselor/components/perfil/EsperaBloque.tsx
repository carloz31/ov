import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import type { CargaPerfil } from '@/store/servidor/panelEstudiante'
import { mensajeErrorServidor } from '@/store/servidor/sesion'

// Ajuste panel-estudiantes · Espera dentro de un bloque del perfil: esqueleto al cargar o el error con
// «Reintentar»; el resto del perfil sigue usable. Sin datos aún, nunca deja el bloque vacío.
export function EsperaBloque({
  carga,
  onReintentar,
  filas = 3,
}: {
  carga: CargaPerfil<unknown> | null
  onReintentar: () => void
  filas?: number
}) {
  if (carga?.estado === 'error')
    return (
      <div role="alert" className="space-y-3 rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-danger-text">{mensajeErrorServidor(carga.error)}</p>
        <Button variant="outline" className="min-h-11" onClick={onReintentar}>
          Reintentar
        </Button>
      </div>
    )
  return (
    <div className="space-y-3" aria-busy="true" role="status" aria-label="Cargando">
      {Array.from({ length: filas }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  )
}
