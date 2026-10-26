import { useEffect } from 'react'
import { Link } from 'react-router'
import { Loader2, Map, Star, X } from 'lucide-react'
import { registrarFichaEnPantalla } from '@/store/visorRecursoStore'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogClose, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { BackpackViewerFrame as DialogContent } from './BackpackViewerFrame'
import { ChipTema } from './ChipTema'
import { ResourceContent } from './ResourceContent'
import { useFichaModal, type FavoritoExterno } from '../hooks/useVisorRecurso'
import type { TravelResource } from '../lib/travelerResources'
import '../styles/ficha-modal.css'

// Ajuste mochila: el modal de ficha de toda la plataforma (mochila, reproductor, batalla y cierres). Cabecera y
// pie fijos; solo el cuerpo se desplaza. El nombre de la actividad enlaza a su drawer solo desde la mochila.
export function FichaModal({
  abierto,
  resource,
  cargando = false,
  enlazarActividad = false,
  favorito: externo,
  onClose,
}: {
  abierto: boolean
  resource?: TravelResource
  cargando?: boolean
  enlazarActividad?: boolean
  // La estrella de la mochila; sin ella, el modal guarda el favorito por su cuenta.
  favorito?: FavoritoExterno
  onClose: () => void
}) {
  const { minutos, hrefActividad, favorito, pendiente, alternarFavorito } = useFichaModal(
    abierto && !cargando ? resource : undefined,
    enlazarActividad,
    externo,
  )
  // Mientras está abierto, la ficha tiene prioridad sobre los avisos automáticos de Lumi.
  useEffect(() => (abierto ? registrarFichaEnPantalla() : undefined), [abierto])
  const ficha = resource?.ficha
  return (
    <Dialog
      open={abierto}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      {abierto && (
        <DialogContent showCloseButton={false} className="sx-ficha-modal">
          <header className="sx-ficha-modal__cabecera">
            <div className="sx-ficha-modal__meta">
              {ficha?.tema && <ChipTema tema={ficha.tema} />}
              {ficha?.actividad && (
                <p>
                  <Map aria-hidden="true" />
                  <span>
                    La encontraste en{' '}
                    {hrefActividad ? (
                      <Link to={hrefActividad}>{ficha.actividad.titulo}</Link>
                    ) : (
                      <strong>{ficha.actividad.titulo}</strong>
                    )}
                    {ficha.tramo && ` · Tramo ${ficha.tramo.numero}`}
                    {!cargando && ` · ${minutos} min de lectura`}
                  </span>
                </p>
              )}
            </div>
            <DialogTitle>{resource?.title ?? 'Ficha'}</DialogTitle>
            {resource?.summary ? (
              <DialogDescription className="sr-only">{resource.summary}</DialogDescription>
            ) : (
              <DialogDescription className="sr-only">Ficha de tu mochila</DialogDescription>
            )}
            <DialogClose asChild>
              <button type="button" className="sx-ficha-modal__cerrar" aria-label="Cerrar">
                <X aria-hidden="true" />
              </button>
            </DialogClose>
          </header>
          <div className="sx-ficha-modal__cuerpo">
            <div className="sx-ficha-lectura">
              {cargando || !resource ? (
                <div className="space-y-3" aria-busy="true">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              ) : (
                <ResourceContent resource={resource} />
              )}
            </div>
          </div>
          <footer className="sx-ficha-modal__pie">
            <Button
              variant="outline"
              aria-pressed={favorito}
              aria-busy={pendiente}
              onClick={alternarFavorito}
              disabled={!resource}
            >
              {pendiente ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Star className={favorito ? 'fill-current text-[#aa7d26]' : ''} />
              )}
              {favorito ? 'En tus favoritos' : 'Agregar a favoritos'}
            </Button>
            <p>Las favoritas aparecen primero cuando armes tus planes.</p>
          </footer>
        </DialogContent>
      )}
    </Dialog>
  )
}
