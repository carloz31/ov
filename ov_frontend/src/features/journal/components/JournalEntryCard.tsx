import { ArrowRight, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/Button'

function JournalEntryCard({
  completed,
  prompt,
  onOpen,
  remitente,
}: {
  completed: boolean
  prompt?: string
  onOpen: () => void
  // F05, solo api: la actividad que dejó la carta.
  remitente?: string
}) {
  if (!completed) return null

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[#e8c2c0] bg-[#fff2f0] p-3.5 text-[#783b39]">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#d86d67] text-white shadow-sm">
        <BookOpen className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-[0.08em]">
          {remitente ? `De: ${remitente}` : 'Entrada sugerida:'}
        </p>
        <p className="mt-1 text-sm leading-5">{prompt}</p>
        <Button className="mt-3 ml-auto px-2 text-[#a34d48]" size="sm" variant="ghost" onClick={onOpen}>
          Contarle a Lumi <ArrowRight />
        </Button>
      </div>
    </div>
  )
}

export { JournalEntryCard }
