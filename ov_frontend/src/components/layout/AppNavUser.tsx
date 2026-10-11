import { ChevronsUpDown, CircleUserRound, LogOut } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/Avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/Sidebar'

type AppNavUserProps = {
  onLogout?: () => void
  onOpenProfile?: () => void
  userName?: string
  userRole?: string
}

function AppNavUser({
  onLogout,
  onOpenProfile,
  userName = 'Alex',
  userRole = 'Estudiante',
}: AppNavUserProps) {
  const { isMobile, setOpenMobile } = useSidebar()
  const initials = userName.slice(0, 2).toUpperCase()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              aria-label={`${userName}, ${userRole}`}
              className="h-12 rounded-xl data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              size="lg"
            >
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-[var(--primary-soft)] font-bold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">{userName}</span>
                <span className="truncate text-xs text-muted-foreground">{userRole}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-60 rounded-xl"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={8}
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-2 py-1">
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-[var(--primary-soft)] font-bold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{userName}</span>
                  <span className="truncate text-xs text-muted-foreground">{userRole}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                onOpenProfile?.()
                setOpenMobile(false)
              }}
            >
              <CircleUserRound /> Mi perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={!onLogout} onSelect={onLogout}>
              <LogOut /> Cerrar sesión
              {!onLogout && <span className="ml-auto text-[10px] text-muted-foreground">Próximamente</span>}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export { AppNavUser }
