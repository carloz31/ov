import { useCounselorDashboard } from '@/features/counselor/hooks/useCounselorDashboard'

import { InterestTable } from '@/features/counselor/components/InterestTable'
import { Section } from '@/features/counselor/components/Section'

export function DashboardInstitutions({ model }: { model: ReturnType<typeof useCounselorDashboard> }) {
  const { summary } = model
  return (
    <Section title="Instituciones de interés">
      <InterestTable rows={summary.interests.institutions} total={summary.total} institutions />
      <p className="mt-auto text-xs text-muted-foreground">
        Instituciones registradas en planes y favoritas. Datos de ejemplo del prototipo.
      </p>
    </Section>
  )
}
