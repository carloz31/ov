import { useParentOverview } from '@/features/parent/hooks/useParentOverview'
import { Check, MessageCircleHeart, Circle, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

import { CardIcon } from '@/components/ui/Status'
import { Progress } from '@/components/ui/Progress'
import { appPaths } from '@/routes/paths'
import { parentChildren, conversationChildId } from '@/features/parent/data/parentPortal'
import { parentMotivation } from '@/features/parent/data/parentMotivation'

export function ParentConversationNotice({ model }: { model: ReturnType<typeof useParentOverview> }) {
  const { conversation, student } = model
  return (
    <Card
      className={`parent-conversation-notice flex min-w-0 flex-col gap-5 p-5 sm:p-6 ${conversation.available && conversation.pending ? 'staff-alert-card' : ''}`}
    >
      <div className="flex items-center gap-3">
        <CardIcon
          icon={conversation.available && conversation.pending ? TriangleAlert : MessageCircleHeart}
        />
        <h2 className="text-lg font-bold">Conversaciones</h2>
      </div>
      {conversation.available ? (
        <>
          <p className="text-2xl font-bold">
            {conversation.completed} {conversation.completed === 1 ? 'conversada' : 'conversadas'},{' '}
            {conversation.pending} {conversation.pending === 1 ? 'pendiente' : 'pendientes'}
          </p>
          {parentChildren.length > 1 &&
            parentChildren.map((item) => (
              <p key={item.id} className="text-sm">
                Con {item.name.split(' ')[0]}:{' '}
                {item.id === conversationChildId
                  ? `${conversation.completed} conversadas, ${conversation.pending} pendientes`
                  : 'Aún no hay conversaciones disponibles'}
              </p>
            ))}
          <div className="space-y-3 rounded-xl bg-muted/40 p-4">
            <div className="flex items-center gap-2 text-sm">
              <Check className="size-4 text-success-text" aria-hidden />
              Conversadas: {conversation.completed}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Circle className="size-4 text-primary" aria-hidden />
              Por conversar: {conversation.pending}
            </div>
            <Progress
              value={(conversation.completed / conversation.available) * 100}
              aria-label="Avance de conversaciones"
            />
          </div>
          <div className="mt-auto space-y-3">
            <Button asChild variant="outline" className="min-h-11 h-auto whitespace-normal">
              <Link to={appPaths.parent.conversations}>
                {conversation.pending ? 'Seguir con las conversaciones' : 'Revisar nuestras conversaciones'}
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">{parentMotivation('conversations')}</p>
          </div>
        </>
      ) : (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Las conversaciones se habilitarán a medida que {student?.nombres ?? 'tu hijo'} avance en su
          recorrido.
        </p>
      )}
    </Card>
  )
}
