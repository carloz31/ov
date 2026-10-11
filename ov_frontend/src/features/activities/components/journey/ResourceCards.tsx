import { BookOpen, Check, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { catalog } from '@/data/activities/content'
import { updateJourney, useJourney } from '@/store/journeyStore'
import { ResourceText } from '@/components/student/ResourceText'
export function ResourceCards({ ids }: { ids: string[] }) {
  const state = useJourney()
  return (
    <div className="space-y-3">
      {ids.map((id) => {
        const resource = catalog.recursos.find((resource) => resource.id === id)
        if (!resource) return null
        return (
          <details className="journey-resource" key={id}>
            <summary>
              <BookOpen size={17} />
              {resource.titulo.startsWith('[') ? 'Video: testimonios que rompen mitos' : resource.titulo}
            </summary>
            <div className="space-y-4 p-4">
              {resource.contenido && <ResourceText text={resource.contenido} />}
              {resource.fuente && <p className="journey-source">{resource.fuente}</p>}
              {resource.url && /^https?:\/\//.test(resource.url) && (
                <a className="journey-link" href={resource.url} target="_blank" rel="noreferrer">
                  Abrir recurso <ExternalLink size={14} />
                </a>
              )}
              {!resource.url && !resource.contenido && (
                <p>Este material estará disponible cuando lo prepare orientación.</p>
              )}
              {resource.guardableEnRecursos && (resource.url || resource.contenido) && (
                <Button
                  variant="outline"
                  disabled={state.resources.includes(id)}
                  onClick={() =>
                    updateJourney((current) => ({
                      ...current,
                      resources: [...new Set([...current.resources, id])],
                    }))
                  }
                >
                  {state.resources.includes(id) ? (
                    <>
                      <Check /> En tu mochila
                    </>
                  ) : (
                    'Guardar en Recursos'
                  )}
                </Button>
              )}
            </div>
          </details>
        )
      })}
    </div>
  )
}
