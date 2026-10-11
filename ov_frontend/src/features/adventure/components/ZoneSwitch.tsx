import { Building2, LockKeyhole, MapPinned } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip'
import { appPaths } from '@/routes/paths'
import type { StudentZone } from '../lib/mapPoints'

export function ZoneSwitch({
  zone,
  cityOpen,
  onCityLocked,
}: {
  zone: StudentZone
  cityOpen: boolean
  onCityLocked: () => void
}) {
  const navigate = useNavigate()
  const cityButton = (
    <button
      type="button"
      aria-current={zone === 'central' ? 'page' : undefined}
      aria-disabled={!cityOpen || undefined}
      className="sx-zone-city"
      onClick={() => (cityOpen ? navigate(appPaths.student.exploration) : onCityLocked())}
    >
      {cityOpen ? <Building2 size={18} /> : <LockKeyhole size={18} />}Ciudad
    </button>
  )
  return (
    <nav className="sx-glass sx-zone-switch" aria-label="Cambiar zona de la aventura">
      <button
        type="button"
        className="sx-zone-camino"
        aria-current={zone === 'missions' ? 'page' : undefined}
        onClick={() => navigate(appPaths.student.missions)}
      >
        <MapPinned size={18} />
        Camino
      </button>
      {cityOpen ? (
        cityButton
      ) : (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{cityButton}</TooltipTrigger>
            <TooltipContent>Completa el camino para abrir la ciudad</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </nav>
  )
}
