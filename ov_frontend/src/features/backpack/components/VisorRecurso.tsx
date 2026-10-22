import { useEffect } from 'react'
import { Check, Star } from 'lucide-react'
import { registrarFichaEnPantalla } from '@/store/visorRecursoStore'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { BackpackViewerFrame as DialogContent } from './BackpackViewerFrame'
import { ResourceContent } from './ResourceContent'
import { useVisorRecurso } from '../hooks/useVisorRecurso'
import type { TravelResource } from '../lib/travelerResources'

const kindLabels = { sheet: 'Ficha', testimonial: 'Testimonio', interview: 'Entrevista' }

// F04d: la única presentación de una ficha. La mochila lo abre en modo `mochila`; la batalla, en modo
// `repaso`, sin el badge de desbloqueo ni «Leí la ficha» (los favoritos se mantienen).
export function VisorRecurso({
  resource,
  onClose,
  modo = 'mochila',
}: {
  resource?: TravelResource
  onClose: () => void
  modo?: 'mochila' | 'repaso'
}) {
  const { leida, marcarLeida, favorito, alternarFavorito } = useVisorRecurso(resource)
  const abierto = Boolean(resource)
  // Mientras está abierto, la ficha tiene prioridad sobre los avisos automáticos de Lumi.
  useEffect(() => (abierto ? registrarFichaEnPantalla() : undefined), [abierto])
  return (
    <Dialog
      open={Boolean(resource)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      {resource && (
        <DialogContent className="resource-dialog max-w-4xl bg-[#fffdf7] p-0 md:p-0">
          <DialogHeader className="mb-0 border-b border-[#e4e0cb] p-6 pr-16 sm:p-7 sm:pr-16">
            {modo === 'mochila' && (
              <Badge className="mb-2 w-fit" variant="success">
                <Check className="size-3" /> {kindLabels[resource.kind]}{' '}
                {resource.kind === 'testimonial' ? 'desbloqueado' : 'desbloqueada'}
              </Badge>
            )}
            <DialogTitle className="text-[#304b3d]">{resource.title}</DialogTitle>
            {resource.author && (
              <p className="text-xs font-semibold text-[#7c805d]">
                {resource.kind === 'interview' ? 'Compartido por ' : ''}
                {resource.author}
              </p>
            )}
            <DialogDescription>{resource.description}</DialogDescription>
          </DialogHeader>
          <div className="p-6 sm:p-7">
            <ResourceContent resource={resource} />
            {modo === 'mochila' && resource.kind === 'sheet' && resource.content && (
              <Button variant="outline" disabled={leida} onClick={marcarLeida}>
                <Check size={18} />
                {leida ? 'Ficha leída' : 'Leí la ficha'}
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e0cb] bg-[#f4f3e8] px-6 py-4">
            <Button variant="outline" size="sm" aria-pressed={favorito} onClick={alternarFavorito}>
              <Star className={favorito ? 'fill-current text-[#aa7d26]' : ''} />
              {favorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            </Button>
            {resource.source && (
              <p className="max-w-md text-xs leading-5 text-muted-foreground">Fuente: {resource.source}</p>
            )}
          </div>
        </DialogContent>
      )}
    </Dialog>
  )
}
