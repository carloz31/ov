import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { StaffAlertCard } from '@/components/staff/StaffAlertCard'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible'

import { activities, studentProfiles } from '@/data/demo/studentProfiles'

import {
  classroomAverage,
  generalProgress,
  observationCounts,
  profileAlerts,
} from '@/features/student-tracking/lib/selectors'
import { profileUrl } from '@/features/student-tracking/lib/navigation'

import type { ProfileAlertCode, ProfileSection, StudentProfile } from '@/types/studentProfile'

export function ProfileAlerts({ student, returnTo }: { student: StudentProfile; returnTo: string }) {
  const [open, setOpen] = useState(false)
  const alerts = profileAlerts(student, studentProfiles, activities)
  const descriptions: Record<ProfileAlertCode, string> = {
    AVANCE_BAJO_PROMEDIO: `Su avance general (${generalProgress(student, activities).percent} %) está por debajo del promedio de su salón (${Math.round(classroomAverage(student, studentProfiles, activities))} %).`,
    FAMILIA_NO_REGISTRADA:
      'No tiene un apoderado vinculado en la plataforma, por lo que la ruta familiar y las conversaciones no pueden empezar.',
    SIN_INTERESES: 'Todavía no registra ninguna opción de carrera.',
    REGISTRO_REQUIERE_ATENCION: `Tiene ${observationCounts(student).attention} ${observationCounts(student).attention === 1 ? "respuesta marcada como 'Requiere atención'." : "respuestas marcadas como 'Requiere atención'."}`,
  }
  const links: Record<ProfileAlertCode, { section: ProfileSection; label: string; anchor?: string }> = {
    AVANCE_BAJO_PROMEDIO: { section: 'summary', label: 'Ver avance', anchor: 'progress' },
    FAMILIA_NO_REGISTRADA: { section: 'summary', label: 'Ver familia', anchor: 'family' },
    SIN_INTERESES: { section: 'options', label: 'Ver opciones' },
    REGISTRO_REQUIERE_ATENCION: { section: 'records', label: 'Ver registros por revisar' },
  }
  const labels: Record<ProfileAlertCode, string> = {
    AVANCE_BAJO_PROMEDIO: 'Avance bajo el promedio del salón',
    FAMILIA_NO_REGISTRADA: 'Familia no registrada',
    SIN_INTERESES: 'Sin intereses registrados',
    REGISTRO_REQUIERE_ATENCION: 'Registro que requiere atención',
  }
  if (!alerts.length) return null
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <StaffAlertCard
        title={`${alerts.length} ${alerts.length === 1 ? 'alerta' : 'alertas'}`}
        actions={
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="gap-2" aria-expanded={open}>
              {open ? 'Ocultar detalles' : 'Ver detalle'}
              <ChevronDown
                className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </Button>
          </CollapsibleTrigger>
        }
      >
        <ul aria-label="Alertas del estudiante" className="mt-3 flex flex-wrap gap-2">
          {alerts.map((code) => (
            <li key={code}>
              <Badge variant="aviso" className="whitespace-normal font-medium">
                {labels[code]}
              </Badge>
            </li>
          ))}
        </ul>
        <CollapsibleContent>
          <ul className="mt-3 max-h-80 divide-y overflow-y-auto border-t pr-2">
            {alerts.map((code) => (
              <li
                className="flex flex-col items-start gap-2 py-3 xl:flex-row xl:items-center xl:gap-4"
                key={code}
              >
                <Badge variant="aviso" className="shrink-0 whitespace-normal font-normal">
                  {labels[code]}
                </Badge>
                <p className="min-w-0 flex-1 text-sm leading-relaxed">{descriptions[code]}</p>
                <Button
                  asChild
                  variant="link"
                  className="min-h-11 h-auto max-w-full justify-start px-0 text-left whitespace-normal"
                >
                  <Link
                    to={profileUrl(
                      student.id,
                      returnTo,
                      links[code].section,
                      code === 'REGISTRO_REQUIERE_ATENCION',
                      links[code].anchor,
                    )}
                  >
                    {links[code].label}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </StaffAlertCard>
    </Collapsible>
  )
}
