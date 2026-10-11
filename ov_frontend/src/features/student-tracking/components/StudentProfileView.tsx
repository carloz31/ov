import { useTrackingProfile } from '@/features/student-tracking/hooks/useTrackingProfile'

import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/Button'
import { StaffEntityHeader } from '@/components/staff/StaffEntityHeader'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'

import { fullName, relativeAccess } from '../lib/selectors'
import { profileSections } from '../lib/navigation'
import { EmailContact } from '@/features/student-tracking/components/EmailContact'
import { ProgressIndicator } from '@/features/student-tracking/components/ProgressIndicator'
import { QuestionnairesSection } from '@/features/student-tracking/components/QuestionnairesSection'
import { OptionsSection } from '@/features/student-tracking/components/OptionsSection'
import { RecordsSection } from '@/features/student-tracking/components/RecordsSection'
import { SummarySection } from '@/features/student-tracking/components/SummarySection'
import { SecuritySection } from './SecuritySection'
import type { StudentProfile } from '@/types/studentProfile'

import { ProfileAlerts } from '@/features/student-tracking/components/ProfileAlerts'
export function StudentProfileView({ student }: { student: StudentProfile }) {
  const { mainRef, returnTo, section, attention, setSection, priority, general } = useTrackingProfile(student)
  return (
    <main
      ref={mainRef}
      className="min-w-0 space-y-4 px-5 py-4 text-base break-words sm:px-8 sm:py-6 lg:px-10 lg:py-8"
    >
      <Button asChild variant="link" className="min-h-11 h-auto max-w-full px-0 whitespace-normal">
        <Link to={returnTo}>
          <ArrowLeft className="shrink-0" aria-hidden />
          Volver a Mis estudiantes
        </Link>
      </Button>
      <StaffEntityHeader
        title={fullName(student)}
        initials={`${student.nombres[0]}${student.apellidos[0]}`}
        details={
          <>
            <p>Salón: {student.salon}</p>
            <p>Último acceso: {relativeAccess(student.ultimoIngreso)}</p>
            <EmailContact email={student.email} />
          </>
        }
        metrics={
          <>
            <ProgressIndicator title="Avance en lo prioritario" {...priority} priority returnTo={returnTo} />
            <ProgressIndicator title="Avance general" {...general} />
          </>
        }
      />
      <ProfileAlerts key={`${student.id}:${section}`} student={student} returnTo={returnTo} />
      <Tabs value={section} onValueChange={setSection}>
        <TabsList
          appearance="navigation"
          className="hidden w-full justify-start md:flex"
          aria-label="Secciones del perfil"
        >
          {profileSections.map((s) => (
            <TabsTrigger value={s.id} key={s.id} className="min-w-0 flex-1 px-2 text-sm lg:text-base">
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="md:hidden">
          <Select value={section} onValueChange={setSection}>
            <SelectTrigger aria-label="Sección del perfil" className="min-h-11 gap-2 bg-card text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {profileSections.map((s) => (
                <SelectItem value={s.id} key={s.id} className="min-h-11">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <TabsContent value="summary">
          <SummarySection student={student} returnTo={returnTo} />
        </TabsContent>
        <TabsContent value="questionnaires">
          <QuestionnairesSection student={student} returnTo={returnTo} />
        </TabsContent>
        <TabsContent value="records">
          <RecordsSection
            key={String(attention)}
            student={student}
            returnTo={returnTo}
            attention={attention}
          />
        </TabsContent>
        <TabsContent value="options">
          <OptionsSection student={student} />
        </TabsContent>
        <TabsContent value="security">
          <SecuritySection student={student} />
        </TabsContent>
      </Tabs>
    </main>
  )
}
