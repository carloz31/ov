import { useStudentDetail } from '@/features/counselor/hooks/useStudentDetail'

import { Button } from '@/components/ui/Button'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'

export function StudentObservationDialog({ model }: { model: ReturnType<typeof useStudentDetail> }) {
  const { dispatch, student, observationOpen, setObservationOpen, observationReason, setObservationReason } =
    model
  if (!student) return null
  return (
    <Dialog onOpenChange={setObservationOpen} open={observationOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar a observación</DialogTitle>
          <DialogDescription>
            Indica el motivo por el que deseas realizar un seguimiento más cercano de este estudiante.
          </DialogDescription>
        </DialogHeader>
        <label className="space-y-2 text-sm">
          <span className="font-medium">Motivo</span>
          <textarea
            className="min-h-28 w-full rounded-xl border bg-background p-3"
            onChange={(event) => setObservationReason(event.target.value)}
            placeholder="Escribe el motivo de observación..."
            value={observationReason}
          />
        </label>
        <Button
          onClick={() => {
            dispatch({
              type: 'TOGGLE_WATCHLIST',
              studentId: student.id,
              reason: observationReason.trim() || undefined,
            })
            setObservationReason('')
            setObservationOpen(false)
          }}
        >
          Registrar observación
        </Button>
      </DialogContent>
    </Dialog>
  )
}
