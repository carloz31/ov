import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { forestFireProfessionals } from '@/data/content/forestFireCase'
import type { ForestFireProfessional } from '@/types/cases'
import { ProfessionalResume } from '@/features/cases/components/ProfessionalResume'
export function ForestFireProfessionalPanel({
  initialProfessionalId,
  triggerLabel = 'Ver ficha',
  professionals = forestFireProfessionals,
}: {
  initialProfessionalId?: string
  triggerLabel?: string
  // Ajuste carga-casos: el directorio del caso que se juega (local: el del incendio).
  professionals?: ForestFireProfessional[]
}) {
  const professional = professionals.find((p) => p.id === initialProfessionalId) ?? professionals[0]
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
