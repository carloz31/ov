import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import type { ModeloConfiguracion } from '../../hooks/useConfiguracionColegio'

const lista = (nombres: string[]) =>
  nombres.length < 2
    ? nombres.join('')
    : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`

// Ajuste panel-entrevistas-configuracion §2.5: confirmar antes de guardar; si un cuestionario pasa a ser visible para
// los apoderados, lo dice.
export function ConfirmarConfiguracion({ m }: { m: ModeloConfiguracion }) {
  const nuevos = m.nuevosVisibles.map((c) => `«${c.nombre}»`)
  return (
    <Dialog open={m.confirmando} onOpenChange={(abierto) => !abierto && m.cerrarConfirmacion()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Guardar la configuración?</DialogTitle>
          <DialogDescription>
            Aplica a todos sus salones y cambia los registros que ve destacados en el perfil de sus
            estudiantes.
            {nuevos.length > 0 &&
              ` Los apoderados de sus estudiantes podrán ver en su portal el resultado de ${lista(nuevos)} de su hijo.`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            className="min-h-11"
            disabled={m.guardando}
            onClick={m.cerrarConfirmacion}
          >
            Cancelar
          </Button>
          <Button className="min-h-11 h-auto whitespace-normal" disabled={m.guardando} onClick={m.guardar}>
            {m.guardando && <Loader2 aria-hidden className="animate-spin" />}
            Confirmar y guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
