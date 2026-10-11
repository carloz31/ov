import { useBadgeDetail } from '../hooks/useBadgeDetail'
import { Link } from 'react-router'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Eye, LockKeyhole } from 'lucide-react'

import type { PassportBadge } from '@/types/profile'

export function PassportBadgeDialog({
  badge,
  group,
  groupIndex,
  onClose,
}: {
  badge?: PassportBadge
  group: string
  groupIndex: number
  onClose: () => void
}) {
  const { returnFocus, error, setIntento, selected, visible, hidden, destination, Icon, date,
    notaFecha, descripcionRequisito, alternarInsignia } = useBadgeDetail(badge)

  return (
    <Dialog
      open={!!badge}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      {badge && (
        <DialogContent
          {...returnFocus}
          className="sx-root sx-p-badge-dialog"
          data-earned={badge.done}
          data-group={groupIndex % 3}
        >
          <DialogHeader>
            <span className="sx-p-badge-seal sx-p-badge-seal-large" aria-hidden="true">
              {hidden ? '?' : <Icon size={52} />}
            </span>
            <p className="sx-p-badge-code">
              {badge.code} · {group}
            </p>
            <DialogTitle>{hidden ? 'Insignia por descubrir' : badge.title}</DialogTitle>
            <DialogDescription>
              <span className="sx-p-state">{badge.done ? 'Obtenida' : 'Por descubrir'}</span>
            </DialogDescription>
          </DialogHeader>
          {badge.done ? (
            <>
              <section>
                <h3>Lo que lograste</h3>
                <p>{badge.message}</p>
              </section>
              <section className="sx-p-discovered">
                <h3>Cómo la descubriste</h3>
                <p>{badge.description}</p>
                {date && (
                  <p className="sx-p-date">
                    Obtenida el{' '}
                    {new Date(date).toLocaleDateString('es-PE', {
                      dateStyle: 'long',
                      timeZone: 'America/Lima',
                    })}{' '}
                    {notaFecha}
                  </p>
                )}
              </section>
              <section className="sx-p-meaning">
                <h3>Qué significa</h3>
                <blockquote>“{badge.metaphor}”</blockquote>
                <p>{badge.vocationalMeaning}</p>
              </section>
              <button
                className="sx-p-profile-choice"
                type="button"
                aria-pressed={visible}
                disabled={!visible && selected.length >= 3}
                onClick={() =>
                  alternarInsignia()
                }
              >
                <Eye aria-hidden="true" size={18} />
                Mostrar en mi perfil
              </button>
              {!visible && selected.length >= 3 && (
                <p>Ya muestras 3 insignias. Quita una para elegir esta.</p>
              )}
              <p className="sx-p-choice-help">
                {visible
                  ? 'Tus compañeros la ven junto a tu nivel. Toca para quitarla.'
                  : `Puedes mostrar hasta 3 insignias a tus compañeros (${selected.length} de 3).`}
              </p>
            </>
          ) : (
            <>
              {!hidden && (
                <section className="sx-p-requirement">
                  <h3>Cómo se descubre</h3>
                  <p>{descripcionRequisito}</p>
                  {error && (
                    <>
                      <p role="alert">{error}</p>
                      <button className="sx-d-action" onClick={() => setIntento((i) => i + 1)}>
                        Reintentar requisito
                      </button>
                    </>
                  )}
                </section>
              )}
              <section className="sx-p-hidden-meaning">
                <h3>Qué significa</h3>
                <p aria-hidden="true" className="sx-p-blur">
                  Una historia guardada entre las páginas del viaje.
                </p>
                <p>Se revela cuando obtengas esta insignia.</p>
              </section>
              {!hidden && destination && (
                <Link className="sx-d-action sx-d-action-gold" to={destination.href} onClick={onClose}>
                  <LockKeyhole aria-hidden="true" size={16} />
                  {destination.label}
                </Link>
              )}
            </>
          )}
        </DialogContent>
      )}
    </Dialog>
  )
}
