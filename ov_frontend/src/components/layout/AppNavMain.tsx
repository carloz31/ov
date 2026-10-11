import { ChevronRight } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/Sidebar'
import type { AppNavigationGroup } from './navigation'

type AppNavMainProps = {
  activeItemId: string
  groups: AppNavigationGroup[]
}

function AppNavMain({ activeItemId, groups }: AppNavMainProps) {
  const { setOpenMobile } = useSidebar()

  const selectItem = (onSelect?: () => void) => {
    onSelect?.()
    setOpenMobile(false)
  }

  return groups.map((group) => (
    <SidebarGroup key={group.label}>
      <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {group.items.map((item) => {
            const hasActiveChild = item.children?.some((child) => child.id === activeItemId) ?? false
            const isActive = item.id === activeItemId || hasActiveChild

            if (!item.children?.length) {
              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    className="h-11 rounded-xl"
                    isActive={isActive}
                    onClick={() => selectItem(item.onSelect)}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span className="group-data-[collapsible=icon]:sr-only">{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            }

            return (
              <Collapsible asChild className="group/collapsible" defaultOpen={isActive} key={item.id}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="h-11 rounded-xl" isActive={isActive} tooltip={item.label}>
                      <item.icon />
                      <span className="group-data-[collapsible=icon]:sr-only">{item.label}</span>
                      <ChevronRight className="ml-auto group-data-[collapsible=icon]:hidden transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.children.map((child) => (
                        <SidebarMenuSubItem key={child.id}>
                          <SidebarMenuSubButton
                            asChild
                            className="h-9 rounded-lg"
                            isActive={child.id === activeItemId}
                          >
                            <button onClick={() => selectItem(child.onSelect)} type="button">
                              <span>{child.label}</span>
                            </button>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  ))
}

export { AppNavMain }
