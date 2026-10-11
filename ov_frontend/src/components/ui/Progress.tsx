import * as ProgressPrimitive from '@radix-ui/react-progress'
import type { ComponentProps } from 'react'
import { useAppTheme } from '@/components/common/ThemeScope'
import { cn } from '@/lib/utils'

type ProgressProps = ComponentProps<typeof ProgressPrimitive.Root> & {
  intent?: 'completion' | 'data'
  dataTone?: 'primary' | 'secondary' | 'baseline'
}
function Progress({
  className,
  value = 0,
  intent = 'completion',
  dataTone = 'primary',
  ...props
}: ProgressProps) {
  const theme = useAppTheme()
  const normalizedValue = value ?? 0

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={normalizedValue}
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-secondary', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="h-full w-full flex-1 bg-primary transition-transform duration-500"
        style={{
          transform: `translateX(-${100 - normalizedValue}%)`,
          backgroundColor:
            theme === 'staff'
              ? intent === 'data'
                ? `var(--data-${dataTone})`
                : 'var(--primary)'
              : undefined,
        }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
