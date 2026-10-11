import { AlertTriangle } from 'lucide-react'

import { useNavigate } from 'react-router'

import { Card } from '@/components/ui/Card'

import { appPaths } from '@/routes/paths'

import {
  getAlertExplanation,
  getAlerts,
  getFamilyActivityRows,
  getInterestCounts,
  getPendingReviewRecords,
  getStudentTagRows,
} from '@/features/counselor/lib/counselorPortalSelectors'
import { useCounselorPortal } from '@/features/counselor/context/counselorPortalContext'

import type { Student } from '@/features/counselor/types'

export function Summary({ stateStudent: student }: { stateStudent: Student }) {
  const { state } = useCounselorPortal()
  const navigate = useNavigate()
  const alerts = getAlerts(state, student)
  const tagRows = getStudentTagRows(state, student)
    .sort((a, b) => (a.exit ?? a.entry ?? 6) - (b.exit ?? b.entry ?? 6))
    .slice(0, 3)
  const interestCounts = getInterestCounts(student)
  const pending = getPendingReviewRecords(state, student).length
  const familyRows = getFamilyActivityRows(state, student)
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card className="p-5">
        <h2 className="font-bold">Alertas explicadas</h2>
        <div className="mt-4 space-y-3">
          {alerts.length ? (
            alerts.map((alert) => (
              <div
                className="flex gap-3 rounded-xl border border-border bg-warning-soft p-4 text-warning-text"
                key={alert}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-warning-soft text-warning-text">
                  <AlertTriangle className="size-4" />
                </span>
                <p className="self-center text-sm leading-6">
                  <strong>{alert}:</strong> {getAlertExplanation(state, student, alert)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No hay alertas activas.</p>
          )}
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="font-bold">Temas a reforzar</h2>
        <div className="mt-4 space-y-3">
          {tagRows.map((row) => (
            <button
              className="flex w-full items-center justify-between rounded-xl border p-3 text-left hover:bg-muted/30"
              key={row.tag.id}
              onClick={() =>
                navigate(`${appPaths.counselor.publications}?tab=publications&tag=${row.tag.id}`)
              }
              type="button"
            >
              <span>
                <strong className="text-sm">
                  {row.tag.code} · {row.tag.name}
                </strong>
                <span className="block text-xs text-muted-foreground">Ver recursos relacionados</span>
              </span>
              <strong>{(row.exit ?? row.entry)?.toFixed(1) ?? '—'}</strong>
            </button>
          ))}
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="font-bold">Intereses</h2>
        <p className="mt-3 text-3xl font-bold text-primary">
          {interestCounts.careers + interestCounts.occupations + interestCounts.institutions}
        </p>
        <p className="text-sm text-muted-foreground">
          carreras, ocupaciones e instituciones · {interestCounts.careers - interestCounts.completeCards}{' '}
          fichas de carrera incompletas
        </p>
      </Card>
      <Card className="p-5">
        <h2 className="font-bold">Seguimiento inmediato</h2>
        <p className="mt-3 text-sm">
          Registros pendientes: <strong>{pending}</strong>
        </p>
        <p className="mt-2 text-sm">
          Familia:{' '}
          <strong>
            {student.guardian
              ? `${student.guardian.name} · ${familyRows.filter((item) => item.status === 'COMPLETADA').length}/${familyRows.filter((item) => item.activatedAt).length} actividades`
              : 'Apoderado sin registrar'}
          </strong>
        </p>
      </Card>
    </div>
  )
}
