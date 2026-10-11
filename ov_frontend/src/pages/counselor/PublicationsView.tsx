import { PublicationCards } from '@/features/counselor/components/PublicationCards'
import { PublicationTable } from '@/features/counselor/components/PublicationTable'
import { usePublications } from '@/features/counselor/hooks/usePublications'

import { EyeOff, MoreHorizontal, Star } from 'lucide-react'

import { Link } from 'react-router'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'

import { updateAdventure } from '@/store/adventureStore'
import { InterviewDetail } from '@/features/counselor/components/InterviewDetail'
import { interviewDetails, reactionOptions } from '@/features/counselor/data/interviewDetails'

import { moderateInterview } from '@/features/counselor/lib/interviewSelectors'

function PublicationsView() {
  const model = usePublications()
  const {
    state,
    adventure,
    setParams,
    interviewId,
    navigate,
    confirmHide,
    setConfirmHide,
    salon,
    listUrl,
    interviews,
    visible,
    videoId,
    reports,
  } = model
  if (interviewId) {
    const item = interviews.find((item) => item.id === interviewId || videoId(item) === interviewId)
    if (!item)
      return (
        <div className="space-y-4 p-4 sm:p-8">
          <h1 className="text-2xl font-bold">Entrevista no encontrada</h1>
          <p>Esta entrevista no está disponible.</p>
          <Button asChild variant="outline">
            <Link to={listUrl}>Volver a Publicaciones</Link>
          </Button>
        </div>
      )
    const id = videoId(item)
    const reactionCounts = reactionOptions.map((option) => ({
      kind: option.label,
      count:
        (interviewDetails[id]?.comments.filter((comment) => comment.reaction === option.label).length ?? 0) +
        adventure.reactions.filter((reaction) => reaction.videoId === id && reaction.kind === option.label)
          .length,
    }))
    return (
      <div className="min-w-0">
        <InterviewDetail
          readOnly
          backLabel="Publicaciones"
          onBack={() => navigate(listUrl)}
          onReact={() => undefined}
          onReport={() => undefined}
          communityReactions={reactionCounts}
          video={{
            id,
            title: item.subject,
            alias: item.authors.filter(Boolean).join(', '),
            url: item.url,
            reflection: item.reflection,
            createdAt: item.date,
          }}
          actions={
            <div className="w-full space-y-3">
              {item.featured && (
                <div
                  className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/10 p-4"
                  role="status"
                >
                  <Star className="mt-0.5 size-6 shrink-0 fill-primary text-primary" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-foreground">Entrevista destacada</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Se muestra como destacada en la comunidad de estudiantes.
                    </p>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3">
                {reports(item).length > 0 && <Badge variant="aviso">Reportado</Badge>}
                {item.hidden ? (
                  <Badge variant="secondary">Entrevista ocultada</Badge>
                ) : (
                  <Button
                    variant={item.featured ? 'outline' : 'default'}
                    className="min-h-11"
                    onClick={() =>
                      updateAdventure((current) => moderateInterview(current, id, 'feature', !item.featured))
                    }
                  >
                    <Star className="size-4" />
                    {item.featured ? 'Quitar destaque' : 'Destacar entrevista'}
                  </Button>
                )}
                {!item.hidden && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="ml-auto min-h-11 min-w-11"
                        aria-label="Más acciones de la entrevista"
                      >
                        <MoreHorizontal className="size-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="max-w-[calc(100vw-2rem)]">
                      <DropdownMenuItem
                        className="min-h-11 items-start gap-3 whitespace-normal"
                        onSelect={() => setConfirmHide(true)}
                      >
                        <EyeOff className="mt-0.5 size-4 shrink-0" />
                        <span>
                          <span className="block">Ocultar entrevista</span>
                          <span className="mt-1 block max-w-60 text-xs leading-5 text-muted-foreground">
                            Retirarla de la comunidad si contiene contenido indebido.
                          </span>
                        </span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          }
        />
        {reports(item).length > 0 && (
          <div className="mx-auto max-w-6xl px-4 pb-8 sm:px-8">
            <Card className="space-y-4 p-6">
              <h2 className="font-bold">Reportes recibidos · {reports(item).length}</h2>
              {reports(item).map((report) => (
                <div key={report.id} className="rounded-xl border p-4">
                  <h3 className="font-semibold">{report.reason}</h3>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                    {report.body || 'Sin comentarios adicionales.'}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {new Date(report.createdAt).toLocaleDateString('es-PE')}
                  </p>
                </div>
              ))}
            </Card>
          </div>
        )}
        <Dialog open={confirmHide} onOpenChange={setConfirmHide}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Ocultar esta entrevista?</DialogTitle>
              <DialogDescription>
                Dejará de aparecer para los estudiantes y se retirará su destaque. Seguirá disponible para la
                orientadora. La gestión para desbloquearla se realiza fuera de la plataforma.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="outline" className="min-h-11" onClick={() => setConfirmHide(false)}>
                Cancelar
              </Button>
              <Button
                className="min-h-11"
                onClick={() => {
                  updateAdventure((current) => moderateInterview(current, id, 'hide'))
                  setConfirmHide(false)
                }}
              >
                Confirmar y ocultar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Publicaciones"
        eyebrow="Contenido"
        description="Revisa las entrevistas publicadas por tus estudiantes, sus reacciones y reportes."
      />
      <Select value={salon} onValueChange={(value) => setParams(value === 'all' ? {} : { salon: value })}>
        <SelectTrigger aria-label="Filtrar entrevistas por salón" className="min-h-11 w-full bg-card sm:w-64">
          <SelectValue>
            {salon === 'all' ? 'Todos los salones' : state.classrooms.find((room) => room.id === salon)?.name}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los salones</SelectItem>
          {state.classrooms.map((room) => (
            <SelectItem key={room.id} value={room.id}>
              {room.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Card className="overflow-hidden rounded-xl">
        {!visible.length ? (
          <p className="p-6 text-muted-foreground">No hay entrevistas en este salón.</p>
        ) : (
          <>
            <PublicationTable model={model} />
            <PublicationCards model={model} />
          </>
        )}
      </Card>
    </div>
  )
}
export { PublicationsView }
