import { Save } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

import { counselorProfile } from '@/features/counselor/data/counselorPortal'

const notificationOptions = [
  'Nueva alerta prioritaria',
  'Registro observado pendiente de atención',
  'Nueva cuenta de apoderado',
  'Solicitud de rehacer atendida',
  'Resumen semanal por correo',
]

function CounselorSettingsView() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader eyebrow="Preferencias" title="Configuración" />
      <Card className="p-6">
        <h2 className="font-bold">Información del perfil</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field defaultValue={counselorProfile.name} label="Nombre completo" />
          <Field defaultValue={counselorProfile.email} label="Correo electrónico" />
          <Field defaultValue={counselorProfile.role} disabled label="Rol" />
          <Field label="Teléfono" placeholder="+51 999 999 999" />
        </div>
        <Button className="mt-5">
          <Save /> Guardar cambios
        </Button>
      </Card>
      <Card className="p-6">
        <h2 className="font-bold">Notificaciones</h2>
        <div className="mt-4 divide-y">
          {notificationOptions.map((option, index) => (
            <label
              className="flex cursor-pointer items-center justify-between gap-4 py-3 text-sm"
              key={option}
            >
              <span>{option}</span>
              <input className="size-4 accent-[var(--primary)]" defaultChecked={index < 3} type="checkbox" />
            </label>
          ))}
        </div>
      </Card>
    </div>
  )
}

import { Field } from '@/features/counselor/components/Field'

export { CounselorSettingsView }
