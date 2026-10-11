import { useNovelties } from '../../hooks/useNovelties'
import { Award, Bell, BookOpen, Building2, HeartHandshake, UserRound, X } from 'lucide-react'
import { Link } from 'react-router'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { updateStudentUi } from '@/store/studentUiStore'
import { markUnlocksSeen } from '../../lib/unlocks'
import { ServerNoveltiesMenu } from '@/features/adventure/components/overlays/ServerNoveltiesMenu'
export function NoveltiesMenu({ glass = false }: { glass?: boolean }) {
  const { ordered, open, setOpen, unread, loteAvisos } = useNovelties()
  if (loteAvisos) return <ServerNoveltiesMenu glass={glass} />
  const titles = {
    badge: 'Nueva insignia disponible',
    ficha: 'Nueva ficha disponible',
    heroe: 'Nuevo héroe disponible',
    ciudad: 'Nueva ciudad disponible',
    familia: 'Nueva conversación familiar disponible',
    plan: 'Revisa tus planes',
    memory: 'Lumi recordó algo nuevo',
    nivel: 'Nuevo nivel',
  }
  const icons = {
    badge: Award,
    ficha: BookOpen,
    heroe: UserRound,
    ciudad: Building2,
    familia: HeartHandshake,
    plan: BookOpen,
    memory: BookOpen,
    nivel: Award,
  }
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`sx-icon-button sx-novelties-bell ${glass ? 'sx-glass' : ''}`}
          aria-label="Novedades"
          aria-describedby={unread > 0 ? 'sx-novelties-unread' : undefined}
        >
          <Bell size={20} aria-hidden="true" />
          {unread > 0 && (
            <span className="sx-novelties-count" aria-hidden="true">
              {unread}
            </span>
          )}
          {unread > 0 && (
            <span id="sx-novelties-unread" className="sr-only">
              {unread} novedades sin ver
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        collisionPadding={12}
        className="sx-root sx-novelties-menu case-scrollbar"
        aria-label="Novedades de tu aventura"
      >
        <div className="sx-novelties-header">
          <h2 className="sx-novelties-title">Novedades</h2>
          <DropdownMenuItem asChild onSelect={() => setOpen(false)}>
            <button type="button" className="sx-icon-button" aria-label="Cerrar novedades">
              <X size={18} aria-hidden="true" />
            </button>
          </DropdownMenuItem>
        </div>
        {ordered.length ? (
          ordered.map((item) => {
            const Icon = icons[item.kind]
            return (
              <DropdownMenuItem
                key={item.id}
                asChild
                onSelect={() => {
                  // A memory is read only when its text actually opens in the diary.
                  if (item.kind !== 'memory') updateStudentUi((current) => markUnlocksSeen(current, [item]))
                }}
              >
                <Link className="sx-novelty" to={item.href}>
                  <Icon size={18} aria-hidden="true" />
                  <span>
                    <strong>{titles[item.kind]}</strong>
                    <small>
                      {item.kind === 'plan' || item.kind === 'memory'
                        ? item.description
                        : `Se ha desbloqueado «${item.title}»`}
                    </small>
                  </span>
                  <span className="sx-novelty-dot" aria-hidden="true" />
                  <span className="sr-only">Sin ver</span>
                </Link>
              </DropdownMenuItem>
            )
          })
        ) : (
          <p className="sx-novelties-empty">No tienes novedades pendientes</p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
