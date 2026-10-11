import { usePriorities } from '@/features/counselor/hooks/usePriorities'

import { Button } from '@/components/ui/Button'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'

export function PriorityConfirmation({ model }: { model: ReturnType<typeof usePriorities> }) {
  const { confirmation, setConfirmation, sharingName, confirm } = model
  return (
    <Dialog
      open={confirmation !== null}
      onOpenChange={(open) => {
        if (!open) setConfirmation(null)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {confirmation?.kind === 'sharing'
              ? '¿Mostrar este resultado a los apoderados?'
              : confirmation?.kind === 'save'
                ? '¿Guardar la configuración de prioritarios?'
                : '¿Quitar todas las actividades de registro de tus prioritarios?'}
          </DialogTitle>
          <DialogDescription>
            {confirmation?.kind === 'sharing'
              ? `Al guardar, los apoderados de tus estudiantes podrán ver el resultado de ${sharingName} de su hijo cuando terminen su ruta.`
              : confirmation?.kind === 'save'
                ? 'Al guardar, se recalculará el porcentaje de avance prioritario de tus estudiantes según esta selección. También cambiará lo que se muestra en el filtro Prioritarios de sus perfiles. ¿Quieres guardar los cambios?'
                : 'Las herramientas prioritarias se conservarán.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" className="min-h-11" onClick={() => setConfirmation(null)}>
            Cancelar
          </Button>
          <Button className="min-h-11 h-auto whitespace-normal" onClick={confirm}>
            {confirmation?.kind === 'sharing'
              ? 'Mostrar a los apoderados'
              : confirmation?.kind === 'save'
                ? 'Confirmar y guardar'
                : 'Quitar todas'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
