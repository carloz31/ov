import { useCounselorDashboard } from '@/features/counselor/hooks/useCounselorDashboard'

import { InterestTable } from '@/features/counselor/components/InterestTable'
import { Section } from '@/features/counselor/components/Section'

export function DashboardCareers({ model }: { model: ReturnType<typeof useCounselorDashboard> }) {
  const { summary } = model
  return (
    <Section title="Carreras de interés">
      <InterestTable rows={summary.interests.careers} total={summary.total} />
      <p className="mt-auto border-t pt-4 text-sm text-muted-foreground">
        Mantienen su interés inicial como plan A:{' '}
        <strong className="text-foreground">
          {summary.plans.initialA} de {summary.total - summary.plans.noInitial}
        </strong>
      </p>
    </Section>
  )
}
