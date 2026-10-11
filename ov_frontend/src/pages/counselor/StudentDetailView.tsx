import { StudentRemoveObservationDialog } from '@/features/counselor/components/student-detail/StudentRemoveObservationDialog'
import { StudentObservationDialog } from '@/features/counselor/components/student-detail/StudentObservationDialog'
import { useStudentDetail } from '@/features/counselor/hooks/useStudentDetail'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/Button'

import { StaffAlertCard } from '@/components/staff/StaffAlertCard'
import { StaffEntityHeader } from '@/components/staff/StaffEntityHeader'
import { StaffMetric } from '@/components/staff/StaffMetric'

import { appPaths } from '@/routes/paths'

import { StudentProfileView } from '@/features/student-tracking/components/StudentProfileView'
import { getAlerts, getTrafficLight } from '@/features/counselor/lib/counselorPortalSelectors'

import { AlertChips } from '@/features/counselor/components/AlertChips'
import { TrafficBadge } from '@/features/counselor/components/TrafficBadge'
import { WatchIcon } from '@/features/counselor/components/WatchIcon'

const sections = [
  ['summary', 'Resumen'],
  ['progress', 'Progreso'],
  ['instruments', 'Instrumentos'],
  ['interests', 'Intereses'],
  ['journal', 'Diario'],
  ['family', 'Familia'],
  ['data', 'Datos'],
] as const

function StudentDetailView() {
  const model = useStudentDetail()
  const {
    state,
    navigate,
    params,
    setParams,
    student,
    setObservationOpen,
    setRemoveObservationOpen,
    exampleStudent,
  } = model
  if (exampleStudent) return <StudentProfileView student={exampleStudent} />
  if (!student)
    return (
      <div className="grid min-h-80 place-items-center p-8 text-center">
        <div>
          <h1 className="text-xl font-bold">Estudiante no encontrado</h1>
          <Button className="mt-4" onClick={() => navigate(appPaths.counselor.students)}>
            Volver a estudiantes
          </Button>
        </div>
      </div>
    )
  const requestedSection = params.get('section') === 'records' ? 'progress' : params.get('section')
  const section = sections.some(([id]) => id === requestedSection) ? requestedSection! : 'summary'
  const alerts = getAlerts(state, student)
  const traffic = getTrafficLight(alerts)
  const watched = state.watchlist.some((entry) => entry.studentId === student.id)
  const classroom = state.classrooms.find((item) => item.id === student.classroomId)
  const allStudentActivities = state.activities.filter((activity) => activity.participant === 'ESTUDIANTE')
  const totalCompleted = allStudentActivities.filter((activity) =>
    activity.type === 'CASO'
      ? student.completedCaseIds.includes(activity.id)
      : student.progress.some((entry) => entry.activityId === activity.id && entry.status === 'COMPLETADA'),
  ).length
  const totalPercent = allStudentActivities.length
    ? Math.round((totalCompleted / allStudentActivities.length) * 100)
    : 100
  const daysSinceAccess = Math.max(
    0,
    Math.floor(
      (new Date(state.referenceDate).getTime() - new Date(student.lastAccess).getTime()) / 86_400_000,
    ),
  )
  const toggleObservation = () => (watched ? setRemoveObservationOpen(true) : setObservationOpen(true))
  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <Button className="px-0" onClick={() => navigate(appPaths.counselor.students)} variant="link">
        <ArrowLeft /> Volver a estudiantes
      </Button>
      <StaffEntityHeader
        title={student.name}
        initials={student.name
          .split(' ')
          .filter(Boolean)
          .map((part) => part[0])
          .filter((_, index, initials) => index === 0 || index === initials.length - 1)
          .join('')}
        details={
          <>
            <p>{classroom?.name}</p>
            <p>{student.code}</p>
            <p>Cuenta activa</p>
            <p>
              Último acceso:{' '}
              {daysSinceAccess === 0
                ? 'Hoy'
                : `Hace ${daysSinceAccess} ${daysSinceAccess === 1 ? 'día' : 'días'}`}
            </p>
          </>
        }
        metrics={
          <StaffMetric
            primary
            label="Avance general"
            value={`${totalPercent} %`}
            percent={totalPercent}
            detail={`${totalCompleted} de ${allStudentActivities.length} actividades`}
          />
        }
      >
        <div className="flex flex-wrap items-center gap-3 border-t pt-4">
          <TrafficBadge status={traffic} />
          <span className="ml-auto inline-flex items-center gap-2 text-sm font-medium">
            <WatchIcon active={watched} /> {watched ? 'En observación' : 'Sin observación'}
          </span>
          <Button onClick={toggleObservation} variant={watched ? 'outline' : 'default'}>
            {watched ? 'Quitar de observados' : 'Agregar a observados'}
          </Button>
        </div>
      </StaffEntityHeader>
      {!!alerts.length && (
        <StaffAlertCard title={`${alerts.length} ${alerts.length === 1 ? 'alerta' : 'alertas'}`}>
          <div className="mt-3">
            <AlertChips alerts={alerts} />
          </div>
        </StaffAlertCard>
      )}
      <nav
        data-slot="tabs-list"
        data-appearance="navigation"
        aria-label="Secciones del perfil"
        className="staff-local-nav flex overflow-x-auto"
      >
        {sections.map(([id, label]) => (
          <button
            className="whitespace-nowrap px-4 text-sm font-semibold"
            data-state={section === id ? 'active' : 'inactive'}
            aria-current={section === id ? 'page' : undefined}
            key={id}
            onClick={() => setParams({ section: id })}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>
      {section === 'summary' && <Summary stateStudent={student} />}
      {section === 'progress' && <ProgressSection student={student} />}
      {section === 'instruments' && <InstrumentsSection student={student} />}
      {section === 'interests' && <InterestsSection student={student} />}
      {section === 'journal' && <JournalSection student={student} />}
      {section === 'family' && <FamilySection student={student} />}
      {section === 'data' && <DataSection student={student} />}
      <StudentObservationDialog model={model} />
      <StudentRemoveObservationDialog model={model} />
    </div>
  )
}

import { Summary } from '@/features/counselor/components/student-detail/Summary'

import { ProgressSection } from '@/features/counselor/components/student-detail/ProgressSection'

import { InstrumentsSection } from '@/features/counselor/components/student-detail/InstrumentsSection'

import { InterestsSection } from '@/features/counselor/components/student-detail/InterestsSection'

import { JournalSection } from '@/features/counselor/components/student-detail/JournalSection'

import { FamilySection } from '@/features/counselor/components/student-detail/FamilySection'

import { DataSection } from '@/features/counselor/components/student-detail/DataSection'

export { StudentDetailView }
