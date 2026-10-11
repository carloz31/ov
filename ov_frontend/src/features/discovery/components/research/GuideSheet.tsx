import { DiscoverySheetContent as SheetContent } from '@/components/student/DiscoverySheetContent'
import { useReturnFocus } from '@/hooks/useReturnFocus'
import { Sheet, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/Sheet'
import { occupationCatalog } from '@/data/catalog/occupations'
import type { ResearchInProgress } from '@/types/discovery'
import { suggestedQuestions } from '@/data/content/research'
export function GuideSheet({
  research,
  open,
  onOpenChange,
}: {
  research: ResearchInProgress
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const focus = useReturnFocus()
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent {...focus} className="sx-root sx-d-sheet">
        <SheetHeader>
          <p className="sx-d-eyebrow">Mi guion</p>
          <SheetTitle>{occupationCatalog.find((o) => o.id === research.occupationId)?.name}</SheetTitle>
          <SheetDescription>
            Llévalo contigo a la entrevista: puedes abrirlo desde el celular.
          </SheetDescription>
        </SheetHeader>
        <div className="sx-d-quote">
          <strong>Lo que pensaba antes de la entrevista</strong>
          <p>
            <em>{research.before}</em>
          </p>
        </div>
        <ol className="sx-d-questions">
          {[...suggestedQuestions, ...research.ownQuestions].map((q, i) => (
            <li key={`${i}-${q}`} data-suggested={i < 3}>
              <span>{i + 1}</span>
              {q}
            </li>
          ))}
        </ol>
      </SheetContent>
    </Sheet>
  )
}
