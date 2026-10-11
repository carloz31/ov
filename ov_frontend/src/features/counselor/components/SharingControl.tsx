import { Checkbox } from '@/components/ui/Checkbox'

import { shareableQuestionnaireIds } from '@/features/counselor/store/prioritySettings'

import type { usePriorities } from '@/features/counselor/hooks/usePriorities'
export function SharingControl({
  model,
  id,
  name,
  mobile = false,
}: {
  model: ReturnType<typeof usePriorities>
  id: string
  name: string
  mobile?: boolean
}) {
  const { editing, settings, changeDraft, setConfirmation } = model
  return shareableQuestionnaireIds.includes(id) ? (
    <label
      className="flex min-h-11 w-fit max-w-full cursor-pointer items-center gap-3"
      htmlFor={`sharing-${mobile ? 'mobile-' : ''}${id}`}
    >
      <Checkbox
        id={`sharing-${mobile ? 'mobile-' : ''}${id}`}
        aria-label={`Visible para el apoderado: ${name}`}
        disabled={!editing}
        checked={settings.sharedQuestionnaireIds.includes(id)}
        onCheckedChange={(checked) =>
          checked === true
            ? setConfirmation({ kind: 'sharing', id })
            : changeDraft({ type: 'sharing', id, checked: false })
        }
      />
      <span>Visible para el apoderado</span>
    </label>
  ) : (
    <p className="py-2 text-muted-foreground">No se comparte</p>
  )
}
