import * as TabsPrimitive from '@radix-ui/react-tabs'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
const Tabs = TabsPrimitive.Root
function TabsList({
  className,
  appearance = 'segmented',
  ...props
}: ComponentProps<typeof TabsPrimitive.List> & { appearance?: 'segmented' | 'navigation' }) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-appearance={appearance}
      className={cn(
        'inline-flex min-h-11 items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}
function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex min-h-11 items-center justify-center rounded-md px-3 py-2 text-base font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        className,
      )}
      {...props}
    />
  )
}
function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn('mt-4 min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
      {...props}
    />
  )
}
export { Tabs, TabsList, TabsTrigger, TabsContent }
