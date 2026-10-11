import { usePriorities } from '@/features/counselor/hooks/usePriorities'
import { Search } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { Input } from '@/components/ui/Input'
import { TabsContent } from '@/components/ui/Tabs'
import { blocks } from '@/data/demo/studentProfiles'

import { recordActivities } from '@/features/counselor/store/prioritySettings'

export function PriorityRecords({ model }: { model: ReturnType<typeof usePriorities> }) {
  const { settings, editing, query, setQuery, setConfirmation, changeDraft, visible } = model
  return (
    <TabsContent value="records">
      <section className="min-w-0 space-y-4" aria-labelledby="records-heading">
        <h2 id="records-heading" className="text-lg font-bold">
          Actividades de registro
        </h2>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              aria-label="Buscar actividad"
              placeholder="Buscar actividad"
              className="min-h-11 bg-card pl-10 text-base"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="mr-1">
              {settings.recordIds.length} de {recordActivities.length} marcadas
            </span>
            <Button
              variant="outline"
              className="min-h-11"
              disabled={!editing || settings.recordIds.length === recordActivities.length}
              onClick={() => changeDraft({ type: 'all-records', checked: true })}
            >
              Marcar todas
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              disabled={!editing || !settings.recordIds.length}
              onClick={() => setConfirmation({ kind: 'clear' })}
            >
              Quitar todas
            </Button>
          </div>
        </div>
        {!visible.length && (
          <p className="rounded-xl border bg-card p-4 text-muted-foreground">
            No hay actividades que coincidan con tu búsqueda.
          </p>
        )}
        {blocks.map((block) => {
          const records = visible.filter((a) => a.blockId === block.id)
          return (
            records.length > 0 && (
              <Card key={block.id} className="min-w-0 gap-0 overflow-hidden rounded-xl">
                <h3 className="border-b bg-muted px-4 py-3 font-semibold">{block.name}</h3>
                <div className="divide-y">
                  {records.map((activity) => (
                    <div className="p-4" key={activity.id}>
                      <label
                        htmlFor={`record-${activity.id}`}
                        className="flex min-h-11 w-fit max-w-full cursor-pointer items-center gap-3"
                      >
                        <Checkbox
                          id={`record-${activity.id}`}
                          aria-label={activity.title}
                          disabled={!editing}
                          checked={settings.recordIds.includes(activity.id)}
                          onCheckedChange={(checked) =>
                            changeDraft({ type: 'record', id: activity.id, checked: checked === true })
                          }
                        />
                        <span className="font-medium">{activity.title}</span>
                      </label>
                      <p className="pl-14 text-sm text-muted-foreground">
                        {activity.items?.map((item) => item.name).join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )
          )
        })}
      </section>
    </TabsContent>
  )
}
