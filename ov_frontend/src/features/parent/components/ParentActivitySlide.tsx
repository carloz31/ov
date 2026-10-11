import { useParentActivitySession } from '@/features/parent/hooks/useParentActivitySession'
import { BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

import { ParentContent } from '@/features/parent/components/ParentContent'

export function ParentActivitySlide({ model }: { model: ReturnType<typeof useParentActivitySession> }) {
  const { setResources, entrance, resourceTrigger, node, summary, summaryResources, review } = model
  if (node?.tipo !== 'diapositiva') return null
  return (
    <div className="mt-6">
      <ParentContent
        summary={summary}
        blocks={summary ? node.bloques.filter((block) => block.tipo !== 'parrafo') : node.bloques}
      />
      {summary ? (
        <>
          {summaryResources.map((resource) => (
            <Card
              key={`${node.id}/${resource.id}`}
              className={`parent-ficha-card ${entrance.resource ? 'parent-pop' : ''}`}
            >
              <span className="parent-ficha-icon" aria-hidden>
                <BookOpen size={30} />
              </span>
              <div className="parent-ficha-copy">
                <p className="parent-ficha-label">
                  {review ? 'FICHA EN SU MATERIAL DE CONSULTA' : 'NUEVA FICHA EN SU MATERIAL DE CONSULTA'}
                </p>
                <h3>{resource.titulo}</h3>
                <p>Este resumen quedó guardado. Puede repasarlo cuando quiera.</p>
              </div>
              <Button
                variant="outline"
                className="parent-ficha-button"
                onClick={(event) => {
                  resourceTrigger.current = event.currentTarget
                  setResources([resource.id])
                }}
              >
                Abrir ficha
              </Button>
            </Card>
          ))}
          <div className="parent-summary-note">
            <ParentContent blocks={node.bloques.filter((block) => block.tipo === 'parrafo')} />
          </div>
        </>
      ) : (
        !!node.recursoIds?.length && (
          <Button
            variant="outline"
            className="mt-6"
            onClick={(event) => {
              resourceTrigger.current = event.currentTarget
              setResources(node.recursoIds ?? [])
            }}
          >
            <BookOpen /> Ver ficha
          </Button>
        )
      )}
    </div>
  )
}
