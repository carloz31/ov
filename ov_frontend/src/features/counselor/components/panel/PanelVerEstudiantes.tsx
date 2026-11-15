import { Link } from 'react-router'
import { Skeleton } from '@/components/ui/Skeleton'
import { nombreSalon } from '@/lib/nombreSalon'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/Sheet'
import type { PedidoVer } from '@/features/counselor/hooks/usePanelSalon'
import { appPaths } from '@/routes/paths'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import { useEstudiantesPanel } from '@/store/servidor/panel'

// Ajuste panel-salon §6: el panel lateral de «Ver», con nombre y salón de quienes cumplen; cada nombre enlaza a su
// perfil (ajuste panel-estudiantes §4).
export function PanelVerEstudiantes({
  pedido,
  salon,
  onCerrar,
}: {
  pedido: PedidoVer | null
  salon: string
  onCerrar: () => void
}) {
  const carga = useEstudiantesPanel(salon, pedido?.conjunto ?? null, pedido?.valor ?? '')
  const estudiantes = carga?.datos ?? []
  return (
    <Sheet open={pedido !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <SheetContent side="responsive" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{pedido?.titulo}</SheetTitle>
          <SheetDescription>
            {carga?.estado === 'listo' ? `${estudiantes.length} estudiantes` : 'Estudiantes que cumplen'}
          </SheetDescription>
        </SheetHeader>
        {carga?.estado === 'error' && !carga.datos ? (
          <p role="alert" className="text-sm text-danger-text">
            {mensajeErrorServidor(carga.error)}
          </p>
        ) : !carga || (carga.estado === 'cargando' && !carga.datos) ? (
          <div className="space-y-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {estudiantes.map((e) => (
              <li key={e.codigo} className="flex items-center justify-between gap-3 py-3">
                <Link
                  to={appPaths.counselor.student(e.codigo)}
                  className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline"
                >
                  {e.nombre}
                </Link>
                <span className="text-sm text-muted-foreground">{nombreSalon(e.salon)}</span>
              </li>
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  )
}
