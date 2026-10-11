import { PriorityRecords } from '@/features/counselor/components/PriorityRecords'
import { PriorityTools } from '@/features/counselor/components/PriorityTools'
import { TabsTrigger } from '@/components/ui/Tabs'
import { PriorityConfirmation } from '@/features/counselor/components/PriorityConfirmation'
import { usePriorities } from '@/features/counselor/hooks/usePriorities'

import { ArrowLeft, Check, Pencil, Save } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'

import { Tabs, TabsList } from '@/components/ui/Tabs'

import { safeReturnTo } from '@/features/student-tracking/lib/navigation'

function PrioritiesView() {
  const model = usePriorities()
  const {
    savedSettings,
    setDraft,
    editing,
    dirty,
    section,
    setSection,
    params,
    setConfirmation,
    saved,
    setSaved,
  } = model
  return (
    <main className="mx-auto min-w-0 max-w-6xl space-y-6 px-5 py-4 text-base break-words sm:px-8 sm:py-6 lg:px-10 lg:py-8">
      {params.has('returnTo') && (
        <Button asChild variant="link" className="min-h-11 h-auto max-w-full px-0 whitespace-normal">
          <Link to={safeReturnTo(params.get('returnTo'))}>
            <ArrowLeft aria-hidden />
            Volver a Mis estudiantes
          </Link>
        </Button>
      )}
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Prioritarios</h1>
        <p>
          Selecciona las herramientas y actividades de registro que quieres filtrar para revisar rápidamente
          lo más prioritario de los perfiles de tus estudiantes.
        </p>
        <p className="text-sm text-muted-foreground">
          Esta configuración aplica a todos tus salones. Tus estudiantes siguen realizando todas las
          actividades.
        </p>
      </header>
      <Tabs value={section} onValueChange={setSection} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList aria-label="Tipo de prioritarios" className="flex max-w-full">
            <TabsTrigger value="tools" className="min-w-0 px-3 text-sm whitespace-normal">
              Herramientas
            </TabsTrigger>
            <TabsTrigger value="records" className="min-w-0 px-3 text-sm whitespace-normal">
              Actividades de registro
            </TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap gap-2">
            {editing ? (
              <>
                <Button
                  variant="outline"
                  className="min-h-11"
                  onClick={() => {
                    setDraft(null)
                    setConfirmation(null)
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="min-h-11"
                  disabled={!dirty}
                  onClick={() => setConfirmation({ kind: 'save' })}
                >
                  <Save aria-hidden />
                  Guardar cambios
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => {
                  setDraft(savedSettings)
                  setSaved(false)
                }}
              >
                <Pencil aria-hidden />
                Editar
              </Button>
            )}
          </div>
        </div>
        <PriorityTools model={model} />
        <PriorityRecords model={model} />
      </Tabs>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={
          saved
            ? 'pointer-events-none fixed right-4 bottom-4 left-4 z-40 flex items-center gap-2 rounded-xl border bg-card p-4 text-sm shadow-[var(--shadow-card)] sm:left-auto'
            : 'sr-only'
        }
      >
        {saved && (
          <>
            <Check aria-hidden className="size-5 text-success-text" />
            Cambios guardados
          </>
        )}
      </div>
      <PriorityConfirmation model={model} />
    </main>
  )
}
export { PrioritiesView }
