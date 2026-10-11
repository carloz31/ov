import { useState } from 'react'
import { Flag, Users, UserPlus, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { classroomAliases } from '@/data/content/adventure'
import { getTravelerLevel, updateAdventure, useAdventure } from '@/store/adventureStore'

const examplePosts = [
  {
    id: 'class-rio',
    alias: 'Río',
    level: 1,
    title: 'Un paso a la vez',
    body: 'Me gustaría conversar con alguien que trabaje cuidando la naturaleza. Aún tengo muchas preguntas.',
  },
  {
    id: 'class-quilla',
    alias: 'Quilla',
    level: 1,
    title: 'Lo que me mueve',
    body: 'Recordé cuánto disfruto crear cosas con otras personas. Quiero seguir explorando esa pista.',
  },
]
function CommunityView() {
  const state = useAdventure()
  const [tab, setTab] = useState<'classroom' | 'crew'>('classroom')
  const [report, setReport] = useState<{ id: string; body: string }>()
  const [reason, setReason] = useState('')
  const [invitation, setInvitation] = useState<string>()
  const members = state.crewInvitations.filter((item) => item.status === 'accepted')
  const occupied = state.crewInvitations.filter((item) => item.status !== 'declined').length
  const level = getTravelerLevel(state)
  const posts = (tab === 'classroom' ? examplePosts : []).filter(
    (post) => !state.reports.some((report) => report.postId === post.id && report.status === 'hidden'),
  )
  function respond(status: 'accepted' | 'declined') {
    updateAdventure((current) => ({
      ...current,
      crewInvitations: current.crewInvitations.map((item) =>
        item.alias === invitation ? { ...item, status } : item,
      ),
    }))
    setInvitation(undefined)
  }
  return (
    <div className="adventure-page min-h-full p-4 sm:p-8">
      <header className="mb-6">
        <p className="adventure-eyebrow">
          <Users className="size-4" /> COMPAÑEROS DE VIAJE
        </p>
        <h1 className="mt-2 text-3xl font-bold">El camino también se comparte.</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Un salón lleno de historias y un pequeño Crew para acompañarte.
        </p>
      </header>
      <div className="mb-6 flex gap-3">
        <Button variant={tab === 'classroom' ? 'default' : 'outline'} onClick={() => setTab('classroom')}>
          El salón
        </Button>
        <Button variant={tab === 'crew' ? 'default' : 'outline'} onClick={() => setTab('crew')}>
          Mi Crew · {1 + members.length}/3
        </Button>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-4">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4" /> Comparte usando tu alias. Evita incluir datos personales en tus
            textos.
          </p>
          {posts.map((post) => (
            <article key={post.id} className="adventure-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-9 place-items-center rounded-full bg-[#e7eddc] font-bold">
                    {post.alias.slice(0, 1)}
                  </span>
                  <strong className="text-sm">{post.alias}</strong>
                  <Badge variant="outline">Niv. {post.level}</Badge>
                </div>
                {tab === 'classroom' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Reportar publicación de ${post.alias}`}
                    disabled={state.reports.some((item) => item.postId === post.id)}
                    onClick={() => {
                      setReport({ id: post.id, body: post.body })
                      setReason('')
                    }}
                  >
                    <Flag className="size-4" />
                    {state.reports.some((item) => item.postId === post.id) ? 'Reportado' : 'Reportar'}
                  </Button>
                )}
              </div>
              <h2 className="mb-2 mt-4 font-bold">{post.title}</h2>
              <p className="whitespace-pre-wrap break-words text-sm leading-7">{post.body}</p>
            </article>
          ))}
          {posts.length === 0 && (
            <div className="adventure-card p-8 text-center">
              <Users className="mx-auto mb-3 size-9 text-[#7c946d]" />
              <h2 className="font-bold">Un espacio para acompañarse</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {members.length
                  ? 'Aquí aparecerán las publicaciones creadas para tu Crew. Tus conversaciones con Lumi siempre permanecen privadas.'
                  : 'Invita a uno o dos compañeros. También puedes continuar tu aventura por tu cuenta.'}
              </p>
            </div>
          )}
        </section>
        <aside className="adventure-card space-y-4 p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <Users className="size-5" /> Tu Crew
          </h2>
          <p className="text-xs leading-6 text-muted-foreground">
            Hasta 3 viajeros, contigo incluido. El grupo se mantiene durante el recorrido; cada invitación se
            acepta de forma voluntaria.
          </p>
          <div className="rounded-xl bg-[#eef2e5] p-3 text-sm font-semibold">
            Alex · Tú · Niv. {level.number}
          </div>
          {state.crewInvitations
            .filter((item) => item.status !== 'declined')
            .map((item) => (
              <div key={item.alias} className="rounded-xl border p-3 text-sm">
                <div className="flex justify-between gap-2">
                  <strong>{item.alias}</strong>
                  <Badge variant="outline">
                    {item.status === 'accepted' ? 'Niv. 1 · Miembro' : 'Pendiente'}
                  </Badge>
                </div>
                {item.status === 'pending' && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setInvitation(item.alias)}>
                      Probar invitación
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        updateAdventure((current) => ({
                          ...current,
                          crewInvitations: current.crewInvitations.filter(
                            (invite) => invite.alias !== item.alias,
                          ),
                        }))
                      }
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            ))}
          <h3 className="pt-2 text-xs font-bold uppercase tracking-wider">Invitar del salón</h3>
          {classroomAliases
            .filter(
              (alias) =>
                !state.crewInvitations.some((item) => item.alias === alias && item.status !== 'declined'),
            )
            .map((alias) => (
              <div className="flex items-center justify-between" key={alias}>
                <span className="text-sm">
                  {alias} <span className="text-xs text-muted-foreground">· Niv. 1</span>
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={occupied >= 2}
                  onClick={() =>
                    updateAdventure((current) =>
                      current.crewInvitations.filter((item) => item.status !== 'declined').length >= 2
                        ? current
                        : {
                            ...current,
                            crewInvitations: [
                              ...current.crewInvitations.filter((item) => item.alias !== alias),
                              { alias, status: 'pending' },
                            ],
                          },
                    )
                  }
                >
                  <UserPlus className="size-3" /> Invitar
                </Button>
              </div>
            ))}
          <p className="rounded-xl bg-[#fbf0d8] p-3 text-xs leading-5">
            Logro «Nadie viaja solo»: forma un Crew con al menos un compañero. Tú eliges cuándo dar el primer
            paso.
          </p>
        </aside>
      </div>
      <Dialog
        open={Boolean(report)}
        onOpenChange={(open) => {
          if (!open) setReport(undefined)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reportar publicación</DialogTitle>
            <DialogDescription>La orientadora recibirá el reporte para revisarlo.</DialogDescription>
          </DialogHeader>
          <label className="text-sm">
            Motivo (opcional)
            <textarea
              className="adventure-input mb-4 mt-2 min-h-24"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <Button
            onClick={() => {
              if (!report) return
              updateAdventure((current) => ({
                ...current,
                reports: [
                  ...current.reports,
                  {
                    id: crypto.randomUUID(),
                    postId: report.id,
                    body: report.body,
                    reason: reason.trim(),
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                  },
                ],
              }))
              setReport(undefined)
            }}
          >
            Enviar reporte
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(invitation)}
        onOpenChange={(open) => {
          if (!open) setInvitation(undefined)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitación para {invitation}</DialogTitle>
            <DialogDescription>
              Vista de demostración: representa la respuesta voluntaria de la persona invitada. No se envían
              mensajes reales.
            </DialogDescription>
          </DialogHeader>
          <p className="mb-5">Alex te invita a su Crew. ¿Quieres acompañarle?</p>
          <div className="flex gap-3">
            <Button onClick={() => respond('accepted')}>Aceptar invitación</Button>
            <Button variant="outline" onClick={() => respond('declined')}>
              Ahora no
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export { CommunityView }
