import { Badge } from '@/components/ui/Badge'

import { Card } from '@/components/ui/Card'

export function AnswerCard({
  answer,
  participant,
  prompt,
}: {
  answer?: string
  participant: string
  prompt: string
}) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold">Pregunta para {participant.toLocaleLowerCase('es-PE')}</h2>
        <Badge variant={answer ? 'success' : 'outline'}>{answer ? 'Respondida' : 'Pendiente'}</Badge>
      </div>
      <p className="mt-4 text-sm font-medium leading-6">{prompt}</p>
      <div className="mt-4 min-h-28 rounded-xl bg-muted/50 p-4 text-sm leading-7 whitespace-pre-wrap">
        {answer || 'Sin respuesta registrada.'}
      </div>
    </Card>
  )
}
