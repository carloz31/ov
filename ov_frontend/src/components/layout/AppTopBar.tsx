import type { ReactNode } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/Breadcrumb'
import { Separator } from '@/components/ui/Separator'
import { SidebarTrigger } from '@/components/ui/Sidebar'

// Ajuste notificaciones: `campana` reemplaza la campana sin función (null, sin campana); sin ella, la de siempre.
type AppTopBarProps = { title: string; campana?: ReactNode }

function AppTopBar({ title, campana }: AppTopBarProps) {
  return (
    <header className="app-topbar relative z-20 grid h-16 shrink-0 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center border-b bg-white/95 px-4 backdrop-blur transition-[height] duration-200 ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-6">
      <div className="flex min-w-0 items-center">
        <SidebarTrigger className="-ml-1 shrink-0 text-muted-foreground hover:bg-muted" />
        <Separator className="mx-3 h-4" orientation="vertical" />
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="min-w-0 flex-nowrap">
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="truncate font-semibold">{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="ml-3 flex shrink-0 items-center">
        {campana === undefined ? (
          <Button aria-label="Notificaciones" size="icon" variant="ghost">
            <Bell />
          </Button>
        ) : (
          campana
        )}
      </div>
    </header>
  )
}

export { AppTopBar }
