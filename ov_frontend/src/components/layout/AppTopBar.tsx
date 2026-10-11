import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/Breadcrumb'
import { Separator } from '@/components/ui/Separator'
import { SidebarTrigger } from '@/components/ui/Sidebar'

type AppTopBarProps = { title: string }

function AppTopBar({ title }: AppTopBarProps) {
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
        <Button aria-label="Notificaciones" size="icon" variant="ghost">
          <Bell />
        </Button>
      </div>
    </header>
  )
}

export { AppTopBar }
