import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { forestFireProfessionals } from '@/data/content/forestFireCase'
import { ProfessionalResume } from '@/features/cases/components/ProfessionalResume'
export function ForestFireProfessionalPanel({
  initialProfessionalId,
  triggerLabel = 'Ver ficha',
}: {
  initialProfessionalId?: string
  triggerLabel?: string
}) {
  const professional =
    forestFireProfessionals.find((p) => p.id === initialProfessionalId) ?? forestFireProfessionals[0]
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="ff-secondary">{triggerLabel}</button>
      </DialogTrigger>
      <DialogContent className="ff-modal ff-responsive-modal">
        <DialogTitle className="sr-only">Hoja de vida de {professional.personName}</DialogTitle>
        <DialogDescription className="sr-only">Datos del catálogo de ocupaciones.</DialogDescription>
        <ProfessionalResume professional={professional} />
      </DialogContent>
    </Dialog>
  )
}
