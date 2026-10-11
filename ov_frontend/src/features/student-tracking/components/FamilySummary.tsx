import { CompactProgress } from '@/features/student-tracking/components/CompactProgress'
import { EmailContact } from '@/features/student-tracking/components/EmailContact'
import { EmptyMessage } from '@/features/student-tracking/components/EmptyMessage'
import { Panel } from '@/features/student-tracking/components/Panel'
import type { StudentProfile } from '@/types/studentProfile'

export function FamilySummary({ student }: { student: StudentProfile }) {
  const guardian = student.guardian
  const completed = student.conversations.filter((c) => c.state === 'completed').length
  return (
    <Panel title="Familia" id="family">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          {guardian ? (
            <>
              <p className="font-medium">{guardian.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{guardian.relationship} · Apoderado</p>
              <EmailContact email={guardian.email} />
            </>
          ) : (
            <EmptyMessage>
              Sin apoderado registrado. La ruta familiar y las conversaciones necesitan un apoderado
              vinculado.
            </EmptyMessage>
          )}
        </div>
        <div className="space-y-3">
          {guardian && (
            <CompactProgress
              title="Actividades del apoderado"
              completed={guardian.completed}
              total={guardian.total}
            />
          )}
          <div className="border-t pt-3">
            <CompactProgress
              title="Conversaciones"
              completed={completed}
              total={student.conversations.length}
              unit="conversaciones completadas"
              unavailable={!guardian}
            />
            <p className="mt-2 text-sm text-muted-foreground">
              {student.conversations.filter((c) => c.state === 'pending').length} pendientes ·{' '}
              {student.conversations.filter((c) => c.state === 'unavailable').length} aún no disponibles
            </p>
          </div>
        </div>
      </div>
    </Panel>
  )
}
