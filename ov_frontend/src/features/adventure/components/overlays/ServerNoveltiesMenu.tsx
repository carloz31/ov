import { useServerNovelties } from '@/features/adventure/hooks/useNovelties'
import { Bell } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
export function ServerNoveltiesMenu({ glass }: { glass: boolean }) {
  const { open, setOpen, openServerNotices, pendientes, errorAvisos } = useServerNovelties()

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
        {pendientes || errorAvisos ? (
          <DropdownMenuItem
            onSelect={() => {
              // Solo solicita el lote: OverlayQueue espera a que este menú
              // y cualquier otro overlay terminen de cerrarse.
              setOpen(false)
              openServerNotices()
            }}
          >
            Ver {pendientes} avisos pendientes{errorAvisos ? ' · Reintentar' : ''}
          </DropdownMenuItem>
        ) : (
          <p>No tienes novedades pendientes</p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
