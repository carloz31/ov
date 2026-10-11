import { useState } from 'react'
import { useNavigate } from 'react-router'

import { Card } from '@/components/ui/Card'

import { appPaths } from '@/routes/paths'

import {
  formatRelative,
  getActivity,
  getFamilyActivityRows,
} from '@/features/counselor/lib/counselorPortalSelectors'
import { useCounselorPortal } from '@/features/counselor/context/counselorPortalContext'

import type { Student } from '@/features/counselor/types'
import { CircleMetric } from '@/features/counselor/components/student-detail/CircleMetric'
import { CompletionMark } from '@/features/counselor/components/student-detail/CompletionMark'
import { FamilyAction } from '@/features/counselor/components/student-detail/FamilyAction'
import { StatInline } from '@/features/counselor/components/student-detail/StatInline'

export function FamilySection({ student }: { student: Student }) {
  const { state } = useCounselorPortal()
  const navigate = useNavigate()
  const familyRows = getFamilyActivityRows(state, student)
  const guardians = [...(student.guardian ? [student.guardian] : []), ...(student.additionalGuardians ?? [])]
  const [guardianIndex, setGuardianIndex] = useState(0)
  if (!guardians.length)
    return (
      <Card className="grid min-h-72 place-items-center p-8 text-center">
        <div>
          <h2 className="text-2xl font-bold">No se ha registrado ningún apoderado</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Las métricas y actividades familiares aparecerán cuando se registre uno.
          </p>
        </div>
      </Card>
    )
  const guardian = guardians[Math.min(guardianIndex, guardians.length - 1)]
  const completed = familyRows.filter((item) => item.status === 'COMPLETADA').length
  const completedConversations = student.familyConversations.filter(
    (item) => item.studentRecord && item.guardianLetter,
  ).length
  const totalFamilyActivities = familyRows.length + student.familyConversations.length
  const completedFamilyActivities = completed + completedConversations
  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="flex overflow-x-auto border-b">
          {guardians.map((item, index) => (
            <button
              className={`whitespace-nowrap border-b-2 px-5 py-4 text-sm font-semibold ${guardianIndex === index ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
              key={`${item.email}-${index}`}
              onClick={() => setGuardianIndex(index)}
              type="button"
            >
              {item.name} ({item.relationship.toLocaleLowerCase('es-PE')})
            </button>
          ))}
        </div>
        <div className="grid items-center gap-5 p-5 sm:grid-cols-[1fr_auto_auto]">
          <div>
            <StatInline label="Apoderado" value={guardian.name} />
            <div className="mt-3">
              <StatInline
                label="Último acceso"
                value={formatRelative(guardian.lastAccess, state.referenceDate)}
              />
            </div>
          </div>
          <CircleMetric
            completed={completedFamilyActivities}
            label="Actividades familiares"
            percent={
              totalFamilyActivities
                ? Math.round((completedFamilyActivities / totalFamilyActivities) * 100)
                : 100
            }
            total={totalFamilyActivities}
            unit="actividades completadas"
          />
          <CircleMetric
            completed={completedConversations}
            label="Conversaciones"
            percent={
              student.familyConversations.length
                ? Math.round((completedConversations / student.familyConversations.length) * 100)
                : 100
            }
            total={student.familyConversations.length}
            unit="conversaciones terminadas"
          />
        </div>
      </Card>
      <div className="space-y-5">
        <h2 className="text-lg font-bold">Actividades del apoderado</h2>
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/40 px-6 py-4">
            <h3 className="font-bold">Informativas</h3>
            <p className="text-xs text-muted-foreground">
              {completed} de {familyRows.length} actividades completadas
            </p>
          </div>
          <div className="divide-y">
            {familyRows.map((item) => {
              const activity = getActivity(state, item.activityId)
              const complete = item.status === 'COMPLETADA'
              return (
                <div className="flex items-center gap-4 px-6 py-4" key={item.activityId}>
                  <CompletionMark complete={complete} />
                  <div className="min-w-0 flex-1">
                    <strong className="text-sm">
                      {activity?.code} · {activity?.name}
                    </strong>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {complete && item.completedAt
                        ? `Completada ${new Date(item.completedAt).toLocaleDateString('es-PE')}`
                        : 'No completada'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/40 px-6 py-4">
            <h3 className="font-bold">Registros</h3>
            <p className="text-xs text-muted-foreground">
              {completedConversations} de {student.familyConversations.length} actividades completadas
            </p>
          </div>
          <div className="divide-y">
            {student.familyConversations.map((item) => {
              const activity = getActivity(state, item.activityId)
              const complete = Boolean(item.studentRecord && item.guardianLetter)
              return (
                <div className="flex items-center gap-4 px-6 py-4" key={item.activityId}>
                  <CompletionMark complete={complete} />
                  <div className="min-w-0 flex-1">
                    <strong className="text-sm">
                      {activity?.code} · {activity?.name}
                    </strong>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {complete && item.completedAt
                        ? `Completada ${new Date(item.completedAt).toLocaleDateString('es-PE')}`
                        : 'No completada'}
                    </p>
                  </div>
                  <FamilyAction
                    onView={() => navigate(appPaths.counselor.familyRecord(student.id, item.activityId))}
                  />
                </div>
              )
            })}
          </div>
        </Card>
      </div>
      <Card className="overflow-x-auto">
        <div className="border-b p-5">
          <h2 className="font-bold">Conversaciones</h2>
        </div>
        <table className="w-full min-w-[900px] text-left text-sm [&_td:last-child]:pr-8 [&_th:last-child]:pr-8">
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="p-4">Título del tema</th>
              <th>Bloque</th>
              <th>Estudiante</th>
              <th>Apoderado</th>
              <th>Conversado</th>
              <th className="w-24 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {student.familyConversations.map((item, index) => {
              const activity = getActivity(state, item.activityId)
              const studentDone = Boolean(item.studentRecord)
              const guardianDone = Boolean(item.guardianLetter)
              return (
                <tr key={item.activityId}>
                  <td className="p-4 font-medium">{activity?.name ?? `Conversación ${index + 1}`}</td>
                  <td>{activity?.block ?? 'Familia'}</td>
                  <td>
                    <CompletionMark complete={studentDone} />
                  </td>
                  <td>
                    <CompletionMark complete={guardianDone} />
                  </td>
                  <td>
                    <CompletionMark complete={studentDone && guardianDone} />
                  </td>
                  <td className="text-center">
                    <FamilyAction
                      onView={() => navigate(appPaths.counselor.familyRecord(student.id, item.activityId))}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
