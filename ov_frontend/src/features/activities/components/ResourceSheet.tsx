import { useActivityResources } from '../hooks/useActivityResources'
import { BookOpen, Check, ExternalLink, FileText, Headphones, Link2, Play } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/Sheet'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible'
import { youtubeEmbedUrl } from '@/features/backpack/lib/travelerResources'
import { ResourceText } from '@/features/activities/components/content/ResourceText'
export function ResourceSheet({ open, ids, onClose }: { open: boolean; ids: string[]; onClose: () => void }) {
  const { state, returnFocus, resources, marcarLeida, guardarRecurso } = useActivityResources(ids)
  const icons = { ficha: BookOpen, video: Play, lectura: FileText, enlace: Link2, audio: Headphones }
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <SheetContent
        side="right"
        className="sx-root sx-resource-sheet case-scrollbar"
        aria-label="Fichas de la actividad"
        closeButtonLabel="Cerrar fichas"
        onOpenAutoFocus={() => {
          returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          if (returnFocus.current?.isConnected) returnFocus.current.focus()
        }}
      >
        <SheetTitle>Fichas para tu camino</SheetTitle>
        <SheetDescription>Profundiza a tu ritmo y guarda lo que quieras llevar contigo.</SheetDescription>
        {resources.map((resource) => {
          const Icon = icons[resource.tipo]
          const embed = resource.tipo === 'video' ? youtubeEmbedUrl(resource.url) : null
          return (
            <Collapsible className="sx-resource" key={resource.id} defaultOpen={resources.length === 1}>
              <CollapsibleTrigger asChild>
                <button type="button" className="sx-resource-summary">
                  <Icon size={18} />
                  {resource.titulo.startsWith('[') ? 'Video: testimonios que rompen mitos' : resource.titulo}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="sx-resource-content">
                  {resource.contenido && <ResourceText text={resource.contenido} />}
                  {embed ? (
                    <iframe
                      className="sx-resource-video"
                      src={embed}
                      title={resource.titulo}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                    />
                  ) : (
                    resource.url &&
                    /^https?:\/\//.test(resource.url) && (
                      <a className="sx-secondary-button" href={resource.url} target="_blank" rel="noreferrer">
                        Abrir recurso <ExternalLink size={16} />
                      </a>
                    )
                  )}
                  {resource.fuente && <p className="sx-resource-source">{resource.fuente}</p>}
                  {resource.tipo === 'ficha' && resource.contenido && (
                    <button
                      type="button"
                      className="sx-secondary-button"
                      disabled={(state.readResourceIds ?? state.resources).includes(resource.id)}
                      onClick={() => marcarLeida(resource)}
                    >
                      <Check size={18} />
                      {(state.readResourceIds ?? state.resources).includes(resource.id)
                        ? 'Ficha leída'
                        : 'Leí la ficha'}
                    </button>
                  )}
                  {!resource.url && !resource.contenido && (
                    <p>Este material estará disponible cuando lo prepare orientación.</p>
                  )}
                  {resource.mostrarDisponibilidad && (
                    <p>
                      {resource.disponible
                        ? 'En tu mochila'
                        : 'La ficha se obtiene al completar la actividad.'}
                    </p>
                  )}
                  {!resource.mostrarDisponibilidad && (resource.url || resource.contenido) && (
                    <button
                      type="button"
                      className="sx-secondary-button"
                      disabled={state.resources.includes(resource.id)}
                      onClick={() => guardarRecurso(resource)}
                    >
                      {state.resources.includes(resource.id) ? (
                        <>
                          <Check size={18} />
                          En tu mochila
                        </>
                      ) : (
                        'Guardar en Recursos'
                      )}
                    </button>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )
        })}
      </SheetContent>
    </Sheet>
  )
}
