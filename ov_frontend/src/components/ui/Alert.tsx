import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
function Alert({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert"
      role="note"
      className={cn('rounded-xl border bg-card p-4 text-foreground', className)}
      {...props}
    />
  )
}
function AlertTitle({ className, ...props }: ComponentProps<'h3'>) {
  return <h3 className={cn('mb-1 font-semibold', className)} {...props} />
}
function AlertDescription({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('text-sm leading-relaxed', className)} {...props} />
}
export { Alert, AlertTitle, AlertDescription }
