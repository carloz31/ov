import { usePublications } from '@/features/counselor/hooks/usePublications'
import { PublicationOpenButton } from '@/features/counselor/components/PublicationOpenButton'
import { PublicationStatus } from '@/features/counselor/components/PublicationStatus'

import { Card } from '@/components/ui/Card'

export function PublicationCards({ model }: { model: ReturnType<typeof usePublications> }) {
  const { visible, classroom, profession, comments, date } = model
  return (
    <div className="space-y-3 p-3 xl:hidden">
      {visible.map((item) => (
        <Card key={item.id} className="min-w-0 space-y-4 p-4">
          <h2 className="font-semibold break-words">{item.subject}</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Autores</dt>
            <dd className="min-w-0 break-words">{item.authors.filter(Boolean).join(', ')}</dd>
            <dt className="text-muted-foreground">Profesión</dt>
            <dd className="min-w-0 break-words">{profession(item)}</dd>
            <dt className="text-muted-foreground">Salón</dt>
            <dd>{classroom(item)}</dd>
            <dt className="text-muted-foreground">Publicación</dt>
            <dd>{date(item)}</dd>
            <dt className="text-muted-foreground">Comentarios</dt>
            <dd>{comments(item)}</dd>
          </dl>
          {<PublicationStatus model={model} item={item} />}
          {<PublicationOpenButton model={model} item={item} />}
        </Card>
      ))}
    </div>
  )
}
