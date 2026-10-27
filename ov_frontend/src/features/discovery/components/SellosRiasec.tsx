import { Seal } from '@/components/student/Seal'
import { dimensionNames, type RiasecDimension } from '../lib/catalogDetails'

// Ajuste catalogo-datos-reales (F6): las letras RIASEC de una carrera u ocupación. Sin letras, tres círculos
// punteados y «Sin perfil», con el mismo alto que una fila de sellos.
export function SellosRiasec({ letras, conNombres = false }: { letras: string[]; conNombres?: boolean }) {
  if (!letras.length)
    return (
      <div className="sx-d-seal-row sx-c-sin-perfil">
        {[0, 1, 2].map((n) => (
          <span key={n} className="sx-c-sello-vacio" aria-hidden="true" />
        ))}
        <small>Sin perfil</small>
      </div>
    )
  return (
    <div className="sx-d-seal-row">
      {letras.map((d) => (
        <span key={d} title={dimensionNames[d as RiasecDimension]}>
          <Seal state="revealed">{d}</Seal>
        </span>
      ))}
      {conNombres && <small>{letras.map((d) => dimensionNames[d as RiasecDimension]).join(' · ')}</small>}
    </div>
  )
}
