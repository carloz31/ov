import { Checkbox } from '@/components/ui/Checkbox'

import type { usePriorities } from '@/features/counselor/hooks/usePriorities'
export function PriorityControl({
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
  const { editing, settings, changeDraft } = model
  return (
    <label
      className="flex min-h-11 w-fit max-w-full cursor-pointer items-center gap-3"
      htmlFor={`priority-${mobile ? 'mobile-' : ''}${id}`}
    >
      <Checkbox
        id={`priority-${mobile ? 'mobile-' : ''}${id}`}
        aria-label={`Prioritario: ${name}`}
        disabled={!editing}
        checked={settings.questionnaireIds.includes(id)}
        onCheckedChange={(checked) => changeDraft({ type: 'questionnaire', id, checked: checked === true })}
      />
      <span>Prioritario</span>
    </label>
  )
}
