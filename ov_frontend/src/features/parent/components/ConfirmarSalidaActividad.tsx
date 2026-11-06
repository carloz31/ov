import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'

// F08: como en el reproductor del estudiante, salir de una actividad en curso pide confirmación. El avance queda
// en este dispositivo y se retoma desde el mismo paso.
export function ConfirmarSalidaActividad({
  abierto,
  onSeguir,
  onSalir,
}: {
  abierto: boolean
  onSeguir: () => void
  onSalir: () => void
}) {
  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && onSeguir()}>
      <DialogContent className="max-w-md text-center" showCloseButton={false}>
        <ShieldCheck aria-hidden className="mx-auto size-12 text-primary" />
        <DialogTitle>¿Quiere salir de la actividad?</DialogTitle>
        <DialogDescription>
          Su avance queda guardado en este dispositivo. Podrá retomar la actividad desde este paso.
        </DialogDescription>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Button className="min-h-11" variant="outline" onClick={onSeguir}>
            Seguir en la actividad
          </Button>
          <Button className="min-h-11" onClick={onSalir}>
            Salir a Mis actividades
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
