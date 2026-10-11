import { ParentRouteSummary } from '@/features/parent/components/ParentRouteSummary'
import { ParentConversationNotice } from '@/features/parent/components/ParentConversationNotice'
import { ParentChildrenSummary } from '@/features/parent/components/ParentChildrenSummary'
import { useParentOverview } from '@/features/parent/hooks/useParentOverview'

import { parentProfile } from '@/features/parent/data/parentPortal'
import { parentMotivation } from '@/features/parent/data/parentMotivation'
import '@/features/parent/styles/parent-activities.css'

function ParentOverviewView() {
  const model = useParentOverview()
  const { mainRef } = model
  return (
    <main ref={mainRef} className="parent-overview min-w-0 space-y-4 p-4 sm:p-6 lg:p-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Tu recorrido en familia
        </p>
        <h1 className="text-3xl font-bold">Hola, {parentProfile.firstName}</h1>
        <p className="text-muted-foreground">{parentMotivation('greeting')}</p>
      </header>
      <ParentChildrenSummary model={model} />
      <div className="flex flex-col gap-4">
        <ParentConversationNotice model={model} />
        <ParentRouteSummary model={model} />
      </div>
    </main>
  )
}
export { ParentOverviewView }
