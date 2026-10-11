import { Badge } from '@/components/ui/Badge'

import { Card } from '@/components/ui/Card'

import { useCounselorPortal } from '@/features/counselor/context/counselorPortalContext'

import type { Student } from '@/features/counselor/types'
import { DataItem } from '@/features/counselor/components/student-detail/DataItem'

export function DataSection({ student }: { student: Student }) {
  const { state } = useCounselorPortal()
  const watch = state.watchlist.find((entry) => entry.studentId === student.id)
  const classroom = state.classrooms.find((item) => item.id === student.classroomId)
  const guardians = [...(student.guardian ? [student.guardian] : []), ...(student.additionalGuardians ?? [])]
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(18rem,3fr)]">
      <div className="space-y-5">
        <Card className="p-6">
          <h2 className="font-bold">Datos del estudiante</h2>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <DataItem label="Nombres y apellidos" value={student.name} />
            <DataItem label="Código" value={student.code} />
            <DataItem label="Promoción" value={classroom?.promotion} />
            <DataItem
              label="Grado y sección"
              value={classroom ? `${classroom.grade} · ${classroom.section}` : undefined}
            />
            <DataItem label="Correo" value={student.email} />
            <DataItem label="Teléfono" value={student.phone} />
            <DataItem
              label="Fecha de primer acceso"
              value={new Date(student.firstAccess).toLocaleString('es-PE', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            />
            <DataItem
              label="Último acceso"
              value={new Date(student.lastAccess).toLocaleString('es-PE', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            />
          </dl>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold">Datos de apoderados</h2>
            <Badge variant={guardians.length ? 'secondary' : 'outline'}>
              {guardians.length === 0
                ? 'Ninguno'
                : `${guardians.length} ${guardians.length === 1 ? 'registrado' : 'registrados'}`}
            </Badge>
          </div>
          {guardians.length ? (
            <div className="mt-5 space-y-4">
              {guardians.map((guardian, index) => (
                <section className="rounded-xl border p-4" key={`${guardian.email}-${index}`}>
                  <h3 className="font-semibold">Apoderado {index + 1}</h3>
                  <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                    <DataItem label="Nombres y apellidos" value={guardian.name} />
                    <DataItem label="Parentesco" value={guardian.relationship} />
                    <DataItem label="Correo" value={guardian.email} />
                    <DataItem label="Teléfono" value={guardian.phone} />
                    <DataItem
                      label="Fecha de primer acceso"
                      value={new Date(guardian.firstAccess).toLocaleString('es-PE', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    />
                    <DataItem
                      label="Último acceso"
                      value={new Date(guardian.lastAccess).toLocaleString('es-PE', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    />
                  </dl>
                </section>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-xl bg-muted/50 p-5 text-sm text-muted-foreground">
              No se ha registrado ningún apoderado.
            </p>
          )}
        </Card>
      </div>
      <Card className="p-6 lg:sticky lg:top-4">
        <h2 className="font-bold">Observación</h2>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">En observación</span>
          <Badge
            className={watch ? 'bg-warning-soft text-warning-text' : undefined}
            variant={watch ? 'secondary' : 'outline'}
          >
            {watch ? 'Sí' : 'No'}
          </Badge>
        </div>
        {watch && (
          <div className="mt-5 border-t pt-5">
            <p className="text-sm font-semibold">Motivo</p>
            <p className="mt-2 rounded-xl bg-muted/50 p-4 text-sm leading-6">
              {watch.reason || 'Sin motivo registrado.'}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              En observación desde {new Date(watch.date).toLocaleDateString('es-PE')}
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
