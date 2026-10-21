import { LockKeyhole } from 'lucide-react'
import { StaffEntityHeader } from '@/components/staff/StaffEntityHeader'
import { StaffMetric } from '@/components/staff/StaffMetric'
import type { FamiliaApoderado } from '@/types/servidor'
import { inicialesHijo } from '../lib/familia'

// Resumen del hijo vinculado en api (GET /cuentas/{c}/familia). Los resultados llegan en F08.
export function ParentChildServerSummary({ familia }: { familia: FamiliaApoderado }) {
  const hijo = familia.estudiante
  const avance = familia.avance
  return (
    <section className="space-y-5" aria-labelledby="family-children">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="family-children" className="text-xl font-bold">
          Mis hijos
        </h2>
      </div>
      {hijo ? (
        <StaffEntityHeader
          title={hijo.nombre}
          initials={inicialesHijo(hijo.nombre)}
          heading="h3"
          metrics={
            <>
              <StaffMetric
                primary
                label={`Avance de ${hijo.nombre}`}
                value={`${Math.round(hijo.avance.porcentaje)} %`}
                percent={hijo.avance.porcentaje}
                detail={`${hijo.avance.completadas} de ${hijo.avance.total} actividades`}
              />
              <StaffMetric
                label="Su avance hacia el diploma"
                value={`${Math.round(avance.porcentaje)} %`}
                percent={avance.porcentaje}
                detail={`${avance.completadas} de ${avance.total} actividades`}
              />
            </>
          }
        >
          <div className="space-y-5 border-t pt-6">
            <h3 className="text-lg font-bold">Resultados de sus cuestionarios</h3>
            <div className="flex items-start gap-3 rounded-xl border p-4">
              <LockKeyhole className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <p className="text-sm">
                {`Podrás ver los resultados de ${hijo.nombre} cuando completes tus actividades.`}
              </p>
            </div>
          </div>
        </StaffEntityHeader>
      ) : (
        <p className="text-muted-foreground">Todavía no tienes un hijo vinculado.</p>
      )}
    </section>
  )
}
