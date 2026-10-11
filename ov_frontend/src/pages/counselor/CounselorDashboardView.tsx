import { DashboardInstitutions } from '@/features/counselor/components/dashboard/DashboardInstitutions'
import { DashboardCareers } from '@/features/counselor/components/dashboard/DashboardCareers'
import { DashboardSecurity } from '@/features/counselor/components/dashboard/DashboardSecurity'
import { DashboardRecords } from '@/features/counselor/components/dashboard/DashboardRecords'
import { DashboardQuestionnaires } from '@/features/counselor/components/dashboard/DashboardQuestionnaires'
import { DashboardAlerts } from '@/features/counselor/components/dashboard/DashboardAlerts'
import { DashboardMetrics } from '@/features/counselor/components/DashboardMetrics'
import { useCounselorDashboard } from '@/features/counselor/hooks/useCounselorDashboard'

import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'

import { StaffEntityHeader } from '@/components/staff/StaffEntityHeader'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'

function CounselorDashboardView() {
  const model = useCounselorDashboard()
  const { salon, setSalon, salons, section, setSection, summary, listUrl } = model
  return (
    <main className="min-w-0 space-y-6 p-4 sm:p-6 lg:p-7">
      <StaffEntityHeader
        title="Inicio"
        initials={salon === 'all' ? 'MS' : salon}
        details={
          <>
            <span>{salon === 'all' ? 'Todos mis salones' : `Salón: ${salon}`}</span>
            <span>{summary.total} estudiantes</span>
          </>
        }
        metrics={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Select value={salon} onValueChange={setSalon}>
              <SelectTrigger aria-label="Filtrar por salón" className="min-h-11 w-full bg-card sm:w-48">
                <SelectValue>{salon === 'all' ? 'Todos mis salones' : `Salón: ${salon}`}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos mis salones</SelectItem>
                {salons.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button asChild variant="outline" className="min-h-11 whitespace-normal">
              <Link to={listUrl}>Ver estudiantes del salón</Link>
            </Button>
          </div>
        }
      />
      <Tabs value={section} onValueChange={setSection} className="space-y-6">
        <TabsList
          appearance="navigation"
          aria-label="Vista del inicio"
          className="flex w-full items-stretch sm:w-fit"
        >
          <TabsTrigger value="tracking" className="min-w-0 flex-1 text-sm whitespace-normal sm:flex-none">
            Seguimiento
          </TabsTrigger>
          <TabsTrigger value="interests" className="min-w-0 flex-1 text-sm whitespace-normal sm:flex-none">
            Intereses vocacionales
          </TabsTrigger>
        </TabsList>
        <DashboardMetrics model={model} />
        <TabsContent value="tracking">
          <div className="grid min-w-0 items-stretch gap-6 lg:grid-cols-2">
            {summary.withAlerts > 0 && <DashboardAlerts model={model} />}
            <DashboardQuestionnaires model={model} />
            <DashboardRecords model={model} />
            <DashboardSecurity model={model} />
          </div>
        </TabsContent>
        <TabsContent value="interests">
          <div className="grid min-w-0 items-stretch gap-6 lg:grid-cols-2">
            <DashboardCareers model={model} />
            <DashboardInstitutions model={model} />
          </div>
        </TabsContent>
      </Tabs>
    </main>
  )
}
export { CounselorDashboardView }
