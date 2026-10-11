import { useProfessionalWordCloud } from '@/features/cases/hooks/useProfessionalWordCloud'
import { ArrowRight, MessageCircle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { cn } from '@/lib/utils'
import { occupationCatalog } from '@/data/catalog/occupations'
import { ScreenHeading } from '@/features/cases/components/ScreenHeading'
export function ProfessionalWordCloudScreen({
  onContinue,
  reason,
  selectedProfessionalId,
}: {
  onContinue: () => void
  reason: string
  selectedProfessionalId: string
}) {
  const {
    openProfessionalId,
    setOpenProfessionalId,
    cloudEntries,
    selectedEntry,
    selectedProfessional,
    cloudColors,
  } = useProfessionalWordCloud(selectedProfessionalId)
  return (
    <div>
      <ScreenHeading
        badge="Voces de estudiantes"
        description="El tamaño de cada profesión representa cuántos estudiantes imaginaron un aporte para ella. Pulsa una para leer sus razones."
        inverse
        title="Así respondió la comunidad"
      />
      <Card className="border-white/18 bg-[#171827]/88 p-6 text-white shadow-[0_26px_75px_rgb(0_0_0/30%)] backdrop-blur-xl md:p-9">
        <div className="flex min-h-[360px] flex-wrap items-center justify-center gap-x-8 gap-y-6 rounded-3xl border border-white/10 bg-black/12 p-6 md:p-10">
          {cloudEntries.map((entry, index) => {
            const professional = occupationCatalog.find((item) => item.id === entry.occupationId)!
            const mentions = entry.mentions + (entry.occupationId === selectedProfessionalId ? 1 : 0)
            return (
              <button
                className={cn(
                  'rounded-2xl px-3 py-2 font-black leading-none transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
                  cloudColors[index % cloudColors.length],
                  entry.occupationId === selectedProfessionalId && 'bg-white/10 ring-1 ring-white/20',
                )}
                key={entry.occupationId}
                onClick={() => setOpenProfessionalId(entry.occupationId)}
                style={{ fontSize: `${0.8 + mentions * 0.055}rem` }}
                type="button"
              >
                {professional.name}
                <span className="ml-1 align-top text-[10px] font-bold text-white/35">{mentions}</span>
              </button>
            )
          })}
        </div>
        <div className="mt-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-xs leading-5 text-white/45">
            Tu selección aparece destacada y se suma a las respuestas del grupo.
          </p>
          <Button className="bg-[#ff875f] hover:bg-[#f47550]" onClick={onContinue} size="lg">
            Ver informe final <ArrowRight />
          </Button>
        </div>
      </Card>

      <Dialog
        onOpenChange={(open) => !open && setOpenProfessionalId(undefined)}
        open={Boolean(openProfessionalId)}
      >
        {selectedEntry && selectedProfessional && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <Badge className="mb-1" variant="default">
                <MessageCircle className="size-3.5" /> Comentarios de estudiantes
              </Badge>
              <DialogTitle>{selectedProfessional.name}</DialogTitle>
              <DialogDescription>
                {selectedEntry.mentions + (selectedProfessional.id === selectedProfessionalId ? 1 : 0)}{' '}
                estudiantes imaginaron un aporte para esta profesión.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {selectedProfessional.id === selectedProfessionalId && (
                <div className="rounded-2xl border border-primary/20 bg-[var(--primary-soft)] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-primary">
                    Tu comentario
                  </p>
                  <p className="mt-2 text-sm leading-6">“{reason}”</p>
                </div>
              )}
              {selectedEntry.comments.map((comment, index) => (
                <div className="flex gap-3 rounded-2xl border bg-muted/35 p-4" key={comment}>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-xs font-black text-primary shadow-sm">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-6 text-muted-foreground">“{comment}”</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={() => setOpenProfessionalId(undefined)}>Cerrar comentarios</Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
