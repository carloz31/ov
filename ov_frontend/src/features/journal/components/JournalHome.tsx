import type { ReactNode } from 'react'
import { LockKeyhole } from 'lucide-react'
import { JournalOnboarding } from '@/features/journal/components/JournalOnboarding'

// Ajuste del diario (F05): tres zonas. Arriba, «Hoy» (con el buzón debajo) y la tarjeta de Lumi; abajo, el
// cuaderno. La primera visita muestra la bienvenida en lugar de «Hoy».
export function JournalHome({
  hoy,
  buzon,
  lumi,
  cuaderno,
  onboarding,
  onBegin,
}: {
  hoy: ReactNode
  buzon: ReactNode
  lumi: ReactNode
  cuaderno: ReactNode
  onboarding: boolean
  onBegin: () => void
}) {
  return (
    <>
      <header className="sx-d-header">
        <div>
          <p className="sx-j-private">
            <LockKeyhole size={16} aria-hidden="true" />
            Solo tú puedes leer este espacio
          </p>
          <h1>Mi diario</h1>
          <p>Cuéntale a tu compañera de viaje lo que vas descubriendo de ti.</p>
        </div>
      </header>
      <div className="sx-j-top">
        <div className="sx-j-today">
          {onboarding ? <JournalOnboarding onBegin={onBegin} /> : hoy}
          {buzon}
        </div>
        {lumi}
      </div>
      {cuaderno}
    </>
  )
}
