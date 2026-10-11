import { cva, type VariantProps } from 'class-variance-authority'
import { Children, isValidElement, type HTMLAttributes } from 'react'
import { Check, Clock3, TriangleAlert } from 'lucide-react'
import { useAppTheme } from '@/components/common/ThemeScope'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
  {
    variants: {
      variant: {
        default: 'bg-[var(--primary-soft)] text-primary',
        secondary: 'bg-secondary text-secondary-foreground',
        success: 'bg-[var(--success-soft)] text-success-text',
        warning: 'bg-[var(--warning-soft)] text-warning-text',
        aviso: 'bg-[var(--warning-soft)] text-[var(--alert-text)]',
        attention: 'bg-danger-soft text-danger-text',
        neutral: 'bg-neutral-soft text-neutral-text',
        outline: 'border border-border bg-card text-muted-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>

function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const staff = useAppTheme() === 'staff'
  const hasIcon = Children.toArray(children).some(
    (child) => isValidElement(child) && (typeof child.type !== 'string' || child.type === 'svg'),
  )
  const Icon =
    variant === 'success'
      ? Check
      : ['warning', 'aviso', 'attention'].includes(variant ?? '')
        ? TriangleAlert
        : variant === 'neutral'
          ? Clock3
          : undefined
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {staff && Icon && !hasIcon && <Icon className="size-3.5 shrink-0" aria-hidden="true" />}
      {children}
    </span>
  )
}

export { Badge }
