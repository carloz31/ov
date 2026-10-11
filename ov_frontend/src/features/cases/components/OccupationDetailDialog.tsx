import { BriefcaseBusiness, Building2, Sparkles, Star, Wrench } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import type { Occupation } from '@/types/catalog'

function OccupationDetailDialog({
  interested = false,
  occupation,
  onClose,
  onToggleInterest,
}: {
  interested?: boolean
  occupation: Occupation | undefined
  onClose: () => void
  onToggleInterest?: () => void
}) {
  return (
    <Dialog open={Boolean(occupation)} onOpenChange={(open) => !open && onClose()}>
      {occupation && (
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="mb-3 flex items-center gap-3">
              <span
                className="grid size-13 place-items-center rounded-2xl text-white"
                style={{ background: occupation.color }}
              >
                <BriefcaseBusiness className="size-6" />
              </span>
              <Badge variant="secondary">{occupation.sector}</Badge>
            </div>
            <DialogTitle>{occupation.name}</DialogTitle>
            <DialogDescription>{occupation.shortDescription}</DialogDescription>
          </DialogHeader>

          <div className="max-h-[58vh] space-y-3 overflow-y-auto pr-1">
            <DetailSection icon={Sparkles} title="¿Qué puede aportar?">
              {occupation.contextualDescription}
            </DetailSection>
            <DetailSection icon={Wrench} title="¿Qué suele hacer?">
              {occupation.typicalWork}
            </DetailSection>
            <DetailSection icon={Building2} title="¿Dónde puede trabajar?">
              {occupation.workplaces}
            </DetailSection>
            <DetailSection icon={BriefcaseBusiness} title="Conocimientos y habilidades">
              <span className="flex flex-wrap gap-2">
                {occupation.skills.map((skill) => (
                  <Badge key={skill} variant="outline">
                    {skill}
                  </Badge>
                ))}
              </span>
            </DetailSection>
          </div>

          {onToggleInterest && (
            <div className="border-t pt-4">
              <Button
                className="w-full sm:w-auto"
                onClick={onToggleInterest}
                variant={interested ? 'secondary' : 'default'}
              >
                <Star className={interested ? 'fill-current' : undefined} />
                {interested ? 'Quitar de mis intereses' : 'Me interesa'}
              </Button>
            </div>
          )}
        </DialogContent>
      )}
    </Dialog>
  )
}

function DetailSection({
  children,
  icon: Icon,
  title,
}: {
  children: ReactNode
  icon: typeof BriefcaseBusiness
  title: string
}) {
  return (
    <section className="rounded-2xl bg-muted p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold">
        <Icon className="size-4 text-primary" />
        {title}
      </h3>
      <div className="mt-2 text-sm leading-6 text-muted-foreground">{children}</div>
    </section>
  )
}

export { OccupationDetailDialog }
