import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'group grid size-11 shrink-0 cursor-pointer place-items-center rounded outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <span className="grid size-5 place-items-center rounded border border-input bg-card text-primary-foreground group-data-[state=checked]:border-primary group-data-[state=checked]:bg-primary">
        <CheckboxPrimitive.Indicator>
          <Check aria-hidden className="size-4" />
        </CheckboxPrimitive.Indicator>
      </span>
    </CheckboxPrimitive.Root>
  )
}
