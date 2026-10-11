import type { CSSProperties } from 'react'
import { Star } from 'lucide-react'
export function LumiMedallion({ celebration = false }: { celebration?: boolean }) {
  const colors = ['#FFD666', '#F2C66D', '#FFE29A', '#8FB4FF', '#5B8DEF', '#4CC27E']
  return (
    <span className={`sx-lumi-medallion ${celebration ? 'is-celebrating' : ''}`} aria-hidden="true">
      <Star fill="currentColor" size={celebration ? 48 : 22} />
      {celebration &&
        Array.from({ length: 16 }, (_, i) => (
          <i
            key={i}
            style={
              {
                '--burst-x': `${Math.cos((i * Math.PI) / 8) * 90}px`,
                '--burst-y': `${Math.sin((i * Math.PI) / 8) * 90}px`,
                background: colors[i % colors.length],
              } as CSSProperties
            }
          />
        ))}
    </span>
  )
}
