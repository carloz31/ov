import { useState } from 'react'

import { Progress } from '@/components/ui/Progress'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { activities, blocks } from '@/data/demo/studentProfiles'

import { generalProgress, progressGroups } from '@/features/student-tracking/lib/selectors'

import { CompactProgress } from '@/features/student-tracking/components/CompactProgress'
import { Panel } from '@/features/student-tracking/components/Panel'
import type { StudentProfile } from '@/types/studentProfile'

export function PlatformProgress({ student }: { student: StudentProfile }) {
  const [group, setGroup] = useState<'blocks' | 'types'>('blocks')
  const rows = progressGroups(student, activities, blocks, group)
  const total = generalProgress(student, activities)
  return (
    <Panel title="Detalle de avance" id="progress">
      <Tabs value={group} onValueChange={(value) => setGroup(value as 'blocks' | 'types')}>
        <TabsList aria-label="Agrupar avance" className="mb-4 flex w-full">
          <TabsTrigger value="blocks" className="min-w-0 flex-1 px-2 text-sm">
            Por bloque
          </TabsTrigger>
          <TabsTrigger value="types" className="min-w-0 flex-1 px-2 text-sm">
            Por tipo
          </TabsTrigger>
        </TabsList>
        <TabsContent value={group} className="mt-0 space-y-4">
          {rows.map((row) => (
            <CompactProgress key={row.id} {...row} />
          ))}
        </TabsContent>
      </Tabs>
      <div className="mt-5 rounded-lg border bg-muted p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="font-bold">Avance general</h3>
          <span className="text-xl font-bold">{total.percent} %</span>
        </div>
        <Progress aria-label="Avance general en detalle" value={total.percent} />
        <p className="mt-2 text-sm">
          {total.completed} de {total.total} actividades completadas
        </p>
      </div>
    </Panel>
  )
}
