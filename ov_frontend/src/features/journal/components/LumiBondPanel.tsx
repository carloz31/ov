import type { ReactNode } from 'react'
import { LumiPortrait } from '@/features/journal/components/LumiPortrait'
import { TrailBar } from '@/components/student/TrailBar'
import type { LumiBond } from '../lib/lumiBond'

// Ajuste del diario (F05): la tarjeta compacta de Lumi. «Conversaciones» pasa a «cartas»; los capítulos de su
// historia llegan como `historia` (los arma la vista con el bloque LUMI) y `siguienteRecuerdo` es el título del
// próximo capítulo bloqueado, si lo hay.
export function LumiBondPanel({
  bond,
  siguienteRecuerdo,
  historia,
}: {
  bond: LumiBond
  siguienteRecuerdo?: string
  historia?: ReactNode
}) {
  const faltan = bond.nextMemoryAt === undefined ? 0 : Math.max(0, bond.nextMemoryAt - bond.conversations)
  return (
    <aside className="sx-j-lumi-card" aria-label="Amistad con Lumi">
      <div className="sx-j-lumi-card-head">
        <span className="sx-j-lumi-avatar">
          <LumiPortrait />
        </span>
        <div>
          <p className="sx-d-eyebrow">Tu compañera de viaje</p>
          <h2>Amistad con Lumi</h2>
          <span className="sx-j-chip sx-j-chip-gold">{`Nivel ${bond.levelIndex + 1} · ${bond.level}`}</span>
        </div>
      </div>
      <TrailBar
        label={bond.conversations === 1 ? '1 carta enviada' : `${bond.conversations} cartas enviadas`}
        value={bond.progress}
        text={bond.nextMemoryAt ? `Siguiente nivel: ${bond.nextMemoryAt}` : 'Nivel máximo'}
      />
      {faltan > 0 && (
        <p className="sx-j-lumi-card-next">
          Faltan <strong>{faltan === 1 ? '1 carta' : `${faltan} cartas`}</strong> para que Lumi te cuente{' '}
          {siguienteRecuerdo ? <em>«{siguienteRecuerdo}»</em> : 'su siguiente recuerdo'}.
        </p>
      )}
      <p className="sx-j-lumi-card-small">Hoy cuentan hasta 3 cartas · la amistad nunca se pierde</p>
      {historia && (
        <>
          <hr className="sx-j-lumi-card-rule" />
          {historia}
        </>
      )}
    </aside>
  )
}
