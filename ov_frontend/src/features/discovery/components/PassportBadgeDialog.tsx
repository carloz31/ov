import { useBadgeDetail } from '../hooks/useBadgeDetail'
import { Link } from 'react-router'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { ArrowRight, Check, Lightbulb, LoaderCircle } from 'lucide-react'

import { ConditionList } from './ConditionList'
import { numeroPagina } from '../lib/passport'
import type { PassportBadge } from '@/types/profile'

const fechaLarga = (fecha: string) =>
  new Date(fecha).toLocaleDateString('es-PE', { dateStyle: 'long', timeZone: 'America/Lima' })

// Ajuste pasaporte-perfil: tres estados (secreta, por descubrir, obtenida) con la misma cabecera.
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
  const {
    returnFocus,
    estado,
    condiciones,
    destination,
    Icon,
    fecha,
    enVitrina,
    enUso,
    vitrinaLlena,
    guardando,
    errorVitrina,
    alternarVitrina,
  } = useBadgeDetail(badge)
  const secreta = estado === 'secreta'

  return (
    <Dialog
      open={!!badge}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      {badge && (
        <DialogContent {...returnFocus} className="sx-root sx-p-badge-dialog" data-state-badge={estado}>
          <DialogHeader>
            <span className="sx-p-badge-seal sx-p-badge-seal-large" aria-hidden="true">
              {secreta ? '?' : <Icon size={48} />}
            </span>
            <p className="sx-p-badge-code">
              Página {numeroPagina(groupIndex)} · {group}
            </p>
            <DialogTitle>{secreta ? '???' : badge.title}</DialogTitle>
            <DialogDescription>
              <span className="sx-p-state">
                {secreta
                  ? 'Insignia secreta'
                  : badge.done
                    ? fecha
                      ? `Sellada el ${fechaLarga(fecha)}`
                      : 'Obtenida'
                    : 'Por descubrir'}
              </span>
            </DialogDescription>
          </DialogHeader>
          {badge.done ? (
            <>
              <section className="sx-p-box sx-p-keeps">
                <h3>Lo que guarda este sello</h3>
                {badge.metaphor && <blockquote>«{badge.metaphor}»</blockquote>}
                {badge.vocationalMeaning && <p>{badge.vocationalMeaning}</p>}
              </section>
              <p className="sx-p-how">
                <Check aria-hidden="true" size={16} />
                <span>
                  <strong>Cómo la conseguiste:</strong> {badge.logro ?? badge.description}
                </span>
              </p>
              {/* F5: mientras guarda conserva su estilo (aria-disabled, no disabled) y muestra el cargador. */}
              <button
                className="sx-p-profile-choice"
                type="button"
                aria-pressed={enVitrina}
                aria-busy={guardando}
                aria-disabled={guardando || undefined}
                disabled={vitrinaLlena}
                onClick={() => {
                  if (!guardando) alternarVitrina()
                }}
              >
                {guardando ? (
                  <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  enVitrina && <Check aria-hidden="true" size={18} />
                )}
                {enVitrina ? 'En tu vitrina' : 'Añadir a tu vitrina'}
              </button>
              <p className="sx-p-choice-help" role={errorVitrina ? 'alert' : undefined}>
                {errorVitrina ||
                  (vitrinaLlena
                    ? 'Ya tienes 3 sellos en tu vitrina. Quita uno para elegir este.'
                    : `Tus compañeros ven hasta 3 sellos en tu perfil · ${enUso} de 3 en uso.`)}
              </p>
            </>
          ) : (
            <>
              {secreta ? (
                <section className="sx-p-box sx-p-hint">
                  <h3>
                    <Lightbulb aria-hidden="true" size={16} />
                    Pista de Lumi
                  </h3>
                  <p>
                    {badge.pista
                      ? `«${badge.pista}»`
                      : 'Lumi todavía no quiere contarte nada de este sello.'}
                  </p>
                </section>
              ) : (
                <section className="sx-p-box sx-p-requirement">
                  <h3>
                    Cómo se consigue
                    {condiciones && condiciones.total > 0 && ` · ${condiciones.cumplidas} de ${condiciones.total} cumplidas`}
                  </h3>
                  {condiciones && condiciones.total > 0 ? (
                    <ConditionList condiciones={condiciones} />
                  ) : (
                    <p>{badge.description}</p>
                  )}
                  {destination && (
                    <Link className="sx-d-action" to={destination.href} onClick={onClose}>
                      {destination.label}
                      <ArrowRight aria-hidden="true" size={16} />
                    </Link>
                  )}
                </section>
              )}
              <section className="sx-p-hidden-meaning">
                <h3>Qué significa</h3>
                <p aria-hidden="true" className="sx-p-blur">
                  Una historia guardada entre las páginas del viaje.
                </p>
                <p>
                  {secreta
                    ? 'Su nombre y su historia se revelan cuando la consigas.'
                    : 'Su historia se revela cuando la consigas.'}
                </p>
              </section>
            </>
          )}
        </DialogContent>
      )}
    </Dialog>
  )
}
