import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/Button'

import { appPaths } from '@/routes/paths'

export function ActivityUnavailable({ locked }: { locked: boolean }) {
  const navigate = useNavigate()
  return (
    <div className="grid min-h-80 place-items-center p-8 text-center">
      <div>
        <h1 className="text-xl font-bold">{locked ? 'Actividad bloqueada' : 'Actividad no encontrada'}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {locked ? 'Complete la actividad anterior para continuar.' : 'La actividad solicitada no existe.'}
        </p>
        <Button className="mt-4 min-h-11" onClick={() => navigate(appPaths.parent.activities)}>
          Mis actividades
        </Button>
      </div>
    </div>
  )
}
