import { useStudentRecords } from '@/features/counselor/hooks/useStudentRecords'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/Sheet'

import { getActivity } from '@/features/counselor/lib/counselorPortalSelectors'

import type { Student } from '@/features/counselor/types'

export function RecordsSection({ student }: { student: Student }) {
  const { state, records, selected, setSelected, redoRecord, setRedoRecord, comment, setComment, act } =
    useStudentRecords(student)
  return (
    <>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm [&_td:last-child]:pr-8 [&_th:last-child]:pr-8">
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="p-4">Actividad</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Observación</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {records.map((record) => {
              const activity = getActivity(state, record.activityId)
              return (
                <tr key={record.id}>
                  <td className="p-4 font-medium">
                    {activity?.code} · {activity?.name}
                  </td>
                  <td>
                    <Badge
                      variant={
                        record.reviewStatus === 'SIN_ATENDER'
                          ? 'warning'
                          : record.reviewStatus === 'REHACER_SUGERIDO'
                            ? 'default'
                            : 'success'
                      }
                    >
                      {record.reviewStatus.replaceAll('_', ' ')}
                    </Badge>
                  </td>
                  <td>{new Date(record.date).toLocaleDateString('es-PE')}</td>
                  <td>
                    <Badge variant={record.preliminaryReview === 'ADECUADO' ? 'outline' : 'warning'}>
                      {record.preliminaryReview === 'OBSERVADO' ? 'Observado' : 'Sin observaciones'}
                      {record.reviewReason ? ` · ${record.reviewReason}` : ''}
                    </Badge>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <Button onClick={() => setSelected(record)} size="sm" variant="outline">
                        Ver
                      </Button>
                      {record.reviewStatus === 'SIN_ATENDER' && (
                        <>
                          <Button onClick={() => setRedoRecord(record)} size="sm">
                            Sugerir rehacer
                          </Button>
                          <Button onClick={() => act(record, 'ACEPTADO')} size="sm" variant="ghost">
                            Está bien
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
      <Sheet onOpenChange={(open) => !open && setSelected(undefined)} open={Boolean(selected)}>
        <SheetContent className="overflow-y-auto" side="responsive">
          <SheetHeader>
            <SheetTitle>{getActivity(state, selected?.activityId ?? '')?.name}</SheetTitle>
            <SheetDescription>Premisa, entregable y versiones del registro.</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="mt-6 space-y-5">
              <div>
                <h3 className="text-sm font-bold">Premisa</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {getActivity(state, selected.activityId)?.premise}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-bold">Entregable · versión {selected.version}</h3>
                <p className="mt-2 whitespace-pre-wrap rounded-xl bg-muted p-4 text-sm">
                  {selected.text || selected.fileName || 'Sin contenido'}
                </p>
              </div>
              {student.records
                .filter((item) => item.activityId === selected.activityId)
                .map((version) => (
                  <Badge key={version.id} variant="outline">
                    Versión {version.version} · {new Date(version.date).toLocaleDateString('es-PE')}
                  </Badge>
                ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
      <Dialog onOpenChange={(open) => !open && setRedoRecord(undefined)} open={Boolean(redoRecord)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sugerir rehacer</DialogTitle>
            <DialogDescription>
              El comentario es opcional. El prototipo registrará la solicitud como notificada.
            </DialogDescription>
          </DialogHeader>
          <textarea
            className="min-h-28 w-full rounded-xl border bg-background p-3 text-sm"
            onChange={(event) => setComment(event.target.value)}
            placeholder="Explica qué podría revisar..."
            value={comment}
          />
          <Button
            onClick={() => {
              if (redoRecord) act(redoRecord, 'REHACER_SUGERIDO', comment.trim() || undefined)
              setRedoRecord(undefined)
              setComment('')
            }}
          >
            Confirmar sugerencia
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
