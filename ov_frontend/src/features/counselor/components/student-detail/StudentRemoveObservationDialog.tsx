import { useStudentDetail } from '@/features/counselor/hooks/useStudentDetail'

import { Button } from '@/components/ui/Button'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'

export function StudentRemoveObservationDialog({ model }: { model: ReturnType<typeof useStudentDetail> }) {
  const { dispatch, student, removeObservationOpen, setRemoveObservationOpen } = model
  if (!student) return null
  return (
    <Dialog onOpenChange={setRemoveObservationOpen} open={removeObservationOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quitar de observados</DialogTitle>
          <DialogDescription>
            ¿Estás segura de que deseas quitar a {student.name} de la lista de observación?
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button onClick={() => setRemoveObservationOpen(false)} variant="outline">
            Cancelar
          </Button>
          <Button
            onClick={() => {
              dispatch({ type: 'TOGGLE_WATCHLIST', studentId: student.id })
              setRemoveObservationOpen(false)
            }}
          >
            Quitar de observados
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
