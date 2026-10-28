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
import { useFichaModal, type ContenidoExterno, type FavoritoExterno } from '../hooks/useVisorRecurso'
import type { TravelResource } from '../lib/travelerResources'
import { CabeceraFichaApoderado } from './CabeceraFichaApoderado'
import '../styles/ficha-modal.css'

// Ajuste mochila: el modal de ficha de toda la plataforma (mochila, reproductor, batalla y cierres). Cabecera y
// pie fijos; solo el cuerpo se desplaza. El nombre de la actividad enlaza a su drawer solo desde la mochila. En api,
// la cabecera sale de la lista de fichas y el cuerpo muestra su carga hasta que llega el contenido. F08: sin
// `puedeMarcarFavorito` (el apoderado), la cabecera dice dónde la obtuvo y el pie solo cierra; su contenido llega
// por `contenido`, del almacén del apoderado.
export function FichaModal({
  abierto,
  resource,
  cargando = false,
  enlazarActividad = false,
  favorito: externo,
  puedeMarcarFavorito = true,
  contenido,
  onClose,
}: {
  abierto: boolean
  resource?: TravelResource
  cargando?: boolean
  enlazarActividad?: boolean
  // La estrella de la mochila; sin ella, el modal guarda el favorito por su cuenta.
  favorito?: FavoritoExterno
  puedeMarcarFavorito?: boolean
  contenido?: ContenidoExterno
  onClose: () => void
}) {
  const modal = useFichaModal(
    abierto && !cargando ? resource : undefined,
    enlazarActividad,
    externo,
    contenido,
  )
  const { recurso, cargandoContenido, errorContenido, reintentarContenido } = modal
  const { minutos, hrefActividad, favorito, pendiente, alternarFavorito } = modal
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
        <DialogContent
          showCloseButton={false}
          className={`sx-ficha-modal${puedeMarcarFavorito ? '' : ' sx-ficha-modal--apoderado'}`}
        >
          {puedeMarcarFavorito ? (
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
                      {!cargando && !cargandoContenido && !errorContenido && ` · ${minutos} min de lectura`}
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
          ) : (
            <CabeceraFichaApoderado
              actividad={ficha?.actividad?.titulo}
              minutos={!cargando && !cargandoContenido && !errorContenido ? minutos : null}
              tema={ficha?.tema ?? null}
              titulo={resource?.title ?? 'Ficha'}
            />
          )}
          <div className="sx-ficha-modal__cuerpo">
            <div className="sx-ficha-lectura">
              {errorContenido ? (
                <div className="space-y-3" role="alert">
                  <p>{errorContenido}</p>
                  <Button variant="outline" onClick={reintentarContenido}>
                    Reintentar
                  </Button>
                </div>
              ) : cargando || cargandoContenido || !recurso ? (
                <div className="space-y-3" aria-busy="true">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              ) : (
                <ResourceContent resource={recurso} />
              )}
            </div>
          </div>
          {puedeMarcarFavorito ? (
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
          ) : (
            <footer className="sx-ficha-modal__pie">
              <p>
                Esta ficha queda disponible aquí, en <strong>Mis actividades</strong>, cuando quiera volver a
                leerla.
              </p>
              <DialogClose asChild>
                <Button>Cerrar</Button>
              </DialogClose>
            </footer>
          )}
        </DialogContent>
      )}
    </Dialog>
  )
}
