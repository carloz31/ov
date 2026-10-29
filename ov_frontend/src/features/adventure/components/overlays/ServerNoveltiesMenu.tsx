import { useServerNovelties } from '@/features/adventure/hooks/useNovelties'
import { Bell } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/DropdownMenu'
export function ServerNoveltiesMenu({ glass }: { glass: boolean }) {
  const { open, setOpen, pendientes } = useServerNovelties()

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={`sx-icon-button sx-novelties-bell ${glass ? 'sx-glass' : ''}`}
          aria-label="Novedades"
        >
          <Bell size={20} />
          {pendientes > 0 && <span className="sx-novelties-count">{pendientes}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="sx-root sx-novelties-menu">
        <h2>Novedades</h2>
        {pendientes ? <p>Tienes {pendientes} novedades sin ver</p> : <p>No tienes novedades pendientes</p>}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
