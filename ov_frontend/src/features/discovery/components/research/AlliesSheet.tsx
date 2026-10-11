import { DiscoverySheetContent as SheetContent } from '@/components/student/DiscoverySheetContent'
import { useReturnFocus } from '@/hooks/useReturnFocus'
import { Sheet, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/Sheet'
import { demoLevel, getAllies } from '@/data/content/research'
export function AlliesSheet({
  occupationId,
  occupationName,
  open,
  onOpenChange,
}: {
  occupationId: string
  occupationName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const focus = useReturnFocus()
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent {...focus} className="sx-root sx-d-sheet sx-d-dark">
        <SheetHeader>
          <SheetTitle>Aliados</SheetTitle>
          <SheetDescription>
            Compañeros de tu salón que también armaron su guion para {occupationName}.
          </SheetDescription>
        </SheetHeader>
        <p>Compañeros de demostración</p>
        {getAllies(occupationId).map((alias) => (
          <div className="sx-d-row" key={alias}>
            <span className="sx-d-small-avatar">{alias.slice(0, 2)}</span>
            <div>
              <strong>{alias}</strong>
              <p>
                Nivel {demoLevel(alias).number} · {demoLevel(alias).label}
              </p>
            </div>
          </div>
        ))}
        <p>Si hicieron la entrevista juntos, podrás sumarlos como coautores al publicar.</p>
      </SheetContent>
    </Sheet>
  )
}
