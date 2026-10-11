import { ArrowLeft, EyeOff, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StaffEntityHeader } from '@/components/staff/StaffEntityHeader'
import { StaffAlertCard } from '@/components/staff/StaffAlertCard'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { appPaths } from '@/routes/paths'
import { getActivity } from '@/features/counselor/lib/counselorPortalSelectors'
import { useCounselorPortal } from '@/features/counselor/context/counselorPortalContext'

function StudentRecordDetailView() {
  const { state, dispatch } = useCounselorPortal()
  const { studentId, recordId } = useParams()
  const navigate = useNavigate()
  const student = state.students.find((item) => item.id === studentId)
  const record = student?.records.find((item) => item.id === recordId)
  const activity = getActivity(state, record?.activityId ?? '')
  const [redoOpen, setRedoOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [comment, setComment] = useState('')
  const back = () => studentId && navigate(`${appPaths.counselor.student(studentId)}?section=progress`)
  if (!student || !record)
    return (
      <div className="grid min-h-80 place-items-center p-8 text-center">
        <div>
          <h1 className="text-xl font-bold">Registro no encontrado</h1>
          <Button className="mt-4" onClick={() => navigate(appPaths.counselor.students)}>
            Volver a estudiantes
          </Button>
        </div>
      </div>
    )
  const removeObservation = () => {
    dispatch({ type: 'REVIEW_RECORD', studentId: student.id, recordId: record.id, status: 'ACEPTADO' })
    setRemoveOpen(false)
  }
  const redo = () => {
    if (!comment.trim()) return
    dispatch({
      type: 'REVIEW_RECORD',
      studentId: student.id,
      recordId: record.id,
      status: 'REHACER_SUGERIDO',
      comment: comment.trim(),
    })
    setRedoOpen(false)
    setComment('')
  }
  const observed = record.preliminaryReview === 'OBSERVADO' || record.reviewStatus === 'REHACER_SUGERIDO'
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <Button className="px-0" onClick={back} variant="link">
        <ArrowLeft /> Volver al progreso
      </Button>
      <StaffEntityHeader
        title={activity?.name ?? 'Registro'}
        initials={activity?.code.slice(0, 2) ?? 'RE'}
        details={
          <>
            <p>{activity?.code}</p>
            <p>
              {student.name} · versión {record.version} · {new Date(record.date).toLocaleString('es-PE')}
            </p>
          </>
        }
        metrics={
          <div className="flex flex-wrap gap-2">
            {observed ? (
              <Button onClick={() => setRemoveOpen(true)} variant="outline">
                <EyeOff /> Quitar observación
              </Button>
            ) : (
              <Button onClick={() => setRedoOpen(true)}>
                <RotateCcw /> Observar y sugerir rehacer
              </Button>
            )}
          </div>
        }
      />
      {observed && (
        <StaffAlertCard title="Observación a nivel de registro">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="warning">Observado</Badge>
          </div>
          <p className="mt-2 text-sm leading-6 text-warning-text">
            {record.counselorComment || record.reviewReason || 'Este registro requiere revisión.'}
          </p>
        </StaffAlertCard>
      )}
      <div className="space-y-4">
        {record.items.map((item, index) => (
          <Card className="p-6" key={item.id}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ítem {index + 1}
            </p>
            <h2 className="mt-2 font-bold">{item.prompt}</h2>
            <div className="mt-4 rounded-xl bg-muted/50 p-4 text-sm leading-7 whitespace-pre-wrap">
              {item.response || 'Sin respuesta'}
            </div>
          </Card>
        ))}
      </div>
      <Dialog onOpenChange={setRedoOpen} open={redoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Observar y sugerir rehacer</DialogTitle>
            <DialogDescription>
              La decisión se aplicará a todo el registro. Indica en el comentario qué observas y a qué ítem
              corresponde.
            </DialogDescription>
          </DialogHeader>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Comentario de observación *</span>
            <textarea
              className="min-h-32 w-full rounded-xl border bg-background p-3"
              onChange={(event) => setComment(event.target.value)}
              placeholder="Ej. En el ítem 2 falta explicar..."
              value={comment}
            />
          </label>
          <Button disabled={!comment.trim()} onClick={redo}>
            Registrar observación y sugerir rehacer
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog onOpenChange={setRemoveOpen} open={removeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quitar observación</DialogTitle>
            <DialogDescription>
              ¿Estás segura de que deseas quitar la observación de este registro?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setRemoveOpen(false)} variant="outline">
              Cancelar
            </Button>
            <Button onClick={removeObservation}>Quitar observación</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { StudentRecordDetailView }
